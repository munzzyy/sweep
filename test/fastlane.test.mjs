// F-Droid's limits for store text, counted in characters (not bytes, which
// Spanish accents would inflate), plus the house rules that check-clean.sh
// can't see because it skips .txt files.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const BASE = new URL("../fastlane/metadata/android/", import.meta.url);
const LIMITS = { "title.txt": 50, "short_description.txt": 80, "full_description.txt": 4000 };
const CHANGELOG_LIMIT = 500;
const UNACCENTED_ES = /\b(revision|telefono|version|victimas|rapida|certificacion|anadidas|depuracion)\b/i;

const chars = (s) => [...s.trim()].length;
const fits = (s, limit) => chars(s) <= limit;

const locales = readdirSync(BASE, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

function texts(locale) {
  const dir = new URL(`${locale}/`, BASE);
  const out = [];
  for (const name of Object.keys(LIMITS)) {
    if (existsSync(new URL(name, dir))) out.push([name, readFileSync(new URL(name, dir), "utf8"), LIMITS[name]]);
  }
  const logs = new URL("changelogs/", dir);
  if (existsSync(logs)) {
    for (const name of readdirSync(logs)) out.push([`changelogs/${name}`, readFileSync(new URL(name, logs), "utf8"), CHANGELOG_LIMIT]);
  }
  return out;
}

test("the length check counts characters, and a 98-character summary does not fit", () => {
  const old = "Una revision del telefono en lenguaje claro. En el dispositivo, sin guardar nada, sin enviar nada.";
  assert.equal(chars(old), 98);
  assert.equal(fits(old, 80), false);
  assert.equal(fits("é".repeat(80), 80), true);
});

for (const locale of locales) {
  test(`${locale}: every text fits F-Droid's limits`, () => {
    const over = texts(locale)
      .filter(([, text, limit]) => !fits(text, limit))
      .map(([name, text, limit]) => `${name}: ${chars(text)} > ${limit}`);
    assert.deepEqual(over, []);
  });

  test(`${locale}: no em or en dashes`, () => {
    for (const [name, text] of texts(locale)) assert.doesNotMatch(text, /[\u2013\u2014]/, name);
  });
}

test("es-ES has a full description of its own", () => {
  assert.ok(existsSync(new URL("es-ES/full_description.txt", BASE)));
});

test("es-ES keeps its accents", () => {
  for (const [name, text] of texts("es-ES")) assert.doesNotMatch(text, UNACCENTED_ES, name);
});
