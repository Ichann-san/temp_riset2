import type { NextConfig } from "next";

// Server-side only (not NEXT_PUBLIC_*). Rewrites are resolved when `next build` runs,
// so set ISLAH_API_ORIGIN before building as well as before starting.
const apiOrigin = process.env.ISLAH_API_ORIGIN ?? "http://127.0.0.1:5000";

// Old URLs kept working after navigation was grouped into tabs (14 Oktober 2026).
// Role roots land on the first work screen; keep in sync with landingHref() in src/lib/workspaces.ts.
const moved: [string, string][] = [
  ["/patient/packages", "/patient/registration"], // packages are the Layanan step of the wireframe registration
  ["/staff", "/staff/patient"],
  ["/staff/stations", "/staff/worklist"], // Status unit merged into Per unit
  ["/staff/add-patient", "/staff/patient"], // Tambah pasien lives in Daftar ulang (not available yet)
  ["/staff/timing", "/staff/worklist"], // Catatan waktu layanan merged into Worklist per unit, 17 Oktober 2026
  ["/clinician", "/clinician/review"],
  ["/unit-staff", "/unit-staff/queue"],
  ["/unit-doctor", "/unit-doctor/review"],
  ["/unit-doctor/charges", "/unit-doctor/review"], // tariff merged into verification
  ["/management", "/management/reports"],
  ["/editor", "/editor/calendar"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return moved.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
  // Browser calls same-origin /api/v1/*; Next proxies to the Flask backend (no CORS).
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
};

export default nextConfig;
