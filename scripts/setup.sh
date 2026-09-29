#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/load-env.sh" ]]; then source "$SCRIPT_DIR/load-env.sh"; else source "$SCRIPT_DIR/scripts/load-env.sh"; fi
set -euo pipefail
umask 077

# Portable first-run installer for CaracAL+.
#
# Native mode installs Node.js/npm and system-level systemd services.
# Docker mode installs Docker/Compose when needed and runs the headless and
# browser services from deploy/docker/docker-compose.yml. The existing
# setup-vps-docker.sh remains the production overlay for monitor.example.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "$ROOT" == /opt/CaracALPlus ]] || {
  echo 'CaracAL+ must be installed at /opt/CaracALPlus so application files and state stay under /opt.' >&2
  exit 1
}
MODE=""
RESET_AUTH=0
NON_INTERACTIVE=0
CLIENT_PORT="${CLIENT_PORT:-8088}"
MONITOR_PORT="${MONITOR_PORT:-9024}"
BIND_ADDRESS="${BIND_ADDRESS:-localhost}"
PUBLIC_CLIENT_DOMAIN="${PUBLIC_CLIENT_DOMAIN:-}"
PUBLIC_MONITOR_DOMAIN="${PUBLIC_MONITOR_DOMAIN:-}"
COOKIE_DOMAIN="${PI_AUTH_COOKIE_DOMAIN:-}"
SECURE_COOKIE="${PI_AUTH_SECURE_COOKIE:-}"
DOCKER=()
COMPOSE=()
APT_UPDATED=0

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/setup.sh [options]

Choose one deployment mode:
  --mode native                 Host Node.js + system systemd services
  --mode docker                 Docker Compose headless/client services

Common options:
  --reset-auth                  Replace the existing web username/password
  --client-port PORT            Host port for the full client (default 8088)
  --monitor-port PORT           Host port for the monitor (default 9024)
  --bind-address ADDRESS        Host bind address (default localhost)
  --cookie-domain DOMAIN        Cookie domain for shared public hostnames
  --secure-cookie               Mark login cookies Secure (use with HTTPS)
  --insecure-cookie             Do not mark login cookies Secure (default for LAN)
  --public-client-domain HOST   Enable Docker Caddy for the full client
  --public-monitor-domain HOST  Enable Docker Caddy for the monitor
  --non-interactive             Use existing host-local config; never prompt
  --help                        Show this help

Examples:
  bash scripts/setup.sh --mode native
  bash scripts/setup.sh --mode docker
  bash scripts/setup.sh --mode docker \
    --public-client-domain alc.example.com \
    --public-monitor-domain control.example.com \
    --cookie-domain .example.com --secure-cookie

The script must run as the normal account that should own the project. It may
use sudo to install packages and start Docker. It never copies credentials
from another host.
USAGE
}

die() {
  echo "CaracAL+ setup failed: $*" >&2
  exit 1
}

