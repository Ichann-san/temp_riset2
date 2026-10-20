import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("registration/services");

export default function Page() {
  return <PatientPage section="registration/services" />;
}
