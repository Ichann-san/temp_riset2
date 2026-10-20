"use client";

import { useRouter } from "next/navigation";
import { SelectField } from "@/components/fields";
import { type Role, landingHref, workspaces } from "@/lib/workspaces";

// Shown to the admin account only (see AccountMenu).
export function RoleSwitcher({ role }: { role?: Role }) {
  const router = useRouter();
  return <div className="role-switcher">
    <label htmlFor="review-role">Tinjau sebagai</label>
    <SelectField id="review-role" value={role ?? ""} onChange={(event) => {
      const nextRole = event.target.value;
      if (Object.hasOwn(workspaces, nextRole)) router.push(landingHref(nextRole as Role));
    }}>
      {!role && <option value="">Pilih ruang kerja</option>}
      {Object.entries(workspaces).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
    </SelectField>
  </div>;
}