is_integer() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --mode)
        [[ $# -ge 2 ]] || die "--mode requires native or docker"
        MODE="$2"
        shift 2
        ;;
      --mode=*) MODE="${1#*=}"; shift ;;
      --reset-auth) RESET_AUTH=1; shift ;;
      --non-interactive) NON_INTERACTIVE=1; shift ;;
      --client-port)
        [[ $# -ge 2 ]] || die "--client-port requires a number"
        CLIENT_PORT="$2"
        shift 2
        ;;
      --client-port=*) CLIENT_PORT="${1#*=}"; shift ;;
      --monitor-port)
        [[ $# -ge 2 ]] || die "--monitor-port requires a number"
        MONITOR_PORT="$2"
        shift 2
        ;;
      --monitor-port=*) MONITOR_PORT="${1#*=}"; shift ;;
      --bind-address)
        [[ $# -ge 2 ]] || die "--bind-address requires an address"
        BIND_ADDRESS="$2"
        shift 2
        ;;
      --bind-address=*) BIND_ADDRESS="${1#*=}"; shift ;;
      --cookie-domain)
        [[ $# -ge 2 ]] || die "--cookie-domain requires a domain"
        COOKIE_DOMAIN="$2"
        shift 2
        ;;
      --cookie-domain=*) COOKIE_DOMAIN="${1#*=}"; shift ;;
      --secure-cookie) SECURE_COOKIE=true; shift ;;
      --insecure-cookie) SECURE_COOKIE=false; shift ;;
      --public-client-domain)
        [[ $# -ge 2 ]] || die "--public-client-domain requires a hostname"
        PUBLIC_CLIENT_DOMAIN="$2"
        shift 2
        ;;
      --public-client-domain=*) PUBLIC_CLIENT_DOMAIN="${1#*=}"; shift ;;
      --public-monitor-domain)
        [[ $# -ge 2 ]] || die "--public-monitor-domain requires a hostname"
        PUBLIC_MONITOR_DOMAIN="$2"
        shift 2
        ;;
      --public-monitor-domain=*) PUBLIC_MONITOR_DOMAIN="${1#*=}"; shift ;;
      --help|-h) usage; exit 0 ;;
      *) die "Unknown option: $1 (use --help)" ;;
    esac
  done

  if [[ -z "$MODE" && "$NON_INTERACTIVE" -eq 0 && -t 0 ]]; then
    read -r -p "Deployment mode [native/docker] (native): " MODE
    MODE="${MODE:-native}"
  fi
  MODE="${MODE,,}"
  [[ "$MODE" == "native" || "$MODE" == "docker" ]] || die "Choose --mode native or --mode docker"
  is_integer "$CLIENT_PORT" && (( CLIENT_PORT >= 1 && CLIENT_PORT <= 65535 )) || die "Invalid client port: $CLIENT_PORT"
  is_integer "$MONITOR_PORT" && (( MONITOR_PORT >= 1 && MONITOR_PORT <= 65535 )) || die "Invalid monitor port: $MONITOR_PORT"
  [[ -n "$BIND_ADDRESS" ]] || die "Bind address cannot be empty"
  if [[ "$MODE" == "native" && ( -n "$PUBLIC_CLIENT_DOMAIN" || -n "$PUBLIC_MONITOR_DOMAIN" ) ]]; then
    die "Public Docker hostnames are only valid with --mode docker"
  fi
  if [[ -n "$PUBLIC_CLIENT_DOMAIN" || -n "$PUBLIC_MONITOR_DOMAIN" ]]; then
    [[ -n "$PUBLIC_CLIENT_DOMAIN" && -n "$PUBLIC_MONITOR_DOMAIN" ]] || die "Provide both public hostnames"
    if [[ -z "$SECURE_COOKIE" ]]; then SECURE_COOKIE=true; fi
    [[ -n "$COOKIE_DOMAIN" ]] || die "Public hostnames require --cookie-domain, for example .example.com"
    if [[ "$BIND_ADDRESS" == "localhost" ]]; then
      BIND_ADDRESS="localhost"
    fi
  fi
  if [[ -z "$SECURE_COOKIE" ]]; then SECURE_COOKIE=false; fi
}

require_normal_user() {
  [[ "$(id -u)" -ne 0 ]] || die "Run this as the normal account that should own CaracAL+, not as root"
  command -v sudo >/dev/null 2>&1 || die "sudo is required to install missing system packages"
}

run_root() {
  sudo "$@"
}

apt_install() {
  command -v apt-get >/dev/null 2>&1 || die "apt-get is unavailable; install the missing packages manually"
  if [[ "$APT_UPDATED" -eq 0 ]]; then
    echo "Updating package lists; sudo may prompt in this terminal."
    run_root apt-get update
    APT_UPDATED=1
  fi
  run_root env DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
}

ensure_curl() {
  command -v curl >/dev/null 2>&1 || apt_install curl ca-certificates
}

