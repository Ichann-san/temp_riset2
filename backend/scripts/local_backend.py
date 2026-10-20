"""Local launcher: persist the NIK key, reuse Flask CLI, and start the existing server.

No database reset, client creation or service-date opening happens on ordinary startup.
Configuration and credentials live only in the git-ignored backend/.local directory.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE))

import psycopg
from app.identity import load_key


def configure(base=BASE):
    settings_path = base / '.local' / 'settings.json'
    settings = {}
    if settings_path.exists():
        try:
            settings = json.loads(settings_path.read_text(encoding='utf-8-sig'))
        except (OSError, ValueError):
            raise RuntimeError('Konfigurasi .local/settings.json tidak dapat dibaca; periksa format JSON.') from None
        if not isinstance(settings, dict) or any(not isinstance(value, str) for value in settings.values()):
            raise RuntimeError('Konfigurasi lokal harus berupa objek JSON dengan nilai teks.')

    dsn = os.environ.get('DATABASE_URL') or settings.get('database_url')
    if not dsn:
        raise RuntimeError('Buat .local/settings.json sesuai README, atau set DATABASE_URL.')
    os.environ['DATABASE_URL'] = dsn
    if 'PGPASSWORD' not in os.environ and settings.get('pgpassword'):
        os.environ['PGPASSWORD'] = settings['pgpassword']
    return dsn


def persistent_key(conn, path):
    supplied = os.environ.get('ISLAH_NIK_KEY', '').strip()
    if path.exists():
        key = path.read_text(encoding='ascii').strip()
        load_key(key)
        if supplied and load_key(supplied) != load_key(key):
            raise RuntimeError('ISLAH_NIK_KEY di environment berbeda dari .local/nik.key. Jangan mengganti kunci database secara otomatis.')
        return key

    if supplied:
        load_key(supplied)
        key = supplied
    else:
        exists = conn.execute("SELECT to_regclass('registration.patient')").fetchone()[0]
        if exists and conn.execute('SELECT EXISTS (SELECT 1 FROM registration.patient)').fetchone()[0]:
            raise RuntimeError('Kunci NIK tidak tersedia, tetapi data pasien masih ada. Pulihkan kunci lama atau reset data pengujian dahulu; kunci baru tidak dibuat.')
        key = secrets.token_hex(32)

    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Exclusive creation avoids overwriting a key when two launchers start together.
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        return persistent_key(conn, path)
    with os.fdopen(fd, 'w', encoding='ascii') as stream:
        stream.write(key + '\n')
    return key


def main(args=None):
    os.chdir(BASE)
    args = list(sys.argv[1:] if args is None else args)
    try:
        dsn = configure()
        with psycopg.connect(dsn, connect_timeout=5) as conn:
            key = persistent_key(conn, BASE / '.local' / 'nik.key')
        os.environ['ISLAH_NIK_KEY'] = key
        print('Kunci NIK dimuat dari backend/.local/nik.key (nilai tidak ditampilkan).', flush=True)

        if not args or args[0] == 'serve' or args[0].startswith('-'):
            # init-db is the existing idempotent migration command, never a data reset.
            subprocess.run([sys.executable, '-B', '-m', 'flask', '--app', 'app', 'init-db'], check=True)
            server_args = args[1:] if args and args[0] == 'serve' else args
            command = [sys.executable, '-B', str(BASE / 'serve.py'), *server_args]
            print('Backend lokal siap dijalankan. Hentikan dengan Ctrl+C.', flush=True)
        else:
            command = [sys.executable, '-B', '-m', 'flask', '--app', 'app', *args]
        os.execv(sys.executable, command)
    except psycopg.Error:
        print('Koneksi PostgreSQL gagal. Periksa server, DATABASE_URL dan password di konfigurasi lokal.', file=sys.stderr)
        return 1
    except (OSError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        return error.returncode


if __name__ == '__main__':
    raise SystemExit(main())
