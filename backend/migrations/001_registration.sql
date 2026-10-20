-- Independent registration module; does not apply the historical full MCU draft.
-- Migrations run explicitly through `flask init-db`, never at server startup.
CREATE SCHEMA IF NOT EXISTS registration;
CREATE TABLE IF NOT EXISTS registration.schema_version (version integer PRIMARY KEY);
CREATE TABLE registration.principal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    label text NOT NULL UNIQUE CHECK(length(label) BETWEEN 1 AND 100),
    token_hash text NOT NULL UNIQUE,
    enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE registration.service_day (
    service_date date PRIMARY KEY,
    capacity integer NOT NULL DEFAULT 400 CHECK(capacity BETWEEN 1 AND 400)
);
CREATE TABLE registration.session (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_date date NOT NULL REFERENCES registration.service_day(service_date),
    label text NOT NULL CHECK(length(label) BETWEEN 1 AND 100),
    state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(service_date, label), UNIQUE(id, service_date)
);
CREATE TABLE registration.entry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    session_id uuid NOT NULL REFERENCES registration.session(id),
    principal_id uuid NOT NULL REFERENCES registration.principal(id),
    request_key text NOT NULL CHECK(length(request_key) BETWEEN 1 AND 100),
    state text NOT NULL CHECK(state IN ('active','waiting','submitted','left','cancelled')),
    active_slot integer CHECK(active_slot BETWEEN 1 AND 100),
    waiting_slot integer CHECK(waiting_slot BETWEEN 1 AND 50),
    joined_at timestamptz NOT NULL DEFAULT now(),
    activated_at timestamptz,
    finished_at timestamptz,
    CHECK ((state = 'active' AND active_slot IS NOT NULL AND waiting_slot IS NULL)
        OR (state = 'waiting' AND waiting_slot IS NOT NULL AND active_slot IS NULL)
        OR (state IN ('submitted','left','cancelled') AND active_slot IS NULL AND waiting_slot IS NULL)),
    UNIQUE(principal_id, request_key), UNIQUE(id, principal_id, session_id),
    UNIQUE(session_id, active_slot), UNIQUE(session_id, waiting_slot)
);
CREATE UNIQUE INDEX entry_one_live_per_session ON registration.entry(session_id, principal_id)
    WHERE state IN ('active','waiting');
CREATE INDEX entry_fifo ON registration.entry(session_id, sequence) WHERE state = 'waiting';
CREATE TABLE registration.submission (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    principal_id uuid NOT NULL REFERENCES registration.principal(id),
    service_date date NOT NULL REFERENCES registration.service_day(service_date),
    session_id uuid NOT NULL,
    entry_id uuid NOT NULL UNIQUE,
    day_slot integer NOT NULL CHECK(day_slot BETWEEN 1 AND 400),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY(session_id, service_date) REFERENCES registration.session(id, service_date),
    FOREIGN KEY(entry_id, principal_id, session_id) REFERENCES registration.entry(id, principal_id, session_id),
    UNIQUE(service_date, principal_id), UNIQUE(service_date, day_slot)
);
INSERT INTO registration.schema_version VALUES(1);
REVOKE ALL ON SCHEMA registration FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA registration FROM PUBLIC;
