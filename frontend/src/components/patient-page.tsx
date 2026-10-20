import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Block } from "@/components/frame";
import { AppShell } from "@/components/shell";
import { History, MapView, PatientHome } from "@/components/patient";
import { CertificateForm, FeedbackForm } from "@/components/patient-forms";
import { DoneStep, RegistrationForm, ReviewStep, ServicesStep, TermsStep } from "@/components/patient-registration";
import { Registration } from "@/components/registration";
import { screenOf } from "@/lib/workspaces";

// Each client component returns the composition blocks of its frame (see the block ids in frame.tsx).
const content: Record<string, ReactNode> = {
  "": <PatientHome />,
  registration: <RegistrationForm />,
  "registration/terms": <TermsStep />,
  "registration/services": <ServicesStep />,
  "registration/review": <ReviewStep />,
  "registration/done": <DoneStep />,
  "registration/session": <Block id="main"><Registration /></Block>,
  map: <MapView />,
  results: <History />,
  certificates: <CertificateForm />,
  feedback: <FeedbackForm />,
};

const screenFor = (section: string) => {
  const screen = screenOf("patient", section);
  if (!screen || !(section in content)) throw new Error(`Unknown patient screen ${section}`);
  return screen;
};

export const patientMetadata = (section: string): Metadata => ({ title: `${screenFor(section).title} | ISLAH` });

// Breadcrumb of the patient header: Beranda › (Registrasi ›) page. Beranda is the single patient hub (no drawer menu).
const crumbsFor = (section: string) => [
  { title: "Beranda", href: "/patient" },
  ...(section.startsWith("registration/") ? [{ title: "Registrasi", href: "/patient/registration" }] : []),
  ...(section ? [{ title: screenFor(section).title, href: `/patient/${section}` }] : []),
];

// Patient pages: Beranda has the footer, inner pages a back button and breadcrumb, "Pendaftaran tercatat" no header.
export function PatientPage({ section }: { section: string }) {
  const screen = screenFor(section);
  return <AppShell role="patient" section={section} header={screen.header} back={screen.back} crumbs={crumbsFor(section)} compose={screen.compose} size={screen.size} anchored={screen.anchored}
    title={screen.untitled ? undefined : screen.title} subtitle={screen.subtitle} footer={section === ""} menuBackground={section === ""}>
    {content[section]}
  </AppShell>;
}
