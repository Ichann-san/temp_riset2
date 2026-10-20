import { UnitStaffResults } from "@/components/roles/unit-staff-results";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("unit-staff", "results");

export default function Page() {
  return <Workspace role="unit-staff" section="results"><UnitStaffResults /></Workspace>;
}
