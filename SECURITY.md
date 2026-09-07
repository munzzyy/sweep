# Security policy

Sweep is aimed at people who may be in danger, so reports get taken
seriously and answered fast.

## Reporting

Email Munzzyy1@proton.me, or use GitHub's private vulnerability reporting on
this repository. You will get an answer within 72 hours.

Especially interested in:

- A check that misses what it claims to catch (an indicator-list app not
  matched, an active admin or accessibility service not listed).
- Results or scan data persisting anywhere after the screen is left.
- Any network traffic from the app at all.
- Wording anywhere in the app that could escalate danger for someone
  being watched; treat copy as attack surface here.

## Scope notes

- Spyware absent from the indicator dataset is a dataset gap; report it
  upstream to Echap's stalkerware-indicators as well.
- "Found nothing" not meaning "safe" is the documented design, not a
  bug.

## No bounty

There is no money behind this project. What you get is a fast fix, credit in
the changelog if you want it, and a tool that stays trustworthy.
