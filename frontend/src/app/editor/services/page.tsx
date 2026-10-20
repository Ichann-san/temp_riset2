import { EditorServices } from "@/components/roles/editor-services";
import { Workspace, workspaceMetadata } from "@/components/workspace";

export const metadata = workspaceMetadata("editor", "services");

export default function Page() {
  return <Workspace role="editor" section="services"><EditorServices /></Workspace>;
}
