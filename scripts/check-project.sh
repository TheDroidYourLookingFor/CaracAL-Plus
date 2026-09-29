#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${ADVENTURELAND_CODE_ROOT:-}" ]]; then
  if [[ -d "$ROOT/../SYNC/adventureland" ]]; then
    ADVENTURELAND_CODE_ROOT="$ROOT/../SYNC/adventureland"
  else
    ADVENTURELAND_CODE_ROOT="$ROOT/CODE/adventureland"
  fi
fi
CODE_ROOT="$ADVENTURELAND_CODE_ROOT"
if [[ -n "${CLIENT_VERSION:-}" ]]; then
  VERSION="$CLIENT_VERSION"
elif [[ -f "$ROOT/client/export/LATEST_VERSION.txt" ]]; then
  VERSION="$(tr -d '\r\n' < "$ROOT/client/export/LATEST_VERSION.txt")"
else
  VERSION="16846"
fi
printf 'Project: %s\n' "$ROOT"
printf 'caracAL: '
git -C "$ROOT/vendor/caracAL" rev-parse --short HEAD
printf 'Client files: '
find "$ROOT/client/export/$VERSION" -type f | wc -l
printf 'Adventure Land code root: %s\n' "$CODE_ROOT"
printf 'Source code files: '
find "$CODE_ROOT/codes" -maxdepth 1 -type f -name '*.js' | wc -l
printf 'Character source files: '
find "$CODE_ROOT/characters" -maxdepth 1 -type f -name '*.js' | wc -l
