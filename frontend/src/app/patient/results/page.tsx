import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("results");

export default function Page() {
  return <PatientPage section="results" />;
}
