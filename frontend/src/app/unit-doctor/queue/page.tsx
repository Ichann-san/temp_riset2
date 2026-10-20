import { UnitDoctorQueue } from "@/components/roles/unit-doctor-queue";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("unit-doctor", "queue");

export default function Page() {
  return <Workspace role="unit-doctor" section="queue"><UnitDoctorQueue /></Workspace>;
}
