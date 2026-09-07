// The judgment layer for "Leave fast", kept pure so it runs under node's
// test runner the way analyze.js does. No DOM, no side effects: main.js
// decides what to actually do with whatever this returns.

export function decideExit({ hasNativeQuickExit, protocol, hasLeaveFastBridge }) {
  if (hasNativeQuickExit) return "native";
  if (protocol === "sweep:") return hasLeaveFastBridge ? "bridge" : "fail-loud";
  return "web-fallback";
}
