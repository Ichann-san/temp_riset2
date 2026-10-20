import { StaffWorklist } from "@/components/roles/staff-worklist";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("staff", "worklist");

export default function Page() {
  return <Workspace role="staff" section="worklist"><StaffWorklist /></Workspace>;
}
