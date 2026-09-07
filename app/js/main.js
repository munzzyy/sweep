// Boot and flow. Results live only on the screen: no storage, no history,
// and the quick-exit control works from everywhere.

import { analyze } from "./analyze.js";
import { setLocale, resolveLocale, translateDom, t, LOCALE_CHOICES } from "./i18n.js";

const VERSION = "0.1.0";

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

function show(name) {
  for (const s of ["home", "results"]) $(`screen-${s}`).hidden = s !== name;
  window.scrollTo(0, 0);
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
  $("results-summary").textContent = m
    ? t("One of the checks needs your attention. Read it calmly; there is advice below.")
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
      listLabel: t("Show the list"),
    }),
    card({
      title: t("Accessibility services, turned on"),
      chip: String(report.accessibility.length),
      chipClass: report.accessibility.length ? "chip-review" : "chip-none",
      body: t("A service on this list can read the screen and watch what you type. Screen readers and automation tools belong here; anything you do not recognize deserves a hard look."),
      items: report.accessibility.map((a) => `${a.label} (${a.pkg})`),
      listLabel: t("Show the list"),
    }),
    card({
      title: t("Apps without an icon"),
      chip: String(report.hidden.length),
      chipClass: "chip-review",
      body: t("These installed apps have no launcher icon. Many are harmless helpers; hiding is also what surveillance apps do. Skim the names for anything you never installed."),
      items: report.hidden.map((a) => `${a.label} (${a.pkg})`),
      listLabel: t("Show the list"),
    }),
    card({
      title: t("Installed from outside a store"),
      chip: String(report.sideloaded.length),
      chipClass: "chip-review",
      body: t("These apps did not come from a recognized app store. Sideloading is normal for plenty of people; it is also the only way most stalkerware arrives. You should remember installing each of these."),
      items: report.sideloaded.map((a) => `${a.label} (${a.pkg})`),
      listLabel: t("Show the list"),
    }),
  );
  announce($("results-summary").textContent);
  show("results");
}

async function runCheckup() {
  const btn = $("btn-run");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = t("Checking…");
  try {
    const scan = JSON.parse(native().scanJson());
    renderResults(analyze(scan, indicators));
  } catch (err) {
    __sweepErrors.push(`scan: ${err}`);
    announce(t("The checkup could not run. Please report this."));
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

// ------------------------------------------------------------------ boot

async function boot() {
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

  indicators = await (await fetch("data/indicators.json")).json();

  if (native()) {
    for (const node of document.querySelectorAll(".web-only")) node.remove();
    $("btn-run").hidden = false;
  } else {
    $("web-note").hidden = false;
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }
  const ver = $("ver");
  if (ver) ver.textContent = `v${VERSION}`;

  $("btn-run").addEventListener("click", runCheckup);
  $("btn-rerun").addEventListener("click", runCheckup);
  $("btn-back").addEventListener("click", () => {
    $("results-cards").textContent = "";
    show("home");
  });
  $("btn-exit").addEventListener("click", () => {
    // Results off the screen first, then out. On the web the replace also
    // buries this page in history.
    $("results-cards").textContent = "";
    if (native()?.quickExit) native().quickExit();
    else location.replace("https://weather.com");
  });

  show("home");
}

boot();
