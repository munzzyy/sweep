// Labeled corpora for the analyzer floors: a benign phone that must never
// produce a stalkerware-tier finding, and spoof twins that must always
// diverge from their benign counterparts.

export const LASTPASS_CERT = "1111111111111111111111111111111111111111";
export const WRONG_CERT = "2222222222222222222222222222222222222222";

export const appRec = (pkg, over = {}) => ({
  pkg,
  label: pkg,
  system: false,
  hasLauncher: true,
  installer: "com.android.vending",
  installedDate: "2026-01-15",
  updatedDate: "2026-06-01",
  targetSdk: 34,
  sharedUserId: null,
  debuggable: false,
  bootReceiver: false,
  certs: [],
  grants: {},
  declared: [],
  fgsTypes: [],
  batteryExempt: false,
  initiatingPkg: null,
  packageSource: null,
  ...over,
});

export const okSurfaces = () => [
  { surface: "installed_apps", status: "ok" },
  { surface: "device_admins", status: "ok" },
  { surface: "admin_policies", status: "ok" },
  { surface: "accessibility_settings", status: "ok" },
  { surface: "accessibility_detail", status: "ok" },
  { surface: "notification_listeners", status: "ok" },
  { surface: "permission_grants", status: "ok" },
  { surface: "app_manifests", status: "ok" },
  { surface: "install_sources", status: "ok" },
  { surface: "input_methods", status: "ok" },
  { surface: "default_ime", status: "ok" },
  { surface: "user_certificates", status: "ok" },
  { surface: "sms_role", status: "ok" },
  { surface: "dialer_role", status: "ok" },
  { surface: "assistant_role", status: "ok" },
  { surface: "battery_exemptions", status: "ok" },
  { surface: "owners", status: "ok" },
  { surface: "global_settings", status: "ok" },
  { surface: "vpn_services", status: "ok" },
  { surface: "always_on_vpn", status: "ok" },
  { surface: "usage_access_grants", status: "unavailable", reason: "Android only exposes this to privileged system apps" },
  { surface: "overlay_grants", status: "unavailable", reason: "Android only exposes this to privileged system apps" },
  { surface: "install_unknown_grants", status: "unavailable", reason: "Android only exposes this to privileged system apps" },
];

const a11yDetail = (pkg, service, capabilities = {}, packageScope = null) => ({
  id: `${pkg}/${service}`,
  pkg,
  service,
  label: pkg,
  capabilities: { retrieveWindowContent: true, performGestures: false, filterKeyEvents: false, controlMagnification: false, ...capabilities },
  flags: { filterKeyEvents: false, retrieveInteractiveWindows: false, reportViewIds: false },
  eventTypes: 0,
  watchesTextInput: false,
  packageScope,
});

