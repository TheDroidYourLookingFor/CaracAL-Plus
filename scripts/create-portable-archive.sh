#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="${1:-$(dirname "$ROOT")/CaracALPlus-portable-$STAMP.zip}"
OUTPUT="$(readlink -m "$OUTPUT")"

if ! command -v zip >/dev/null 2>&1; then
  echo "The zip command is required to create the portable archive." >&2
  exit 1
fi
if [[ -e "$OUTPUT" ]]; then
  echo "Refusing to overwrite existing archive: $OUTPUT" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"
TEMP="$(mktemp "$(dirname "$OUTPUT")/.CaracALPlus-archive.XXXXXX.zip")"
rm -f "$TEMP"
cleanup() {
  rm -f "$TEMP"
}
trap cleanup EXIT

(
  cd "$ROOT"
  zip -qr "$TEMP" . \
    -x './.env' \
    -x './.env' \
    -x './config/pi-auth-password.txt' \
    -x './config/code-sync.env' \
    -x './vendor/caracAL/config.js' \
    -x './vendor/caracAL/localStorage/*' \
    -x './vendor/caracAL/node_modules/*' \
    -x './logs/*' \
    -x './runtime/*' \
    -x './.env' \
    -x './docker-compose.yml' \
    -x './Caddyfile' \
    -x './caddy-data/*' \
    -x './caddy-config/*' \
    -x './deploy-backups/*' \
    -x './*.zip' \
    -x './*.zip.sha256'
)
mv "$TEMP" "$OUTPUT"
trap - EXIT
sha256sum "$OUTPUT" > "$OUTPUT.sha256"
printf 'Archive: %s\n' "$OUTPUT"
printf 'SHA256:  %s\n' "$OUTPUT.sha256"
printf 'Bytes:   %s\n' "$(stat -c '%s' "$OUTPUT")"
