const { requireEnv } = require("./load-env");
if (process.env.AL_CODE_SYNC_ON_START !== "false") requireEnv("AL_CODE_API_TOKEN");
"use strict";

/*
 * Pull-only Adventure Land CODE sync for CaracAL+.
 *
 * This mirrors the account-facing part of the Adventure Land VS Code
 * extension. It never uploads local files. The API token is read from
 * AL_CODE_API_TOKEN and is intentionally not written to the project tree.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const https = require("node:https");

const DEFAULT_API_BASE_URL = "https://adventure.land/mcp_api";
const USER_AGENT = "CaracALPlus-account-code-sync/1.0";
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const RETRIES = 3;
const GET_CODE_CONCURRENCY = 4;
const PULL_ONLY_API_METHODS = new Set(["list_codes", "get_code", "get_libraries"]);

function parseArgs(argv) {
  const result = { root: path.resolve(__dirname, ".."), dryRun: false, quiet: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") result.root = path.resolve(argv[++index] || "");
    else if (arg === "--token") result.token = argv[++index] || "";
    else if (arg === "--api-base-url") result.apiBaseUrl = argv[++index] || "";
    else if (arg === "--dry-run") result.dryRun = true;
    else if (arg === "--quiet") result.quiet = true;
    else if (arg === "--help" || arg === "-h") result.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

function printHelp() {
  console.log(`Usage: node scripts/sync-account-code.js [options]

Pull every CODE slot and library from the Adventure Land account into the
resolved local code mirror. This command is pull-only. The consolidated
workspace uses ../SYNC/adventureland when it exists; deployments fall back
to CODE/adventureland unless ADVENTURELAND_CODE_ROOT is set.

Options:
  --root PATH              CaracAL+ root (default: project root)
  --token TOKEN            API token; prefer AL_CODE_API_TOKEN instead
  --api-base-url URL       API base URL (default: https://adventure.land/mcp_api)
  --dry-run                Fetch and compare, but do not write files
  --quiet                  Print only the final result
  --help                   Show this help

The token starts with mcp_. Create one at https://adventure.land/vscode.
`);
}

function log(message, options) {
  if (!options.quiet) console.log(message);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function safeFilePart(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 80);
  return cleaned || fallback;
}

function isNumberedCodeSlot(slot) {
  const text = String(slot || "");
  if (!/^\d+$/.test(text)) return false;
  const number = Number.parseInt(text, 10);
  return number >= 1 && number <= 100;
}

function targetRelativePath(code) {
  const folder = isNumberedCodeSlot(code.slot) ? "codes" : "characters";
  return path.join(
    "adventureland",
    folder,
    `${safeFilePart(code.name, "code")}.${safeFilePart(code.slot, "slot")}.js`,
  );
}

function codeRoot(root) {
  const configured = String(process.env.ADVENTURELAND_CODE_ROOT || "").trim();
  if (configured) return path.resolve(configured);
  const consolidated = path.resolve(root, "..", "SYNC", "adventureland");
  if (fs.existsSync(consolidated)) return consolidated;
  return path.join(root, "CODE", "adventureland");
}

function historyRoot(root) {
  return path.join(path.dirname(codeRoot(root)), "history", "account-code");
}

function localCodePath(root, relativeFile) {
  const normalized = String(relativeFile || "").replaceAll("\\", "/");
  if (normalized.startsWith("adventureland/")) {
    return path.join(path.dirname(codeRoot(root)), normalized);
  }
  return path.join(codeRoot(root), normalized);
}

function metadataPath(root) {
  return path.join(codeRoot(root), ".sync.json");
}

async function localCodeMatchesMetadata(root, summary, entry) {
  if (!entry || Number(entry.version) !== Number(summary.version)) return false;
  if (String(entry.name || "") !== String(summary.name || "code")) return false;

  const relativeFile = targetRelativePath(summary).replaceAll(path.sep, "/");
  if (String(entry.file || "") !== relativeFile) return false;

  const current = await readText(localCodePath(root, entry.file));
  return current !== null && String(entry.hash || "") === sha256(current);
}

function validateToken(token) {
  if (!/^mcp_[A-Za-z0-9_-]+$/.test(String(token || ""))) {
    throw new Error("Adventure Land API token must start with mcp_.");
  }
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      reject(new Error(`Invalid API URL: ${url}`));
      return;
    }

    const payload = Buffer.from(JSON.stringify(body), "utf8");
    const transport = parsed.protocol === "http:" ? http : https;
    const request = transport.request(
      parsed,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          "User-Agent": USER_AGENT,
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const chunks = [];
        let received = 0;
        response.on("data", (chunk) => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) {
            request.destroy(new Error("Adventure Land API response is too large."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data = {};
          try {
            if (text) data = JSON.parse(text);
          } catch (error) {
            reject(new Error("Adventure Land API returned invalid JSON."));
            return;
          }
          if (response.statusCode === 429) {
            const error = new Error("Adventure Land API rate limit reached.");
            error.retryAfterMs = Number(data.retry_after_ms) || 0;
            reject(error);
            return;
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Adventure Land API returned HTTP ${response.statusCode}.`));
            return;
          }
          resolve(data);
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("Adventure Land API request timed out.")));
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function apiCall(apiBaseUrl, token, method, fields) {
  if (!PULL_ONLY_API_METHODS.has(method)) {
    throw new Error(`Pull-only CODE sync refused API method: ${method}`);
  }
  let lastError;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const response = await postJson(`${apiBaseUrl}/${encodeURIComponent(method)}`, {
        token,
        ...(fields || {}),
      });
      if (response && response.failed) {
        const suffix = response.field ? ` (${response.field})` : "";
        throw new Error(`Adventure Land API failed: ${response.reason || "unknown error"}${suffix}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!error.retryAfterMs && attempt + 1 >= RETRIES) throw error;
      const delay = error.retryAfterMs || Math.min(1000 * 2 ** attempt, 10000);
      await sleep(Math.max(1000, Math.min(delay, 30000)));
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  async function consume() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => consume()));
  return results;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch (error) {
    return fallback;
  }
}

async function readText(file) {
  try {
    return await fsp.readFile(file, "utf8");
  } catch (error) {
    return null;
  }
}

// The normal Adventure Land browser client executes dynamically appended
// <script> elements. CaracAL's headless runner uses jsdom, where those inline
// elements are inert, so the account merchant loader must route its module
// loads through CaracAL's native load_code bridge instead. Keep this as a
// deterministic local compatibility transform: CODE Sync remains pull-only,
// while the headless mirror remains runnable without changing the online CODE.
function applyHeadlessLoaderCompatibility(remoteText) {
  const text = String(remoteText || "");
  const signature = "function merchantExecuteModule(slot, code) {";
  if (!text.includes(signature) || text.includes("CaracAL runs CODE in a headless jsdom context.")) {
    return { text, adapted: false };
  }

  const start = text.indexOf(signature);
  const endMarker = "\n}\n\nfunction loadMerchantModuleLegacy";
  const end = text.indexOf(endMarker, start);
  if (end < 0) {
    throw new Error("Merchant account loader has an unsupported module-execution layout.");
  }

  const replacement = [
    "function merchantExecuteModule(slot, code) {",
    "    // CaracAL runs CODE in a headless jsdom context.  Appending a script",
    "    // element is the browser-client mechanism, but jsdom does not execute",
    "    // inline script elements.  Use CaracAL's native load_code bridge there;",
    "    // it evaluates the already-synced slot in the runner context.  The",
    "    // browser path remains unchanged for the normal Adventure Land client.",
    "    if (typeof parent !== \"undefined\" && parent !== globalThis &&",
    "        parent.caracAL && typeof parent.caracAL.load_scripts === \"function\") {",
    "        loadMerchantModuleLegacy(slot);",
    "        return;",
    "    }",
    "    var library = document.createElement(\"script\");",
    "    library.type = \"text/javascript\";",
    "    library.text = code;",
    "    library.onerror = function () {",
    "        game_log(\"Merchant module failed to load: slot \" + slot, \"red\");",
    "    };",
    "    document.getElementsByTagName(\"head\")[0].appendChild(library);",
    "}",
  ].join("\n");

  return {
    text: text.slice(0, start) + replacement + text.slice(end + 2),
    adapted: true,
  };
}

// The online account loader can lag behind the local merchant source while
// CaracAL is being used as the headless client.  Keep the pull-only sync
// contract, but make the headless mirror load the server-side dashboard
// publisher when the online merchant loader does not list it yet.
function applyCaracALPublisherSlotCompatibility(remoteText, relativeFile) {
  const text = String(remoteText || "");
  const normalizedFile = String(relativeFile || "").replaceAll(path.sep, "/");
  const isMerchantLoader = normalizedFile.includes("/characters/Character01MCH.") &&
    text.includes("var merchantModules = [");
  if (!isMerchantLoader || text.includes("SLOT_CARACAL_PUBLISHER")) {
    return { text, adapted: false };
  }

  const slotLine = /^([ \t]*var SLOT_GEAR_TIERS = 22;[^\r\n]*)$/m;
  if (!slotLine.test(text)) {
    throw new Error("Merchant account loader has no supported CaracAL publisher slot anchor.");
  }
  const moduleAnchor = /^([ \t]*)(\[SLOT_GEAR_TIERS,[^\r\n]*)\r?\n\];/m;
  if (!moduleAnchor.test(text)) {
    throw new Error("Merchant account loader has no supported module-table terminator.");
  }

  const withSlot = text.replace(slotLine, "$1\nvar SLOT_CARACAL_PUBLISHER = 98; // CaracAL server-side dashboard records");
  const withModule = withSlot.replace(moduleAnchor, (_match, indent, gearLine) => {
    const commaGearLine = gearLine.trimEnd().endsWith(",") ? gearLine : `${gearLine},`;
    return `${indent}${commaGearLine.trimStart()}\n` +
      `${indent}// CaracAL dashboard publisher; available in Lite and Full headless modes.\n` +
      `${indent}[SLOT_CARACAL_PUBLISHER,            IN_LITE_AND_FULL]\n];`;
  });
  return { text: withModule, adapted: true };
}

// The Tracktrix response is populated only after the game client requests the
// same socket event used by the in-game Tracktrix window.  Older online
// publisher slots only read parent.tracker, so add a low-frequency request to
// the local headless mirror without changing the online CODE source.
function applyCaracALTracktrixRequestCompatibility(remoteText, relativeFile) {
  const text = String(remoteText || "");
  const normalizedFile = String(relativeFile || "").replaceAll(path.sep, "/");
  const isPublisher = normalizedFile.endsWith("/codes/CaracALPublisher.98.js");
  const marker = "caracalHeadlessTracktrixRequestV1";
  if (!isPublisher || text.includes(marker)) {
    return { text, adapted: false };
  }

  const request = [
    "",
    "// CaracAL headless Tracktrix request compatibility v1.",
    `(function ${marker}() {`,
    "    function requestTracker() {",
    "        try {",
    "            var root = null;",
    "            try { root = typeof parent !== \"undefined\" && parent ? parent : null; } catch (_) { }",
    "            if (root && root.socket && typeof root.socket.emit === \"function\") root.socket.emit(\"tracker\");",
    "        } catch (_) { }",
    "    }",
    "    requestTracker();",
    "    if (typeof alTrackInterval === \"function\") alTrackInterval(requestTracker, 10000);",
    "    else if (typeof setInterval === \"function\") setInterval(requestTracker, 10000);",
    "})();",
    "",
  ].join("\n");
  return { text: text + request, adapted: true };
}

async function writeAtomic(file, text, dryRun) {
  if (dryRun) return;
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(temporary, text, "utf8");
  await fsp.rename(temporary, file);
}

async function archiveFile(file, root, dryRun, label) {
  if (!fs.existsSync(file)) return "";
  const relative = path.relative(codeRoot(root), file);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const destination = path.join(historyRoot(root), stamp, relative);
  if (!dryRun) {
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await fsp.rename(file, destination);
  }
  return destination;
}

async function syncCodeFile(root, remote, metadata, options) {
  const relativeFile = targetRelativePath(remote);
  const file = localCodePath(root, relativeFile);
  const current = await readText(file);
  const upstreamText = String(remote.code || "");
  const loaderCompatibility = applyHeadlessLoaderCompatibility(upstreamText);
  const publisherSlotCompatibility = applyCaracALPublisherSlotCompatibility(
    loaderCompatibility.text,
    relativeFile,
  );
  const trackerCompatibility = applyCaracALTracktrixRequestCompatibility(
    publisherSlotCompatibility.text,
    relativeFile,
  );
  const compatibility = {
    text: trackerCompatibility.text,
    adapted: loaderCompatibility.adapted || publisherSlotCompatibility.adapted || trackerCompatibility.adapted,
    labels: [
      loaderCompatibility.adapted ? "loader" : "",
      publisherSlotCompatibility.adapted ? "publisher-slot" : "",
      trackerCompatibility.adapted ? "tracker-request" : "",
    ].filter(Boolean),
  };
  const remoteText = compatibility.text;
  const entry = metadata.files[String(remote.slot)];
  const same = current !== null && sha256(current) === sha256(remoteText);

  if (compatibility.adapted) {
    log(`Applied CaracAL headless compatibility (${compatibility.labels.join(", ")}) to ${relativeFile}`, options);
  }

  if (!same && current !== null) {
    const archived = await archiveFile(file, root, options.dryRun, "remote update");
    log(`Archived ${relativeFile}${archived ? ` -> ${path.relative(root, archived)}` : " (dry-run)"}`, options);
  }
  if (!same) {
    await writeAtomic(file, remoteText, options.dryRun);
    log(`${options.dryRun ? "Would write" : "Wrote"} ${relativeFile} (slot ${remote.slot}, v${remote.version || 0})`, options);
  }

  metadata.files[String(remote.slot)] = {
    slot: String(remote.slot),
    name: String(remote.name || "code"),
    version: Number(remote.version) || 0,
    file: path.posix.join("adventureland", relativeFile.replaceAll(path.sep, "/").replace(/^adventureland\//, "")),
    hash: sha256(remoteText),
    upstream_hash: sha256(upstreamText),
    compatibility: compatibility.adapted ? `caracal-headless-${compatibility.labels.join("+")}-v1` : null,
    updated_at: new Date().toISOString(),
  };
  return !same;
}

function accountCodeMapText(entries) {
  const map = {};
  for (const entry of entries) {
    if (isNumberedCodeSlot(entry.slot)) continue;
    map[String(entry.name || "")] = path.posix.join(
      "adventureland/characters",
      `${safeFilePart(entry.name, "character")}.${safeFilePart(entry.slot, "slot")}.js`,
    );
  }
  return `// Generated by scripts/sync-account-code.js. Do not edit.\n` +
    `// It maps each account character to its locally pulled CODE entry file.\n` +
    `(async function () {\n` +
    `  parent.__ADVENTURELAND_ACCOUNT_CODE_MAP_FOUND = true;\n` +
    `  const scripts = ${JSON.stringify(map, null, 2)};\n` +
    `  const name = typeof character === "object" && character ? String(character.name || "") : "";\n` +
    `  const script = scripts[name];\n` +
    `  if (!script) throw new Error("No locally synced Adventure Land CODE file for character " + name);\n` +
    `  await parent.caracAL.load_scripts([script]);\n` +
    `})();\n`;
}

async function syncLibraries(root, libraries, options) {
  let changed = 0;
  for (const name of Object.keys(libraries || {}).sort()) {
    const safeName = safeFilePart(name, "library.js");
    if (!safeName.endsWith(".js")) continue;
    const file = path.join(codeRoot(root), "libraries", safeName);
    const text = String(libraries[name] || "");
    const current = await readText(file);
    if (current !== text) {
      if (current !== null) await archiveFile(file, root, options.dryRun, "library update");
      await writeAtomic(file, text, options.dryRun);
      log(`${options.dryRun ? "Would write" : "Wrote"} ${path.relative(root, file)}`, options);
      changed += 1;
    }
  }
  return changed;
}

async function syncHeadlessEntrypoints(root, options) {
  for (const name of ["Merchant.js", "Trio.js"]) {
    const template = await readText(path.join(root, "scripts", "headless", name));
    if (template === null) {
      throw new Error(`Missing headless entrypoint template: scripts/headless/${name}`);
    }
    const target = path.join(codeRoot(root), "headless", name);
    const current = await readText(target);
    if (current === template) continue;
    await writeAtomic(target, template, options.dryRun);
    log(`${options.dryRun ? "Would write" : "Wrote"} ${path.relative(root, target)}`, options);
  }
}

async function run(options) {
  const token = String(options.token || process.env.AL_CODE_API_TOKEN || "").trim();
  validateToken(token);
  const apiBaseUrl = String(options.apiBaseUrl || process.env.AL_CODE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
  const metadata = await readJson(metadataPath(options.root), { version: 1, files: {} });
  if (!metadata.files || typeof metadata.files !== "object") metadata.files = {};
  await syncHeadlessEntrypoints(options.root, options);

  const listed = await apiCall(apiBaseUrl, token, "list_codes");
  const codes = (listed.codes || []).slice().sort((left, right) => String(left.slot).localeCompare(String(right.slot), undefined, { numeric: true }));
  const remoteSlots = new Set(codes.map((code) => String(code.slot)));
  const remoteCodes = new Array(codes.length);
  const pending = [];

  for (let index = 0; index < codes.length; index += 1) {
    const summary = codes[index];
    const normalizedSummary = {
      ...summary,
      slot: String(summary.slot),
      name: String(summary.name || "code"),
      version: Number(summary.version) || 0,
    };
    remoteCodes[index] = normalizedSummary;
    if (!await localCodeMatchesMetadata(options.root, normalizedSummary, metadata.files[normalizedSummary.slot])) {
      pending.push({ index, summary: normalizedSummary });
    }
  }

  const changedResults = await mapWithConcurrency(
    pending,
    GET_CODE_CONCURRENCY,
    async ({ index, summary }) => {
      const result = await apiCall(apiBaseUrl, token, "get_code", { slot: summary.slot });
      const remote = result.code && typeof result.code === "object" ? result.code : result;
      remote.slot = String(remote.slot || summary.slot);
      remote.name = String(remote.name || summary.name || "code");
      remote.version = Number(remote.version || summary.version) || 0;
      remoteCodes[index] = remote;
      return (await syncCodeFile(options.root, remote, metadata, options)) ? 1 : 0;
    },
  );
  const changed = changedResults.reduce((total, value) => total + value, 0);

  for (const slot of Object.keys(metadata.files)) {
    if (remoteSlots.has(slot)) continue;
    const entry = metadata.files[slot];
    const oldFile = entry && entry.file ? localCodePath(options.root, entry.file) : "";
    if (oldFile) {
      const archived = await archiveFile(oldFile, options.root, options.dryRun, "remote deletion");
      if (archived) log(`Archived removed remote slot ${slot} -> ${path.relative(options.root, archived)}`, options);
    }
    delete metadata.files[slot];
    changed += 1;
  }

  const librariesResult = await apiCall(apiBaseUrl, token, "get_libraries");
  const librariesChanged = await syncLibraries(options.root, librariesResult.libraries || {}, options);
  const mapFile = path.join(codeRoot(options.root), "headless", "AccountCodeMap.js");
  await writeAtomic(mapFile, accountCodeMapText(remoteCodes), options.dryRun);

  metadata.version = 1;
  metadata.source = "https://adventure.land/vscode";
  metadata.synced_at = new Date().toISOString();
  if (!options.dryRun) {
    await writeAtomic(metadataPath(options.root), `${JSON.stringify(metadata, null, 2)}\n`, false);
  }

  console.log(`CODE_SYNC_OK slots=${codes.length} libraries=${Object.keys(librariesResult.libraries || {}).length} changed=${changed + librariesChanged} dry_run=${options.dryRun ? "true" : "false"}`);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }
    await run(options);
  } catch (error) {
    console.error(`CODE_SYNC_FAILED: ${error.message || error}`);
    process.exitCode = 1;
  }
}

main();
