-- Meaningful invariant checks; synthetic data is rolled back.
BEGIN;
SET LOCAL search_path = mcu, public;
DO $$
DECLARE a uuid; p uuid; r uuid; h uuid; v uuid; u uuid; s uuid; sv uuid; e uuid;
    room_id_test uuid; presence uuid; result_id uuid; rejected boolean;
BEGIN
    INSERT INTO account(email,status) VALUES('validation@example.invalid','active') RETURNING id INTO a;
    INSERT INTO operating_day(service_date,daily_limit) VALUES(DATE '2099-02-01',1);
    INSERT INTO capacity_resource(service_date,kind,capacity) VALUES(DATE '2099-02-01','daily',1) RETURNING id INTO r;
    h := reserve_capacity(a,'first',DATE '2099-02-01',ARRAY[r],1,interval '5 minutes');
    IF reserve_capacity(a,'first',DATE '2099-02-01',ARRAY[r],1,interval '5 minutes') <> h THEN
      RAISE EXCEPTION 'Replay created another hold'; END IF;
    IF (SELECT allocated FROM capacity_resource WHERE id=r) <> 1 THEN RAISE EXCEPTION 'Replay consumed capacity'; END IF;
    rejected := false;
    BEGIN
      PERFORM reserve_capacity(a,'second',DATE '2099-02-01',ARRAY[r],1,interval '5 minutes');
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'CAPACITY_FULL' THEN RAISE; END IF; rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Overselling allowed'; END IF;
    rejected := false;
    BEGIN
      PERFORM reserve_capacity(a,'first',DATE '2099-02-01',ARRAY[r],2,interval '5 minutes');
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF; rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Changed replay accepted'; END IF;
    IF NOT release_capacity(h) OR release_capacity(h) THEN RAISE EXCEPTION 'Release is not idempotent'; END IF;
    IF (SELECT allocated FROM capacity_resource WHERE id=r) <> 0 THEN RAISE EXCEPTION 'Release leaked quota'; END IF;
    INSERT INTO patient(nik_ciphertext,nik_lookup_digest,key_version,full_name,birth_date)
      VALUES(decode('00','hex'),'VALIDATION_ONLY','test','TEST PATIENT',DATE '1990-01-01') RETURNING id INTO p;
    INSERT INTO visit(patient_id,booked_by,service_date,booking_code,registration_snapshot)
      VALUES(p,a,DATE '2099-02-01','TEST-1','{}') RETURNING id INTO v;
    rejected := false;
    BEGIN
      INSERT INTO visit(patient_id,booked_by,service_date,booking_code,registration_snapshot)
        VALUES(p,a,DATE '2099-02-01','TEST-2','{}');
    EXCEPTION WHEN unique_violation THEN rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Duplicate active visit allowed'; END IF;
    INSERT INTO unit(code,name) VALUES('TEST','Test') RETURNING id INTO u;
    INSERT INTO room(unit_id,code,name) VALUES(u,'TEST','Test room') RETURNING id INTO room_id_test;
    INSERT INTO doctor_presence(doctor_id,room_id) VALUES(a,room_id_test) RETURNING id INTO presence;
    rejected := false;
    BEGIN
      INSERT INTO doctor_presence(doctor_id,room_id) VALUES(a,room_id_test);
    EXCEPTION WHEN unique_violation THEN rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Duplicate doctor presence allowed'; END IF;
    INSERT INTO service(unit_id,code,name) VALUES(u,'TEST','Test service') RETURNING id INTO s;
    INSERT INTO service_version(service_id,version,base_price,result_schema) VALUES(s,1,1,'{}') RETURNING id INTO sv;
    INSERT INTO examination(visit_id,service_version_id,unit_id,price_snapshot) VALUES(v,sv,u,1) RETURNING id INTO e;
    INSERT INTO result_revision(examination_id,revision,payload,entered_by,submitted_at)
      VALUES(e,1,'{"value":"synthetic"}',a,now()) RETURNING id INTO result_id;
    INSERT INTO result_verification(result_revision_id,doctor_id,presence_id) VALUES(result_id,a,presence);
    rejected := false;
    BEGIN
      UPDATE result_revision SET payload='{}' WHERE id=result_id;
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'VERIFIED_RESULT_IMMUTABLE' THEN RAISE; END IF; rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Verified result was overwritten'; END IF;
    RAISE NOTICE 'PASS: quota, replay, release, active visit, doctor presence, verified revision';
END $$;
ROLLBACK;
