#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/load-env.sh" ]]; then source "$SCRIPT_DIR/load-env.sh"; else source "$SCRIPT_DIR/scripts/load-env.sh"; fi
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARACAL="$ROOT/vendor/caracAL"

# These files are shell-style environment files. Export sourced assignments so
# child processes (including CODE Sync and the headless client) receive them.
set -a
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env"
fi
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env"
fi
if [[ -f "$ROOT/config/code-sync.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/config/code-sync.env"
fi
set +a

if [[ "${AL_SESSION:-}" == "replace-with-adventure-land-session" || "${AL_SESSION:-}" == "your-session-value" ]]; then
  unset AL_SESSION
fi

if [[ ! -f "$CARACAL/config.js" && -z "${AL_SESSION:-}" ]]; then
  echo "No caracAL config or valid AL_SESSION is configured." >&2
  echo "Run scripts/configure-headless.sh in the Pi terminal first." >&2
  exit 1
fi

if [[ ! -f "$CARACAL/config.js" ]]; then
  cp "$ROOT/config/caracAL.config.example.js" "$CARACAL/config.js"
fi

if [[ -z "${ADVENTURELAND_CODE_ROOT:-}" ]]; then
  if [[ -d "$ROOT/../SYNC/adventureland" ]]; then
    export ADVENTURELAND_CODE_ROOT="$ROOT/../SYNC/adventureland"
  else
    export ADVENTURELAND_CODE_ROOT="$ROOT/CODE/adventureland"
  fi
fi

if [[ "${AL_CODE_SYNC_ON_START:-true}" != "false" ]]; then
  if [[ "${AL_CODE_API_TOKEN:-}" =~ ^mcp_[A-Za-z0-9_-]+$ ]]; then
    node "$ROOT/scripts/sync-account-code.js" --root "$ROOT" --quiet || {
      echo "CODE_SYNC_FAILED: startup sync did not complete; continuing with the local CODE tree." >&2
    }
  elif [[ -n "${AL_CODE_API_TOKEN:-}" ]]; then
    echo "CODE_SYNC_SKIPPED: AL_CODE_API_TOKEN must start with mcp_; continuing with the local CODE tree." >&2
  fi
fi

if [[ -d "$ROOT/scripts/headless" ]]; then
  mkdir -p "$ADVENTURELAND_CODE_ROOT/headless"
  for entry in Merchant.js Trio.js; do
    # The CODE mirror may be root-owned but intentionally writable by the
    # runtime user.  cp updates existing files without trying to chmod them.
    cp "$ROOT/scripts/headless/$entry" "$ADVENTURELAND_CODE_ROOT/headless/$entry"
  done
fi

# caracAL writes its rotating log relative to its working directory. The
# deployment package intentionally excludes runtime logs, so recreate the
# directory on every start instead of relying on an archived empty folder.
install -d -m 750 "$CARACAL/logs"

cd "$CARACAL"
if [[ -n "${AL_SESSION:-}" ]]; then
  exec env AL_SESSION="$AL_SESSION" node main.js
else
  exec node main.js
fi
