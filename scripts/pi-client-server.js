#!/usr/bin/env node
require("./load-env");

const http = require("node:http");
const { Transform } = require("node:stream");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { URL } = require("node:url");
const pi_auth = require("./pi-auth");

const ROOT = path.resolve(__dirname, "..");
const { WebSocket, WebSocketServer } = require(path.join(
  ROOT,
  "vendor",
  "caracAL",
  "node_modules",
  "ws",
));
const PORT = Number(process.env.CLIENT_PORT || 8088);
function latestCachedVersion() {
  try {
    const version = fsSync
      .readFileSync(path.join(ROOT, "client", "export", "LATEST_VERSION.txt"), "utf8")
      .trim();
    if (/^\d+$/.test(version)) return version;
  } catch (_) {
    // Fall back for older installations that predate LATEST_VERSION.txt.
  }
  return "16846";
}
const VERSION = process.env.CLIENT_VERSION || latestCachedVersion();
const CLIENT_ROOT = path.join(ROOT, "client", "export", VERSION);
const PROJECT_DASHBOARD_ROOT = path.join(ROOT, "dashboard", "public");
const PROJECT_DASHBOARD_ACTIVITY_PATH = path.join(ROOT, "dashboard", "activity.json");
const PROJECT_DASHBOARD_DATA_ROOT = path.join(ROOT, ".caracal-dashboard");
const PROJECT_DASHBOARD_CHAT_PATH = path.join(PROJECT_DASHBOARD_DATA_ROOT, "chat.jsonl");
const PROJECT_DASHBOARD_CHAT_LIMIT = 200;
const PROJECT_DASHBOARD_MESSAGE_LIMIT = 8000;
const OLLAMA_CHAT_ROOT = path.join(ROOT, "ollama-chat");
const OLLAMA_UI_PROXY_PREFIX = "/ollama-chat/lan";
const OLLAMA_UI_RELAY_HOST = "localhost";
const OLLAMA_UI_RELAY_PORT = 18001;
const OLLAMA_UI_REQUEST_LIMIT = 16 * 1024 * 1024;
const OLLAMA_UI_REWRITE_LIMIT = 8 * 1024 * 1024;
const OLLAMA_UI_TIMEOUT_MS = 300000;
const OLLAMA_BASE_URL = String(process.env.CARACAL_OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, "");
const OLLAMA_MODEL = String(process.env.CARACAL_OLLAMA_MODEL || "qwen3-coder:30b").trim() || "qwen3-coder:30b";
const OLLAMA_CONTEXT = Math.max(1024, Number(process.env.CARACAL_OLLAMA_CONTEXT || 16384));
const OLLAMA_TIMEOUT_MS = Math.min(300000, Math.max(10000, Number(process.env.CARACAL_OLLAMA_TIMEOUT_MS || 180000)));
const OLLAMA_MESSAGE_LIMIT = 12000;
const OLLAMA_MAX_MESSAGES = 32;
const OLLAMA_SYSTEM_PROMPT = [
  "You are the local CaracAL+ assistant running on the user's Ubuntu machine.",
  "Answer using the conversation context and the project information provided by the user.",
  "You may explain code, diagnostics, and safe commands, but this chat does not authorize production deployment, live character control, trading, spending currency, or account changes.",
  "Be concise when a direct answer is enough, and say clearly when a fact needs to be verified on the server.",
].join(" ");

// Add a small safety check for Ollama model availability
const OLLAMA_MODEL_CHECK_TIMEOUT = 5000;
const REMOTE_ORIGIN = "https://adventure.land";
const PI_MONITOR_ORIGIN = process.env.PI_MONITOR_ORIGIN || "http://localhost:9024";
const PI_STORAGE_PATH = path.join(ROOT, "vendor", "caracAL", "localStorage", "caraGarage.jsonl");
const PI_STORAGE_ROTATION_PATH = path.join(ROOT, "vendor", "caracAL", "localStorage", "caraGarage.other.jsonl");
const REMOTE_FETCH_ATTEMPTS = Math.max(1, Number(process.env.REMOTE_FETCH_ATTEMPTS || 2));
const REMOTE_RETRY_DELAY_MS = Math.max(0, Number(process.env.REMOTE_RETRY_DELAY_MS || 300));

// Keep the downloaded game client untouched. These rules are injected at the
// Pi proxy boundary so the same small-screen fixes apply to both the local
// character client and the proxied Character Hub, including Hub markup that
// arrives after the initial page load.
const PI_LAYOUT_STYLE = `<style id="pi-layout-fix">
  /* Narrow embedded clients must not lose the left edge of the game menu. */
  @media (max-width: 760px) {
    html, body { overflow-x: hidden; }
    #toprightcorner {
      left: 0;
      right: 0;
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
      overflow: visible;
    }
    #toprightcorner .game-controls {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      margin-left: 0;
      justify-content: flex-end;
      flex-wrap: wrap;
      white-space: normal;
      gap: 2px;
    }
    #toprightcorner .game-controls .gamebutton {
      flex: 0 0 auto;
    }
    #toprightcorner .serverinfo-row { text-align: center; }
    #toprightcorner #serverinfo {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-start;
      gap: 2px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: visible;
    }
    #toprightcorner #serverinfo > * {
      box-sizing: border-box;
      max-width: 100%;
    }
  }

  /* Realm text belongs in its own top line instead of covering a long name. */
  .selection-character {
    box-sizing: border-box;
    max-width: calc(100vw - 16px);
  }
  .selection-character:has(.selection-home-server) {
    padding-top: 14px;
  }
  .selection-character .selection-home-server {
    top: 3px;
    right: 4px;
    z-index: 1;
    padding-left: 4px;
    background: #000;
    white-space: nowrap;
  }
  @media (max-width: 520px) {
    #pagewrapped {
      width: calc(100vw - 16px);
      max-width: 100%;
      box-sizing: border-box;
    }
    .selection-character { width: min(160px, calc(100vw - 24px)) !important; }
    .selection-character .selection-home-server {
      font-size: 14px;
      line-height: 12px;
    }
  }
</style>`;

