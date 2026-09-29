#!/usr/bin/env node
require("../scripts/load-env");
"use strict";

const http = require("node:http");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { URL } = require("node:url");
const pi_auth = require("../scripts/pi-auth");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.DASHBOARD_PORT || 8090);
const PUBLIC_ROOT = path.join(__dirname, "public");
const ACTIVITY_PATH = path.resolve(
  process.env.DASHBOARD_ACTIVITY_PATH || path.join(__dirname, "activity.json"),
);
const DATA_ROOT = path.join(ROOT, ".caracal-dashboard");
const CHAT_PATH = path.join(DATA_ROOT, "chat.jsonl");
const CHAT_LIMIT = 200;
const MESSAGE_LIMIT = 8000;
const CHAT_READ_LIMIT = CHAT_LIMIT * (MESSAGE_LIMIT + 256);
const ACTIVITY_READ_LIMIT = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const HEADERS_TIMEOUT_MS = 10_000;
const SNAPSHOT_STALE_AFTER_SECONDS = Math.max(
  15,
  Number(process.env.DASHBOARD_SNAPSHOT_STALE_AFTER_SECONDS || 90),
);
const PREFIX = "/project-dashboard";
const VERSION = process.env.MAINTAINER_DASHBOARD_VERSION || "maintainer-dashboard-1";

let lastActivitySnapshot = {};
let lastActivityReadError = null;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function requestBody(req, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(req.headers["content-length"]);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      reject(new Error("Request body is too large"));
      req.destroy();
      return;
    }
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

function dashboardPath(requestPath) {
  if (requestPath === "/" || requestPath === "/project-dashboard" || requestPath === "/project-dashboard/") {
    return "/index.html";
  }
  return requestPath.startsWith(`${PREFIX}/`) ? requestPath.slice(PREFIX.length) : requestPath;
}

function safePublicPath(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(dashboardPath(requestPath).split("?", 1)[0]);
  } catch (_) {
    return null;
  }
  const candidate = path.resolve(PUBLIC_ROOT, `.${decoded}`);
  if (candidate !== PUBLIC_ROOT && !candidate.startsWith(`${PUBLIC_ROOT}${path.sep}`)) return null;
  return candidate;
}

async function serveStatic(req, res, requestPath) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method Not Allowed");
  const filePath = safePublicPath(requestPath);
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

