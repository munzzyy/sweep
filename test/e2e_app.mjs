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
  notifications: infested ? [{ pkg: BAD_PKG, service: "Reader" }] : [],
  apps: [
    { pkg: "com.whatsapp", label: "WhatsApp", system: false, hasLauncher: true, installer: "com.android.vending", installedDate: "2025-11-02", certs: [] },
    { pkg: "com.android.systemui", label: "System UI", system: true, hasLauncher: false, installer: null, installedDate: null, certs: [] },
    ...(infested ? [{ pkg: BAD_PKG, label: "Sync Service", system: false, hasLauncher: false, installer: null, installedDate: "2026-08-30", certs: [] }] : []),
  ],
});

// A clean app list plus one enabled accessibility entry, isolated from the stalkerware matcher.
// system carries whether the app record backing that service is a system app.
const scanWithAccessibility = (pkg, service, system = false) => ({
  admins: [],
  accessibility: pkg ? [{ pkg, service }] : [],
  notifications: [],
  apps: [
    { pkg: "com.whatsapp", label: "WhatsApp", system: false, hasLauncher: true, installer: "com.android.vending", installedDate: "2025-11-02", certs: [] },
    { pkg: "com.android.systemui", label: "System UI", system: true, hasLauncher: false, installer: null, installedDate: null, certs: [] },
    ...(pkg ? [{ pkg, label: service, system, hasLauncher: false, installer: null, installedDate: null, certs: [] }] : []),
  ],
});

const BRIDGE_STUB_ACCESSIBILITY = (pkg, service, system = false) => `window.SweepNative = {
  platform: () => "android",
  version: () => "e2e",
  quickExit: () => { window.__exited = true; },
  scanJson: () => ${JSON.stringify(JSON.stringify(scanWithAccessibility(pkg, service, system)))},
  selfCheck: () => ${JSON.stringify(SELF_CHECK(false))},
};`;

const SELF_CHECK = (withInternet) =>
  JSON.stringify({
    pkg: "io.github.munzzyy.sweep",
    version: "e2e",
    permissions: withInternet
      ? ["android.permission.QUERY_ALL_PACKAGES", "android.permission.INTERNET"]
      : ["android.permission.QUERY_ALL_PACKAGES"],
  });

