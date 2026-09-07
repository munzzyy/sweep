# Sweep on iOS

The `ios/` directory is a native wrapper around the exact same `app/` the
website and the Android APK ship: a WKWebView serving the bundle on the fixed
origin `sweep://localhost`, with no networking code of its own.

## Build it

You need a Mac with Xcode 15 or newer. The Xcode project is generated, not
checked in:

```
brew install xcodegen
cd ios
xcodegen generate
open Sweep.xcodeproj
```

Before you press run: open the Sweep target's Signing & Capabilities tab and
pick your own team under "Automatically manage signing". A fresh checkout
fails to build without this step ("Signing for 'Sweep' requires a
development team"), because `ios/project.yml` deliberately ships no team of
its own. If Xcode complains the bundle ID is already taken, change
`io.github.munzzyy.sweep` to anything unique to you; it does not need to
match the published app.

With a free Apple ID, Xcode signs a personal build that runs on your own
device for 7 days at a time; App Store or TestFlight distribution needs a
paid developer account, and Sweep is not published there today. The first
time you run it on a physical phone, iOS will refuse to open it until you
trust the developer profile: Settings > General > VPN & Device Management,
tap your Apple ID under Developer App, then Trust.

CI builds the wrapper for the iOS simulator on every push and fails if a
permission prompt or an App Transport Security exception ever appears in the
built Info.plist. What CI cannot do is run it on physical hardware or drive
VoiceOver, so treat device behavior, including accessibility, as verified by
people, not by the pipeline.

## The checkup cannot run here, and that is not a bug to fix

Sweep is Android only by design, and iOS is why. The whole checkup is
`QUERY_ALL_PACKAGES`: the one permission that lets an app list what else is
installed, plus reads of active device admins and enabled accessibility
services. iOS has no equivalent of any of the three. A sandboxed app cannot
enumerate other installed apps, cannot see device-admin state, and cannot
read the accessibility-services list; there is no scaled-down version of this
checkup Apple's platform allows. The `ios/` wrapper injects no bridge object
for the checkup itself. `globalThis.SweepNative` is undefined on purpose, and
`app/js/main.js` already has a real fallback for that case: it shows the
same explainer-only mode a desktop browser sees, with the Run button hidden
and a line pointing at the Android APK instead. That is not a placeholder
waiting for a future iOS bridge; it is the honest state of what this
platform allows.

If a domestic-violence support org's review of this app ever changes what
gets shipped for iOS, it changes this file first.

## What is different from Android, honestly

- **There is no checkup, only the explanation.** Android's five checks do not
  exist on iOS in any form; see above. What ships here is the same
  plain-language explanation of what the checks look for and why, which is
  also what a plain browser sees.
- **The network guarantee is weaker.** Android lets an app ship without the
  INTERNET permission, so the OS itself stops Sweep from ever opening a
  connection. iOS has no such permission. What holds the line here is two
  things together: the wrapper contains no networking code of its own, and
  the meta Content-Security-Policy the page itself carries (nothing loads
  from the network but `'self'`; inline `data:` images are the one local
  extra) bounds what the page's own script can fetch. That CSP
  is a page-level guarantee, not an OS-level one, and it does not reach a
  tapped `https` link, which deliberately opens in Safari and does use the
  network, by design, because you asked it to.
- **App-switcher privacy works differently.** Android uses FLAG_SECURE; the
  iOS wrapper covers the window with a blur shield the moment the app leaves
  the foreground. There is never a results screen to hide here, but the
  explainer text itself names "stalkerware" and the domestic-violence
  hotline, and for the person this app is for, a task-switcher glimpse of
  those words is its own risk. The shield covers that too. What the shield
  does NOT cover: iOS has no equivalent of FLAG_SECURE for screenshots or
  screen recording, so both remain possible on iOS in a way they are not on
  Android.
- **Leave fast backgrounds the app; it cannot close it.** No iOS app can
  quit or minimize itself, so Leave fast does the strongest thing this
  platform allows: it resets the page back to its start screen (so nothing
  from this visit is left loaded), then opens an ordinary weather site in
  Safari, which pushes Sweep behind it. Sweep itself is still running in the
  background, and it still shows up in the app switcher and the phone's own
  installed-apps list, the same honest residue described below and in
  docs/THREAT-MODEL.md. Opening Safari is a system hand-off, not Sweep
  making a network request of its own; the app still has no networking code.
  If the exit bridge is ever missing from a build (a stale wrapper, for
  example), the page says so out loud instead of sitting there looking like
  it worked.
- **Backups.** Android ships with backups disabled outright
  (`allowBackup="false"`). iOS has no exact equivalent, so the wrapper marks
  its own WebKit data directory excluded from iCloud and iTunes/Finder
  backups at launch. Sweep persists exactly one thing either way: the
  `sweep-locale` language preference. There is no results history to
  protect, because results are never written to disk on any platform.
- **Home-screen and task-switcher visibility.** Same honest residue Android
  has: Sweep appears in the phone's own installed-apps list and app switcher
  like any other app, whether it arrived as the wrapper or as an
  Add-to-Home-Screen icon. If that visibility is itself a risk, see
  docs/THREAT-MODEL.md's "The device is the boundary" section before
  installing anything.

## Accessibility

- **Dynamic Type** reaches the page the way Android's `textZoom` does: the
  wrapper reads `UIContentSizeCategory` and scales `webView.pageZoom`
  accordingly, and it keeps listening for changes, so adjusting text size
  while the app is open takes effect immediately without a relaunch.
- **VoiceOver** reads the same HTML, CSS, and ARIA the web app ships
  everywhere else; nothing in the wrapper changes how the page is exposed to
  it. What is not yet verified is a full VoiceOver pass on physical iOS
  hardware; CI cannot do that, so treat it as unverified until someone runs
  it on a device.
- **Verify on device, by hand, before shipping a change here:** VoiceOver
  reaches every control (the exit button, the language picker, both
  screens), and increasing the system text size in Settings actually grows
  the page without a relaunch.

## The no-install alternative

Safari on iOS can install the hosted app directly: open the site, tap Share,
then "Add to Home Screen". That copy shows exactly the same explainer-only
mode as the wrapper, for the same reason: no browser on any platform can list
installed apps either. As of this writing there is no hosted copy of `app/`
at a public URL yet; this section describes what will work once one exists,
not a link you can follow today. The wrapper exists for people who prefer a
real app binary whose contents are pinned by a release they can verify.

## Beta means beta

Sweep's plan of record is review by the organizations that do this work
(NNEDV, the Coalition Against Stalkerware) before it is promoted to anyone in
crisis. The iOS wrapper carries the same beta line the app shows everywhere
else and is not a separate, more-finished product.

## One rule for maintainers

`sweep://localhost` is the storage origin. Renaming the scheme or the host
orphans the one thing Sweep persists, the `sweep-locale` language
preference, with no migration path. Never change it.
