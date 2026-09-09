import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, matchKnown, matchWatchware, dataAge, selfCheckSummary, unrecognizedAccessibility, surfaceReport, SURFACES } from "../app/js/analyze.js";
import { benignScan, spoofScan, appRec, okSurfaces } from "./corpus.mjs";

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

// ------------------------------------------------------------ tier engine

test("tier 1: a stalkerware certificate fires on any package name", () => {
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0);
  const matches = matchKnown([app("com.totally.novel", { certs: [family.certificates[0]] })], INDICATORS);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].tier, 1);
  assert.equal(matches[0].via, "certificate");
  assert.equal(matches[0].matchedCert, family.certificates[0]);
});

test("tier 2: package and certificate agreeing on one family", () => {
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0 && a.packages.some((p) => !p.endsWith("*")));
  const pkg = family.packages.find((p) => !p.endsWith("*"));
  const matches = matchKnown([app(pkg, { certs: [family.certificates[0]] })], INDICATORS);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].tier, 2);
  assert.equal(matches[0].via, "package+certificate");
});

test("tier 3: package alone matches, and the finding says the cert did not corroborate", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const pkg = family.packages.find((p) => !p.endsWith("*"));
  const matches = matchKnown([app(pkg)], INDICATORS);
  assert.equal(matches[0].tier, 3);
  const report = analyze({ apps: [app(pkg)] }, INDICATORS);
  assert.match(report.matches[0].headline, /can be reused by an unrelated app/);
  assert.match(report.matches[0].headline, /did not also match/);
});

test("tier 4: a prefix match with no corroborating power never reaches the report", () => {
  const SYNTHETIC = { apps: [{ name: "Wild", packages: ["com.wild.fam.*"], certificates: [] }], watchware: [] };
  const bare = analyze({ apps: [app("com.wild.fam.xq1")] }, SYNTHETIC);
  assert.equal(bare.matches.length, 0);
  const withPower = analyze(
    { apps: [app("com.wild.fam.xq1")], accessibility: [{ pkg: "com.wild.fam.xq1", service: "S" }] },
    SYNTHETIC,
  );
  assert.equal(withPower.matches.length, 1);
  assert.equal(withPower.matches[0].tier, 4);
});

test("every finding carries headline, evidence, rule, and provenance", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const pkg = family.packages.find((p) => !p.endsWith("*"));
  const report = analyze({ apps: [app(pkg, { installedDate: "2026-05-01" })] }, INDICATORS);
  const m = report.matches[0];
  assert.ok(m.headline.length > 20);
  assert.equal(m.headlineVars.family, m.family);
  assert.equal(m.whyFlagged, "package-match-uncorroborated");
  assert.ok(m.evidence.some((e) => e.label === "package" && e.value === pkg));
  assert.ok(m.evidence.some((e) => e.label === "matched family"));
  assert.equal(m.provenance.installedDate, "2026-05-01");
});

// ----------------------------------------------------------- IOC corpus

test("IOC corpus floor: every family with a plain package matches at tier 3", () => {
  const families = INDICATORS.apps.filter((a) => a.packages.some((p) => !p.endsWith("*")));
  assert.ok(families.length > 100);
  for (const family of families) {
    const pkg = family.packages.find((p) => !p.endsWith("*"));
    const matches = matchKnown([app(pkg)], INDICATORS);
    assert.equal(matches.length, 1, `${family.name} (${pkg}) did not match`);
    assert.equal(matches[0].tier, 3, `${family.name} (${pkg}) matched at tier ${matches[0].tier}`);
  }
});

test("IOC corpus floor: every family certificate fires at tier 1 under a novel package", () => {
  const families = INDICATORS.apps.filter((a) => a.certificates.length > 0);
  assert.ok(families.length > 80);
  for (const family of families) {
    const matches = matchKnown([app("zz.novel.pkg", { certs: [family.certificates[0]] })], INDICATORS);
    assert.equal(matches.length, 1, `${family.name} cert did not match`);
    assert.equal(matches[0].tier, 1, `${family.name} cert matched at tier ${matches[0].tier}`);
  }
});

// -------------------------------------------------------- dual-use track

