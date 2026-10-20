import atexit
import hashlib
import os
import time
from datetime import date, datetime
from uuid import uuid4
import psycopg
from flask import Flask, g, request
from flask.json.provider import DefaultJSONProvider
from psycopg_pool import PoolTimeout, TooManyRequests
from werkzeug.exceptions import HTTPException
from .db import create_pool
from .errors import DomainError
from .identity import KEY_ENV, load_key

class APIJSON(DefaultJSONProvider):
    @staticmethod
    def default(value):
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        return DefaultJSONProvider.default(value)

def create_app(config=None):
    app = Flask(__name__)
    app.json = APIJSON(app)
    app.config.update(DATABASE_URL=os.getenv('DATABASE_URL'), MAX_CONTENT_LENGTH=4096,
                      NIK_KEY=os.getenv(KEY_ENV), TEST_CLOCK=os.getenv('ISLAH_TEST_CLOCK'),
                      TEST_MODE=os.getenv('ISLAH_ENV') == 'test')
    if config:
        app.config.update(config)
    if not app.config['DATABASE_URL']:
        raise RuntimeError('Set DATABASE_URL; lihat backend/README.md.')
    testing = bool(app.config.get('TESTING') or app.config['TEST_MODE'])
    # Fail fast: without the key NIK uniqueness cannot be checked and no plaintext fallback exists.
    app.extensions['nik_key'] = load_key(app.config['NIK_KEY'], testing=bool(app.config.get('TESTING')))
    if app.config['TEST_CLOCK']:
        if not testing:
            raise RuntimeError('ISLAH_TEST_CLOCK hanya boleh dipakai bersama ISLAH_ENV=test.')
        if datetime.fromisoformat(app.config['TEST_CLOCK']).tzinfo is None:
            raise RuntimeError('ISLAH_TEST_CLOCK harus memuat zona waktu, mis. 2099-01-01T10:00:00+07:00.')
    pool = create_pool(app.config['DATABASE_URL'])
    app.extensions['db_pool'] = pool
    atexit.register(pool.close)

    @app.before_request
    def authenticate():
        g.started = time.perf_counter()
        g.request_id = str(uuid4())
        if request.path in ('/api/v1/health', '/api/v1/ready'):
            return
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer ') or not 20 <= len(header[7:]) <= 200:
            raise DomainError('UNAUTHORIZED', 'Bearer token diperlukan.', 401)
        with pool.connection() as conn:
            user = conn.execute('SELECT id FROM registration.principal WHERE enabled AND token_hash=%s',
                (hashlib.sha256(header[7:].encode()).hexdigest(),)).fetchone()
        if not user:
            raise DomainError('UNAUTHORIZED', 'Token tidak valid.', 401)
        g.principal_id = user['id']

    @app.after_request
    def headers(response):
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Request-ID'] = g.get('request_id', '')
        elapsed = (time.perf_counter() - g.get('started', time.perf_counter())) * 1000
        response.headers['Server-Timing'] = f'app;dur={elapsed:.2f}'
        return response

    @app.errorhandler(DomainError)
    def domain_error(error):
        return error.payload(), error.status

    @app.errorhandler(PoolTimeout)
    @app.errorhandler(TooManyRequests)
    @app.errorhandler(psycopg.OperationalError)
    @app.errorhandler(psycopg.errors.QueryCanceled)
    @app.errorhandler(psycopg.errors.LockNotAvailable)
    def unavailable(error):
        return {'error': {'code': 'TEMPORARILY_UNAVAILABLE', 'message': 'Ulangi request dengan kunci yang sama.'}}, 503

    @app.errorhandler(HTTPException)
    def http_error(error):
        return {'error': {'code': error.name, 'message': error.description}}, error.code

    @app.errorhandler(Exception)
    def unexpected(error):
        app.logger.error('request=%s error_type=%s', g.get('request_id'), type(error).__name__)
        return {'error': {'code': 'INTERNAL_ERROR', 'message': 'Terjadi kesalahan internal.'}}, 500

    @app.get('/api/v1/health')
    def health():
        return {'status': 'ok'}

    @app.get('/api/v1/ready')
    def ready():
        with pool.connection() as conn:
            ok = conn.execute("SELECT to_regclass('registration.application') IS NOT NULL AS ok").fetchone()['ok']
        return {'status': 'ready' if ok else 'migration_required'}, 200 if ok else 503

    from .routes import api
    from .commands import register_commands
    app.register_blueprint(api)
    register_commands(app)
    return app
