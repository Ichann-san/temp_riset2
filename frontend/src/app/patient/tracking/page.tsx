import { redirect } from "next/navigation";

// The former queue page was replaced by the registration box on Beranda; old links land there.
export default function Page() {
  redirect("/patient");
}
