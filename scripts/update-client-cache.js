require("./load-env");
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const gameFiles = require("../vendor/caracAL/game_files");

const ROOT = path.resolve(__dirname, "..");
const EXPORT_ROOT = path.join(ROOT, "client", "export");
const CARACAL_ROOT = path.join(ROOT, "vendor", "caracAL");
const BASE_URL = new URL(
  process.env.ADVENTURE_LAND_CLIENT_BASE_URL || "https://adventure.land/",
).href;
const REQUEST_TIMEOUT_MS = Math.max(
  5000,
  Number(process.env.PI_CLIENT_UPDATE_TIMEOUT_MS || 45000),
);
const REQUEST_RETRIES = Math.max(
  0,
  Number(process.env.PI_CLIENT_UPDATE_RETRIES || 3),
);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const STATIC_EXTENSIONS = new Set([
  ".js", ".css", ".json", ".xml", ".txt", ".html",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".mp3", ".ogg", ".wav", ".m4a", ".webm", ".woff", ".woff2", ".ttf", ".otf",
]);
const TEXT_EXTENSIONS = new Set([".js", ".css", ".json", ".xml", ".txt", ".html"]);

function parseVersion(value) {
  const match = String(value || "").match(/^\d+$/);
  return match ? Number(match[0]) : null;
}

function retryDelayMs(attempt) {
  return Math.min(5000, 300 * (2 ** attempt));
}

function errorText(error) {
  return error && error.message ? error.message : String(error);
}

function isRetryableError(error) {
  return Boolean(
    error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENETUNREACH" ||
      error.code === "EAI_AGAIN" ||
      error.message === "fetch failed"),
  );
}

async function waitForRetry(attempt) {
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
}

async function fetchRemote(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  let lastError = null;
  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { "User-Agent": "CaracAL+ClientUpdater/1.0", ...(options.headers || {}) },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return response;
      const statusError = new Error(`${method} ${url} returned HTTP ${response.status}`);
      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= REQUEST_RETRIES) {
        throw statusError;
      }
      statusError.retryable = true;
      throw statusError;
    } catch (error) {
      if ((!isRetryableError(error) && !error.retryable) || attempt >= REQUEST_RETRIES) {
        throw new Error(
          `${method} ${url} failed after ${attempt + 1} attempt${attempt === 0 ? "" : "s"}: ${errorText(error)}`,
          { cause: error },
        );
      }
      lastError = error;
    }
    await waitForRetry(attempt);
  }
  throw new Error(`${method} ${url} failed: ${errorText(lastError)}`, { cause: lastError });
}

async function fetchText(url) {
  return (await fetchRemote(url)).text();
}