test("watchware matches land in the dual-use track only, with dual-use wording", () => {
  const report = analyze({ apps: [appRec("com.microsoft.familysafety")] }, INDICATORS);
  assert.equal(report.matches.length, 0);
  assert.equal(report.dualUse.length, 1);
  assert.equal(report.dualUse[0].tier, "dual-use");
  assert.match(report.dualUse[0].headline, /parental or partner monitoring/);
  assert.match(report.dualUse[0].headline, /does not appear on the stalkerware-indicator list/);
  assert.doesNotMatch(report.dualUse[0].headline, /stalkerware family/);
});

test("watchware families never leak into the stalkerware index", () => {
  const watchwarePkgs = INDICATORS.watchware.flatMap((a) => a.packages);
  assert.ok(watchwarePkgs.includes("com.microsoft.familysafety"));
  const stalkerPkgs = new Set(INDICATORS.apps.flatMap((a) => a.packages));
  const overlap = watchwarePkgs.filter((p) => stalkerPkgs.has(p));
  const matches = matchKnown([appRec("com.microsoft.familysafety")], INDICATORS);
  assert.equal(matches.length, 0);
  // FindMyKids sits on both lists upstream with different fingerprints;
  // each track must answer only from its own list.
  for (const pkg of overlap) {
    const viaStalker = matchKnown([appRec(pkg)], INDICATORS);
    const viaWatch = matchWatchware([appRec(pkg)], INDICATORS);
    assert.ok(viaWatch.length === 1, `${pkg} lost its watchware entry`);
    assert.ok(viaStalker.every((m) => m.familyType === "stalkerware"));
    assert.ok(viaWatch.every((m) => m.familyType === "watchware"));
  }
});

test("difference pair: a stalkerware package and a watchware package land on different tracks", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const bad = family.packages.find((p) => !p.endsWith("*"));
  const badReport = analyze({ apps: [appRec(bad)] }, INDICATORS);
  const dualReport = analyze({ apps: [appRec("com.microsoft.familysafety")] }, INDICATORS);
  assert.ok(badReport.matches.length === 1 && badReport.dualUse.length === 0);
  assert.ok(dualReport.matches.length === 0 && dualReport.dualUse.length === 1);
});

// ---------------------------------------------------------- benign floor

test("benign corpus floor: zero stalkerware-tier findings, zero disguise, zero watching", () => {
  const report = analyze(benignScan(), INDICATORS);
  assert.deepEqual(report.matches, []);
  assert.deepEqual(report.disguised, []);
  assert.deepEqual(report.watching, []);
});

test("benign corpus: the watchware member lands dual-use, everything else lands nowhere", () => {
  const report = analyze(benignScan(), INDICATORS);
  assert.deepEqual(report.dualUse.map((d) => d.pkg), ["com.kaspersky.safekids"]);
  // Family Link is not on the upstream watchware list, so the honest result
  // is no finding at all; the floor that matters is that it never lands a
  // stalkerware tier.
  assert.ok(!report.matches.some((m) => m.pkg === "com.google.android.apps.kids.familylink"));
  assert.ok(report.admins.some((a) => a.pkg === "com.google.android.apps.kids.familylink"));
});

test("benign corpus: system assistive services pass, password managers still listed", () => {
  const report = analyze(benignScan(), INDICATORS);
  const unrecognized = unrecognizedAccessibility(report.accessibility).map((a) => a.pkg).sort();
  assert.deepEqual(unrecognized, ["com.lastpass.lpandroid", "com.x8bit.bitwarden"]);
});

test("benign corpus: a Play-updated Google app never fires the disguise rule", () => {
  const report = analyze(benignScan(), INDICATORS);
  assert.ok(!report.disguised.some((d) => d.pkg === "com.google.android.gm"));
});

test("benign corpus: admin policy facts ride along, unreadable policies stay null", () => {
  const report = analyze(benignScan(), INDICATORS);
  const adm = report.admins.find((a) => a.pkg === "com.google.android.apps.adm");
  assert.equal(adm.policies.wipeData, true);
  const familylink = report.admins.find((a) => a.pkg === "com.google.android.apps.kids.familylink");
  assert.equal(familylink.policies, null);
});

// ---------------------------------------------------------- spoof corpus

