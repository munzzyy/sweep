#!/usr/bin/env python3
# Refreshes the bundled detection data from Echap's stalkerware-indicators
# repository (CC-BY 4.0; attribution lives in the app's Data sources screen
# and in app/data/NOTICE.md). Build-time only: the app itself never fetches.
#
#   python3 tools/fetch-indicators.py [path-to-ioc.yaml]
#
# Without an argument it downloads the current master ioc.yaml.

import json
import sys
import urllib.request
from datetime import date

import yaml

URL = "https://raw.githubusercontent.com/AssoEchap/stalkerware-indicators/master/ioc.yaml"

if len(sys.argv) > 1:
    raw = open(sys.argv[1], "rb").read()
else:
    raw = urllib.request.urlopen(URL, timeout=30).read()

entries = yaml.safe_load(raw)

apps = []
for entry in entries:
    if not isinstance(entry, dict):
        continue
    packages = entry.get("packages") or []
    certs = entry.get("certificates") or []
    if not packages and not certs:
        continue
    apps.append(
        {
            "name": entry.get("name", "unknown"),
            "type": entry.get("type", ""),
            "packages": sorted(set(p for p in packages if isinstance(p, str))),
            "certificates": sorted(
                set(c.upper().replace(":", "") for c in certs if isinstance(c, str))
            ),
        }
    )

out = {
    "source": "https://github.com/AssoEchap/stalkerware-indicators",
    "license": "CC-BY 4.0 (Echap)",
    "fetched": date.today().isoformat(),
    "apps": sorted(apps, key=lambda a: a["name"].lower()),
}

with open("app/data/indicators.json", "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)

n_pkgs = sum(len(a["packages"]) for a in apps)
n_certs = sum(len(a["certificates"]) for a in apps)
print(f"wrote app/data/indicators.json: {len(apps)} families, {n_pkgs} packages, {n_certs} certificates")
