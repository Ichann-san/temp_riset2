// Central editable content. Components import from "@/content":
//   SiteContent.site      brand, header/footer, navigation labels, common messages (site.ts)
//   SiteContent.internal  internal role and admin screen copy (internal.ts)
//   SiteContent.patient   patient portal copy, incl. registration statuses and /patient/registration/session (patient.ts)
// What belongs here and what stays dynamic: see the header of site.ts.
import { internal } from "@/content/internal";
import { patientContent } from "@/content/patient";
import { site } from "@/content/site";

export { internal } from "@/content/internal";
export type { Internal, InternalRole } from "@/content/internal";
export { patientContent } from "@/content/patient";
export type { ApplicationStatus, PatientContent } from "@/content/patient";
export { site } from "@/content/site";
export type { Site } from "@/content/site";

export const SiteContent = { site, internal, patient: patientContent } as const;
