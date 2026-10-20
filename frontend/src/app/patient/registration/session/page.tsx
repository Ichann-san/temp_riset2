import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("registration/session");

export default function Page() {
  return <PatientPage section="registration/session" />;
}