ensure_native_dependencies() {
  command -v systemctl >/dev/null 2>&1 || die "systemd is required for native mode"
  local need_node=0
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    need_node=1
  else
    local major
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    (( major >= 18 )) || need_node=1
  fi
  if [[ "$need_node" -eq 1 ]]; then
    echo "Installing Node.js/npm from the system package manager."
    apt_install nodejs npm
  fi
  command -v node >/dev/null 2>&1 || die "Node.js installation did not provide node"
  command -v npm >/dev/null 2>&1 || die "Node.js installation did not provide npm"
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  (( node_major >= 18 )) || die "Node.js 18+ is required; found $(node --version)"
  ensure_curl
}

ensure_docker_dependencies() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Installing Docker Engine."
    apt_install docker.io
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "Installing Docker Compose v2."
    if ! apt_install docker-compose-v2; then
      apt_install docker-compose-plugin
    fi
  fi
  if command -v systemctl >/dev/null 2>&1; then
    run_root systemctl enable --now docker
  fi
  if docker info >/dev/null 2>&1; then
    DOCKER=(docker)
  elif sudo docker info >/dev/null 2>&1; then
    DOCKER=(sudo docker)
  else
    die "Docker is installed but unavailable to this account"
  fi
  "${DOCKER[@]}" compose version >/dev/null 2>&1 || die "Docker Compose v2 is required"
  ensure_curl
}

set_env_value() {
  local file="$1" key="$2" value="$3" escaped temporary
  escaped="${value//\\/\\\\}"
  escaped="${escaped//&/\\&}"
  escaped="${escaped//|/\\|}"
  temporary="$(mktemp "${file}.tmp.XXXXXX")"
  if [[ -f "$file" ]]; then
    sed "s|^${key}=.*|${key}=${escaped}|" "$file" > "$temporary"
  else
    : > "$temporary"
  fi
  if ! grep -q "^${key}=" "$temporary"; then
    printf '%s=%s\n' "$key" "$value" >> "$temporary"
  fi
  chmod 600 "$temporary"
  mv "$temporary" "$file"
}

ensure_project_layout() {
  cd "$ROOT"
  [[ -f "$ROOT/client/export/LATEST_VERSION.txt" ]] || die "Missing client/export/LATEST_VERSION.txt"
  [[ -f "$ROOT/vendor/caracAL/package.json" ]] || die "Missing vendor/caracAL/package.json"
  mkdir -p "$ROOT/config" "$ROOT/logs" "$ROOT/runtime" "$ROOT/vendor/caracAL/localStorage" "$ROOT/caddy-data" "$ROOT/caddy-config"
  touch "$ROOT/vendor/caracAL/localStorage/caraGarage.jsonl"
  chmod 600 "$ROOT/vendor/caracAL/localStorage/caraGarage.jsonl"
  chmod +x "$ROOT/scripts/"*.sh
}

ensure_runtime_config() {
  local file="$ROOT/.env" current session
  [[ -f "$file" ]] || cp "$ROOT/.env.example" "$file"
  current="$(sed -n 's/^AL_SESSION=//p' "$file" | head -n 1)"
  if [[ -z "$current" || "$current" == "replace-with-adventure-land-session" || "$current" == "your-session-value" ]]; then
    session="${AL_SESSION:-}"
    if [[ -z "$session" && "$NON_INTERACTIVE" -eq 0 ]]; then
      read -r -s -p "Adventure Land AL_SESSION (input hidden): " session
      printf '\n'
    fi
    [[ -n "$session" ]] || die "AL_SESSION is required; rerun interactively or set it in .env"
    set_env_value "$file" AL_SESSION "$session"
    unset session
  else
    echo "Keeping existing host-local Adventure Land session."
  fi
  set_env_value "$file" CLIENT_PORT "$CLIENT_PORT"
  if [[ "$MODE" == "native" ]]; then
    set_env_value "$file" PI_MONITOR_PORT "$MONITOR_PORT"
  else
    # The Docker network always uses 9024 internally; MONITOR_PORT is only
    # the host-published port in the generic Compose file.
    set_env_value "$file" PI_MONITOR_PORT "9024"
  fi
  chmod 600 "$file"
}

