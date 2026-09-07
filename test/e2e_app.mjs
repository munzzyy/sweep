// Drives the real page with a stubbed bridge, twice: an infested scan whose
// planted stalkerware package MUST surface (positive control), and a clean
// scan that must produce the found-nothing language and never the word
// "safe" as a verdict. Results must vanish on quick exit.
//
// Run from the repo root:  node test/e2e_app.mjs

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTTP_PORT = 8971;
const CDP_PORT = 9371;
const BASE = `http://127.0.0.1:${HTTP_PORT}`;
const SHOTS = path.join(ROOT, "test", "screenshots");

const INDICATORS = JSON.parse(readFileSync(path.join(ROOT, "app", "data", "indicators.json"), "utf8"));
const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
const BAD_PKG = family.packages.find((p) => !p.endsWith("*"));

const fails = [];
function check(name, cond, detail = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    fails.push(name);
  }
}

const scan = (infested) => ({
  admins: infested ? [{ pkg: BAD_PKG, label: "Sync Service" }] : [],
  accessibility: infested ? [{ pkg: BAD_PKG, service: "Watcher" }] : [],
  apps: [
    { pkg: "com.whatsapp", label: "WhatsApp", system: false, hasLauncher: true, installer: "com.android.vending", certs: [] },
    { pkg: "com.android.systemui", label: "System UI", system: true, hasLauncher: false, installer: null, certs: [] },
    ...(infested ? [{ pkg: BAD_PKG, label: "Sync Service", system: false, hasLauncher: false, installer: null, certs: [] }] : []),
  ],
});

const BRIDGE_STUB = (infested) => `window.SweepNative = {
  platform: () => "android",
  version: () => "e2e",
  quickExit: () => { window.__exited = true; },
  scanJson: () => ${JSON.stringify(JSON.stringify(scan(infested)))},
};`;

async function waitFor(fn, desc, timeout = 20000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch (err) {
      last = String(err);
    }
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${desc}; last: ${JSON.stringify(last)}`);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const myId = ++id;
      pending.set(myId, resolve);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  const evalJs = async (expression, awaitPromise = false) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  return {
    send,
    evalJs,
    open: new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    }),
    close: () => ws.close(),
  };
}

async function newTab({ stub = null } = {}) {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  const tab = await res.json();
  const c = connect(tab.webSocketDebuggerUrl);
  await c.open;
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  if (stub) await c.send("Page.addScriptToEvaluateOnNewDocument", { source: stub });
  await c.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await c.send("Page.navigate", { url: BASE + "/" });
  await waitFor(() => c.evalJs("!!window.__sweepApi"), "app booted");
  return c;
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const profile = mkdtempSync(path.join(tmpdir(), "sweep-e2e-"));
  const server = spawn("node", [path.join(ROOT, "test", "serve_local.mjs"), String(HTTP_PORT)], { stdio: "ignore" });
  const chromium = spawn(
    "chromium",
    ["--headless=new", `--remote-debugging-port=${CDP_PORT}`, "--user-data-dir=" + profile, "--no-sandbox", "--disable-gpu", "about:blank"],
    { stdio: "ignore" },
  );
  try {
    await waitFor(async () => {
      const [a, b] = await Promise.all([
        fetch(`${BASE}/index.html`).then((r) => r.ok).catch(() => false),
        fetch(`http://127.0.0.1:${CDP_PORT}/json/version`).then((r) => r.ok).catch(() => false),
      ]);
      return a && b;
    }, "server and devtools up");

    // ------------------------------------------------------ web (no bridge)
    const web = await newTab();
    check("web: run button hidden without the bridge", await web.evalJs("document.getElementById('btn-run').hidden"));
    check("web: explains why, offers the APK", !(await web.evalJs("document.getElementById('web-note').hidden")));
    check("web: attribution to the data source present", (await web.evalJs("document.body.textContent")).includes("Echap"));
    web.close();

    // ------------------------------------------------------------ infested
    const bad = await newTab({ stub: BRIDGE_STUB(true) });
    check("wrapper: run button offered", !(await bad.evalJs("document.getElementById('btn-run').hidden")));
    await bad.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => bad.evalJs("__sweepApi.state.screen === 'results'"), "results shown");
    const badText = await bad.evalJs("document.getElementById('results-cards').textContent + document.getElementById('results-summary').textContent");
    check("positive control: the planted stalkerware package surfaces", badText.includes(BAD_PKG), BAD_PKG);
    check("positive control: named as the known family", badText.includes(family.name), family.name);
    check("alarm card carries the do-not-confront guidance", /escalate|advocate/i.test(badText));
    const shot = await bad.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(SHOTS, "01-results-match.png"), Buffer.from(shot.result.data, "base64"));

    // Quick exit clears the screen before leaving.
    await bad.evalJs("document.getElementById('btn-exit').click(); 'ok'");
    await waitFor(() => bad.evalJs("!!window.__exited"), "quick exit fired");
    check("quick exit: results are wiped from the DOM", (await bad.evalJs("document.getElementById('results-cards').textContent")) === "");
    const badErrs = await bad.evalJs("(__sweepErrors || []).slice(0, 5)");
    check("infested run: console clean", badErrs.length === 0, JSON.stringify(badErrs));
    bad.close();

    // --------------------------------------------------------------- clean
    const clean = await newTab({ stub: BRIDGE_STUB(false) });
    await clean.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => clean.evalJs("__sweepApi.state.screen === 'results'"), "clean results");
    const summary = await clean.evalJs("document.getElementById('results-summary').textContent");
    check("negative control: found-nothing language, hedged", /found nothing/.test(summary) && /not a guarantee/.test(summary), summary);
    const cleanCards = await clean.evalJs("document.getElementById('results-cards').textContent");
    check("negative control: no match card alarm on a clean scan", !cleanCards.includes(family.name));
    check("the word 'safe' is never the verdict", !/you are safe/i.test(summary + cleanCards));
    const shot2 = await clean.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(SHOTS, "02-results-clean.png"), Buffer.from(shot2.result.data, "base64"));
    const errs = await clean.evalJs("(__sweepErrors || []).slice(0, 5)");
    check("clean run: console clean", errs.length === 0, JSON.stringify(errs));
    clean.close();
  } finally {
    chromium.kill();
    server.kill();
    await sleep(400);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }
  if (fails.length) {
    console.log("FAILS:", fails.join("; "));
    process.exit(1);
  }
  console.log("E2E APP PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
