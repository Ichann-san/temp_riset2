"""Real HTTP + PostgreSQL tests for the service-date registration model (migration 003).

Set TEST_ADMIN_DSN to a disposable PostgreSQL instance with CREATEDB permission. The harness creates
and drops a uniquely named database, starts two API processes (serve.py) per scenario with an injected
clock (ISLAH_ENV=test + ISLAH_TEST_CLOCK), and stops them in `finally`. A random ISLAH_NIK_KEY is
generated per run. All patient data is synthetic. Never points at the application database.

Covers owner brief section M (backend 1-16) and the date rules. Confirmation of a held place exists
only in `confirm_for_test` below (test code, direct SQL), because payment is not implemented.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import statistics
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app import create_app

DUP_MESSAGE = 'NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini.'
# Clocks (UTC). Asia/Jakarta is UTC+7 with no DST.
D1_CLOCK = '2099-03-01T03:00:00+00:00'   # today 2099-03-01 WIB, H+1 2099-03-02
D2_CLOCK = '2099-04-01T03:00:00+00:00'   # H+1 2099-04-02
D3_CLOCK = '2099-05-01T03:00:00+00:00'   # H+1 2099-05-02


def nik(i):
    return f'3578{i:012d}'


def patient(i, name=None, nik_value=None):
    return {'name': name or f'Peserta Sintetis {i}', 'nik': nik_value or nik(i), 'birth_date': '1990-05-01',
            'address_ktp': f'Jl. Sintetis {i}, Surabaya', 'address_home': f'Jl. Sintetis {i}, Surabaya',
            'phone': '0812 3456 7890', 'gender': 'Laki-laki' if i % 2 else 'Perempuan', 'occupation': 'Karyawan swasta'}


def confirm_for_test(dsn, application_id):
    """TEST-ONLY stand-in for a future verified-payment transition: held -> confirmed, same place."""
    with psycopg.connect(dsn, row_factory=dict_row) as conn:
        day = conn.execute('SELECT service_date FROM registration.application WHERE id=%s', (application_id,)).fetchone()['service_date']
        conn.execute('SELECT 1 FROM registration.service_date_capacity WHERE service_date=%s FOR UPDATE', (day,))
        changed = conn.execute("""UPDATE registration.reservation SET state='confirmed', confirmed_at=now()
            WHERE application_id=%s AND state='held'""", (application_id,)).rowcount
        if changed != 1:
            return False  # already confirmed or not held: no second effect
        conn.execute("UPDATE registration.application SET state='confirmed', confirmed_at=now(), updated_at=now() WHERE id=%s", (application_id,))
        conn.execute('UPDATE registration.service_date_capacity SET held=held-1, confirmed=confirmed+1 WHERE service_date=%s', (day,))
        return True


def counters(dsn, day):
    """Asserts capacity counters equal row counts and invariants; returns the counters."""
    with psycopg.connect(dsn, row_factory=dict_row) as conn:
        cap = conn.execute('SELECT * FROM registration.service_date_capacity WHERE service_date=%s', (day,)).fetchone()
        rows = conn.execute("""SELECT
              count(*) FILTER (WHERE a.state='awaiting_payment') AS awaiting,
              count(*) FILTER (WHERE a.state='confirmed') AS confirmed_apps,
              count(*) FILTER (WHERE a.state='waiting') AS waiting_apps,
              (SELECT count(*) FROM registration.reservation r WHERE r.service_date=%s AND r.state='held') AS held_res,
              (SELECT count(*) FROM registration.reservation r WHERE r.service_date=%s AND r.state='confirmed') AS confirmed_res,
              (SELECT count(*) FROM registration.application x LEFT JOIN registration.reservation r
                 ON r.application_id=x.id AND r.state IN ('held','confirmed')
               WHERE x.service_date=%s AND ((x.state='awaiting_payment') <> (r.state IS NOT DISTINCT FROM 'held')
                 OR (x.state='confirmed') <> (r.state IS NOT DISTINCT FROM 'confirmed'))) AS mismatched
            FROM registration.application a WHERE a.service_date=%s""", (day, day, day, day)).fetchone()
        orphans = conn.execute("""SELECT (SELECT count(*) FROM registration.patient p WHERE NOT EXISTS
            (SELECT 1 FROM registration.application a WHERE a.patient_id=p.id)) AS n""").fetchone()['n']
    assert cap['held'] == rows['awaiting'] == rows['held_res'], (cap, rows)
    assert cap['confirmed'] == rows['confirmed_apps'] == rows['confirmed_res'], (cap, rows)
    assert cap['waiting'] == rows['waiting_apps'], (cap, rows)
    assert rows['mismatched'] == 0 and orphans == 0, (rows, orphans)
    assert cap['held'] + cap['confirmed'] <= cap['main_capacity'] == 100 and cap['waiting'] <= cap['waiting_capacity'] == 50, cap
    return cap['held'], cap['confirmed'], cap['waiting']


def stats(rows):
    times = sorted(r[2] for r in rows)
    return {'requests': len(times), 'median_ms': round(statistics.median(times), 2),
            'p95_ms': round(times[int((len(times) - 1) * .95)], 2), 'max_ms': round(max(times), 2)}


def run():
    admin = os.environ['TEST_ADMIN_DSN']
    name = 'mcu_registration_test_' + uuid4().hex
    dsn = make_conninfo(admin, dbname=name)
    key = secrets.token_hex(32)
    logdir = Path(tempfile.mkdtemp(prefix='islah-test-logs-'))
    servers, apps, report, checks = [], [], {}, []
    created = False

    def check(label):
        checks.append(label)

    def make_app(clock=None):
        app = create_app({'DATABASE_URL': dsn, 'NIK_KEY': key, 'TESTING': True, 'TEST_CLOCK': clock})
        apps.append(app)
        return app

    try:
        with psycopg.connect(admin, autocommit=True) as conn:
            conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
            created = True
            # A non-Jakarta database time zone proves the service date does not depend on it.
            conn.execute(sql.SQL("ALTER DATABASE {} SET timezone TO 'America/Los_Angeles'").format(sql.Identifier(name)))

        # ---- Configuration: fail fast without the NIK key; test clock only in test mode.
        saved = {k: os.environ.pop(k, None) for k in ('ISLAH_NIK_KEY', 'ISLAH_ENV', 'ISLAH_TEST_CLOCK')}
        try:
            for config, expected in (({'DATABASE_URL': dsn}, 'ISLAH_NIK_KEY'),
                                     ({'DATABASE_URL': dsn, 'NIK_KEY': 'abcd'}, 'minimal'),
                                     ({'DATABASE_URL': dsn, 'NIK_KEY': key, 'TEST_CLOCK': D1_CLOCK}, 'ISLAH_ENV=test')):
                try:
                    create_app(config)
                    raise AssertionError(f'create_app accepted {sorted(config)}')
                except RuntimeError as error:
                    assert expected in str(error), error
        finally:
            os.environ.update({k: v for k, v in saved.items() if v is not None})
        check('startup refuses missing/short ISLAH_NIK_KEY and a test clock outside test mode')

        # ---- Migrations: legacy data, 002 guard, 003 guard, legacy rows untouched.
        app = make_app()
        runner = app.test_cli_runner()
        with psycopg.connect(dsn) as conn:
            conn.execute((ROOT / 'migrations/001_registration.sql').read_text(encoding='utf-8'), prepare=False)
            owner = conn.execute("INSERT INTO registration.principal(label,token_hash) VALUES('Legacy',%s) RETURNING id", ('0' * 64,)).fetchone()[0]
            conn.execute("INSERT INTO registration.service_day(service_date) VALUES('2099-09-09')")
            for label in ('U1', 'U2'):
                session = conn.execute("INSERT INTO registration.session(service_date,label) VALUES('2099-09-09',%s) RETURNING id", (label,)).fetchone()[0]
                conn.execute("INSERT INTO registration.entry(session_id,principal_id,request_key,state,active_slot,activated_at) VALUES(%s,%s,%s,'active',1,now())",
                             (session, owner, label))
        blocked = runner.invoke(args=['init-db'])
        assert blocked.exit_code != 0 and '002' in blocked.output, blocked.output
        with psycopg.connect(dsn) as conn:
            conn.execute("UPDATE registration.entry SET state='left',active_slot=NULL,finished_at=now() WHERE request_key='U2'")
            conn.execute('CREATE TABLE registration.patient(id integer)')  # conflicting object outside migration history
        blocked = runner.invoke(args=['init-db'])
        assert blocked.exit_code != 0 and '003' in blocked.output and 'tidak mengubah data' in blocked.output, blocked.output
        legacy_sql = """SELECT (SELECT json_agg(t ORDER BY service_date) FROM registration.service_day t)::text,
                               (SELECT json_agg(t ORDER BY label) FROM registration.session t)::text,
                               (SELECT json_agg(t ORDER BY sequence) FROM registration.entry t)::text"""
        with psycopg.connect(dsn) as conn:
            assert conn.execute('SELECT max(version) FROM registration.schema_version').fetchone()[0] == 1
            conn.execute('DROP TABLE registration.patient')
            legacy = conn.execute(legacy_sql).fetchone()
        for expected in ('Skema versi 3 siap.', 'Skema versi 3 sudah tersedia.'):
            result = runner.invoke(args=['init-db'])
            assert result.exit_code == 0 and expected in result.output, (result.output, result.exception)
        with psycopg.connect(dsn) as conn:
            assert conn.execute('SELECT max(version) FROM registration.schema_version').fetchone()[0] == 3
            assert conn.execute(legacy_sql).fetchone() == legacy, 'legacy rows changed'
        check('migration 001->003; 002 and 003 refuse conflicts without changing data; legacy rows untouched; init-db idempotent')

        # ---- Principals (temporary review accounts).
        result = runner.invoke(args=['create-client', '--label', 'cli-check'])
        assert result.exit_code == 0 and 'bearer_token=' in result.output
        tokens = [secrets.token_urlsafe(32) for _ in range(500)]
        with psycopg.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.executemany('INSERT INTO registration.principal(label,token_hash) VALUES(%s,%s)',
                                [(f'Synthetic-{i}', hashlib.sha256(t.encode()).hexdigest()) for i, t in enumerate(tokens)])

        # ---- Date rules (in-process client; clock changed between requests).
        dapp = make_app('2099-01-01T16:59:00+00:00')  # 23:59 WIB on 1 January 2099
        drun = dapp.test_cli_runner()
        client = dapp.test_client()

        def local(i, method, route, body=None, key_=None):
            headers = {'Authorization': f'Bearer {tokens[i]}'}
            if key_:
                headers['Idempotency-Key'] = key_
            response = client.open(f'/api/v1{route}', method=method, headers=headers, json=body)
            return response.status_code, response.get_json()

        def cli(*args):
            result = drun.invoke(args=list(args))
            return result.exit_code, result.output

        status, body = local(390, 'GET', '/service-dates/current')
        assert status == 200 and (body['today'], body['service_date'], body['status']) == ('2099-01-01', '2099-01-02', 'not_opened'), body
        assert local(390, 'POST', '/applications', {'service_date': '2099-01-02', 'patient': patient(390)}, 'd-0')[1]['error'] == \
            {'code': 'REGISTRATION_NOT_OPEN', 'message': 'Pendaftaran untuk tanggal layanan ini belum dibuka atau sudah ditutup.',
             'service_date': '2099-01-02', 'status': 'not_opened'}
        code, out = cli('open-registration', '--date', '2099-01-03')
        assert code != 0 and 'NOT_NEXT_DAY' in out and '2099-01-02' in out, out
        code, out = cli('open-registration', '--date', '2099-01-02')
        assert code == 0 and 'result=opened' in out, out
        assert cli('open-registration', '--date', '2099-01-02')[1].count('already_open') == 1
        code, out = cli('mark-no-service', '--date', '2099-01-02')
        assert code != 0 and 'ADMISSION_OPEN' in out, out
        code, out = cli('mark-no-service', '--date', '2099-01-03')
        assert code == 0 and 'status=no_service' in out, out
        code, out = cli('mark-no-service', '--date', '2099-01-01')
        assert code != 0 and 'PAST_DATE' in out, out
        chosen = local(390, 'POST', '/applications', {'service_date': '2099-01-05', 'patient': patient(390)}, 'd-pick')
        assert chosen[0] == 409 and chosen[1]['error']['code'] == 'SERVICE_DATE_CHANGED' and chosen[1]['error']['service_date'] == '2099-01-02', chosen
        late = {'service_date': '2099-01-02', 'patient': patient(390)}
        first = local(390, 'POST', '/applications', late, 'd-1')
        assert first[0] == 201 and first[1]['service_date'] == '2099-01-02' and first[1]['state'] == 'awaiting_payment', first
        dapp.config['TEST_CLOCK'] = '2099-01-01T17:00:00+00:00'  # 00:00 WIB on 2 January 2099
        status, body = local(391, 'GET', '/service-dates/current')
        assert (body['today'], body['service_date'], body['status']) == ('2099-01-02', '2099-01-03', 'no_service'), body
        assert local(390, 'GET', f"/applications/{first[1]['id']}")[1]['service_date'] == '2099-01-02'
        replay = local(390, 'POST', '/applications', late, 'd-1')
        assert replay[0] == 200 and replay[1]['id'] == first[1]['id'] and replay[1]['service_date'] == '2099-01-02', replay
        stale = local(391, 'POST', '/applications', {'service_date': '2099-01-02', 'patient': patient(391)}, 'd-2')
        assert stale[1]['error']['code'] == 'SERVICE_DATE_CHANGED' and stale[1]['error']['service_date'] == '2099-01-03', stale
        closed_day = local(391, 'POST', '/applications', {'service_date': '2099-01-03', 'patient': patient(391)}, 'd-3')
        assert closed_day[1]['error']['code'] == 'REGISTRATION_NOT_OPEN' and closed_day[1]['error']['status'] == 'no_service', closed_day
        code, out = cli('open-registration', '--date', '2099-01-03')
        assert code != 0 and 'NO_SERVICE' in out, out
        code, out = cli('open-registration', '--date', '2099-01-04')
        assert code != 0 and 'NOT_NEXT_DAY' in out, out
        assert local(391, 'GET', '/service-dates/2099-01-04')[1]['status'] == 'not_opened'
        with psycopg.connect(dsn) as conn:
            assert conn.execute("SELECT count(*) FROM registration.service_date_capacity WHERE service_date > '2099-01-03'").fetchone()[0] == 0
        assert cli('mark-no-service', '--date', '2099-01-03', '--undo')[1].count('status=closed') == 1
        assert local(391, 'GET', '/service-dates/current')[1]['status'] == 'closed'
        code, out = cli('registration-status')
        assert code == 0 and 'h_plus_1=2099-01-03' in out and 'status=closed' in out, out
        counters(dsn, '2099-01-02')
        check('date: server-assigned H+1 in Asia/Jakarta (DB time zone America/Los_Angeles), 23:59/00:00 WIB boundary, '
              'client date cannot be chosen, existing date fixed after midnight, replay after midnight returns same application, '
              'no_service/unopened H+1 not shifted, operator open refuses non-H+1 dates')

        # ---- Validation and NIK protection (in-process).
        bad = local(392, 'POST', '/applications', {'service_date': '2099-01-03', 'patient': {
            'name': '  ', 'nik': '357812341234123', 'birth_date': '2099-01-03', 'address_ktp': '', 'address_home': None,
            'phone': '12345', 'gender': 'L', 'occupation': ''}}, 'v-1')
        assert bad[0] == 400 and bad[1]['error']['code'] == 'VALIDATION_FAILED', bad
        assert set(bad[1]['error']['fields']) == {'name', 'nik', 'address_ktp', 'address_home', 'phone', 'gender', 'occupation'}, bad
        assert bad[1]['error']['fields']['nik'] == 'NIK harus berjumlah 16 digit!' and '357812341234123' not in json.dumps(bad[1])
        dapp.config['TEST_CLOCK'] = '2099-01-02T03:00:00+00:00'
        assert cli('open-registration', '--date', '2099-01-03')[1].count('result=reopened') == 1
        future = local(392, 'POST', '/applications', {'service_date': '2099-01-03', 'patient': {**patient(392), 'birth_date': '2099-01-03'}}, 'v-2')
        assert future[1]['error']['fields'] == {'birth_date': 'Tanggal lahir tidak boleh melewati hari ini.'}, future
        extra = local(392, 'POST', '/applications', {'service_date': '2099-01-03', 'patient': {**patient(392), 'relation': 'Anak'}}, 'v-3')
        assert extra[0] == 400 and extra[1]['error']['unknown_fields'] == ['relation'], extra
        assert local(392, 'POST', '/applications', {'service_date': '2099-01-03', 'patient': patient(392)})[1]['error']['code'] == 'INVALID_IDEMPOTENCY_KEY'
        response = client.post('/api/v1/applications', data='not json', headers={'Authorization': f'Bearer {tokens[392]}', 'Idempotency-Key': 'v-4'})
        assert response.status_code == 400 and response.json['error']['code'] == 'INVALID_BODY'
        messy = local(392, 'POST', '/applications', {'service_date': '2099-01-03', 'patient': {
            **patient(392), 'name': '  Siti   Aminah ', 'nik': ' 3578000000000392 ', 'phone': '+62 812-3456-7890'}}, 'v-5')
        assert messy[0] == 201 and messy[1]['patient']['name'] == 'Siti Aminah' and messy[1]['patient']['phone'] == '+6281234567890', messy
        assert messy[1]['patient']['nik_last4'] == '0392' and 'nik' not in messy[1]['patient'], messy
        assert messy[1]['reference'].startswith('REG-') and not messy[1]['reference'].replace('-', '')[3:].isdigit()
        assert not any(k in json.dumps(messy[1]).lower() for k in ('queue', 'antrian', 'payment_reference')), messy
        conflict = local(392, 'POST', '/applications', {'service_date': '2099-01-03', 'patient': patient(393)}, 'v-5')
        assert conflict[1]['error']['code'] == 'IDEMPOTENCY_CONFLICT', conflict
        check('validation mirrors the approved form (no self/other, relation or prefill fields accepted); normalization; '
              'NIK never echoed; reference is not a number; idempotency conflict on a different body')

        # ---- Two API processes per scenario over real HTTP.
        ports = []

        def start_servers(clock):
            stop_servers()
            for n in range(2):
                with socket.socket() as sock:
                    sock.bind(('127.0.0.1', 0))
                    port = sock.getsockname()[1]
                log = open(logdir / f'server-{len(servers)}-{n}.log', 'w')
                process = subprocess.Popen([sys.executable, '-B', 'serve.py', '--port', str(port)], cwd=ROOT,
                    env={**os.environ, 'DATABASE_URL': dsn, 'ISLAH_NIK_KEY': key, 'ISLAH_ENV': 'test',
                         'ISLAH_TEST_CLOCK': clock, 'PYTHONDONTWRITEBYTECODE': '1'}, stdout=log, stderr=log)
                log.close()
                servers.append(process)
                ports.append(port)
                for _ in range(100):
                    try:
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/v1/ready', timeout=1) as response:
                            assert response.status == 200
                        break
                    except (OSError, AssertionError):
                        if process.poll() is not None:
                            raise AssertionError('Test HTTP server exited')
                        time.sleep(.1)
                else:
                    raise AssertionError('Test server failed to start')

        def stop_servers():
            while servers:
                process = servers.pop()
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=10)
            ports.clear()

        def call(i, method, route, key_=None, body=None, port_index=None):
            headers = {'Authorization': f'Bearer {tokens[i]}'} if i is not None else {}
            data = None
            if key_:
                headers['Idempotency-Key'] = key_
            if body is not None:
                headers['Content-Type'] = 'application/json'
                data = json.dumps(body).encode()
            port = ports[(i or 0) % 2 if port_index is None else port_index]
            req = urllib.request.Request(f'http://127.0.0.1:{port}/api/v1{route}', method=method, headers=headers, data=data)
            start = time.perf_counter()
            try:
                response = urllib.request.urlopen(req, timeout=60)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                return response.status, json.load(response), (time.perf_counter() - start) * 1000

        def burst(indices, action):
            barrier = threading.Barrier(len(indices))
            def invoke(i):
                barrier.wait(timeout=60)
                return i, action(i)
            with concurrent.futures.ThreadPoolExecutor(max_workers=len(indices)) as executor:
                return dict(executor.map(invoke, indices))

        def submit(i, day, key_=None, body_patient=None):
            return call(i, 'POST', '/applications', key_ or f'submit-{day}-{i}', {'service_date': day, 'patient': body_patient or patient(i)})

        def table_rows():
            with psycopg.connect(dsn) as conn:
                return conn.execute('SELECT (SELECT count(*) FROM registration.application), (SELECT count(*) FROM registration.patient), '
                                    '(SELECT count(*) FROM registration.reservation)').fetchone()

        # ================= Scenario 1: H+1 = 2099-03-02 =================
        D1 = '2099-03-02'
        oapp = make_app(D1_CLOCK)
        assert oapp.test_cli_runner().invoke(args=['open-registration', '--date', D1]).exit_code == 0
        start_servers(D1_CLOCK)
        assert call(None, 'GET', '/service-dates/current')[0] == 401
        assert call(0, 'GET', '/sessions')[0] == 404 and call(0, 'GET', '/entries')[0] == 404
        assert call(0, 'GET', '/service-dates/current')[1]['service_date'] == D1
        before = table_rows()
        # (1)(2)(3) 170 distinct accounts at once: 100 held, 50 waiting, 20 refused with no rows.
        crowd = burst(list(range(170)), lambda i: submit(i, D1))
        held = {i for i, r in crowd.items() if r[0] == 201 and r[1]['state'] == 'awaiting_payment'}
        waiting = {i for i, r in crowd.items() if r[0] == 201 and r[1]['state'] == 'waiting'}
        full = {i for i, r in crowd.items() if r[0] == 409 and r[1]['error']['code'] == 'CAPACITY_FULL'}
        assert (len(held), len(waiting), len(full)) == (100, 50, 20), {i: r[:2] for i, r in crowd.items() if i not in held | waiting | full}
        assert all(crowd[i][1]['main_place'] == 'held' for i in held)
        assert sorted(crowd[i][1]['waiting_position'] for i in waiting) == list(range(1, 51))
        after = table_rows()
        assert (after[0] - before[0], after[1] - before[1], after[2] - before[2]) == (150, 150, 100), (before, after)
        assert counters(dsn, D1) == (100, 0, 50)
        report['burst_170_distinct_accounts'] = stats(crowd.values())
        check('(1)(2)(3) 170 concurrent submits from distinct accounts over 2 processes: exactly 100 awaiting_payment, '
              '50 waiting (positions 1-50), 20 CAPACITY_FULL with no patient/application/reservation rows')
        # Overflow retry creates nothing.
        retry_full = submit(min(full), D1)
        assert retry_full[1]['error']['code'] == 'CAPACITY_FULL' and table_rows() == after
        view = call(0, 'GET', f'/service-dates/{D1}')[1]
        assert {k: view[k] for k in ('main_capacity', 'held', 'confirmed', 'main_available', 'waiting', 'waiting_capacity', 'waiting_available', 'status')} == \
            {'main_capacity': 100, 'held': 100, 'confirmed': 0, 'main_available': 0, 'waiting': 50, 'waiting_capacity': 50, 'waiting_available': 0, 'status': 'open'}, view

        # (8) Replays do not duplicate; (9) a second application of the same account is refused and refers to its own.
        h0 = min(held)
        replay = submit(h0, D1)
        assert replay[0] == 200 and replay[1]['id'] == crowd[h0][1]['id'] and table_rows() == after
        again = submit(h0, D1, key_='another-key')
        assert again[1]['error']['code'] == 'UNFINISHED_APPLICATION' and again[1]['error']['application']['reference'] == crowd[h0][1]['reference']
        w0 = min(waiting)
        again = submit(w0, D1, key_='another-key', body_patient=patient(w0 + 1000))
        assert again[1]['error']['code'] == 'UNFINISHED_APPLICATION' and again[1]['error']['application']['state'] == 'waiting'
        check('(8) submit replay returns the same application; (9) second application while unfinished -> UNFINISHED_APPLICATION with own reference')

        # (16) ownership.
        other = crowd[h0][1]['id']
        intruder = max(held)
        assert call(intruder, 'GET', f'/applications/{other}')[0] == 404
        assert call(intruder, 'POST', f'/applications/{other}/cancel')[0] == 404
        assert call(h0, 'GET', f'/applications/{other}')[1]['state'] == 'awaiting_payment'
        mine = call(intruder, 'GET', '/applications')[1]['applications']
        assert [a['id'] for a in mine] == [crowd[intruder][1]['id']]
        assert call(399, 'GET', '/applications')[1] == {'applications': []}
        assert call(intruder, 'GET', '/applications/not-a-uuid')[0] == 400
        assert call(intruder, 'POST', f"/applications/{crowd[intruder][1]['id']}/cancel", body={'x': 1})[0] == 400
        check('(16) other accounts get 404 on read and cancel; list shows only own; body on cancel refused')

        # (4)(5) Cancel a held application: exactly one place released, earliest waiter promoted (FIFO).
        fifo = sorted(waiting, key=lambda i: crowd[i][1]['waiting_position'])
        cancelled = call(h0, 'POST', f"/applications/{crowd[h0][1]['id']}/cancel")
        assert cancelled[0] == 200 and cancelled[1]['state'] == 'cancelled' and cancelled[1]['main_place'] is None, cancelled
        promoted = call(fifo[0], 'GET', f"/applications/{crowd[fifo[0]][1]['id']}")[1]
        assert promoted['state'] == 'awaiting_payment' and promoted['main_place'] == 'held' and promoted['promoted_at'], promoted
        assert call(fifo[1], 'GET', f"/applications/{crowd[fifo[1]][1]['id']}")[1]['waiting_position'] == 1
        assert counters(dsn, D1) == (100, 0, 49)
        # (8) Repeated cancel releases nothing more.
        repeat = call(h0, 'POST', f"/applications/{crowd[h0][1]['id']}/cancel")
        assert repeat[0] == 200 and repeat[1]['cancelled_at'] == cancelled[1]['cancelled_at'] and counters(dsn, D1) == (100, 0, 49)
        assert call(fifo[1], 'GET', f"/applications/{crowd[fifo[1]][1]['id']}")[1]['state'] == 'waiting'
        # Two processes cancelling the same held application at once: one release, one promotion.
        h1 = sorted(held)[1]
        race = burst([0, 1], lambda n: call(h1, 'POST', f"/applications/{crowd[h1][1]['id']}/cancel", port_index=n))
        assert all(r[0] == 200 and r[1]['state'] == 'cancelled' for r in race.values()), race
        assert counters(dsn, D1) == (100, 0, 48)
        assert call(fifo[1], 'GET', f"/applications/{crowd[fifo[1]][1]['id']}")[1]['state'] == 'awaiting_payment'
        assert call(fifo[2], 'GET', f"/applications/{crowd[fifo[2]][1]['id']}")[1]['waiting_position'] == 1
        check('(4)(5) cancelling a held place releases exactly one and promotes the earliest waiter (state awaiting_payment, not confirmed); '
              '(8) repeated and concurrent cancels release once')

        # (7) Cancelling a waiting application releases only its waiting place.
        w_last = fifo[-1]
        assert call(w_last, 'POST', f"/applications/{crowd[w_last][1]['id']}/cancel")[1]['state'] == 'cancelled'
        assert counters(dsn, D1) == (100, 0, 47)
        check('(7) cancelling a waiting application releases only its waiting place')

        # (10) After a pre-payment cancel the same account may submit again (queues behind existing waiters).
        back = submit(h0, D1, key_='after-cancel')
        assert back[0] == 201 and back[1]['state'] == 'waiting' and back[1]['waiting_position'] == 48, back
        assert counters(dsn, D1) == (100, 0, 48)
        check('(10) after cancelling before payment the account can submit again')

        # (6) A newcomer never bypasses waiters, even when a main place is free. The free place is simulated by raising
        #     main_capacity in SQL (no command does this) so the waiting>0 rule is exercised directly.
        with psycopg.connect(dsn) as conn:
            conn.execute('UPDATE registration.service_date_capacity SET main_capacity=101 WHERE service_date=%s', (D1,))
        newcomer = submit(min(full), D1, key_='newcomer')
        assert newcomer[0] == 201 and newcomer[1]['state'] == 'waiting' and newcomer[1]['waiting_position'] == 49, newcomer
        with psycopg.connect(dsn) as conn:
            conn.execute('UPDATE registration.service_date_capacity SET main_capacity=100 WHERE service_date=%s', (D1,))
        assert counters(dsn, D1) == (100, 0, 49)
        check('(6) newcomer joins behind existing waiters even with a free main place')

        # (9) The same account racing itself with two keys on two processes: exactly one application.
        lone = 300
        race = burst([0, 1], lambda n: call(lone, 'POST', '/applications', f'self-race-{n}', {'service_date': D1, 'patient': patient(lone + n * 1000)}, port_index=n))
        assert sorted(r[0] for r in race.values()) == [201, 409], race
        assert next(r for r in race.values() if r[0] == 409)[1]['error']['code'] == 'UNFINISHED_APPLICATION'
        assert counters(dsn, D1) == (100, 0, 50)
        overflow = submit(301, D1)
        assert overflow[1]['error']['code'] == 'CAPACITY_FULL'
        check('(9) one account racing itself on two processes -> exactly one application')

        # Close admission: existing waiting/held kept, new submissions refused, cancel still promotes FIFO.
        code = oapp.test_cli_runner().invoke(args=['close-registration', '--date', D1])
        assert code.exit_code == 0 and 'tidak dibatalkan' in code.output, code.output
        assert counters(dsn, D1) == (100, 0, 50)
        assert submit(302, D1)[1]['error'] == {'code': 'REGISTRATION_NOT_OPEN', 'message': 'Pendaftaran untuk tanggal layanan ini belum dibuka atau sudah ditutup.', 'service_date': D1, 'status': 'closed'}
        h2 = sorted(held)[2]
        assert call(h2, 'POST', f"/applications/{crowd[h2][1]['id']}/cancel")[1]['state'] == 'cancelled'
        assert call(fifo[2], 'GET', f"/applications/{crowd[fifo[2]][1]['id']}")[1]['state'] == 'awaiting_payment'
        assert counters(dsn, D1) == (100, 0, 49)
        check('close-registration stops new applications without cancelling waiting/held; cancel still promotes the earliest waiter')
        stop_servers()

        # ================= Scenario 2: H+1 = 2099-04-02 (NIK and confirmation) =================
        D2 = '2099-04-02'
        oapp = make_app(D2_CLOCK)
        assert oapp.test_cli_runner().invoke(args=['open-registration', '--date', D2]).exit_code == 0
        start_servers(D2_CLOCK)
        # Accounts 0..169 from scenario 1 still have unfinished applications on D1; use fresh accounts here.
        # (11) Ten pairs of accounts race the same NIK on two processes: exactly one per NIK succeeds.
        pairs = list(range(200, 220))
        dup = burst(pairs, lambda i: call(i, 'POST', '/applications', f'nik-race-{i}',
                                         {'service_date': D2, 'patient': patient(i, nik_value=nik(900000 + (i - 200) // 2))}, port_index=i % 2))
        for p in range(10):
            pair = [dup[200 + 2 * p], dup[201 + 2 * p]]
            assert sorted(r[0] for r in pair) == [201, 409], pair
            refused = next(r for r in pair if r[0] == 409)[1]
            assert refused == {'error': {'code': 'DUPLICATE_NIK', 'message': DUP_MESSAGE}}, refused
        report['nik_race_10_pairs'] = stats(dup.values())
        assert counters(dsn, D2) == (10, 0, 0)
        check('(11) 10 pairs of accounts racing the same NIK on two processes: exactly one success per NIK; refusal discloses nothing')
        # (12) Same name, different NIK: both accepted.
        twin_a = submit(220, D2, body_patient=patient(220, name='Ahmad Fauzi'))
        twin_b = submit(221, D2, body_patient=patient(221, name='Ahmad Fauzi'))
        assert twin_a[0] == twin_b[0] == 201, (twin_a, twin_b)
        check('(12) identical names with different NIKs are not duplicates')
        # Pre-payment cancel frees the NIK for another account.
        winner = next(i for i in (200, 201) if dup[i][0] == 201)
        loser = 401 - winner
        assert call(winner, 'POST', f"/applications/{dup[winner][1]['id']}/cancel")[1]['state'] == 'cancelled'
        retaken = call(loser, 'POST', '/applications', 'nik-retake', {'service_date': D2, 'patient': patient(loser, nik_value=nik(900000))})
        assert retaken[0] == 201, retaken
        check('NIK becomes available for the date after the holder cancels before payment')
        # (13)(14) Test-only confirmation keeps the same place and does not decrement twice.
        before_confirm = counters(dsn, D2)
        with psycopg.connect(dsn) as conn:
            reservation = conn.execute("SELECT id FROM registration.reservation WHERE application_id=%s AND state='held'", (retaken[1]['id'],)).fetchone()[0]
        assert confirm_for_test(dsn, retaken[1]['id']) and not confirm_for_test(dsn, retaken[1]['id'])
        after_confirm = counters(dsn, D2)
        assert after_confirm == (before_confirm[0] - 1, 1, 0) and sum(after_confirm[:2]) == sum(before_confirm[:2])
        with psycopg.connect(dsn) as conn:
            assert conn.execute("SELECT id FROM registration.reservation WHERE application_id=%s AND state='confirmed'", (retaken[1]['id'],)).fetchone()[0] == reservation
        confirmed_view = call(loser, 'GET', f"/applications/{retaken[1]['id']}")[1]
        assert confirmed_view['state'] == 'confirmed' and confirmed_view['main_place'] == 'confirmed' and 'queue_number' not in confirmed_view
        view = call(loser, 'GET', f'/service-dates/{D2}')[1]
        assert (view['held'], view['confirmed'], view['main_available']) == (after_confirm[0], 1, 100 - after_confirm[0] - 1), view
        # Confirmed blocks: same account again for the date, the same NIK from another account, and cancellation.
        same_account = submit(loser, D2, key_='after-confirm', body_patient=patient(loser + 5000))
        assert same_account[1]['error']['code'] == 'ALREADY_REGISTERED_FOR_DATE' and same_account[1]['error']['application']['id'] == retaken[1]['id']
        same_nik = call(222, 'POST', '/applications', 'nik-after-confirm', {'service_date': D2, 'patient': patient(222, nik_value=nik(900000))})
        assert same_nik[1] == {'error': {'code': 'DUPLICATE_NIK', 'message': DUP_MESSAGE}}, same_nik
        refused = call(loser, 'POST', f"/applications/{retaken[1]['id']}/cancel")
        assert refused[0] == 409 and refused[1]['error']['code'] == 'CANCEL_NOT_SUPPORTED' and counters(dsn, D2) == after_confirm
        check('(13)(14) test-only hold->confirmed: same reservation row, held-1/confirmed+1 (sum unchanged), second confirm no effect; '
              'confirmed keeps consuming capacity, blocks the same account and NIK for the date, cannot be cancelled')
        stop_servers()

        # ================= Scenario 3: H+1 = 2099-05-02 (last main place) =================
        D3 = '2099-05-02'
        oapp = make_app(D3_CLOCK)
        assert oapp.test_cli_runner().invoke(args=['open-registration', '--date', D3]).exit_code == 0
        start_servers(D3_CLOCK)
        # Confirmed on another date does not block a new date; the same NIK on another date is allowed.
        other_day = call(loser, 'POST', '/applications', 'next-date', {'service_date': D3, 'patient': patient(loser, nik_value=nik(900000))})
        assert other_day[0] == 201 and other_day[1]['state'] == 'awaiting_payment', other_day
        fill = burst(list(range(400, 498)), lambda i: submit(i, D3))
        assert all(r[0] == 201 and r[1]['state'] == 'awaiting_payment' for r in fill.values())
        assert counters(dsn, D3) == (99, 0, 0)
        last = burst([498, 499], lambda i: submit(i, D3))
        states = sorted(r[1]['state'] for r in last.values())
        assert states == ['awaiting_payment', 'waiting'], last
        assert counters(dsn, D3) == (100, 0, 1)
        report['fill_98_concurrent'] = stats(fill.values())
        check('two accounts racing for the last main place: exactly one held, the other waiting; confirmed booking and NIK on '
              'another date do not block a new date')
        more = burst(list(range(230, 278)), lambda i: submit(i, D3))
        assert all(r[0] == 201 and r[1]['state'] == 'waiting' for r in more.values()) and counters(dsn, D3) == (100, 0, 49)
        last = burst([278, 279], lambda i: submit(i, D3))
        assert sorted((r[0], r[1].get('state') or r[1]['error']['code']) for r in last.values()) == [(201, 'waiting'), (409, 'CAPACITY_FULL')], last
        assert counters(dsn, D3) == (100, 0, 50)
        check('two accounts racing for the last waiting place: exactly one waiting, the other CAPACITY_FULL')
        # Database backstops hold even if application code were bypassed.
        with psycopg.connect(dsn) as conn:
            for column in ('held', 'waiting'):
                try:
                    with conn.transaction():
                        conn.execute(f'UPDATE registration.service_date_capacity SET {column}={column}+1 WHERE service_date=%s', (D3,))
                    raise AssertionError(column)
                except psycopg.errors.CheckViolation:
                    pass
            spare = conn.execute("SELECT id FROM registration.principal WHERE label='Synthetic-380'").fetchone()[0]
            try:
                with conn.transaction():
                    copy = conn.execute("""INSERT INTO registration.patient(full_name, nik_hmac, nik_last4, birth_date, address_ktp, address_home, phone, gender, occupation)
                        SELECT full_name, nik_hmac, nik_last4, birth_date, address_ktp, address_home, phone, gender, occupation FROM registration.patient
                        WHERE id=(SELECT patient_id FROM registration.application WHERE service_date=%s AND state='awaiting_payment' LIMIT 1)
                        RETURNING id, nik_hmac""", (D3,)).fetchone()
                    conn.execute("""INSERT INTO registration.application(reference, principal_id, patient_id, nik_hmac, service_date, request_key, request_hmac, state)
                        VALUES('REG-TEST-DUPE', %s, %s, %s, %s, 'dupe', %s, 'awaiting_payment')""", (spare, copy[0], copy[1], D3, b'0' * 32))
                raise AssertionError('duplicate NIK accepted')
            except psycopg.errors.UniqueViolation as error:
                assert error.diag.constraint_name == 'application_one_active_per_nik_date', error.diag.constraint_name
        assert counters(dsn, D3) == (100, 0, 50)
        check('database backstops: CHECK refuses held+confirmed > 100 and waiting > 50; partial unique indexes refuse a second '
              'active application for the same NIK on a date')
        stop_servers()

        # (15) No production confirmation bypass: covered by tests/route_guard.py (route/CLI allowlist) plus this probe.
        assert 'registration.submit_application' in {r.endpoint for r in oapp.url_map.iter_rules()}
        assert not any(w in r.rule for r in oapp.url_map.iter_rules() for w in ('confirm', 'pay', 'queue'))
        assert not any(w in name for name in oapp.cli.commands for w in ('confirm', 'pay'))
        check('(15) no route or CLI command confirms, pays or issues a queue number')

        # ---- No plaintext NIK in stored rows or server logs.
        test_niks = [nik(i) for i in range(500)] + [nik(900000 + p) for p in range(10)]
        with psycopg.connect(dsn) as conn:
            dumped = conn.execute("""SELECT concat_ws('|', (SELECT json_agg(t)::text FROM registration.patient t),
                (SELECT json_agg(t)::text FROM registration.application t), (SELECT json_agg(t)::text FROM registration.reservation t),
                (SELECT json_agg(t)::text FROM registration.service_date_capacity t))""").fetchone()[0]
        logs = ''.join(p.read_text(errors='replace') for p in logdir.glob('*.log'))
        assert not any(n in dumped or n in logs for n in test_niks), 'plaintext NIK found'
        check('no plaintext NIK in patient/application/reservation/capacity rows or in API process logs')
    finally:
        for process in servers:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)
        for app in apps:
            app.extensions['db_pool'].close()
        if created:
            with psycopg.connect(admin, autocommit=True) as conn:
                conn.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(name)))
        for path in logdir.glob('*.log'):
            path.unlink()
        logdir.rmdir()
    report['checks'] = checks
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    run()
