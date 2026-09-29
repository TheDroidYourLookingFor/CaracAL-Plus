#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/opt/CaracALPlus}"
if [[ "$(id -u)" -ne 0 && ! -r "$ROOT/.env" ]]; then
  exec sudo -n bash "$0" "$ROOT"
fi

for required in "$ROOT/.env" "$ROOT/config/pi-auth-password.txt" "$ROOT/docker-compose.yml"; do
  [[ -f "$required" ]] || { echo "Missing: $required" >&2; exit 1; }
done

JAR="$(mktemp)"
HDR="$(mktemp)"
trap 'rm -f "$JAR" "$HDR"' EXIT
set -a
. "$ROOT/.env"
set +a
PASSWORD="$(cat "$ROOT/config/pi-auth-password.txt")"

check_status() {
  local label="$1" url="$2" expected="$3" code
  code="$(curl -sk -o /dev/null -w '%{http_code}' -b "$JAR" "$url")"
  echo "$label=$code"
  [[ "$code" == "$expected" ]]
}

login_code="$(curl -sk -D "$HDR" -o /dev/null -w '%{http_code}' -c "$JAR" \
  --data-urlencode "username=$PI_AUTH_USER" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode 'next=/' \
  -X POST https://monitor.example/login)"
echo "login=$login_code"
[[ "$login_code" == 302 ]]
grep -q 'pi_auth' "$JAR"
grep -Eiq '^set-cookie:.*Domain=\.caracalvps\.com.*Secure' "$HDR"

check_status client_root https://monitor.example/ 200
check_status monitor_root https://control.example/ 200
check_status hub 'https://monitor.example/_alhub/hub?pi_character=Character07' 200
check_status character 'https://monitor.example/character/Character07/in/US/III/' 200
check_status code https://control.example/CODE/adventureland/headless/Trio.js 200
check_status storage https://monitor.example/pi-storage/state 200
check_status resources https://control.example/pi-monitor/resources 200

sudo -n docker compose -f "$ROOT/docker-compose.yml" ps
for name in adventureland-headless adventureland-client adventureland-caddy; do
  [[ "$(sudo -n docker inspect -f '{{.State.Status}}' "$name")" == running ]]
done
client_version="$(tr -d '\r\n' < "$ROOT/client/export/LATEST_VERSION.txt")"
[[ "$client_version" =~ ^[0-9]+$ ]]
[[ -f "$ROOT/client/export/$client_version/index.html" ]]
client_html="$(curl -sk -b "$JAR" https://monitor.example/)"
grep -Fq "game.js?v=$client_version" <<< "$client_html"
sudo -n test -f "$ROOT/vendor/caracAL/localStorage/caraGarage.jsonl"

if sudo -n docker logs --since 5m adventureland-headless 2>&1 | grep -Eiq 'ECONNREFUSED|repeated upstream failure|uncaught exception'; then
  echo 'headless_recent_errors=1'
  exit 1
fi
echo 'headless_recent_errors=0'
echo 'VPS_PUBLIC_AUTH_HEALTH=PASS'
