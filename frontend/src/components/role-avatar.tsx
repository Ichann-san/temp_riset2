import Image from "next/image";
import type { AccountRole } from "@/lib/mock-accounts";

// Local Caliber illustrations, not photos of hospital personnel. Role labels remain the source of meaning.
const images: Record<AccountRole, string> = {
  patient: "user-01a.svg", staff: "user-04b.svg", clinician: "user-02a.svg",
  "unit-staff": "user-06b.svg", "unit-doctor": "user-05a.svg",
  management: "user-07b.svg", editor: "user-03c.svg", admin: "user-02c.svg",
};

export function RoleAvatar({ role, size = "md" }: { role: AccountRole; size?: "sm" | "md" | "lg" }) {
  const pixels = size === "lg" ? 56 : size === "sm" ? 32 : 36;
  return <Image className="role-avatar" data-size={size} src={`/images/roles/${images[role]}`}
    alt="" aria-hidden="true" width={pixels} height={pixels} unoptimized />;
}
