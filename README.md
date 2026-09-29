# CaracAL+

CaracAL+ extends [caracAL](https://github.com/numbereself/caracAL), a Node.js runtime for Adventure Land scripts. It adds headless deployment, environment-based configuration, a browser monitor, and optional Ollama chat around the upstream client model.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Last commit](https://img.shields.io/github/last-commit/TheDroidYourLookingFor/CaracAL-Plus)](https://github.com/TheDroidYourLookingFor/CaracAL-Plus/commits/main)

## ⚡ Quickstart

### Prerequisites

- Linux (Debian or Raspberry Pi OS), Git, `rsync`, and systemd.
- Node.js 22 or newer and npm.
- An Adventure Land account. The public release does not include the game client export or upstream game files.

### Install under `/opt/CaracALPlus`

Create the service account, clone the public repository, and install it under the service-owned path:

```sh
sudo useradd --system --user-group --create-home --home-dir /opt/CaracALPlus --shell /usr/sbin/nologin caracal
sudo -u caracal git clone https://github.com/TheDroidYourLookingFor/CaracAL-Plus.git /tmp/CaracALPlus-src
sudo rsync -a --chown=caracal:caracal /tmp/CaracALPlus-src/ /opt/CaracALPlus/
cd /opt/CaracALPlus
sudo -u caracal cp .env.example .env
sudo chmod 600 .env
sudo chown caracal:caracal .env
```

Edit `/opt/CaracALPlus/.env`. Set `AL_SESSION` and the monitor authentication values. For a password hash, use the project’s password setup helper. Keep `.env` private.

Install the vendored runtime dependencies and fetch the game assets you are entitled to use:

```sh
sudo -u caracal npm --prefix /opt/CaracALPlus/vendor/caracAL ci --omit=dev
sudo -u caracal node /opt/CaracALPlus/scripts/update-client-cache.js
```

Start the headless service with systemd:

```sh
sudo cp /opt/CaracALPlus/systemd/caracalplus-headless.service.example /etc/systemd/system/caracalplus-headless.service
sudo systemctl daemon-reload
sudo systemctl enable --now caracalplus-headless.service
sudo systemctl status caracalplus-headless.service
```

Check service logs with `sudo journalctl -u caracalplus-headless.service -f`. Review the client and monitor ports in `.env` before exposing them beyond localhost.

## Features

CaracAL+ keeps the upstream project’s Node.js client architecture and adds a configurable deployment layer.

- Run Adventure Land JavaScript scripts in Node.js with the upstream client APIs and character coordinator.
- Use optional TypeScript scripts through the upstream Webpack pipeline.
- Coordinate multiple characters, recover disconnected clients, and share state through the `parent.caracAL` helpers.
- Inspect characters in the browser monitor, with the upstream monitoring panel and minimap support.
- Persist browser-style `localStorage` and `sessionStorage` data between runs, and write structured, rotating logs.
- Configure accounts, authentication, ports, paths, and deployment through environment variables.
- Use the CaracAL+ dashboard, CODE sync helpers, systemd and Docker examples, and optional Ollama chat and relay.

The runtime runs under Node.js rather than a full browser. Scripts that rely on the browser DOM or PIXI renderer may need browser-side checks or fallbacks. See the [original caracAL README](https://github.com/numbereself/caracAL#readme) for upstream runtime concepts and examples.

## Configuration

Copy `.env.example` to `.env`. Each variable is listed below; values shown are safe examples. Required values depend on which components you enable.

| Variable | Purpose | Example | Required? |
| --- | --- | --- | --- |
| `CARACAL_HOME` | Install root used by launchers and service setup. | `/opt/CaracALPlus` | No |
| `CARACAL_ENV_FILE` | Optional alternate path to this environment file. | `(empty)` | No |
| `AL_SESSION` | Adventure Land session cookie for the account used by CaracAL+. | `replace-with-your-adventure-land-session` | Yes |
| `AL_CODE_API_TOKEN` | Adventure Land CODE API token; leave blank when CODE sync is unused. | `(empty)` | No |
| `AL_CODE_API_BASE_URL` | Optional base URL for the Adventure Land CODE API. | `(empty)` | No |
| `AL_CODE_SYNC_ON_START` | Pull account CODE files on startup when enabled. | `true` | No |
| `ADVENTURELAND_CODE_ROOT` | Optional local export root used by CODE sync. | `(empty)` | No |
| `ADVENTURE_LAND_CLIENT_BASE_URL` | Optional custom game client base URL. | `(empty)` | No |
| `PI_AUTH_USER` | Authentication username for the protected monitor. | `caracalplus` | When monitor auth is enabled |
| `PI_AUTH_PASSWORD_HASH` | Password hash for monitor authentication; generate with the setup script. | `replace-with-a-generated-password-hash` | When monitor auth is enabled |
| `PI_AUTH_SECRET` | Secret used to sign monitor sessions; generate with openssl rand -hex 32. | `replace-with-a-random-64-character-hex-secret` | When monitor auth is enabled |
| `PI_AUTH_COOKIE` | Name of the monitor session cookie. | `caracalplus_session` | No |
| `PI_AUTH_COOKIE_DOMAIN` | Optional cookie domain; use localhost for local-only access. | `localhost` | No |
| `PI_AUTH_SECURE_COOKIE` | Require HTTPS for the monitor cookie in public deployments. | `false` | No |
| `PI_AUTH_TTL_SECONDS` | Lifetime of monitor sessions in seconds. | `43200` | No |
| `PI_CLIENT_CONTROL_ORIGIN` | Hostname or origin used by the client control panel. | `https://client.example` | No |
| `PI_MONITOR_ORIGIN` | Public origin used by the monitor. | `https://monitor.example` | No |
| `CLIENT_PORT` | Port for the browser client server. | `8088` | No |
| `PI_MONITOR_PORT` | Port for the headless monitor. | `9024` | No |
| `DASHBOARD_PORT` | Port for the maintainer dashboard. | `8090` | No |
| `BIND_ADDRESS` | Optional public bind address; leave blank to use the platform default. | `(empty)` | No |
| `CLIENT_VERSION` | Optional client version label. | `local` | No |
| `MAINTAINER_DASHBOARD_VERSION` | Optional dashboard version label. | `local` | No |
| `DEPLOY_ENVIRONMENT` | Optional deployment environment label. | `local` | No |
| `PI_ENVIRONMENT` | Optional monitor environment label. | `local` | No |
| `PI_HOST_LABEL` | Optional host label displayed in the monitor. | `CaracALPlus` | No |
| `CARACAL_OLLAMA_URL` | Optional Ollama service URL; use a private hostname when needed. | `http://ollama.example:11434` | No |
| `CARACAL_OLLAMA_MODEL` | Ollama model used by the CaracAL+ chat panel. | `llama3.1` | No |
| `CARACAL_OLLAMA_CONTEXT` | Maximum Ollama context size. | `32768` | No |
| `CARACAL_OLLAMA_TIMEOUT_MS` | Ollama request timeout in milliseconds. | `120000` | No |
| `DASHBOARD_ACTIVITY_PATH` | Optional dashboard activity data path. | `(empty)` | No |
| `DASHBOARD_SNAPSHOT_STALE_AFTER_SECONDS` | Maximum age of the dashboard snapshot in seconds. | `120` | No |
| `REMOTE_FETCH_ATTEMPTS` | Number of attempts for remote source fetches. | `3` | No |
| `REMOTE_RETRY_DELAY_MS` | Delay between remote source fetch attempts in milliseconds. | `1000` | No |
| `PI_CLIENT_UPDATE_RETRIES` | Number of attempts for client updates. | `3` | No |
| `PI_CLIENT_UPDATE_TIMEOUT_MS` | Timeout for a client update in milliseconds. | `120000` | No |
| `CARACAL_RELAY_LISTEN_HOST` | Optional relay listen hostname. | `localhost` | No |
| `CARACAL_RELAY_LISTEN_PORT` | Relay listen port. | `18001` | No |
| `CARACAL_RELAY_ALLOWED_NETWORK` | Private network allowed to reach the relay. | `replace-with-your-private-network-cidr` | Relay only |
| `CARACAL_PRODUCTION_SSH_TARGET` | SSH target used for production deployment. | `caracal@your-host.example` | No |
| `CARACAL_RPI_SSH_TARGET` | SSH target used for the Raspberry Pi deployment. | `replace-with-rpi-ip-address` | Raspberry Pi deployment only |
| `CARACAL_DEPLOY_SSH_KEY` | SSH key path used for deployment. | `/path/to/private-ssh-key` | Remote deployment only |
| `CARACAL_BIND_HOST` | Host address used by the client and dashboard listeners. | `::` | No |
| `CARACAL_OLLAMA_HOST` | Private Ollama host used by the restricted relay. | `ollama.example` | Relay only |
| `CARACAL_TUNNEL_BIND_ADDRESS` | Address used for the outbound SSH tunnel binding. | `localhost` | No |
| `CARACAL_VPS_SSH_TARGET` | SSH user and hostname for the relay host. | `replace-with-vps-ip-address` | VPS deployment only |
| `CARACAL_PUBLIC_BASE_URL` | Public monitor base URL used by deployment health checks. | `https://monitor.example` | No |
| `CARACAL_CONTROL_BASE_URL` | Control panel base URL used by deployment health checks. | `https://control.example` | No |
| `CARACAL_VPS_SSH_USER` | SSH username for the VPS deployment. | `caracal` | VPS deployment only |
| `CARACAL_VPS_SSH_PORT` | SSH port for the VPS deployment. | `22` | VPS deployment only |
| `CARACAL_SSH_CONFIG` | Optional SSH client config file path. | `(empty)` | No |

## Run as a systemd service

The quickstart installs `caracalplus-headless.service`. To run the browser client separately, adapt `systemd/caracalplus-client.user.service` for your service account, then install it in the account’s systemd user unit directory and enable lingering with `loginctl enable-linger caracal`.

```sh
sudo -u caracal systemctl --user daemon-reload
sudo -u caracal systemctl --user enable --now caracalplus-client.user.service
```

Use `systemctl status` and `journalctl -u` to inspect service state and logs. The Docker deployment files are in `deploy/docker/` and `deploy/vps/`.

## Project structure

| Path | Purpose |
| --- | --- |
| `dashboard/` | Browser dashboard and its local server. |
| `deploy/` | Docker Compose, Caddy, and relay service examples. |
| `Desktop/` | Desktop launcher. |
| `scripts/` | Setup, authentication, client, sync, and status helpers. |
| `systemd/` | Headless and client service templates. |
| `vendor/caracAL/` | Vendored character coordinator and runtime; see its own license file. |
| `client/export/`, `vendor/caracAL/game_files/` | Generated/upstream game assets; intentionally not distributed. |

## Upstream and generated files

CaracAL+ builds on the original [numbereself/caracAL](https://github.com/numbereself/caracAL) project. The client export and downloaded game-version cache are not included in this release; configure access to the client resources you use and run `scripts/update-client-cache.js` after installation.

Keep local game data, character scripts, storage, logs, and real configuration files out of commits. Git ignores `client/export/`, `vendor/caracAL/game_files/`, the vendor runtime’s generated CODE/TYPECODE output, local storage, logs, and secret-bearing config files. Safe templates such as `.env.example` remain tracked.

## Troubleshooting

- **Missing `AL_SESSION`:** set it in `.env`; the runtime fails clearly when it is absent.
- **Monitor authentication fails:** confirm `PI_AUTH_USER`, `PI_AUTH_PASSWORD_HASH`, and `PI_AUTH_SECRET` are set and that the service was restarted.
- **Client assets are missing:** set the optional asset source in `.env` if needed, then rerun `scripts/update-client-cache.js`.
- **Service will not start:** check `sudo journalctl -u caracalplus-headless.service -n 100` and confirm the service account owns `/opt/CaracALPlus`.
- **Ollama chat is unavailable:** it is optional; set the Ollama URL/model and verify the Ollama service is reachable.

## Contributing

Please open an issue before large changes. Keep credentials and generated game assets out of commits, update `.env.example` when adding configuration, and run the relevant Node.js and shell syntax checks.

## License

CaracAL+ is licensed under the MIT License. The vendored runtime retains its own license and notice in `vendor/caracAL/LICENSE`.
