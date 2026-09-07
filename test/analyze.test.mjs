import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, matchKnown } from "../app/js/analyze.js";

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

test("a full simulated infested scan flags through every channel", () => {
  const family = INDICATORS.apps.find((a) => a.packages.some((p) => !p.endsWith("*")));
  const bad = family.packages.find((p) => !p.endsWith("*"));
  const scan = {
    admins: [{ pkg: bad }],
    accessibility: [{ pkg: bad, service: "Watcher" }],
    apps: [app(bad, { hasLauncher: false, installer: null })],
  };
  const report = analyze(scan, INDICATORS);
  assert.equal(report.matches.length, 1);
  assert.equal(report.hidden.length, 1);
  assert.equal(report.sideloaded.length, 1);
  assert.equal(report.admins.length, 1);
});
