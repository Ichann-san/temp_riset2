import { PatientPage, patientMetadata } from "@/components/patient-page";

export const metadata = patientMetadata("map");

export default function Page() {
  return <PatientPage section="map" />;
}
