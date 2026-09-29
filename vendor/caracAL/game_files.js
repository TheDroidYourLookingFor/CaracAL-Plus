const base_url = "https://adventure.land";
const fs = require("fs").promises;
const { createWriteStream } = require("fs");
const { pipeline } = require("stream");
const { promisify } = require("util");
const crypto = require("crypto");
const streamPipeline = promisify(pipeline);
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const path = require("path");
const cache_marker_name = ".caracal-versioned-client-cache.json";
const CLIENT_EXPORT_ROOT = path.resolve(__dirname, "..", "..", "client", "export");
const { console } = require("./src/LogUtils");

function get_runner_files() {
  return [
    "/js/common_functions.js",
    "/js/old_common_functions.js",
    "/js/runner_functions.js",
    "/js/runner_compat.js",
  ];
}

// Keep this order aligned with the browser client. The headless VM needs the
// same shared helpers and localization objects before functions.js/game.js
// evaluate; caracAL historically omitted these newer split-out files.
function get_game_files() {
  return [
    "/js/phrases.js",
    "/phrases/en.js",
    "/js/pixi/fake/pixi.min.js",
    "/js/libraries/combined.js",
    "/js/codemirror/fake/codemirror.js",

    "/js/common_functions.js",
    "/js/old_common_functions.js",
    "/js/functions.js",
    "/js/generated_zones.js",
    "/js/entity_animations.js",
    "/js/game.js",
    "/js/html.js",
    "/js/progression/sources.js",
    "/js/progression/stats.js",
    "/js/progression/engine.js",
    "/js/progression/runtime.js",
    "/js/progression/ui.js",
    "/js/merrit_stand_notice.js",
    "/js/tavern_wheel.js",
    "/js/tavern_slots.js",
    "/js/tavern_poker.js",
    "/js/payments.js",
    "/js/keyboard.js",
    "/data.js",
  ];
}

async function cull_versions(exclusions) {
  const all_versions = await available_versions();
  const target_culls = all_versions.filter(
    (x, i) => i >= 2 && !exclusions.includes(x),
  );
  for (let cull of target_culls) {
    try {
      console.log("culling version " + cull);
      await fs.rmdir("./game_files/" + cull, { recursive: true });
    } catch (e) {
      console.warn("failed to cull version " + cull, e);
    }
  }
}

async function available_versions() {
  return (await fs.readdir("./game_files", { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((x) => x.match(/^\d+$/))
    .map((x) => parseInt(x))
    .sort()
    .reverse();
}

async function download_file(url, file_p) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`failed to download ${url}: ${response.statusText}`);
  }

  return await streamPipeline(response.body, createWriteStream(file_p));
}

function versioned_resource_url(resource, version) {
  const url = new URL(resource, base_url);
  if (!url.searchParams.has("v")) {
    url.searchParams.set("v", String(version));
  }
  if (url.pathname === "/data.js") {
    url.searchParams.set("cache", "1");
  }
  return url.href;
}

async function get_latest_version() {
  const raw = await fetch(base_url);
  if (!raw.ok) {
    throw new Error(`failed to check version: ${raw.statusText}`);
  }
  const html = await raw.text();
  const match = /game\.js\?v=([0-9]+)"/.exec(html);
  if (!match) {
    throw new Error(`malformed version response`);
  }
  return parseInt(match[1]);
}

function get_version_resources() {
  return get_game_files()
    .concat(get_runner_files())
    .filter(function (item, pos, self) {
      return self.indexOf(item) == pos;
    });
}

function expected_cache_files(resources) {
  return resources.map((resource) => path.posix.basename(resource)).sort();
}

