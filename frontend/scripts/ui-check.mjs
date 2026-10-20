// Responsive smoke check for every page: horizontal overflow, console errors and redirects at several widths.
// Usage: start the dev server (npm run dev), then `npm run check:ui` (or `node scripts/ui-check.mjs`).
// Options (env): BASE_URL (default http://localhost:3000), WIDTHS (default 390,768,1024,1440),
//   BROWSER (Chromium-based browser binary; defaults to Edge/Chrome on Windows), CDP_PORT (default 9555),
//   SHOTS=<dir> to save a screenshot per page and width.
// Routes are discovered from src/app (page.tsx files, skipping dynamic segments, slots and intercepting routes) and
// opened with the mock account of their role (src/lib/mock-accounts.ts); no simulation/demo/review label may render (owner decision 18 Oktober 2026).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const widths = (process.env.WIDTHS ?? "390,768,1024,1440").split(",").map(Number);
const port = Number(process.env.CDP_PORT ?? 9555);
const shots = process.env.SHOTS;
const accountFor = { patient: "pasien", staff: "petugas.mcu", clinician: "dokter.mcu", "unit-staff": "petugas.unit",
  "unit-doctor": "dokter.unit", management: "manajemen", editor: "editor", admin: "admin" };

function discoverRoutes(dir = join(process.cwd(), "src", "app")) {
  const routes = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (/^[@[(]/.test(entry.name)) continue; // slots, dynamic segments, route groups / intercepting routes
      routes.push(...discoverRoutes(join(dir, entry.name)));
    } else if (entry.name === "page.tsx") {
      const route = "/" + relative(join(process.cwd(), "src", "app"), dir).split(sep).join("/");
      routes.push(route === "/" ? "/" : route.replace(/\/$/, ""));
    }
  }
  return routes.sort();
}

const browserPath = process.env.BROWSER ?? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(existsSync);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function cdpVersion() { try { return await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { return null; } }

let browser = null;
if (!(await cdpVersion())) {
  if (!browserPath) { console.error("No Chromium-based browser found: set BROWSER."); process.exit(2); }
  browser = spawn(browserPath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), "islah-ui-check")}`, "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 50 && !(await cdpVersion()); i++) await sleep(200);
}
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve));
let id = 0; const pending = new Map(); let errors = [];
ws.addEventListener("message", (message) => {
  const msg = JSON.parse(message.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description?.split("\n")[0]);
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" ").split("\n")[0]);
});
const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.result?.value;
await send("Page.enable"); await send("Runtime.enable");

const routes = discoverRoutes();
const problems = []; const notes = [];
if (shots) mkdirSync(shots, { recursive: true });
for (const width of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: width < 700 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 700 });
  for (const route of routes) {
    const role = route === "/" ? null : route.split("/")[1];
    await send("Page.navigate", { url: `${base}/` }); await sleep(700);
    await evaluate(role ? `sessionStorage.setItem("islah-session", JSON.stringify({ username: ${JSON.stringify(accountFor[role] ?? "admin")} })); true` : "sessionStorage.clear(); true");
    errors = [];
    await send("Page.navigate", { url: base + route }); await sleep(1800);
    const state = await evaluate(`({ path: location.pathname, overflow: document.scrollingElement.scrollWidth - innerWidth, height: document.scrollingElement.scrollHeight, demo: /demo|mock-?up|simulasi|simulation|prototype|use ?case|UC\d|Data contoh|Info review|token review/i.test(document.body.innerText) })`);
    if (state.overflow > 0) problems.push(`${width}px ${route}: horizontal overflow ${state.overflow}px`);
    if (state.demo) problems.push(`${width}px ${route}: forbidden label visible`);
    for (const error of new Set(errors)) problems.push(`${width}px ${route}: ${error}`);
    if (state.path !== route) notes.push(`${route} -> ${state.path}`);
    if (shots) {
      const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 65, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.min(state.height, 2400), scale: 1 } });
      writeFileSync(join(shots, `${route === "/" ? "login" : route.slice(1).replaceAll("/", "_")}-${width}.jpg`), Buffer.from(shot.result.data, "base64"));
    }
  }
}
ws.close();
browser?.kill();
console.log(`${routes.length} routes x ${widths.length} widths checked.`);
if (notes.length) console.log(`Redirects (expected for guarded or moved pages):\n  ${[...new Set(notes)].join("\n  ")}`);
console.log(problems.length ? `Problems:\n  ${problems.join("\n  ")}` : "No problems found.");
process.exit(problems.length ? 1 : 0);
