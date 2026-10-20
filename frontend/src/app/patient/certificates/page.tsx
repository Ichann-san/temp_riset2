import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("certificates");

export default function Page() {
  return <PatientPage section="certificates" />;
}
