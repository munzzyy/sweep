import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, matchKnown, dataAge, selfCheckSummary, unrecognizedAccessibility } from "../app/js/analyze.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDICATORS = JSON.parse(readFileSync(path.join(ROOT, "app", "data", "indicators.json"), "utf8"));

const app = (pkg, over = {}) => ({
  pkg,
  label: pkg,
  system: false,
  hasLauncher: true,
  installer: "com.android.vending",
  certs: [],
  ...over,
});

test("the bundled dataset is substantial and well-formed", () => {
  assert.ok(INDICATORS.apps.length > 80, String(INDICATORS.apps.length));
  const pkgs = INDICATORS.apps.flatMap((a) => a.packages);
  assert.ok(pkgs.length > 300);
  assert.ok(INDICATORS.apps.every((a) => typeof a.name === "string" && a.name));
  assert.match(INDICATORS.license, /CC-BY/);
});

test("positive control: a known stalkerware package is matched", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const pkg = family.packages.find((p) => !p.endsWith("*"));
  const matches = matchKnown([app(pkg)], INDICATORS);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].family, family.name);
  assert.equal(matches[0].via, "package");
});

test("wildcard families match by prefix", () => {
  // A synthetic fixture, not the live dataset: a future refresh that ships
  // zero wildcard entries must not make this test silently stop exercising
  // the prefix-matching code path README.md advertises.
  const SYNTHETIC = {
    apps: [{ name: "Synthetic Wildcard Family", packages: ["com.synthetic.wild.*"], certificates: [] }],
  };
  const matches = matchKnown([app("com.synthetic.wild.xq7random")], SYNTHETIC);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].family, "Synthetic Wildcard Family");
  assert.equal(matches[0].via, "package");
});

test("certificate matches catch rebrands under new package names", () => {
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0);
  const cert = family.certificates[0];
  const matches = matchKnown([app("com.totally.new.name", { certs: [cert.toLowerCase()] })], INDICATORS);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].family, family.name);
  assert.equal(matches[0].via, "certificate");
});

test("negative control: ordinary apps match nothing", () => {
  const matches = matchKnown(
    [app("com.whatsapp"), app("org.mozilla.firefox"), app("com.google.android.gm")],
    INDICATORS,
  );
  assert.equal(matches.length, 0);
});

test("analyze buckets admins, accessibility, hidden, and sideloaded", () => {
  const scan = {
    admins: [{ pkg: "com.evil.tracker", label: "" }],
    accessibility: [{ pkg: "com.evil.tracker", service: "SpyService" }],
    apps: [
      app("com.evil.tracker", { hasLauncher: false, installer: null, label: "System Service" }),
      app("com.android.systemui", { system: true, hasLauncher: false, installer: null }),
      app("org.fdroid.fdroid", { installer: null }),
      app("com.whatsapp"),
    ],
  };
  const report = analyze(scan, INDICATORS);
  assert.equal(report.admins.length, 1);
  assert.equal(report.admins[0].label, "System Service");
  assert.equal(report.accessibility.length, 1);
  // Hidden: non-system without launcher; the system app is excluded.
  assert.deepEqual(report.hidden.map((a) => a.pkg), ["com.evil.tracker"]);
  // Sideloaded: no installer and not a store; fdroid app itself sideloaded here.
  assert.deepEqual(report.sideloaded.map((a) => a.pkg).sort(), ["com.evil.tracker", "org.fdroid.fdroid"]);
  assert.equal(report.counts.apps, 4);
});

test("dataAge: a list fetched today is never stale", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const age = dataAge({ fetched: "2026-09-06" }, now);
  assert.equal(age.ageDays, 0);
  assert.equal(age.stale, false);
});

test("dataAge: just under the threshold is not stale (negative control)", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const fetchedMs = now.getTime() - 120 * 86400000;
  const fetched = new Date(fetchedMs).toISOString().slice(0, 10);
  const age = dataAge({ fetched }, now);
  assert.equal(age.ageDays, 120);
  assert.equal(age.stale, false);
});

test("dataAge: just past the threshold is stale", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const fetchedMs = now.getTime() - 121 * 86400000;
  const fetched = new Date(fetchedMs).toISOString().slice(0, 10);
  const age = dataAge({ fetched }, now);
  assert.equal(age.ageDays, 121);
  assert.equal(age.stale, true);
});

test("dataAge: a missing or malformed fetch date never claims staleness", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  assert.deepEqual(dataAge({}, now), { fetched: null, ageDays: null, stale: false });
  assert.deepEqual(dataAge({ fetched: "not-a-date" }, now), { fetched: null, ageDays: null, stale: false });
});

test("a full simulated infested scan flags through every channel", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const bad = family.packages.find((p) => !p.endsWith("*"));
  const scan = {
    admins: [{ pkg: bad }],
    accessibility: [{ pkg: bad, service: "Watcher" }],
    notifications: [{ pkg: bad, service: "Reader" }],
    apps: [app(bad, { hasLauncher: false, installer: null })],
  };
  const report = analyze(scan, INDICATORS);
  assert.equal(report.matches.length, 1);
  assert.equal(report.hidden.length, 1);
  assert.equal(report.sideloaded.length, 1);
  assert.equal(report.admins.length, 1);
  assert.equal(report.notifications.length, 1);
});

