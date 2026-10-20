# ISLAH - current scope

Authoritative requirements: `../docs/Digitalisasi MCU RSUD Haji.md` and `../docs/system-design/`.

Users: patients, MCU staff, MCU doctors, unit staff, unit doctors, management, and editors.

This iteration (18 Oktober 2026, tahap 2) implements the owner's registration model: service date H+1 only (Asia/Jakarta, set by the server, no date choice), an empty patient form, one registration per account per service date, one unfinished registration per account, duplicate NIK on the same date refused, 100 main places + 50 FIFO waiting places, "Menunggu pembayaran" with a registration code (never a queue number). Payment is not built. Sign-in uses local per-role accounts (README.md); they are not an authorization boundary. Internal screens and the staged patient flow (`/patient/registration`) use synthetic data kept in the browser; `/patient/registration/session` and `/management/capacity` call the Flask API with an operator-issued access token held in memory only. The UI uses plain product language: no demo, simulation, mockup, prototype, use-case or Q-number labels (removed from source, not hidden). Deferred: payment, official queue number, production login, role-based authorization, walk-in, collective registration, official catalog and prices. Decision status: `../docs/system-design/OPEN_DECISIONS.md` section 10.

Prioritize simple Indonesian copy, a clear next action, empty states, keyboard navigation, responsive layouts and reusable components. The design documents define the future backend; this version only implements the interface structure.
