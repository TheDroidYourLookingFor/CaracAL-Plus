#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this script as the account that owns the project; it may use sudo for Docker permissions." >&2
  exit 1
fi
command -v docker >/dev/null 2>&1 || { echo "Docker is required on the VPS." >&2; exit 1; }
docker info >/dev/null 2>&1 && DOCKER=(docker) || DOCKER=(sudo -n docker)
"${DOCKER[@]}" info >/dev/null 2>&1 || { echo "Docker is unavailable to this account, and passwordless sudo did not work." >&2; exit 1; }
"${DOCKER[@]}" compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required." >&2; exit 1; }

[[ -f docker-compose.yml ]] || { echo "Missing $ROOT/docker-compose.yml; run the VPS setup/deploy first." >&2; exit 1; }

read -r -p "VPS web username [admin]: " auth_user
auth_user="${auth_user:-admin}"
if [[ ! "$auth_user" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Username may contain only letters, numbers, dot, underscore, and hyphen." >&2
  exit 1
fi

while true; do
  read -r -s -p "New VPS web password (input hidden): " auth_password
  printf '\n'
  read -r -s -p "Repeat new VPS web password: " auth_again
  printf '\n'
  if [[ -z "$auth_password" ]]; then
    echo "Password cannot be empty." >&2
  elif [[ "$auth_password" != "$auth_again" ]]; then
    echo "Passwords did not match; try again." >&2
  else
    break
  fi
done

umask 077
printf '%s\n%s\n' "$auth_user" "$auth_password" | "${DOCKER[@]}" run --rm -i \
  -v "$ROOT:/app" -w /app \
  -e PI_AUTH_SECURE_COOKIE=true -e PI_AUTH_COOKIE_DOMAIN=.monitor.example \
  node:22-bookworm-slim node scripts/pi-auth.js --write-env /app/.env
printf '%s\n' "$auth_password" > config/pi-auth-password.txt
chmod 600 .env config/pi-auth-password.txt
unset auth_user auth_password auth_again

COMPOSE=("${DOCKER[@]}" compose -f "$ROOT/docker-compose.yml")
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d --force-recreate --no-deps headless client

echo "VPS web authentication updated. Existing login cookies were invalidated."
echo "Client: https://monitor.example/"
echo "Monitor: https://control.example/"
