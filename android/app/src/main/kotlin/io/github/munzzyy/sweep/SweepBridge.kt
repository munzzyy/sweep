package io.github.munzzyy.sweep

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

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

    private fun buildScan(): String {
        val pm = activity.packageManager
        val out = JSONObject()

        val dpm = activity.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admins = JSONArray()
        for (admin in dpm.activeAdmins ?: emptyList()) {
            admins.put(
                JSONObject()
                    .put("pkg", admin.packageName)
                    .put("label", appLabel(pm, admin.packageName)),
            )
        }
        out.put("admins", admins)

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

        val apps = JSONArray()
        @Suppress("DEPRECATION")
        val installed = pm.getInstalledPackages(PackageManager.GET_SIGNING_CERTIFICATES)
        // Both digests per signer: the indicator dataset publishes SHA-1
        // fingerprints today (an identifier lookup, not a security digest),
        // and SHA-256 rides along for the day it switches.
        val sha1 = MessageDigest.getInstance("SHA-1")
        val sha256 = MessageDigest.getInstance("SHA-256")
        for (info in installed) {
            runCatching {
                val ai = info.applicationInfo ?: return@runCatching
                val system = (ai.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
                val launch = pm.getLaunchIntentForPackage(info.packageName) != null
                val installer = if (android.os.Build.VERSION.SDK_INT >= 30) {
                    runCatching { pm.getInstallSourceInfo(info.packageName).installingPackageName }.getOrNull()
                } else {
                    @Suppress("DEPRECATION")
                    runCatching { pm.getInstallerPackageName(info.packageName) }.getOrNull()
                }
                val certs = JSONArray()
                val signers = info.signingInfo?.apkContentsSigners ?: emptyArray()
                for (sig in signers) {
                    sha1.reset()
                    certs.put(sha1.digest(sig.toByteArray()).joinToString("") { "%02X".format(it) })
                    sha256.reset()
                    certs.put(sha256.digest(sig.toByteArray()).joinToString("") { "%02X".format(it) })
                }
                apps.put(
                    JSONObject()
                        .put("pkg", info.packageName)
                        .put("label", pm.getApplicationLabel(ai).toString())
                        .put("system", system)
                        .put("hasLauncher", launch)
                        .put("installer", installer ?: JSONObject.NULL)
                        .put("certs", certs),
                )
            }
        }
        out.put("apps", apps)
        return out.toString()
    }

    private fun appLabel(pm: PackageManager, pkg: String): String =
        runCatching { pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString() }.getOrDefault(pkg)
}