function isInternalClientRestartRequest(req) {
  return req.method === "POST" && req.url && req.url.split("?", 1)[0] === "/__pi_client_restart" &&
    process.env.PI_AUTH_SECRET && req.headers["x-pi-service-secret"] === process.env.PI_AUTH_SECRET;
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function loadPiConfig() {
  try {
    const configPath = path.join(ROOT, "vendor", "caracAL", "config.js");
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
  } catch (_) {
    return {};
  }
}

function getConfiguredSession() {
  const configured = process.env.AL_SESSION || loadPiConfig().session || "";
  const separator = configured.indexOf("-");
  if (separator <= 0 || separator >= configured.length - 1) return null;
  return {
    userId: configured.slice(0, separator),
    userAuth: configured.slice(separator + 1),
  };
}

function isConfiguredCharacter(characterName) {
  const characters = loadPiConfig().characters || {};
  return Object.prototype.hasOwnProperty.call(characters, characterName);
}

function parseRealmKey(realmKey) {
  const match = String(realmKey || "").match(/^SR_(US|EU|ASIA)(.+)$/i);
  if (!match) return null;
  return { region: match[1].toUpperCase(), server: match[2].toUpperCase() };
}

async function getCharacterRealm(characterName, session) {
  const configured = loadPiConfig().characters || {};
  const realmKey = configured[characterName] && configured[characterName].realm;
  if (!realmKey || !session) return null;
  try {
    const raw = await fetch(REMOTE_ORIGIN + "/api/servers_and_characters", {
      method: "POST",
      headers: {
        cookie: `auth=${session.userId}-${session.userAuth}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: "{}",
    });
    const payload = await raw.json();
    const info = (payload.infs || []).find((item) => item && item.type === "servers_and_characters");
    return (info && info.servers || []).find((server) => server.key === realmKey) || null;
  } catch (_) {
    return null;
  }
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function requestBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function upstreamHeaders(req, preferConfiguredSession = false) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (["connection", "content-length", "host"].includes(key)) continue;
    headers[key] = value;
  }
  const configuredSession = process.env.AL_SESSION || loadPiConfig().session || "";
  const incomingCookie = pi_auth.strip_local_auth_cookie(String(headers.cookie || ""));
  const hasAuthCookie = /(?:^|;\s*)auth=/.test(incomingCookie);
  if (configuredSession && (preferConfiguredSession || !hasAuthCookie)) {
    const otherCookies = incomingCookie
      .split(";")
      .map((cookie) => cookie.trim())
      .filter((cookie) => cookie && !/^auth=/i.test(cookie));
    headers.cookie = [...otherCookies, "auth=" + configuredSession].join("; ");
  }
  headers.host = "adventure.land";
  headers["accept-encoding"] = "identity";
  return headers;
}

function rewriteSetCookie(cookie) {
  return cookie
    .replace(/;\s*Domain=[^;]+/gi, "")
    // The Pi client is intentionally LAN-local HTTP. Strip the remote
    // cookie attributes that would prevent the browser from storing it.
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
}

function copyResponseHeaders(upstream, res) {
  const skip = new Set([
    "connection",
    "content-encoding",
    "content-length",
    "set-cookie",
    "transfer-encoding",
  ]);
  for (const [key, value] of upstream.headers) {
    if (!skip.has(key.toLowerCase())) res.setHeader(key, value);
  }
  const cookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  if (cookies.length) res.setHeader("set-cookie", cookies.map(rewriteSetCookie));
}

function addPiAssetCacheBust(body, remotePath, contentType) {
  if (!contentType.includes("javascript")) return body;
  let pathname;
  try {
    pathname = new URL(remotePath, REMOTE_ORIGIN).pathname;
  } catch (_) {
    return body;
  }
  if (pathname !== "/data.js") return body;

  // Character sheets are referenced from data.js without a version query.
  // The Hub is proxied under /_alhub/, so a browser can otherwise retain an
  // old sheet after Adventure Land publishes a cosmetic update. Use the
  // upstream data.js version for the cache key; the local cached-client
  // version is only a fallback for older/nonstandard data responses.
  const text = Buffer.from(body).toString("utf8");
  const dataVersion = text.match(
    /\bvar\s+G\s*=\s*\{\s*["']version["']\s*:\s*([0-9]+)/,
  );
  const version = encodeURIComponent(dataVersion ? dataVersion[1] : VERSION);
  const rewritten = text.replace(
    /(\/images\/[^"'\s)]+\.(?:png|gif|jpe?g|webp)(?:\?[^"'\s)]*)?)/gi,
    (match) => match + (match.includes("?") ? "&" : "?") + "pi_asset_version=" + version,
  );
  return Buffer.from(rewritten, "utf8");
}

function rewriteProxiedAssetPaths(body, contentType) {
  if (!/(?:javascript|css)/i.test(contentType)) return body;
  const text = Buffer.from(body).toString("utf8");
  const rewritten = text.replace(
    /(^|[^A-Za-z0-9_])\/images\//g,
    "$1/_alhub/images/",
  );
  return Buffer.from(rewritten, "utf8");
}

function setProxyAssetCachePolicy(res, contentType) {
  if (
    /^(?:image|font)\//i.test(contentType) ||
    /(?:javascript|css)/i.test(contentType)
  ) {
    res.setHeader("cache-control", "no-cache, must-revalidate");
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchRemote(remotePath, init) {
  let lastError;
  for (let attempt = 1; attempt <= REMOTE_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(REMOTE_ORIGIN + remotePath, init);
      if (response.status < 500 || attempt === REMOTE_FETCH_ATTEMPTS) return response;
      await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      if (attempt === REMOTE_FETCH_ATTEMPTS) throw error;
    }
    await delay(REMOTE_RETRY_DELAY_MS * attempt);
  }
  throw lastError || new Error("Remote Adventure Land request failed");
}

function rewriteCharacterSocket(html) {
  const match = html.match(
    /var server_address=(['"])([^'"]*)\1,server_path=(['"])([^'"]*)\3;/,
  );
  if (!match || !match[2] || !match[4]) return html;
  const remoteHost = match[2];
  const remotePath = "/" + match[4].replace(/^\/+|\/+$/g, "") + "/";
  const localPath =
    "/_pi_game_ws/" + encodeURIComponent(remoteHost) + remotePath;
  // Keep the game's original server_address/server_path values so its server
  // selector can still match the selected realm. Only the Socket.IO transport
  // target needs to move through the Pi.
  const socketBridge = `<script>
(function () {
  var piOrigin = location.origin;
  var piPath = ${JSON.stringify(localPath)};
  var remoteHost = ${JSON.stringify(remoteHost)};
  if (typeof window.io === "function") {
    var originalIo = window.io;
    window.io = function (url, options) {
      if (url === remoteHost || url === "https://" + remoteHost || url === "http://" + remoteHost) url = piOrigin;
      options = Object.assign({}, options || {}, { path: piPath });
      return originalIo(url, options);
    };
  }
})();
</script>`;
  const bootstrap = html.replace(
    /(<script[^>]+socket\.io[^>]*><\/script>)/i,
    "$1" + socketBridge,
  );
  const autoLogin = `<script>
(function () {
  var attempts = 0;
  var timer = setInterval(function () {
    if (typeof character !== "undefined" && character) return clearInterval(timer);
    if (++attempts > 30) return clearInterval(timer);
    if (typeof socket === "undefined" || !socket || !socket_welcomed || !game_loaded) return;
    if (typeof log_in !== "function" || !user_id || !user_auth || !url_character) return;
    clearInterval(timer);
    log_in(user_id, url_character, user_auth);
  }, 1000);
})();
</script>`;
  return bootstrap.replace(/<\/body>/i, autoLogin + "</body>");
}

function injectHubCharacterSelection(html, characterName) {
  if (!characterName) return html;
  const selectedName = JSON.stringify(characterName)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const script = `<script>
(function () {
  var wanted = ${selectedName};
  var attempts = 0;
  var selected = false;
  var selectionRequested = false;
  var previousCharacter = window.character || null;
  var previousObserving = window.observing || null;
  var selectionTimer = null;
  var homeInTimer = null;
  var homeInStartTimer = null;
  var chatHideTimer = null;
  var chatHideAttempts = 0;
  var homeInIntervalMs = 5000;

  function isWantedCharacter(value, previousValue) {
    if (!value || value.name !== wanted) return false;
    // The Hub keeps its current character object while a new observer socket
    // is connecting. Do not mistake that stale object for a completed switch.
    return !selectionRequested || value !== previousValue || (previousValue && previousValue.name === wanted);
  }

  function wantedCharacterIsActive() {
    return (
      isWantedCharacter(window.character, previousCharacter) ||
      isWantedCharacter(window.observing, previousObserving)
    );
  }

  function hideChat() {
    var panel = document.getElementById("comm-chat");
    if (!panel) return false;
    if (panel.classList && panel.classList.contains("hidden")) return true;

    try {
      // Use the official Hub control so its open state and bottom CHAT button
      // stay synchronized. The visible HIDE button is its user-facing fallback.
      if (typeof window.toggle_comm_chat === "function") {
        window.toggle_comm_chat();
      } else {
        var hideButton = Array.prototype.slice.call(panel.querySelectorAll("button")).find(function (button) {
          var label = (button.getAttribute("aria-label") || "").toLowerCase();
          var text = (button.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
          return label === "hide chat" || text === "HIDE";
        });
        if (hideButton) hideButton.click();
      }
    } catch (_) {
      return false;
    }
    return !!(panel.classList && panel.classList.contains("hidden"));
  }

  function keepChatHidden() {
    if (hideChat() || chatHideTimer) return;
    chatHideAttempts = 0;
    chatHideTimer = window.setInterval(function () {
      if (hideChat() || ++chatHideAttempts >= 40) {
        window.clearInterval(chatHideTimer);
        chatHideTimer = null;
      }
    }, 250);
  }

  function requestSelection() {
    selectionRequested = true;
    keepChatHidden();
  }

  function clickHomeIn() {
    var controls = Array.prototype.slice.call(
      document.querySelectorAll("#observeui .gamebutton, .gamebutton"),
    );
    var homeIn = controls.find(function (control) {
      return (control.textContent || "").replace(/\\s+/g, " ").trim().toUpperCase() === "HOME IN";
    });
    if (!homeIn) return false;
    homeIn.click();
    return true;
  }

  function startHomeInRefresh() {
    if (homeInTimer) return;
    // HOME IN recenters the observed character. Keep the Hub view useful even
    // when the watched character travels across a large map.
    homeInStartTimer = window.setTimeout(clickHomeIn, 3000);
    homeInTimer = window.setInterval(clickHomeIn, homeInIntervalMs);
  }

  function markSelected() {
    if (selected) return true;
    selected = true;
    if (selectionTimer) window.clearInterval(selectionTimer);
    selectionTimer = null;
    startHomeInRefresh();
    return true;
  }

  function selectCharacter() {
    if (wantedCharacterIsActive()) {
      keepChatHidden();
      return markSelected();
    }
    if (selectionRequested) return false;

    // Prefer the game's own function. This survives changes to the Hub card
    // markup and uses the same server-selection path as a manual click.
    if (typeof window.observe_character === "function") {
      try {
        if (window.observe_character(wanted)) {
          requestSelection();
          if (wantedCharacterIsActive()) return markSelected();
          return false;
        }
      } catch (_) {
        // Fall through to the DOM path while the Hub is still initializing.
      }
    }

    // Fallback for versions where the function is not exposed yet. Do not
    // depend on a particular card class or quote style in the onclick text.
    var targets = Array.prototype.slice.call(document.querySelectorAll("[onclick]"));
    var target = targets.find(function (candidate) {
      var onclick = candidate.getAttribute("onclick") || "";
      return onclick.indexOf("observe_character") >= 0 && onclick.indexOf(wanted) >= 0;
    });
    if (!target) return false;
    target.scrollIntoView({ block: "center", inline: "center" });
    target.click();
    requestSelection();
    return wantedCharacterIsActive() && markSelected();
  }

  function trySelection() {
    if (selected || selectCharacter() || ++attempts > 120) {
      if (selectionTimer) window.clearInterval(selectionTimer);
      selectionTimer = null;
    }
  }

  selectionTimer = window.setInterval(trySelection, 500);
  if (document.readyState !== "loading") trySelection();
  else document.addEventListener("DOMContentLoaded", trySelection, { once: true });

  // Character cards and the observer controls are loaded asynchronously.
  // Retry immediately when the Hub adds them instead of relying only on a
  // fixed polling window.
  if (window.MutationObserver) {
    new MutationObserver(function () {
      if (!selected) trySelection();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener("beforeunload", function () {
    if (selectionTimer) window.clearInterval(selectionTimer);
    if (homeInTimer) window.clearInterval(homeInTimer);
    if (homeInStartTimer) window.clearTimeout(homeInStartTimer);
    if (chatHideTimer) window.clearInterval(chatHideTimer);
  });
})();
</script>`;
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, script + "</body>")
    : html + script;
}

async function getPiStorageSeed() {
  const localSeed = readLocalStorageSeed();
  if (localSeed) return localSeed;
  try {
    const response = await fetch(PI_MONITOR_ORIGIN + "/pi-storage/state", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || !payload.entries || typeof payload.entries !== "object") return null;
    return {
      revision: String(payload.revision || ""),
      entries: payload.entries,
    };
  } catch (_) {
    return null;
  }
}

function readLocalStorageSeed() {
  // The client and headless services share the project directory on both
  // native and Docker deployments. Read the same append-only JSONL file that
  // CaracAL uses so the initial page scripts see the authoritative values
  // before the official game client starts reading localStorage. This is
  // intentionally read-only; all browser writes still go through the
  // coordinator's /pi-storage/sync route.
  const mainPath = fsSync.existsSync(PI_STORAGE_PATH)
    ? PI_STORAGE_PATH
    : PI_STORAGE_ROTATION_PATH;
  if (!fsSync.existsSync(mainPath)) return null;

  const entries = {};
  try {
    const contents = fsSync.readFileSync(mainPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      if (!line) continue;
      try {
        const record = JSON.parse(line);
        const key = Object.keys(record || {})[0];
        if (!key) continue;
        if (record[key] === null) delete entries[key];
        else entries[String(key)] = String(record[key]);
      } catch (_) {
        // Tolerate a partially-written final line during a restart.
      }
    }
  } catch (_) {
    return null;
  }

  const sortedEntries = {};
  Object.keys(entries).sort().forEach((key) => {
    sortedEntries[key] = entries[key];
  });
  const revision = crypto
    .createHash("sha1")
    .update(JSON.stringify(sortedEntries))
    .digest("hex");
  return { revision, entries: sortedEntries };
}

function injectPiClientScripts(html, storageSeed, includeClientBridge = true) {
  const seedJson = JSON.stringify(storageSeed || null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const scripts =
    `<script>window.__piStorageSeed=${seedJson};window.__piStorageRevision=window.__piStorageSeed && window.__piStorageSeed.revision || "";</script>` +
    `<script src="/pi-localstorage-bridge.js?v=5"></script>` +
    (includeClientBridge ? `<script src="/pi-client-bridge.js?v=1"></script>` : "");
  const commonScript = /<script[^>]+src=["'][^"']*\/js\/common_functions\.js[^>]*><\/script>/i;
  if (commonScript.test(html)) return html.replace(commonScript, scripts + "$&");
  return html.replace(/<\/head>/i, scripts + "</head>");
}

function injectPiLayoutStyle(html) {
  if (html.includes('id="pi-layout-fix"')) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, PI_LAYOUT_STYLE + "</head>");
  return PI_LAYOUT_STYLE + html;
}

async function proxyRemote(
  req,
  res,
  remotePath,
  rewriteHubHtml = false,
  preferConfiguredSession = false,
  rewriteCharacterSocketTarget = false,
  injectStorageBridge = false,
) {
  const body = ["GET", "HEAD"].includes(req.method)
    ? undefined
    : await requestBody(req);
  const upstream = await fetchRemote(remotePath, {
    method: req.method,
    headers: upstreamHeaders(req, preferConfiguredSession),
    body,
    redirect: "manual",
  });
  let responseBody = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type") || "";
  responseBody = addPiAssetCacheBust(responseBody, remotePath, contentType);
  responseBody = rewriteProxiedAssetPaths(responseBody, contentType);
  if (rewriteHubHtml && contentType.includes("text/html")) {
    let html = responseBody.toString("utf8");
    html = html.replace(
      /(\b(?:src|href|action)=['"])\/(?!_alhub\/)([^'"]*)/gi,
      "$1/_alhub/$2",
    );
    html = html.replace(
      /https:\/\/adventure\.land\/api\//g,
      "/api/",
    );
    html = html.replace(
      /var base_url\s*=\s*["']https:\/\/adventure\.land["']/g,
      "var base_url=location.origin",
    );
    if (rewriteCharacterSocketTarget) {
      html = rewriteCharacterSocket(html);
      html = injectPiClientScripts(html, await getPiStorageSeed(), false);
    } else if (injectStorageBridge) {
      // CODE runs in a same-origin iframe with its own JavaScript realm.
      // Install the storage bridge there too; patching Storage.prototype in
      // the parent game page does not intercept CODE's localStorage writes.
      html = injectPiClientScripts(html, await getPiStorageSeed());
    }
    const hubCharacter = new URL(remotePath, REMOTE_ORIGIN).searchParams.get("pi_character");
    if (hubCharacter) html = injectHubCharacterSelection(html, hubCharacter);
    html = injectPiLayoutStyle(html);
    responseBody = Buffer.from(html, "utf8");
  }
  copyResponseHeaders(upstream, res);
  setProxyAssetCachePolicy(res, contentType);
  res.statusCode = upstream.status;
  res.setHeader("content-length", responseBody.length);
  res.end(req.method === "HEAD" ? undefined : responseBody);
}

function handleGameWebSocketUpgrade(req, socket, head) {
  if (!pi_auth.authorize_websocket(req, socket)) return;
  const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (!parsed.pathname.startsWith("/_pi_game_ws/")) {
    socket.destroy();
    return;
  }

  const encodedTarget = parsed.pathname.slice("/_pi_game_ws/".length);
  const separator = encodedTarget.indexOf("/");
  if (separator <= 0) {
    socket.destroy();
    return;
  }
  const remoteHost = decodeURIComponent(encodedTarget.slice(0, separator));
  const remotePath = encodedTarget.slice(separator) || "/socket.io/";
  if (!/^[a-z0-9.-]+\.adventure\.land$/i.test(remoteHost)) {
    socket.destroy();
    return;
  }

  const upstreamUrl = new URL(`wss://${remoteHost}${remotePath}`);
  upstreamUrl.search = parsed.search;
  const websocketServer = new WebSocketServer({ noServer: true });
  websocketServer.handleUpgrade(req, socket, head, (client) => {
    const upstream = new WebSocket(upstreamUrl, {
      headers: { origin: "https://adventure.land" },
    });
    const pending = [];
    let clientMessages = 0;
    let upstreamMessages = 0;
    let closed = false;

    const closeBoth = () => {
      if (closed) return;
      closed = true;
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.close();
      }
      if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
        upstream.close();
      }
      console.log(`Game relay closed ${remoteHost}${remotePath} client_messages=${clientMessages} upstream_messages=${upstreamMessages}`);
    };

    client.on("message", (data, isBinary) => {
      clientMessages += 1;
      const packet = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      if (packet.startsWith('42["auth"')) console.log("Game relay auth packet received");
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(data, { binary: isBinary });
      } else if (pending.length < 32) {
        pending.push({ data, isBinary });
      }
    });
    upstream.on("open", () => {
      console.log(`Game relay upstream open ${remoteHost}${remotePath}`);
      setTimeout(() => {
        if (!closed) console.log(`Game relay summary client_messages=${clientMessages} upstream_messages=${upstreamMessages}`);
      }, 5000);
      while (pending.length && upstream.readyState === WebSocket.OPEN) {
        const message = pending.shift();
        upstream.send(message.data, { binary: message.isBinary });
      }
    });
    upstream.on("message", (data, isBinary) => {
      upstreamMessages += 1;
      const packet = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      if (packet.startsWith("41")) console.log("Game relay upstream disconnect packet");
      else if (packet.startsWith("44")) console.log("Game relay upstream error packet");
      else if (packet.startsWith('42["start"')) console.log("Game relay start packet");
      if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
    });
    client.on("close", closeBoth);
    upstream.on("close", closeBoth);
    client.on("error", closeBoth);
    upstream.on("error", closeBoth);
  });
}

function safeClientPath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const candidate = path.resolve(CLIENT_ROOT, "." + decoded);
  if (candidate !== CLIENT_ROOT && !candidate.startsWith(CLIENT_ROOT + path.sep)) {
    return null;
  }
  return candidate;
}

function safeProjectDashboardPath(requestPath) {
  const pathname = requestPath === "/project-dashboard" || requestPath === "/project-dashboard/"
    ? "/index.html"
    : requestPath.slice("/project-dashboard".length) || "/index.html";
  const decoded = decodeURIComponent(pathname.split("?")[0]);
  const candidate = path.resolve(PROJECT_DASHBOARD_ROOT, "." + decoded);
  if (candidate !== PROJECT_DASHBOARD_ROOT && !candidate.startsWith(PROJECT_DASHBOARD_ROOT + path.sep)) {
    return null;
  }
  return candidate;
}

function safeOllamaChatPath(requestPath) {
  const pathname = requestPath === "/ollama-chat" || requestPath === "/ollama-chat/"
    ? "/index.html"
    : requestPath.slice("/ollama-chat".length) || "/index.html";
  const decoded = decodeURIComponent(pathname.split("?")[0]);
  const candidate = path.resolve(OLLAMA_CHAT_ROOT, "." + decoded);
  if (candidate !== OLLAMA_CHAT_ROOT && !candidate.startsWith(OLLAMA_CHAT_ROOT + path.sep)) {
    return null;
  }
  return candidate;
}

function projectDashboardEnvironment() {
  const configured = String(process.env.PI_ENVIRONMENT || process.env.DEPLOY_ENVIRONMENT || "").trim();
  if (configured) return configured;
  const hostname = os.hostname().toLowerCase();
  if (/rpi|raspberry|pi5/.test(hostname)) return "RPi5 test";
  if (/vps|caracal/.test(hostname)) return "VPS production";
  return "CaracAL+ server";
}

function projectDashboardStatus(req, res) {
  const memory = process.memoryUsage();
  const body = JSON.stringify({
    ok: true,
    checkedAtUtc: new Date().toISOString(),
    environment: projectDashboardEnvironment(),
    host: os.hostname(),
    service: {
      version: VERSION,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
    },
    project: {
      repository: "Character01YourLookingFor/AdventureLandCode-Droid",
      dashboard: "embedded read-only project dashboard",
      dashboardPath: "/project-dashboard/",
    },
  });
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

async function readProjectDashboardChat() {
  try {
    const raw = await fs.readFile(PROJECT_DASHBOARD_CHAT_PATH, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => {
        try { return JSON.parse(line); } catch (_) { return null; }
      })
      .filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && entry.text)
      .slice(-PROJECT_DASHBOARD_CHAT_LIMIT);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function projectDashboardActivity(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method Not Allowed");
  let payload = { ok: true, source: "VPS deployment file", generatedAtUtc: null, commits: [] };
  try {
    payload = JSON.parse(await fs.readFile(PROJECT_DASHBOARD_ACTIVITY_PATH, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") return sendText(res, 503, "Local activity history is unavailable");
  }
  const body = JSON.stringify({
    ok: true,
    source: payload.source || "VPS deployment file",
    generatedAtUtc: payload.generatedAtUtc || null,
    commits: Array.isArray(payload.commits) ? payload.commits : [],
  });
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

async function appendProjectDashboardChat(record) {
  await fs.mkdir(PROJECT_DASHBOARD_DATA_ROOT, { recursive: true });
  await fs.appendFile(PROJECT_DASHBOARD_CHAT_PATH, JSON.stringify(record) + "\n", "utf8");
}

async function projectDashboardChat(req, res) {
  if (req.method === "GET" || req.method === "HEAD") {
    const body = JSON.stringify({ ok: true, messages: await readProjectDashboardChat() });
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(body),
      "cache-control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }
  if (req.method !== "POST") return sendText(res, 405, "Method Not Allowed");
  let payload;
  try {
    const body = await requestBody(req, 16 * 1024);
    payload = JSON.parse(body.toString("utf8"));
  } catch (error) {
    return sendText(res, 400, error.message === "Request body is too large" ? error.message : "Invalid JSON");
  }
  const text = String(payload && (payload.text ?? payload.message) || "").trim();
  if (!text) return sendText(res, 400, "Message text is required");
  if (text.length > PROJECT_DASHBOARD_MESSAGE_LIMIT) {
    return sendText(res, 413, `Message is limited to ${PROJECT_DASHBOARD_MESSAGE_LIMIT} characters`);
  }
  const record = {
    id: crypto.randomUUID(),
    role: "user",
    createdAtUtc: new Date().toISOString(),
    status: "queued",
    text,
  };
  await appendProjectDashboardChat(record);
  const responseBody = JSON.stringify({ ok: true, message: record });
  res.writeHead(202, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(responseBody),
    "cache-control": "no-store",
  });
  res.end(responseBody);
}

async function fetchOllama(pathname, options = {}, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(OLLAMA_BASE_URL + pathname, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sendJson(res, status, payload, method = "GET") {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(method === "HEAD" ? undefined : body);
}

async function ollamaStatus(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method Not Allowed");
  try {
    const upstream = await fetchOllama("/api/version", { headers: { accept: "application/json" } }, 5000);
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) throw new Error(`Ollama returned HTTP ${upstream.status}`);
    return sendJson(res, 200, { ok: true, model: OLLAMA_MODEL, context: OLLAMA_CONTEXT, version: payload.version || null }, req.method);
  } catch (error) {
    return sendJson(res, 503, {
      ok: false,
      model: OLLAMA_MODEL,
      context: OLLAMA_CONTEXT,
      error: error && error.name === "AbortError" ? "Ollama status check timed out" : "Local Ollama is unavailable",
    }, req.method);
  }
}

function normalizeOllamaMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, OLLAMA_MESSAGE_LIMIT) }))
    .filter((message) => message.content)
    .slice(-OLLAMA_MAX_MESSAGES);
}

async function ollamaChat(req, res) {
  if (req.method !== "POST") return sendText(res, 405, "Method Not Allowed");
  let payload;
  try {
    payload = JSON.parse((await requestBody(req, 96 * 1024)).toString("utf8"));
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message === "Request body is too large" ? error.message : "Invalid JSON" });
  }
  const messages = normalizeOllamaMessages(payload && payload.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return sendJson(res, 400, { ok: false, error: "A user message is required" });
  }
  try {
    const upstream = await fetchOllama("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8", accept: "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: "10m",
        options: { num_ctx: OLLAMA_CONTEXT },
        messages: [{ role: "system", content: OLLAMA_SYSTEM_PROMPT }, ...messages],
      }),
    });
    const responsePayload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const upstreamError = String(responsePayload.error || "").trim().slice(0, 300);
      return sendJson(res, 502, { ok: false, error: upstreamError || `Ollama returned HTTP ${upstream.status}` });
    }
    const content = String(responsePayload.message && responsePayload.message.content || "").trim();
    if (!content) return sendJson(res, 502, { ok: false, error: "Ollama returned an empty response" });
    return sendJson(res, 200, {
      ok: true,
      model: responsePayload.model || OLLAMA_MODEL,
      message: { role: "assistant", content },
      done: responsePayload.done === true,
    });
  } catch (error) {
    return sendJson(res, 504, {
      ok: false,
      error: error && error.name === "AbortError"
        ? "Ollama response timed out; the model may still be loading"
        : "The local Ollama request failed",
    });
  }
}

