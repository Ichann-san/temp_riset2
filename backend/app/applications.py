"""Applications for the H+1 service date: admission, FIFO waiting list, cancellation, own reads.

Every write runs in one short transaction. Lock order: principal row, service-date capacity row,
application rows. Counters on the capacity row change in the same transaction as the rows they
count; CHECK constraints and partial unique indexes are the backstop. No process-local state.
An application reference is a registration code, never an MCU queue number; none is issued here.
"""
import secrets

import psycopg

from .errors import DomainError
from .service_dates import current_dates

UNFINISHED = ('waiting', 'awaiting_payment')
ACTIVE = ('waiting', 'awaiting_payment', 'confirmed')
REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'  # no I, L, O, 0, 1
DUPLICATE_NIK_MESSAGE = 'NIK tersebut sudah memiliki pendaftaran untuk tanggal layanan ini.'

SELECT_APPLICATION = """SELECT a.id, a.reference, a.service_date, a.state, r.state AS main_place,
      CASE WHEN a.state='waiting' THEN (SELECT count(*) FROM registration.application w
        WHERE w.service_date=a.service_date AND w.state='waiting' AND w.waiting_sequence<=a.waiting_sequence) END AS waiting_position,
      p.full_name, p.nik_last4, p.birth_date, p.address_ktp, p.address_home, p.phone, p.gender, p.occupation,
      a.created_at, a.promoted_at, a.confirmed_at, a.cancelled_at, a.updated_at
    FROM registration.application a JOIN registration.patient p ON p.id=a.patient_id
    LEFT JOIN registration.reservation r ON r.application_id=a.id AND r.state IN ('held','confirmed')"""
PATIENT_KEYS = ('nik_last4', 'birth_date', 'address_ktp', 'address_home', 'phone', 'gender', 'occupation')


def serialize(row):
    patient = {'name': row.pop('full_name'), **{key: row.pop(key) for key in PATIENT_KEYS}}
    return {**row, 'patient': patient}


def get_own(conn, application_id, principal_id):
    row = conn.execute(SELECT_APPLICATION + ' WHERE a.id=%s AND a.principal_id=%s', (application_id, principal_id)).fetchone()
    if not row:
        raise DomainError('NOT_FOUND', 'Pendaftaran tidak ditemukan.', 404)
    return serialize(row)


def list_own(conn, principal_id):
    # LIMIT is a technical bound, not policy.
    rows = conn.execute(SELECT_APPLICATION + ' WHERE a.principal_id=%s ORDER BY a.created_at DESC, a.id LIMIT 20', (principal_id,)).fetchall()
    return [serialize(row) for row in rows]


def _new_reference():
    pick = lambda: ''.join(secrets.choice(REFERENCE_ALPHABET) for _ in range(4))
    return f'REG-{pick()}-{pick()}'


def _hold(conn, application_id, service_date):
    conn.execute('INSERT INTO registration.reservation(application_id, service_date, state) VALUES(%s,%s,%s)',
                 (application_id, service_date, 'held'))


