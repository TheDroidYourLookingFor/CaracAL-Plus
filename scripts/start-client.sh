#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/load-env.sh" ]]; then source "$SCRIPT_DIR/load-env.sh"; else source "$SCRIPT_DIR/scripts/load-env.sh"; fi
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  source "$ROOT/.env"
  set +a
fi
if [[ -f "$ROOT/.env" ]]; then
  set -a
  source "$ROOT/.env"
  set +a
fi
if [[ -n "${CLIENT_VERSION:-}" ]]; then
  VERSION="$CLIENT_VERSION"
elif [[ -f "$ROOT/client/export/LATEST_VERSION.txt" ]]; then
  VERSION="$(tr -d '\r\n' < "$ROOT/client/export/LATEST_VERSION.txt")"
else
  VERSION="16846"
fi
PORT="${CLIENT_PORT:-8088}"
CLIENT_ROOT="$ROOT/client/export/$VERSION"

detect_host_ip() {
  local address
  if command -v ip >/dev/null 2>&1; then
    address="$(ip -4 route get localhost 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") {print $(i + 1); exit}}')"
    if [[ -n "$address" ]]; then
      printf '%s' "$address"
      return
    fi
  fi
  hostname -I 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i !~ /^127\./ && $i !~ /:/) {print $i; exit}}'
}

HOST_IP="${HOST_IP:-$(detect_host_ip)}"
HOST_IP="${HOST_IP:-localhost}"

if [[ ! -f "$CLIENT_ROOT/index.html" ]]; then
  echo "Missing client export: $CLIENT_ROOT/index.html" >&2
  exit 1
fi

cd "$ROOT"
URL="http://${HOST_IP}:$PORT/"
HEALTH_URL="${URL}login"
SERVER_PID=""
if ! curl -fsS --max-time 2 "$HEALTH_URL" -o /dev/null 2>/dev/null; then
  node "$ROOT/scripts/pi-client-server.js" >"$ROOT/logs/client-http.log" 2>&1 &
  SERVER_PID=$!
  sleep 1
fi
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Local client: $URL"

if command -v chromium >/dev/null 2>&1 && [[ -n "${DISPLAY:-}" ]]; then
  exec chromium --user-data-dir="$ROOT/runtime/chromium-profile" --app="$URL"
fi

echo "Chromium was not started; open $URL on the Pi desktop."
if [[ -n "$SERVER_PID" ]]; then
  wait "$SERVER_PID"
else
  while true; do sleep 3600; done
fi
