// The whole judgment layer, kept pure so it runs under node's test runner.
// A scan (what the bridge collected) plus the indicator data becomes a
// report of findings per check. No verdict words live here; severity of
// LANGUAGE is the UI's job, and the UI never says "clean".

// msg marks a template for the string extractor; translation happens in the UI.
const msg = (s) => s;

// Tier wording is a safety surface: stalkerware templates live in this map
// and dual-use findings are built by a separate function that cannot reach it.
const TIER_HEADLINES = {
  1: msg("This app is signed with a certificate that appears in the public stalkerware indicator list, under the family {family}."),
  2: msg("This app's package name and its signing certificate both match the stalkerware family {family} on the public indicator list."),
  3: msg("This app's package name matches one documented for the stalkerware family {family}. A package name alone can be reused by an unrelated app, and the signing certificate here did not also match, so hold that doubt while you read this."),
  4: msg("This app's package name starts with a prefix documented for the stalkerware family {family}. A name prefix is weak evidence on its own; this is shown because the app also holds real power on this phone."),
};

const DUAL_USE_HEADLINE = msg("{label} is commonly marketed for parental or partner monitoring. It does not appear on the stalkerware-indicator list checked here, and its presence alone does not mean misuse.");

const DISGUISE_HEADLINE = msg("This app names itself like a system app ({prefix}) but Android does not record it as part of the system and it was not installed by the Play Store; an app updated through a manufacturer's own store can look the same way, so treat this as something to check, not proof.");

const WATCHING_HEADLINE = msg("This app arrived from outside any store this scan recognizes, has no icon in the launcher, is set up to keep running, and can {access}; some device management and backup tools legitimately look the same, so the question is whether you know what this app is.");

const BOOT_FGS_HEADLINE = msg("This app starts when the phone boots and declares a background service typed for {sensors}; media, navigation, and assistant apps legitimately do the same, so check that you recognize it.");

export const SENSOR_LABELS = {
  microphone: msg("the microphone"),
  camera: msg("the camera"),
  location: msg("location"),
};

export const GRANT_PHRASES = {
  "android.permission.RECORD_AUDIO": msg("use the microphone"),
  "android.permission.CAMERA": msg("use the camera"),
  "android.permission.ACCESS_FINE_LOCATION": msg("read the phone's precise location"),
  "android.permission.ACCESS_COARSE_LOCATION": msg("read the phone's approximate location"),
  "android.permission.ACCESS_BACKGROUND_LOCATION": msg("read the location while in the background"),
  "android.permission.READ_SMS": msg("read text messages"),
  "android.permission.RECEIVE_SMS": msg("see text messages as they arrive"),
  "android.permission.READ_CALL_LOG": msg("read the call history"),
  "android.permission.PROCESS_OUTGOING_CALLS": msg("see outgoing calls"),
  "android.permission.READ_CONTACTS": msg("read the contact list"),
  "android.permission.READ_PHONE_STATE": msg("read the phone's identity and call state"),
  "android.permission.READ_CALENDAR": msg("read the calendar"),
  "android.permission.POST_NOTIFICATIONS": msg("post notifications"),
};

export const DECLARED_PHRASES = {
  "android.permission.PACKAGE_USAGE_STATS": msg("ask to track which apps get used; whether that was granted could not be checked here"),
  "android.permission.SYSTEM_ALERT_WINDOW": msg("ask to draw over other apps; whether that was granted could not be checked here"),
  "android.permission.REQUEST_INSTALL_PACKAGES": msg("ask to install other apps; whether that was granted could not be checked here"),
  "android.permission.MANAGE_EXTERNAL_STORAGE": msg("ask for access to all files; whether that was granted could not be checked here"),
  "android.permission.RECEIVE_BOOT_COMPLETED": msg("start itself when the phone boots"),
};

export const POLICY_PHRASES = {
  wipeData: msg("erase this phone remotely"),
  forceLock: msg("lock the screen at will"),
  resetPassword: msg("change the unlock password"),
  watchLogin: msg("watch failed unlock attempts"),
  disableCamera: msg("turn the camera off phone-wide"),
};