ensure_code_sync_config() {
  local file="$ROOT/config/code-sync.env" token
  [[ -f "$file" ]] || cp "$ROOT/config/code-sync.env.example" "$file"
  if ! grep -q '^AL_CODE_API_TOKEN=mcp_' "$file"; then
    token="${AL_CODE_API_TOKEN:-}"
    if [[ -z "$token" && "$NON_INTERACTIVE" -eq 0 ]]; then
      read -r -s -p "Adventure Land VS Code API token (optional, starts with mcp_): " token
      printf '\n'
    fi
    if [[ -n "$token" ]]; then
      [[ "$token" =~ ^mcp_[A-Za-z0-9_-]+$ ]] || die "The Adventure Land API token must start with mcp_"
      printf '# Host-local Adventure Land CODE sync settings.\nAL_CODE_API_TOKEN=%s\nAL_CODE_SYNC_ON_START=true\n' "$token" > "$file"
      unset token
    else
      echo "No CODE API token configured; the last local CODE mirror will be used."
    fi
  else
    echo "Keeping existing host-local CODE API token."
  fi
  chmod 600 "$file"
}

ensure_caracal_config() {
  if [[ ! -f "$ROOT/vendor/caracAL/config.js" ]]; then
    cp "$ROOT/config/caracAL.config.example.js" "$ROOT/vendor/caracAL/config.js"
    echo "Created vendor/caracAL/config.js from the disabled-character template."
  else
    echo "Keeping existing caracAL character configuration."
  fi
  chmod 600 "$ROOT/vendor/caracAL/config.js"
}

auth_is_configured() {
  [[ -s "$ROOT/.env" ]] && \
    grep -q '^PI_AUTH_USER=' "$ROOT/.env" && \
    grep -q '^PI_AUTH_PASSWORD_HASH=' "$ROOT/.env" && \
    grep -q '^PI_AUTH_SECRET=' "$ROOT/.env"
}

write_auth_with_native_node() {
  local user="$1" password="$2"
  printf '%s\n%s\n' "$user" "$password" | \
    env PI_AUTH_SECURE_COOKIE="$SECURE_COOKIE" PI_AUTH_COOKIE_DOMAIN="$COOKIE_DOMAIN" \
    node "$ROOT/scripts/pi-auth.js" --write-env "$ROOT/.env"
}

write_auth_with_docker_node() {
  local user="$1" password="$2"
  printf '%s\n%s\n' "$user" "$password" | \
    "${DOCKER[@]}" run --rm -i \
      -v "$ROOT:/app" -w /app \
      --user "$(id -u):$(id -g)" \
      -e "PI_AUTH_SECURE_COOKIE=$SECURE_COOKIE" \
      -e "PI_AUTH_COOKIE_DOMAIN=$COOKIE_DOMAIN" \
      node:22-bookworm-slim node scripts/pi-auth.js --write-env /app/.env
}

ensure_auth_config() {
  if [[ "$RESET_AUTH" -eq 0 ]] && auth_is_configured; then
    echo "Keeping existing web authentication configuration."
    chmod 600 "$ROOT/.env"
    return
  fi
  [[ "$NON_INTERACTIVE" -eq 0 ]] || die "Authentication is not configured; rerun without --non-interactive"
  local auth_user auth_password auth_again
  read -r -p "Web username [admin]: " auth_user
  auth_user="${auth_user:-admin}"
  [[ "$auth_user" =~ ^[A-Za-z0-9._-]+$ ]] || die "Username may contain only letters, numbers, dot, underscore, and dash"
  while true; do
    read -r -s -p "Web password (input hidden): " auth_password
    printf '\n'
    read -r -s -p "Repeat web password: " auth_again
    printf '\n'
    if [[ -z "$auth_password" ]]; then
      echo "Password cannot be empty." >&2
    elif [[ "$auth_password" != "$auth_again" ]]; then
      echo "Passwords did not match." >&2
    else
      break
    fi
  done
  if [[ "$MODE" == "native" ]]; then
    write_auth_with_native_node "$auth_user" "$auth_password"
  else
    write_auth_with_docker_node "$auth_user" "$auth_password"
  fi
  unset auth_user auth_password auth_again
  chmod 600 "$ROOT/.env"
}

