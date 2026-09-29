#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/config/code-sync.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT/config/code-sync.env"
  set +a
fi

: "${AL_CODE_API_TOKEN:?Set AL_CODE_API_TOKEN in config/code-sync.env first}"
exec node "$ROOT/scripts/sync-account-code.js" --root "$ROOT" "$@"
