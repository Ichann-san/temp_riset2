import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("registration/review");

export default function Page() {
  return <PatientPage section="registration/review" />;
}