install_native_dependencies() {
  if [[ ! -d "$ROOT/vendor/caracAL/node_modules" ]]; then
    echo "Installing caracAL dependencies."
    (cd "$ROOT/vendor/caracAL" && npm ci --omit=dev)
  else
    echo "Keeping existing caracAL node_modules."
  fi
}

sed_replacement() {
  printf '%s' "$1" | sed 's/[\\&|]/\\&/g'
}

install_native_units() {
  local unit_dir="/etc/systemd/system" root_replacement node_replacement source target temp_dir service_user
  root_replacement="$(sed_replacement "$ROOT")"
  node_replacement="$(sed_replacement "$(command -v node)")"
  service_user="$(id -un)"
  install -d -m 0700 \
    "$ROOT/.runtime-home" \
    "$ROOT/.runtime-home/.config" \
    "$ROOT/.runtime-home/.cache" \
    "$ROOT/.runtime-home/.local/share" \
    "$ROOT/.runtime-home/.local/state"
  temp_dir="$(mktemp -d "$ROOT/.systemd-units.XXXXXX")"
  for source in caracalplus-headless.user.service caracalplus-client.user.service; do
    target="${source/.user.service/.service}"
    sed -e "s|/opt/CaracALPlus|$root_replacement|g" \
        -e "s|User=USER|User=$service_user|g" \
        -e "s|/usr/bin/node|$node_replacement|g" \
        "$ROOT/systemd/$source" > "$temp_dir/$target"
    run_root install -D -o root -g root -m 0644 "$temp_dir/$target" "$unit_dir/$target"
  done
  rm -rf "$temp_dir"
  run_root systemctl daemon-reload
  run_root systemctl enable --now caracalplus-headless.service caracalplus-client.service
  echo "Native CaracAL+ system services are enabled and running."
}

write_docker_env() {
  local file="$ROOT/.env"
  [[ -f "$file" ]] || printf '# Generated by scripts/setup.sh; no credentials are stored here.\n' > "$file"
  set_env_value "$file" APP_UID "$(id -u)"
  set_env_value "$file" APP_GID "$(id -g)"
  set_env_value "$file" CLIENT_PORT "$CLIENT_PORT"
  set_env_value "$file" MONITOR_PORT "$MONITOR_PORT"
  set_env_value "$file" BIND_ADDRESS "$BIND_ADDRESS"
  chmod 600 "$file"
}

write_docker_caddyfile() {
  local file="$ROOT/Caddyfile"
  if [[ -n "$PUBLIC_CLIENT_DOMAIN" ]]; then
    {
      echo '# Generated by scripts/setup.sh; Docker public profile.'
      echo "$PUBLIC_CLIENT_DOMAIN {"
      echo '    encode zstd gzip'
      echo '    reverse_proxy client:8088'
      echo '}'
      echo
      echo "$PUBLIC_MONITOR_DOMAIN {"
      echo '    encode zstd gzip'
      echo '    @project_dashboard path /project-dashboard /project-dashboard/*'
      echo '    handle @project_dashboard {'
      echo '        reverse_proxy maintainer-dashboard:8090'
      echo '    }'
      echo '    @local_ollama_chat path /ollama-chat /ollama-chat/* /pi-ollama/*'
      echo '    handle @local_ollama_chat {'
      echo '        reverse_proxy client:8088'
      echo '    }'
      echo '    handle {'
      echo '        reverse_proxy headless:9024'
      echo '    }'
      echo '}'
    } > "$file"
  elif [[ ! -f "$file" ]]; then
    printf '# Public Caddy profile is disabled. Run setup.sh with both public hostnames to enable it.\n' > "$file"
  fi
  chmod 600 "$file"
}