export const A11Y_PHRASES = {
  retrieveWindowContent: msg("read what is on the screen"),
  performGestures: msg("perform taps and swipes by itself"),
  filterKeyEvents: msg("watch keys as they are pressed"),
  controlMagnification: msg("control screen magnification"),
  takeScreenshots: msg("take screenshots"),
  watchesTextInput: msg("see text as it is typed"),
};

export const FGS_PHRASES = {
  location: msg("run a long-lived background service typed for location"),
  camera: msg("run a long-lived background service typed for the camera"),
  microphone: msg("run a long-lived background service typed for the microphone"),
  mediaProjection: msg("run a long-lived background service typed for screen capture"),
  phoneCall: msg("run a long-lived background service typed for calls"),
};

const BOOT_PHRASE = msg("start itself when the phone boots");
const BATTERY_PHRASE = msg("keep running with battery optimization switched off for it");
const A11Y_ENABLED_PHRASE = msg("read the screen through an enabled accessibility service");
const NOTIF_ENABLED_PHRASE = msg("read incoming notifications");
const ADMIN_ENABLED_PHRASE = msg("act as a device administrator");

// Every surface this app knows how to check, whether or not a given scan
// reported it: the honesty header is computed against this list so an old
// bridge or a broken surface reads as could-not-check, never as silence.
export const SURFACES = [
  { id: "installed_apps", name: msg("the installed app list") },
  { id: "device_admins", name: msg("active device admin apps") },
  { id: "admin_policies", name: msg("the powers each device admin declares") },
  { id: "accessibility_settings", name: msg("enabled accessibility services, from the settings record") },
  { id: "accessibility_detail", name: msg("what each enabled accessibility service can do") },
  { id: "notification_listeners", name: msg("apps with notification access") },
  { id: "permission_grants", name: msg("which sensitive permissions each app actually holds") },
  { id: "app_manifests", name: msg("declared background services and boot receivers") },
  { id: "install_sources", name: msg("where each app was installed from") },
  { id: "input_methods", name: msg("enabled keyboards") },
  { id: "default_ime", name: msg("which keyboard is active") },
  { id: "user_certificates", name: msg("certificate authorities a person added to this phone") },
  { id: "sms_role", name: msg("which app handles text messages") },
  { id: "dialer_role", name: msg("which app handles calls") },
  { id: "assistant_role", name: msg("which app acts as the assistant") },
  { id: "battery_exemptions", name: msg("battery optimization exemptions") },
  { id: "owners", name: msg("device owner, profile owner, and work profile") },
  { id: "global_settings", name: msg("USB debugging and developer settings") },
  { id: "vpn_services", name: msg("apps that can run a VPN") },
  { id: "always_on_vpn", name: msg("the always-on VPN setting") },
  { id: "usage_access_grants", name: msg("which apps were granted usage access") },
  { id: "overlay_grants", name: msg("which apps were granted draw-over-other-apps") },
  { id: "install_unknown_grants", name: msg("which apps were granted install-unknown-apps") },
];

const PRIVILEGED_SURFACES = new Set(["usage_access_grants", "overlay_grants", "install_unknown_grants"]);
const PRIVILEGED_REASON = msg("Android only exposes this to privileged system apps");
const UNREPORTED_REASON = msg("this scan did not report it; the app that ran the scan is older than this check");

