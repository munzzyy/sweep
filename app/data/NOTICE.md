# Data sources

Detection indicators (app/data/indicators.json) are derived from the
stalkerware-indicators dataset maintained by Echap:
https://github.com/AssoEchap/stalkerware-indicators

That dataset is licensed CC-BY 4.0
(https://creativecommons.org/licenses/by/4.0/). Sweep redistributes the
package names and certificate fingerprints with attribution and thanks;
Echap does not endorse this app. What ships is a filtered and reformatted
subset, not the full dataset: only names, aliases, type, package names,
certificate fingerprints, and certificate organization notes are kept,
entries carrying neither a package name nor a certificate are dropped, and
values are sorted and case-normalized. Refresh with
tools/fetch-indicators.py, which pins the exact upstream commit it reads.
