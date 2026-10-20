import { AdminPage } from "@/components/workspace";
import { internal, site } from "@/content";

export const metadata = { title: site.pageTitle(internal.admin.title) };

export default function Page() {
  return <AdminPage />;
}