export function surfaceReport(scan) {
  const reported = new Map((scan.surfaces || []).map((s) => [s.surface, s]));
  if (!Array.isArray(scan.surfaces)) {
    if (Array.isArray(scan.apps)) reported.set("installed_apps", { status: "ok" });
    if (Array.isArray(scan.admins)) reported.set("device_admins", { status: "ok" });
    if (Array.isArray(scan.accessibility)) reported.set("accessibility_settings", { status: "ok" });
    if (Array.isArray(scan.notifications)) reported.set("notification_listeners", { status: "ok" });
  }
  const couldNotCheck = [];
  let surfacesChecked = 0;
  for (const s of SURFACES) {
    if (PRIVILEGED_SURFACES.has(s.id)) {
      couldNotCheck.push({ surface: s.id, name: s.name, reason: PRIVILEGED_REASON });
      continue;
    }
    const r = reported.get(s.id);
    if (r?.status === "ok") {
      surfacesChecked += 1;
      continue;
    }
    couldNotCheck.push({ surface: s.id, name: s.name, reason: r?.reason || UNREPORTED_REASON });
  }
  return { surfacesChecked, surfacesTotal: SURFACES.length, couldNotCheck };
}

// Indicator packages may end with * for families that randomize suffixes.
function buildIndex(families) {
  const exact = new Map();
  const prefixes = [];
  const certs = new Map();
  for (const family of families) {
    for (const pkg of family.packages || []) {
      if (pkg.endsWith("*")) prefixes.push({ prefix: pkg.slice(0, -1), family });
      else exact.set(pkg, family);
    }
    for (const cert of family.certificates || []) {
      certs.set(cert.toUpperCase(), family);
    }
  }
  return { exact, prefixes, certs };
}

function familyFields(family) {
  return {
    family: family.name,
    familyType: family.type || "stalkerware",
    aliases: family.aliases || [],
    certOrganizations: family.certificateOrganizations || [],
  };
}

export function matchKnown(apps, indicators) {
  const { exact, prefixes, certs } = buildIndex(indicators.apps || []);
  const matches = [];
  for (const app of apps) {
    const pkgFamily = exact.get(app.pkg) || null;
    const certHit = (app.certs || [])
      .map((c) => ({ cert: c.toUpperCase(), family: certs.get(c.toUpperCase()) }))
      .find((h) => h.family);
    const prefixFamily = pkgFamily ? null : prefixes.find((p) => app.pkg.startsWith(p.prefix))?.family || null;
    let tier;
    let family;
    let via;
    if (pkgFamily && certHit && certHit.family.name === pkgFamily.name) {
      tier = 2;
      family = pkgFamily;
      via = "package+certificate";
    } else if (certHit) {
      tier = 1;
      family = certHit.family;
      via = "certificate";
    } else if (pkgFamily) {
      tier = 3;
      family = pkgFamily;
      via = "package";
    } else if (prefixFamily) {
      tier = 4;
      family = prefixFamily;
      via = "package";
    } else {
      continue;
    }
    matches.push({
      pkg: app.pkg,
      label: app.label,
      via,
      tier,
      matchedCert: via === "package" ? null : certHit.cert,
      installedDate: app.installedDate ?? null,
      installer: app.installer ?? null,
      ...familyFields(family),
    });
  }
  return matches;
}

// The dual-use track. Watchware families never pass through matchKnown and
// never receive the stalkerware tier templates; this is the whole wall.
export function matchWatchware(apps, indicators) {
  const { exact, certs } = buildIndex(indicators.watchware || []);
  const matches = [];
  for (const app of apps) {
    const pkgFamily = exact.get(app.pkg) || null;
    const certHit = (app.certs || [])
      .map((c) => ({ cert: c.toUpperCase(), family: certs.get(c.toUpperCase()) }))
      .find((h) => h.family);
    const family = pkgFamily || certHit?.family;
    if (!family) continue;
    matches.push({
      pkg: app.pkg,
      label: app.label,
      via: pkgFamily ? "package" : "certificate",
      tier: "dual-use",
      matchedCert: pkgFamily ? null : certHit.cert,
      installedDate: app.installedDate ?? null,
      installer: app.installer ?? null,
      ...familyFields(family),
    });
  }
  return matches;
}

// Most recent install first; an unknown install date sorts last rather than
// first, so a missing fact never masquerades as the newest one.
function byRecency(list) {
  return [...list].sort((a, b) => (b.installedDate || "").localeCompare(a.installedDate || ""));
}

