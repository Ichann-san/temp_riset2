import hashlib
import secrets
from datetime import date
from pathlib import Path

import click
import psycopg

from .db import transaction
from .errors import DomainError
from .service_dates import capacity_view, close_registration, current_dates, mark_no_service, open_registration


def parse_date(value):
    try:
        if len(value) != 10:
            raise ValueError
        return date.fromisoformat(value)
    except ValueError:
        raise click.ClickException('Tanggal harus YYYY-MM-DD.') from None


def register_commands(app):
    def run(operation, *args):
        try:
            with transaction(app) as conn:
                return operation(conn, *args)
        except DomainError as error:
            raise click.ClickException(f'{error.code}: {error.message}') from None

    @app.cli.command('init-db')
    def init_db():
        # Applies pending migrations in order, all in one transaction.
        migrations = sorted(Path(__file__).resolve().parents[1].glob('migrations/[0-9][0-9][0-9]_*.sql'))
        latest = int(migrations[-1].name[:3])
        with app.extensions['db_pool'].connection() as conn:
            conn.execute('SELECT pg_advisory_xact_lock(14200400)')
            exists = conn.execute("SELECT to_regclass('registration.schema_version') AS name").fetchone()['name']
            current = conn.execute('SELECT max(version) AS v FROM registration.schema_version').fetchone()['v'] if exists else 0
            if exists and not 1 <= (current or 0) <= latest:
                raise click.ClickException('Versi skema tidak didukung.')
            if current == latest:
                click.echo(f'Skema versi {latest} sudah tersedia.')
                return
            for path in migrations:
                if int(path.name[:3]) > current:
                    try:
                        conn.execute(path.read_text(encoding='utf-8'), prepare=False)
                    except psycopg.errors.RaiseException as error:
                        raise click.ClickException(f'{path.name}: {error.diag.message_primary}') from None
        click.echo(f'Skema versi {latest} siap.')

    @app.cli.command('create-client')
    @click.option('--label', required=True)
    def create_client(label):
        """Temporary review principal (stand-in for an account); prints its token once."""
        if not 1 <= len(label.strip()) <= 100:
            raise click.ClickException('Label harus 1-100 karakter.')
        token = secrets.token_urlsafe(32)
        with app.extensions['db_pool'].connection() as conn:
            row = conn.execute('INSERT INTO registration.principal(label,token_hash) VALUES(%s,%s) ON CONFLICT(label) DO NOTHING RETURNING id',
                (label.strip(), hashlib.sha256(token.encode()).hexdigest())).fetchone()
            if not row:
                raise click.ClickException('Label sudah ada; token lama tidak diubah.')
        click.echo(f"principal_id={row['id']}")
        click.echo(f'bearer_token={token}')

    @app.cli.command('open-registration')
    @click.option('--date', 'service_date', required=True, help='Harus sama dengan H+1 (Asia/Jakarta) menurut database.')
    def open_cmd(service_date):
        """Opens admission of new applications for H+1 only (100 main + 50 waiting)."""
        result = run(open_registration, parse_date(service_date))
        click.echo(f'service_date={service_date} result={result}')

    @app.cli.command('close-registration')
    @click.option('--date', 'service_date', required=True)
    def close_cmd(service_date):
        """Stops new applications; waiting, held and confirmed applications are kept."""
        result = run(close_registration, parse_date(service_date))
        click.echo(f'service_date={service_date} status={result}; pendaftaran yang ada tidak dibatalkan.')

    @app.cli.command('mark-no-service')
    @click.option('--date', 'service_date', required=True)
    @click.option('--undo', is_flag=True, help='Hapus penanda; tanggal kembali tertutup (belum dibuka).')
    def no_service_cmd(service_date, undo):
        """Marks a day (H+1 or later) as closed/holiday so registration is not opened for it."""
        result = run(mark_no_service, parse_date(service_date), undo)
        click.echo(f'service_date={service_date} status={result}')

    @app.cli.command('registration-status')
    @click.option('--date', 'service_date', default=None, help='Default: H+1.')
    def status_cmd(service_date):
        """Prints today, H+1 and the capacity counts of a service date."""
        def show(conn):
            dates = current_dates(conn)
            target = parse_date(service_date) if service_date else dates['service_date']
            return dates, capacity_view(conn, target)
        dates, view = run(show)
        click.echo(f"today={dates['today']} h_plus_1={dates['service_date']} (Asia/Jakarta)")
        click.echo(' '.join(f'{key}={value}' for key, value in view.items()))
