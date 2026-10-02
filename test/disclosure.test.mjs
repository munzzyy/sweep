// What Sweep says it reads has to cover what the bridge actually reads.
// A privacy page that understates the scan is a trust bug for the people
// this app is for, so every group SweepBridge.buildScan() reads is named in
// each place that describes the scan.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const flat = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").toLowerCase();

function between(src, start, end) {
  const from = src.indexOf(start);
  assert.ok(from >= 0, `${start} not found`);
  const to = src.indexOf(end, from + start.length);
  return src.slice(from, to < 0 ? undefined : to);
}

const GROUPS = [
  "installed apps",
  "device admin",
  "accessibility",
  "notification",
  "permission",
  "keyboard",
  "certificate",
  "vpn",
  "text message",
  "assistant",
  "owner",
  "work profile",
  "debugging",
  "battery",
  "installed from",
  "boot",
  "could not",
];

const DOCS = {
  "app/privacy.html": () => read("app/privacy.html"),
  "fastlane/metadata/android/en-US/full_description.txt": () => read("fastlane/metadata/android/en-US/full_description.txt"),
  "docs/THREAT-MODEL.md, The device is the boundary": () => between(read("docs/THREAT-MODEL.md"), "## The device is the boundary", "\n## "),
  "app/index.html, What it checks": () => between(read("app/index.html"), ">What it checks<", "</section>"),
};

for (const [name, load] of Object.entries(DOCS)) {
  test(`${name} names every group the scan reads`, () => {
    const text = flat(load());
    const missing = GROUPS.filter((g) => !text.includes(g));
    assert.deepEqual(missing, []);
  });
}

test("the privacy page no longer describes the 0.1.0 scan", () => {
  assert.ok(!flat(read("app/privacy.html")).includes("reads the list of installed apps, active device admins, and enabled accessibility services"));
});

test("the store description fits F-Droid's 4000 characters", () => {
  assert.ok([...read("fastlane/metadata/android/en-US/full_description.txt")].length <= 4000);
});
