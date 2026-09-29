#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
[[ "$ROOT" == /opt/CaracALPlus ]] || {
  echo 'CaracAL+ must be installed at /opt/CaracALPlus so application files and state stay under /opt.' >&2
  exit 1
}
cd "$ROOT"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this script as the account that owns the project; it may use sudo for Docker/package permissions." >&2
  exit 1
fi
command -v docker >/dev/null 2>&1 || { echo "Docker is required on a VPS; install/enable it, then rerun." >&2; exit 1; }
docker info >/dev/null 2>&1 && DOCKER=(docker) || DOCKER=(sudo -n docker)
"${DOCKER[@]}" info >/dev/null 2>&1 || { echo "Docker is unavailable to this account, and passwordless sudo did not work." >&2; exit 1; }
"${DOCKER[@]}" compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required." >&2; exit 1; }

mkdir -p config logs runtime caddy-data caddy-config vendor/caracAL/localStorage \
  .runtime-home/.config .runtime-home/.cache .runtime-home/.local/share .runtime-home/.local/state
if [[ ! -f .env || "$(grep -E '^AL_SESSION=(replace-with-adventure-land-session|your-session-value)?$' .env || true)" ]]; then
  read -r -s -p "Adventure Land AL_SESSION (input hidden): " al_session
  printf '\n'
  [[ -n "$al_session" ]] || { echo "AL_SESSION is required." >&2; exit 1; }
  printf '# Host-local runtime configuration. Keep this file private.\nAL_SESSION=%s\n' "$al_session" > .env
  unset al_session
fi
chmod 600 .env

if [[ ! -f config/code-sync.env ]]; then
  cp config/code-sync.env.example config/code-sync.env
fi
if ! grep -q '^AL_CODE_API_TOKEN=mcp_' config/code-sync.env; then
  read -r -s -p "Adventure Land VS Code API token (optional, starts with mcp_): " code_token
  printf '\n'
  if [[ -n "$code_token" ]]; then
    [[ "$code_token" =~ ^mcp_[A-Za-z0-9_-]+$ ]] || { echo "The Adventure Land API token must start with mcp_." >&2; exit 1; }
    printf '# Host-local Adventure Land CODE sync settings.\nAL_CODE_API_TOKEN=%s\nAL_CODE_SYNC_ON_START=true\n' "$code_token" > config/code-sync.env
  fi
  unset code_token
fi
chmod 600 config/code-sync.env

if [[ ! -f vendor/caracAL/config.js ]]; then
  cp config/caracAL.config.example.js vendor/caracAL/config.js
fi
chmod 600 vendor/caracAL/config.js

if [[ ! -s .env || "${1:-}" == "--reset-auth" ]]; then
  read -r -p "VPS web username [admin]: " auth_user
  auth_user="${auth_user:-admin}"
  while true; do
    read -r -s -p "VPS web password (input hidden): " auth_password
    printf '\n'
    read -r -s -p "Repeat VPS web password: " auth_again
    printf '\n'
    [[ -n "$auth_password" && "$auth_password" == "$auth_again" ]] && break
    echo "Passwords were empty or did not match; try again." >&2
  done
  printf '%s\n%s\n' "$auth_user" "$auth_password" | "${DOCKER[@]}" run --rm -i \
    -v "$ROOT:/app" -w /app \
    -e PI_AUTH_SECURE_COOKIE=true -e PI_AUTH_COOKIE_DOMAIN=.monitor.example \
    node:22-bookworm-slim node scripts/pi-auth.js --write-env /app/.env
  umask 077
  printf '%s\n' "$auth_password" > config/pi-auth-password.txt
  chmod 600 config/pi-auth-password.txt
  unset auth_user auth_password auth_again
fi
chmod 600 .env

install -m 0644 deploy/vps/docker-compose.yml docker-compose.yml
install -m 0644 deploy/vps/Caddyfile Caddyfile
touch vendor/caracAL/localStorage/caraGarage.jsonl
chmod 600 vendor/caracAL/localStorage/caraGarage.jsonl
chmod +x scripts/*.sh
# Both containers run as UID/GID 1000. Keep the versioned caches writable so
# the dashboard can download the next browser/runtime version atomically.
chown -R 1000:1000 client/export vendor/caracAL/game_files vendor/caracAL/localStorage logs runtime .runtime-home 2>/dev/null || true

COMPOSE=("${DOCKER[@]}" compose -f "$ROOT/docker-compose.yml")
if [[ ! -d vendor/caracAL/node_modules ]]; then
  "${COMPOSE[@]}" run --rm --no-deps client /bin/bash -lc 'cd /app/vendor/caracAL && npm ci --omit=dev'
fi
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d --force-recreate --remove-orphans
echo "VPS Docker deployment is running."
echo "Client: https://monitor.example/"
echo "Monitor: https://control.example/"
