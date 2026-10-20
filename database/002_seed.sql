-- Idempotent reference data only; no patients, passwords, clinical tests or tariffs invented.
BEGIN;
INSERT INTO mcu.role(code, description) VALUES
 ('PATIENT','Patient or verified representative'),
 ('MCU_STAFF','Registration and MCU operations'),
 ('MCU_DOCTOR','Final verification, collective import and certificates'),
 ('UNIT_STAFF','Unit movement and result entry'),
 ('UNIT_DOCTOR','Unit presence, result verification and tariff confirmation'),
 ('MANAGEMENT','Operational aggregate reports'),
 ('EDITOR','Calendar, quotas and service catalog')
ON CONFLICT (code) DO NOTHING;
INSERT INTO mcu.package(code, name) VALUES ('HAJI','Paket Haji'), ('CPNS','Paket Tes CPNS')
ON CONFLICT (code) DO NOTHING;
-- Non-package registration uses visit.package_id = NULL and explicitly selected services.
-- Hospital must populate approved service versions, package inclusions and prices.
COMMIT;
