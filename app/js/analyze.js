// The whole judgment layer, kept pure so it runs under node's test runner.
// A scan (what the bridge collected) plus the indicator data becomes a
// report of findings per check. No verdict words live here; severity of
// LANGUAGE is the UI's job, and the UI never says "clean".

// Indicator packages may end with * for families that randomize suffixes.
function buildIndex(indicators) {
  const exact = new Map();
  const prefixes = [];
  const certs = new Map();
  for (const family of indicators.apps) {
    for (const pkg of family.packages) {
      if (pkg.endsWith("*")) prefixes.push({ prefix: pkg.slice(0, -1), name: family.name });
      else exact.set(pkg, family.name);
    }
    for (const cert of family.certificates) {
      certs.set(cert.toUpperCase(), family.name);
    }
  }
  return { exact, prefixes, certs };
}

export function matchKnown(apps, indicators) {
  const { exact, prefixes, certs } = buildIndex(indicators);
  const matches = [];
  for (const app of apps) {
    const viaPkg = exact.get(app.pkg) ?? prefixes.find((p) => app.pkg.startsWith(p.prefix))?.name;
    if (viaPkg) {
      matches.push({ pkg: app.pkg, label: app.label, family: viaPkg, via: "package", installedDate: app.installedDate ?? null, installer: app.installer ?? null });
      continue;
    }
    const viaCert = (app.certs || []).map((c) => certs.get(c.toUpperCase())).find(Boolean);
    if (viaCert) {
      matches.push({ pkg: app.pkg, label: app.label, family: viaCert, via: "certificate", installedDate: app.installedDate ?? null, installer: app.installer ?? null });
    }
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

  const matches = byRecency(matchKnown(apps, indicators));

  const admins = byRecency((scan.admins || []).map(enrich));

  const accessibility = byRecency((scan.accessibility || []).map(enrich));

  const notifications = byRecency((scan.notifications || []).map(enrich));

  const hidden = byRecency(apps.filter((a) => !a.system && !a.hasLauncher));

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
  const sideloaded = byRecency(apps.filter((a) => !a.system && (!a.installer || !KNOWN_STORES.has(a.installer))));

  // A matched package that also shows up in another surface is not just
  // named, it is holding real power: cross-reference so the match card can
  // say what, concretely, that app can do on this phone right now.
  const adminPkgs = new Set(admins.map((a) => a.pkg));
  const accessibilityPkgs = new Set(accessibility.map((a) => a.pkg));
  const notificationPkgs = new Set(notifications.map((a) => a.pkg));
  const matchesWithPowers = matches.map((m) => ({
    ...m,
    powers: {
      admin: adminPkgs.has(m.pkg),
      accessibility: accessibilityPkgs.has(m.pkg),
      notifications: notificationPkgs.has(m.pkg),
    },
  }));

  return {
    matches: matchesWithPowers,
    admins,
    accessibility,
    notifications,
    hidden,
    sideloaded,
    counts: {
      apps: apps.length,
      matches: matches.length,
      admins: admins.length,
      accessibility: accessibility.length,
      notifications: notifications.length,
      hidden: hidden.length,
      sideloaded: sideloaded.length,
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
