# The page calls these by name through SweepBridge; losing a name breaks the bridge silently.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
