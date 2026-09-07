// Boot and flow. Results live only on the screen: no storage, no history,
// and the quick-exit control works from everywhere.

import { analyze } from "./analyze.js";
import { setLocale, resolveLocale, translateDom, t, LOCALE_CHOICES } from "./i18n.js";
import { decideExit } from "./quickexit.js";

const VERSION = "0.2.0";

globalThis.__sweepErrors = [];
window.addEventListener("error", (ev) => __sweepErrors.push(String(ev.message)));
window.addEventListener("unhandledrejection", (ev) => __sweepErrors.push(String(ev.reason)));
document.addEventListener("securitypolicyviolation", (ev) =>
  __sweepErrors.push(`csp: ${ev.violatedDirective} ${ev.blockedURI}`),
);

const $ = (id) => document.getElementById(id);
const native = () => globalThis.SweepNative;

const announce = (msg) => {
  $("sr-live").textContent = msg;
};

let indicators = null;

const app = {
  get state() {
    return {
      screen: ["home", "results"].find((s) => !$(`screen-${s}`).hidden) || "none",
      wrapper: !!native(),
      version: VERSION,
    };
  },
  analyze: (scan) => analyze(scan, indicators),
};
globalThis.__sweepApi = app;

function show(name, { moveFocus = true } = {}) {
  for (const s of ["home", "results"]) $(`screen-${s}`).hidden = s !== name;
  window.scrollTo(0, 0);
  if (moveFocus) $(name === "results" ? "results-title" : "home-title")?.focus();
}

// ----------------------------------------------------------------- cards

function card({ title, chip, chipClass, body, items, listLabel }) {
  const div = document.createElement("div");
  div.className = `check-card${chipClass === "chip-alarm" ? " alarm" : ""}`;
  const h = document.createElement("h2");
  h.textContent = title + " ";
  const c = document.createElement("span");
  c.className = `check-chip ${chipClass}`;
  c.textContent = chip;
  h.append(c);
  const p = document.createElement("p");
  p.textContent = body;
  div.append(h, p);
  if (items && items.length) {
    const det = document.createElement("details");
    const sum = document.createElement("summary");
    sum.textContent = listLabel;
    det.append(sum);
    const ul = document.createElement("ul");
    for (const text of items) {
      const li = document.createElement("li");
      li.textContent = text;
      ul.append(li);
    }
    det.append(ul);
    div.append(det);
  }
  return div;
}

function renderResults(report) {
  const wrap = $("results-cards");
  wrap.textContent = "";

  const m = report.matches.length;
  const review = report.admins.length + report.accessibility.length + report.hidden.length + report.sideloaded.length;
  const summaryText = m
    ? t("One of the checks needs your attention. Read it calmly; there is advice below.")
    : review
      ? t("Nothing matched the known stalkerware list. The lists below need your eyes: only you know what belongs on this phone.")
      : t("These specific checks found nothing. That is what it says, not a guarantee of safety.");

  wrap.append(
    card({
      title: t("Known surveillance apps"),
      chip: m ? t("found: {count}", { count: m }) : t("none found"),
      chipClass: m ? "chip-alarm" : "chip-none",
      body: m
        ? t("Software publicly identified as stalkerware is installed on this phone. Take a breath before doing anything: if a person you know may have put it there, removing it or confronting them can escalate the situation, and some of these apps report their own removal. The advice below comes first.")
        : t("No installed app matched the public stalkerware list, by package name or by signing certificate."),
      items: report.matches.map((x) =>
        t("{label} ({pkg}): matches {family}, by {via}", { label: x.label, pkg: x.pkg, family: x.family, via: x.via === "package" ? t("name") : t("certificate") }),
      ),
      listLabel: t("Show the matches"),
    }),
    card({
      title: t("Device admin apps"),
      chip: String(report.admins.length),
      chipClass: report.admins.length ? "chip-review" : "chip-none",
      body: t("Apps with administrator power can lock the phone, wipe it, and resist removal. Recognize every name here; your workplace or a family setup tool can be legitimate."),
      items: report.admins.map((a) => `${a.label} (${a.pkg})`),
      listLabel: t("Show the device admin list"),
    }),
    card({
      title: t("Accessibility services, turned on"),
      chip: String(report.accessibility.length),
      chipClass: report.accessibility.length ? "chip-review" : "chip-none",
      body: t("A service on this list can read the screen and watch what you type. Screen readers and automation tools belong here; anything you do not recognize deserves a hard look."),
      items: report.accessibility.map((a) => `${a.label} (${a.pkg})`),
      listLabel: t("Show the accessibility services list"),
    }),
    card({
      title: t("Apps without an icon"),
      chip: String(report.hidden.length),
      chipClass: report.hidden.length ? "chip-review" : "chip-none",
      body: t("These installed apps have no launcher icon. Many are harmless helpers; hiding is also what surveillance apps do. Skim the names for anything you never installed."),
      items: report.hidden.map((a) => `${a.label} (${a.pkg})`),
      listLabel: t("Show the apps without an icon"),
    }),
    card({
      title: t("Installed from outside a store"),
      chip: String(report.sideloaded.length),
      chipClass: report.sideloaded.length ? "chip-review" : "chip-none",
      body: t("These apps did not come from a recognized app store. Sideloading is normal for plenty of people; it is also the only way most stalkerware arrives. You should remember installing each of these."),
      items: report.sideloaded.map((a) => `${a.label} (${a.pkg})`),
      listLabel: t("Show the apps installed outside a store"),
    }),
  );
  // The summary text is set only after the screen is unhidden: a role="status"
  // node under [hidden] never announces, no matter what its textContent says.
  show("results");
  $("results-summary").textContent = summaryText;
}

