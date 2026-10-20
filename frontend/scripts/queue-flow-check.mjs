// Focused browser check. Start Next.js first; BASE_URL defaults to localhost:3100.
// Uses a disposable headless browser, synthetic patient data, and no backend.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const port = Number(process.env.CDP_PORT ?? 9661);
const browserPath = process.env.BROWSER ?? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(existsSync);
assert(browserPath, "Set BROWSER to a Chromium executable");
const profile = mkdtempSync(join(tmpdir(), "islah-queue-check-"));
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = spawn(browserPath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore", windowsHide: true });
let ws;
try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(200); }
  }
  assert(targets, "Browser did not start");
  ws = new WebSocket(targets.find((item) => item.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(`Timed out: ${method}`)); }, 30000);
    pending.set(n, (result) => {
      clearTimeout(timer);
      if (result.error) reject(new Error(JSON.stringify(result.error)));
      else resolve(result.result);
    });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert(!result.exceptionDetails, result.exceptionDetails?.text);
    return result.result?.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(200); }
    throw new Error(`UI condition failed: ${expression}`);
  };
  await send("Page.enable"); await send("Runtime.enable");
  async function navigate(path, fixture) {
    let init;
    if (fixture) init = await send("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem("islah-session", ${JSON.stringify(JSON.stringify(fixture))})` });
    await send("Page.navigate", { url: base + path });
    await wait(`location.pathname === ${JSON.stringify(path)} && !!document.querySelector('.shell')`);
    if (init) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: init.identifier });
    await sleep(400);
  }
  const click = async (text) => {
    assert(await evaluate(`(() => { const element = [...document.querySelectorAll('button,a')].find((item) => item.textContent.trim() === ${JSON.stringify(text)} && !item.disabled); element?.click(); return !!element; })()`), `Missing enabled control: ${text}`);
    await sleep(300);
  };
  async function check(name, decorated) {
    const state = await evaluate(`({ overflow: document.documentElement.scrollWidth - innerWidth, lines: document.querySelectorAll('.menu-lines .menu-line').length, text: document.body.innerText })`);
    assert(state.overflow <= 0, `${name}: horizontal overflow ${state.overflow}`);
    assert.equal(state.lines, decorated ? 12 : 0, `${name}: background scope`);
    assert(!/menunggu pembayaran|biaya admin|MCU diberikan setelah pembayaran/i.test(state.text), `${name}: old payment flow`);
    if (shots) {
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(join(shots, `${name}.png`), Buffer.from(shot.data, "base64"));
    }
  }
  for (const width of [390, 768, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 960, deviceScaleFactor: 1, mobile: width < 700 });
    await navigate("/patient/registration", { username: "pasien" });
    await check(`form-${width}`, false);
    const identity = { name: "Pasien Pengujian", nik: "0000000000000199", birthDate: "1990-01-01", addressKtp: "Alamat Pengujian", addressHome: "Alamat Pengujian", phone: "081234567890", gender: "Perempuan", occupation: "Pengujian" };
    await evaluate(`(() => { for (const [name, value] of Object.entries(${JSON.stringify(identity)})) { const input = document.querySelector('[name="'+name+'"]'); const prototype = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value); input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); } })()`);
    await click("Lanjut");
    await wait(`location.pathname.endsWith('/terms')`);
    await wait(`!!document.querySelector('[name="agree"]')`);
    await evaluate(`document.querySelector('[name="agree"]').click()`);
    await click("Lanjut");
    await wait(`!!document.querySelector('[name="package"][value="cpns"]')`);
    await evaluate(`document.querySelector('[name="package"][value="cpns"]').click()`);
    await click("Lanjut");
    await wait(`location.pathname.endsWith('/review') && document.body.innerText.includes('Kirim pendaftaran')`);
    await check(`review-${width}`, false);
    await click("Kirim pendaftaran");
    await wait(`location.pathname.endsWith('/done') && !!document.querySelector('.done-card')`);
    const application = await evaluate(`JSON.parse(sessionStorage.getItem('islah-session')).applications[0]`);
    assert.equal(application.registrationQueue, "P-001");
    assert.equal(application.mcuQueue, null);
    assert.equal(application.status, "registered");
    await check(`done-${width}`, false);
    await send("Page.reload");
    await wait(`!!document.querySelector('.done-card')`);
    assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('islah-session')).applications[0].registrationQueue`), "P-001");
    await navigate("/patient");
    await evaluate(`document.querySelector('.queue-row').open = true`);
    await check(`home-${width}`, true);
    assert((await evaluate(`document.body.innerText`)).includes("Diterbitkan setelah daftar ulang"));
    await navigate("/patient/results");
    await check(`history-${width}`, false);
    await navigate("/staff/patient", { username: "petugas.mcu" });
    await check(`staff-${width}`, true);
    await evaluate(`document.querySelector('button[aria-label="Lihat P-007"]').click()`);
    await wait(`document.body.innerText.includes('Belum diterbitkan')`);
    assert(!(await evaluate(`document.querySelector('.ws-detail')?.innerText ?? ''`)).includes("MCU-007"));
    await click("Verifikasi");
    await wait(`document.body.innerText.includes('MCU-013')`);
    await check(`reregistered-${width}`, true);
    assert(await evaluate(`!![...document.querySelectorAll('button')].find((item) => item.textContent.trim() === 'Sudah diverifikasi' && item.disabled)`));
    for (const path of ["/staff/worklist", "/clinician/review", "/unit-staff/queue", "/unit-doctor/review", "/management/reports", "/editor/calendar", "/admin"]) {
      await navigate(path, { username: "admin" });
      await check(`${path.slice(1).replaceAll('/', '-')}-${width}`, true);
    }
    console.log(`PASS ${width}px: all registration steps, immediate P-number, reload, history, staff MCU issuance, background scope and overflow`);
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS: no browser runtime errors; synthetic UI state only, no backend contacted");
} finally {
  if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ id: 999999, method: "Browser.close" })); ws.close(); }
  await sleep(500);
  browser.kill();
  assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
  assert(basename(profile).startsWith("islah-queue-check-"));
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { console.warn(`Browser profile cleanup pending: ${profile}`); }
}
