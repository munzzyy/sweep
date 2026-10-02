#!/bin/bash
# Usage: tools/verify-apk.sh dist/sweep-<version>.apk [dist/sweep-<version>.aab]
# Fails unless Sweep's release key, and only that key, signed the APK: any other key strands every install and the F-Droid build.
set -euo pipefail

CERT_SHA256=10319fc7dd916baa9e6e2e49a2323fa1b3ea395d50d36c4b966086e67b7e12e8
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
APKSIGNER="$SDK/build-tools/34.0.0/apksigner"

[ $# -ge 1 ] || { echo "usage: $0 <apk> [other release files]" >&2; exit 2; }
apk=$1
for f in "$@"; do
  [ -f "$f" ] || { echo "no such file: $f" >&2; exit 1; }
done
[ -x "$APKSIGNER" ] || { echo "apksigner not found at $APKSIGNER (build-tools 34.0.0)" >&2; exit 1; }

if ! out=$("$APKSIGNER" verify --print-certs "$apk" 2>&1); then
  printf '%s\n' "$out" | grep -v '^WARNING:' >&2
  echo "$apk does not verify" >&2
  exit 1
fi
digests=$(printf '%s\n' "$out" | sed -n 's/^Signer #[0-9]* certificate SHA-256 digest: //p')
count=$(printf '%s\n' "$digests" | grep -c . || true)
if [ "$count" -ne 1 ]; then
  echo "$apk has $count signers; a Sweep release has exactly one" >&2
  exit 1
fi
if [ "$digests" != "$CERT_SHA256" ]; then
  echo "$apk is signed by $digests, not Sweep's release key $CERT_SHA256" >&2
  exit 1
fi

echo '**Verify what you install**'
echo
echo '```'
for f in "$@"; do
  echo "sha256 $(basename "$f")  $(sha256sum "$f" | cut -d' ' -f1)"
done
echo "signing cert sha256  $CERT_SHA256"
echo '```'