test("spoof corpus: a known name with the wrong certificate is not trusted", () => {
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0);
  const report = analyze(spoofScan(family.certificates[0]), INDICATORS);
  const lastpass = report.accessibility.find((a) => a.pkg === "com.lastpass.lpandroid");
  assert.ok(lastpass);
  assert.ok(unrecognizedAccessibility(report.accessibility).some((a) => a.pkg === "com.lastpass.lpandroid"));
  assert.ok(!report.matches.some((m) => m.pkg === "com.lastpass.lpandroid"));
});

test("spoof corpus: a stalkerware certificate under a novel package fires at tier 1", () => {
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0);
  const report = analyze(spoofScan(family.certificates[0]), INDICATORS);
  const hit = report.matches.find((m) => m.pkg === "com.innocent.looking.app");
  assert.ok(hit);
  assert.equal(hit.tier, 1);
  assert.equal(hit.via, "certificate");
});

test("spoof corpus: a non-system TalkBack clone is flagged and fires disguise", () => {
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0);
  const report = analyze(spoofScan(family.certificates[0]), INDICATORS);
  assert.ok(unrecognizedAccessibility(report.accessibility).some((a) => a.pkg === "com.google.android.marvin.talkback"));
  assert.ok(report.disguised.some((d) => d.pkg === "com.google.android.marvin.talkback"));
});

test("spoof corpus: the watchware package stays dual-use only, absent from every stalkerware array", () => {
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0);
  const report = analyze(spoofScan(family.certificates[0]), INDICATORS);
  assert.ok(report.dualUse.some((d) => d.pkg === "com.microsoft.familysafety"));
  assert.ok(!report.matches.some((m) => m.pkg === "com.microsoft.familysafety"));
  assert.ok(!report.disguised.some((d) => d.pkg === "com.microsoft.familysafety"));
  assert.ok(!report.watching.some((w) => w.pkg === "com.microsoft.familysafety"));
});

test("difference pair: benign twins and spoof twins never produce the same output", () => {
  const benign = analyze(benignScan(), INDICATORS);
  const family = INDICATORS.apps.find((a) => a.certificates.length > 0);
  const spoof = analyze(spoofScan(family.certificates[0]), INDICATORS);
  const benignTalkback = unrecognizedAccessibility(benign.accessibility).map((a) => a.pkg);
  const spoofTalkback = unrecognizedAccessibility(spoof.accessibility).map((a) => a.pkg);
  assert.ok(!benignTalkback.includes("com.google.android.marvin.talkback"));
  assert.ok(spoofTalkback.includes("com.google.android.marvin.talkback"));
  assert.notEqual(benign.matches.length, spoof.matches.length);
});

test("difference pairs: a system-looking name needs concealment or a power, never just a non-Play installer", () => {
  const galaxyStore = analyze({ apps: [appRec("com.sec.android.daemonapp", { installer: "com.sec.android.app.samsungapps" })] }, INDICATORS);
  assert.equal(galaxyStore.disguised.length, 0);

  const mdmChrome = analyze({ apps: [appRec("com.android.chrome", { installer: null })] }, INDICATORS);
  assert.equal(mdmChrome.disguised.length, 0);

  const hiddenTwin = analyze({ apps: [appRec("com.android.chrome", { installer: null, hasLauncher: false })] }, INDICATORS);
  assert.equal(hiddenTwin.disguised.length, 1);
  assert.match(hiddenTwin.disguised[0].headline, /treat this as something to check, not proof/);

  const poweredTwin = analyze(
    { apps: [appRec("com.android.chrome", { installer: null })], notifications: [{ pkg: "com.android.chrome", service: "Svc" }] },
    INDICATORS,
  );
  assert.equal(poweredTwin.disguised.length, 1);

  const bootTwin = analyze({ apps: [appRec("com.android.chrome", { installer: null, bootReceiver: true })] }, INDICATORS);
  assert.equal(bootTwin.disguised.length, 1);
});

// --------------------------------------------------- watching-combo rule

test("the watching combo needs all four legs, and any leg missing drops it", () => {
  const full = appRec("com.quiet.watcher", {
    installer: null,
    hasLauncher: false,
    bootReceiver: true,
    grants: { "android.permission.RECORD_AUDIO": true },
  });
  assert.equal(analyze({ apps: [full] }, INDICATORS).watching.length, 1);
  assert.equal(analyze({ apps: [{ ...full, hasLauncher: true }] }, INDICATORS).watching.length, 0);
  assert.equal(analyze({ apps: [{ ...full, installer: "com.android.vending" }] }, INDICATORS).watching.length, 0);
  assert.equal(analyze({ apps: [{ ...full, bootReceiver: false }] }, INDICATORS).watching.length, 0);
  assert.equal(analyze({ apps: [{ ...full, grants: {} }] }, INDICATORS).watching.length, 0);
});

