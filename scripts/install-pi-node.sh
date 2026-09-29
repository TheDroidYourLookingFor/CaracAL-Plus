#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this script as the normal non-root deployment user; it will request sudo only for Ubuntu package installation." >&2
  exit 1
fi

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  echo "Node.js $(node --version) and npm $(npm --version) are already installed."
else
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Ubuntu apt-get is unavailable; install Node.js 18+ and npm, then rerun." >&2
    exit 1
  fi
  echo "Installing Ubuntu's ARM64 Node.js/npm packages; sudo may prompt in this terminal."
  sudo apt-get update
  sudo apt-get install -y nodejs npm
fi

cd "$ROOT"
exec bash "$ROOT/scripts/setup-new-server.sh" "$@"
