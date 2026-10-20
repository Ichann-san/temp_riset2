import { FeedbackForm } from "@/components/patient-forms";
import { PatientDialog } from "@/components/patient-dialog";
import { patientContent } from "@/content/patient";

// Pop-up version of /patient/feedback when opened from Beranda (intercepting route).
export default function Page() {
  const { title, description } = patientContent.dialogs.feedback;
  return <PatientDialog title={title} description={description} compose="center" size="narrow"><FeedbackForm /></PatientDialog>;
}
