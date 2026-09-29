#!/usr/bin/env node
const { requireEnv } = require("./load-env");
requireEnv("PI_AUTH_USER", "PI_AUTH_PASSWORD_HASH", "PI_AUTH_SECRET");
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const AUTH_COOKIE = process.env.PI_AUTH_COOKIE || "pi_auth";
const AUTH_TTL_SECONDS = Math.max(
  300,
  Number(process.env.PI_AUTH_TTL_SECONDS || 12 * 60 * 60),
);

function auth_config() {
  return {
    user: process.env.PI_AUTH_USER || "admin",
    password_hash: process.env.PI_AUTH_PASSWORD_HASH || "",
    secret: process.env.PI_AUTH_SECRET || "",
    cookie_domain: process.env.PI_AUTH_COOKIE_DOMAIN || "",
    secure_cookie: /^(1|true|yes)$/i.test(process.env.PI_AUTH_SECURE_COOKIE || ""),
  };
}

function configured() {
  const config = auth_config();
  return Boolean(config.user && config.password_hash && config.secret);
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function safe_equal(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hash_password(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = crypto.scryptSync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$16384$8$1$${salt}$${derived.toString("base64url")}`;
}

function shell_quote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function verify_password(password, encoded) {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  try {
    const derived = crypto.scryptSync(password, parts[4], 32, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
    return safe_equal(derived.toString("base64url"), parts[5]);
  } catch (_) {
    return false;
  }
}

function parse_cookies(header) {
  const cookies = {};
  for (const item of String(header || "").split(";")) {
    const separator = item.indexOf("=");
    if (separator <= 0) continue;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (key) cookies[key] = value;
  }
  return cookies;
}

function strip_local_auth_cookie(header) {
  return String(header || "")
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item && !new RegExp(`^${AUTH_COOKIE}=`, "i").test(item))
    .join("; ");
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function create_token(username) {
  const config = auth_config();
  const payload = base64url(JSON.stringify({
    user: username,
    expires: Math.floor(Date.now() / 1000) + AUTH_TTL_SECONDS,
    nonce: crypto.randomBytes(12).toString("base64url"),
  }));
  return `${payload}.${sign(payload, config.secret)}`;
}

function token_user(token) {
  const config = auth_config();
  if (!token || !config.secret) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2 || !safe_equal(parts[1], sign(parts[0], config.secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!payload || payload.user !== config.user || Number(payload.expires) <= Math.floor(Date.now() / 1000)) return null;
    return payload.user;
  } catch (_) {
    return null;
  }
}

function authenticated(request) {
  return Boolean(token_user(parse_cookies(request.headers && request.headers.cookie)[AUTH_COOKIE]));
}

// The monitor can be shared in read-only mode. Keep the allow-list narrow so
// unauthenticated visitors can receive the monitor shell and safe snapshots,
// but cannot reach the project dashboard, its instruction chat, routes that
// change settings, control characters, or launch game actions.
function public_monitor_read_path(method, pathname) {
  const verb = String(method || "").toUpperCase();
  if (verb !== "GET" && verb !== "HEAD") return false;
  const exact = new Set([
    "/",
    "/prompt-boxes.css",
    "/styles.css",
    "/socket.io.js",
    "/data.js",
    "/BotUI.js",
    "/Controller.js",
    "/sha512.js",
    "/prompt-boxes.js",
    "/favicon.ico",
    "/pi-monitor-bridge.js",
    "/pi-script-dashboards.js",
    "/pi-storage/state",
    "/pi-monitor/activity",
    "/pi-monitor/stats",
    "/pi-game-data/trio",
    "/pi-account/mail",
    "/pi-monitor/resources",
    "/pi-monitor/window-layout",
    "/pi-control/state",
    "/pi-monitor/server-latency",
    "/pi-client-update/check",
  ]);
  return exact.has(pathname)
    || pathname.startsWith("/pi-sprite/")
    || pathname.startsWith("/js/")
    || pathname.startsWith("/images/")
    || pathname.startsWith("/img/")
    || pathname.startsWith("/css/")
    || pathname.startsWith("/fonts/")
    || pathname.startsWith("/socket.io/");
}

function express_request_paths(request) {
  const values = [request.originalUrl, request.url, request.path];
  const paths = [];
  values.forEach((value) => {
    if (!value) return;
    try {
      const pathname = new URL(String(value), `http://${request.headers.host || "localhost"}`).pathname;
      if (!paths.includes(pathname)) paths.push(pathname);
    } catch (_) {
      // Ignore malformed optional path representations and use the others.
    }
  });
  return paths.length ? paths : ["/"];
}

function is_monitor_request(request) {
  const hosts = [request.headers && request.headers.host, request.headers && request.headers["x-forwarded-host"]]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return hosts.some((host) => host.includes("control.") || /:9024$/.test(host));
}

