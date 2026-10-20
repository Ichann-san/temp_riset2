import { ManagementReports } from "@/components/roles/management-reports";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("management", "reports");

export default function Page() {
  return <Workspace role="management" section="reports"><ManagementReports /></Workspace>;
}
