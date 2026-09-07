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
      matches.push({ pkg: app.pkg, label: app.label, family: viaPkg, via: "package" });
      continue;
    }
    const viaCert = (app.certs || []).map((c) => certs.get(c.toUpperCase())).find(Boolean);
    if (viaCert) {
      matches.push({ pkg: app.pkg, label: app.label, family: viaCert, via: "certificate" });
    }
  }
  return matches;
}

// Launchers, keyboards, and the OS itself legitimately hold these powers;
// the report's job is to show WHO holds them so the user can recognize
// what they did not grant.
export function analyze(scan, indicators) {
  const apps = scan.apps || [];
  const byPkg = new Map(apps.map((a) => [a.pkg, a]));
  const label = (pkg) => byPkg.get(pkg)?.label || pkg;

  const matches = matchKnown(apps, indicators);

  const admins = (scan.admins || []).map((a) => ({
    ...a,
    label: a.label || label(a.pkg),
    system: byPkg.get(a.pkg)?.system ?? false,
  }));

  const accessibility = (scan.accessibility || []).map((a) => ({
    ...a,
    label: a.label || label(a.pkg),
    system: byPkg.get(a.pkg)?.system ?? false,
  }));

  const hidden = apps.filter((a) => !a.system && !a.hasLauncher);

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
  const sideloaded = apps.filter((a) => !a.system && (!a.installer || !KNOWN_STORES.has(a.installer)));

  return {
    matches,
    admins,
    accessibility,
    hidden,
    sideloaded,
    counts: {
      apps: apps.length,
      matches: matches.length,
      admins: admins.length,
      accessibility: accessibility.length,
      hidden: hidden.length,
      sideloaded: sideloaded.length,
    },
  };
}