const BRIDGE_STUB = (infested, { fakeInternet = false } = {}) => `window.SweepNative = {
  platform: () => "android",
  version: () => "e2e",
  quickExit: () => { window.__exited = true; },
  scanJson: () => ${JSON.stringify(JSON.stringify(scan(infested)))},
  selfCheck: () => ${JSON.stringify(SELF_CHECK(fakeInternet))},
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

// The results screen stages its cards in with a CSS entrance (sweep-reveal);
// a screenshot taken the instant results land catches that animation
// mid-flight instead of documenting the finished UI. Wait for every card
// and the banner to actually reach full opacity first. Under
// prefers-reduced-motion the animation never runs and opacity is already 1,
// so this resolves immediately in that case.
async function settleReveal(c) {
  await waitFor(
    () =>
      c.evalJs(
        `[...document.querySelectorAll('.verdict-banner, #results-cards > .check-card')]
          .every((el) => parseFloat(getComputedStyle(el).opacity) >= 0.99)`,
      ),
    "staged reveal settled",
    4000,
  );
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
    // BAD_PKG's accessibility service is not on the assistive allowlist, so the notice gates this too.
    await waitFor(() => bad.evalJs("__sweepApi.state.screen === 'notice'"), "accessibility notice shown ahead of an infested scan");
    await bad.evalJs("document.getElementById('btn-a11y-continue').click(); 'ok'");
    await waitFor(() => bad.evalJs("__sweepApi.state.screen === 'results'"), "results shown");
    const badText = await bad.evalJs("document.getElementById('results-cards').textContent + document.getElementById('results-summary').textContent");
    check("positive control: the planted stalkerware package surfaces", badText.includes(BAD_PKG), BAD_PKG);
    check("positive control: named as the known family", badText.includes(family.name), family.name);
    check("alarm card carries the do-not-confront guidance", /escalate|advocate/i.test(badText));
    check("sixth surface: notification-access apps card present", badText.includes("read notifications") || badText.includes("Apps that can read notifications"));
    check("notification listener surfaces the planted package", badText.includes(BAD_PKG) && /Reader|notification/i.test(badText));
    check("cross-referenced match evidence: admin power is named on the match itself", /device admin power/.test(badText));
    check("cross-referenced match evidence: accessibility power is named on the match itself", /accessibility service/.test(badText));
    check("install date and installer identity: install date shown", badText.includes("2026-08-30"));
    check("self-check card: honestly reports no internet permission", badText.includes("no internet") || /no internet access is requested/i.test(badText));
    await settleReveal(bad);
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
    check("negative control: no enabled accessibility service means no interstitial", await clean.evalJs("document.getElementById('screen-notice').hidden"));
    const summary = await clean.evalJs("document.getElementById('results-summary').textContent");
    check("negative control: found-nothing language, hedged", /found nothing/.test(summary) && /not a guarantee/.test(summary), summary);
    const cleanCards = await clean.evalJs("document.getElementById('results-cards').textContent");
    check("negative control: no match card alarm on a clean scan", !cleanCards.includes(family.name));
    check("the word 'safe' is never the verdict", !/you are safe/i.test(summary + cleanCards));
    await settleReveal(clean);
    const shot2 = await clean.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(SHOTS, "02-results-clean.png"), Buffer.from(shot2.result.data, "base64"));
    const errs = await clean.evalJs("(__sweepErrors || []).slice(0, 5)");
    check("clean run: console clean", errs.length === 0, JSON.stringify(errs));
    clean.close();

    // --------------------------------------------- accessibility notice
    // Three cases, each a negative control on the other two.
    const flagged = await newTab({ stub: BRIDGE_STUB_ACCESSIBILITY("com.example.helper", "HelperService") });
    await flagged.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => flagged.evalJs("__sweepApi.state.screen === 'notice'"), "notice shown for an unrecognized service");
    const noticeText = await flagged.evalJs("document.getElementById('screen-notice').textContent");
    check("notice: names what the access means, plainly", /read.*screen|read the screen/i.test(noticeText), noticeText);
    check("notice: never claims to know it is spyware", !/spy|stalkerware|surveillance/i.test(noticeText), noticeText);
    check("notice: names legitimate uses honestly", /screen reader|password manager|launcher/i.test(noticeText), noticeText);
    check("notice: leave fast is still present and not hidden", !(await flagged.evalJs("document.getElementById('btn-exit').hidden")));
    await flagged.evalJs("document.getElementById('btn-a11y-continue').click(); 'ok'");
    await waitFor(() => flagged.evalJs("__sweepApi.state.screen === 'results'"), "results shown after continuing past the notice");
    const flaggedCards = await flagged.evalJs("document.getElementById('results-cards').textContent");
    check("continuing past the notice still names the service in the results", flaggedCards.includes("com.example.helper"), flaggedCards);
    flagged.close();

    const assistive = await newTab({ stub: BRIDGE_STUB_ACCESSIBILITY("com.google.android.marvin.talkback", "TalkBackService", true) });
    await assistive.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => assistive.evalJs("__sweepApi.state.screen === 'results'"), "results shown directly for a recognized assistive service");
    check("negative control: a recognized assistive service does not trigger the notice", await assistive.evalJs("document.getElementById('screen-notice').hidden"));
    assistive.close();

    // A non-system clone of TalkBack's own package name must still gate on the notice.
    const spoofed = await newTab({ stub: BRIDGE_STUB_ACCESSIBILITY("com.google.android.marvin.talkback", "EvilService", false) });
    await spoofed.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => spoofed.evalJs("__sweepApi.state.screen === 'notice'"), "notice shown for a non-system clone of TalkBack's package name");
    spoofed.close();

    const none = await newTab({ stub: BRIDGE_STUB_ACCESSIBILITY(null, null) });
    await none.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => none.evalJs("__sweepApi.state.screen === 'results'"), "results shown directly with no accessibility services enabled");
    check("negative control: no accessibility services enabled does not trigger the notice", await none.evalJs("document.getElementById('screen-notice').hidden"));
    none.close();

    // ----------------------------------------------- self-check anti-lying
    // A build whose own OS-reported permissions include INTERNET must have
    // that surfaced, not swallowed: the self-check card is exactly the
    // anti-lying test for Sweep's own no-network claim.
    const liar = await newTab({ stub: BRIDGE_STUB(false, { fakeInternet: true }) });
    await liar.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => liar.evalJs("__sweepApi.state.screen === 'results'"), "self-check results");
    const liarText = await liar.evalJs("document.getElementById('results-cards').textContent");
    check("self-check card catches a planted INTERNET permission, does not hide it", /has internet|contradicts/i.test(liarText), liarText);
    liar.close();

    // ------------------------------------------- older bridge, no selfCheck
    // A bridge built before selfCheck existed still has to work: the guard
    // in runCheckup that gates on native().selfCheck must degrade cleanly,
    // never crash the checkup, and never render a self-check card it has no
    // data for.
    const OLD_BRIDGE_STUB = (infested) => `window.SweepNative = {
      platform: () => "android",
      version: () => "e2e-old",
      quickExit: () => { window.__exited = true; },
      scanJson: () => ${JSON.stringify(JSON.stringify(scan(infested)))},
    };`;
    const old = await newTab({ stub: OLD_BRIDGE_STUB(false) });
    await old.evalJs("document.getElementById('btn-run').click(); 'ok'");
    await waitFor(() => old.evalJs("__sweepApi.state.screen === 'results'"), "old-bridge results");
    const oldText = await old.evalJs("document.getElementById('results-cards').textContent");
    check("old bridge with no selfCheck: results still render", oldText.includes("Known surveillance apps"));
    check("old bridge with no selfCheck: no self-check card appears", !oldText.includes("Check Sweep itself"));
    const oldErrs = await old.evalJs("(__sweepErrors || []).slice(0, 5)");
    check("old bridge with no selfCheck: console clean, no crash", oldErrs.length === 0, JSON.stringify(oldErrs));
    old.close();

    // --------------------------------------------- leave fast: blackout order
    // Plain web (no bridge), the web-fallback exit path. location.replace()
    // is a non-configurable own property on Location instances in this
    // Chromium, so it cannot be stubbed to prove strict ordering against
    // the navigation call; the source order in app/js/main.js's
    // web-fallback branch (blackout shown, then location.replace) is the
    // actual guarantee. What this proves: the blackout element is real,
    // wired to the exit button, and already visible the moment the
    // synchronous click handler that also fires the redirect returns.
    const leave = await newTab();
    const blackoutHiddenAfterClick = await leave.evalJs(
      "(() => { document.getElementById('btn-exit').click(); return document.getElementById('leave-blackout').hidden; })()",
    );
    check("leave fast: the blackout is already visible synchronously after the click, ahead of the redirect", blackoutHiddenAfterClick === false);
    leave.close();
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
