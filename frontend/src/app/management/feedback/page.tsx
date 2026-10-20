import { ManagementFeedback } from "@/components/roles/management-feedback";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("management", "feedback");

export default function Page() {
  return <Workspace role="management" section="feedback"><ManagementFeedback /></Workspace>;
}