async function get_client_export_source(version, resources) {
  const export_root = path.join(CLIENT_EXPORT_ROOT, String(version));
  let manifest_text;
  let manifest;
  try {
    manifest_text = await fs.readFile(path.join(export_root, "manifest.json"), "utf8");
    manifest = JSON.parse(manifest_text);
  } catch (_) {
    return null;
  }
  if (Number(manifest.clientVersion) !== Number(version)) return null;
  const manifest_files = new Set((manifest.files || []).map((file) => file.localPath));
  for (const resource of resources) {
    const relative_path = resource.replace(/^\//, "");
    if (!manifest_files.has(relative_path)) return null;
    try {
      const stats = await fs.stat(path.join(export_root, relative_path));
      if (!stats.isFile() || stats.size === 0) return null;
    } catch (_) {
      return null;
    }
  }
  return {
    root: export_root,
    manifestSha256: crypto.createHash("sha256").update(manifest_text).digest("hex"),
  };
}

async function has_versioned_cache(version) {
  const cache_root = path.join(".", "game_files", String(version));
  let marker;
  try {
    marker = JSON.parse(await fs.readFile(path.join(cache_root, cache_marker_name), "utf8"));
  } catch (_) {
    return false;
  }
  const resources = get_version_resources();
  const expected_files = expected_cache_files(resources);
  const client_export = await get_client_export_source(version, resources);
  const expected_source = client_export ? "client-export" : "official-versioned-url";
  if (
    marker.version !== Number(version) ||
    JSON.stringify(marker.files) !== JSON.stringify(expected_files) ||
    marker.source !== expected_source ||
    marker.sourceManifestSha256 !== (client_export ? client_export.manifestSha256 : null)
  ) {
    return false;
  }
  for (const filename of expected_files) {
    try {
      const stats = await fs.stat(path.join(cache_root, filename));
      if (!stats.isFile() || stats.size === 0) return false;
    } catch (_) {
      return false;
    }
  }
  return true;
}

function locate_game_file(resource, version) {
  return `./game_files/${version}/${path.posix.basename(resource)}`;
}

async function ensure_latest() {
  const version = await get_latest_version();
  if (await has_versioned_cache(version)) {
    console.log(`version ${version} is already downloaded with versioned resources`);
    return version;
  }

  const cache_root = path.join(".", "game_files", String(version));
  const temp_root = path.join(
    cache_root,
    `.update-${process.pid}-${Date.now()}`,
  );
  const resources = get_version_resources();
  const client_export = await get_client_export_source(version, resources);
  console.log(
    client_export
      ? `refreshing version ${version} from the matching client export`
      : `refreshing version ${version} from versioned Adventure Land URLs`,
  );
  await fs.mkdir(temp_root, { recursive: true });
  try {
    if (client_export) {
      await Promise.all(resources.map((resource) =>
        fs.copyFile(
          path.join(client_export.root, resource.replace(/^\//, "")),
          path.join(temp_root, path.posix.basename(resource)),
        ),
      ));
    } else {
      await Promise.all(resources.map((resource) =>
        download_file(
          versioned_resource_url(resource, version),
          path.join(temp_root, path.posix.basename(resource)),
        ),
      ));
    }
    await fs.mkdir(cache_root, { recursive: true });
    for (const filename of expected_cache_files(resources)) {
      await fs.copyFile(
        path.join(temp_root, filename),
        path.join(cache_root, filename),
      );
    }
    await fs.writeFile(
      path.join(cache_root, cache_marker_name),
      JSON.stringify({
        version: Number(version),
        files: expected_cache_files(resources),
        source: client_export ? "client-export" : "official-versioned-url",
        sourceManifestSha256: client_export ? client_export.manifestSha256 : null,
      }, null, 2) + "\n",
      "utf8",
    );
  } finally {
    await fs.rm(temp_root, { recursive: true, force: true });
  }
  return version;
}
exports.cull_versions = cull_versions;
exports.available_versions = available_versions;
exports.ensure_latest = ensure_latest;
exports.locate_game_file = locate_game_file;
exports.get_runner_files = get_runner_files;
exports.get_game_files = get_game_files;
exports.has_versioned_cache = has_versioned_cache;