// Every entry here is a real, legitimate holder of a scary-looking power.
// The floor: zero tier findings, zero disguise hits, zero watching hits.
export function benignScan() {
  return {
    surfaces: okSurfaces(),
    admins: [
      { pkg: "com.google.android.apps.adm", label: "Find My Device" },
      { pkg: "com.microsoft.windowsintune.companyportal", label: "Company Portal" },
      { pkg: "com.google.android.apps.kids.familylink", label: "Family Link" },
    ],
    adminPolicies: [
      { pkg: "com.google.android.apps.adm", component: "com.google.android.apps.adm/.Receiver", policies: { wipeData: true, forceLock: true, resetPassword: false, watchLogin: false, disableCamera: false } },
      { pkg: "com.microsoft.windowsintune.companyportal", component: "com.microsoft.windowsintune.companyportal/.Receiver", policies: { wipeData: true, forceLock: true, resetPassword: true, watchLogin: true, disableCamera: true } },
      { pkg: "com.google.android.apps.kids.familylink", component: "com.google.android.apps.kids.familylink/.Receiver", policies: null },
    ],
    accessibility: [
      { pkg: "com.google.android.marvin.talkback", service: "TalkBackService" },
      { pkg: "com.google.android.apps.accessibility.voiceaccess", service: "VoiceAccessService" },
      { pkg: "com.lastpass.lpandroid", service: "LpAccessibilityService" },
      { pkg: "com.x8bit.bitwarden", service: "AutofillService" },
    ],
    accessibilityDetail: [
      a11yDetail("com.google.android.marvin.talkback", "TalkBackService", { performGestures: true }),
      a11yDetail("com.google.android.apps.accessibility.voiceaccess", "VoiceAccessService", { performGestures: true }),
      a11yDetail("com.lastpass.lpandroid", "LpAccessibilityService"),
      a11yDetail("com.x8bit.bitwarden", "AutofillService"),
    ],
    notifications: [{ pkg: "com.google.android.apps.wellbeing", service: "NotificationListener" }],
    inputMethods: [{ pkg: "com.google.android.inputmethod.latin", component: "com.google.android.inputmethod.latin/.LatinIME", label: "Gboard" }],
    defaultIme: "com.google.android.inputmethod.latin/.LatinIME",
    userCertificates: [],
    roles: { sms: "com.google.android.apps.messaging", dialer: "com.google.android.dialer" },
    vpnServices: [],
    owners: { deviceOwner: null, profileOwners: [], workProfile: false },
    globals: { adbEnabled: false, developmentSettingsEnabled: false, adbWifiEnabled: false },
    apps: [
      appRec("com.google.android.marvin.talkback", { system: true, installer: null, hasLauncher: false }),
      appRec("com.google.android.apps.accessibility.voiceaccess", { system: true, installer: null, hasLauncher: false }),
      appRec("com.lastpass.lpandroid", { certs: [LASTPASS_CERT] }),
      appRec("com.x8bit.bitwarden"),
      appRec("com.google.android.apps.adm", { system: true, installer: null }),
      appRec("com.microsoft.windowsintune.companyportal"),
      appRec("com.google.android.apps.kids.familylink", { declared: ["android.permission.PACKAGE_USAGE_STATS"] }),
      appRec("com.kaspersky.safekids", { declared: ["android.permission.PACKAGE_USAGE_STATS"] }),
      appRec("com.google.android.apps.wellbeing", { system: true, installer: null, declared: ["android.permission.PACKAGE_USAGE_STATS"] }),
      appRec("com.facebook.orca", { declared: ["android.permission.SYSTEM_ALERT_WINDOW"] }),
      appRec("com.google.android.apps.messaging", { grants: { "android.permission.READ_SMS": true, "android.permission.RECEIVE_SMS": true } }),
      appRec("com.google.android.dialer", { system: true, installer: null }),
      appRec("com.google.android.inputmethod.latin", { system: true, installer: null, hasLauncher: false }),
      appRec("com.google.android.gm"),
      appRec("com.whatsapp", { grants: { "android.permission.RECORD_AUDIO": true, "android.permission.CAMERA": true } }),
    ],
  };
}

// Each spoof is the benign twin with exactly the trust anchor broken.
export function spoofScan(stalkerCert) {
  return {
    surfaces: okSurfaces(),
    admins: [],
    adminPolicies: [],
    accessibility: [
      { pkg: "com.google.android.marvin.talkback", service: "EvilService" },
      { pkg: "com.lastpass.lpandroid", service: "LpAccessibilityService" },
    ],
    accessibilityDetail: [
      a11yDetail("com.google.android.marvin.talkback", "EvilService", { performGestures: true, filterKeyEvents: true }),
      a11yDetail("com.lastpass.lpandroid", "LpAccessibilityService"),
    ],
    notifications: [],
    inputMethods: [],
    userCertificates: [],
    roles: {},
    vpnServices: [],
    apps: [
      appRec("com.google.android.marvin.talkback", { system: false, installer: null, hasLauncher: false }),
      appRec("com.lastpass.lpandroid", { certs: [WRONG_CERT], installer: null }),
      appRec("com.innocent.looking.app", { certs: [stalkerCert], installer: null, hasLauncher: false }),
      appRec("com.microsoft.familysafety", { installer: null }),
    ],
  };
}
