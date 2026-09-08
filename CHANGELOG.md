# Changelog

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
