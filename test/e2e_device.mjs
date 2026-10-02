// Runs the real bridge on an emulator: boots a Sweep-only AVD headless,
// installs the debug APK, and reads SweepNative.scanJson() through the
// WebView's devtools socket. Not part of `npm test`; it needs the Android
// SDK, a debug build and a few minutes.
//
//   cd android && ./gradlew assembleDebug && cd ..
//   SWEEP_AVD=sweep-a28 node test/e2e_device.mjs
//   SWEEP_AVD=sweep-a36 node test/e2e_device.mjs
//
// Create the AVDs once:
//   avdmanager create avd -n sweep-a28 -k "system-images;android-28;default;x86_64" -d pixel_5
//   avdmanager create avd -n sweep-a36 -k "system-images;android-36;default;x86_64" -d pixel_5
//
// Android 9's own WebView is too old for the page, so on that image the run
// installs SWEEP_WEBVIEW_APK (an AOSP WebView 87 or newer) first.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, openSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { surfaceReport, SURFACES } from "../app/js/analyze.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SDK = process.env.ANDROID_HOME || path.join(homedir(), "Android", "Sdk");
const ADB = path.join(SDK, "platform-tools", "adb");
const EMULATOR = path.join(SDK, "emulator", "emulator");
const AVD = process.env.SWEEP_AVD || "";
const PORT = Number(process.env.SWEEP_EMU_PORT || 5740);
const DEVTOOLS_PORT = Number(process.env.SWEEP_DEVTOOLS_PORT || 9741);
const SERIAL = `emulator-${PORT}`;
const APK = process.env.SWEEP_APK || path.join(ROOT, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const WEBVIEW_APK = process.env.SWEEP_WEBVIEW_APK || path.join(homedir(), ".cache", "webview-apks", "aosp-webview-133.apk");
const PKG = "io.github.munzzyy.sweep";
const MIN_WEBVIEW = 87;
const PRIVILEGED = ["usage_access_grants", "overlay_grants", "install_unknown_grants"];
const CODES = new Set(["privileged", "not_readable", "partial", "error"]);

// What a stock emulator can't read, by API level. Android 12 locked the
// always-on VPN key away from ordinary apps.
const expectedUnavailable = (sdk) => new Set([...PRIVILEGED, ...(sdk >= 31 ? ["always_on_vpn"] : [])]);

const fails = [];
function check(name, cond, detail = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    fails.push(name);
  }
}

const adb = (...args) =>
  execFileSync(ADB, ["-s", SERIAL, ...args], { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "pipe"] }).trim();

// Thrown from inside a waitFor poll to stop waiting instead of retrying.
class GiveUp extends Error {}

async function waitFor(fn, desc, timeout) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch (err) {
      if (err instanceof GiveUp) throw err;
      last = String(err).split("\n")[0];
    }
    await sleep(1000);
  }
  throw new Error(`timeout waiting for ${desc}; last: ${JSON.stringify(last)}`);
}

function webviewVersion() {
  const out = adb("shell", "dumpsys", "webviewupdate");
  const m = out.match(/Current WebView package \(name, version\): \(([^,]+), ([\d.]+)\)/);
  return m ? { pkg: m[1], major: Number(m[2].split(".")[0]), version: m[2] } : null;
}

// `cmd role get-role-holders` arrived after Android 13; older versions only have the dump.
function assistantHolder() {
  try {
    return { holder: adb("shell", "cmd", "role", "get-role-holders", "android.app.role.ASSISTANT").split(/\s+/)[0] || "", via: "cmd role" };
  } catch {}
  const dump = adb("shell", "dumpsys", "role");
  const at = dump.indexOf("android.app.role.ASSISTANT");
  const m = at >= 0 ? dump.slice(at, at + 400).match(/holders=([^\s]*)/) : null;
  return { holder: m ? m[1].split(",")[0] : "", via: "dumpsys role", raw: at >= 0 ? dump.slice(at, at + 200) : "no ASSISTANT entry" };
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onerror = () => reject(new Error("devtools socket error"));
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== 1) return;
      ws.close();
      if (msg.result?.exceptionDetails) reject(new Error(JSON.stringify(msg.result.exceptionDetails)));
      else resolve(msg.result?.result?.value);
    };
  });
}

