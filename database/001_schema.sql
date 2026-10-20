-- PostgreSQL 18 baseline. Run once on an empty application database.
-- Run with psql -v ON_ERROR_STOP=1. Never run against production without review.
BEGIN;
CREATE SCHEMA mcu;
SET search_path = mcu, public;

CREATE TABLE account (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text, phone text, password_hash text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE UNIQUE INDEX account_email_unique ON account (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX account_phone_unique ON account (phone) WHERE phone IS NOT NULL;
CREATE TABLE role (code text PRIMARY KEY, description text NOT NULL);
CREATE TABLE unit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL);
CREATE TABLE account_role (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES account(id), role_code text NOT NULL REFERENCES role(code),
    unit_id uuid REFERENCES unit(id), UNIQUE NULLS NOT DISTINCT (account_id, role_code, unit_id)
);
CREATE TABLE auth_session (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES account(id),
    token_digest text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), CHECK (expires_at > created_at)
);
CREATE TABLE patient (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nik_ciphertext bytea NOT NULL, nik_lookup_digest text NOT NULL UNIQUE, key_version text NOT NULL,
    full_name text NOT NULL CHECK (length(trim(full_name)) > 0), birth_date date NOT NULL,
    identity_status text NOT NULL DEFAULT 'pending' CHECK (identity_status IN ('pending','verified','rejected')),
    external_identity_ref text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE patient_access (
    account_id uuid NOT NULL REFERENCES account(id), patient_id uuid NOT NULL REFERENCES patient(id),
    relationship text NOT NULL, can_register boolean NOT NULL DEFAULT false,
    can_read_results boolean NOT NULL DEFAULT false, verified_at timestamptz, revoked_at timestamptz,
    PRIMARY KEY (account_id, patient_id), CHECK (NOT can_read_results OR verified_at IS NOT NULL)
);
CREATE TABLE consent (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES patient(id),
    actor_id uuid NOT NULL REFERENCES account(id), policy_version text NOT NULL,
    purpose text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE TABLE room (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), unit_id uuid NOT NULL REFERENCES unit(id),
    code text NOT NULL UNIQUE, name text NOT NULL, map_object_key text,
    UNIQUE (id, unit_id)
);
CREATE TABLE doctor_presence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), doctor_id uuid NOT NULL REFERENCES account(id),
    room_id uuid NOT NULL REFERENCES room(id), checked_in_at timestamptz NOT NULL DEFAULT now(),
    checked_out_at timestamptz, CHECK (checked_out_at IS NULL OR checked_out_at >= checked_in_at)
);
CREATE UNIQUE INDEX one_doctor_per_room ON doctor_presence(room_id) WHERE checked_out_at IS NULL;
CREATE UNIQUE INDEX one_room_per_doctor ON doctor_presence(doctor_id) WHERE checked_out_at IS NULL;
CREATE TABLE service (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), unit_id uuid NOT NULL REFERENCES unit(id),
    code text NOT NULL UNIQUE, name text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE service_version (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES service(id),
    version integer NOT NULL CHECK (version > 0), base_price numeric(14,2) NOT NULL CHECK (base_price >= 0),
    expected_minutes integer CHECK (expected_minutes > 0),
    result_schema jsonb NOT NULL CHECK (jsonb_typeof(result_schema) = 'object'),
    approved_constraints jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(approved_constraints) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (service_id, version)
);
CREATE TABLE package (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL,
    active boolean NOT NULL DEFAULT true
);
CREATE TABLE package_item (
    package_id uuid NOT NULL REFERENCES package(id), service_version_id uuid NOT NULL REFERENCES service_version(id),
    PRIMARY KEY (package_id, service_version_id)
);
CREATE TABLE operating_day (
    service_date date PRIMARY KEY, is_open boolean NOT NULL DEFAULT true,
    daily_limit integer NOT NULL DEFAULT 100 CHECK (daily_limit BETWEEN 0 AND 100)
);
CREATE TABLE registration_session (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_date date NOT NULL REFERENCES operating_day(service_date),
    label text NOT NULL, opens_at timestamptz NOT NULL, closes_at timestamptz NOT NULL,
    CHECK (closes_at > opens_at), UNIQUE(id, service_date)
);
-- A resource represents a daily, session or examination-specific quota.
CREATE TABLE capacity_resource (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_date date NOT NULL REFERENCES operating_day(service_date),
    kind text NOT NULL CHECK (kind IN ('daily','session','service')),
    session_id uuid, service_id uuid REFERENCES service(id),
    capacity integer NOT NULL CHECK (capacity BETWEEN 0 AND 100),
    allocated integer NOT NULL DEFAULT 0 CHECK (allocated >= 0 AND allocated <= capacity),
    FOREIGN KEY (session_id, service_date) REFERENCES registration_session(id, service_date),
    CHECK ((kind = 'daily' AND session_id IS NULL AND service_id IS NULL)
        OR (kind = 'session' AND session_id IS NOT NULL AND service_id IS NULL)
        OR (kind = 'service' AND session_id IS NULL AND service_id IS NOT NULL)),
    UNIQUE NULLS NOT DISTINCT (service_date, kind, session_id, service_id)
);
CREATE TABLE registration_hold (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES account(id),
    service_date date NOT NULL REFERENCES operating_day(service_date),
    request_key text NOT NULL, request_fingerprint text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','released')),
    expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (actor_id, request_key), CHECK (expires_at > created_at)
);
CREATE TABLE hold_allocation (
    hold_id uuid NOT NULL REFERENCES registration_hold(id), resource_id uuid NOT NULL REFERENCES capacity_resource(id),
    quantity integer NOT NULL CHECK (quantity > 0), PRIMARY KEY (hold_id, resource_id)
);
CREATE TABLE collective_import (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL REFERENCES account(id),
    hold_id uuid REFERENCES registration_hold(id), object_key text NOT NULL,
    status text NOT NULL CHECK (status IN ('uploaded','validating','invalid','ready','committed','expired')),
    row_count integer NOT NULL CHECK (row_count > 0), validation_summary jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE visit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES patient(id),
    booked_by uuid NOT NULL REFERENCES account(id), service_date date NOT NULL REFERENCES operating_day(service_date),
    hold_id uuid REFERENCES registration_hold(id), collective_import_id uuid REFERENCES collective_import(id),
    package_id uuid REFERENCES package(id), booking_code text NOT NULL UNIQUE,
    queue_number integer CHECK (queue_number > 0),
    status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','arrived','in_progress','completed','cancelled')),
    registration_snapshot jsonb NOT NULL CHECK (jsonb_typeof(registration_snapshot) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(), checked_in_at timestamptz, completed_at timestamptz,
    UNIQUE (service_date, queue_number)
);
CREATE UNIQUE INDEX one_active_visit_per_patient ON visit(patient_id)
    WHERE status IN ('booked','arrived','in_progress');
CREATE INDEX visit_worklist ON visit(service_date, status);
CREATE TABLE examination (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES visit(id),
    service_version_id uuid NOT NULL REFERENCES service_version(id), unit_id uuid NOT NULL REFERENCES unit(id),
    required boolean NOT NULL DEFAULT true, price_snapshot numeric(14,2) NOT NULL CHECK (price_snapshot >= 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','assigned','in_service','completed','cancelled')),
    eligible_after timestamptz, version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    UNIQUE (visit_id, service_version_id), UNIQUE (id, visit_id), UNIQUE (id, unit_id)
);
CREATE TABLE queue_assignment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), examination_id uuid NOT NULL,
    visit_id uuid NOT NULL, unit_id uuid NOT NULL, room_id uuid,
    status text NOT NULL CHECK (status IN ('waiting','called','in_service','finished','cancelled')),
    assigned_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, ended_at timestamptz,
    reason text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    FOREIGN KEY (examination_id, visit_id) REFERENCES examination(id, visit_id),
    FOREIGN KEY (examination_id, unit_id) REFERENCES examination(id, unit_id),
    FOREIGN KEY (room_id, unit_id) REFERENCES room(id, unit_id),
    CHECK (started_at IS NULL OR started_at >= assigned_at),
    CHECK (ended_at IS NULL OR (started_at IS NOT NULL AND ended_at >= started_at))
);
CREATE UNIQUE INDEX one_active_assignment_per_visit ON queue_assignment(visit_id)
    WHERE status IN ('waiting','called','in_service');
