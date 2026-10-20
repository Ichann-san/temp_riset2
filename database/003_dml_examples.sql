-- Synthetic transaction examples. Nothing persists: this entire file rolls back.
-- Run after 001 and 002 on a disposable database only.
BEGIN;
SET LOCAL search_path = mcu, public;

DO $$
DECLARE a uuid; p uuid; u uuid; sv uuid; resource uuid; hold uuid; v uuid; ex uuid;
BEGIN
    INSERT INTO account(email, status) VALUES('demo@example.invalid','active') RETURNING id INTO a;
    INSERT INTO patient(nik_ciphertext, nik_lookup_digest, key_version, full_name, birth_date)
      VALUES(decode('00','hex'), 'SYNTHETIC_ONLY_NOT_A_REAL_NIK', 'test-key', 'DEMO PATIENT', DATE '1990-01-01')
      RETURNING id INTO p;
    INSERT INTO patient_access(account_id, patient_id, relationship, can_register)
      VALUES(a, p, 'self', true);
    INSERT INTO unit(code,name) VALUES('DEMO','Demo unit') RETURNING id INTO u;
    WITH s AS (INSERT INTO service(unit_id,code,name) VALUES(u,'DEMO','Synthetic service') RETURNING id)
    INSERT INTO service_version(service_id,version,base_price,result_schema)
      SELECT id,1,100000,'{"type":"object"}'::jsonb FROM s RETURNING id INTO sv;
    INSERT INTO operating_day(service_date,daily_limit) VALUES(DATE '2099-01-01',100);
    INSERT INTO capacity_resource(service_date,kind,capacity)
      VALUES(DATE '2099-01-01','daily',100) RETURNING id INTO resource;
    hold := reserve_capacity(a,'demo-booking',DATE '2099-01-01',ARRAY[resource],1,interval '5 minutes');
    -- Five minutes is a synthetic test value, NOT an approved hospital timeout.
    -- Real booking must validate every selected session/service capacity and payment policy.
    PERFORM 1 FROM registration_hold WHERE id = hold AND status = 'active'
      AND expires_at > clock_timestamp() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'HOLD_EXPIRED'; END IF;
    INSERT INTO visit(patient_id,booked_by,service_date,hold_id,booking_code,registration_snapshot)
      VALUES(p,a,DATE '2099-01-01',hold,'DEMO-BOOKING','{"source":"synthetic"}') RETURNING id INTO v;
    INSERT INTO examination(visit_id,service_version_id,unit_id,price_snapshot)
      VALUES(v,sv,u,100000) RETURNING id INTO ex;
    UPDATE registration_hold SET status = 'converted' WHERE id = hold;
    -- Conversion retains capacity. No increment here; it was already reserved.
    INSERT INTO outbox_job(kind,aggregate_id,dedupe_key,payload)
      VALUES('booking.confirmed',v,'booking:' || v,jsonb_build_object('visit_id',v));
    INSERT INTO audit_event(actor_id,action,entity_type,entity_id,request_id)
      VALUES(a,'booking.created','visit',v,'synthetic-request');

    -- Read a patient's authorized history. Results need the stricter can_read_results flag.
    PERFORM v2.id FROM visit v2 JOIN patient_access pa ON pa.patient_id = v2.patient_id
      WHERE pa.account_id = a AND pa.can_register AND pa.revoked_at IS NULL;
END $$;

-- Worker claim: commit this lease before calling external APIs in real execution.
WITH candidate AS (
    SELECT id FROM outbox_job
    WHERE (status = 'pending' AND available_at <= now())
       OR (status = 'processing' AND lease_until < now())
    ORDER BY available_at LIMIT 10 FOR UPDATE SKIP LOCKED
)
UPDATE outbox_job j SET status = 'processing', lease_until = now() + interval '1 minute', attempts = attempts + 1
FROM candidate c WHERE j.id = c.id RETURNING j.id, j.kind;

-- Management query: completed physical service time, separate from result verification lag.
SELECT unit_id, count(*) AS completed_services,
       avg(extract(epoch FROM (ended_at-started_at))/60) AS average_service_minutes
FROM queue_assignment WHERE status = 'finished' AND ended_at IS NOT NULL GROUP BY unit_id;

ROLLBACK;
