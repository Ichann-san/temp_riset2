import { UnitDoctorReview } from "@/components/roles/unit-doctor-review";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("unit-doctor", "review");

export default function Page() {
  return <Workspace role="unit-doctor" section="review"><UnitDoctorReview /></Workspace>;
}
