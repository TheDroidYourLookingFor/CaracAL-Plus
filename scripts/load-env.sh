#!/usr/bin/env bash
set -euo pipefail

CARACAL_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARACAL_ENV_FILE="${CARACAL_ENV_FILE:-$CARACAL_PROJECT_ROOT/.env}"
if [[ -f "$CARACAL_ENV_FILE" ]]; then
  set -a
  # The local .env file is an operator-controlled shell environment file.
  # shellcheck disable=SC1090
  source "$CARACAL_ENV_FILE"
  set +a
fi
CARACAL_HOME="${CARACAL_HOME:-/opt/CaracALPlus}"
export CARACAL_HOME CARACAL_ENV_FILE

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    printf 'Missing required environment variable: %s. Set it in %s or the process environment.\n' "$name" "$CARACAL_ENV_FILE" >&2
    return 1
  fi
}