// Sweep bundles the indicator list at release time and never fetches; a
// release cadence that goes quiet longer than this deserves a gentle
// note on the results, not a verdict either way.
const STALE_DAYS = 120;

export function dataAge(indicators, now = new Date()) {
  const fetched = new Date(`${indicators?.fetched}T00:00:00Z`);
  if (Number.isNaN(fetched.getTime())) return { fetched: null, ageDays: null, stale: false };
  const ageDays = Math.floor((now.getTime() - fetched.getTime()) / 86400000);
  return { fetched: indicators.fetched, ageDays, stale: ageDays > STALE_DAYS };
}

// Major stores incl. the OEM ones on the budget devices at-risk users
// actually carry; a flooded sideload list teaches people to stop reading.
const KNOWN_STORES = new Set([
  "com.android.vending",
  "org.fdroid.fdroid",
  "org.fdroid.basic",
  "com.aurora.store",
  "com.amazon.venezia",
  "com.huawei.appmarket",
  "com.sec.android.app.samsungapps",
  "com.xiaomi.mipicks",
  "com.heytap.market",
  "com.oppo.market",
  "com.bbk.appstore",
  "com.vivo.appstore",
  "ru.vk.store",
]);

const DISGUISE_PREFIXES = ["com.google.android.", "com.android.", "com.samsung.", "com.sec."];

export function grantedPhrases(app) {
  const grants = app?.grants || {};
  return Object.keys(GRANT_PHRASES).filter((p) => grants[p] === true).map((p) => GRANT_PHRASES[p]);
}

// Everything the OS says this app can do right now, as translatable phrases.
export function canDoPhrases(app, powers = {}) {
  const phrases = new Set();
  if (powers.admin) phrases.add(ADMIN_ENABLED_PHRASE);
  if (powers.accessibility) phrases.add(A11Y_ENABLED_PHRASE);
  if (powers.notifications) phrases.add(NOTIF_ENABLED_PHRASE);
  for (const p of grantedPhrases(app)) phrases.add(p);
  for (const perm of app?.declared || []) {
    if (DECLARED_PHRASES[perm]) phrases.add(DECLARED_PHRASES[perm]);
  }
  for (const type of app?.fgsTypes || []) {
    if (FGS_PHRASES[type]) phrases.add(FGS_PHRASES[type]);
  }
  if (app?.bootReceiver === true) phrases.add(BOOT_PHRASE);
  if (app?.batteryExempt === true) phrases.add(BATTERY_PHRASE);
  return [...phrases];
}

export function accessibilityPhrases(detail) {
  const phrases = [];
  for (const key of Object.keys(A11Y_PHRASES)) {
    if (key === "watchesTextInput") continue;
    if (detail?.capabilities?.[key] === true) phrases.push(A11Y_PHRASES[key]);
  }
  if (detail?.watchesTextInput === true) phrases.push(A11Y_PHRASES.watchesTextInput);
  return phrases;
}

function provenance(app) {
  return {
    installedDate: app?.installedDate ?? null,
    updatedDate: app?.updatedDate ?? null,
    installer: app?.installer ?? null,
    initiatingPkg: app?.initiatingPkg ?? null,
    packageSource: app?.packageSource ?? null,
  };
}

function baseEvidence(app) {
  const ev = [{ label: msg("package"), value: app?.pkg ?? "" }];
  if (app?.label && app.label !== app.pkg) ev.push({ label: msg("app label"), value: app.label });
  ev.push({ label: msg("system app"), value: String(app?.system ?? "unknown") });
  ev.push({ label: msg("installer"), value: app?.installer ?? "unknown" });
  if (app?.initiatingPkg) ev.push({ label: msg("install started by"), value: app.initiatingPkg });
  if (app?.packageSource) ev.push({ label: msg("install source type"), value: app.packageSource });
  ev.push({ label: msg("installed"), value: app?.installedDate ?? "unknown" });
  if (app?.updatedDate) ev.push({ label: msg("last updated"), value: app.updatedDate });
  if (app?.targetSdk != null) ev.push({ label: msg("targets Android API"), value: String(app.targetSdk) });
  if (app?.sharedUserId) ev.push({ label: msg("shared user id"), value: app.sharedUserId });
  if (app?.debuggable === true) ev.push({ label: msg("debuggable build"), value: "true" });
  return ev;
}

