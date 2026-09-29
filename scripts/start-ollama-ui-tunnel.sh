#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="/opt/CaracALPlus/config"
KEY="$CONFIG_DIR/caracal-ollama-ui-tunnel"
KNOWN_HOSTS="$CONFIG_DIR/caracal-ollama-ui-tunnel.known_hosts"

: "${CARACAL_TUNNEL_BIND_ADDRESS:?Set CARACAL_TUNNEL_BIND_ADDRESS in config/ollama-ui-tunnel.env}"
: "${CARACAL_OLLAMA_HOST:?Set CARACAL_OLLAMA_HOST in config/ollama-ui-tunnel.env}"
: "${CARACAL_VPS_SSH_TARGET:?Set CARACAL_VPS_SSH_TARGET in config/ollama-ui-tunnel.env}"

is_ipv4() {
  local value="$1" octet
  local -a parts
  [[ "$value" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || return 1
  IFS=. read -r -a parts <<< "$value"
  for octet in "${parts[@]}"; do
    (( 10#$octet <= 255 )) || return 1
  done
}

for address in "$CARACAL_TUNNEL_BIND_ADDRESS" "$CARACAL_OLLAMA_HOST" "$CARACAL_VPS_SSH_TARGET"; do
  is_ipv4 "$address" || { echo 'OLLAMA_TUNNEL_REFUSED_INVALID_IPV4'; exit 20; }
done
[[ -r "$KEY" && -r "$KNOWN_HOSTS" ]] || {
  echo 'OLLAMA_TUNNEL_REFUSED_MISSING_OPT_CREDENTIALS'
  exit 20
}

exec /usr/bin/ssh -N -T \
  -i "$KEY" \
  -o IdentitiesOnly=yes \
  -o BatchMode=yes \
  -o ExitOnForwardFailure=yes \
  -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$KNOWN_HOSTS" \
  -o GlobalKnownHostsFile=/etc/ssh/ssh_known_hosts \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ConnectTimeout=10 \
  -p 2022 \
  -R "${CARACAL_TUNNEL_BIND_ADDRESS}:18002:${CARACAL_OLLAMA_HOST}:8001" \
  "codex@${CARACAL_VPS_SSH_TARGET}"