async function serveProjectDashboardFile(req, res, requestPath) {
  const filePath = safeProjectDashboardPath(requestPath);
  if (!filePath) return sendText(res, 400, "Invalid path");
  try {
    let body = await fs.readFile(filePath);
    if (path.basename(filePath).toLowerCase() === "index.html") {
      body = Buffer.from(body.toString("utf8").replace(/__CARACAL_DASHBOARD_VERSION__/g, VERSION), "utf8");
    }
    res.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": body.length,
      "cache-control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error.code === "ENOENT") return sendText(res, 404, "Not found");
    throw error;
  }
}

async function serveOllamaChatFile(req, res, requestPath) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method Not Allowed");
  const filePath = safeOllamaChatPath(requestPath);
  if (!filePath) return sendText(res, 400, "Invalid path");
  try {
    const body = await fs.readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": body.length,
      "cache-control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error.code === "ENOENT") return sendText(res, 404, "Not found");
    throw error;
  }
}

function ollamaUiAllowedMethods(upstreamPath) {
  if ([
    "/chat",
    "/chat/",
    "/chat/index.html",
    "/chat/app.js",
    "/chat/styles.css",
    "/chat/vendor/mammoth.browser.min.js",
    "/chat/vendor/pdf.min.mjs",
    "/chat/vendor/pdf.worker.min.mjs",
  ].includes(upstreamPath)) return ["GET", "HEAD"];

  const readOnlyApiPaths = new Set([
    "/api/status",
    "/api/resources",
    "/api/models",
    "/api/codex/models",
    "/api/claude/models",
    "/api/plugins/github",
    "/api/huggingface/models",
    "/api/search",
    "/api/image-edit/status",
    "/api/image-gen/status",
  ]);
  if (readOnlyApiPaths.has(upstreamPath)) return ["GET", "HEAD"];

  if (["/api/auth/status", "/api/auth/google/start", "/api/auth/google/callback"].includes(upstreamPath)) return ["GET", "HEAD"];
  if (upstreamPath === "/api/auth/logout") return ["POST"];
  if (upstreamPath === "/api/auth/invites") return ["GET", "HEAD", "POST", "DELETE"];
  if (/^\/api\/auth\/users\/[a-f0-9-]{36}$/.test(upstreamPath)) return ["DELETE"];
  if (upstreamPath === "/api/account/workspace") return ["GET", "HEAD", "PUT"];
  if (/^\/api\/account\/attachments\/[0-9]+-[a-z0-9]{1,32}$/.test(upstreamPath)) return ["GET", "HEAD", "PUT", "DELETE"];

  if (upstreamPath === "/api/projects") return ["GET", "HEAD", "PUT"];
  if (upstreamPath === "/api/ollama-settings") return ["GET", "HEAD", "PUT"];
  if (/^\/api\/project-files\/[A-Za-z0-9_-]{1,120}$/.test(upstreamPath)) {
    return ["GET", "HEAD", "PUT", "DELETE"];
  }
  if ([
    "/api/chat",
    "/api/codex/chat",
    "/api/claude/chat",
    "/api/huggingface/pull",
    "/api/image-edit",
    "/api/image-gen",
    "/api/skills/import",
  ].includes(upstreamPath)) return ["POST"];
  if (upstreamPath === "/api/scheduled-tasks") return ["GET", "HEAD", "POST"];
  if (/^\/api\/scheduled-tasks\/[a-f0-9-]{36}$/.test(upstreamPath)) {
    return ["PATCH", "DELETE"];
  }
  if (/^\/api\/scheduled-tasks\/[a-f0-9-]{36}\/run$/.test(upstreamPath)) {
    return ["POST"];
  }
  return null;
}