CREATE UNIQUE INDEX one_patient_per_room ON queue_assignment(room_id) WHERE status = 'in_service';
CREATE INDEX unit_waiting ON queue_assignment(unit_id, assigned_at) WHERE status IN ('waiting','called');
CREATE TABLE examination_event (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, examination_id uuid NOT NULL REFERENCES examination(id),
    actor_id uuid NOT NULL REFERENCES account(id), kind text NOT NULL CHECK (kind IN ('IN','OUT','OVERRIDE')),
    occurred_at timestamptz NOT NULL DEFAULT now(), reason text, request_key text NOT NULL,
    UNIQUE (actor_id, request_key)
);
CREATE TABLE result_revision (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), examination_id uuid NOT NULL REFERENCES examination(id),
    revision integer NOT NULL CHECK (revision > 0), payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    entered_by uuid NOT NULL REFERENCES account(id), entered_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz, amendment_reason text, UNIQUE(examination_id, revision)
);
CREATE TABLE result_verification (
    result_revision_id uuid PRIMARY KEY REFERENCES result_revision(id), doctor_id uuid NOT NULL REFERENCES account(id),
    presence_id uuid NOT NULL REFERENCES doctor_presence(id),
    verification_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE final_review (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES visit(id),
    revision integer NOT NULL CHECK (revision > 0), doctor_id uuid NOT NULL REFERENCES account(id),
    verified_at timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz,
    UNIQUE(visit_id, revision)
);
CREATE UNIQUE INDEX one_current_final_review ON final_review(visit_id) WHERE superseded_at IS NULL;
CREATE TABLE final_review_item (
    final_review_id uuid NOT NULL REFERENCES final_review(id),
    result_revision_id uuid NOT NULL REFERENCES result_verification(result_revision_id),
    PRIMARY KEY(final_review_id, result_revision_id)
);
CREATE TABLE charge (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES visit(id),
    examination_id uuid, category text NOT NULL CHECK (category IN ('admin','service','adjustment')),
    description text NOT NULL, amount numeric(14,2) NOT NULL, currency char(3) NOT NULL DEFAULT 'IDR',
    confirmed_by uuid REFERENCES account(id), confirmed_at timestamptz, adjustment_reason text,
    FOREIGN KEY(examination_id, visit_id) REFERENCES examination(id, visit_id),
    CHECK (category = 'adjustment' OR amount >= 0),
    CHECK (category <> 'adjustment' OR adjustment_reason IS NOT NULL),
    CHECK ((confirmed_by IS NULL) = (confirmed_at IS NULL))
);
CREATE TABLE payment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid REFERENCES visit(id),
    hold_id uuid REFERENCES registration_hold(id), provider text NOT NULL, provider_reference text,
    purpose text NOT NULL CHECK (purpose IN ('initial','final','refund')),
    amount numeric(14,2) NOT NULL CHECK (amount > 0), currency char(3) NOT NULL DEFAULT 'IDR',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','failed','reconciliation','refunded')),
    created_at timestamptz NOT NULL DEFAULT now(), settled_at timestamptz,
    CHECK (visit_id IS NOT NULL OR hold_id IS NOT NULL), UNIQUE(provider, provider_reference)
);
CREATE TABLE payment_event (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, payment_id uuid NOT NULL REFERENCES payment(id),
    provider text NOT NULL, provider_event_id text NOT NULL, payload_digest text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(), applied_at timestamptz,
    UNIQUE(provider, provider_event_id)
);
CREATE TABLE certificate_request (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES visit(id),
    requested_by uuid NOT NULL REFERENCES account(id), certificate_type text NOT NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','issued'))
);
CREATE TABLE document (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES visit(id),
    final_review_id uuid REFERENCES final_review(id), certificate_request_id uuid REFERENCES certificate_request(id),
    kind text NOT NULL CHECK (kind IN ('mcu_result','certificate')),
    version integer NOT NULL CHECK (version > 0), object_key text NOT NULL UNIQUE, sha256 text NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now(), superseded_at timestamptz,
    CHECK ((kind = 'mcu_result' AND final_review_id IS NOT NULL AND certificate_request_id IS NULL)
        OR (kind = 'certificate' AND certificate_request_id IS NOT NULL)),
    UNIQUE (visit_id, kind, version)
);
CREATE TABLE delivery (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES document(id),
    recipient_account_id uuid NOT NULL REFERENCES account(id), channel text NOT NULL CHECK(channel IN ('portal','whatsapp')),
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','delivered','failed')),
    provider_reference text, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
    last_error_code text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES visit(id),
    author_id uuid NOT NULL REFERENCES account(id), rating integer CHECK(rating BETWEEN 1 AND 5),
    message text NOT NULL, kind text NOT NULL CHECK(kind IN ('review','complaint')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_event (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES account(id),
    action text NOT NULL, entity_type text NOT NULL, entity_id uuid, request_id text NOT NULL,
    reason text, metadata jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity ON audit_event(entity_type, entity_id, occurred_at);
CREATE TABLE outbox_job (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, aggregate_id uuid NOT NULL,
    dedupe_key text NOT NULL UNIQUE, payload jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','dead')),
    available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
    attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), last_error_code text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_ready ON outbox_job(available_at) WHERE status IN ('pending','processing');
CREATE TABLE idempotency_record (
    actor_id uuid NOT NULL REFERENCES account(id), action text NOT NULL, request_key text NOT NULL,
    request_digest text NOT NULL, response_code integer NOT NULL, response_body jsonb NOT NULL,
    expires_at timestamptz NOT NULL, PRIMARY KEY(actor_id, action, request_key)
);

-- Capacity primitive. Caller must supply daily + selected session + required service resources.
-- All quantities are equal for this primitive (e.g. a homogeneous collective batch).
-- Authorization, session eligibility and service completeness are application responsibilities.
CREATE FUNCTION reserve_capacity(p_actor uuid, p_key text, p_date date, p_resources uuid[],
    p_quantity integer, p_ttl interval) RETURNS uuid LANGUAGE plpgsql SET search_path = mcu, pg_temp AS $$
DECLARE h registration_hold%ROWTYPE; r capacity_resource%ROWTYPE; new_id uuid;
    fingerprint text; resource_count integer; day_row operating_day%ROWTYPE;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 OR p_ttl IS NULL OR p_ttl <= interval '0 seconds'
       OR p_resources IS NULL OR cardinality(p_resources) = 0 THEN
        RAISE EXCEPTION 'INVALID_RESERVATION';
    END IF;
    SELECT count(DISTINCT x) INTO resource_count FROM unnest(p_resources) x;
    IF resource_count <> cardinality(p_resources) THEN RAISE EXCEPTION 'DUPLICATE_RESOURCE'; END IF;
    SELECT string_agg(x::text, ',' ORDER BY x) || ':' || p_quantity || ':' || p_date || ':' || p_ttl
        INTO fingerprint FROM unnest(p_resources) x;
    -- Serialize identical request keys, including an initial insert racing another insert.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text || ':' || p_key, 0));
    SELECT * INTO h FROM registration_hold WHERE actor_id = p_actor AND request_key = p_key;
    IF FOUND THEN
        IF h.request_fingerprint <> fingerprint THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
        RETURN h.id; -- Caller still checks returned status/expiry; replay never creates a new hold.
    END IF;
    SELECT * INTO day_row FROM operating_day WHERE service_date = p_date FOR UPDATE;
    IF NOT FOUND OR NOT day_row.is_open THEN RAISE EXCEPTION 'DAY_CLOSED'; END IF;
    IF (SELECT count(*) FROM capacity_resource WHERE id = ANY(p_resources) AND service_date = p_date) <> resource_count
       OR (SELECT count(*) FROM capacity_resource WHERE id = ANY(p_resources) AND kind = 'daily') <> 1 THEN
        RAISE EXCEPTION 'INVALID_RESOURCE_SET';
    END IF;
    FOR r IN SELECT * FROM capacity_resource WHERE id = ANY(p_resources) ORDER BY id FOR UPDATE LOOP
        IF r.allocated + p_quantity > r.capacity OR r.capacity > day_row.daily_limit THEN
            RAISE EXCEPTION 'CAPACITY_FULL';
        END IF;
    END LOOP;
    INSERT INTO registration_hold(actor_id, service_date, request_key, request_fingerprint, expires_at)
      VALUES(p_actor, p_date, p_key, fingerprint, clock_timestamp() + p_ttl) RETURNING id INTO new_id;
    INSERT INTO hold_allocation SELECT new_id, x, p_quantity FROM unnest(p_resources) x;
    UPDATE capacity_resource SET allocated = allocated + p_quantity WHERE id = ANY(p_resources);
    RETURN new_id;
END $$;

CREATE FUNCTION release_capacity(p_hold uuid) RETURNS boolean LANGUAGE plpgsql SET search_path = mcu, pg_temp AS $$
DECLARE h registration_hold%ROWTYPE; item record;
BEGIN
    SELECT * INTO h FROM registration_hold WHERE id = p_hold FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'HOLD_NOT_FOUND'; END IF;
    IF h.status <> 'active' THEN RETURN false; END IF;
    FOR item IN SELECT a.resource_id, a.quantity FROM hold_allocation a
        JOIN capacity_resource r ON r.id = a.resource_id
        WHERE a.hold_id = p_hold ORDER BY r.id FOR UPDATE OF r LOOP
        UPDATE capacity_resource SET allocated = allocated - item.quantity WHERE id = item.resource_id;
    END LOOP;
    UPDATE registration_hold SET status = 'released' WHERE id = p_hold;
    RETURN true;
END $$;

-- Keep verified revisions immutable. Amend by inserting a new revision.
CREATE FUNCTION protect_verified_result() RETURNS trigger LANGUAGE plpgsql SET search_path = mcu, pg_temp AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM result_verification WHERE result_revision_id = OLD.id) THEN
        RAISE EXCEPTION 'VERIFIED_RESULT_IMMUTABLE';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER verified_result_guard BEFORE UPDATE OR DELETE ON result_revision
    FOR EACH ROW EXECUTE FUNCTION protect_verified_result();

-- No application or anonymous database access is granted by this migration.
REVOKE ALL ON SCHEMA mcu FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA mcu FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA mcu FROM PUBLIC;
COMMIT;