test("notification listeners are bucketed like accessibility services", () => {
  const scan = {
    notifications: [{ pkg: "com.watch.companion", service: "NotifListener" }],
    apps: [app("com.watch.companion", { label: "Watch Companion" })],
  };
  const report = analyze(scan, INDICATORS);
  assert.equal(report.notifications.length, 1);
  assert.equal(report.notifications[0].label, "Watch Companion");
  assert.equal(report.counts.notifications, 1);
});

test("negative control: no enabled notification listeners means an empty bucket", () => {
  const report = analyze({ apps: [app("com.whatsapp")] }, INDICATORS);
  assert.deepEqual(report.notifications, []);
  assert.equal(report.counts.notifications, 0);
});

test("flagged lists sort most-recently-installed first, unknown dates last", () => {
  const scan = {
    admins: [
      { pkg: "com.old.admin" },
      { pkg: "com.new.admin" },
      { pkg: "com.unknown.admin" },
    ],
    apps: [
      app("com.old.admin", { installedDate: "2025-01-01" }),
      app("com.new.admin", { installedDate: "2026-06-01" }),
      app("com.unknown.admin", { installedDate: null }),
    ],
  };
  const report = analyze(scan, INDICATORS);
  assert.deepEqual(
    report.admins.map((a) => a.pkg),
    ["com.new.admin", "com.old.admin", "com.unknown.admin"],
  );
});

test("every flagged entry carries an install date and installer, when known", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const bad = family.packages.find((p) => !p.endsWith("*"));
  const scan = {
    apps: [app(bad, { installedDate: "2026-03-14", installer: "com.android.vending" })],
  };
  const report = analyze(scan, INDICATORS);
  assert.equal(report.matches[0].installedDate, "2026-03-14");
  assert.equal(report.matches[0].installer, "com.android.vending");
});

test("cross-referenced match evidence: a matched app's other powers are surfaced", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const bad = family.packages.find((p) => !p.endsWith("*"));
  const scan = {
    admins: [{ pkg: bad }],
    accessibility: [{ pkg: bad, service: "Watcher" }],
    apps: [app(bad)],
  };
  const report = analyze(scan, INDICATORS);
  assert.deepEqual(report.matches[0].powers, { admin: true, accessibility: true, notifications: false });
});

test("negative control: a match with no other surfaces holds no powers", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const bad = family.packages.find((p) => !p.endsWith("*"));
  const report = analyze({ apps: [app(bad)] }, INDICATORS);
  assert.deepEqual(report.matches[0].powers, { admin: false, accessibility: false, notifications: false });
});

test("selfCheckSummary: no INTERNET permission reads as the honest claim", () => {
  const summary = selfCheckSummary({
    pkg: "io.github.munzzyy.sweep",
    version: "0.2.0",
    permissions: ["android.permission.QUERY_ALL_PACKAGES"],
  });
  assert.equal(summary.hasInternet, false);
});

test("negative control: a planted INTERNET permission is caught, not hidden", () => {
  const summary = selfCheckSummary({
    pkg: "io.github.munzzyy.sweep",
    version: "0.2.0",
    permissions: ["android.permission.QUERY_ALL_PACKAGES", "android.permission.INTERNET"],
  });
  assert.equal(summary.hasInternet, true);
});

test("selfCheckSummary: malformed data degrades to an honest unknown, never a crash", () => {
  assert.deepEqual(selfCheckSummary({}), { pkg: null, version: null, permissions: [], hasInternet: false });
  assert.deepEqual(selfCheckSummary(null), { pkg: null, version: null, permissions: [], hasInternet: false });
});

test("negative control: a clean device has no unrecognized accessibility service", () => {
  assert.deepEqual(unrecognizedAccessibility([]), []);
  assert.deepEqual(unrecognizedAccessibility(undefined), []);
});

test("negative control: a recognized, system-installed assistive service is not flagged", () => {
  const list = [
    { pkg: "com.google.android.marvin.talkback", service: "TalkBackService", system: true },
    { pkg: "com.google.android.apps.accessibility.voiceaccess", service: "VoiceAccessService", system: true },
  ];
  assert.deepEqual(unrecognizedAccessibility(list), []);
});

test("a planted, unrecognized accessibility service is flagged", () => {
  const list = [{ pkg: "com.evil.tracker", service: "Watcher", system: false }];
  assert.deepEqual(unrecognizedAccessibility(list), list);
});

test("a mix of recognized and unrecognized services flags only the unrecognized one", () => {
  const list = [
    { pkg: "com.google.android.marvin.talkback", service: "TalkBackService", system: true },
    { pkg: "com.evil.tracker", service: "Watcher", system: false },
  ];
  assert.deepEqual(unrecognizedAccessibility(list), [list[1]]);
});

test("a spoofed clone using TalkBack's own package name is flagged, because it is not a system app", () => {
  const list = [{ pkg: "com.google.android.marvin.talkback", service: "EvilService", system: false }];
  assert.deepEqual(unrecognizedAccessibility(list), list);
});

test("a name match with no system field at all (unenriched input) is not trusted either", () => {
  const list = [{ pkg: "com.google.android.marvin.talkback", service: "EvilService" }];
  assert.deepEqual(unrecognizedAccessibility(list), list);
});
