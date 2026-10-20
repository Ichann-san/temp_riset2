// Review accounts per role. No real authentication: these credentials ship in the browser bundle and protect nothing.
// An account is the responsible submitter of a registration, not necessarily the patient, so it carries no patient identity.
import { type Role, landingHref, workspaces } from "@/lib/workspaces";

export type AccountRole = Role | "admin";
export type MockAccount = { username: string; password: string; name: string; role: AccountRole };

export const mockAccounts: MockAccount[] = [
  { username: "admin", password: "admin123", name: "Admin ISLAH", role: "admin" },
  { username: "pasien", password: "pasien123", name: "Pasien", role: "patient" },
  { username: "petugas.mcu", password: "petugas123", name: "Petugas MCU", role: "staff" },
  { username: "dokter.mcu", password: "dokter123", name: "Dokter MCU", role: "clinician" },
  { username: "petugas.unit", password: "unit123", name: "Petugas Unit", role: "unit-staff" },
  { username: "dokter.unit", password: "dokterunit123", name: "Dokter Unit", role: "unit-doctor" },
  { username: "manajemen", password: "manajemen123", name: "Manajemen", role: "management" },
  { username: "editor", password: "editor123", name: "Editor", role: "editor" },
];

export const findAccount = (username: string, password: string) =>
  mockAccounts.find((account) => account.username === username.trim().toLowerCase() && account.password === password);
export const accountByUsername = (username: string) => mockAccounts.find((account) => account.username === username);
export const roleLabel = (role: AccountRole) => (role === "admin" ? "Admin" : workspaces[role].label);
export const landingFor = (account: MockAccount) => (account.role === "admin" ? "/admin" : landingHref(account.role));
