import { MapView } from "@/components/patient";
import { PatientDialog } from "@/components/patient-dialog";
import { patientContent } from "@/content/patient";

// Pop-up version of /patient/map when opened from Beranda (intercepting route).
export default function Page() {
  const { title, description } = patientContent.dialogs.map;
  return <PatientDialog title={title} description={description} compose="center" size="narrow"><MapView /></PatientDialog>;
}
