// The bridge must never report a surface as read when it saw nothing. No
// JVM test runs here (new test deps would change gradle.lockfile and the
// F-Droid recipe), so these pin each guard by reading the Kotlin source.
// test/e2e_device.mjs checks the same bridge on an emulator.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const KT = "../android/app/src/main/kotlin/io/github/munzzyy/sweep/";
const bridge = readFileSync(new URL(`${KT}SweepBridge.kt`, import.meta.url), "utf8");
const activity = readFileSync(new URL(`${KT}MainActivity.kt`, import.meta.url), "utf8");

function block(opener) {
  const start = bridge.indexOf(opener);
  assert.ok(start >= 0, `${opener} not found`);
  const end = bridge.indexOf("\n        }\n", start);
  return bridge.slice(start, end);
}

test("a failed device admin read marks both admin surfaces unreadable", () => {
  assert.match(bridge, /val adminRead = runCatching \{ dpm\.activeAdmins/);
  assert.match(block('surface("device_admins") {'), /for \(admin in adminRead\.getOrThrow\(\)\)/);
  assert.match(block('surface("admin_policies") {'), /for \(admin in adminRead\.getOrThrow\(\)\)/);
});

test("an app that fails to read is counted, not skipped", () => {
  const apps = block("val appsRead = runCatching {");
  assert.doesNotMatch(apps, /return@runCatching/);
  assert.match(apps, /info\.applicationInfo \?: error\(/);
  assert.match(apps, /\}\.onFailure \{\s*appFailures\+\+/);
});

test("the per-app surfaces go through one guard that knows whether the app list was read", () => {
  const guard = block("fun perApp(");
  assert.match(guard, /appListError != null -> failed\(name, appListError\)/);
  assert.match(guard, /failures > 0 -> unavailable\(name, "partial"/);
  for (const [name, counter] of [
    ["installed_apps", "appFailures"],
    ["permission_grants", "grantFailures"],
    ["app_manifests", "manifestFailures"],
    ["install_sources", "sourceFailures"],
  ]) {
    assert.match(bridge, new RegExp(`perApp\\("${name}", ${counter},`), name);
    assert.doesNotMatch(bridge, new RegExp(`ok\\("${name}"\\)`), name);
  }
});

test("owners and battery exemptions fail with the app list instead of reading zero apps", () => {
  for (const name of ["owners", "battery_exemptions"]) {
    assert.match(block(`surface("${name}") {`), /^surface\("\w+"\) \{\s*if \(appListError != null\) throw appListError/, name);
  }
});

test("a failed installer read is a source failure, never a recorded null", () => {
  const fn = bridge.slice(bridge.indexOf("private fun installSource("), bridge.indexOf("private fun permissionFacts("));
  assert.doesNotMatch(fn, /getInstallerPackageName\(pkg\) \}\.getOrNull\(\)/);
  assert.doesNotMatch(fn, /onFailure \{[^}]*put\("installer"/);
  const legacy = fn.slice(fn.indexOf("} else {"));
  assert.match(legacy, /getInstallerPackageName\(pkg\)[\s\S]*\}\.onFailure \{ onError\(it\.toString\(\)\) \}/);
});

test("every unreadable surface carries a code, and exception text only as detail", () => {
  assert.doesNotMatch(bridge, /put\("reason"/);
  assert.match(bridge, /put\("code", code\)/);
  assert.match(bridge, /if \(err is SecurityException\) "not_readable" else "error"/);
});

test("WebView debugging is only on for debuggable builds", () => {
  assert.match(
    activity,
    /if \(\(applicationInfo\.flags and ApplicationInfo\.FLAG_DEBUGGABLE\) != 0\) \{\s*WebView\.setWebContentsDebuggingEnabled\(true\)\s*\}/,
  );
  assert.equal(activity.match(/setWebContentsDebuggingEnabled/g).length, 1);
});
