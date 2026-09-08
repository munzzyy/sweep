// Boot and flow. Results live only on the screen: no storage, no history,
// and the quick-exit control works from everywhere.

import { analyze, dataAge, selfCheckSummary, unrecognizedAccessibility } from "./analyze.js";
import { setLocale, resolveLocale, translateDom, t, LOCALE_CHOICES } from "./i18n.js";
import { decideExit } from "./quickexit.js";

const VERSION = "0.3.0";

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
let pendingResults = null;

const app = {
  get state() {
    return {
      screen: ["home", "results", "notice"].find((s) => !$(`screen-${s}`).hidden) || "none",
      wrapper: !!native(),
      version: VERSION,
    };
  },
  analyze: (scan) => analyze(scan, indicators),
};
globalThis.__sweepApi = app;

const SCREEN_TITLES = { home: "home-title", results: "results-title", notice: "notice-title" };

function show(name, { moveFocus = true } = {}) {
  for (const s of Object.keys(SCREEN_TITLES)) $(`screen-${s}`).hidden = s !== name;
  if (name === "results") {
    // Restart the CSS-only entrance every run, even on a rerun of the same
    // screen: remove the class, force a reflow, add it back. Content is
    // already fully in the DOM by the time this runs, so nothing here can
    // delay a screen reader from reaching the results.
    const results = $("screen-results");
    results.classList.remove("sweep-reveal");
    void results.offsetWidth;
    results.classList.add("sweep-reveal");
  }
  window.scrollTo(0, 0);
  if (moveFocus) $(SCREEN_TITLES[name])?.focus();
}

// ----------------------------------------------------------------- cards

// Every flagged entry answers the same question: when did this show up,
// and who put it there. Kept as one full sentence per locale rather than
// stitched fragments, so translation reads naturally.
function installClause(a) {
  return t("Installed {date}, from {installer}.", {
    date: a.installedDate || t("an unrecorded date"),
    installer: a.installer || t("an unknown source"),
  });
}

function listItem(a) {
  return `${a.label} (${a.pkg}) ${installClause(a)}`;
}

// A matched package that also shows up in another surface is not just
// named, it is holding real power on this phone right now.
function powersClause(x) {
  const bits = [];
  if (x.powers.admin) bits.push(t("device admin power, which can resist being uninstalled until that access is turned off first"));
  if (x.powers.accessibility) bits.push(t("an enabled accessibility service, which can read the screen"));
  if (x.powers.notifications) bits.push(t("notification access, which can read incoming notifications"));
  if (!bits.length) return "";
  return " " + t("It also holds: {powers}.", { powers: bits.join(", ") });
}