function rewriteOllamaUiBody(body, contentType) {
  let text = body.toString("utf8");
  if (contentType.includes("text/html")) {
    text = text.replace(/href=(['"])\/chat\//gi, `href=$1${OLLAMA_UI_PROXY_PREFIX}/chat/`);
  } else if (contentType.includes("javascript")) {
    text = text.replace(/(['"`])\/api\//g, `$1${OLLAMA_UI_PROXY_PREFIX}/api/`);
  }
  return Buffer.from(text, "utf8");
}

function ollamaUiResponseHeaders(upstream, contentType, rewrite) {
  const headers = {};
  for (const name of ["content-type", "cache-control", "referrer-policy", "x-content-type-options", "retry-after", "location", "set-cookie"]) {
    const value = upstream.headers[name];
    if (value) headers[name] = value;
  }
  if (rewrite) headers["cache-control"] = "no-store";
  let contentSecurityPolicy = upstream.headers["content-security-policy"];
  if (contentType.includes("text/html") && contentSecurityPolicy) {
    const directives = contentSecurityPolicy
      .split(";")
      .map((directive) => directive.trim())
      .filter((directive) => directive && !/^frame-ancestors\b/i.test(directive));
    headers["content-security-policy"] = [...directives, "frame-ancestors 'self'"].join("; ");
  }
  return headers;
}

function proxyOllamaUi(req, res, parsed) {
  const proxyPath = parsed.pathname.slice(OLLAMA_UI_PROXY_PREFIX.length) || "/chat/";
  const upstreamPath = proxyPath === "/" ? "/chat/" : proxyPath;
  const allowedMethods = ollamaUiAllowedMethods(upstreamPath);
  if (!allowedMethods) return sendText(res, 404, "Not found");
  if (!allowedMethods.includes(req.method)) return sendText(res, 405, "Method Not Allowed");
  if (parsed.search.length > 4096) return sendText(res, 414, "Request URI too long");

  const requestLimit = upstreamPath === "/api/account/workspace" ? 34 * 1024 * 1024 : OLLAMA_UI_REQUEST_LIMIT;
  const contentLength = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > requestLimit) {
    req.resume();
    return sendText(res, 413, "Request body is too large");
  }

  const contentType = String(req.headers["content-type"] || "");
  const requestHeaders = {
    accept: String(req.headers.accept || "*/*").slice(0, 512),
    "accept-encoding": "identity",
    host: "localhost:8001",
    origin: String(req.headers.origin || "http://localhost:8001").slice(0, 512),
    referer: "http://localhost:8001/chat/",
    "user-agent": String(req.headers["user-agent"] || "CaracAL+ Ollama Chat Proxy").slice(0, 512),
  };
  if (req.headers.cookie) requestHeaders.cookie = String(req.headers.cookie).slice(0, 4096);
  if (contentType) requestHeaders["content-type"] = contentType.slice(0, 256);
  if (Number.isFinite(contentLength) && contentLength > 0) requestHeaders["content-length"] = contentLength;

  const upstream = http.request({
    host: OLLAMA_UI_RELAY_HOST,
    port: OLLAMA_UI_RELAY_PORT,
    method: req.method,
    path: upstreamPath + parsed.search,
    headers: requestHeaders,
    timeout: OLLAMA_UI_TIMEOUT_MS,
  }, (upstreamResponse) => {
    const status = upstreamResponse.statusCode || 502;
    const responseType = String(upstreamResponse.headers["content-type"] || "");
    const shouldRewrite = req.method !== "HEAD" &&
      (responseType.includes("text/html") || (upstreamPath === "/chat/app.js" && responseType.includes("javascript")));
    const headers = ollamaUiResponseHeaders(upstreamResponse, responseType, shouldRewrite);
    const location = String(upstreamResponse.headers.location || "");
    if (/^\/chat\/?(?:\?.*)?$/.test(location)) {
      headers.location = `${OLLAMA_UI_PROXY_PREFIX}/chat/${location.includes("?") ? location.slice(location.indexOf("?")) : ""}`;
    }

    if (!shouldRewrite) {
      if (upstreamResponse.headers["content-length"]) headers["content-length"] = upstreamResponse.headers["content-length"];
      res.writeHead(status, headers);
      if (req.method === "HEAD") {
        upstreamResponse.resume();
        return res.end();
      }
      upstreamResponse.pipe(res);
      return;
    }

    const chunks = [];
    let size = 0;
    upstreamResponse.on("data", (chunk) => {
      size += chunk.length;
      if (size > OLLAMA_UI_REWRITE_LIMIT) {
        upstreamResponse.destroy(new Error("Ollama chat asset is too large"));
        return;
      }
      chunks.push(chunk);
    });
    upstreamResponse.on("end", () => {
      if (res.destroyed) return;
      const body = rewriteOllamaUiBody(Buffer.concat(chunks), responseType);
      headers["content-length"] = body.length;
      res.writeHead(status, headers);
      res.end(body);
    });
    upstreamResponse.on("error", (error) => {
      if (!res.headersSent && !res.destroyed) sendText(res, 502, "Ollama chat response failed");
      else if (!res.destroyed) res.destroy(error);
    });
  });

  upstream.on("timeout", () => upstream.destroy(new Error("Ollama chat request timed out")));
  upstream.on("error", (error) => {
    if (!res.headersSent && !res.destroyed) sendText(res, 502, "Ollama chat is temporarily unreachable");
    else if (!res.destroyed) res.destroy(error);
  });
  req.on("aborted", () => upstream.destroy(new Error("Client request was aborted")));
  res.on("close", () => {
    if (!res.writableFinished) upstream.destroy(new Error("Client closed the Ollama chat response"));
  });

  if (req.method === "GET" || req.method === "HEAD" || contentLength === 0 && !req.headers["transfer-encoding"]) {
    upstream.end();
    return;
  }
  let size = 0;
  const limitBody = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > requestLimit) {
        callback(new Error("Request body is too large"));
      } else {
        callback(null, chunk);
      }
    },
  });
  limitBody.on("error", (error) => {
    upstream.destroy();
    req.resume();
    if (!res.headersSent && !res.destroyed) sendText(res, error.message === "Request body is too large" ? 413 : 400, error.message);
  });
  req.pipe(limitBody).pipe(upstream);
}

async function serveClientFile(req, res, requestPath) {
  const requested = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = safeClientPath(requested);
  if (!filePath) return sendText(res, 400, "Invalid path");
  try {
    let body = await fs.readFile(filePath);
    if (path.basename(filePath).toLowerCase() === "index.html") {
      let html = body.toString("utf8");
      html = html.replace(
        /var base_url\s*=\s*["']https:\/\/adventure\.land["']/g,
        "var base_url=location.origin",
      );
      html = rewriteCharacterSocket(html);
      html = injectPiClientScripts(html, await getPiStorageSeed());
      body = Buffer.from(injectPiLayoutStyle(html), "utf8");
    }
    res.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": body.length,
      "cache-control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error.code === "ENOENT") return sendText(res, 404, "Not found");
    throw error;
  }
}

async function serveCharacterClient(req, res, characterName) {
  if (!isConfiguredCharacter(characterName)) return sendText(res, 404, "Unknown character");
  const session = getConfiguredSession();
  if (!session) return sendText(res, 503, "Pi client session is not configured");
  const realm = await getCharacterRealm(characterName, session);

  const filePath = safeClientPath("/index.html");
  try {
    let html = await fs.readFile(filePath, "utf8");
    html = html.replace(/var inside="[^"]*";/, 'var inside="selection";');
    html = html.replace(
      /var user_id="[^"]*",user_auth="[^"]*";/,
      `var user_id=${JSON.stringify(session.userId)},user_auth=${JSON.stringify(session.userAuth)};`,
    );
    if (realm && realm.address && realm.path) {
      html = html.replace(
        /var server_address="[^"]*",server_path="[^"]*";/,
        `var server_address=${JSON.stringify(realm.address)},server_path=${JSON.stringify(realm.path)};`,
      );
    }
    html = html.replace(
      /character_to_load\s*=\s*(['"])[^'"]*\1/,
      `character_to_load=${JSON.stringify(characterName)}`,
    );
    html = injectPiClientScripts(html, await getPiStorageSeed());
    html = injectPiLayoutStyle(html);
    const body = Buffer.from(html, "utf8");
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-length": body.length,
      "cache-control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error.code === "ENOENT") return sendText(res, 404, "Not found");
    throw error;
  }
}

async function serveBridge(req, res, fileName = "pi-client-bridge.js") {
  const filePath = path.join(ROOT, "scripts", fileName);
  try {
    const body = await fs.readFile(filePath);
    res.writeHead(200, {
      "content-type": "text/javascript; charset=utf-8",
      "content-length": body.length,
      "cache-control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error.code === "ENOENT") return sendText(res, 404, "Not found");
    throw error;
  }
}

async function proxyPiStorage(req, res, remotePath) {
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await requestBody(req);
  const upstream = await fetch(PI_MONITOR_ORIGIN + remotePath, {
    method: req.method,
    headers: {
      "content-type": req.headers["content-type"] || "application/json; charset=utf-8",
      cookie: req.headers.cookie || "",
    },
    body,
  });
  const responseBody = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status, {
    "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "content-length": responseBody.length,
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : responseBody);
}

async function handler(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (parsed.pathname === "/__pi_client_restart") {
    if (!isInternalClientRestartRequest(req)) return sendText(res, 403, "Forbidden");
    sendText(res, 202, JSON.stringify({ ok: true, restarting: true }), "application/json; charset=utf-8");
    setTimeout(() => process.exit(0), 250);
    return;
  }
  if (parsed.pathname === "/__pi_client_health") {
    return sendText(res, 200, JSON.stringify({ ok: true, version: VERSION }), "application/json; charset=utf-8");
  }
  if (parsed.pathname === "/pi-client-bridge.js") {
    return serveBridge(req, res);
  }
  if (parsed.pathname === "/pi-localstorage-bridge.js") {
    return serveBridge(req, res, "pi-localstorage-bridge.js");
  }
  if (parsed.pathname === "/project-dashboard/status") {
    return projectDashboardStatus(req, res);
  }
  if (parsed.pathname === "/project-dashboard/activity") {
    return projectDashboardActivity(req, res);
  }
  if (parsed.pathname === "/project-dashboard/chat") {
    return projectDashboardChat(req, res);
  }
  if (parsed.pathname === "/pi-ollama/status") {
    return ollamaStatus(req, res);
  }
  if (parsed.pathname === "/pi-ollama/chat") {
    return ollamaChat(req, res);
  }
  if (parsed.pathname === OLLAMA_UI_PROXY_PREFIX || parsed.pathname.startsWith(OLLAMA_UI_PROXY_PREFIX + "/")) {
    return proxyOllamaUi(req, res, parsed);
  }
  if (parsed.pathname === "/ollama-chat" || parsed.pathname.startsWith("/ollama-chat/")) {
    return serveOllamaChatFile(req, res, parsed.pathname);
  }
  if (parsed.pathname === "/project-dashboard" || parsed.pathname.startsWith("/project-dashboard/")) {
    return serveProjectDashboardFile(req, res, parsed.pathname);
  }
  if (parsed.pathname === "/pi-storage/state" || parsed.pathname === "/pi-storage/sync" || parsed.pathname === "/pi-monitor/activity") {
    return proxyPiStorage(req, res, parsed.pathname + parsed.search);
  }
  if (parsed.pathname === "/hub") {
    res.writeHead(302, { location: "/_alhub/hub" });
    return res.end();
  }
  // The official game client creates this same-origin frame when CODE is
  // engaged. It is not part of the static client export, so proxy it through
  // the Pi just like the Hub pages and rewrite its supporting /js/ assets.
  if (parsed.pathname === "/runner" || parsed.pathname === "/executor") {
    return proxyRemote(req, res, parsed.pathname + parsed.search, true, true, false, true);
  }
  // Browser CODE runners fetch saved slots synchronously from this endpoint
  // when parent.get_code_file() has no local Electron file available.
  if (parsed.pathname === "/code.js") {
    return proxyRemote(req, res, parsed.pathname + parsed.search, false, true);
  }
  if (parsed.pathname.startsWith("/_pi_character/")) {
    const encodedName = parsed.pathname.slice("/_pi_character/".length);
    let characterName;
    try {
      characterName = decodeURIComponent(encodedName);
    } catch (_) {
      return sendText(res, 400, "Invalid character name");
    }
    return serveCharacterClient(req, res, characterName);
  }
  if (parsed.pathname.startsWith("/_alhub/")) {
    const remotePath = parsed.pathname.slice("/_alhub".length) + parsed.search;
    return proxyRemote(
      req,
      res,
      remotePath,
      true,
      true,
      true,
    );
  }
  // The official client replaces its URL with /character/... after it starts.
  // Keep that browser-visible URL Pi-local on refresh as well.
  if (parsed.pathname.startsWith("/character/")) {
    return proxyRemote(req, res, parsed.pathname + parsed.search, true, true, true);
  }
  if (parsed.pathname.startsWith("/api/")) {
    return proxyRemote(req, res, parsed.pathname + parsed.search);
  }
  if (parsed.pathname.startsWith("/json_api/")) {
    return proxyRemote(req, res, parsed.pathname + parsed.search);
  }
  if (parsed.pathname === "/steam-signup" || parsed.pathname.startsWith("/docs")) {
    return proxyRemote(req, res, parsed.pathname + parsed.search, parsed.pathname === "/docs");
  }
  return serveClientFile(req, res, parsed.pathname);
}

fs.access(path.join(CLIENT_ROOT, "index.html"))
  .then(() => {
    const server = http.createServer((req, res) => {
      if (isInternalClientRestartRequest(req)) return handler(req, res);
      const requestPath = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
      if (requestPath === OLLAMA_UI_PROXY_PREFIX || requestPath.startsWith(OLLAMA_UI_PROXY_PREFIX + "/")) {
        return handler(req, res).catch((error) => {
          console.error(error);
          if (!res.headersSent) sendText(res, 502, "Pi client proxy error");
          else res.destroy();
        });
      }
      pi_auth.handle_node_auth(req, res)
        .then((handled) => {
          if (handled) return;
          return handler(req, res);
        })
        .catch((error) => {
          console.error(error);
          if (!res.headersSent) sendText(res, 502, "Pi client proxy error");
          else res.destroy();
        });
    });
    server.on("upgrade", handleGameWebSocketUpgrade);
    server.listen(PORT, process.env.CARACAL_BIND_HOST || "::", () => {
      console.log(`Pi client server listening on http://localhost:${PORT}/ (version ${VERSION})`);
    });
  })
  .catch(() => {
    console.error(`Missing client export: ${path.join(CLIENT_ROOT, "index.html")}`);
    process.exit(1);
  });
