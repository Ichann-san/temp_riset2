import { UnitStaffQueue } from "@/components/roles/unit-staff-queue";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("unit-staff", "queue");

export default function Page() {
  return <Workspace role="unit-staff" section="queue"><UnitStaffQueue /></Workspace>;
}