install_docker_assets() {
  [[ -f "$ROOT/deploy/docker/docker-compose.yml" ]] || die "Missing deploy/docker/docker-compose.yml"
  if [[ -f "$ROOT/docker-compose.yml" ]] && ! grep -q 'CaracAL+ generic Docker mode' "$ROOT/docker-compose.yml"; then
    die "Refusing to overwrite existing docker-compose.yml; use scripts/setup-vps-docker.sh for the existing VPS overlay"
  fi
  install -m 0644 "$ROOT/deploy/docker/docker-compose.yml" "$ROOT/docker-compose.yml"
  write_docker_env
  write_docker_caddyfile
  COMPOSE=("${DOCKER[@]}" compose -f "$ROOT/docker-compose.yml")
  "${COMPOSE[@]}" config --quiet
  if [[ ! -d "$ROOT/vendor/caracAL/node_modules" ]]; then
    echo "Installing caracAL dependencies inside the Docker volume."
    "${COMPOSE[@]}" run --rm --no-deps headless /bin/bash -lc \
      'cd /app/vendor/caracAL && NPM_CONFIG_CACHE=/tmp/npm-cache npm ci --omit=dev'
  else
    echo "Keeping existing caracAL node_modules."
  fi
  if [[ -n "$PUBLIC_CLIENT_DOMAIN" ]]; then
    "${COMPOSE[@]}" --profile public up -d --remove-orphans
  else
    "${COMPOSE[@]}" up -d --remove-orphans
  fi
}

docker_service_is_running() {
  local service="$1" container_id status
  container_id="$("${COMPOSE[@]}" ps -q "$service")"
  [[ -n "$container_id" ]] || return 1
  status="$("${DOCKER[@]}" inspect -f '{{.State.Status}}' "$container_id")"
  [[ "$status" == "running" ]]
}

validate_docker_installation() {
  docker_service_is_running headless || die "Docker headless service is not running"
  docker_service_is_running client || die "Docker client service is not running"
  curl -fsS --max-time 8 "http://localhost:$CLIENT_PORT/login" -o /dev/null || die "Client login endpoint did not respond on port $CLIENT_PORT"
  curl -fsS --max-time 8 "http://localhost:$MONITOR_PORT/login" -o /dev/null || die "Monitor login endpoint did not respond on port $MONITOR_PORT"
  echo "Docker services are running and both login endpoints respond."
}

print_result() {
  local host_ip
  host_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo
  echo "Setup complete ($MODE mode)."
  if [[ "$MODE" == "native" ]]; then
    echo "Monitor: http://${host_ip:-localhost}:$MONITOR_PORT/"
    echo "Client:  http://${host_ip:-localhost}:$CLIENT_PORT/"
    echo "Services: systemctl status adventureland-headless adventureland-client"
  else
    echo "Monitor: http://${host_ip:-localhost}:$MONITOR_PORT/"
    echo "Client:  http://${host_ip:-localhost}:$CLIENT_PORT/"
    if [[ -n "$PUBLIC_CLIENT_DOMAIN" ]]; then
      echo "Public client:  https://$PUBLIC_CLIENT_DOMAIN/"
      echo "Public monitor: https://$PUBLIC_MONITOR_DOMAIN/"
    fi
    echo "Services: ${DOCKER[*]} compose -f $ROOT/docker-compose.yml ps"
  fi
  echo "All characters remain disabled until you enable them in CaracAL settings."
}

main() {
  parse_args "$@"
  require_normal_user
  ensure_project_layout
  if [[ "$MODE" == "native" ]]; then
    ensure_native_dependencies
  else
    ensure_docker_dependencies
  fi
  ensure_runtime_config
  ensure_code_sync_config
  ensure_caracal_config
  ensure_auth_config
  install -d -m 0700 \
    "$ROOT/.runtime-home" \
    "$ROOT/.runtime-home/.config" \
    "$ROOT/.runtime-home/.cache" \
    "$ROOT/.runtime-home/.local/share" \
    "$ROOT/.runtime-home/.local/state"

  if [[ "$MODE" == "native" ]]; then
    install_native_dependencies
    install_native_units
  else
    install_docker_assets
    validate_docker_installation
  fi
  print_result
}

main "$@"
