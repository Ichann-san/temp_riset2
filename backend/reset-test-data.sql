-- LOCAL TEST DATA ONLY. Stop the backend before executing this file.
-- Does not drop the database/schema, migrations, or objects outside registration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
DECLARE targets text;
BEGIN
    IF current_database() <> 'mcu_registration' THEN
        RAISE EXCEPTION 'Reset ditolak: hanya untuk database pengujian mcu_registration.';
    END IF;

    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
      INTO targets
      FROM pg_tables
     WHERE schemaname = 'registration'
       AND tablename IN (
           'principal', 'service_day', 'session', 'entry', 'submission',
           'service_date_capacity', 'patient', 'application', 'reservation'
       );

    IF targets IS NOT NULL THEN
        -- No CASCADE: unexpected external foreign-key dependencies abort the reset.
        EXECUTE 'TRUNCATE TABLE ' || targets || ' RESTART IDENTITY';
    END IF;
END
$$;
COMMIT;
SELECT 'Data pengujian registrasi dibersihkan; versi migrasi dipertahankan.' AS result;