test("battery exemption satisfies the persistence leg", () => {
  const a = appRec("com.quiet.watcher", {
    installer: null,
    hasLauncher: false,
    bootReceiver: false,
    batteryExempt: true,
    grants: { "android.permission.READ_SMS": true },
  });
  assert.equal(analyze({ apps: [a] }, INDICATORS).watching.length, 1);
});

// ------------------------------------------------------- honesty header

test("the three privileged surfaces appear in could-not-check on every scan", () => {
  for (const scan of [benignScan(), { apps: [] }, { apps: [], surfaces: [] }]) {
    const header = analyze(scan, INDICATORS).header;
    const ids = header.couldNotCheck.map((c) => c.surface);
    for (const id of ["usage_access_grants", "overlay_grants", "install_unknown_grants"]) {
      assert.ok(ids.includes(id), `${id} missing from could-not-check`);
    }
    assert.ok(header.couldNotCheck.every((c) => c.reason));
  }
});

test("a failed surface still produces results plus the honesty line", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const bad = family.packages.find((p) => !p.endsWith("*"));
  const surfaces = okSurfaces().map((s) =>
    s.surface === "input_methods" ? { surface: "input_methods", status: "unavailable", reason: "SecurityException: boom" } : s,
  );
  const report = analyze({ apps: [appRec(bad)], surfaces }, INDICATORS);
  assert.equal(report.matches.length, 1);
  const failed = report.header.couldNotCheck.find((c) => c.surface === "input_methods");
  assert.equal(failed.reason, "SecurityException: boom");
  assert.equal(report.header.surfacesChecked, 19);
  assert.equal(report.header.surfacesTotal, SURFACES.length);
});

test("an old-shape scan reads as could-not-check for every new surface, never as silence", () => {
  const header = surfaceReport({ apps: [], admins: [], accessibility: [], notifications: [] });
  assert.equal(header.surfacesChecked, 4);
  assert.equal(header.couldNotCheck.length, SURFACES.length - 4);
});

test("a fully reported scan checks everything except the privileged three", () => {
  const header = surfaceReport({ surfaces: okSurfaces() });
  assert.equal(header.surfacesChecked, SURFACES.length - 3);
  assert.equal(header.couldNotCheck.length, 3);
});

// ------------------------------------------------ new capability buckets

test("keyboards, roles, owners, globals, and vpn declarers flow through enriched", () => {
  const scan = benignScan();
  scan.vpnServices = ["com.quiet.tunnel"];
  scan.alwaysOnVpn = "com.quiet.tunnel";
  scan.owners = { deviceOwner: "com.microsoft.windowsintune.companyportal", profileOwners: [], workProfile: true };
  scan.globals = { adbEnabled: true, developmentSettingsEnabled: true, adbWifiEnabled: false };
  scan.apps.push(appRec("com.quiet.tunnel", { installer: null, hasLauncher: false }));
  const report = analyze(scan, INDICATORS);
  assert.equal(report.imes.length, 1);
  assert.equal(report.imes[0].isDefault, true);
  assert.equal(report.roles.sms.pkg, "com.google.android.apps.messaging");
  assert.equal(report.roles.sms.system, false);
  assert.equal(report.owners.deviceOwner.pkg, "com.microsoft.windowsintune.companyportal");
  assert.equal(report.owners.workProfile, true);
  assert.equal(report.globals.adbEnabled, true);
  const vpn = report.vpnApps[0];
  assert.equal(vpn.hidden, true);
  assert.equal(vpn.sideloadedInstall, true);
  assert.equal(report.alwaysOnVpn, "com.quiet.tunnel");
});

test("accessibility cross-check reports when the two OS records disagree", () => {
  const scan = benignScan();
  scan.accessibility.push({ pkg: "com.only.in.settings", service: "S" });
  const report = analyze(scan, INDICATORS);
  assert.equal(report.accessibilityCrossCheck.consistent, false);
  assert.deepEqual(report.accessibilityCrossCheck.onlyInSettings, ["com.only.in.settings"]);
  assert.ok(report.accessibility.some((a) => a.pkg === "com.only.in.settings"));
});

