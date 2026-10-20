-- One active/waiting place per principal (account) across all sessions and dates.
-- Existing violations stop the migration; nothing is cancelled automatically.
-- Rollback: DROP INDEX registration.entry_one_live_per_principal;
--           DELETE FROM registration.schema_version WHERE version = 2;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM registration.entry WHERE state IN ('active','waiting')
               GROUP BY principal_id HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Ada akun dengan lebih dari satu tiket aktif/tunggu; keluarkan tiket atau tutup sesi terkait sebelum migrasi 002.';
    END IF;
END $$;
CREATE UNIQUE INDEX entry_one_live_per_principal ON registration.entry(principal_id)
    WHERE state IN ('active','waiting');
INSERT INTO registration.schema_version VALUES(2);
