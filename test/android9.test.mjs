// Android 9: the build targets it, the wrapper turns away a WebView too old
// for the page and says why, and the scan doesn't ask Android 9 for
// foreground service types it never had (that call would mark every app's
// manifest unreadable).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const KT = "android/app/src/main/kotlin/io/github/munzzyy/sweep/";
const KEYS = ["webview_title", "webview_too_old", "webview_missing", "android9_title", "android9_body"];

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const RES = "android/app/src/main/res/";

test("the build installs on Android 9", () => {
  assert.match(read("android/app/build.gradle.kts"), /^\s*minSdk = 28$/m);
});

test("every new string has a Spanish version with the same placeholders", () => {
  const en = read(RES + "values/strings.xml");
  const es = read(RES + "values-es/strings.xml");
  const get = (xml, key) => xml.match(new RegExp(`<string name="${key}"[^>]*>([^<]*)</string>`))?.[1];
  for (const key of KEYS) {
    assert.ok(get(en, key), `values/${key}`);
    assert.ok(get(es, key), `values-es/${key}`);
  }
  for (const xml of [en, es]) {
    const tooOld = get(xml, "webview_too_old");
    assert.ok(tooOld.includes("%1$d") && tooOld.includes("%2$d"), "needs the minimum and the phone's version");
    assert.doesNotMatch(xml, /[\u2013\u2014]/);
  }
  assert.match(get(en, "android9_body"), /January 2022/);
  assert.match(get(es, "android9_body"), /enero de 2022/);
});

test("the WebView check runs before any WebView exists", () => {
  const src = read(KT + "MainActivity.kt");
  const gate = src.indexOf("if (SystemCheck.blockIfWebViewTooOld(this)) return");
  const make = src.indexOf("WebView(this)");
  assert.ok(gate > 0 && make > 0 && gate < make);
  assert.ok(src.indexOf("SystemCheck.noteAndroid9(this)") > make, "the note comes after the page is set up");
});

test("service types are only read where Android has them", () => {
  assert.match(
    read(KT + "SweepBridge.kt"),
    /if \(Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.Q\) \{\s*for \(svc in info\.services \?: emptyArray\(\)\) \{\s*mask = mask or svc\.foregroundServiceType/,
  );
});