async function main() {
  if (!/^sweep-/.test(AVD)) {
    throw new Error("set SWEEP_AVD to a Sweep-only AVD (sweep-a28 or sweep-a36); other AVDs on this machine belong to other projects");
  }
  if (!existsSync(APK)) throw new Error(`no debug APK at ${APK}; run ./gradlew assembleDebug in android/ first`);
  const running = execFileSync(ADB, ["devices"], { encoding: "utf8" });
  if (running.includes(`${SERIAL}\t`)) throw new Error(`${SERIAL} is already running; pick another SWEEP_EMU_PORT`);

  const emuArgs = ["-avd", AVD, "-port", String(PORT), "-no-window", "-no-snapshot", "-no-audio", "-no-boot-anim", "-gpu", "swiftshader_indirect"];
  if (process.env.SWEEP_EMU_MEMORY) emuArgs.push("-memory", process.env.SWEEP_EMU_MEMORY);
  const emuLog = path.join(tmpdir(), `sweep-${AVD}-${PORT}.log`);
  const emu = spawn(EMULATOR, emuArgs, { stdio: ["ignore", openSync(emuLog, "w"), openSync(emuLog, "a")] });
  let forwarded = false;
  try {
    await waitFor(() => {
      if (emu.exitCode !== null) {
        const tail = readFileSync(emuLog, "utf8").trim().split("\n").slice(-15).join("\n");
        throw new GiveUp(`the emulator exited with ${emu.exitCode} before booting; last lines of ${emuLog}:\n${tail}`);
      }
      return adb("shell", "getprop", "sys.boot_completed") === "1";
    }, `${AVD} boot`, 600000);
    const sdk = Number(adb("shell", "getprop", "ro.build.version.sdk"));
    console.log(`${AVD}: API ${sdk}`);

    let wv = webviewVersion();
    if (wv && wv.major < MIN_WEBVIEW) {
      if (!existsSync(WEBVIEW_APK)) throw new Error(`WebView ${wv.version} is older than ${MIN_WEBVIEW} and SWEEP_WEBVIEW_APK (${WEBVIEW_APK}) is missing`);
      console.log(`installing ${path.basename(WEBVIEW_APK)} over WebView ${wv.version}`);
      adb("install", "-r", WEBVIEW_APK);
      wv = webviewVersion();
    }
    console.log(`WebView: ${wv ? `${wv.pkg} ${wv.version}` : "unknown"}`);

    adb("install", "-r", "-t", APK);
    adb("shell", "am", "force-stop", PKG);
    adb("shell", "am", "start", "-W", "-n", `${PKG}/.MainActivity`);
    const pid = await waitFor(() => adb("shell", "pidof", PKG), "Sweep's process", 30000);
    execFileSync(ADB, ["-s", SERIAL, "forward", `tcp:${DEVTOOLS_PORT}`, `localabstract:webview_devtools_remote_${pid}`]);
    forwarded = true;
    const page = await waitFor(async () => {
      const tabs = await (await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json`)).json();
      return tabs.find((t) => t.url.startsWith("https://appassets.androidplatform.net/"));
    }, "the page in Sweep's WebView", 60000);
    await waitFor(() => evaluate(page.webSocketDebuggerUrl, "typeof SweepNative === 'object'"), "SweepNative", 30000);

    const t0 = Date.now();
    const raw = await evaluate(page.webSocketDebuggerUrl, "SweepNative.scanJson()");
    const scanMs = Date.now() - t0;
    const scan = JSON.parse(raw);
    console.log(`scanJson took ${scanMs} ms`);

    check("the scan ran without a top-level error", !scan.error, scan.error);
    const surfaces = scan.surfaces || [];
    check("the bridge reported every surface the page knows", SURFACES.every((s) => surfaces.some((r) => r.surface === s.id)));
    check("every surface is ok or unavailable", surfaces.every((s) => s.status === "ok" || s.status === "unavailable"), JSON.stringify(surfaces));
    const unavailable = surfaces.filter((s) => s.status === "unavailable");
    check(
      "every unreadable surface carries a known code and no raw reason",
      unavailable.every((s) => CODES.has(s.code) && s.reason === undefined),
      JSON.stringify(unavailable),
    );
    const expected = expectedUnavailable(sdk);
    const got = new Set(unavailable.map((s) => s.surface));
    check(
      `the unreadable set on API ${sdk} is ${[...expected].join(", ")}`,
      got.size === expected.size && [...expected].every((s) => got.has(s)),
      JSON.stringify(unavailable),
    );
    const vpn = surfaces.find((s) => s.surface === "always_on_vpn");
    console.log(`always_on_vpn: ${JSON.stringify(vpn)}`);

    const header = surfaceReport(scan);
    console.log(`surfacesChecked ${header.surfacesChecked} of ${header.surfacesTotal}`);
    check("the page's count matches the bridge", header.surfacesChecked === SURFACES.length - expected.size, String(header.surfacesChecked));

    const apps = scan.apps || [];
    check("the app list includes Sweep itself", apps.some((a) => a.pkg === PKG));
    const pmCount = adb("shell", "pm", "list", "packages").split("\n").filter((l) => l.startsWith("package:")).length;
    const dropped = surfaces.find((s) => s.surface === "installed_apps")?.count || 0;
    console.log(`apps: scan ${apps.length}, pm list packages ${pmCount}, dropped ${dropped}`);
    check("every package Android lists is in the scan, or counted as dropped", apps.length + dropped === pmCount);

    if (sdk >= 29) {
      const role = assistantHolder();
      const fromScan = (scan.roles?.assistant || "").split("/")[0];
      console.log(`assistant: role holder "${role.holder}" (${role.via}), scan "${scan.roles?.assistant || ""}"`);
      if (role.raw) console.log(`  ${JSON.stringify(role.raw)}`);
      check("the assistant read agrees with the role holder", fromScan === role.holder);
    }
  } finally {
    if (forwarded) {
      try {
        execFileSync(ADB, ["-s", SERIAL, "forward", "--remove", `tcp:${DEVTOOLS_PORT}`]);
      } catch {}
    }
    try {
      execFileSync(ADB, ["-s", SERIAL, "emu", "kill"], { stdio: "ignore" });
    } catch {}
    if (emu.exitCode === null) await Promise.race([new Promise((r) => emu.once("exit", r)), sleep(30000)]);
    if (emu.exitCode === null) emu.kill("SIGKILL");
  }
  if (fails.length) {
    console.log("FAILS:", fails.join("; "));
    process.exit(1);
  }
  rmSync(emuLog, { force: true });
  console.log("E2E DEVICE PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
