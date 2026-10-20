from datetime import date

from flask import Blueprint, current_app, g, request

from . import applications
from .db import transaction
from .errors import DomainError, uuid_value
from .identity import parse_submission, protect
from .service_dates import capacity_view, current_view

api = Blueprint('registration', __name__, url_prefix='/api/v1')


def empty_body():
    if request.get_data():
        raise DomainError('UNEXPECTED_BODY', 'Endpoint ini tidak menerima body.', 400)


def idempotency_key():
    key = request.headers.get('Idempotency-Key', '')
    if not 1 <= len(key) <= 100 or not key.isascii() or any(ch.isspace() for ch in key):
        raise DomainError('INVALID_IDEMPOTENCY_KEY', 'Isi Idempotency-Key: 1-100 karakter ASCII tanpa spasi.', 400)
    return key


@api.get('/service-dates/current')
def current_service_date():
    """H+1 in Asia/Jakarta as decided by the server, with its admission status and counts."""
    with transaction(read_only=True) as conn:
        return current_view(conn)


@api.get('/service-dates/<service_date>')
def service_date_capacity(service_date):
    """Capacity view for one service date (counts only). Role-based restriction is deferred."""
    try:
        parsed = date.fromisoformat(service_date) if len(service_date) == 10 else None
    except ValueError:
        parsed = None
    if not parsed:
        raise DomainError('INVALID_DATE', 'Tanggal harus YYYY-MM-DD.', 400)
    with transaction(read_only=True) as conn:
        return capacity_view(conn, parsed)


@api.post('/applications')
def submit_application():
    key = idempotency_key()
    body = request.get_json(silent=True)
    if body is None:
        raise DomainError('INVALID_BODY', 'Kirim body JSON (Content-Type: application/json).', 400)
    expected_date, patient = parse_submission(body)
    patient, request_hmac = protect(patient, current_app.extensions['nik_key'], expected_date)
    with transaction() as conn:
        result, status = applications.submit(conn, g.principal_id, key, expected_date, patient, request_hmac)
    return result, status


@api.get('/applications')
def my_applications():
    # Only the caller's applications; query parameters are ignored.
    with transaction(read_only=True) as conn:
        return {'applications': applications.list_own(conn, g.principal_id)}


@api.get('/applications/<application_id>')
def my_application(application_id):
    with transaction(read_only=True) as conn:
        return applications.get_own(conn, uuid_value(application_id), g.principal_id)


@api.post('/applications/<application_id>/cancel')
def cancel_application(application_id):
    empty_body()
    with transaction() as conn:
        return applications.cancel(conn, uuid_value(application_id), g.principal_id)