async function runCheckup() {
  const btn = $("btn-run");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = t("Checking…");
  try {
    if (!indicators) throw new Error("indicators unavailable");
    const scan = JSON.parse(native().scanJson());
    if (scan.error) throw new Error(scan.error);
    renderResults(analyze(scan, indicators));
  } catch (err) {
    __sweepErrors.push(`scan: ${err}`);
    toastLine(t("The checkup could not run. Report it: Munzzyy1@proton.me or github.com/munzzyy/sweep/issues."));
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

// ------------------------------------------------------------------ boot

function toastLine(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  announce(msg);
  setTimeout(() => el.classList.remove("show"), 5000);
}

// True whenever the page is running inside a wrapper, Android or iOS. iOS
// injects no SweepNative bridge, so it is told apart by its fixed custom
// scheme instead. Anything that needs the Android bridge itself (the
// checkup) still gates on native() alone; this predicate is only for the
// UI behaviors both wrappers should share, like hiding the website landing.
const bundled = () => !!native() || location.protocol === "sweep:";

function leaveFast() {
  $("results-cards").textContent = "";
  const action = decideExit({
    hasNativeQuickExit: !!native()?.quickExit,
    protocol: location.protocol,
    hasLeaveFastBridge: !!globalThis.webkit?.messageHandlers?.leaveFast,
  });
  switch (action) {
    case "native":
      native().quickExit();
      break;
    case "bridge":
      globalThis.webkit.messageHandlers.leaveFast.postMessage(null);
      break;
    case "fail-loud":
      // A build of the iOS wrapper with no exit bridge must never sit
      // dead and silent: say so, plainly, so the person is not stuck
      // believing they left when they did not.
      toastLine(t("Leave fast could not run in this build. Close the app by hand right now: swipe up from the bottom of the screen and swipe this app away."));
      break;
    case "web-fallback":
      location.replace("https://weather.com");
      break;
  }
}

async function boot() {
  // The exit path depends on nothing and wires first: a broken asset or a
  // failed fetch below must never leave Leave fast dead.
  $("btn-exit").addEventListener("click", leaveFast);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") leaveFast();
  });
  $("btn-back").addEventListener("click", () => {
    $("results-cards").textContent = "";
    show("home");
  });
  $("btn-run").addEventListener("click", runCheckup);
  $("btn-rerun").addEventListener("click", runCheckup);

  let pref = "auto";
  try {
    pref = localStorage.getItem("sweep-locale") || "auto";
  } catch {}
  setLocale(resolveLocale(pref));
  translateDom();
  const select = $("locale-pick");
  for (const { id, label } of LOCALE_CHOICES) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = label;
    select.append(opt);
  }
  select.value = pref;
  select.addEventListener("change", () => {
    try {
      localStorage.setItem("sweep-locale", select.value);
    } catch {}
    setLocale(resolveLocale(select.value));
    translateDom();
  });

  try {
    indicators = await (await fetch("data/indicators.json")).json();
  } catch (err) {
    __sweepErrors.push(`indicators: ${err}`);
    toastLine(
      native()
        ? t("The detection data could not load; the checkup cannot run. Reinstall the app.")
        : t("The detection data could not load; the checkup cannot run. Reload the page."),
    );
  }

  // Both wrappers hide the website landing (Download-the-APK button,
  // browser-install hints); only Android also gets a live checkup, because
  // only Android has SweepNative.
  if (bundled()) {
    for (const node of document.querySelectorAll(".web-only")) node.remove();
  }
  if (native()) {
    $("btn-run").hidden = false;
  } else {
    $("web-note").hidden = false;
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }
  const ver = $("ver");
  if (ver) ver.textContent = `v${VERSION}`;

  show("home", { moveFocus: false });
}

boot();