function safe_next(value) {
  const candidate = String(value || "/");
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return "/";
  return candidate;
}

function escape_html(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function login_page(message = "", next = "/") {
  const error = message
    ? `<div class="error">${escape_html(message)}</div>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Adventure Land Pi Login</title>
<style>
html,body{margin:0;min-height:100%;background:#111;color:#eee;font:16px system-ui,sans-serif}
body{display:grid;place-items:center;padding:24px;box-sizing:border-box}
main{width:min(390px,100%);border:2px solid #777;border-radius:8px;background:#1c1c1c;padding:24px;box-sizing:border-box;box-shadow:0 8px 32px #000}
h1{margin:0 0 8px;color:#f0c766;font-size:22px}p{color:#aaa;font-size:13px;line-height:1.4}
label{display:block;margin:14px 0 6px;color:#ccc;font-size:13px}input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #666;border-radius:4px;background:#111;color:#fff;font:inherit}
button{width:100%;margin-top:18px;padding:10px;border:1px solid #999;border-radius:4px;background:#353535;color:#fff;cursor:pointer;font:inherit}.error{margin:12px 0;padding:9px;border:1px solid #b55;border-radius:4px;background:#321;color:#ffadad;font-size:13px}
</style></head><body><main><h1>Adventure Land Pi</h1><p>Sign in to access the monitor, client, Hub, APIs, and character tools.</p>${error}
<form method="post" action="/login"><input type="hidden" name="next" value="${escape_html(next)}">
<label for="username">Username</label><input id="username" name="username" autocomplete="username" required>
<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Sign in</button></form></main></body></html>`;
}

function set_cookie_header(token, max_age = AUTH_TTL_SECONDS) {
  const config = auth_config();
  const domain = config.cookie_domain ? `; Domain=${config.cookie_domain}` : "";
  return `${AUTH_COOKIE}=${token}; Max-Age=${max_age}; Path=/; HttpOnly; SameSite=Lax${domain}${config.secure_cookie ? "; Secure" : ""}`;
}

function read_request_body(request, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function login_redirect(request) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  return `/login?next=${encodeURIComponent(safe_next(url.pathname + url.search))}`;
}

async function handle_node_auth(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/pi-auth/state" && (request.method === "GET" || request.method === "HEAD")) {
    const is_authenticated = authenticated(request);
    const body = JSON.stringify({ ok: true, authenticated: is_authenticated, viewOnly: !is_authenticated, canWrite: is_authenticated });
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : body);
    return true;
  }
  if (url.pathname === "/login") {
    if (request.method === "GET" || request.method === "HEAD") {
      if (authenticated(request)) {
        response.writeHead(302, { location: safe_next(url.searchParams.get("next")) });
        response.end();
      } else {
        const body = login_page("", safe_next(url.searchParams.get("next")));
        response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        response.end(request.method === "HEAD" ? undefined : body);
      }
      return true;
    }
    if (request.method === "POST") {
      const form = new URLSearchParams(await read_request_body(request));
      const username = String(form.get("username") || "");
      const password = String(form.get("password") || "");
      const next = safe_next(form.get("next"));
      const config = auth_config();
      if (!configured()) {
        const body = login_page("Authentication is not configured. Run the setup script first.", next);
        response.writeHead(503, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        response.end(body);
        return true;
      }
      if (username !== config.user || !verify_password(password, config.password_hash)) {
        const body = login_page("Invalid username or password.", next);
        response.writeHead(401, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        response.end(body);
        return true;
      }
      response.writeHead(302, {
        location: next,
        "set-cookie": set_cookie_header(create_token(username)),
        "cache-control": "no-store",
      });
      response.end();
      return true;
    }
  }
  if (url.pathname === "/logout") {
    response.writeHead(302, {
      location: "/login",
      "set-cookie": set_cookie_header("", 0),
      "cache-control": "no-store",
    });
    response.end();
    return true;
  }
  if (authenticated(request)) return false;
  if (is_monitor_request(request) && public_monitor_read_path(request.method, url.pathname)) return false;
  if (request.method === "GET" || request.method === "HEAD") {
    response.writeHead(302, { location: login_redirect(request), "cache-control": "no-store" });
    response.end();
  } else {
    const body = JSON.stringify({ ok: false, error: "Authentication required", login: "/login" });
    response.writeHead(401, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(body);
  }
  return true;
}

async function handle_express_auth(request, response) {
  const paths = express_request_paths(request);
  const url = new URL(request.originalUrl || request.url || "/", `http://${request.headers.host || "localhost"}`);
  const send = (status, body, headers = {}) => {
    response.statusCode = status;
    for (const [key, value] of Object.entries(headers)) response.setHeader(key, value);
    response.end(request.method === "HEAD" ? undefined : body);
    return response;
  };
  const redirect = (location, headers = {}) => send(302, "", { ...headers, location });
  if (url.pathname === "/login") {
    if (request.method === "GET" || request.method === "HEAD") {
      if (authenticated(request)) return redirect(safe_next(url.searchParams.get("next")));
      return send(200, login_page("", safe_next(url.searchParams.get("next"))), {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
    }
    if (request.method === "POST") {
      const form = new URLSearchParams(await read_request_body(request));
      const username = String(form.get("username") || "");
      const password = String(form.get("password") || "");
      const next = safe_next(form.get("next"));
      const config = auth_config();
      if (!configured()) return send(503, login_page("Authentication is not configured. Run the setup script first.", next), {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      if (username !== config.user || !verify_password(password, config.password_hash)) return send(401, login_page("Invalid username or password.", next), {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      return redirect(next, { "set-cookie": set_cookie_header(create_token(username)) });
    }
  }
  if (url.pathname === "/logout") {
    return redirect("/login", { "set-cookie": set_cookie_header("", 0) });
  }
  if (paths.includes("/pi-auth/state") && (request.method === "GET" || request.method === "HEAD")) {
    const is_authenticated = authenticated(request);
    return send(200, JSON.stringify({ ok: true, authenticated: is_authenticated, viewOnly: !is_authenticated, canWrite: is_authenticated }), {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
  }
  if (authenticated(request)) return false;
  if (paths.some((pathname) => public_monitor_read_path(request.method, pathname))) return false;
  if (request.method === "GET" || request.method === "HEAD") return redirect(login_redirect(request), { "cache-control": "no-store" });
  return send(401, JSON.stringify({ ok: false, error: "Authentication required", login: "/login" }), {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
}

function express_middleware() {
  return (request, response, next) => {
    handle_express_auth(request, response)
      .then((handled) => {
        if (!handled) next();
      })
      .catch(next);
  };
}

function protect_express_router(router) {
  if (!router || router.__pi_auth_protected) return;
  const middleware = express_middleware();
  const stack = router.stack || (router._router && router._router.stack);
  if (Array.isArray(stack) && typeof router.use === "function") {
    const originalLength = stack.length;
    router.use(middleware);
    stack.unshift(...stack.splice(originalLength));
  } else if (typeof router.use === "function") {
    router.use(middleware);
  }
  router.__pi_auth_protected = true;
}

function authorize_websocket(request, socket) {
  if (authenticated(request)) return true;
  try {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  } catch (_) {
    // The peer may already have closed the socket.
  }
  socket.destroy();
  return false;
}

async function write_auth_env(outputPath, username, password) {
  if (!username || !password) throw new Error("A non-empty username and password are required");
  const secure_cookie = process.env.PI_AUTH_SECURE_COOKIE === undefined
    ? "true"
    : process.env.PI_AUTH_SECURE_COOKIE;
  const cookie_domain = process.env.PI_AUTH_COOKIE_DOMAIN === undefined
    ? ".monitor.example"
    : process.env.PI_AUTH_COOKIE_DOMAIN;
  const body = [
    `PI_AUTH_USER=${shell_quote(username)}`,
    `PI_AUTH_SECRET=${shell_quote(crypto.randomBytes(32).toString("base64url"))}`,
    `PI_AUTH_PASSWORD_HASH=${shell_quote(hash_password(password))}`,
    "PI_AUTH_TTL_SECONDS=43200",
    `PI_AUTH_COOKIE_DOMAIN=${shell_quote(cookie_domain)}`,
    `PI_AUTH_SECURE_COOKIE=${shell_quote(secure_cookie)}`,
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(outputPath, body, { mode: 0o600 });
}

if (require.main === module && process.argv[2] === "--generate-env") {
  const outputPath = path.resolve(process.argv[3] || path.join(__dirname, "..", "config", "pi-auth.env"));
  const passwordPath = path.resolve(process.argv[4] || path.join(__dirname, "..", "config", "pi-auth-password.txt"));
  const username = String(process.argv[5] || "admin").trim();
  const password = crypto.randomBytes(18).toString("base64url");
  try {
    write_auth_env(outputPath, username, password).then(() => {
      fs.writeFileSync(passwordPath, password, { mode: 0o600 });
      fs.chmodSync(passwordPath, 0o600);
      process.stdout.write(`Authentication configuration written to ${outputPath}\n`);
    }).catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
} else if (require.main === module && process.argv[2] === "--write-env") {
  const outputPath = path.resolve(process.argv[3] || path.join(__dirname, "..", "config", "pi-auth.env"));
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", async () => {
    const lines = input.split(/\r?\n/);
    try {
      await write_auth_env(outputPath, String(lines[0] || "").trim(), String(lines[1] || ""));
      process.stdout.write(`Authentication configuration written to ${outputPath}\n`);
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  });
}

module.exports = {
  authenticated,
  authorize_websocket,
  express_middleware,
  handle_node_auth,
  protect_express_router,
  strip_local_auth_cookie,
};
