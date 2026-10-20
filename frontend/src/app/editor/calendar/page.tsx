import { EditorCalendar } from "@/components/roles/editor-calendar";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("editor", "calendar");

export default function Page() {
  return <Workspace role="editor" section="calendar"><EditorCalendar /></Workspace>;
}
