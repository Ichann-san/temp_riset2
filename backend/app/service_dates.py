"""Service date (H+1, Asia/Jakarta, computed by PostgreSQL) and per-date capacity record.

Operators open admission for H+1 only, close admission without touching existing applications,
and can mark a day as having no service so it is never opened. Nothing shifts to another date.
Opening hours are undecided: there is no time-of-day window.
"""
from .errors import DomainError

VIEW_COLUMNS = 'service_date, status, main_capacity, held, confirmed, waiting, waiting_capacity'


def current_dates(conn):
    return conn.execute('SELECT registration.jakarta_today() AS today, registration.current_service_date() AS service_date').fetchone()


def capacity_view(conn, service_date):
    """Counts only, never identities. A date without a record is reported as not_opened."""
    row = conn.execute(f'SELECT {VIEW_COLUMNS} FROM registration.service_date_capacity WHERE service_date=%s',
                       (service_date,)).fetchone()
    if not row:
        return {'service_date': service_date, 'status': 'not_opened', 'accepting_applications': False,
                'main_capacity': None, 'held': 0, 'confirmed': 0, 'main_available': None,
                'waiting': 0, 'waiting_capacity': None, 'waiting_available': None}
    return {**row, 'accepting_applications': row['status'] == 'open',
            'main_available': row['main_capacity'] - row['held'] - row['confirmed'],
            'waiting_available': row['waiting_capacity'] - row['waiting']}


def current_view(conn):
    dates = current_dates(conn)
    return {'today': dates['today'], **capacity_view(conn, dates['service_date'])}


def open_registration(conn, requested):
    """Opens admission for H+1. Refuses any other date and days marked no_service."""
    dates = current_dates(conn)
    if requested != dates['service_date']:
        raise DomainError('NOT_NEXT_DAY', f"Hanya tanggal layanan H+1 ({dates['service_date'].isoformat()}, Asia/Jakarta) yang dapat dibuka; tidak ada pemindahan tanggal otomatis.")
    row = conn.execute('SELECT status FROM registration.service_date_capacity WHERE service_date=%s FOR UPDATE', (requested,)).fetchone()
    if row and row['status'] == 'no_service':
        raise DomainError('NO_SERVICE', 'Tanggal ini ditandai tidak ada layanan; pendaftaran tidak dibuka.')
    if row and row['status'] == 'open':
        return 'already_open'
    conn.execute("""INSERT INTO registration.service_date_capacity(service_date, status, opened_at) VALUES(%s, 'open', now())
        ON CONFLICT (service_date) DO UPDATE SET status='open', opened_at=now(), closed_at=NULL, updated_at=now()""", (requested,))
    return 'reopened' if row else 'opened'


def close_registration(conn, service_date):
    """Stops new applications for the date. Waiting, held and confirmed applications are kept."""
    row = conn.execute('SELECT status FROM registration.service_date_capacity WHERE service_date=%s FOR UPDATE', (service_date,)).fetchone()
    if not row:
        raise DomainError('NOT_OPENED', 'Pendaftaran untuk tanggal ini belum pernah dibuka.', 404)
    if row['status'] != 'open':
        return row['status']
    conn.execute("UPDATE registration.service_date_capacity SET status='closed', closed_at=now(), updated_at=now() WHERE service_date=%s", (service_date,))
    return 'closed'


def mark_no_service(conn, service_date, undo=False):
    """Marks a future day as having no service (holiday/closed) or clears that mark (back to closed)."""
    dates = current_dates(conn)
    if service_date < dates['service_date']:
        raise DomainError('PAST_DATE', 'Hanya tanggal mulai H+1 yang dapat ditandai.')
    row = conn.execute('SELECT status, held, confirmed, waiting FROM registration.service_date_capacity WHERE service_date=%s FOR UPDATE',
                       (service_date,)).fetchone()
    if undo:
        if not row or row['status'] != 'no_service':
            raise DomainError('NOT_MARKED', 'Tanggal ini tidak ditandai tidak ada layanan.')
        conn.execute("UPDATE registration.service_date_capacity SET status='closed', updated_at=now() WHERE service_date=%s", (service_date,))
        return 'closed'
    if row and row['status'] == 'open':
        raise DomainError('ADMISSION_OPEN', 'Pendaftaran tanggal ini sedang dibuka; tutup terlebih dahulu. Tidak ada pendaftaran yang dibatalkan otomatis.')
    if row and row['held'] + row['confirmed'] + row['waiting'] > 0:
        raise DomainError('HAS_APPLICATIONS', 'Tanggal ini sudah memiliki pendaftaran aktif; penandaan ditolak dan tidak ada pendaftaran yang dibatalkan.')
    conn.execute("""INSERT INTO registration.service_date_capacity(service_date, status) VALUES(%s, 'no_service')
        ON CONFLICT (service_date) DO UPDATE SET status='no_service', updated_at=now()""", (service_date,))
    return 'no_service'