// ------------------------------------------- dataset pipeline validators

const PYTHON = spawnSync("python3", ["-c", "import yaml"], { encoding: "utf8" });

test("fetch-indicators rejects a certificate that is not 40 hex chars", { skip: PYTHON.status !== 0 && "python3+pyyaml unavailable" }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sweep-ind-"));
  writeFileSync(path.join(dir, "bad.yaml"), '- name: Bad\n  type: stalkerware\n  packages:\n    - com.bad.app\n  certificates:\n    - "NOTHEX"\n');
  writeFileSync(path.join(dir, "empty.yaml"), "[]\n");
  const r = spawnSync("python3", ["tools/fetch-indicators.py", "--ioc", path.join(dir, "bad.yaml"), "--watchware", path.join(dir, "empty.yaml"), "--out", path.join(dir, "out.json"), "--force"], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stderr, /REFUSING/);
});

test("fetch-indicators rejects a package that does not look like a package", { skip: PYTHON.status !== 0 && "python3+pyyaml unavailable" }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sweep-ind-"));
  writeFileSync(path.join(dir, "bad.yaml"), "- name: Bad\n  type: stalkerware\n  packages:\n    - 'not a package!'\n");
  writeFileSync(path.join(dir, "empty.yaml"), "[]\n");
  const r = spawnSync("python3", ["tools/fetch-indicators.py", "--ioc", path.join(dir, "bad.yaml"), "--watchware", path.join(dir, "empty.yaml"), "--out", path.join(dir, "out.json"), "--force"], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stderr, /REFUSING/);
});

test("fetch-indicators accepts a well-formed fixture (negative control for the validators)", { skip: PYTHON.status !== 0 && "python3+pyyaml unavailable" }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sweep-ind-"));
  writeFileSync(path.join(dir, "good.yaml"), '- name: Fine\n  type: stalkerware\n  packages:\n    - com.fine.app\n  certificates:\n    - "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"\n');
  writeFileSync(path.join(dir, "ww.yaml"), "- name: Watch\n  type: watchware\n  packages:\n    - com.watch.app\n");
  const r = spawnSync("python3", ["tools/fetch-indicators.py", "--ioc", path.join(dir, "good.yaml"), "--watchware", path.join(dir, "ww.yaml"), "--out", path.join(dir, "out.json"), "--force"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = JSON.parse(readFileSync(path.join(dir, "out.json"), "utf8"));
  assert.equal(out.apps.length, 1);
  assert.equal(out.watchware.length, 1);
  assert.ok(out.commit.length === 40);
});

test("fetch-indicators refuses a large family-count swing without --force", { skip: PYTHON.status !== 0 && "python3+pyyaml unavailable" }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sweep-ind-"));
  writeFileSync(path.join(dir, "tiny.yaml"), "- name: OnlyOne\n  type: stalkerware\n  packages:\n    - com.only.one\n");
  writeFileSync(path.join(dir, "empty.yaml"), "[]\n");
  const r = spawnSync("python3", ["tools/fetch-indicators.py", "--ioc", path.join(dir, "tiny.yaml"), "--watchware", path.join(dir, "empty.yaml"), "--out", path.join(dir, "out.json"), "--baseline", path.join(ROOT, "app", "data", "indicators.json")], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stderr, /swung/);
});

test("boot plus a sensor-typed service is a pattern finding, with negative controls", () => {
  const combo = appRec("com.boot.listener", { bootReceiver: true, fgsTypes: ["microphone", "location"] });
  const report = analyze({ apps: [combo] }, INDICATORS);
  assert.equal(report.bootFgs.length, 1);
  assert.deepEqual(report.bootFgs[0].sensorPhrases, ["the microphone", "location"]);
  assert.match(report.bootFgs[0].headline, /legitimately do the same/);
  assert.equal(analyze({ apps: [{ ...combo, system: true }] }, INDICATORS).bootFgs.length, 0);
  assert.equal(analyze({ apps: [{ ...combo, bootReceiver: false }] }, INDICATORS).bootFgs.length, 0);
  assert.equal(analyze({ apps: [{ ...combo, fgsTypes: [] }] }, INDICATORS).bootFgs.length, 0);
});
