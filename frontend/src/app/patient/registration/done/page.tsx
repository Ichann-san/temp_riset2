import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("registration/done");

export default function Page() {
  return <PatientPage section="registration/done" />;
}
