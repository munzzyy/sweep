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
known password, an old backup. If your gut disagrees with a clean
checkup, your gut has more information than this app does.

## Why the other lists exist

Device admins, accessibility services, iconless apps, and sideloads are
where surveillance capabilities LIVE, and each list has perfectly
innocent members: your employer's management tool, your screen reader,
system helpers, apps you sideloaded yourself. Sweep does not score them,
because a score teaches people to stop reading. It shows the list and
says what the power means, so the one entry you never granted stands out
to the only person who can recognize it: you.

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
