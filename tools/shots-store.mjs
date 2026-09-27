// Captures the fastlane store screenshots at 780x1688 (390x844 at 2x, wrapper
// mode, dark theme): a made-up phone of stock apps plus one package from the
// public stalkerware list, then the same phone clean.
//
// Run from the repo root:  node tools/shots-store.mjs

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { appRec, okSurfaces } from "../test/corpus.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTTP_PORT = 8974;
const CDP_PORT = 9374;
const BASE = `http://127.0.0.1:${HTTP_PORT}`;
const OUT = path.join(ROOT, "fastlane", "metadata", "android", "en-US", "images", "phoneScreenshots");

const INDICATORS = JSON.parse(readFileSync(path.join(ROOT, "app", "data", "indicators.json"), "utf8"));
const BAD_PKG = INDICATORS.apps.flatMap((a) => a.packages).find((p) => !p.endsWith("*"));

const phone = (infested) => ({
  surfaces: okSurfaces(),
  admins: infested ? [{ pkg: BAD_PKG, label: "Sync Service" }] : [],
  adminPolicies: infested
    ? [{ pkg: BAD_PKG, component: `${BAD_PKG}/.Admin`, policies: { wipeData: true, forceLock: true, resetPassword: true, watchLogin: true, disableCamera: false } }]
    : [],
  accessibility: infested ? [{ pkg: BAD_PKG, service: "Watcher" }] : [],
  notifications: infested ? [{ pkg: BAD_PKG, service: "Reader" }] : [],
  inputMethods: [{ pkg: "com.google.android.inputmethod.latin", component: "com.google.android.inputmethod.latin/.LatinIME", label: "Gboard" }],
  defaultIme: "com.google.android.inputmethod.latin/.LatinIME",
  userCertificates: [],
  roles: { sms: "com.google.android.apps.messaging", dialer: "com.google.android.dialer" },
  vpnServices: [],
  owners: { deviceOwner: null, profileOwners: [], workProfile: false },
  globals: { adbEnabled: false, developmentSettingsEnabled: false, adbWifiEnabled: false },
  apps: [
    appRec("com.google.android.apps.messaging", { label: "Messages", system: true, installer: null }),
    appRec("com.google.android.dialer", { label: "Phone", system: true, installer: null }),
    appRec("com.google.android.inputmethod.latin", { label: "Gboard", system: true, installer: null, hasLauncher: false }),
    appRec("com.google.android.gm", { label: "Gmail" }),
    appRec("com.whatsapp", { label: "WhatsApp", installedDate: "2025-11-02" }),
    ...(infested
      ? [appRec(BAD_PKG, { label: "Sync Service", hasLauncher: false, installer: null, installedDate: "2026-08-30", updatedDate: "2026-08-30" })]
      : []),
  ],
});

const SELF_CHECK = JSON.stringify({ pkg: "io.github.munzzyy.sweep", version: "0.5.0", permissions: ["android.permission.QUERY_ALL_PACKAGES"] });

const bridge = (infested) => `window.SweepNative = {
  platform: () => "android",
  version: () => "0.5.0",
  quickExit: () => {},
  scanJson: () => ${JSON.stringify(JSON.stringify(phone(infested)))},
  selfCheck: () => ${JSON.stringify(SELF_CHECK)},
};`;

async function waitFor(fn, desc, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      if (await fn()) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`timeout: ${desc}`);
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
  return { send, evalJs, close: () => ws.close(), open: new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }) };
}

// The headline count has to match the cards under it, or the shot is not written.
const COUNTS_AGREE = `(() => {
  const m = document.getElementById('results-counts').textContent.match(/^(\\d+) of (\\d+) checks/);
  const checks = [...document.querySelectorAll('#results-cards > .check-card')].filter(
    (c) => !c.classList.contains('surfaces-card') && !c.querySelector(':scope > h2').textContent.startsWith('Check Sweep itself'),
  );
  const flagged = checks.filter((c) => c.querySelector(':scope > h2 .chip-alarm, :scope > h2 .chip-review')).length;
  return { text: m && m[0], said: m && [Number(m[1]), Number(m[2])], cards: [flagged, checks.length] };
})()`;

async function capture(infested, name) {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  const tab = await res.json();
  const c = connect(tab.webSocketDebuggerUrl);
  await c.open;
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: bridge(infested) });
  await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await c.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await c.send("Page.navigate", { url: BASE + "/" });
  await waitFor(() => c.evalJs("!!window.__sweepApi && !document.getElementById('btn-run').hidden"), "app booted");
  await c.evalJs("document.getElementById('btn-run').click(); 'ok'");
  if (infested) {
    await waitFor(() => c.evalJs("__sweepApi.state.screen === 'notice'"), "accessibility notice");
    await c.evalJs("document.getElementById('btn-a11y-continue').click(); 'ok'");
  }
  await waitFor(() => c.evalJs("__sweepApi.state.screen === 'results'"), "results");
  await waitFor(
    () =>
      c.evalJs(
        `[...document.querySelectorAll('.verdict-banner, #results-cards > .check-card')]
          .every((el) => parseFloat(getComputedStyle(el).opacity) >= 0.99)`,
      ),
    "staged reveal settled",
  );
  await c.evalJs("document.activeElement.blur(); 'ok'");
  await sleep(300);
  const counts = await c.evalJs(COUNTS_AGREE);
  if (!counts.said || counts.said[0] !== counts.cards[0] || counts.said[1] !== counts.cards[1]) {
    throw new Error(`${name}: headline says ${JSON.stringify(counts.said)}, cards say ${JSON.stringify(counts.cards)}`);
  }
  const bad = await c.evalJs(`(() => {
    const out = [];
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push("horizontal scroll");
    if (__sweepErrors.length) out.push("errors: " + __sweepErrors.join("; "));
    return out;
  })()`);
  if (bad.length) throw new Error(`${name}: ${bad.join(", ")}`);
  const s = await c.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path.join(OUT, name), Buffer.from(s.result.data, "base64"));
  console.log(`wrote ${name} (${counts.text})`);
  c.close();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const profile = mkdtempSync(path.join(tmpdir(), "sweep-shots-"));
  const server = spawn("node", [path.join(ROOT, "test", "serve_local.mjs"), String(HTTP_PORT)], { stdio: "ignore" });
  const chromium = spawn(
    "chromium",
    ["--headless=new", `--remote-debugging-port=${CDP_PORT}`, "--user-data-dir=" + profile, "--no-sandbox", "--disable-gpu", "--force-device-scale-factor=2", "about:blank"],
    { stdio: "ignore" },
  );
  try {
    await waitFor(async () => {
      const [a, b] = await Promise.all([
        fetch(`${BASE}/index.html`).then((r) => r.ok).catch(() => false),
        fetch(`http://127.0.0.1:${CDP_PORT}/json/version`).then((r) => r.ok).catch(() => false),
      ]);
      return a && b;
    }, "server + devtools");
    await capture(true, "1.png");
    await capture(false, "2.png");
  } finally {
    chromium.kill();
    server.kill();
    await sleep(400);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }
  console.log("store screenshots done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