def submit(conn, principal_id, key, expected_date, patient, request_hmac):
    """Final confirmation from the summary. Returns (application, http_status)."""
    conn.execute('SELECT id FROM registration.principal WHERE id=%s FOR UPDATE', (principal_id,))
    previous = conn.execute('SELECT id, request_hmac FROM registration.application WHERE principal_id=%s AND request_key=%s',
                            (principal_id, key)).fetchone()
    if previous:
        if bytes(previous['request_hmac']) != request_hmac:
            raise DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency-Key ini sudah dipakai untuk data pendaftaran lain.')
        return get_own(conn, previous['id'], principal_id), 200
    unfinished = conn.execute('SELECT id FROM registration.application WHERE principal_id=%s AND state = ANY(%s)',
                              (principal_id, list(UNFINISHED))).fetchone()
    if unfinished:
        raise DomainError('UNFINISHED_APPLICATION', 'Akun ini masih memiliki pendaftaran yang belum selesai.', 409,
                          {'application': get_own(conn, unfinished['id'], principal_id)})
    dates = current_dates(conn)
    service_date = dates['service_date']
    if expected_date != service_date:
        raise DomainError('SERVICE_DATE_CHANGED', 'Tanggal layanan sudah berubah; periksa kembali ringkasan pendaftaran.', 409,
                          {'service_date': service_date})
    if patient['birth_date'] > dates['today']:
        raise DomainError('VALIDATION_FAILED', 'Periksa kembali data pasien.', 400,
                          {'fields': {'birth_date': 'Tanggal lahir tidak boleh melewati hari ini.'}})
    capacity = conn.execute('SELECT * FROM registration.service_date_capacity WHERE service_date=%s FOR UPDATE', (service_date,)).fetchone()
    if not capacity or capacity['status'] != 'open':
        raise DomainError('REGISTRATION_NOT_OPEN', 'Pendaftaran untuk tanggal layanan ini belum dibuka atau sudah ditutup.', 409,
                          {'service_date': service_date, 'status': capacity['status'] if capacity else 'not_opened'})
    own = conn.execute('SELECT id FROM registration.application WHERE principal_id=%s AND service_date=%s AND state = ANY(%s)',
                       (principal_id, service_date, list(ACTIVE))).fetchone()
    if own:
        raise DomainError('ALREADY_REGISTERED_FOR_DATE', 'Akun ini sudah memiliki pendaftaran untuk tanggal layanan ini.', 409,
                          {'application': get_own(conn, own['id'], principal_id)})
    if conn.execute('SELECT 1 FROM registration.application WHERE service_date=%s AND nik_hmac=%s AND state = ANY(%s)',
                    (service_date, patient['nik_hmac'], list(ACTIVE))).fetchone():
        raise DomainError('DUPLICATE_NIK', DUPLICATE_NIK_MESSAGE)
    main_free = capacity['held'] + capacity['confirmed'] < capacity['main_capacity']
    if capacity['waiting'] == 0 and main_free:
        state = 'awaiting_payment'
    elif capacity['waiting'] < capacity['waiting_capacity']:
        state = 'waiting'  # new arrivals queue behind existing waiters even if a main place is free
    else:
        raise DomainError('CAPACITY_FULL', 'Tempat utama dan daftar tunggu untuk tanggal layanan ini sudah penuh.', 409,
                          {'service_date': service_date})
    try:
        patient_id = conn.execute("""INSERT INTO registration.patient(full_name, nik_hmac, nik_last4, birth_date, address_ktp,
              address_home, phone, gender, occupation) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (patient['name'], patient['nik_hmac'], patient['nik_last4'], patient['birth_date'], patient['address_ktp'],
             patient['address_home'], patient['phone'], patient['gender'], patient['occupation'])).fetchone()['id']
        application_id = None
        while application_id is None:  # reference collisions are improbable; retry instead of failing
            row = conn.execute("""INSERT INTO registration.application(reference, principal_id, patient_id, nik_hmac, service_date,
                  request_key, request_hmac, state, waiting_sequence)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s, CASE WHEN %s THEN nextval('registration.waiting_sequence') END)
                ON CONFLICT (reference) DO NOTHING RETURNING id""",
                (_new_reference(), principal_id, patient_id, patient['nik_hmac'], service_date, key, request_hmac, state,
                 state == 'waiting')).fetchone()
            application_id = row and row['id']
        if state == 'awaiting_payment':
            _hold(conn, application_id, service_date)
            conn.execute('UPDATE registration.service_date_capacity SET held=held+1, updated_at=now() WHERE service_date=%s', (service_date,))
        else:
            conn.execute('UPDATE registration.service_date_capacity SET waiting=waiting+1, updated_at=now() WHERE service_date=%s', (service_date,))
    except psycopg.errors.UniqueViolation as error:  # backstop; the locks above should make this unreachable
        raise _constraint_error(error) from None
    except psycopg.errors.CheckViolation as error:
        if error.diag.constraint_name not in ('main_within_capacity', 'waiting_within_capacity'):
            raise
        raise DomainError('CAPACITY_FULL', 'Tempat utama dan daftar tunggu untuk tanggal layanan ini sudah penuh.', 409) from None
    return get_own(conn, application_id, principal_id), 201


def _constraint_error(error):
    name = error.diag.constraint_name or ''
    if name == 'application_one_active_per_nik_date':
        return DomainError('DUPLICATE_NIK', DUPLICATE_NIK_MESSAGE)
    if name == 'application_one_unfinished_per_principal':
        return DomainError('UNFINISHED_APPLICATION', 'Akun ini masih memiliki pendaftaran yang belum selesai.')
    if name == 'application_one_active_per_principal_date':
        return DomainError('ALREADY_REGISTERED_FOR_DATE', 'Akun ini sudah memiliki pendaftaran untuk tanggal layanan ini.')
    return DomainError('TEMPORARILY_UNAVAILABLE', 'Ulangi request dengan kunci yang sama.', 503)


def promote_waiting(conn, service_date):
    """FIFO by persisted waiting_sequence into free main places; caller holds the capacity row lock."""
    while True:
        capacity = conn.execute('SELECT main_capacity, held, confirmed FROM registration.service_date_capacity WHERE service_date=%s',
                                (service_date,)).fetchone()
        if capacity['held'] + capacity['confirmed'] >= capacity['main_capacity']:
            return
        nxt = conn.execute("""SELECT id FROM registration.application WHERE service_date=%s AND state='waiting'
            ORDER BY waiting_sequence LIMIT 1 FOR UPDATE""", (service_date,)).fetchone()
        if not nxt:
            return
        conn.execute("""UPDATE registration.application SET state='awaiting_payment', promoted_at=now(), updated_at=now()
            WHERE id=%s""", (nxt['id'],))
        _hold(conn, nxt['id'], service_date)
        conn.execute('UPDATE registration.service_date_capacity SET held=held+1, waiting=waiting-1, updated_at=now() WHERE service_date=%s',
                     (service_date,))


def cancel(conn, application_id, principal_id):
    """Owner cancels before payment. Repeating it is harmless: nothing is released twice."""
    row = conn.execute('SELECT service_date FROM registration.application WHERE id=%s AND principal_id=%s',
                       (application_id, principal_id)).fetchone()
    if not row:
        raise DomainError('NOT_FOUND', 'Pendaftaran tidak ditemukan.', 404)
    service_date = row['service_date']
    conn.execute('SELECT 1 FROM registration.service_date_capacity WHERE service_date=%s FOR UPDATE', (service_date,))
    state = conn.execute('SELECT state FROM registration.application WHERE id=%s FOR UPDATE', (application_id,)).fetchone()['state']
    if state == 'confirmed':
        raise DomainError('CANCEL_NOT_SUPPORTED', 'Pembatalan pendaftaran yang sudah terkonfirmasi belum tersedia.')
    if state in UNFINISHED:
        conn.execute("""UPDATE registration.application SET state='cancelled', cancelled_at=now(), updated_at=now()
            WHERE id=%s""", (application_id,))
        if state == 'awaiting_payment':
            released = conn.execute("""UPDATE registration.reservation SET state='released', released_at=now()
                WHERE application_id=%s AND state='held'""", (application_id,)).rowcount
            if released != 1:
                raise RuntimeError('reservation/application state mismatch')
            conn.execute('UPDATE registration.service_date_capacity SET held=held-1, updated_at=now() WHERE service_date=%s', (service_date,))
            promote_waiting(conn, service_date)
        else:
            conn.execute('UPDATE registration.service_date_capacity SET waiting=waiting-1, updated_at=now() WHERE service_date=%s', (service_date,))
    return get_own(conn, application_id, principal_id)
