"""Patient form validation/normalization and NIK protection.

The NIK is never stored, logged, or returned in plaintext. It is reduced to
HMAC-SHA256(ISLAH_NIK_KEY, "nik" || 16 digits) for per-service-date uniqueness, plus the last four
digits for display to the submitting account. Field rules mirror the approved patient form
(frontend/src/components/patient-registration.tsx validateIdentity, identity-meta.ts).
"""
import hashlib
import hmac
import json
import re
import secrets
import unicodedata
from datetime import date

from .errors import DomainError

KEY_ENV = 'ISLAH_NIK_KEY'
MIN_KEY_BYTES = 32
FIELDS = ('name', 'nik', 'birth_date', 'address_ktp', 'address_home', 'phone', 'gender', 'occupation')
GENDERS = ('Laki-laki', 'Perempuan')
NIK_RE = re.compile(r'[0-9]{16}')
PHONE_RE = re.compile(r'(\+62|62|0)8[0-9]{7,11}')
# Technical length bounds (not hospital policy) that keep rows and the 4 KiB request body bounded.
MAX_LENGTH = {'name': 100, 'address_ktp': 200, 'address_home': 200, 'occupation': 100}
LABELS = {'name': 'Nama lengkap', 'address_ktp': 'Alamat KTP', 'address_home': 'Alamat domisili',
          'occupation': 'Pekerjaan'}
REQUIRED = {'name': 'Isi nama lengkap.', 'address_ktp': 'Isi alamat sesuai KTP.',
            'address_home': 'Isi alamat domisili.', 'occupation': 'Isi pekerjaan.'}
MESSAGES = {
    'nik': 'NIK harus berjumlah 16 digit!',
    'birth_date_missing': 'Isi tanggal lahir.',
    'birth_date_invalid': 'Tanggal lahir tidak valid.',
    'birth_date_future': 'Tanggal lahir tidak boleh melewati hari ini.',
    'phone': 'Gunakan nomor WhatsApp yang valid, misalnya 08xxxxxxxxxx.',
    'gender': 'Pilih jenis kelamin.',
}


def load_key(value, testing=False):
    """Returns key bytes from a hex string; fails fast unless testing (then a random key is used)."""
    if not value:
        if testing:
            return secrets.token_bytes(MIN_KEY_BYTES)
        raise RuntimeError(f'Set {KEY_ENV} (hex, minimal {MIN_KEY_BYTES} byte); lihat backend/README.md.')
    try:
        key = bytes.fromhex(value.strip())
    except ValueError:
        raise RuntimeError(f'{KEY_ENV} harus berupa hex.') from None
    if len(key) < MIN_KEY_BYTES:
        raise RuntimeError(f'{KEY_ENV} minimal {MIN_KEY_BYTES} byte ({MIN_KEY_BYTES * 2} karakter hex).')
    return key


def keyed_hash(key, domain, data):
    return hmac.new(key, domain + b'\x00' + data, hashlib.sha256).digest()


def _text(value, field, errors):
    if not isinstance(value, str):
        errors[field] = REQUIRED[field]
        return None
    text = ' '.join(value.split())
    if not text:
        errors[field] = REQUIRED[field]
    elif any(unicodedata.category(ch).startswith('C') for ch in text):
        errors[field] = f'{LABELS[field]} memuat karakter yang tidak valid.'
    elif len(text) > MAX_LENGTH[field]:
        errors[field] = f'{LABELS[field]} maksimal {MAX_LENGTH[field]} karakter.'
    return text


def validate_patient(raw):
    """Returns (normalized patient dict incl. plaintext 'nik', field errors). Errors never echo values."""
    if not isinstance(raw, dict):
        raise DomainError('INVALID_BODY', 'Field "patient" harus berupa objek.', 400)
    unknown = sorted(set(raw) - set(FIELDS))
    if unknown:
        raise DomainError('INVALID_BODY', 'Field pasien tidak dikenal.', 400, {'unknown_fields': unknown[:10]})
    errors, patient = {}, {}
    for field in ('name', 'address_ktp', 'address_home', 'occupation'):
        patient[field] = _text(raw.get(field), field, errors)
    nik = raw.get('nik')
    nik = nik.strip() if isinstance(nik, str) else ''
    if not NIK_RE.fullmatch(nik):
        errors['nik'] = MESSAGES['nik']
    patient['nik'] = nik
    birth = raw.get('birth_date')
    if not isinstance(birth, str) or not birth.strip():
        errors['birth_date'] = MESSAGES['birth_date_missing']
    else:
        try:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', birth.strip()):
                raise ValueError
            patient['birth_date'] = date.fromisoformat(birth.strip())
        except ValueError:
            errors['birth_date'] = MESSAGES['birth_date_invalid']
    phone = raw.get('phone')
    phone = re.sub(r'[\s-]', '', phone) if isinstance(phone, str) else ''
    if not PHONE_RE.fullmatch(phone):
        errors['phone'] = MESSAGES['phone']
    patient['phone'] = phone
    gender = raw.get('gender')
    if gender not in GENDERS:
        errors['gender'] = MESSAGES['gender']
    patient['gender'] = gender
    return patient, errors


def parse_submission(body):
    """Validates the JSON body of POST /applications (format only; date checks need the database)."""
    if not isinstance(body, dict):
        raise DomainError('INVALID_BODY', 'Body harus berupa objek JSON.', 400)
    unknown = sorted(set(body) - {'service_date', 'patient'})
    if unknown:
        raise DomainError('INVALID_BODY', 'Field tidak dikenal.', 400, {'unknown_fields': unknown[:10]})
    expected = body.get('service_date')
    try:
        if not isinstance(expected, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', expected):
            raise ValueError
        expected = date.fromisoformat(expected)
    except ValueError:
        raise DomainError('INVALID_BODY', 'service_date harus berisi tanggal layanan yang ditampilkan server (YYYY-MM-DD).', 400) from None
    patient, errors = validate_patient(body.get('patient'))
    if errors:
        raise DomainError('VALIDATION_FAILED', 'Periksa kembali data pasien.', 400, {'fields': errors})
    return expected, patient


def protect(patient, key, expected_date):
    """Replaces the plaintext NIK with its HMAC and last four digits; adds the request fingerprint."""
    nik = patient.pop('nik')
    patient['nik_hmac'] = keyed_hash(key, b'nik', nik.encode('ascii'))
    patient['nik_last4'] = nik[-4:]
    canonical = json.dumps({**patient, 'nik_hmac': patient['nik_hmac'].hex(), 'birth_date': patient['birth_date'].isoformat(),
                            'service_date': expected_date.isoformat()}, sort_keys=True, ensure_ascii=False)
    request_hmac = keyed_hash(key, b'request', canonical.encode('utf-8'))
    return patient, request_hmac
