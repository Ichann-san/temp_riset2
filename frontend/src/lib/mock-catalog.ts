// Service names follow the wireframe; prices are the wireframe's placeholder numbers, never official RSUD tariffs.
export type MockService = { code: string; name: string; price: number };
export type MockPackage = { code: string; name: string; includes: string[]; price: number };

export const mockServices: MockService[] = [
  { code: "lab", name: "Laboratorium", price: 200_000 },
  { code: "eye", name: "Cek mata", price: 799_999 },
  { code: "ent", name: "THT", price: 300_000 },
];

// Paket Haji: contents not in the wireframe (shown as "belum tersedia"). Paket CPNS: Laboratorium + Cek mata (wireframe).
export const mockPackages: MockPackage[] = [
  { code: "haji", name: "Paket Haji", includes: [], price: 999_999 },
  { code: "cpns", name: "Paket CPNS", includes: ["lab", "eye"], price: 999_999 },
];

export const serviceByCode = (code: string) => mockServices.find((service) => service.code === code);
export const packageByCode = (code: string | null) => mockPackages.find((item) => item.code === code);
export const rupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

/** Chosen add-on services that exist and are not already included in the chosen package. */
export const extrasOf = (packageCode: string | null, services: string[]) =>
  services.filter((code) => serviceByCode(code) && !packageByCode(packageCode)?.includes.includes(code));

/** Service step rule: one package or at least one service. */
export const hasChoice = (packageCode: string | null, services: string[]) => !!packageByCode(packageCode) || extrasOf(packageCode, services).length > 0;

/** Package price plus add-on services that the package does not already include. */
export const totalOf = (packageCode: string | null, services: string[]) =>
  (packageByCode(packageCode)?.price ?? 0) + extrasOf(packageCode, services).reduce((sum, code) => sum + (serviceByCode(code)?.price ?? 0), 0);

/** Lines for the review and history: chosen package first, then add-ons. */
export const linesOf = (packageCode: string | null, services: string[]) => {
  const chosen = packageByCode(packageCode);
  return [...(chosen ? [{ name: chosen.name, price: chosen.price }] : []),
    ...extrasOf(packageCode, services).map((code) => ({ name: serviceByCode(code)?.name ?? code, price: serviceByCode(code)?.price ?? 0 }))];
};
