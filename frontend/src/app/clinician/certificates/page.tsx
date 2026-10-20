import { ClinicianCertificates } from "@/components/roles/clinician-certificates";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("clinician", "certificates");

export default function Page() {
  return <Workspace role="clinician" section="certificates"><ClinicianCertificates /></Workspace>;
}
