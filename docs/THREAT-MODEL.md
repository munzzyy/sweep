# Sweep threat model

Who this helps, what the checks can and cannot see, and why the wording
is the way it is.

## What a match means

An installed app matched a public list of known surveillance products,
by package name or by the certificate it was signed with. That list
(Echap's stalkerware-indicators) is maintained by people who track this
industry; a match is a strong signal, not a stray heuristic. What a
match does NOT tell you is who installed it, when, or what to do next,
and the app's first advice is the important part: if the person who may
have installed it is someone in your life, removal and confrontation can
escalate things, and some products alert their controller on removal.
Advocates plan this safely every day. Call before you act.

## What found-nothing means

Exactly what it says, and no more. The checks cover the mechanisms
commodity stalkerware actually uses, and commodity products are most of
what people encounter. But spyware sold to governments does not sit in
the app list waiting to be matched, dual-use apps (family trackers,
find-my tools) can be abuse in the wrong hands while looking legitimate,
and watching can also happen off the phone entirely: a shared account, a
known password, an old backup. The accessibility check specifically only
sees a service that is turned on right now; screen mirroring apps, remote
support tools, root-level capture, and a person standing behind the phone
read the screen without ever touching that list. If your gut disagrees
with a clean checkup, your gut has more information than this app does.

## Why the other lists exist

Device admins, accessibility services, iconless apps, and sideloads are
where surveillance capabilities LIVE, and each list has perfectly
innocent members: your employer's management tool, your screen reader,
system helpers, apps you sideloaded yourself. Sweep does not score them,
because a score teaches people to stop reading. It shows the list and
says what the power means, so the one entry you never granted stands out
to the only person who can recognize it: you.

## Why the results screen waits behind a notice

When an accessibility service is turned on that Sweep does not recognize
as a known screen reader, results wait behind one extra tap instead of
rendering straight away. That extra step lands in exactly the runs where
the phone may already be watched, which means more time with the app
open in front of a possible watcher. That tradeoff is deliberate, not an
oversight: rendering the results of a stalkerware checkup straight onto
a screen that something else can already read would hand a watcher the
one piece of information the whole app exists to keep from them, on the
one run where it matters most. One more screen, with Leave fast still
live on it, is worth that risk. Sweep cannot tell a real screen reader
from a lookalike claiming its name, so the notice appears whenever the
list holds anything it cannot vouch for, screen reader or not.

## The accessibility gate assumes an unrooted device

unrecognizedAccessibility() waves a service through when its package name
matches TalkBack or Voice Access AND PackageManager reports it as a
system app. Both facts come from the same source, and neither is signed:
FLAG_SYSTEM is a bit PackageManager hands back, not a certificate. A
normal sideloaded install cannot set that bit, which is what closes the
cheap version of this attack. A device the attacker has rooted is a
different case: a Magisk systemless module, or a straight push to
/system on an unlocked bootloader, can make PackageManager report any
package as a system app, name it after TalkBack, turn it on, and walk
through the gate. Sustained physical access to root a phone sits well
inside who this app is written for, so that gap is real and worth
writing down rather than papered over with a check that sounds stronger
than it is.

What it costs, specifically: skipping the gate skips the pause screen,
nothing more. The results card lists every enabled accessibility service
by name regardless of whether it matched the allowlist (app/js/main.js,
the "Accessibility services, turned on" card), so a spoofed TalkBack
still shows up on the list a reading user sees. What's lost is the extra
beat of friction in front of a possible watcher, not the entry itself.

Certificate pinning, the same approach matchKnown already uses for the
indicator list, would close this: require the signing certificate match
a hardcoded expected value, not just the flag. Doing that honestly needs
the real signing certificate SHA-256 for these two Google packages, read
off a genuine device or a source as verifiable as the indicator feed
this app already trusts. I don't have either in hand, so I'm not
hardcoding a guess; a wrong constant would either silently do nothing or
lock out a real screen reader on a clean phone. Left as the honest floor
until that value can be sourced properly.

One more thing worth naming: root access does not stop at this one
check. Every fact in a scan, the app list, the certificates, the system
flag, comes from PackageManager, and a rooted device can lie to
PackageManager about any of it. Cert pinning would raise the cost of
spoofing accessibility specifically, but it would not change the
underlying fact that root compromise means Sweep is asking a phone that
may already be lying to tell the truth about itself.

## The device is the boundary

Sweep reads the app list, active admins, and enabled accessibility
services, on the phone, and can transmit none of it: there is no INTERNET
permission for the OS to honor. Results render to the screen and nowhere
else; there is no results file, no history, no analytics. The screen is
protected from app-switcher thumbnails, and Leave fast closes and removes
the task in one tap. One honest residue remains: Sweep appears in the
phone's own installed-apps list like anything else, so someone inspecting
the phone can see a checkup tool was installed. If that visibility is
itself a risk, borrow a trusted person's phone to read about your options
first (techsafety.org), and consider whether installing anything is the
right move.

The same residue applies to the iOS wrapper and to the Add-to-Home-Screen
copy of the web app, and one more thing on top: iOS gives no app a way to
close itself, so Leave fast backgrounds Sweep into Safari instead of ending
it, and Sweep still shows up in the app switcher afterward. docs/IOS.md's
"What is different from Android, honestly" section covers this and the
platform's weaker network guarantee in full; read it before trusting the
iOS build the way you would trust the Android one.

## If the phone is already hostile

A device with stalkerware on it may be showing its controller your
screen, including this app. That is uncomfortable and true. It is also
why the checkup keeps no history, why the exit is fast, and why the
guidance says to involve people OFF this phone. For a phone you believe
is compromised, the strong play is a checkup someone runs FOR you from a
safe device; TinyCheck and a local advocacy organization do exactly that.
