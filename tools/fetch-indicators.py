#!/usr/bin/env python3
# Refreshes the bundled detection data from Echap's stalkerware-indicators
# repository (CC-BY 4.0; attribution lives in the app's Data sources screen
# and in app/data/NOTICE.md). Build-time only: the app itself never fetches.
#
#   python3 tools/fetch-indicators.py [--ioc PATH] [--watchware PATH]
#       [--out PATH] [--baseline PATH] [--force]
#
# Without file arguments it downloads both YAML files from the pinned
# upstream commit below. Bumping that pin is a deliberate, reviewed act:
# never fetch a moving branch.

import argparse
import json
import re
import sys
import urllib.request
from datetime import date

import yaml

UPSTREAM_COMMIT = "a04c5c1958bff93fec3b1b56edbb412b209f2a38"
RAW = f"https://raw.githubusercontent.com/AssoEchap/stalkerware-indicators/{UPSTREAM_COMMIT}"

PKG_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$")
CERT_RE = re.compile(r"^[0-9A-F]{40}$")

parser = argparse.ArgumentParser()
parser.add_argument("--ioc", help="local ioc.yaml instead of the pinned fetch")
parser.add_argument("--watchware", help="local watchware.yaml instead of the pinned fetch")
parser.add_argument("--out", default="app/data/indicators.json")
parser.add_argument("--baseline", help="diff against this file (default: --out if it exists)")
parser.add_argument("--force", action="store_true", help="allow a family-count swing over 20 percent")
args = parser.parse_args()


def load(path, url):
    if path:
        return yaml.safe_load(open(path, "rb").read())
    return yaml.safe_load(urllib.request.urlopen(url, timeout=30).read())


def die(msg):
    print(f"REFUSING to write: {msg}", file=sys.stderr)
    sys.exit(1)


def convert(entries, source_name):
    apps = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        packages = [p for p in (entry.get("packages") or []) if isinstance(p, str)]
        certs = [c for c in (entry.get("certificates") or []) if isinstance(c, str)]
        if not packages and not certs:
            continue
        name = entry.get("name", "unknown")
        for p in packages:
            if not PKG_RE.match(p):
                die(f"{source_name} family {name}: package does not look like a package: {p!r}")
        normalized = sorted(set(c.upper().replace(":", "") for c in certs))
        for c in normalized:
            if not CERT_RE.match(c):
                die(f"{source_name} family {name}: certificate is not 40 hex chars: {c!r}")
        app = {
            "name": name,
            "type": entry.get("type", ""),
            "packages": sorted(set(packages)),
            "certificates": normalized,
        }
        aliases = sorted(set(a for a in (entry.get("names") or []) if isinstance(a, str)))
        if aliases:
            app["aliases"] = aliases
        orgs = sorted(set(o for o in (entry.get("certificate_organizations") or []) if isinstance(o, str)))
        if orgs:
            app["certificateOrganizations"] = orgs
        cname = entry.get("certificate_cname_re")
        if isinstance(cname, str) and cname:
            app["certificateCnameRe"] = cname
        apps.append(app)
    return sorted(apps, key=lambda a: a["name"].lower())


def diff_key(label, old_list, new_list):
    old = {a["name"]: a for a in old_list}
    new = {a["name"]: a for a in new_list}
    added = sorted(set(new) - set(old))
    removed = sorted(set(old) - set(new))
    print(f"{label}: {len(old)} -> {len(new)} families")
    for n in added:
        print(f"  + {n}")
    for n in removed:
        print(f"  - {n}")
    for n in sorted(set(old) & set(new)):
        for field in ("packages", "certificates"):
            gained = sorted(set(new[n][field]) - set(old[n][field]))
            lost = sorted(set(old[n][field]) - set(new[n][field]))
            for v in gained:
                print(f"  {n}: + {field[:-1]} {v}")
            for v in lost:
                print(f"  {n}: - {field[:-1]} {v}")
    if old and not args.force:
        swing = abs(len(new) - len(old)) / len(old)
        if swing > 0.20:
            die(f"{label} family count swung {swing:.0%} (over 20%); rerun with --force if intended")


stalkerware = convert(load(args.ioc, f"{RAW}/ioc.yaml"), "ioc.yaml")
watchware = convert(load(args.watchware, f"{RAW}/watchware.yaml"), "watchware.yaml")

out = {
    "source": "https://github.com/AssoEchap/stalkerware-indicators",
    "license": "CC-BY 4.0 (Echap)",
    "commit": UPSTREAM_COMMIT,
    "fetched": date.today().isoformat(),
    "apps": stalkerware,
    "watchware": watchware,
}

baseline_path = args.baseline or args.out
try:
    baseline = json.load(open(baseline_path))
except (FileNotFoundError, json.JSONDecodeError):
    baseline = {}
diff_key("stalkerware", baseline.get("apps", []), stalkerware)
diff_key("watchware", baseline.get("watchware", []), watchware)

with open(args.out, "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)

n_pkgs = sum(len(a["packages"]) for a in stalkerware)
n_certs = sum(len(a["certificates"]) for a in stalkerware)
print(
    f"wrote {args.out}: {len(stalkerware)} stalkerware families ({n_pkgs} packages, {n_certs} certificates), "
    f"{len(watchware)} watchware families, upstream commit {UPSTREAM_COMMIT[:12]}"
)
