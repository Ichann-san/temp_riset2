import { History } from "@/components/patient";
import { PatientDialog } from "@/components/patient-dialog";
import { patientContent } from "@/content/patient";

// Pop-up version of /patient/results when opened from Beranda (intercepting route).
export default function Page() {
  const { title, description } = patientContent.dialogs.results;
  return <PatientDialog title={title} description={description} compose="rows"><History /></PatientDialog>;
}
