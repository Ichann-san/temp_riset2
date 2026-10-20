import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("registration");

export default function Page() {
  return <PatientPage section="registration" />;
}
