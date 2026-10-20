import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("feedback");

export default function Page() {
  return <PatientPage section="feedback" />;
}
