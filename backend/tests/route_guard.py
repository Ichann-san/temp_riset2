"""Route allowlist guard; needs no database or server.

Client/token creation must stay a server-side CLI command for the admin (operator with shell
and database credentials). Patients and staff roles such as doctors only reach the HTTP API,
so no HTTP route may create a client. Adding any route makes this check fail until reviewed.

18 October 2026: the per-session entry routes (/sessions*, /entries*) were retired; they no longer gate
admission. There is no route or CLI command that confirms, pays, or issues a queue number: confirmation
exists only as a test helper inside backend/tests.
"""
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DATABASE_URL', 'host=127.0.0.1 port=1 dbname=none user=none connect_timeout=1')
os.environ.setdefault('ISLAH_NIK_KEY', os.urandom(32).hex())  # random per run; never a real key
logging.getLogger('psycopg.pool').setLevel(logging.CRITICAL)  # the dummy DSN is never reachable
from app import create_app

ALLOWED = {
    ('GET', '/api/v1/health'), ('GET', '/api/v1/ready'),
    ('GET', '/api/v1/service-dates/current'), ('GET', '/api/v1/service-dates/<service_date>'),
    ('POST', '/api/v1/applications'), ('GET', '/api/v1/applications'),
    ('GET', '/api/v1/applications/<application_id>'), ('POST', '/api/v1/applications/<application_id>/cancel'),
}
CLI = {'init-db', 'create-client', 'open-registration', 'close-registration', 'mark-no-service', 'registration-status'}

app = create_app()
try:
    routes = {(m, r.rule) for r in app.url_map.iter_rules() if r.endpoint != 'static'
              for m in r.methods - {'HEAD', 'OPTIONS'}}
    assert routes == ALLOWED, f'Route berubah; tinjau akses sebelum menambah: {sorted(routes ^ ALLOWED)}'
    assert not any('client' in rule or 'principal' in rule or 'token' in rule for _, rule in routes)
    assert not any(word in rule for word in ('confirm', 'pay', 'queue', 'session', 'entr') for _, rule in routes)
    assert 'create-client' in app.cli.commands, 'create-client harus tetap CLI'
    assert set(app.cli.commands) == CLI, f'Perintah CLI berubah; tinjau: {sorted(set(app.cli.commands) ^ CLI)}'
    with app.test_client() as client:  # unknown write route is refused before any database access
        assert client.post('/api/v1/clients').status_code == 401
    print('PASS: route allowlist; create-client hanya CLI; tanpa route/CLI konfirmasi atau pembayaran; route sesi lama dicabut')
finally:
    app.extensions['db_pool'].close()
