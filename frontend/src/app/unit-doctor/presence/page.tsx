import { UnitDoctorPresence } from "@/components/roles/unit-doctor-presence";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("unit-doctor", "presence");

export default function Page() {
  return <Workspace role="unit-doctor" section="presence"><UnitDoctorPresence /></Workspace>;
}
