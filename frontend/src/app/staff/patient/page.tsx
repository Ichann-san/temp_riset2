import { StaffPatient } from "@/components/roles/staff-patient";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("staff", "patient");

export default function Page() {
  return <Workspace role="staff" section="patient"><StaffPatient /></Workspace>;
}
