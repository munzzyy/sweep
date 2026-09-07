# Sweep

[![release](https://img.shields.io/github/v/release/munzzyy/sweep)](https://github.com/munzzyy/sweep/releases/latest) [![ci](https://github.com/munzzyy/sweep/actions/workflows/ci.yml/badge.svg)](https://github.com/munzzyy/sweep/actions/workflows/ci.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-7a5817)](LICENSE)

A plain-language phone checkup. Beta.

Somebody wondering whether their phone is watching them has two options
today: closed-source scanner apps that ask to be trusted blindly, or
serious forensic tools that need a second computer and a trained
advocate. Sweep sits in the gap: open source, runs on the phone itself,
and explains what it finds in sentences.

Five checks. Installed apps get compared against Echap's public
stalkerware-indicators dataset, by exact package name, by wildcard family
prefix, and by signing certificate so a renamed copy still matches. Then
the phone's own risk surfaces get listed with plain explanations: device
admin apps, enabled accessibility services, apps with no launcher icon,
and apps installed from outside any store.

The language is the product as much as the code. Sweep never says "you
are safe", because no checkup can know that; a clean run says "these
specific checks found nothing" and means it. A match leads with the
warning that matters: removing stalkerware or confronting the person who
installed it can escalate a dangerous situation, talk to an advocate
first, and the hotline numbers are right there. Results are never stored,
and a Leave fast button sits on every screen.

<p align="center">
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/1.png" width="31%" alt="Results with a stalkerware match: a calm alarm card leading with do-not-confront guidance">
  <img src="fastlane/metadata/android/en-US/images/phoneScreenshots/2.png" width="31%" alt="Results on a clean scan: found-nothing language with the honest hedge">
</p>

## Get it

Android only, by design: install [sweep.apk](https://github.com/munzzyy/sweep/releases/latest/download/sweep.apk)
(the link always points at the current release, so Obtainium can track
it). The web page explains the checks but cannot run them, because a
web page cannot and should not see your installed apps.

## Trust math

One permission: QUERY_ALL_PACKAGES, which IS the checkup. No INTERNET
permission, so nothing Sweep sees can leave the phone, enforced by the
OS and checkable in the manifest. The indicator data ships inside the app
with attribution (CC-BY 4.0, Echap) and is refreshed at build time by
`tools/fetch-indicators.py`, never at runtime. QUERY_ALL_PACKAGES makes
this app a poor fit for Play's policies; it is built for F-Droid and
sideloading, where the tradeoff can be explained instead of buried.

`npm test` runs the matcher against the real dataset with positive and
negative controls. `npm run e2e` drives the page with stubbed scans: a
planted stalkerware package must surface with the family named, and a
clean scan must produce the hedged found-nothing language, never a
verdict.

## Beta means beta

The plan of record is review by the organizations that do this work
(NNEDV, the Coalition Against Stalkerware) before Sweep is promoted to
anyone in crisis. Until then it is one tool with stated limits, not an
authority.

MIT. Indicator data CC-BY 4.0 by Echap.
