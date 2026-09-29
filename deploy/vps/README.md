# VPS deployment overlay

The VPS uses Docker Compose and Caddy while the Raspberry Pi uses native
Node.js plus system-level systemd services. These files are the reproducible source
for the VPS-only container and HTTPS layer:

- `docker-compose.yml` runs the headless service internally on `9024`, keeps
  the client bound to `localhost:8088`, and persists Caddy data/config.
- `Caddyfile` exposes only `https://monitor.example/` for the full client
  and `https://control.example/` for the protected monitor. The
  `/project-dashboard/` path on the monitor host is routed to the authenticated
  client service so the embedded dashboard can load in the monitor window.

The deployment tool overlays these two files on the VPS but never copies
`.env`, `.env`, `config/pi-auth-password.txt`,
`vendor/caracAL/config.js`, localStorage, or Caddy certificate data.

## LAN Ollama Chat window

The control panel embeds the chat UI from `http://localhost:8001/chat/`
through the authenticated same-origin route `/ollama-chat/lan/chat/`. The
Ollama host remains private: the RPi5 opens an outbound SSH reverse tunnel to
the VPS loopback at `localhost:18002`, and
  `caracal-ollama-ui-relay.service` exposes only a fixed TCP relay on the current
  Docker gateway (`localhost:18001`) to the CaracAL+ client container
  (`localhost`). The CaracAL+ Node server allowlists the chat page assets and
  the chat app's specific API paths; it does not provide a general Ollama HTTP
  proxy. Only `/ollama-chat/lan/` bypasses the panel's `pi-auth` middleware;
  Ollama Chat requires its own invite-only Google sign-in before returning any
  account data or chat API response. All other panel routes retain pi-auth.

  Configure the Ollama host with the Google OAuth environment file described in
  `ollama-chat/deploy/google-auth.env.example` before enabling public access.
  The registered callback must be
  `https://control.caracalvps.com/ollama-chat/lan/api/auth/google/callback`.
  Forward browser cookies and the HTTPS Origin header through this proxy so the
  Ollama host can validate the session and same-origin writes.

Install `caracal-ollama-ui-relay.py` beside the Node service and enable
`caracal-ollama-ui-relay.service` on the VPS. Install
`caracal-ollama-ui-tunnel.service` on the RPi5 after generating a dedicated
Ed25519 key pair there. Keep the private key on the RPi5 under /opt/CaracALPlus/config at
`/opt/CaracALPlus/config/caracal-ollama-ui-tunnel`; add only its public key to the
VPS `caracal` account's `authorized_keys`, restricted to remote listen address
`localhost:18002`, a reserved unused destination for local forwarding, and a
forced command that denies shell access. Pin the VPS host key in
`/opt/CaracALPlus/config/caracal-ollama-ui-tunnel.known_hosts` and keep strict host-key checking enabled. Put the local bind address, Ollama LAN address, and VPS IPv4 in the host-local /opt/CaracALPlus/config/ollama-ui-tunnel.env file, using config/ollama-ui-tunnel.env.example as a template. The
VPS relay must remain bound to the Docker gateway address, not a public
interface. Update the relay's listen address and allowed client IP together if
the Compose network or client container IP changes; the relay fails closed
when its configured client address is stale. The UFW rule should allow TCP
`18001` only on that Docker bridge from `localhost` to `localhost`; do not
open the port on a public interface. The current bridge interface is
`br-dcba73f6c9f7`.