function card({ title, chip, chipClass, body, items, listLabel, note }) {
  const div = document.createElement("div");
  // A card with nothing in it recedes: findings should stand out by
  // contrast against a row of quiet zeros, not get lost among five
  // identical slabs. The heading and full text stay either way.
  const quiet = !items || !items.length;
  div.className = `check-card${chipClass === "chip-alarm" ? " alarm" : ""}${quiet ? " quiet" : ""}`;
  const h = document.createElement("h2");
  h.textContent = title + " ";
  const c = document.createElement("span");
  c.className = `check-chip ${chipClass}`;
  c.textContent = chip;
  h.append(c);
  const p = document.createElement("p");
  p.textContent = body;
  div.append(h, p);
  if (note) {
    const n = document.createElement("p");
    n.className = "check-note";
    n.textContent = note;
    div.append(n);
  }
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

function renderResults(report, selfCheck) {
  const wrap = $("results-cards");
  wrap.textContent = "";

  const surfaces = [report.matches, report.admins, report.accessibility, report.notifications, report.hidden, report.sideloaded];
  const m = report.matches.length;
  const review = report.admins.length + report.accessibility.length + report.notifications.length + report.hidden.length + report.sideloaded.length;
  const summaryText = m
    ? t("Something here needs your attention. Read it calmly; there is advice below.")
    : review
      ? t("Nothing matched the known stalkerware list. The lists below need your eyes: only you know what belongs on this phone.")
      : t("These specific checks found nothing. That is what it says, not a guarantee of safety.");
  const flaggedSurfaces = surfaces.filter((s) => s.length).length;
  const countsText = t("{flagged} of {total} checks have something to look at.", { flagged: flaggedSurfaces, total: surfaces.length });

  const age = dataAge(indicators);
  const listNote = age.fetched
    ? age.stale
      ? t("This list is dated {date} and has not been refreshed since. Treat a clean result here a little more cautiously.", { date: age.fetched })
      : t("This list is dated {date}.", { date: age.fetched })
    : null;

  wrap.append(
    card({
      title: t("Known surveillance apps"),
      chip: m ? t("found: {count}", { count: m }) : t("none found"),
      chipClass: m ? "chip-alarm" : "chip-none",
      body: m
        ? t("Software publicly identified as stalkerware is installed on this phone. Take a breath before doing anything: if a person you know may have put it there, removing it or confronting them can escalate the situation, and some of these apps report their own removal. The advice below comes first.")
        : t("No installed app matched the public stalkerware list, by package name or by signing certificate."),
      note: listNote,
      items: report.matches.map((x) =>
        t("{label} ({pkg}): matches {family}, by {via}.", { label: x.label, pkg: x.pkg, family: x.family, via: x.via === "package" ? t("name") : t("certificate") }) +
          ` ${installClause(x)}${powersClause(x)}`,
      ),
      listLabel: t("Show the matches"),
    }),
    card({
      title: t("Device admin apps"),
      chip: String(report.admins.length),
      chipClass: report.admins.length ? "chip-review" : "chip-none",
      body: t("Apps with administrator power can lock the phone, wipe it, and resist removal. Recognize every name here; your workplace or a family setup tool can be legitimate."),
      items: report.admins.map(listItem),
      listLabel: t("Show the device admin list"),
    }),
    card({
      title: t("Accessibility services, turned on"),
      chip: String(report.accessibility.length),
      chipClass: report.accessibility.length ? "chip-review" : "chip-none",
      body: t("A service on this list can read the screen and watch what you type. Screen readers and automation tools belong here; anything you do not recognize deserves a hard look."),
      note: t("This list only covers accessibility services. Screen mirroring, remote support tools, and someone simply looking at the screen leave nothing here to find."),
      items: report.accessibility.map(listItem),
      listLabel: t("Show the accessibility services list"),
    }),
    card({
      title: t("Apps that can read notifications"),
      chip: String(report.notifications.length),
      chipClass: report.notifications.length ? "chip-review" : "chip-none",
      body: t("Apps on this list see the content of every notification that arrives on this phone. Smartwatches, notification-mirroring apps, and Do Not Disturb rules use this legitimately; anything you do not recognize deserves a hard look."),
      items: report.notifications.map(listItem),
      listLabel: t("Show the notification-access list"),
    }),
    card({
      title: t("Apps without an icon"),
      chip: String(report.hidden.length),
      chipClass: report.hidden.length ? "chip-review" : "chip-none",
      body: t("These installed apps have no launcher icon. Many are harmless helpers; hiding is also what surveillance apps do. Skim the names for anything you never installed."),
      items: report.hidden.map(listItem),
      listLabel: t("Show the apps without an icon"),
    }),
    card({
      title: t("Installed from outside a store"),
      chip: String(report.sideloaded.length),
      chipClass: report.sideloaded.length ? "chip-review" : "chip-none",
      body: t("These apps did not come from a recognized app store. Sideloading is normal for plenty of people; it is also the only way most stalkerware arrives. You should remember installing each of these."),
      items: report.sideloaded.map(listItem),
      listLabel: t("Show the apps installed outside a store"),
    }),
  );

  if (selfCheck) {
    wrap.append(
      card({
        title: t("Check Sweep itself"),
        chip: selfCheck.hasInternet ? t("has internet") : t("no internet"),
        chipClass: selfCheck.hasInternet ? "chip-alarm" : "chip-none",
        body: selfCheck.hasInternet
          ? t("Sweep's own permissions include internet access, which contradicts what this app tells you. Do not trust this build; get Sweep from the official release page instead.")
          : t("Sweep just asked Android for its own permission list, the same way it asked for yours: no internet access is requested, so nothing this checkup sees can leave this phone. That is not a claim, it is what the phone just reported."),
        items: selfCheck.permissions,
        listLabel: t("Show Sweep's own permissions"),
      }),
    );
  }

  // The banner's color and the magnifier both come from the same verdict
  // math as the summary line, so they never disagree with the words.
  const banner = $("results-banner");
  banner.className = `verdict-banner ${m ? "banner-alarm" : review ? "banner-review" : "banner-ok"}`;

  // The summary text is set only after the screen is unhidden: a role="status"
  // node under [hidden] never announces, no matter what its textContent says.
  show("results");
  $("results-summary").textContent = summaryText;
  $("results-counts").textContent = countsText;
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
    // Self-check is a nice-to-have amplifier, not core to the checkup: a
    // build without it (or a bridge that errors on it) still shows results.
    let selfCheck = null;
    try {
      if (native().selfCheck) {
        const raw = JSON.parse(native().selfCheck());
        if (!raw.error) selfCheck = selfCheckSummary(raw);
      }
    } catch (err) {
      __sweepErrors.push(`selfCheck: ${err}`);
    }
    const report = analyze(scan, indicators);
    if (unrecognizedAccessibility(report.accessibility).length) {
      pendingResults = { report, selfCheck };
      show("notice");
    } else {
      renderResults(report, selfCheck);
    }
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
  pendingResults = null;
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
      // Paint over the screen before the navigation even starts: a full
      // page load elsewhere would otherwise leave the results screen
      // visible on someone else's network for the whole time it takes.
      $("leave-blackout").hidden = false;
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
  $("btn-a11y-back").addEventListener("click", () => {
    pendingResults = null;
    show("home");
  });
  $("btn-a11y-continue").addEventListener("click", () => {
    if (!pendingResults) return;
    const { report, selfCheck } = pendingResults;
    pendingResults = null;
    renderResults(report, selfCheck);
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