async function readActivitySnapshot() {
  try {
    const stats = await fs.stat(ACTIVITY_PATH);
    if (stats.size > ACTIVITY_READ_LIMIT) {
      lastActivityReadError = "snapshot_too_large";
      return lastActivitySnapshot;
    }
    const parsed = JSON.parse(await fs.readFile(ACTIVITY_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      lastActivityReadError = "invalid_snapshot";
      return lastActivitySnapshot;
    }
    lastActivitySnapshot = parsed;
    lastActivityReadError = null;
    return lastActivitySnapshot;
  } catch (error) {
    // The Ubuntu heartbeat replaces this file while the dashboard is reading
    // it. Keep the last complete snapshot during a short permission, rename,
    // or partial-write window instead of turning one transient read into a
    // full dashboard failure.
    if (["ENOENT", "EACCES", "EPERM", "EBUSY", "EMFILE", "ENFILE"].includes(error.code) || error instanceof SyntaxError) {
      lastActivityReadError = error instanceof SyntaxError ? "invalid_json" : error.code;
      // Log the transient error for debugging but continue with stale data
      console.debug("Dashboard activity file temporarily unavailable:", error.message);
      return lastActivitySnapshot;
    }
    throw error;
  }
}

function snapshotMetadata(snapshot) {
  const candidateGeneratedAtUtc = snapshot.generatedAtUtc;
  const generatedAtMs = typeof candidateGeneratedAtUtc === "string"
    ? Date.parse(candidateGeneratedAtUtc)
    : Number.NaN;
  const generatedAtUtc = Number.isFinite(generatedAtMs) ? candidateGeneratedAtUtc : null;
  const snapshotAgeSeconds = Number.isFinite(generatedAtMs)
    ? Math.max(0, Math.floor((Date.now() - generatedAtMs) / 1000))
    : null;
  return {
    snapshotGeneratedAtUtc: generatedAtUtc,
    snapshotAgeSeconds,
    snapshotFresh: Number.isFinite(snapshotAgeSeconds) && snapshotAgeSeconds <= SNAPSHOT_STALE_AFTER_SECONDS,
    snapshotSource: snapshot.source || null,
    snapshotReadError: lastActivityReadError,
  };
}

async function dashboardStatus(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method Not Allowed");
  const memory = process.memoryUsage();
  const snapshot = await readActivitySnapshot();
  const snapshotInfo = snapshotMetadata(snapshot);
  const body = JSON.stringify({
    ok: true,
    checkedAtUtc: new Date().toISOString(),
    environment: process.env.PI_ENVIRONMENT || "VPS production",
    host: os.hostname(),
    service: {
      version: VERSION,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      activityFile: fsSync.existsSync(ACTIVITY_PATH),
      activityReadable: snapshotInfo.snapshotReadError === null,
      chatFile: fsSync.existsSync(CHAT_PATH),
    },
    project: {
      repository: "Character01YourLookingFor/AdventureLandCode-Droid",
      dashboard: "dedicated maintainer dashboard container",
      dashboardPath: "/project-dashboard/",
      root: snapshot.project?.root || null,
      caracalRoot: snapshot.project?.caracalRoot || null,
    },
    ...snapshotInfo,
    git: snapshot.git || { ok: false, branch: null, clean: null, changes: [], commits: [] },
    commits: Array.isArray(snapshot.git?.commits) ? snapshot.git.commits : [],
    projectChangeLogs: Array.isArray(snapshot.projectChangeLogs) ? snapshot.projectChangeLogs : [],
    ollama: snapshot.ollama || { ok: false, version: null, loadedModels: [], error: "No local Ollama snapshot is available" },
    workerMetrics: snapshot.worker_metrics || {},
    production: snapshot.production || null,
    escalation: Array.isArray(snapshot.escalation) ? snapshot.escalation : [],
  });
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

async function dashboardActivity(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return sendText(res, 405, "Method Not Allowed");
  const payload = await readActivitySnapshot();
  const snapshotInfo = snapshotMetadata(payload);
  const git = payload.git || {};
  const commits = Array.isArray(payload.commits) && payload.commits.length ? payload.commits : (Array.isArray(git.commits) ? git.commits : []);
  const body = JSON.stringify({
    ok: true,
    generatedAtUtc: payload.generatedAtUtc || null,
    source: payload.source || "VPS deployment file",
    readError: snapshotInfo.snapshotReadError,
    snapshotAgeSeconds: snapshotInfo.snapshotAgeSeconds,
    snapshotFresh: snapshotInfo.snapshotFresh,
    commits,
    projectChangeLogs: Array.isArray(payload.projectChangeLogs) ? payload.projectChangeLogs : [],
    project: payload.project || {},
    git,
    ollama: payload.ollama || {},
    workerMetrics: payload.worker_metrics || {},
    production: payload.production || null,
    escalation: Array.isArray(payload.escalation) ? payload.escalation : [],
  });
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

async function readChat() {
  try {
    const stats = await fs.stat(CHAT_PATH);
    if (stats.size <= CHAT_READ_LIMIT) {
      const raw = await fs.readFile(CHAT_PATH, "utf8");
      return parseChat(raw);
    }
    const handle = await fs.open(CHAT_PATH, "r");
    try {
      const buffer = Buffer.alloc(CHAT_READ_LIMIT);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, stats.size - buffer.length);
      return parseChat(buffer.subarray(0, bytesRead).toString("utf8"));
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function parseChat(raw) {
  return raw.split(/\r?\n/).map((line) => {
    try { return JSON.parse(line); } catch (_) { return null; }
  }).filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && entry.text)
    .slice(-CHAT_LIMIT)
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : null,
      role: entry.role,
      createdAtUtc: typeof entry.createdAtUtc === "string" ? entry.createdAtUtc : null,
      status: typeof entry.status === "string" ? entry.status : null,
      executor: typeof entry.executor === "string" ? entry.executor : null,
      text: String(entry.text).slice(0, MESSAGE_LIMIT),
    }));
}

async function dashboardChat(req, res) {
  if (req.method === "GET" || req.method === "HEAD") {
    const body = JSON.stringify({ ok: true, messages: await readChat() });
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
    payload = JSON.parse((await requestBody(req)).toString("utf8"));
  } catch (error) {
    return sendText(res, 400, error.message === "Request body is too large" ? error.message : "Invalid JSON");
  }
  const text = String(payload && (payload.text ?? payload.message) || "").trim();
  if (!text) return sendText(res, 400, "Message text is required");
  if (text.length > MESSAGE_LIMIT) return sendText(res, 413, `Message is limited to ${MESSAGE_LIMIT} characters`);
  const record = { id: crypto.randomUUID(), role: "user", createdAtUtc: new Date().toISOString(), status: "queued", text };
  await fs.mkdir(DATA_ROOT, { recursive: true });
  await fs.appendFile(CHAT_PATH, `${JSON.stringify(record)}\n`, "utf8");
  const body = JSON.stringify({ ok: true, message: record });
  res.writeHead(202, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

async function handler(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathName = parsed.pathname;
  const matches = (name) => pathName === name || pathName === `${PREFIX}${name}`;
  if (matches("/status")) return dashboardStatus(req, res);
  if (matches("/activity")) return dashboardActivity(req, res);
  if (matches("/chat")) return dashboardChat(req, res);
  return serveStatic(req, res, pathName);
}

const server = http.createServer((req, res) => {
  res.setHeader("x-content-type-options", "nosniff");
  try {
    new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch (_) {
    sendText(res, 400, "Invalid request URL");
    return;
  }
  pi_auth.handle_node_auth(req, res)
    .then((handled) => handled || handler(req, res))
    .catch((error) => {
      console.error(error);
      if (!res.headersSent) sendText(res, 500, "Dashboard server error");
      else res.destroy();
    });
});
server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;
server.timeout = REQUEST_TIMEOUT_MS;

server.listen(PORT, "localhost", () => {
  console.log(`Maintainer dashboard listening on http://localhost:${PORT}/`);
});
