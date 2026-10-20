import { ClinicianCollective } from "@/components/roles/clinician-collective";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("clinician", "collective");

export default function Page() {
  return <Workspace role="clinician" section="collective"><ClinicianCollective /></Workspace>;
}
