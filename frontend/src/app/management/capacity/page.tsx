import { ManagementCapacity } from "@/components/roles/management-capacity";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("management", "capacity");

export default function Page() {
  return <Workspace role="management" section="capacity"><ManagementCapacity /></Workspace>;
}
