import { ClinicianReview } from "@/components/roles/clinician-review";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("clinician", "review");

export default function Page() {
  return <Workspace role="clinician" section="review"><ClinicianReview /></Workspace>;
}
