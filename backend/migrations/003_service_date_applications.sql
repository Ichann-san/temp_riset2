-- Service-date registration model (owner decisions 18 October 2026, sections A-I).
--
-- Concepts kept apart:
--   service_date_capacity  one row per service date: 100 main places, 50 waiting places,
--                          operator-set admission status, counters guarded by CHECKs.
--   patient                identity submitted on the form (synthetic review data only).
--                          NIK is stored only as a keyed HMAC plus its last four digits.
--   application            the registration made by an account (principal) for one patient
--                          and one service date; state and persisted waiting FIFO sequence.
--   reservation            the main place: held (awaiting payment) or confirmed. Confirmation
--                          is not reachable from the API; payment_reference stays NULL until a
--                          payment integration exists.
-- The legacy session/entry/submission tables and their data are left untouched; the API no longer
-- reads or writes them (see docs/system-design/REGISTRATION_BACKEND.md).
--
-- Today is computed inside PostgreSQL in Asia/Jakarta. registration.clock_now() honours the
-- transaction-local setting islah.test_clock, which the application sets only in test mode.
--
-- Rollback (only while no application rows exist; never deletes registrations):
--   DROP TABLE registration.reservation, registration.application, registration.patient,
--              registration.service_date_capacity;
--   DROP FUNCTION registration.current_service_date(), registration.jakarta_today(),
--                 registration.clock_now();
--   DELETE FROM registration.schema_version WHERE version = 3;
DO $$
BEGIN
    IF to_regclass('registration.service_date_capacity') IS NOT NULL
       OR to_regclass('registration.patient') IS NOT NULL
       OR to_regclass('registration.application') IS NOT NULL
       OR to_regclass('registration.reservation') IS NOT NULL THEN
        RAISE EXCEPTION 'Tabel service_date_capacity/patient/application/reservation sudah ada di luar riwayat migrasi; periksa manual, migrasi 003 tidak mengubah data yang ada.';
    END IF;
END $$;

CREATE FUNCTION registration.clock_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$
    SELECT COALESCE(NULLIF(current_setting('islah.test_clock', true), '')::timestamptz, now())
$$;
CREATE FUNCTION registration.jakarta_today() RETURNS date LANGUAGE sql STABLE AS $$
    SELECT (registration.clock_now() AT TIME ZONE 'Asia/Jakarta')::date
$$;
CREATE FUNCTION registration.current_service_date() RETURNS date LANGUAGE sql STABLE AS $$
    SELECT registration.jakarta_today() + 1
$$;

CREATE TABLE registration.service_date_capacity (
    service_date date PRIMARY KEY,
    main_capacity integer NOT NULL DEFAULT 100 CHECK (main_capacity > 0),
    waiting_capacity integer NOT NULL DEFAULT 50 CHECK (waiting_capacity >= 0),
    -- open: accepting new applications; closed: admission closed, existing applications kept;
    -- no_service: operator marked the day as closed/holiday, registration is never opened.
    status text NOT NULL CHECK (status IN ('open', 'closed', 'no_service')),
    held integer NOT NULL DEFAULT 0 CHECK (held >= 0),
    confirmed integer NOT NULL DEFAULT 0 CHECK (confirmed >= 0),
    waiting integer NOT NULL DEFAULT 0 CHECK (waiting >= 0),
    opened_at timestamptz,
    closed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT main_within_capacity CHECK (held + confirmed <= main_capacity),
    CONSTRAINT waiting_within_capacity CHECK (waiting <= waiting_capacity),
    CONSTRAINT no_service_is_empty CHECK (status <> 'no_service' OR (held = 0 AND confirmed = 0 AND waiting = 0))
);

CREATE TABLE registration.patient (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 100),
    nik_hmac bytea NOT NULL CHECK (octet_length(nik_hmac) = 32),
    nik_last4 text NOT NULL CHECK (nik_last4 ~ '^[0-9]{4}$'),
    birth_date date NOT NULL,
    address_ktp text NOT NULL CHECK (length(address_ktp) BETWEEN 1 AND 200),
    address_home text NOT NULL CHECK (length(address_home) BETWEEN 1 AND 200),
    phone text NOT NULL CHECK (phone ~ '^(\+62|62|0)8[0-9]{7,11}$'),
    gender text NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
    occupation text NOT NULL CHECK (length(occupation) BETWEEN 1 AND 100),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, nik_hmac)
);

CREATE TABLE registration.application (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference text NOT NULL UNIQUE CHECK (reference ~ '^REG-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
    principal_id uuid NOT NULL REFERENCES registration.principal(id),
    patient_id uuid NOT NULL UNIQUE,
    nik_hmac bytea NOT NULL,
    service_date date NOT NULL REFERENCES registration.service_date_capacity(service_date),
    request_key text NOT NULL CHECK (length(request_key) BETWEEN 1 AND 100),
    request_hmac bytea NOT NULL CHECK (octet_length(request_hmac) = 32),
    state text NOT NULL CHECK (state IN ('waiting', 'awaiting_payment', 'confirmed', 'cancelled')),
    waiting_sequence bigint UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    promoted_at timestamptz,
    confirmed_at timestamptz,
    cancelled_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (patient_id, nik_hmac) REFERENCES registration.patient(id, nik_hmac),
    UNIQUE (principal_id, request_key),
    UNIQUE (id, service_date),
    CONSTRAINT waiting_has_sequence CHECK (state <> 'waiting' OR waiting_sequence IS NOT NULL),
    CONSTRAINT cancelled_has_time CHECK ((state = 'cancelled') = (cancelled_at IS NOT NULL)),
    CONSTRAINT confirmed_has_time CHECK (state <> 'confirmed' OR confirmed_at IS NOT NULL)
);
CREATE SEQUENCE registration.waiting_sequence AS bigint OWNED BY registration.application.waiting_sequence;
-- One unfinished application (waiting or awaiting payment) per account, across dates.
CREATE UNIQUE INDEX application_one_unfinished_per_principal ON registration.application(principal_id)
    WHERE state IN ('waiting', 'awaiting_payment');
-- One active application per account per service date.
CREATE UNIQUE INDEX application_one_active_per_principal_date ON registration.application(principal_id, service_date)
    WHERE state IN ('waiting', 'awaiting_payment', 'confirmed');
-- One active application per NIK per service date, across accounts.
CREATE UNIQUE INDEX application_one_active_per_nik_date ON registration.application(service_date, nik_hmac)
    WHERE state IN ('waiting', 'awaiting_payment', 'confirmed');
CREATE INDEX application_waiting_fifo ON registration.application(service_date, waiting_sequence)
    WHERE state = 'waiting';
CREATE INDEX application_by_principal ON registration.application(principal_id, created_at DESC);

CREATE TABLE registration.reservation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL,
    service_date date NOT NULL,
    state text NOT NULL CHECK (state IN ('held', 'confirmed', 'released')),
    payment_reference text CHECK (length(payment_reference) BETWEEN 1 AND 200),
    held_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz,
    released_at timestamptz,
    FOREIGN KEY (application_id, service_date) REFERENCES registration.application(id, service_date),
    CONSTRAINT released_has_time CHECK ((state = 'released') = (released_at IS NOT NULL)),
    CONSTRAINT confirmed_reservation_has_time CHECK (state <> 'confirmed' OR confirmed_at IS NOT NULL)
);
CREATE UNIQUE INDEX reservation_one_live_per_application ON registration.reservation(application_id)
    WHERE state IN ('held', 'confirmed');

INSERT INTO registration.schema_version VALUES (3);
REVOKE ALL ON ALL TABLES IN SCHEMA registration FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA registration FROM PUBLIC;
