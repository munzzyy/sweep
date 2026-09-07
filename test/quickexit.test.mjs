import test from "node:test";
import assert from "node:assert/strict";
import { decideExit } from "../app/js/quickexit.js";

test("android wrapper: the native bridge wins even on the sweep scheme", () => {
  assert.equal(decideExit({ hasNativeQuickExit: true, protocol: "sweep:", hasLeaveFastBridge: false }), "native");
});

test("iOS wrapper with the exit bridge present: posts to it", () => {
  assert.equal(decideExit({ hasNativeQuickExit: false, protocol: "sweep:", hasLeaveFastBridge: true }), "bridge");
});

test("negative control: iOS wrapper on a stale build with no bridge fails loud, never silently", () => {
  assert.equal(decideExit({ hasNativeQuickExit: false, protocol: "sweep:", hasLeaveFastBridge: false }), "fail-loud");
});

test("plain web, no wrapper of any kind: falls back to the weather redirect", () => {
  assert.equal(decideExit({ hasNativeQuickExit: false, protocol: "https:", hasLeaveFastBridge: false }), "web-fallback");
});
