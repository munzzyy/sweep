# Changelog

## 0.5.0

A much deeper scan, and a report that opens with what it could not see.

- Every result now starts with the honest count: how many surfaces were
  read out of how many Sweep knows exist, with a concrete reason for each
  one it could not read. Three reasons never go away, because Android
  shows usage-access, overlay, and install-unknown grants only to
  privileged system apps. Saying that every time beats implying the
  check happened.
- Accessibility services show the capabilities the OS actually enforces
  for them: reading the screen, watching keys, seeing text as it is
  typed, tapping by itself, taking screenshots, and whether the service
  watches every app or only some. The old settings-string read stays as
  a cross-check, and a disagreement between the two records is itself
  reported.
- Per-app permission grants come straight from the OS grant table, so a
  finding says what an app can do on this phone right now: microphone,
  camera, location and background location, SMS, call log, contacts,
  calendar, and the rest. Appop-gated specials are reported as declared
  only, never claimed as granted.
- Device admins list their declared powers in plain words: erase this
  phone remotely, lock the screen, change the unlock password, watch
  failed unlocks, turn off the camera. An unreadable admin says so.
- New surfaces: enabled keyboards, certificate authorities a person
  added, VPN-capable apps plus the always-on VPN setting, default SMS
  and dialer holders, device and profile owners and work-profile
  presence, battery-optimization exemptions, boot receivers and declared
  background service types, install provenance including who started the
  install, and the USB and wireless debugging switches.
- Match wording is tiered by evidence. A certificate match speaks
  plainly; a package-name-only match says in the same sentence that
  names can be reused and the certificate did not corroborate; a prefix
  match alone never surfaces at all.
- Parental-monitoring products (the upstream watchware list) now ship in
  the data but live on a fully separate track with their own wording:
  presence alone does not mean misuse, and the track cannot borrow
  stalkerware language because it is a separate array and a separate
  renderer, not a flag on the same object.
- A disguise check that cannot fire on a name alone: it takes the
  system-app naming pattern, no system record, and an installer other
  than the Play Store together, and the legitimate counter-example rides
  in the same sentence as the warning.
- The indicator refresh is pinned to an exact upstream commit, validates
  every certificate and package shape, prints an added and removed diff
  against the committed data, and refuses a family-count swing over 20
  percent without an explicit flag. The bundled data records the commit
  it came from and carries family aliases for recognition.
- A labeled benign corpus (screen readers, password managers, Find My
  Device, MDM, family tools, a Play-updated Google app) holds the
  false-accusation floor at zero in CI, and spoofed twins of those same
  fixtures must diverge from their benign versions, so a dead rule fails
  the build instead of passing quietly.

## 0.4.0

Real headers on the site, and a pause before results if something else can already read the screen.

- The site now ships actual security headers instead of relying on the meta
  tag alone: nosniff, no framing, no referrer, a locked-down
  permissions policy, HSTS, and a Content-Security-Policy that matches
  index.html's exactly, so the two can never quietly disagree.
- Before results render, an accessibility service Sweep does not
  recognize now stops the scan on its own screen first: plain language
  that something else may already be reading whatever shows up next,
  naming screen readers and voice controls as real, legitimate holders
  of that same access rather than treating the access itself as
  suspicious. Continue to results or go back to home; either way the
  actual service still shows up in the list.
- That check first matched on package name alone, and a sideloaded app
  can name itself whatever it wants. It now also requires the app be
  flagged as a genuine system app, so a fake TalkBack can no longer
  talk its way past the warning it exists to trigger.
- A rooted phone can still forge that system flag along with the name,
  so this closes the cheap version of that gap, not the expensive one.
  Said plainly in the threat model instead of implied away.

## 0.3.0

A sixth check, honest dates, and a calmer way to say it.

- Notification access joins the checkup, with smartwatches and mirroring
  named as legitimate before anything is flagged.
- Every flagged entry says when it was installed and where it came from,
  newest first. Match cards say what else the app holds and what to do
  about admin access before uninstalling.
- The indicator list shows its age. Sweep checks itself on every scan and
  would report its own INTERNET permission if one ever appeared.
- A verdict banner, a staged reveal that never delays screen readers, and
  zero-item checks that recede without failing contrast.

## 0.2.0

The iOS round.

- An iOS wrapper in `ios/` on the permanent `sweep://localhost` origin. The
  checkup cannot run on iOS, no app can see what other apps are installed
  there, and the wrapper explains that instead of pretending; docs/IOS.md
  has its own section saying so.
- Leave fast works everywhere now: on iOS it resets the page and hands the
  screen to Safari on a neutral site, with a loud failure if the bridge is
  missing, and Escape leaves fast on the web too.
- An all-clear scan looks calm instead of warning-colored, screens move
  focus and announce, disclosures got real names and 44px targets, type is
  rem, and the copy explains sideloading to someone who has never heard
  the word.

## 0.1.0

First release, beta.

- Five checks in plain words: installed apps against Echap's public
  stalkerware indicators (by package name, wildcard family, and signing
  certificate), active device admins, enabled accessibility services,
  apps without launcher icons, and installs from outside any store.
- Survivor-safe language throughout: found-nothing is stated as exactly
  that, matches lead with do-not-confront guidance and hotline numbers,
  and results are never stored anywhere.
- Leave fast button on every screen; secure-screen flag; no history.
- One permission (QUERY_ALL_PACKAGES, the checkup itself) and no INTERNET,
  so findings cannot leave the phone. English and Spanish.