function remoteVersion(homepage, comm) {
  const homepageMatch = homepage.match(/game\.js\?v=([0-9]+)/);
  const commMatch = comm.match(/var\s+VERSION\s*=\s*['"]([0-9]+)/);
  const homepageVersion = homepageMatch ? Number(homepageMatch[1]) : null;
  const commVersion = commMatch ? Number(commMatch[1]) : null;
  const latestVersion = commVersion || homepageVersion;
  if (!Number.isInteger(latestVersion)) throw new Error("Adventure Land did not publish a recognizable client version");
  return { latestVersion, homepageVersion, commVersion };
}

function isStaticPath(url) {
  const extension = path.posix.extname(url.pathname).toLowerCase();
  return url.pathname === "/data.js" || STATIC_EXTENSIONS.has(extension);
}

function localPathFor(url) {
  const local = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!local || local.includes("..") || local.startsWith("/")) return null;
  return local.replaceAll("/", path.sep);
}

function resolveReference(reference, fromPath) {
  let value = String(reference || "").trim();
  value = value.replace(/^['"]|['"]$/g, "");
  if (!value || value.startsWith("data:") || value.startsWith("#")) return null;
  if (value.startsWith("//")) value = "https:" + value;
  const normalizedFromPath = fromPath.replaceAll(path.sep, "/");
  const stylesheetReference = /\.css$/i.test(normalizedFromPath);
  const rootReference = !stylesheetReference &&
    (/^(?:\.\/)?(?:images|sounds|js|css|libraries|phrases|fonts|pixel)\//i.test(value) ||
      /^(?:\.\/)?data\.js(?:[?#]|$)/i.test(value));
  const base = rootReference
    ? new URL(BASE_URL)
    : new URL("/" + normalizedFromPath, BASE_URL);
  const url = new URL(value, base);
  if (url.origin !== new URL(BASE_URL).origin || !isStaticPath(url)) return null;
  const localPath = localPathFor(url);
  return localPath ? { url, localPath } : null;
}

function discoverReferences(text, fromPath) {
  const references = [];
  // Do not turn disabled/commented-out tags or stylesheet examples into
  // required downloads. The live client currently contains a commented
  // CodeMirror javascript-lint.js tag that returns 404 when fetched.
  const source = String(text)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const patterns = [
    /(?:src|href)\s*=\s*["']([^"']+)["']/gi,
    /(?:https?:\/\/[^\s"'`()\[\]]+|(?:\.?\/?)(?:images|sounds|js|css|libraries|phrases|fonts|pixel)\/[A-Za-z0-9_./-]+\.(?:js|css|json|xml|txt|png|jpe?g|gif|webp|svg|ico|mp3|ogg|wav|m4a|webm|woff2?|ttf|otf)(?:\?[^\s"'`()\[\]]*)?)/gi,
    /(?:\.?\/?data\.js(?:\?[^\s"'`()\[\]]*)?)/gi,
    /url\(\s*["']?([^"')\s]+)["']?\s*\)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) references.push(match[1] || match[0]);
  }
  return references;
}

async function readCachedVersions() {
  let entries = [];
  try { entries = await fs.readdir(EXPORT_ROOT, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
  return entries.map((entry) => entry.isDirectory() ? parseVersion(entry.name) : null).filter(Number.isInteger).sort((a, b) => b - a);
}

async function downloadFullClient(version, homepage) {
  const target = path.join(EXPORT_ROOT, String(version));
  const targetIndex = path.join(target, "index.html");
  if (fsSync.existsSync(targetIndex)) return { updated: false, version, files: 0, reused: true };
  await fs.mkdir(EXPORT_ROOT, { recursive: true });

  // A previous interrupted download can leave the numeric version directory
  // behind without an index. Remove only that incomplete target so the final
  // atomic rename below cannot fail with EEXIST/ENOTEMPTY.
  if (fsSync.existsSync(target)) {
    await fs.rm(target, { recursive: true, force: true });
  }

  const temp = path.join(EXPORT_ROOT, `.update-${version}-${process.pid}-${Date.now()}`);
  await fs.mkdir(temp, { recursive: true });
  const queue = [{ url: new URL(BASE_URL), localPath: "index.html", bytes: Buffer.from(homepage, "utf8") }];
  const seen = new Set(["index.html"]);
  const files = [];
  try {
    const versionedReferences = [
      `/data.js?v=${version}&cache=1`,
      `/js/runner_functions.js?v=${version}`,
      `/js/runner_compat.js?v=${version}`,
      `/js/pixi/fake/pixi.min.js?v=${version}`,
      `/js/codemirror/fake/codemirror.js?v=${version}`,
      `/js/generated_zones.js?v=${version}`,
    ];
    for (const reference of versionedReferences) {
      const resolved = resolveReference(reference, "index.html");
      if (resolved && !seen.has(resolved.localPath)) { seen.add(resolved.localPath); queue.push(resolved); }
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const asset = queue[cursor];
      const destination = path.resolve(temp, asset.localPath);
      if (!destination.startsWith(path.resolve(temp) + path.sep)) throw new Error("Client asset escaped its version directory");
      await fs.mkdir(path.dirname(destination), { recursive: true });
      let bytes;
      try {
        bytes = asset.bytes || Buffer.from(await (await fetchRemote(asset.url)).arrayBuffer());
        await fs.writeFile(destination, bytes);
      } catch (error) {
        throw new Error(
          `Client asset ${asset.localPath} from ${asset.url.href} failed: ${errorText(error)}`,
          { cause: error },
        );
      }
      files.push({ localPath: asset.localPath.replaceAll(path.sep, "/"), sourceUrl: asset.url.href, size: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
      const extension = path.posix.extname(asset.localPath).toLowerCase();
      if (TEXT_EXTENSIONS.has(extension)) {
        const text = bytes.toString("utf8");
        for (const reference of discoverReferences(text, asset.localPath)) {
          const resolved = resolveReference(reference, asset.localPath);
          if (!resolved || seen.has(resolved.localPath)) continue;
          seen.add(resolved.localPath);
          queue.push(resolved);
        }
      }
    }
    await fs.writeFile(path.join(temp, "manifest.json"), JSON.stringify({ source: BASE_URL.replace(/\/$/, ""), clientVersion: version, exportedAtUtc: new Date().toISOString(), fileCount: files.length, files }, null, 2) + "\n", "utf8");
    await fs.access(path.join(temp, "index.html"));
    await fs.rename(temp, target);
    return { updated: true, version, files: files.length, reused: false };
  } catch (error) {
    await fs.rm(temp, { recursive: true, force: true });
    throw error;
  }
}

async function updateClientCache() {
  const [homepage, comm] = await Promise.all([fetchText(BASE_URL), fetchText(new URL("comm", BASE_URL).href)]);
  const versions = remoteVersion(homepage, comm);
  const fullVersions = await readCachedVersions();
  const previousCwd = process.cwd();
  let runtimeVersions;
  let runtimeCacheCurrent = false;
  try {
    process.chdir(CARACAL_ROOT);
    runtimeVersions = await gameFiles.available_versions();
    runtimeCacheCurrent = runtimeVersions.includes(versions.latestVersion)
      ? await gameFiles.has_versioned_cache(versions.latestVersion)
      : false;
  } finally { process.chdir(previousCwd); }
  const fullNeedsUpdate = !fullVersions.length || fullVersions[0] < versions.latestVersion;
  const runtimeNeedsUpdate = !runtimeVersions.length || runtimeVersions[0] < versions.latestVersion;
  const runtimeNeedsRefresh = runtimeVersions.includes(versions.latestVersion) && !runtimeCacheCurrent;
  if (!fullNeedsUpdate && !runtimeNeedsUpdate && !runtimeNeedsRefresh) {
    return { ok: true, updated: false, latestVersion: versions.latestVersion, fullClient: { version: fullVersions[0] }, caracALRuntime: { version: runtimeVersions[0] } };
  }
  const fullClient = fullNeedsUpdate ? await downloadFullClient(versions.latestVersion, homepage) : { updated: false, version: fullVersions[0], files: 0, reused: true };
  let runtimeVersion = runtimeVersions[0] || null;
  if (runtimeNeedsUpdate || runtimeNeedsRefresh) {
    const previousCwd = process.cwd();
    try { process.chdir(CARACAL_ROOT); runtimeVersion = await gameFiles.ensure_latest(); } finally { process.chdir(previousCwd); }
  }
  await fs.writeFile(path.join(EXPORT_ROOT, "LATEST_VERSION.txt"), String(versions.latestVersion) + "\n", "ascii");
  return { ok: true, updated: true, latestVersion: versions.latestVersion, fullClient, caracALRuntime: { updated: runtimeNeedsUpdate || runtimeNeedsRefresh, version: runtimeVersion } };
}

module.exports = updateClientCache;

if (require.main === module) {
  updateClientCache().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error && error.stack ? error.stack : error); process.exitCode = 1; });
}
