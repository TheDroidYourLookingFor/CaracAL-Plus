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
CLIENT_PORT="${CLIENT_PORT:-8088}"
PI_MONITOR_PORT="${PI_MONITOR_PORT:-9024}"
HOST_IP="${HOST_IP:-$(hostname -I 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i !~ /^127\./ && $i !~ /:/) {print $i; exit}}')}"
HOST_IP="${HOST_IP:-localhost}"
printf 'Project: %s\n' "$ROOT"
printf 'Client: '
if curl -fsS --max-time 2 "http://localhost:$CLIENT_PORT/index.html" -o /dev/null 2>/dev/null; then
  echo "running at http://${HOST_IP}:$CLIENT_PORT/"
else
  echo 'not running'
fi
printf 'caracAL: '
if pgrep -af 'node .*caracAL/main.js' >/dev/null 2>&1; then
  echo 'running'
else
  echo 'not running'
fi
printf 'Dashboard: '
if curl -fsS --max-time 2 "http://localhost:$PI_MONITOR_PORT/" -o /dev/null 2>/dev/null; then
  echo "available at http://${HOST_IP}:$PI_MONITOR_PORT/"
else
  echo 'not running'
fi
