// /unit-doctor/queue — Antrian unit, read-only for the unit doctor.
import { UnitQueue } from "@/components/roles/unit-queue";

export function UnitDoctorQueue() {
  return <UnitQueue canMove={false} />;
}
