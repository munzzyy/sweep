// Boot and flow. Results live only on the screen: no storage, no history,
// and the quick-exit control works from everywhere.

import { analyze, dataAge, selfCheckSummary, unrecognizedAccessibility, accessibilityPhrases, POLICY_PHRASES } from "./analyze.js";
import { setLocale, resolveLocale, translateDom, t, LOCALE_CHOICES } from "./i18n.js";
import { decideExit } from "./quickexit.js";

const VERSION = "0.5.0";

globalThis.__sweepErrors = [];
window.addEventListener("error", (ev) => __sweepErrors.push(String(ev.message)));
window.addEventListener("unhandledrejection", (ev) => __sweepErrors.push(String(ev.reason)));
document.addEventListener("securitypolicyviolation", (ev) =>
  __sweepErrors.push(`csp: ${ev.violatedDirective} ${ev.blockedURI}`),
);

const $ = (id) => document.getElementById(id);
const native = () => globalThis.SweepNative;

// msg marks a string for the extractor when the t() call sits elsewhere.
const msg = (s) => s;

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

const SOURCE_LABELS = {
  store: msg("an app store"),
  local_file: msg("a local file"),
  downloaded_file: msg("a downloaded file"),
  other: msg("another source"),
};

function provenanceLine(f) {
  const p = f.provenance || f;
  let line = installClause(p);
  if (p.updatedDate && p.updatedDate !== p.installedDate) {
    line += " " + t("Last updated {date}.", { date: p.updatedDate });
  }
  if (p.initiatingPkg && p.initiatingPkg !== p.installer) {
    line += " " + t("The install was started by {pkg}.", { pkg: p.initiatingPkg });
  }
  if (p.packageSource && SOURCE_LABELS[p.packageSource]) {
    line += " " + t("Android recorded the install as coming from {type}.", { type: t(SOURCE_LABELS[p.packageSource]) });
  }
  return line;
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

function card({ title, chip, chipClass, body, items, listLabel, note, children }) {
  const div = document.createElement("div");
  // A card with nothing in it recedes: findings should stand out by
  // contrast against a row of quiet zeros, not get lost among five
  // identical slabs. The heading and full text stay either way.
  const quiet = (!items || !items.length) && (!children || !children.length);
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
  for (const child of children || []) div.append(child);
  return div;
}

function headlineText(f) {
  const vars = { ...(f.headlineVars || {}) };
  if (f.accessPhrases) vars.access = f.accessPhrases.map((p) => t(p)).join(", ");
  if (f.sensorPhrases) vars.sensors = f.sensorPhrases.map((p) => t(p)).join(", ");
  return t(f.headline, vars);
}

function pathNote(path) {
  return t("Check it yourself (menu names vary by phone): {path}", { path: t(path) });
}

const SAFETY_NOTE = msg("Careful before acting: a person who installed a monitoring app can sometimes tell when it is found or removed. Plan your safety first; techsafety.org has guides written for exactly this.");
const APPS_PATH = msg("Settings > Apps > All apps");

// One expandable card per finding. Every sentence on it comes from the
// finding object the analyzer built; nothing is invented at render time.
function findingCard(f, { alarm = false, dual = false, safetyNote = false, settingsPath = null } = {}) {
  const div = document.createElement("div");
  div.className = `finding${alarm ? " finding-alarm" : ""}${dual ? " finding-dual" : ""}`;
  const h = document.createElement("h3");
  h.textContent = `${f.label} (${f.pkg})`;
  const head = document.createElement("p");
  head.className = "finding-headline";
  head.textContent = headlineText(f);
  div.append(h, head);
  if (f.canDo && f.canDo.length) {
    const p = document.createElement("p");
    p.textContent = t("On this phone right now, Android reports this app can: {powers}.", {
      powers: f.canDo.map((x) => t(x)).join("; "),
    });
    div.append(p);
  }
  const powers = f.powers ? powersClause(f) : "";
  if (powers) {
    const p = document.createElement("p");
    p.textContent = powers.trim();
    div.append(p);
  }
  const prov = document.createElement("p");
  prov.className = "finding-prov";
  prov.textContent = provenanceLine(f);
  div.append(prov);
  if (f.evidence && f.evidence.length) {
    const det = document.createElement("details");
    const sum = document.createElement("summary");
    sum.textContent = t("Show the raw evidence");
    det.append(sum);
    const pre = document.createElement("pre");
    pre.className = "evidence";
    const lines = f.evidence.map((e) => `${t(e.label)}: ${e.value}`);
    lines.push(`${t("rule fired")}: ${f.whyFlagged}`);
    pre.textContent = lines.join("\n");
    det.append(pre);
    div.append(det);
  }
  if (settingsPath) {
    const p = document.createElement("p");
    p.className = "check-note";
    p.textContent = t("Check it yourself (menu names vary by phone): {path}", { path: t(settingsPath) });
    div.append(p);
  }
  if (safetyNote) {
    const p = document.createElement("p");
    p.className = "check-note finding-safety";
    p.textContent = t(SAFETY_NOTE);
    div.append(p);
  }
  return div;
}

function surfacesCard(header) {
  const el = card({
    title: t("What this checkup could actually see"),
    chip: t("{checked} of {total}", { checked: header.surfacesChecked, total: header.surfacesTotal }),
    chipClass: "chip-info",
    body: t("This checkup read {checked} of the {total} surfaces it knows about on this phone. What it could not read is listed here with the reason; an unreadable surface is an unknown, never good news or bad news.", {
      checked: header.surfacesChecked,
      total: header.surfacesTotal,
    }),
    items: header.couldNotCheck.map((c) => `${t(c.name)}: ${t(c.reason)}`),
    listLabel: t("Show what could not be checked ({count})", { count: header.couldNotCheck.length }),
  });
  el.classList.add("surfaces-card");
  el.classList.remove("quiet");
  return el;
}

function adminItem(a) {
  let text = listItem(a);
  if (a.policies === null) {
    text += " " + t("Could not read this admin's declared powers.");
  } else if (a.policies) {
    const phrases = Object.keys(POLICY_PHRASES).filter((k) => a.policies[k] === true);
    if (phrases.length) {
      text += " " + t("It declares the power to: {powers}.", { powers: phrases.map((k) => t(POLICY_PHRASES[k])).join(", ") });
    }
  }
  return text;
}

function accessibilityItem(a) {
  let text = listItem(a);
  if (a.detail) {
    const phrases = accessibilityPhrases(a.detail);
    if (phrases.length) {
      text += " " + t("Android says this service can: {things}.", { things: phrases.map((p) => t(p)).join(", ") });
    }
    if (a.detail.packageScope === null || a.detail.packageScope === undefined) {
      text += " " + t("It applies to every app on this phone.");
    } else {
      text += " " + t("It applies only to: {pkgs}.", { pkgs: [].concat(a.detail.packageScope).join(", ") });
    }
  }
  return text;
}

// Dual-use findings render through this function and nowhere else, so they
// can never pick up the stalkerware cards' language by accident.
function dualUseCard(dualUse) {
  return card({
    title: t("Monitoring apps sold openly"),
    chip: String(dualUse.length),
    chipClass: dualUse.length ? "chip-review" : "chip-none",
    body: t("Apps in this section are sold openly for keeping an eye on someone's phone, usually marketed to parents or partners. They are not on the stalkerware list this checkup uses, and one being installed does not by itself mean misuse; the question only you can answer is whether you knew it was here."),
    children: dualUse.map((x) => findingCard(x, { dual: true, safetyNote: true, settingsPath: APPS_PATH })),
  });
}

function imeItem(i) {
  let text = `${i.label} (${i.pkg})`;
  if (i.isDefault === true) text += " " + t("This is the keyboard in use right now.");
  if (i.system === false) text += ` ${installClause(i)}`;
  return text;
}

function vpnItem(v) {
  let text = listItem(v);
  if (v.hidden === true) text += " " + t("It has no launcher icon.");
  if (v.sideloadedInstall === true) text += " " + t("It did not come from a recognized store.");
  return text;
}

function roleItems(roles) {
  const items = [];
  if (roles.sms) {
    let text = t("Text messages are handled by {label} ({pkg}).", { label: roles.sms.label, pkg: roles.sms.pkg });
    if (roles.sms.system === false) text += " " + t("That app is not part of the phone's system image; every text, including security codes, goes through it.");
    items.push(text);
  }
  if (roles.dialer) {
    let text = t("Calls are handled by {label} ({pkg}).", { label: roles.dialer.label, pkg: roles.dialer.pkg });
    if (roles.dialer.system === false) text += " " + t("That app is not part of the phone's system image.");
    items.push(text);
  }
  if (roles.assistant) {
    items.push(t("The assistant role is held by {value}.", { value: roles.assistant }));
  }
  return items;
}

function ownerItems(owners) {
  if (!owners) return [];
  const items = [];
  if (owners.deviceOwner) {
    items.push(
      t("{label} ({pkg}) is the device owner, the strongest control Android grants; it can set policy for this whole phone. Work phones are commonly set up this way.", {
        label: owners.deviceOwner.label,
        pkg: owners.deviceOwner.pkg,
      }),
    );
  }
  for (const p of owners.profileOwners) {
    items.push(t("{label} ({pkg}) manages a profile on this phone.", { label: p.label, pkg: p.pkg }));
  }
  if (owners.workProfile === true) {
    items.push(t("A work profile exists on this phone. Its manager can see and control the work side; this checkup runs on the personal side and cannot see into the work side."));
  }
  return items;
}

function globalItems(globals) {
  if (!globals) return [];
  const items = [];
  if (globals.adbEnabled === true) items.push(t("USB debugging is turned on. A computer this phone trusts can install apps and change settings over a cable."));
  if (globals.adbWifiEnabled === true) items.push(t("Wireless debugging is turned on, which allows the same control over Wi-Fi."));
  if (globals.developmentSettingsEnabled === true) items.push(t("Developer options are turned on."));
  return items;
}

function renderResults(report, selfCheck) {
  const wrap = $("results-cards");
  wrap.textContent = "";

  const nonSystemImes = report.imes.filter((i) => i.system === false);
  const vpnFlagged = report.vpnApps.filter((v) => v.hidden === true || v.sideloadedInstall === true);
  const roleAttention = [report.roles.sms, report.roles.dialer].filter((r) => r && r.system === false);
  const ownerAttention = report.owners
    ? (report.owners.deviceOwner ? 1 : 0) + report.owners.profileOwners.length + (report.owners.workProfile ? 1 : 0)
    : 0;
  const globalAttention = report.globals
    ? ["adbEnabled", "developmentSettingsEnabled", "adbWifiEnabled"].filter((k) => report.globals[k] === true).length
    : 0;
  const patternsCount = report.disguised.length + report.watching.length + report.bootFgs.length;
  const attention = [
    report.matches.length,
    report.dualUse.length,
    patternsCount,
    report.admins.length,
    report.accessibility.length,
    report.notifications.length,
    nonSystemImes.length,
    report.userCerts.length,
    vpnFlagged.length + (report.alwaysOnVpn ? 1 : 0),
    roleAttention.length,
    ownerAttention,
    report.hidden.length,
    report.sideloaded.length,
    globalAttention,
  ];
  const m = report.matches.length;
  const review = attention.slice(1).reduce((sum, n) => sum + n, 0);
  const summaryText = m
    ? t("Something here needs your attention. Read it calmly; there is advice below.")
    : review
      ? t("Nothing matched the known stalkerware list. The lists below need your eyes: only you know what belongs on this phone.")
      : t("These specific checks found nothing. That is what it says, not a guarantee of safety.");
  const flaggedSurfaces = attention.filter((n) => n > 0).length;
  const countsText = t("{flagged} of {total} checks have something to look at.", { flagged: flaggedSurfaces, total: attention.length });

  const age = dataAge(indicators);
  const listNote = age.fetched
    ? age.stale
      ? t("This list is dated {date} and has not been refreshed since. Treat a no-matches result here a little more cautiously.", { date: age.fetched })
      : t("This list is dated {date}.", { date: age.fetched })
    : null;

  let a11yNote = t("This list only covers accessibility services. Screen mirroring, remote support tools, and someone simply looking at the screen leave nothing here to find.");
  if (report.accessibilityCrossCheck && report.accessibilityCrossCheck.consistent === false) {
    a11yNote += " " + t("Two OS records of enabled accessibility services disagree on this phone; both are shown, and the mismatch itself deserves attention.");
  }
  a11yNote += " " + pathNote("Settings > Accessibility");

  wrap.append(
    surfacesCard(report.header),
    card({
      title: t("Known surveillance apps"),
      chip: m ? t("found: {count}", { count: m }) : t("none found"),
      chipClass: m ? "chip-alarm" : "chip-none",
      body: m
        ? t("Software publicly identified as stalkerware is installed on this phone. Take a breath before doing anything: if a person you know may have put it there, removing it or confronting them can escalate the situation, and some of these apps report their own removal. The advice below comes first.")
        : t("No installed app matched the public stalkerware list, by package name or by signing certificate."),
      note: listNote,
      children: report.matches.map((x) =>
        findingCard(x, { alarm: true, safetyNote: true, settingsPath: APPS_PATH }),
      ),
    }),
    dualUseCard(report.dualUse),
    card({
      title: t("Patterns worth a second look"),
      chip: String(patternsCount),
      chipClass: patternsCount ? "chip-review" : "chip-none",
      body: t("Nothing in this section matched any list. These are combinations of facts that surveillance tools tend to use and that some legitimate tools share; each card says exactly which pattern fired and why."),
      note: t("The battery exemption read here is Android's own list; some phone brands keep a separate allowlist this scan cannot see, so not exempt here proves nothing either way."),
      children: [
        ...report.disguised.map((x) => findingCard(x, { settingsPath: APPS_PATH })),
        ...report.watching.map((x) => findingCard(x, { settingsPath: APPS_PATH })),
        ...report.bootFgs.map((x) => findingCard(x, { settingsPath: APPS_PATH })),
      ],
    }),
    card({
      title: t("Device admin apps"),
      chip: String(report.admins.length),
      chipClass: report.admins.length ? "chip-review" : "chip-none",
      body: t("Apps with administrator power can lock the phone, wipe it, and resist removal. Recognize every name here; your workplace or a family setup tool can be legitimate."),
      note: pathNote("Settings > Security > Device admin apps"),
      items: report.admins.map(adminItem),
      listLabel: t("Show the device admin list"),
    }),
    card({
      title: t("Accessibility services, turned on"),
      chip: String(report.accessibility.length),
      chipClass: report.accessibility.length ? "chip-review" : "chip-none",
      body: t("A service on this list can read the screen and watch what you type. Screen readers and automation tools belong here; anything you do not recognize deserves a hard look."),
      note: a11yNote,
      items: report.accessibility.map(accessibilityItem),
      listLabel: t("Show the accessibility services list"),
    }),
    card({
      title: t("Apps that can read notifications"),
      chip: String(report.notifications.length),
      chipClass: report.notifications.length ? "chip-review" : "chip-none",
      body: t("Apps on this list see the content of every notification that arrives on this phone. Smartwatches, notification-mirroring apps, and Do Not Disturb rules use this legitimately; anything you do not recognize deserves a hard look."),
      note: pathNote("Settings > Apps > Special app access > Notification access"),
      items: report.notifications.map(listItem),
      listLabel: t("Show the notification-access list"),
    }),
    card({
      title: t("Keyboards in use"),
      chip: String(report.imes.length),
      chipClass: nonSystemImes.length ? "chip-review" : "chip-none",
      body: t("A keyboard sees everything typed with it, in every app: messages, searches, passwords. The phone's own keyboard belongs here; a keyboard you do not remember choosing deserves a hard look."),
      note: pathNote("Settings > System > Keyboard"),
      items: report.imes.map(imeItem),
      listLabel: t("Show the enabled keyboards"),
    }),
    card({
      title: t("Certificate authorities added by a person"),
      chip: String(report.userCerts.length),
      chipClass: report.userCerts.length ? "chip-review" : "chip-none",
      body: t("A certificate authority someone added lets whoever controls it inspect this phone's secure traffic in some setups. Workplaces add these for device management; so do some filtering and monitoring tools. A work profile keeps a separate list this scan cannot see."),
      note: pathNote("Settings > Security > Encryption and credentials > Trusted credentials"),
      items: report.userCerts.map((c) =>
        t("Trusted: {subject}. Issued by {issuer}. Valid {from} to {to}.", { subject: c.subject, issuer: c.issuer, from: c.notBefore, to: c.notAfter }),
      ),
      listLabel: t("Show the added certificate authorities"),
    }),
    card({
      title: t("Apps that can run a VPN"),
      chip: String(report.vpnApps.length),
      chipClass: vpnFlagged.length || report.alwaysOnVpn ? "chip-review" : "chip-none",
      body: t("An app that runs a VPN can route this phone's traffic through itself. A VPN you chose is normal; one that is hidden or arrived from outside a store deserves a hard look."),
      note: (report.alwaysOnVpn ? t("Android reports an always-on VPN is set: {pkg}.", { pkg: report.alwaysOnVpn }) + " " : "") + pathNote("Settings > Network and internet > VPN"),
      items: report.vpnApps.map(vpnItem),
      listLabel: t("Show the VPN-capable apps"),
    }),
    card({
      title: t("Default app roles"),
      chip: String(roleAttention.length),
      chipClass: roleAttention.length ? "chip-review" : "chip-none",
      body: t("The default SMS app sees every text message, including security codes, and the default dialer handles every call. These should be apps you recognize and chose."),
      note: pathNote("Settings > Apps > Default apps"),
      items: roleItems(report.roles),
      listLabel: t("Show the role holders"),
    }),
    card({
      title: t("Who controls this phone"),
      chip: String(ownerAttention),
      chipClass: ownerAttention ? "chip-review" : "chip-none",
      body: t("A device owner or profile owner can set policy, install and remove apps, and read device state on the side it manages. Employers use this legitimately every day; on a personal phone it deserves a hard look."),
      note: pathNote("Settings > Security"),
      items: ownerItems(report.owners),
      listLabel: t("Show the management facts"),
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
    card({
      title: t("Debugging switches"),
      chip: String(globalAttention),
      chipClass: globalAttention ? "chip-review" : "chip-none",
      body: t("Debugging switches let a trusted computer install apps and change settings. Developers leave these on for themselves all the time; if nobody who uses this phone is one, ask why they are on."),
      note: pathNote("Settings > System > Developer options"),
      items: globalItems(report.globals),
      listLabel: t("Show the debugging switches"),
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
