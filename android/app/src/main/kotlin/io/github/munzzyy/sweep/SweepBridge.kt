package io.github.munzzyy.sweep

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.admin.DeviceAdminInfo
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.PowerManager
import android.os.UserManager
import android.provider.Settings
import android.provider.Telephony
import android.telecom.TelecomManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import java.security.MessageDigest
import java.security.cert.X509Certificate

// Read-only. The page gets one snapshot of the facts a checkup needs and
// nothing else; there is no method here that changes device state.
class SweepBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun platform(): String = "android"

    @JavascriptInterface
    fun version(): String = runCatching {
        activity.packageManager.getPackageInfo(activity.packageName, 0).versionName
    }.getOrNull() ?: "unknown"

    @JavascriptInterface
    fun quickExit() {
        activity.runOnUiThread { activity.quickExit() }
    }

    @JavascriptInterface
    fun scanJson(): String = runCatching { buildScan() }.getOrElse {
        JSONObject().put("error", it.toString()).toString()
    }

    // Sweep's own OS-reported facts, read the same way as everything else
    // on the phone: no separate trust channel, so a claim about this app
    // is exactly as checkable as a claim about any other app.
    @JavascriptInterface
    fun selfCheck(): String = runCatching {
        val info = activity.packageManager.getPackageInfo(activity.packageName, PackageManager.GET_PERMISSIONS)
        val permissions = JSONArray()
        for (p in info.requestedPermissions ?: emptyArray()) permissions.put(p)
        JSONObject()
            .put("pkg", activity.packageName)
            .put("version", info.versionName ?: "unknown")
            .put("permissions", permissions)
            .toString()
    }.getOrElse { JSONObject().put("error", it.toString()).toString() }

    private val runtimeGrantChecks = listOf(
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.READ_SMS",
        "android.permission.RECEIVE_SMS",
        "android.permission.READ_CALL_LOG",
        "android.permission.PROCESS_OUTGOING_CALLS",
        "android.permission.READ_CONTACTS",
        "android.permission.READ_PHONE_STATE",
        "android.permission.READ_CALENDAR",
        "android.permission.POST_NOTIFICATIONS",
    )

    // Appop-gated specials: the GRANTED flag lies for these, so only the
    // manifest declaration is ever reported.
    private val declaredOnlySpecials = listOf(
        "android.permission.PACKAGE_USAGE_STATS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.REQUEST_INSTALL_PACKAGES",
        "android.permission.MANAGE_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
    )

    private fun buildScan(): String {
        val pm = activity.packageManager
        val out = JSONObject()
        val surfaces = JSONArray()

        fun ok(name: String) {
            surfaces.put(JSONObject().put("surface", name).put("status", "ok"))
        }

        fun unavailable(name: String, reason: String) {
            surfaces.put(
                JSONObject().put("surface", name).put("status", "unavailable").put("reason", reason),
            )
        }

        fun surface(name: String, block: () -> Unit) {
            runCatching(block).fold({ ok(name) }, { unavailable(name, it.toString()) })
        }

        fun secureSetting(name: String, key: String, store: (String) -> Unit) {
            runCatching { Settings.Secure.getString(activity.contentResolver, key) }.fold(
                { value ->
                    if (value.isNullOrBlank()) {
                        unavailable(name, "the phone reported no value for $key")
                    } else {
                        store(value)
                        ok(name)
                    }
                },
                { unavailable(name, it.toString()) },
            )
        }

        val dpm = activity.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponents = runCatching { dpm.activeAdmins ?: emptyList() }.getOrDefault(emptyList())

        surface("device_admins") {
            val admins = JSONArray()
            for (admin in adminComponents) {
                admins.put(
                    JSONObject()
                        .put("pkg", admin.packageName)
                        .put("label", appLabel(pm, admin.packageName)),
                )
            }
            out.put("admins", admins)
        }

        surface("admin_policies") {
            val policies = JSONArray()
            for (admin in adminComponents) {
                val declared = runCatching {
                    val receiver = pm.getReceiverInfo(admin, PackageManager.GET_META_DATA)
                    val resolve = ResolveInfo().also { it.activityInfo = receiver }
                    val info = DeviceAdminInfo(activity, resolve)
                    JSONObject()
                        .put("wipeData", info.usesPolicy(DeviceAdminInfo.USES_POLICY_WIPE_DATA))
                        .put("forceLock", info.usesPolicy(DeviceAdminInfo.USES_POLICY_FORCE_LOCK))
                        .put("resetPassword", info.usesPolicy(DeviceAdminInfo.USES_POLICY_RESET_PASSWORD))
                        .put("watchLogin", info.usesPolicy(DeviceAdminInfo.USES_POLICY_WATCH_LOGIN))
                        .put("disableCamera", info.usesPolicy(DeviceAdminInfo.USES_POLICY_DISABLE_CAMERA))
                }.getOrNull()
                policies.put(
                    JSONObject()
                        .put("pkg", admin.packageName)
                        .put("component", admin.flattenToShortString())
                        .put("policies", declared ?: JSONObject.NULL),
                )
            }
            out.put("adminPolicies", policies)
        }

        surface("accessibility_settings") {
            val accessibility = JSONArray()
            val enabled = Settings.Secure.getString(
                activity.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            ) ?: ""
            for (entry in enabled.split(':').filter { it.isNotBlank() }) {
                val pkg = entry.substringBefore('/')
                accessibility.put(
                    JSONObject()
                        .put("pkg", pkg)
                        .put("service", entry.substringAfter('/', ""))
                        .put("label", appLabel(pm, pkg)),
                )
            }
            out.put("accessibility", accessibility)
        }

        val accessibilityDetailPkgs = mutableSetOf<String>()
        surface("accessibility_detail") {
            val manager = activity.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
            val detail = JSONArray()
            for (svc in manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)) {
                val serviceInfo = svc.resolveInfo?.serviceInfo
                val pkg = serviceInfo?.packageName ?: (svc.id ?: "").substringBefore('/')
                accessibilityDetailPkgs.add(pkg)
                val caps = svc.capabilities
                val capabilities = JSONObject()
                    .put("retrieveWindowContent", caps and AccessibilityServiceInfo.CAPABILITY_CAN_RETRIEVE_WINDOW_CONTENT != 0)
                    .put("performGestures", caps and AccessibilityServiceInfo.CAPABILITY_CAN_PERFORM_GESTURES != 0)
                    .put("filterKeyEvents", caps and AccessibilityServiceInfo.CAPABILITY_CAN_REQUEST_FILTER_KEY_EVENTS != 0)
                    .put("controlMagnification", caps and AccessibilityServiceInfo.CAPABILITY_CAN_CONTROL_MAGNIFICATION != 0)
                if (Build.VERSION.SDK_INT >= 30) {
                    capabilities.put("takeScreenshots", caps and AccessibilityServiceInfo.CAPABILITY_CAN_TAKE_SCREENSHOT != 0)
                }
                val flagBits = svc.flags
                val flags = JSONObject()
                    .put("filterKeyEvents", flagBits and AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS != 0)
                    .put("retrieveInteractiveWindows", flagBits and AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS != 0)
                    .put("reportViewIds", flagBits and AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS != 0)
                if (Build.VERSION.SDK_INT >= 33) {
                    flags.put("inputMethodEditor", flagBits and AccessibilityServiceInfo.FLAG_INPUT_METHOD_EDITOR != 0)
                }
                val scope = svc.packageNames
                detail.put(
                    JSONObject()
                        .put("id", svc.id ?: "")
                        .put("pkg", pkg)
                        .put("service", serviceInfo?.name ?: "")
                        .put("label", serviceInfo?.loadLabel(pm)?.toString() ?: pkg)
                        .put("capabilities", capabilities)
                        .put("flags", flags)
                        .put("eventTypes", svc.eventTypes)
                        .put("watchesTextInput", svc.eventTypes and AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED != 0)
                        .put("packageScope", scope?.let { JSONArray(it.toList()) } ?: JSONObject.NULL),
                )
            }
            out.put("accessibilityDetail", detail)
        }

        val notificationPkgs = mutableSetOf<String>()
        surface("notification_listeners") {
            val notifications = JSONArray()
            val enabledNotif = Settings.Secure.getString(
                activity.contentResolver,
                "enabled_notification_listeners",
            ) ?: ""
            for (entry in enabledNotif.split(':').filter { it.isNotBlank() }) {
                val pkg = entry.substringBefore('/')
                notificationPkgs.add(pkg)
                notifications.put(
                    JSONObject()
                        .put("pkg", pkg)
                        .put("service", entry.substringAfter('/', ""))
                        .put("label", appLabel(pm, pkg)),
                )
            }
            out.put("notifications", notifications)
        }

        var bootReceiverPkgs = setOf<String>()
        var manifestFailures = 0
        var grantFailures = 0
        var sourceFailures = 0
        var firstManifestError: String? = null
        var firstGrantError: String? = null
        var firstSourceError: String? = null

        val appObjects = LinkedHashMap<String, JSONObject>()
        val systemPkgs = mutableSetOf<String>()

        surface("installed_apps") {
            @Suppress("DEPRECATION")
            val installed = pm.getInstalledPackages(PackageManager.GET_SIGNING_CERTIFICATES)
            // Both digests per signer: the indicator dataset publishes SHA-1
            // fingerprints today (an identifier lookup, not a security digest),
            // and SHA-256 rides along for the day it switches.
            val sha1 = MessageDigest.getInstance("SHA-1")
            val sha256 = MessageDigest.getInstance("SHA-256")
            val dateFmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            bootReceiverPkgs = runCatching {
                pm.queryBroadcastReceivers(Intent(Intent.ACTION_BOOT_COMPLETED), 0)
                    .mapNotNull { it.activityInfo?.packageName }.toSet()
            }.getOrElse {
                manifestFailures++
                firstManifestError = firstManifestError ?: it.toString()
                emptySet()
            }
            for (info in installed) {
                runCatching {
                    val ai = info.applicationInfo ?: return@runCatching
                    val system = (ai.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
                    if (system) systemPkgs.add(info.packageName)
                    val launch = pm.getLaunchIntentForPackage(info.packageName) != null
                    val installedDate = runCatching { dateFmt.format(java.util.Date(info.firstInstallTime)) }.getOrNull()
                    val updatedDate = runCatching { dateFmt.format(java.util.Date(info.lastUpdateTime)) }.getOrNull()
                    val certs = JSONArray()
                    val signers = info.signingInfo?.apkContentsSigners ?: emptyArray()
                    for (sig in signers) {
                        sha1.reset()
                        certs.put(sha1.digest(sig.toByteArray()).joinToString("") { "%02X".format(it) })
                        sha256.reset()
                        certs.put(sha256.digest(sig.toByteArray()).joinToString("") { "%02X".format(it) })
                    }
                    val app = JSONObject()
                        .put("pkg", info.packageName)
                        .put("label", pm.getApplicationLabel(ai).toString())
                        .put("system", system)
                        .put("hasLauncher", launch)
                        .put("installedDate", installedDate ?: JSONObject.NULL)
                        .put("updatedDate", updatedDate ?: JSONObject.NULL)
                        .put("targetSdk", ai.targetSdkVersion)
                        .put("sharedUserId", info.sharedUserId ?: JSONObject.NULL)
                        .put("debuggable", (ai.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0)
                        .put("bootReceiver", bootReceiverPkgs.contains(info.packageName))
                        .put("certs", certs)
                    installSource(pm, info.packageName, app) { err ->
                        sourceFailures++
                        firstSourceError = firstSourceError ?: err
                    }
                    permissionFacts(pm, info.packageName, app) { err ->
                        grantFailures++
                        firstGrantError = firstGrantError ?: err
                    }
                    serviceFacts(pm, info.packageName, app) { err ->
                        manifestFailures++
                        firstManifestError = firstManifestError ?: err
                    }
                    appObjects[info.packageName] = app
                }
            }
        }

        if (grantFailures == 0) {
            ok("permission_grants")
        } else {
            unavailable("permission_grants", "could not be read for $grantFailures apps; first error: $firstGrantError")
        }
        if (manifestFailures == 0) {
            ok("app_manifests")
        } else {
            unavailable("app_manifests", "could not be read for $manifestFailures apps; first error: $firstManifestError")
        }
        if (sourceFailures == 0) {
            ok("install_sources")
        } else {
            unavailable("install_sources", "could not be read for $sourceFailures apps; first error: $firstSourceError")
        }

        val imePkgs = mutableSetOf<String>()
        surface("input_methods") {
            val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            val imes = JSONArray()
            for (ime in imm.enabledInputMethodList) {
                imePkgs.add(ime.packageName)
                imes.put(
                    JSONObject()
                        .put("pkg", ime.packageName)
                        .put("component", ime.component.flattenToShortString())
                        .put("label", runCatching { ime.loadLabel(pm).toString() }.getOrDefault(ime.packageName)),
                )
            }
            out.put("inputMethods", imes)
        }
        secureSetting("default_ime", "default_input_method") { out.put("defaultIme", it) }

        surface("user_certificates") {
            val store = KeyStore.getInstance("AndroidCAStore")
            store.load(null)
            val userCerts = JSONArray()
            val dateFmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            for (alias in store.aliases()) {
                if (!alias.startsWith("user:")) continue
                val cert = store.getCertificate(alias) as? X509Certificate ?: continue
                userCerts.put(
                    JSONObject()
                        .put("subject", cert.subjectX500Principal.name)
                        .put("issuer", cert.issuerX500Principal.name)
                        .put("notBefore", dateFmt.format(cert.notBefore))
                        .put("notAfter", dateFmt.format(cert.notAfter)),
                )
            }
            out.put("userCertificates", userCerts)
        }

        val roles = JSONObject()
        var smsRole: String? = null
        var dialerRole: String? = null
        runCatching { Telephony.Sms.getDefaultSmsPackage(activity) }.fold(
            { pkg ->
                if (pkg.isNullOrBlank()) {
                    unavailable("sms_role", "the phone reported no default SMS app")
                } else {
                    smsRole = pkg
                    roles.put("sms", pkg)
                    ok("sms_role")
                }
            },
            { unavailable("sms_role", it.toString()) },
        )
        runCatching {
            (activity.getSystemService(Context.TELECOM_SERVICE) as TelecomManager).defaultDialerPackage
        }.fold(
            { pkg ->
                if (pkg.isNullOrBlank()) {
                    unavailable("dialer_role", "the phone reported no default dialer")
                } else {
                    dialerRole = pkg
                    roles.put("dialer", pkg)
                    ok("dialer_role")
                }
            },
            { unavailable("dialer_role", it.toString()) },
        )
        secureSetting("assistant_role", "assistant") { roles.put("assistant", it) }
        out.put("roles", roles)

        val vpnPkgs = mutableSetOf<String>()
        surface("vpn_services") {
            val declarers = JSONArray()
            for (resolved in pm.queryIntentServices(Intent("android.net.VpnService"), 0)) {
                val pkg = resolved.serviceInfo?.packageName ?: continue
                if (vpnPkgs.add(pkg)) declarers.put(pkg)
            }
            out.put("vpnServices", declarers)
        }
        secureSetting("always_on_vpn", "always_on_vpn_app") { out.put("alwaysOnVpn", it) }

        surface("owners") {
            var deviceOwner: String? = null
            val profileOwners = JSONArray()
            for (pkg in appObjects.keys) {
                if (deviceOwner == null && runCatching { dpm.isDeviceOwnerApp(pkg) }.getOrDefault(false)) {
                    deviceOwner = pkg
                }
                if (runCatching { dpm.isProfileOwnerApp(pkg) }.getOrDefault(false)) profileOwners.put(pkg)
            }
            val um = activity.getSystemService(Context.USER_SERVICE) as UserManager
            out.put(
                "owners",
                JSONObject()
                    .put("deviceOwner", deviceOwner ?: JSONObject.NULL)
                    .put("profileOwners", profileOwners)
                    .put("workProfile", um.userProfiles.size > 1),
            )
        }

        surface("global_settings") {
            val cr = activity.contentResolver
            out.put(
                "globals",
                JSONObject()
                    .put("adbEnabled", Settings.Global.getInt(cr, Settings.Global.ADB_ENABLED, 0) == 1)
                    .put("developmentSettingsEnabled", Settings.Global.getInt(cr, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1)
                    .put("adbWifiEnabled", Settings.Global.getInt(cr, "adb_wifi_enabled", 0) == 1),
            )
        }

        surface("battery_exemptions") {
            val power = activity.getSystemService(Context.POWER_SERVICE) as PowerManager
            val interesting = adminComponents.map { it.packageName }.toSet() +
                accessibilityDetailPkgs + notificationPkgs + imePkgs + vpnPkgs +
                listOfNotNull(smsRole, dialerRole)
            for ((pkg, app) in appObjects) {
                if (systemPkgs.contains(pkg) && !interesting.contains(pkg)) continue
                app.put("batteryExempt", power.isIgnoringBatteryOptimizations(pkg))
            }
        }

        // These three grants exist on the phone but their read APIs are gated;
        // saying so every scan is the honest floor, never a silent pass.
        unavailable("usage_access_grants", "Android only exposes this to privileged system apps")
        unavailable("overlay_grants", "Android only exposes this to privileged system apps")
        unavailable("install_unknown_grants", "Android only exposes this to privileged system apps")

        val apps = JSONArray()
        for (app in appObjects.values) apps.put(app)
        out.put("apps", apps)
        out.put("surfaces", surfaces)
        return out.toString()
    }

    private fun installSource(pm: PackageManager, pkg: String, app: JSONObject, onError: (String) -> Unit) {
        if (Build.VERSION.SDK_INT >= 30) {
            runCatching {
                val source = pm.getInstallSourceInfo(pkg)
                app.put("installer", source.installingPackageName ?: JSONObject.NULL)
                app.put("initiatingPkg", source.initiatingPackageName ?: JSONObject.NULL)
                app.put("originatingPkg", runCatching { source.originatingPackageName }.getOrNull() ?: JSONObject.NULL)
                if (Build.VERSION.SDK_INT >= 33) {
                    val label = when (source.packageSource) {
                        android.content.pm.PackageInstaller.PACKAGE_SOURCE_STORE -> "store"
                        android.content.pm.PackageInstaller.PACKAGE_SOURCE_LOCAL_FILE -> "local_file"
                        android.content.pm.PackageInstaller.PACKAGE_SOURCE_DOWNLOADED_FILE -> "downloaded_file"
                        android.content.pm.PackageInstaller.PACKAGE_SOURCE_OTHER -> "other"
                        else -> null
                    }
                    app.put("packageSource", label ?: JSONObject.NULL)
                }
            }.onFailure {
                app.put("installer", JSONObject.NULL)
                onError(it.toString())
            }
        } else {
            @Suppress("DEPRECATION")
            app.put("installer", runCatching { pm.getInstallerPackageName(pkg) }.getOrNull() ?: JSONObject.NULL)
        }
    }

    private fun permissionFacts(pm: PackageManager, pkg: String, app: JSONObject, onError: (String) -> Unit) {
        runCatching {
            val info = pm.getPackageInfo(pkg, PackageManager.GET_PERMISSIONS)
            val requested = info.requestedPermissions ?: emptyArray()
            val flags = info.requestedPermissionsFlags ?: IntArray(0)
            val grants = JSONObject()
            val declared = JSONArray()
            for (i in requested.indices) {
                val perm = requested[i]
                if (runtimeGrantChecks.contains(perm)) {
                    val granted = i < flags.size &&
                        (flags[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0
                    grants.put(perm, granted)
                }
                if (declaredOnlySpecials.contains(perm)) declared.put(perm)
            }
            app.put("grants", grants)
            app.put("declared", declared)
        }.onFailure { onError(it.toString()) }
    }

    private fun serviceFacts(pm: PackageManager, pkg: String, app: JSONObject, onError: (String) -> Unit) {
        runCatching {
            val info = pm.getPackageInfo(pkg, PackageManager.GET_SERVICES)
            var mask = 0
            for (svc in info.services ?: emptyArray()) {
                mask = mask or svc.foregroundServiceType
            }
            val types = JSONArray()
            if (mask and ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION != 0) types.put("location")
            if (mask and ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA != 0) types.put("camera")
            if (mask and ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE != 0) types.put("microphone")
            if (mask and ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION != 0) types.put("mediaProjection")
            if (mask and ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL != 0) types.put("phoneCall")
            app.put("fgsTypeMask", mask)
            app.put("fgsTypes", types)
        }.onFailure { onError(it.toString()) }
    }

    private fun appLabel(pm: PackageManager, pkg: String): String =
        runCatching { pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString() }.getOrDefault(pkg)
}