function matchEvidence(m, app) {
  const ev = baseEvidence(app);
  ev.push({ label: msg("matched family"), value: m.family });
  ev.push({ label: msg("matched by"), value: m.via });
  if (m.matchedCert) ev.push({ label: msg("matching certificate SHA-1"), value: m.matchedCert });
  if (m.aliases.length) ev.push({ label: msg("also sold as"), value: m.aliases.join(", ") });
  if (m.certOrganizations.length) ev.push({ label: msg("certificate registered to"), value: m.certOrganizations.join(", ") });
  ev.push({ label: msg("list entry type"), value: m.familyType });
  return ev;
}

// Launchers, keyboards, and the OS itself legitimately hold these powers;
// the report's job is to show WHO holds them so the user can recognize
// what they did not grant.
export function analyze(scan, indicators) {
  const apps = scan.apps || [];
  const byPkg = new Map(apps.map((a) => [a.pkg, a]));
  const label = (pkg) => byPkg.get(pkg)?.label || pkg;
  // Admins, accessibility, and notification listeners only carry a pkg and
  // a service name off the bridge; install facts live on the app record.
  const enrich = (a) => ({
    ...a,
    label: a.label || label(a.pkg),
    system: byPkg.get(a.pkg)?.system ?? false,
    installedDate: byPkg.get(a.pkg)?.installedDate ?? null,
    installer: byPkg.get(a.pkg)?.installer ?? null,
  });

  const header = surfaceReport(scan);

  const policiesByComponent = new Map(
    (scan.adminPolicies || []).map((p) => [p.pkg, p.policies ?? null]),
  );
  const admins = byRecency(
    (scan.admins || []).map(enrich).map((a) => ({
      ...a,
      policies: policiesByComponent.has(a.pkg) ? policiesByComponent.get(a.pkg) : undefined,
    })),
  );

  const settingsA11y = (scan.accessibility || []).map(enrich);
  const detailA11y = (scan.accessibilityDetail || []).map((d) =>
    ({ ...enrich({ pkg: d.pkg, service: d.service || (d.id || "").split("/")[1] || "", label: d.label }), detail: d }),
  );
  const detailPkgs = new Set(detailA11y.map((a) => a.pkg));
  const settingsPkgs = new Set(settingsA11y.map((a) => a.pkg));
  const accessibility = byRecency(
    detailA11y.length
      ? [...detailA11y, ...settingsA11y.filter((a) => !detailPkgs.has(a.pkg))]
      : settingsA11y,
  );
  const accessibilityCrossCheck = {
    onlyInSettings: [...settingsPkgs].filter((p) => !detailPkgs.has(p)),
    onlyInManager: [...detailPkgs].filter((p) => !settingsPkgs.has(p)),
  };
  accessibilityCrossCheck.consistent =
    !detailA11y.length || (!accessibilityCrossCheck.onlyInSettings.length && !accessibilityCrossCheck.onlyInManager.length);

  const notifications = byRecency((scan.notifications || []).map(enrich));

  const hidden = byRecency(apps.filter((a) => !a.system && !a.hasLauncher));

  const sideloaded = byRecency(apps.filter((a) => !a.system && (!a.installer || !KNOWN_STORES.has(a.installer))));

  const adminPkgs = new Set(admins.map((a) => a.pkg));
  const accessibilityPkgs = new Set(accessibility.map((a) => a.pkg));
  const notificationPkgs = new Set(notifications.map((a) => a.pkg));
  const powersOf = (pkg) => ({
    admin: adminPkgs.has(pkg),
    accessibility: accessibilityPkgs.has(pkg),
    notifications: notificationPkgs.has(pkg),
  });

  const decorate = (m, headline, headlineVars, whyFlagged) => {
    const app = byPkg.get(m.pkg);
    const powers = powersOf(m.pkg);
    return {
      ...m,
      powers,
      headline,
      headlineVars,
      whyFlagged,
      canDo: canDoPhrases(app, powers),
      provenance: provenance(app),
      evidence: matchEvidence(m, app),
    };
  };

  // A tier-4 prefix hit with no corroborating power stays off the report
  // entirely: a name fragment alone must never put a family name on screen.
  const rawMatches = matchKnown(apps, indicators);
  const matches = byRecency(rawMatches).map((m) => {
    const why = { 1: "certificate-match", 2: "package-and-certificate-match", 3: "package-match-uncorroborated", 4: "prefix-match-with-power" }[m.tier];
    return decorate(m, TIER_HEADLINES[m.tier], { family: m.family }, why);
  }).filter((m) => {
    if (m.tier !== 4) return true;
    return m.powers.admin || m.powers.accessibility || m.powers.notifications || grantedPhrases(byPkg.get(m.pkg)).length > 0;
  });

  const dualUse = byRecency(matchWatchware(apps, indicators)).map((m) =>
    decorate(m, DUAL_USE_HEADLINE, { label: m.label }, m.via === "package" ? "watchware-package-match" : "watchware-certificate-match"),
  );

  // Galaxy Store carries real com.samsung.* apps and MDM pushes real com.android.* ones,
  // so a system-looking name needs a concealment or power signal before it is worth a card.
  const disguised = byRecency(
    apps.filter((a) => {
      if (a.system !== false) return false;
      if (a.installer && KNOWN_STORES.has(a.installer)) return false;
      if (!DISGUISE_PREFIXES.some((p) => a.pkg.startsWith(p))) return false;
      const powers = powersOf(a.pkg);
      return (
        a.hasLauncher === false ||
        powers.admin === true ||
        powers.accessibility === true ||
        powers.notifications === true ||
        a.bootReceiver === true
      );
    }),
  ).map((a) => {
    const prefix = DISGUISE_PREFIXES.find((p) => a.pkg.startsWith(p));
    const powers = powersOf(a.pkg);
    return {
      pkg: a.pkg,
      label: a.label,
      powers,
      headline: DISGUISE_HEADLINE,
      headlineVars: { prefix },
      whyFlagged: "system-name-without-system-record",
      canDo: canDoPhrases(a, powers),
      provenance: provenance(a),
      evidence: baseEvidence(a),
      installedDate: a.installedDate ?? null,
      installer: a.installer ?? null,
    };
  });

  const watching = byRecency(
    apps.filter((a) => {
      if (a.system || a.hasLauncher) return false;
      if (a.installer && KNOWN_STORES.has(a.installer)) return false;
      if (!(a.bootReceiver === true || a.batteryExempt === true)) return false;
      const g = a.grants || {};
      return (
        g["android.permission.RECORD_AUDIO"] === true ||
        g["android.permission.ACCESS_BACKGROUND_LOCATION"] === true ||
        g["android.permission.READ_SMS"] === true ||
        g["android.permission.RECEIVE_SMS"] === true ||
        accessibilityPkgs.has(a.pkg)
      );
    }),
  ).map((a) => {
    const powers = powersOf(a.pkg);
    const access = canDoPhrases(a, powers);
    return {
      pkg: a.pkg,
      label: a.label,
      powers,
      headline: WATCHING_HEADLINE,
      headlineVars: {},
      accessPhrases: access,
      whyFlagged: "hidden-persistent-powerful",
      canDo: access,
      provenance: provenance(a),
      evidence: baseEvidence(a),
      installedDate: a.installedDate ?? null,
      installer: a.installer ?? null,
    };
  });

  const bootFgs = byRecency(
    apps.filter(
      (a) =>
        a.system === false &&
        a.bootReceiver === true &&
        (a.fgsTypes || []).some((type) => type in SENSOR_LABELS),
    ),
  ).map((a) => {
    const powers = powersOf(a.pkg);
    return {
      pkg: a.pkg,
      label: a.label,
      powers,
      headline: BOOT_FGS_HEADLINE,
      headlineVars: {},
      sensorPhrases: (a.fgsTypes || []).filter((type) => type in SENSOR_LABELS).map((type) => SENSOR_LABELS[type]),
      whyFlagged: "boot-plus-sensor-service",
      canDo: canDoPhrases(a, powers),
      provenance: provenance(a),
      evidence: baseEvidence(a),
      installedDate: a.installedDate ?? null,
      installer: a.installer ?? null,
    };
  });

  const defaultIme = scan.defaultIme ?? null;
  const imes = byRecency(
    (scan.inputMethods || []).map((i) => ({
      ...enrich(i),
      component: i.component,
      isDefault: defaultIme ? defaultIme === i.component || defaultIme.startsWith(`${i.pkg}/`) : null,
    })),
  );

  const userCerts = scan.userCertificates || [];

  const roleHolder = (pkg) =>
    pkg
      ? {
          pkg,
          label: label(pkg),
          system: byPkg.get(pkg)?.system ?? null,
          installer: byPkg.get(pkg)?.installer ?? null,
        }
      : null;
  const roles = {
    sms: roleHolder(scan.roles?.sms ?? null),
    dialer: roleHolder(scan.roles?.dialer ?? null),
    assistant: scan.roles?.assistant ?? null,
  };

  const vpnApps = byRecency(
    (scan.vpnServices || []).map((pkg) => {
      const a = byPkg.get(pkg);
      return {
        ...enrich({ pkg }),
        hidden: a ? !a.system && !a.hasLauncher : null,
        sideloadedInstall: a ? !a.system && (!a.installer || !KNOWN_STORES.has(a.installer)) : null,
      };
    }),
  );
  const alwaysOnVpn = scan.alwaysOnVpn ?? null;

  const owners = scan.owners
    ? {
        deviceOwner: roleHolder(scan.owners.deviceOwner ?? null),
        profileOwners: (scan.owners.profileOwners || []).map((p) => roleHolder(p)),
        workProfile: scan.owners.workProfile ?? null,
      }
    : null;

  const globals = scan.globals ?? null;

  return {
    header,
    matches,
    dualUse,
    disguised,
    watching,
    bootFgs,
    admins,
    accessibility,
    accessibilityCrossCheck,
    notifications,
    hidden,
    sideloaded,
    imes,
    userCerts,
    roles,
    vpnApps,
    alwaysOnVpn,
    owners,
    globals,
    counts: {
      apps: apps.length,
      matches: matches.length,
      dualUse: dualUse.length,
      disguised: disguised.length,
      watching: watching.length,
      bootFgs: bootFgs.length,
      admins: admins.length,
      accessibility: accessibility.length,
      notifications: notifications.length,
      hidden: hidden.length,
      sideloaded: sideloaded.length,
      imes: imes.length,
      userCerts: userCerts.length,
      vpnApps: vpnApps.length,
    },
  };
}

// Verified package names only; absence here is not a finding, just an unknown.
const KNOWN_ASSISTIVE_PACKAGES = new Set([
  "com.google.android.marvin.talkback",
  "com.google.android.apps.accessibility.voiceaccess",
]);

// A bare package-name match can be claimed by any non-system install; require system too.
export function unrecognizedAccessibility(accessibility) {
  return (accessibility || []).filter((a) => !(KNOWN_ASSISTIVE_PACKAGES.has(a.pkg) && a.system === true));
}

// The bridge's own permission list, reduced to the one claim the app makes
// about itself repeatedly in its copy: it cannot reach the network. Read
// raw off the OS the same way everything else on the phone is read.
export function selfCheckSummary(raw) {
  const permissions = Array.isArray(raw?.permissions) ? raw.permissions : [];
  return {
    pkg: raw?.pkg ?? null,
    version: raw?.version ?? null,
    permissions,
    hasInternet: permissions.includes("android.permission.INTERNET"),
  };
}
