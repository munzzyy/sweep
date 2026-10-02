// app/_headers is what Cloudflare Pages serves for sweep.munzzyy.dev.
// Overlapping path rules there produce two CSP headers that both apply,
// and no-transform is what stops Cloudflare injecting its beacon and
// rewriting mailto links.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const headers = read("app/_headers");
const metaCsp = read("app/index.html").match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1];

test("one path rule, so no response gets two CSPs", () => {
  const rules = headers.split("\n").filter((l) => l.trim() && !/^\s/.test(l) && !l.startsWith("#"));
  assert.deepEqual(rules, ["/*"]);
});

test("the served CSP is the page's own CSP plus frame-ancestors", () => {
  const served = headers.match(/^\s+Content-Security-Policy:\s*(.+)$/m)[1].trim();
  assert.equal(served, `${metaCsp}; frame-ancestors 'none'`);
  assert.equal(headers.match(/Content-Security-Policy:/g).length, 1);
});

test("Cloudflare is told not to rewrite responses", () => {
  assert.match(headers, /^\s+Cache-Control:.*\bno-transform\b/m);
});
