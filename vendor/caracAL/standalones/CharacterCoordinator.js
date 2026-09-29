require("../../../scripts/load-env");
const child_process = require("node:child_process");
const account_info = require("../account_info");
const game_files = require("../game_files");
const bwi = require("bot-web-interface");
const monitoring_util = require("../monitoring_util");
const express = require("express");
const fs_regular = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const net = require("node:net");
const vm = require("node:vm");
const os_regular = require("node:os");
const { URL } = require("node:url");
const fetch_remote = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const pi_auth = require("../../../scripts/pi-auth");
const update_client_cache = require("../../../scripts/update-client-cache");
const {
  LOCALSTORAGE_PATH,
  LOCALSTORAGE_ROTA_PATH,
  STAT_BEAT_INTERVAL,
} = require("../src/CONSTANTS");
const { log, console, ctype_to_clid } = require("../src/LogUtils");

const FileStoredKeyValues = require("../src/FileStoredKeyValues");
const {
  SHARED_STORAGE_MODE,
  storage_paths,
  resolve_storage_mode,
  is_pi_shared_storage,
} = require("../src/StorageMode");

const MONITOR_WINDOW_LAYOUT_PATH = path.join(
  __dirname,
  "..",
  "pi-monitor-window-layout.json",
);
const PI_MONITOR_SETTINGS_PATH = path.join(
  __dirname,
  "..",
  "pi-monitor-settings.json",
);
const PI_PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const PI_MONITOR_ACTIVITY_PATH = path.join(PI_PROJECT_ROOT, "runtime", "pi-monitor-activity.json");
const PI_MONITOR_ACTIVITY_LIMIT = 25;
const PI_MONITOR_STATS_PATH = path.join(PI_PROJECT_ROOT, "runtime", "pi-monitor-stats.json");
const PI_MONITOR_STATS_LIMIT = 52560;
const PI_MONITOR_SERVER_LATENCY_PATH = path.join(PI_PROJECT_ROOT, "runtime", "pi-monitor-server-latency.json");
const PI_MONITOR_SERVER_LATENCY_LIMIT = 2880;
const ACCOUNT_CODE_SYNC_PATH = path.join(PI_PROJECT_ROOT, "scripts", "sync-account-code.js");
const ACCOUNT_CODE_SYNC_TIMEOUT_MS = 5 * 60 * 1000;
let pi_monitor_activity_store = null;
let pi_monitor_activity_write = Promise.resolve();
let pi_monitor_stats_store = null;
let pi_monitor_stats_write = Promise.resolve();
let pi_monitor_server_latency_store = null;
let pi_monitor_server_latency_write = Promise.resolve();
let account_code_sync_in_progress = null;

function normalize_monitor_activity_event(event) {
  if (!event || typeof event !== "object") return null;
  const message = String(event.message || "").trim().slice(0, 2000);
  const time = new Date(event.time || event.timestamp || 0);
  if (!message || Number.isNaN(time.getTime())) return null;
  return { message, time: time.toISOString() };
}

function normalize_monitor_activity_store(value) {
  const characters = {};
  const source = value && typeof value.characters === "object" ? value.characters : {};
  Object.entries(source).forEach(([name, events]) => {
    const safeName = String(name || "").trim().slice(0, 160);
    if (!safeName || !Array.isArray(events)) return;
    characters[safeName] = events
      .map(normalize_monitor_activity_event)
      .filter(Boolean)
      .sort((left, right) => Date.parse(right.time) - Date.parse(left.time))
      .slice(0, PI_MONITOR_ACTIVITY_LIMIT);
  });
  return {
    version: 1,
    updatedAt: Number(value && value.updatedAt) || 0,
    characters,
  };
}

async function read_monitor_activity_store() {
  if (pi_monitor_activity_store) return pi_monitor_activity_store;
  try {
    const raw = await fs_regular.promises.readFile(PI_MONITOR_ACTIVITY_PATH, "utf8");
    pi_monitor_activity_store = normalize_monitor_activity_store(JSON.parse(raw));
  } catch (_) {
    pi_monitor_activity_store = normalize_monitor_activity_store(null);
  }
  return pi_monitor_activity_store;
}

async function append_monitor_activity(name, event) {
  const safeName = String(name || "").trim().slice(0, 160);
  const safeEvent = normalize_monitor_activity_event(event);
  if (!safeName || !safeEvent) throw new Error("Invalid monitor activity event");
  const job = async () => {
    const store = await read_monitor_activity_store();
    const events = Array.isArray(store.characters[safeName]) ? store.characters[safeName] : [];
    const duplicate = events.some((item) => item.time === safeEvent.time && item.message === safeEvent.message);
    if (!duplicate) {
      events.unshift(safeEvent);
      store.characters[safeName] = events
        .sort((left, right) => Date.parse(right.time) - Date.parse(left.time))
        .slice(0, PI_MONITOR_ACTIVITY_LIMIT);
      store.updatedAt = Date.now();
      await fs_regular.promises.mkdir(path.dirname(PI_MONITOR_ACTIVITY_PATH), { recursive: true });
      const tempPath = `${PI_MONITOR_ACTIVITY_PATH}.${process.pid}.tmp`;
      await fs_regular.promises.writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await fs_regular.promises.rename(tempPath, PI_MONITOR_ACTIVITY_PATH);
    }
    return store;
  };
  pi_monitor_activity_write = pi_monitor_activity_write.catch(() => {}).then(job);
  return pi_monitor_activity_write;
}

function finite_stat(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finite_stat_map(value, limit = 250) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .slice(0, limit)
    .map(([key, item]) => [String(key).slice(0, 160), Math.max(0, finite_stat(item))])
    .filter(([, item]) => item > 0));
}

function normalize_monitor_stats_sample(sample) {
  if (!sample || typeof sample !== "object") return null;
  const at = new Date(sample.at || sample.time || sample.timestamp || 0);
  if (Number.isNaN(at.getTime())) return null;
  const sessionKey = String(sample.sessionKey || "").trim().slice(0, 300);
  if (!sessionKey) return null;
  const characters = Array.isArray(sample.characters) ? sample.characters.slice(0, 32).map((character) => {
    if (!character || typeof character !== "object") return null;
    const damage = character.damage && typeof character.damage === "object" ? Object.fromEntries(Object.entries(character.damage).slice(0, 64).map(([name, entry]) => [String(name).slice(0, 120), {
      dps: Math.max(0, finite_stat(entry?.dps)),
      damage: Math.max(0, finite_stat(entry?.damage)),
    }])) : {};
    return {
      name: String(character.name || "Unknown").slice(0, 160),
      role: String(character.role || "").slice(0, 32),
      startedAt: String(character.startedAt || "").slice(0, 40),
      goldEarned: Math.max(0, finite_stat(character.goldEarned)),
      goldBanked: Math.max(0, finite_stat(character.goldBanked)),
      xpGained: Math.max(0, finite_stat(character.xpGained)),
      kills: Math.max(0, finite_stat(character.kills)),
      mobKills: finite_stat_map(character.mobKills),
      itemCounts: finite_stat_map(character.itemCounts),
      damage,
    };
  }).filter(Boolean) : [];
  if (!characters.length) return null;
  return { at: at.toISOString(), sessionKey, characters };
}

function normalize_monitor_stats_store(value) {
  const samples = Array.isArray(value?.samples) ? value.samples.map(normalize_monitor_stats_sample).filter(Boolean) : [];
  const deduped = new Map();
  samples.forEach((sample) => deduped.set(`${sample.sessionKey}\u0000${sample.at}`, sample));
  return {
    version: 1,
    updatedAt: Number(value?.updatedAt) || 0,
    samples: Array.from(deduped.values()).sort((left, right) => Date.parse(left.at) - Date.parse(right.at)).slice(-PI_MONITOR_STATS_LIMIT),
  };
}

async function read_monitor_stats_store() {
  if (pi_monitor_stats_store) return pi_monitor_stats_store;
  try {
    const raw = await fs_regular.promises.readFile(PI_MONITOR_STATS_PATH, "utf8");
    pi_monitor_stats_store = normalize_monitor_stats_store(JSON.parse(raw));
  } catch (_) {
    pi_monitor_stats_store = normalize_monitor_stats_store(null);
  }
  return pi_monitor_stats_store;
}

async function append_monitor_stats_sample(sample) {
  const safeSample = normalize_monitor_stats_sample(sample);
  if (!safeSample) throw new Error("Invalid monitor statistics sample");
  const job = async () => {
    const store = await read_monitor_stats_store();
    const key = `${safeSample.sessionKey}\u0000${safeSample.at}`;
    const samples = store.samples.filter((item) => `${item.sessionKey}\u0000${item.at}` !== key);
    samples.push(safeSample);
    store.samples = samples.sort((left, right) => Date.parse(left.at) - Date.parse(right.at)).slice(-PI_MONITOR_STATS_LIMIT);
    store.updatedAt = Date.now();
    await fs_regular.promises.mkdir(path.dirname(PI_MONITOR_STATS_PATH), { recursive: true });
    const tempPath = `${PI_MONITOR_STATS_PATH}.${process.pid}.tmp`;
    await fs_regular.promises.writeFile(tempPath, `${JSON.stringify(store)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs_regular.promises.rename(tempPath, PI_MONITOR_STATS_PATH);
    return store;
  };
  pi_monitor_stats_write = pi_monitor_stats_write.catch(() => {}).then(job);
  return pi_monitor_stats_write;
}

function normalize_server_latency_sample(sample) {
  if (!sample || typeof sample !== "object") return null;
  const time = new Date(sample.at || sample.time || sample.timestamp || 0);
  if (Number.isNaN(time.getTime())) return null;
  const pingMs = Number(sample.pingMs);
  return {
    at: time.toISOString(),
    pingMs: Number.isFinite(pingMs) ? Math.round(pingMs * 10) / 10 : null,
    status: String(sample.status || (Number.isFinite(pingMs) ? "online" : "offline")).slice(0, 32),
  };
}

function normalize_server_latency_store(value) {
  const servers = {};
  const source = value && typeof value.servers === "object" ? value.servers : {};
  Object.entries(source).forEach(([key, samples]) => {
    const safeKey = String(key || "").trim().slice(0, 160);
    if (!safeKey || !Array.isArray(samples)) return;
    servers[safeKey] = samples
      .map(normalize_server_latency_sample)
      .filter(Boolean)
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
      .slice(-PI_MONITOR_SERVER_LATENCY_LIMIT);
  });
  return {
    version: 1,
    updatedAt: Number(value && value.updatedAt) || 0,
    servers,
  };
}

async function read_server_latency_store() {
  if (pi_monitor_server_latency_store) return pi_monitor_server_latency_store;
  try {
    const raw = await fs_regular.promises.readFile(PI_MONITOR_SERVER_LATENCY_PATH, "utf8");
    pi_monitor_server_latency_store = normalize_server_latency_store(JSON.parse(raw));
  } catch (_) {
    pi_monitor_server_latency_store = normalize_server_latency_store(null);
  }
  return pi_monitor_server_latency_store;
}

async function append_server_latency_samples(samples) {
  const safeSamples = Array.isArray(samples)
    ? samples.map((sample) => ({ key: String(sample && sample.key || "").trim().slice(0, 160), sample: normalize_server_latency_sample(sample) }))
      .filter((entry) => entry.key && entry.sample)
    : [];
  const job = async () => {
    const store = await read_server_latency_store();
    safeSamples.forEach(({ key, sample }) => {
      const history = Array.isArray(store.servers[key]) ? store.servers[key] : [];
      history.push(sample);
      store.servers[key] = history
        .sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
        .slice(-PI_MONITOR_SERVER_LATENCY_LIMIT);
    });
    if (safeSamples.length) {
      store.updatedAt = Date.now();
      await fs_regular.promises.mkdir(path.dirname(PI_MONITOR_SERVER_LATENCY_PATH), { recursive: true });
      const temporaryPath = `${PI_MONITOR_SERVER_LATENCY_PATH}.${process.pid}.tmp`;
      await fs_regular.promises.writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await fs_regular.promises.rename(temporaryPath, PI_MONITOR_SERVER_LATENCY_PATH);
    }
    return store;
  };
  pi_monitor_server_latency_write = pi_monitor_server_latency_write.catch(() => {}).then(job);
  return pi_monitor_server_latency_write;
}

const CHARACTER_SETTING_KEYS = [
  "realm",
  "script",
  "typescript",
  "enabled",
  "version",
];
const GLOBAL_SETTING_KEYS = [
  "cull_versions",
  "enable_TYPECODE",
  "use_pi_shared_local_storage",
  "log_level",
];
const WEB_APP_SETTING_KEYS = [
  "enable_bwi",
  "enable_minimap",
  "expose_CODE",
  "expose_TYPECODE",
  "port",
];

let previous_cpu_totals = null;
let trio_game_data_cache = null;
let client_update_in_progress = null;

const TRIO_BOSS_TIERS = [
  { label: "Easy", bosses: [{ label: "Phoenix", type: "phoenix" }, { label: "Mr. Dracul", type: "mvampire" }] },
  { label: "Medium", bosses: [{ label: "Ms. Dracul", type: "fvampire" }, { label: "Skeletor", type: "skeletor" }] },
  { label: "Hard", bosses: [{ label: "Stompy", type: "stompy" }] },
  { label: "Hard / Cooperative", bosses: [{ label: "Giga Crab", type: "crabxx" }, { label: "Ice Golem", type: "icegolem" }] },
  { label: "Impossibly Hard / Raid", bosses: [{ label: "Fairies", types: ["greenfairy", "redfairy", "bluefairy"] }, { label: "Franky", type: "franky" }, { label: "Dragold", type: "dragold" }] },
  { label: "Halloween Event", bosses: [{ label: "Mr. Pumpkin", type: "mrpumpkin" }, { label: "Mr. Green", type: "mrgreen" }, { label: "Jr.", type: "jr" }, { label: "Green Jr.", type: "greenjr" }, { label: "Slenderman", type: "slenderman" }] },
  { label: "Holiday / Seasonal Event", bosses: [{ label: "Snowman", type: "snowman" }, { label: "Grinch", type: "grinch" }, { label: "Wabbit", type: "wabbit" }, { label: "Rudolph", type: "rudolph" }, { label: "Love Goo", type: "pinkgoo" }] },
  { label: "Goobrawl Event", bosses: [{ label: "Brawl Goo", type: "bgoo" }, { label: "Rainbow Goo", type: "rgoo" }] },
];

async function read_trio_game_data() {
  const versions = await game_files.available_versions();
  const version = versions[0];
  if (!Number.isInteger(version)) throw new Error("No cached Adventure Land client data is available");
  if (trio_game_data_cache && trio_game_data_cache.version === version) return trio_game_data_cache;
  const data_path = game_files.locate_game_file("/data.js", version);
  const source = await fs_regular.promises.readFile(data_path, "utf8");
  const context = {};
  vm.runInNewContext(`${source}\n;this.__adventure_land_data = G;`, context, { timeout: 5000 });
  const monsters = context.__adventure_land_data && context.__adventure_land_data.monsters;
  if (!monsters || typeof monsters !== "object") throw new Error("Cached Adventure Land data has no monster catalog");
  const game_data = context.__adventure_land_data || {};
  const copy_value = (value) => {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  };
  const choices = Object.entries(monsters)
    .filter(([, monster]) => monster && !monster.stationary && !monster.immune && !monster.special && !monster.cooperative && Number(monster.hp || 0) > 0 && Number(monster.xp || 0) > 0 && !(Number(monster.respawn) < 0))
    .map(([type, monster]) => ({ type, name: String(monster.name || type), hp: Number(monster.hp || 0), attack: Number(monster.attack || 0), xp: Number(monster.xp || 0) }))
    .sort((left, right) => left.hp - right.hp || left.name.localeCompare(right.name))
    .map((monster, index) => ({ ...monster, tier: index + 1 }));
  const bestiary = Object.entries(monsters)
    .map(([id, monster]) => ({
      id,
      name: String(monster && monster.name || id),
      hp: Number(monster && monster.hp || 0),
      attack: Number(monster && monster.attack || 0),
      xp: Number(monster && monster.xp || 0),
      range: Number(monster && monster.range || 0),
       respawn: Number(monster && monster.respawn || 0),
       skin: String(monster && monster.skin || id),
       drops: copy_value(game_data.drops?.monsters?.[id]) || [],
       definition: copy_value(monster) || {},
     }))
    .filter((monster) => monster.hp > 0 || monster.xp > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
  const items = Object.entries(game_data.items || {})
    .map(([id, item]) => ({
      id,
      name: String(item && item.name || id),
      type: String(item && item.type || "item"),
      skin: String(item && (item.skin || item.skin_a) || id),
      value: Number(item && item.g || 0),
      stack: Number(item && item.s || 0),
      grade: Number(item && item.grade || 0),
      explanation: String(item && item.explanation || ""),
      definition: copy_value(item) || {},
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const gear_drop_types = new Set(["weapon", "helmet", "chest", "pants", "shoes", "gloves", "shield", "source", "quiver", "ring", "amulet", "belt", "earring", "cape", "orb", "tome", "misc_offhand"]);
  const nested_drop_tables = game_data.drops || {};
  const quick_gear_drop_info = choices.map((monster) => {
    const tables = [];
    const monster_drops = nested_drop_tables.monsters || {};
    if (monster_drops[monster.type]) tables.push(monster_drops[monster.type]);
    let home = (nested_drop_tables.monsters_home_server || {})[monster.type];
    if (!home && game_data.drops_home && game_data.drops_home.monsters) home = game_data.drops_home.monsters[monster.type];
    if (!home && game_data.drops_home) home = game_data.drops_home[monster.type];
    if (home) tables.push(home);
    const monster_maps = Object.entries(game_data.maps || {}).filter(([, map]) => map && !map.ignore && !map.instance && !map.pvp && !map.event &&
      (map.monsters || []).some((pack) => pack && pack.type === monster.type && pack.count !== 0)).map(([name]) => name);
    const map_drops = nested_drop_tables.maps || {};
    ["global_static", "global", ...monster_maps].forEach((name) => { if (map_drops[name]) tables.push(map_drops[name]); });
    const found = new Set();
    const generic_tables = new Set(["glitch", "lglitch"]);
    const nested = (name) => nested_drop_tables[name] || (nested_drop_tables.monsters || {})[name] || (nested_drop_tables.maps || {})[name] || (game_data.drops_home || {})[name];
    const visit = (table, seen, depth) => {
      if (!Array.isArray(table) || depth > 4) return;
      table.forEach((drop) => {
        if (!Array.isArray(drop) || drop.length < 2) return;
        const kind = drop[1];
        if (kind === "open") {
          const name = drop[2];
          if (!name || generic_tables.has(name) || seen.has(name)) return;
          const child = nested(name);
          if (child) { const next_seen = new Set(seen); next_seen.add(name); visit(child, next_seen, depth + 1); }
          return;
        }
        const item = game_data.items && game_data.items[kind];
        if (!item || kind === "empty") return;
        if (item.upgrade || item.compound || gear_drop_types.has(item.type)) found.add(kind);
      });
    };
    tables.forEach((table) => visit(table, new Set(), 0));
    return { type: monster.type, gear: Array.from(found).map((id) => ({
      id,
      name: String(game_data.items[id] && game_data.items[id].name || id),
      type: String(game_data.items[id] && game_data.items[id].type || "item"),
      tier: Number.isFinite(Number(game_data.items[id] && game_data.items[id].tier)) ? Number(game_data.items[id].tier) : null,
    })).sort((left, right) => left.name.localeCompare(right.name)) };
  });
  const skills = Object.entries(game_data.skills || {})
    .map(([id, skill]) => ({
      id,
      name: String(skill && skill.name || id),
      type: String(skill && skill.type || "ability"),
      skin: String(skill && skill.skin || id),
      classes: Array.isArray(skill && skill.class) ? skill.class.map(String) : [],
      range: Number(skill && skill.range || 0),
      mp: Number(skill && skill.mp || 0),
      cooldown: Number(skill && skill.cooldown || 0),
      explanation: String(skill && skill.explanation || ""),
      definition: copy_value(skill) || {},
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const classes = Object.entries(game_data.classes || {})
    .map(([id, definition]) => ({
      id,
      name: String(definition && definition.name || id),
      description: String(definition && definition.description || ""),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  trio_game_data_cache = {
    ok: true,
    version,
    monsters: choices,
    bestiary,
    items,
    dropInfo: quick_gear_drop_info,
    skills,
    classes,
    bossTiers: TRIO_BOSS_TIERS,
  };
  return trio_game_data_cache;
}

async function read_account_mail(session, account) {
  if (!session) throw new Error("Account session is not configured");
  const owned = new Set((account && account.characters || []).map((character) =>
    String(character && character.name || "").toLowerCase().replace(/\s/g, ""),
  ));
  const messages = new Map();
  const cursors = new Set();
  let cursor = null;
  do {
    const raw = await fetch_remote("https://adventure.land/api/pull_mail", {
      method: "POST",
      headers: {
        Cookie: "auth=" + session,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(cursor ? { cursor } : {}),
    });
    if (!raw.ok) throw new Error("Mail request failed: " + raw.status);
    const payload = await raw.json();
    if (payload && payload.failed) throw new Error(payload.reason || "Mail request failed");
    const page = Array.isArray(payload) ? payload.find((entry) => entry && entry.type === "mail") : null;
    if (!page || !Array.isArray(page.mail)) throw new Error("Mail response was malformed");
    page.mail.forEach((mail) => {
      if (!mail || !mail.id || !owned.has(String(mail.to || "").toLowerCase().replace(/\s/g, ""))) return;
      let item = mail.item || null;
      if (typeof item === "string") {
        try { item = JSON.parse(item); } catch (_) { item = null; }
      }
      messages.set(String(mail.id), {
        id: String(mail.id),
        from: String(mail.fro || mail.from || ""),
        to: String(mail.to || ""),
        subject: String(mail.subject || ""),
        message: String(mail.message || ""),
        sent: mail.sent || null,
        taken: mail.taken === true,
        item: item && typeof item === "object" ? item : null,
      });
    });
    cursor = page.more ? page.cursor : null;
    if (cursor && cursors.has(cursor)) throw new Error("Mail pagination repeated a cursor");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return {
    ok: true,
    updatedAt: Date.now(),
    count: messages.size,
    messages: [...messages.values()].sort((left, right) => Date.parse(right.sent || 0) - Date.parse(left.sent || 0)),
  };
}

function read_cpu_totals() {
  if (os_regular.platform() !== "linux") return null;
  try {
    const line = fs_regular
      .readFileSync("/proc/stat", "utf8")
      .split(/\r?\n/)
      .find((entry) => /^cpu\s/.test(entry));
    if (!line) return null;
    const values = line.trim().split(/\s+/).slice(1).map(Number);
    if (values.length < 4 || values.some((value) => !Number.isFinite(value))) return null;
    return {
      total: values.reduce((sum, value) => sum + value, 0),
      idle: values[3] + (values[4] || 0),
    };
  } catch (_) {
    return null;
  }
}

function disk_snapshot() {
  try {
    const stats = fs_regular.statfsSync("/");
    const block_size = Number(stats.bsize || stats.frsize || 4096);
    const total = Number(stats.blocks) * block_size;
    const available = Number(stats.bavail ?? stats.bfree) * block_size;
    if (!Number.isFinite(total) || !Number.isFinite(available) || total <= 0) return null;
    const used = Math.max(0, total - available);
    return {
      path: "/",
      totalBytes: total,
      availableBytes: available,
      usedBytes: used,
      usedPercent: (used / total) * 100,
    };
  } catch (_) {
    return null;
  }
}

function resource_snapshot() {
  const cpu_list = os_regular.cpus();
  const cpu_count = Math.max(1, cpu_list.length || 1);
  const load_average = os_regular.loadavg();
  const current_cpu_totals = read_cpu_totals();
  let cpu_percent = null;
  if (current_cpu_totals && previous_cpu_totals) {
    const total_delta = current_cpu_totals.total - previous_cpu_totals.total;
    const idle_delta = current_cpu_totals.idle - previous_cpu_totals.idle;
    if (total_delta > 0) cpu_percent = Math.max(0, Math.min(100, ((total_delta - idle_delta) / total_delta) * 100));
  }
  previous_cpu_totals = current_cpu_totals;

  const memory_total = os_regular.totalmem();
  const memory_free = os_regular.freemem();
  const memory_used = Math.max(0, memory_total - memory_free);
  const process_memory = process.memoryUsage();
  return {
    ok: true,
    version: 1,
    checkedAtUtc: new Date().toISOString(),
    host: {
      hostname: os_regular.hostname(),
      platform: os_regular.platform(),
      release: os_regular.release(),
      arch: os_regular.arch(),
      cpuCount: cpu_count,
      cpuModel: (cpu_list[0] && cpu_list[0].model) || null,
      uptimeSeconds: os_regular.uptime(),
    },
    cpu: {
      utilizationPercent: cpu_percent,
      normalizedLoadPercent: Math.min(100, (load_average[0] / cpu_count) * 100),
      loadAverage: load_average,
    },
    memory: {
      totalBytes: memory_total,
      availableBytes: memory_free,
      usedBytes: memory_used,
      usedPercent: (memory_used / memory_total) * 100,
    },
    disk: disk_snapshot(),
    process: {
      pid: process.pid,
      rssBytes: process_memory.rss,
      heapUsedBytes: process_memory.heapUsed,
      heapTotalBytes: process_memory.heapTotal,
      nodeVersion: process.version,
    },
  };
}

function empty_pi_monitor_settings() {
  return { version: 1, global: {}, characters: {} };
}

function read_pi_monitor_settings() {
  try {
    const parsed = JSON.parse(fs_regular.readFileSync(PI_MONITOR_SETTINGS_PATH, "utf8"));
    return {
      version: 1,
      global: parsed && parsed.global && typeof parsed.global === "object" ? parsed.global : {},
      characters:
        parsed && parsed.characters && typeof parsed.characters === "object"
          ? parsed.characters
          : {},
    };
  } catch (_) {
    return empty_pi_monitor_settings();
  }
}

function write_pi_monitor_settings(settings) {
  const temporary_path = PI_MONITOR_SETTINGS_PATH + ".tmp";
  fs_regular.writeFileSync(temporary_path, JSON.stringify(settings, null, 2) + "\n", "utf8");
  fs_regular.renameSync(temporary_path, PI_MONITOR_SETTINGS_PATH);
}

function apply_pi_monitor_settings(cfg, settings) {
  const global = settings && settings.global && typeof settings.global === "object"
    ? settings.global
    : {};
  for (const key of GLOBAL_SETTING_KEYS) {
    if (Object.prototype.hasOwnProperty.call(global, key)) cfg[key] = global[key];
  }
  if (!cfg.web_app || typeof cfg.web_app !== "object") cfg.web_app = {};
  const web_app = global.web_app && typeof global.web_app === "object" ? global.web_app : {};
  for (const key of WEB_APP_SETTING_KEYS) {
    if (Object.prototype.hasOwnProperty.call(web_app, key)) cfg.web_app[key] = web_app[key];
  }
  const characters = settings && settings.characters && typeof settings.characters === "object"
    ? settings.characters
    : {};
  for (const [name, saved] of Object.entries(characters)) {
    if (!saved || typeof saved !== "object") continue;
    if (!cfg.characters || typeof cfg.characters !== "object") cfg.characters = {};
    const character = cfg.characters[name] || (cfg.characters[name] = {
      realm: saved.realm || "EUI",
      script: saved.script || "caracAL/examples/crabs.js",
      typescript: saved.typescript || null,
      enabled: saved.enabled === true,
      version: saved.version ?? 0,
    });
    for (const key of CHARACTER_SETTING_KEYS) {
      if (Object.prototype.hasOwnProperty.call(saved, key)) character[key] = saved[key];
    }
    if (Object.prototype.hasOwnProperty.call(saved, "stopped")) {
      character.stopped = saved.stopped === true;
    }
  }
}

function settings_error(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalize_script_path(value, field) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value).trim().replaceAll("\\", "/");
  if (
    normalized.length > 512 ||
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    normalized.includes("..\\") ||
    normalized.includes("\0")
  ) {
    throw settings_error(`${field} must be a relative CODE path`);
  }
  return normalized;
}

function normalize_character_settings_patch(raw_patch) {
  const patch = raw_patch && typeof raw_patch === "object" ? raw_patch : {};
  const normalized = {};
  if (Object.prototype.hasOwnProperty.call(patch, "realm")) {
    const realm = String(patch.realm || "").trim();
    if (!realm || realm.length > 64 || /[\\/\0]/.test(realm)) {
      throw settings_error("realm must be a valid server key");
    }
    normalized.realm = realm;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "enabled")) {
    if (typeof patch.enabled !== "boolean") throw settings_error("enabled must be true or false");
    normalized.enabled = patch.enabled;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "version")) {
    const version = String(patch.version ?? "").trim();
    if (!version) {
      normalized.version = 0;
    } else if (/^-?\d+$/.test(version)) {
      normalized.version = Number(version);
    } else if (version.length <= 128 && !/[\\/\0]/.test(version)) {
      normalized.version = version;
    } else {
      throw settings_error("version must be a numeric or named client version");
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "script")) {
    normalized.script = normalize_script_path(patch.script, "script");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "typescript")) {
    normalized.typescript = normalize_script_path(patch.typescript, "typescript");
  }
  if (normalized.script) normalized.typescript = null;
  else if (normalized.typescript) normalized.script = null;
  return normalized;
}

function normalize_global_settings_patch(raw_patch) {
  const patch = raw_patch && typeof raw_patch === "object" ? raw_patch : {};
  const normalized = {};
  for (const key of ["cull_versions", "enable_TYPECODE", "use_pi_shared_local_storage"]) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      if (typeof patch[key] !== "boolean") throw settings_error(`${key} must be true or false`);
      normalized[key] = patch[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "log_level")) {
    const log_level = String(patch.log_level || "").trim().toLowerCase();
    if (!["debug", "info", "warn", "error"].includes(log_level)) {
      throw settings_error("log_level must be debug, info, warn, or error");
    }
    normalized.log_level = log_level;
  }
  const web_app_patch = patch.web_app && typeof patch.web_app === "object" ? patch.web_app : {};
  const web_app = {};
  for (const key of ["enable_bwi", "enable_minimap", "expose_CODE", "expose_TYPECODE"]) {
    if (Object.prototype.hasOwnProperty.call(web_app_patch, key)) {
      if (typeof web_app_patch[key] !== "boolean") throw settings_error(`web_app.${key} must be true or false`);
      web_app[key] = web_app_patch[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(web_app_patch, "port")) {
    const port = Number(web_app_patch.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw settings_error("web_app.port must be an integer from 1 to 65535");
    }
    web_app.port = port;
  }
  if (Object.keys(web_app).length) normalized.web_app = web_app;
  return normalized;
}

function local_code_root() {
  const configured = String(process.env.ADVENTURELAND_CODE_ROOT || "").trim();
  return configured
    ? path.resolve(configured)
    : path.join(PI_PROJECT_ROOT, "CODE", "adventureland");
}

function collect_local_javascript_files(directory, relative_directory, result) {
  let entries;
  try {
    entries = fs_regular.readdirSync(directory, { withFileTypes: true });
  } catch (_) {
    return;
  }
  entries.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith(".")) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(relative_directory, entry.name);
    if (entry.isDirectory()) {
      collect_local_javascript_files(absolute, relative, result);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".js")) {
      result.add(path.posix.join("adventureland", relative));
    }
  }
}

function local_javascript_code_paths() {
  const code_root = local_code_root();
  const paths = new Set();
  for (const folder of ["codes", "characters", "headless"]) {
    collect_local_javascript_files(path.join(code_root, folder), folder, paths);
  }
  // This is generated by the account sync process and is a dispatcher, not a
  // user-selectable CODE entry point.
  paths.delete("adventureland/headless/AccountCodeMap.js");
  return [...paths].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function monitor_settings_snapshot(cfg, character_manage) {
  const web_app = cfg.web_app && typeof cfg.web_app === "object" ? cfg.web_app : {};
  return {
    version: 1,
    globals: {
      cull_versions: cfg.cull_versions !== false,
      enable_TYPECODE: cfg.enable_TYPECODE === true,
      use_pi_shared_local_storage: cfg.use_pi_shared_local_storage !== false,
      log_level: cfg.log_level || "info",
      web_app: {
        enable_bwi: web_app.enable_bwi === true,
        enable_minimap: web_app.enable_minimap === true,
        expose_CODE: web_app.expose_CODE === true,
        expose_TYPECODE: web_app.expose_TYPECODE === true,
        port: Number(web_app.port) || 0,
      },
    },
    characters: Object.entries(character_manage || {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, character]) => ({
        name,
        settings: {
          realm: character.realm || "",
          enabled: character.enabled !== false,
          version: character.version ?? 0,
          script: character.script || "",
          typescript: character.typescript || "",
        },
       })),
    codePaths: local_javascript_code_paths(),
    editable: {
      global: [...GLOBAL_SETTING_KEYS, "web_app.enable_bwi", "web_app.enable_minimap", "web_app.expose_CODE", "web_app.expose_TYPECODE", "web_app.port"],
      character: [...CHARACTER_SETTING_KEYS],
    },
    security: {
      session: "hidden",
      log_sinks: "not editable from the browser",
    },
    restartRequiredForGlobalChanges: true,
  };
}

function read_monitor_window_layout() {
  try {
    const value = JSON.parse(fs_regular.readFileSync(MONITOR_WINDOW_LAYOUT_PATH, "utf8"));
    return value && typeof value === "object" && Array.isArray(value.windows)
      ? { version: 1, windows: value.windows }
      : { version: 1, windows: [] };
  } catch (_) {
    return { version: 1, windows: [] };
  }
}

function finite_layout_number(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalize_monitor_window_layout(value, allowed_names) {
  const seen = new Set();
  const windows = Array.isArray(value && value.windows) ? value.windows : [];
  return {
    version: 1,
    windows: windows
      .map((window_value) => {
        const name = String(window_value && window_value.name || "");
        if (!name || seen.has(name) || !allowed_names.has(name)) return null;
        seen.add(name);
        return {
          name,
          left: Math.max(-2000, Math.min(10000, finite_layout_number(window_value.left, 24))),
          top: Math.max(-2000, Math.min(10000, finite_layout_number(window_value.top, 58))),
          width: Math.max(360, Math.min(4000, finite_layout_number(window_value.width, 760))),
          height: Math.max(260, Math.min(4000, finite_layout_number(window_value.height, 540))),
        };
      })
      .filter(Boolean),
  };
}

function write_monitor_window_layout(layout) {
  const temporary_path = MONITOR_WINDOW_LAYOUT_PATH + ".tmp";
  fs_regular.writeFileSync(temporary_path, JSON.stringify(layout, null, 2) + "\n", "utf8");
  fs_regular.renameSync(temporary_path, MONITOR_WINDOW_LAYOUT_PATH);
}

function local_storage_snapshot(local_storage, storage_mode = SHARED_STORAGE_MODE) {
  const entries = {};
  if (local_storage && typeof local_storage.entries === "function") {
    for (const [key, value] of local_storage.entries()) {
      entries[String(key)] = String(value);
    }
  }
  const sorted_entries = {};
  Object.keys(entries).sort().forEach((key) => {
    sorted_entries[key] = entries[key];
  });
  const serialized = JSON.stringify(sorted_entries);
  return {
    version: 1,
    storageMode: storage_mode,
    sharedWithPiClient: is_pi_shared_storage(storage_mode),
    revision: crypto.createHash("sha1").update(serialized).digest("hex"),
    entries: sorted_entries,
  };
}

function clear_local_storage_entries(local_storage) {
  const keys = typeof local_storage?.entries === "function"
    ? Array.from(local_storage.entries(), ([key]) => key)
    : [];
  if (typeof local_storage?.clear === "function") {
    local_storage.clear();
  } else {
    keys.forEach((key) => local_storage.delete(key));
  }
  return keys.length;
}

//TODO check for invalid session
//TODO improve termination
//MAYBE improve linux service
//MAYBE exclude used versions

function partition(a, fun) {
  const ret = [[], []];
  for (let i = 0; i < a.length; i++)
    if (fun(a[i])) ret[0].push(a[i]);
    else ret[1].push(a[i]);
  return ret;
}

//note to self: how to promisify event emitter(once)
//const someAsyncFunction = util.promisify(myEmitter.once).bind(myEmitter);

function migrate_old_storage(path, localStorage) {
  let file_contents;
  try {
    file_contents = fs_regular.readFileSync(path, "utf8");
  } catch (err) {
    log.info(
      { type: "ls_migration_none", path },
      "localStorage migration unnecessary",
    );
    return;
  }
  if (file_contents.length > 0) {
    const json_object = JSON.parse(file_contents);
    for (let [key, value] of Object.entries(json_object)) {
      localStorage.set(key, value);
    }
    log.info(
      { type: "ls_migration", path, value: Object.keys(json_object).length },
      "localStorage migrated",
    );
  }
  fs_regular.unlinkSync(path);
  log.info({ type: "ls_migration_done", path }, "old localStorage deleted");
  return;
}

const PI_CLIENT_EXPORT_ROOT = path.join(PI_PROJECT_ROOT, "client", "export");
const CLIENT_VERSION_REQUEST_HEADERS = {
  "user-agent": "CaracALPlus-client-cache-check/1.0",
};

function parse_client_version(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

async function read_local_client_versions() {
  let entries = [];
  try {
    entries = await fs_regular.promises.readdir(PI_CLIENT_EXPORT_ROOT, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => parse_client_version(entry.name))
    .filter((version) => Number.isInteger(version))
    .sort((left, right) => right - left);
}

async function fetch_client_version_source(url) {
  const response = await fetch(url, {
    headers: CLIENT_VERSION_REQUEST_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.text();
}

async function check_pi_client_update() {
  const [homepage, comm] = await Promise.all([
    fetch_client_version_source("https://adventure.land/"),
    fetch_client_version_source("https://adventure.land/comm"),
  ]);
  const homepageMatch = homepage.match(/game\.js\?v=([0-9]+)/);
  const commMatch = comm.match(/var\s+VERSION\s*=\s*['\"]([0-9]+)/);
  const homepageVersion = homepageMatch ? Number(homepageMatch[1]) : null;
  const commVersion = commMatch ? Number(commMatch[1]) : null;
  const latestVersion = commVersion || homepageVersion;
  if (!Number.isInteger(latestVersion)) {
    throw new Error("Adventure Land did not publish a recognizable client version");
  }

  const fullClientVersions = await read_local_client_versions();
  const configuredClientVersion = parse_client_version(process.env.CLIENT_VERSION);
  const fullClientVersion = configuredClientVersion || fullClientVersions[0] || null;
  const runtimeVersions = await game_files.available_versions();
  const runtimeClientVersion = runtimeVersions[0] || null;

  return {
    ok: true,
    checkedAtUtc: new Date().toISOString(),
    remote: {
      latestVersion,
      homepageVersion,
      commVersion,
    },
    fullClient: {
      activeVersion: fullClientVersion,
      latestCachedVersion: fullClientVersions[0] || null,
      cachedVersions: fullClientVersions,
      needsUpdate: fullClientVersion === null || fullClientVersion < latestVersion,
      source: "client/export",
    },
    caracALRuntime: {
      latestCachedVersion: runtimeClientVersion,
      cachedVersions: runtimeVersions,
      needsUpdate: runtimeClientVersion === null || runtimeClientVersion < latestVersion,
      source: "vendor/caracAL/game_files",
    },
    needsUpdate:
      fullClientVersion === null ||
      fullClientVersion < latestVersion ||
      runtimeClientVersion === null ||
      runtimeClientVersion < latestVersion,
  };
}

function server_endpoint(server) {
  const raw_address = String(
    server && (server.address || server.addr || server.host || server.hostname) || "",
  ).trim();
  if (!raw_address) return null;
  let parsed;
  try {
    parsed = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(raw_address)
        ? raw_address
        : `https://${raw_address}`,
    );
  } catch (_) {
    return null;
  }
  const host = String(parsed.hostname || "").replace(/^\[|\]$/g, "");
  const port = Number(
    server.port ||
      parsed.port ||
      (parsed.protocol === "http:" || parsed.protocol === "ws:" ? 80 : 443),
  );
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return {
    host,
    port,
    display: `${host.includes(":") ? `[${host}]` : host}:${port}`,
  };
}

function probe_server_latency(server) {
  const endpoint = server_endpoint(server);
  const result = {
    key: String(server && server.key || ""),
    name: String(server && (server.name || server.key) || "Unknown server"),
    endpoint: endpoint && endpoint.display,
    status: endpoint ? "checking" : "unavailable",
    pingMs: null,
    error: endpoint ? null : "The server did not publish a reachable address",
  };
  if (!endpoint) return Promise.resolve(result);

  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    let settled = false;
    let socket;
    const finish = (status, error = null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      resolve({
        ...result,
        status,
        pingMs: status === "online" ? Math.round(elapsedMs * 10) / 10 : null,
        error,
      });
    };
    socket = net.createConnection({ host: endpoint.host, port: endpoint.port });
    socket.setTimeout(5000, () => finish("timeout", "Connection timed out"));
    socket.once("connect", () => finish("online"));
    socket.once("error", (error) => finish("offline", error && (error.code || error.message) || "Connection failed"));
  });
}

async function check_server_latency(servers) {
  if (!Array.isArray(servers)) throw new Error("Adventure Land server information is not available");
  const checkedAtUtc = new Date().toISOString();
  const results = await Promise.all(servers.map((server) => probe_server_latency(server)));
  let history = normalize_server_latency_store(null);
  try {
    history = await append_server_latency_samples(results.map((server) => ({
      key: server.key,
      at: checkedAtUtc,
      pingMs: server.pingMs,
      status: server.status,
    })));
  } catch (_) {
    // A history write must not hide the current live ping result.
    history = await read_server_latency_store();
  }
  return {
    ok: true,
    checkedAtUtc,
    host: process.env.PI_HOST_LABEL || "current host",
    measurement: "TCP connection latency from the CaracAL host",
    timeoutMs: 5000,
    history: {
      version: history.version,
      updatedAt: history.updatedAt,
      servers: history.servers,
    },
    servers: results,
  };
}

async function restart_after_client_update(result) {
  const client_origin = String(process.env.PI_CLIENT_CONTROL_ORIGIN || "http://localhost:8088").replace(/\/$/, "");
  const service_secret = String(process.env.PI_AUTH_SECRET || "");
  let client_restarted = false;
  let client_restart_error = null;
  if (service_secret) {
    try {
      const response = await fetch(`${client_origin}/__pi_client_restart`, {
        method: "POST",
        headers: { "x-pi-service-secret": service_secret },
        signal: AbortSignal.timeout(5000),
      });
      client_restarted = response.ok;
      if (!response.ok) client_restart_error = `client restart returned HTTP ${response.status}`;
    } catch (error) {
      client_restart_error = error && error.message ? error.message : String(error);
    }
  } else {
    client_restart_error = "PI_AUTH_SECRET is not configured for the internal client restart request";
  }
  // The headless process is supervised by systemd --user on the Pi or by the
  // Docker restart policy on the VPS. Exiting after the HTTP response makes
  // both deployment modes reload the newly downloaded runtime cache.
  setTimeout(() => process.exit(0), 1200);
  return { ...result, restartRequested: true, clientRestarted: client_restarted, clientRestartError: client_restart_error };
}

function account_code_sync_summary(stdout, stderr) {
  const lines = `${String(stdout || "")}\n${String(stderr || "")}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (lines[lines.length - 1] || "CODE Sync completed.").slice(0, 1000);
}

function account_code_sync_configuration_error() {
  const token = String(process.env.AL_CODE_API_TOKEN || "").trim();
  if (!token) {
    return "CODE Sync is not configured on this host. Set AL_CODE_API_TOKEN in config/code-sync.env, then restart CaracAL.";
  }
  if (!/^mcp_[A-Za-z0-9_-]+$/.test(token)) {
    return "CODE Sync has an invalid Adventure Land API token. It must start with mcp_.";
  }
  return null;
}

function run_account_code_sync() {
  if (account_code_sync_in_progress) return account_code_sync_in_progress;
  const configurationError = account_code_sync_configuration_error();
  if (configurationError) return Promise.reject(new Error(configurationError));
  account_code_sync_in_progress = new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = child_process.spawn(
      process.execPath,
      [ACCOUNT_CODE_SYNC_PATH, "--root", PI_PROJECT_ROOT, "--quiet"],
      {
        cwd: PI_PROJECT_ROOT,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, ACCOUNT_CODE_SYNC_TIMEOUT_MS);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`CODE Sync timed out after ${ACCOUNT_CODE_SYNC_TIMEOUT_MS / 60000} minutes.`));
        return;
      }
      if (code !== 0) {
        const detail = account_code_sync_summary(stdout, stderr);
        reject(new Error(detail || `CODE Sync exited with code ${code || "unknown"}${signal ? ` (${signal})` : ""}.`));
        return;
      }
      resolve({
        summary: account_code_sync_summary(stdout, stderr),
        durationMs: Date.now() - startedAt,
      });
    });
  }).finally(() => {
    account_code_sync_in_progress = null;
  });
  return account_code_sync_in_progress;
}

function install_monitor_wrapper(
  bwi_instance,
  get_monitor_controls,
  get_local_storage,
  get_storage_mode,
  get_monitor_settings,
  get_account_info,
  get_account_session,
  broadcast_local_storage,
) {
  if (!bwi_instance || !bwi_instance.app || !bwi_instance.router) return;
  const wrapper = express.Router();
  const wrapperRoot = path.join(__dirname, "..");
  wrapper.get("/", (req, res) => {
    res.sendFile(path.join(wrapperRoot, "monitor-index.html"));
  });
  wrapper.get("/pi-monitor-bridge.js", (req, res) => {
    res.sendFile(path.join(wrapperRoot, "pi-monitor-bridge.js"));
  });
  const sprite_resources = {
    "common-functions": "/js/common_functions.js",
    "legacy-functions": "/js/old_common_functions.js",
    data: "/data.js",
    html: "/js/html.js",
  };
  wrapper.get("/pi-sprite/:resource", async (req, res) => {
    const resource = sprite_resources[req.params.resource];
    if (!resource) return res.status(404).send("Unknown sprite resource");
    try {
      const versions = await game_files.available_versions();
      const version = versions[0];
      if (!Number.isInteger(version)) return res.status(503).send("Sprite data is not cached");
      const resource_path = path.resolve(game_files.locate_game_file(resource, version));
      return res.sendFile(resource_path, {
        headers: { "Cache-Control": "public, max-age=300" },
      });
    } catch (error) {
      return res.status(503).send(error && error.message ? error.message : "Sprite data is unavailable");
    }
  });
  wrapper.get("/pi-script-dashboards.js", (req, res) => {
    res.sendFile(path.join(wrapperRoot, "pi-script-dashboards.js"));
  });
  wrapper.use(express.json({ limit: "4mb" }));
  wrapper.get("/pi-storage/state", (req, res) => {
    const local_storage = get_local_storage && get_local_storage();
    if (!local_storage) return res.status(503).json({ ok: false, error: "Storage is not ready" });
    const storage_mode = get_storage_mode ? get_storage_mode() : SHARED_STORAGE_MODE;
    const snapshot = local_storage_snapshot(local_storage, storage_mode);
    if (req.query.revision && req.query.revision === snapshot.revision) {
      return res.json({
        ok: true,
        version: 1,
        storageMode: snapshot.storageMode,
        sharedWithPiClient: snapshot.sharedWithPiClient,
        revision: snapshot.revision,
        changed: false,
      });
    }
    return res.json({ ok: true, ...snapshot, changed: true });
  });
  wrapper.post("/pi-storage/clear-all", async (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    const local_storage = get_local_storage && get_local_storage();
    if (!controls || typeof controls.stop_all !== "function") return res.status(503).json({ ok: false, error: "CaracAL controls are not ready" });
    if (!local_storage) return res.status(503).json({ ok: false, error: "Storage is not ready" });
    const storage_mode = get_storage_mode ? get_storage_mode() : SHARED_STORAGE_MODE;
    if (!is_pi_shared_storage(storage_mode)) {
      return res.status(409).json({
        ok: false,
        error: "Pi shared localStorage is disabled by CaracAL configuration",
        storageMode: storage_mode,
        sharedWithPiClient: false,
      });
    }
    try {
      const stopped = await controls.stop_all();
      const cleared_count = clear_local_storage_entries(local_storage);
      if (typeof broadcast_local_storage === "function") {
        broadcast_local_storage({
          type: "stor",
          op: "clear",
          ident: "ls",
          storage_mode,
        });
      }
      return res.json({
        ok: true,
        ...local_storage_snapshot(local_storage, storage_mode),
        changed: true,
        completed: true,
        stoppedCharacters: stopped,
        stoppedCount: Array.isArray(stopped) ? stopped.length : 0,
        clearedCount: cleared_count,
      });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 500;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-monitor/activity", async (req, res) => {
    try {
      const store = await read_monitor_activity_store();
      return res.json({ ok: true, ...store });
    } catch (error) {
      return res.status(503).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.post("/pi-monitor/activity", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    try {
      const store = await append_monitor_activity(body.name, {
        message: body.message,
        time: body.time,
      });
      return res.json({ ok: true, ...store });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-monitor/stats", async (req, res) => {
    try {
      const store = await read_monitor_stats_store();
      const since = Date.parse(String(req.query.since || ""));
      const until = Date.parse(String(req.query.until || ""));
      const samples = store.samples.filter((sample) =>
        (!Number.isFinite(since) || Date.parse(sample.at) >= since)
        && (!Number.isFinite(until) || Date.parse(sample.at) <= until),
      );
      return res.json({ ok: true, version: store.version, updatedAt: store.updatedAt, samples });
    } catch (error) {
      return res.status(503).json({ ok: false, error: error && error.message ? error.message : String(error) });
    }
  });
  wrapper.post("/pi-monitor/stats", async (req, res) => {
    try {
      const store = await append_monitor_stats_sample(req.body);
      return res.json({ ok: true, version: store.version, updatedAt: store.updatedAt });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error && error.message ? error.message : String(error) });
    }
  });
  const sync_pi_storage = (req, res) => {
    const local_storage = get_local_storage && get_local_storage();
    if (!local_storage) return res.status(503).json({ ok: false, error: "Storage is not ready" });
    const storage_mode = get_storage_mode ? get_storage_mode() : SHARED_STORAGE_MODE;
    if (!is_pi_shared_storage(storage_mode)) {
      return res.status(409).json({
        ok: false,
        error: "Pi shared localStorage is disabled by CaracAL configuration",
        storageMode: storage_mode,
        sharedWithPiClient: false,
      });
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (body.clear === true && typeof local_storage.entries === "function") {
      clear_local_storage_entries(local_storage);
      if (typeof broadcast_local_storage === "function") {
        broadcast_local_storage({
          type: "stor",
          op: "clear",
          ident: "ls",
          storage_mode,
        });
      }
    }
    const set_values = body.set && typeof body.set === "object" ? body.set : {};
    const accepted_set = {};
    for (const [key, value] of Object.entries(set_values)) {
      if (!key || key.length > 512 || value === undefined || value === null) continue;
      const string_value = String(value);
      local_storage.set(key, string_value);
      accepted_set[key] = string_value;
    }
    if (Object.keys(accepted_set).length && typeof broadcast_local_storage === "function") {
      broadcast_local_storage({
        type: "stor",
        op: "set",
        ident: "ls",
        storage_mode,
        data: accepted_set,
      });
    }
    const remove_values = Array.isArray(body.remove) ? body.remove : [];
    const accepted_remove = [];
    for (const key of remove_values) {
      if (typeof key === "string" && key.length <= 512) {
        local_storage.delete(key);
        accepted_remove.push(key);
      }
    }
    if (accepted_remove.length && typeof broadcast_local_storage === "function") {
      broadcast_local_storage({
        type: "stor",
        op: "del",
        ident: "ls",
        storage_mode,
        data: accepted_remove,
      });
    }
    return res.json({
      ok: true,
      ...local_storage_snapshot(local_storage, storage_mode),
      changed: true,
    });
  };
  wrapper.put("/pi-storage/sync", sync_pi_storage);
  // sendBeacon can only use POST, so accept the same authenticated payload
  // during page shutdown. It still writes to the exact same FileStoredKeyValues
  // instance used by CaracAL and by the normal PUT route.
  wrapper.post("/pi-storage/sync", sync_pi_storage);
  wrapper.get("/pi-merchant/:character/dashboard", async (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls || typeof controls.runner_action !== "function") {
      return res.status(503).json({ ok: false, error: "CaracAL runtime controls are not ready" });
    }
    try {
      const result = await controls.runner_action(req.params.character, "dashboard");
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 502;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-merchant/:character/stand", async (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls || typeof controls.runner_action !== "function") {
      return res.status(503).json({ ok: false, error: "CaracAL runtime controls are not ready" });
    }
    try {
      const result = await controls.runner_action(req.params.character, "stand");
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 502;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-merchant/:character/market", async (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls || typeof controls.runner_action !== "function") {
      return res.status(503).json({ ok: false, error: "CaracAL runtime controls are not ready" });
    }
    try {
      const result = await controls.runner_action(req.params.character, "market");
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 502;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-merchant/:character/skills", async (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls || typeof controls.runner_action !== "function") {
      return res.status(503).json({ ok: false, error: "CaracAL runtime controls are not ready" });
    }
    try {
      const result = await controls.runner_action(req.params.character, "skills");
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 502;
      return res.status(status).json({ ok: false, error: error && error.message ? error.message : String(error) });
    }
  });
  wrapper.post("/pi-merchant/:character/action", async (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls || typeof controls.runner_action !== "function") {
      return res.status(503).json({ ok: false, error: "CaracAL runtime controls are not ready" });
    }
    const action = req.body && typeof req.body.action === "string" ? req.body.action : "";
    const payload = req.body && req.body.payload && typeof req.body.payload === "object"
      ? req.body.payload
      : {};
    try {
      const result = await controls.runner_action(req.params.character, action, payload);
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 502;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-monitor/window-layout", (req, res) => {
    return res.json({ ok: true, ...read_monitor_window_layout() });
  });
  wrapper.put("/pi-monitor/window-layout", (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls) return res.status(503).json({ ok: false, error: "Controls are not ready" });
    const allowed_names = new Set(controls.list().map((character) => character.name));
    const layout = normalize_monitor_window_layout(req.body, allowed_names);
    try {
      write_monitor_window_layout(layout);
      return res.json({ ok: true, ...layout });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/character-view", (req, res) => {
    res.sendFile(path.join(wrapperRoot, "monitor-character.html"));
  });
  wrapper.get("/pi-monitor-character.js", (req, res) => {
    res.sendFile(path.join(wrapperRoot, "pi-monitor-character.js"));
  });
  wrapper.get("/pi-control/state", (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls) return res.status(503).json({ ok: false, error: "Controls are not ready" });
    return res.json({ ok: true, characters: controls.list() });
  });
  wrapper.get("/pi-client-update/check", async (req, res) => {
    try {
      return res.json(await check_pi_client_update());
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-monitor/server-latency", async (req, res) => {
    try {
      const account = get_account_info && get_account_info();
      return res.json(await check_server_latency(account && account.servers));
    } catch (error) {
      return res.status(503).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.post("/pi-client-update/apply", async (req, res) => {
    if (client_update_in_progress) return res.status(409).json({ ok: false, error: "A client update is already running" });
    client_update_in_progress = (async () => {
      const result = await update_client_cache();
      return result.updated ? restart_after_client_update(result) : result;
    })();
    try {
      return res.json(await client_update_in_progress);
    } catch (error) {
      console.error("Pi client cache update failed:", error);
      return res.status(502).json({ ok: false, error: error && error.message ? error.message : String(error) });
    } finally {
      client_update_in_progress = null;
    }
  });
  wrapper.get("/pi-game-data/trio", async (req, res) => {
    try {
      return res.json(await read_trio_game_data());
    } catch (error) {
      return res.status(503).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-account/mail", async (req, res) => {
    try {
      const session = get_account_session && get_account_session();
      const account = get_account_info && get_account_info();
      return res.json(await read_account_mail(session, account));
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-monitor/resources", (req, res) => {
    return res.json(resource_snapshot());
  });
  wrapper.post("/pi-control/:action/:character", async (req, res) => {
    const controls = get_monitor_controls && get_monitor_controls();
    if (!controls) return res.status(503).json({ ok: false, error: "Controls are not ready" });
    const action = req.params.action;
    if (action !== "pause" && action !== "resume" && action !== "stop") {
      return res.status(400).json({ ok: false, error: "Unknown character control" });
    }
    try {
      const state = await controls[action](req.params.character);
      return res.json({ ok: true, character: state });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 500;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.get("/pi-settings/state", (req, res) => {
    const settings = get_monitor_settings && get_monitor_settings();
    if (!settings) return res.status(503).json({ ok: false, error: "Settings are not ready" });
    try {
      return res.json({ ok: true, ...settings.state() });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.put("/pi-settings/global", async (req, res) => {
    const settings = get_monitor_settings && get_monitor_settings();
    if (!settings) return res.status(503).json({ ok: false, error: "Settings are not ready" });
    try {
      const result = await settings.update_global(req.body || {});
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 500;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.put("/pi-settings/character/:character", async (req, res) => {
    const settings = get_monitor_settings && get_monitor_settings();
    if (!settings) return res.status(503).json({ ok: false, error: "Settings are not ready" });
    try {
      const result = await settings.update_character(req.params.character, req.body || {});
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 500;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.post("/pi-settings/sync-characters", async (req, res) => {
    const settings = get_monitor_settings && get_monitor_settings();
    if (!settings) return res.status(503).json({ ok: false, error: "Settings are not ready" });
    try {
      const result = await settings.sync_characters();
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 500;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.post("/pi-settings/sync-code", async (req, res) => {
    try {
      const result = await run_account_code_sync();
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });
  wrapper.post("/pi-settings/restart", async (req, res) => {
    const settings = get_monitor_settings && get_monitor_settings();
    if (!settings) return res.status(503).json({ ok: false, error: "Settings are not ready" });
    try {
      const result = await settings.restart();
      return res.json({ ok: true, ...result });
    } catch (error) {
      const status = error && error.statusCode ? error.statusCode : 500;
      return res.status(status).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });

  const stack = (bwi_instance.app._router && bwi_instance.app._router.stack) ||
    (bwi_instance.app.router && bwi_instance.app.router.stack);
  const bwiIndex = stack && stack.findIndex((layer) => layer.handle === bwi_instance.router);
  if (!stack || bwiIndex < 0) {
    bwi_instance.app.use(wrapper);
    return;
  }
  stack.splice(bwiIndex, 0, ...wrapper.stack);
}

(async () => {
  const cfg = require("../config");
  const pi_monitor_settings = read_pi_monitor_settings();
  apply_pi_monitor_settings(cfg, pi_monitor_settings);
  const storage_mode = resolve_storage_mode(cfg);
  const configured_storage_paths = storage_paths(storage_mode);
  const localStorage = new FileStoredKeyValues(
    storage_mode === SHARED_STORAGE_MODE
      ? LOCALSTORAGE_PATH
      : configured_storage_paths.main,
    storage_mode === SHARED_STORAGE_MODE
      ? LOCALSTORAGE_ROTA_PATH
      : configured_storage_paths.rotation,
  );

  log.info(
    {
      type: "localStorage_mode",
      storage_mode,
      shared_with_pi_client: is_pi_shared_storage(storage_mode),
      path: configured_storage_paths.main,
    },
    "CaracAL localStorage authority selected",
  );

  //migrate from old library which stored everything in single file
  migrate_old_storage("./localStorage/storage.json", localStorage);

  const sessionStorage = new Map();
  localStorage.set("caracAL", "Yeah");
  sessionStorage.set("caracAL", "Yup");

  const version = await game_files.ensure_latest();

  if (cfg.cull_versions) {
    await game_files.cull_versions([version]);
  }
  const sess = process.env.AL_SESSION || cfg.session;
  const my_acc = await account_info(sess);
  const default_realm = my_acc.response.servers[0];

  const character_manage = cfg.characters;

  //TODO right now this server wont terminate.
  //this is fine atm because caracAL does not terminate when all chars stop.
  //when I change this in the future this might change as well.
  let bwi_instance = {};
  let monitor_controls = null;
  let monitor_settings = null;
  let restart_requested = false;
  try {
    if (cfg.web_app && (cfg.web_app.enable_bwi || cfg.web_app.enable_minimap)) {
      bwi_instance = new bwi({
        port: cfg.web_app.port,
        password: null,
        updateRate: STAT_BEAT_INTERVAL,
      });
      pi_auth.protect_express_router(bwi_instance.app);
      pi_auth.protect_express_router(bwi_instance.router);
      install_monitor_wrapper(
        bwi_instance,
        () => monitor_controls,
        () => localStorage,
        () => storage_mode,
        () => monitor_settings,
        () => my_acc.response,
        () => sess,
        broadcast_local_storage,
      );
    }
    let express_inst = bwi_instance.router;
    let standalone_express = false;
    if (!express_inst && cfg.web_app && (cfg.web_app.expose_CODE || (cfg.web_app.expose_TYPECODE && cfg.enable_TYPECODE))) {
      express_inst = express();
      standalone_express = true;
    }
    if (express_inst) pi_auth.protect_express_router(express_inst);
    if (cfg.web_app && cfg.web_app.expose_CODE) {
      const code_static_root = path.dirname(local_code_root());
      log.info(
        { type: "CODE_exposed", src_path: code_static_root },
        "Serving CODE statically",
      );
      express_inst.use("/CODE", express.static(code_static_root));
    }
    if (cfg.web_app && cfg.web_app.expose_TYPECODE && cfg.enable_TYPECODE) {
      log.info(
        { type: "TYPECODE_exposed", src_path: __dirname + "/../TYPECODE.out" },
        "Serving TYPECODE statically",
      );
      express_inst.use(
        "/TYPECODE",
        express.static(__dirname + "/../TYPECODE.out"),
      );
    }
    if (standalone_express) express_inst.listen(cfg.web_app.port, process.env.CARACAL_BIND_HOST || "::");
  } catch (e) {
    console.error(`failed to start web services.`, e);
    console.error(`no web services will be available`);
  }

  function safe_send(target, data) {
    if (target) {
      target.send(data, undefined, undefined, (e) => {
        //This can occur due to node closing ipc
        //before firing its close handlers
        if (e) {
          //console.error(`failed to send ipc`);
          //console.error(`target: `,target);
        }
      });
    }
  }

  function broadcast_local_storage(message) {
    Object.values(character_manage)
      .filter((block) => block && block.instance)
      .forEach((block) => {
        safe_send(block.instance, message);
      });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function process_has_exited(proc) {
    return Boolean(proc && (proc.exitCode !== null || proc.signalCode !== null));
  }

  function wait_for_process_exit(proc, timeout_ms) {
    if (!proc || process_has_exited(proc)) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (exited) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(exited);
      };
      const timer = setTimeout(() => finish(process_has_exited(proc)), timeout_ms);
      proc.once("exit", () => finish(true));
    });
  }

  //attempts to softkill child processes
  //by sending an ipc if the client is connected and giving some timeout
  //why not actual SIGTERM? cause windows cant even
  async function softkill_block(char_block) {
    const proc = char_block.instance;
    if (!proc) return;
    if (char_block.stop_promise) return char_block.stop_promise;

    char_block.stop_requested = proc;
    const stop_promise = (async () => {
      if (char_block.connected && !process_has_exited(proc)) {
        console.log("telling client to self-terminate");
        safe_send(proc, {
          type: "closing_client",
        });
        if (await wait_for_process_exit(proc, 750)) {
          console.log("Client terminated gracefully");
          return;
        }
      }
      if (!process_has_exited(proc)) {
        console.log("Hard-terminating client");
        proc.kill("SIGKILL");
      }
      if (!await wait_for_process_exit(proc, 5000)) {
        throw new Error("CaracAL client did not terminate after the control request");
      }
    })();
    char_block.stop_promise = stop_promise;
    try {
      await stop_promise;
    } finally {
      if (char_block.stop_promise === stop_promise) char_block.stop_promise = null;
      if (char_block.instance === proc && process_has_exited(proc)) {
        char_block.instance = null;
        char_block.connected = false;
      }
      if (char_block.stop_requested === proc && process_has_exited(proc)) {
        char_block.stop_requested = null;
      }
    }
  }

  function update_siblings_and_acc(info) {
    const sib_names = Object.keys(character_manage)
      .filter((x) => character_manage[x].connected)
      .sort();

    sib_names.forEach((char) => {
      safe_send(character_manage[char].instance, {
        type: "siblings_and_acc",
        account: info,
        siblings: sib_names,
      });
    });
  }

  function start_char(char_name) {
    const char_block = character_manage[char_name];
    if (char_block.instance) {
      console.warn(`not starting ${char_name}: an existing client is still running`);
      return char_block.instance;
    }
    let realm = my_acc.resolve_realm(char_block.realm);
    if (!realm) {
      console.warn(
        `could not find realm ${char_block.realm},`,
        `falling back to realm ${default_realm.key}`,
      );
      char_block.realm = default_realm.key;
      realm = default_realm;
    }
    const char = my_acc.resolve_char(char_name);
    //class is char.type
    if (!char) {
      console.error(
        `could not resolve character ${char_name}`,
        `this character will not be started`,
      );
      console.error(
        "are you sure you own this character and have not deleted it?",
      );
      char_block.enabled = false;
      return;
    }
    const g_version = char_block.version || version;
    console.log(
      `starting ${char_name} running version ${g_version} in ${char_block.realm}`,
    );
    const args = {
      version: g_version,
      // The current servers_and_characters response uses address/path. Keep
      // addr/port as fallbacks for older API responses.
      realm_addr: realm.address || realm.addr,
      realm_port: realm.port,
      realm_path: realm.path,
      sess: sess,
      cid: char.id,
      script_file: char_block.script,
      enable_map: !!(cfg.web_app && cfg.web_app.enable_minimap),
      cname: char_name,
      clid: ctype_to_clid[char.type] || -1,
      // Preserve the account-level class so the monitor can render a
      // class avatar even when the headless game object omits cosmetics.
      ctype: char.type || "",
      storage_mode,
    };
    if (cfg.enable_TYPECODE) {
      args.typescript_file = char_block.typescript;
    }

    const result = child_process.fork("./src/CharacterThread.js", [], {
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });

    result.stdout.pipe(process.stdout);
    result.stderr.pipe(process.stderr);
    char_block.instance = result;
    result.on("exit", () => {
      const is_current_process = char_block.instance === result;
      const was_stop_requested = char_block.stop_requested === result;
      if (is_current_process && char_block.monitor) {
        //close monitor
        char_block.monitor.destroy();
        char_block.monitor = null;
      }
      if (is_current_process) {
        char_block.connected = false;
        char_block.instance = null;
      }
      if (was_stop_requested) char_block.stop_requested = null;
      if (is_current_process && char_block.enabled && !char_block.paused && !was_stop_requested) {
        start_char(char_name);
      }
    });
    result.on("message", (m) => {
      switch (m.type) {
        case "process_ready":
          safe_send(result, {
            type: "process_args",
            arguments: args,
          });
          break;
        case "initialized":
          break;
        case "connected":
          char_block.connected = true;
          update_siblings_and_acc(my_acc.response);
          break;
        case "deploy":
          //check for existing charblock, adjust parameters and kill it
          //or not find any, make a new one and start it
          const new_char_name = m.character || char_name;
          const candidate = character_manage[new_char_name] || {};
          character_manage[new_char_name] = candidate;
          candidate.paused = false;
          candidate.enabled = true;
          candidate.realm = m.realm || char_block.realm;
          if (char_block.typescript && char_block.typescript.length > 0) {
            candidate.typescript = m.script || char_block.typescript;
          } else {
            candidate.script = m.script || char_block.script;
            candidate.typescript = null;
          }
          candidate.script = m.script || char_block.script;
          candidate.version = m.version || char_block.version;
          if (candidate.instance) {
            candidate.connected = false; //TODO i need to refractor lifecycle management
            softkill_block(candidate)
              .then(() => {
                if (candidate.enabled && !candidate.paused && !candidate.instance) start_char(new_char_name);
              })
              .catch((error) => console.error(`failed to restart ${new_char_name}:`, error));
          } else {
            candidate.connected = false;
            start_char(new_char_name);
          }
          break;
        case "shutdown":
          if (m.character) {
            const candidate = character_manage[m.character] || {};

            console.log(
              `shutdown requested for ${m.character} from ${char_name}`,
            );
            candidate.enabled = false;
            softkill_block(candidate);
          } else {
            console.log("shutdown requested from " + char_name);
            char_block.enabled = false;
            softkill_block(char_block);
          }
          break;
        case "cm":
          let recipients = m.to;
          if (!Array.isArray(recipients)) {
            recipients = [recipients];
          }
          const [locs, globs] = partition(
            recipients,
            (x) => character_manage[x] && character_manage[x].connected,
          );
          if (globs.length > 0) {
            safe_send(char_block.instance, {
              type: "send_cm",
              to: globs,
              data: m.data,
            });
          }
          locs.forEach((blk) => {
            safe_send(character_manage[blk].instance, {
              type: "receive_cm",
              name: char_name,
              data: m.data,
            });
          });
          break;
        //localStorage and sessionStorage related
        case "stor":
          if (
            m.ident == "ls" &&
            m.storage_mode &&
            m.storage_mode !== storage_mode
          ) {
            console.warn(
              `ignoring localStorage IPC from ${char_name}: ` +
              `child=${m.storage_mode}, coordinator=${storage_mode}`,
            );
            break;
          }
          const trg_store = m.ident == "ls" ? localStorage : sessionStorage;
          switch (m.op) {
            case "set":
              for (let key in m.data) {
                trg_store.set(key, m.data[key]);
              }
              break;
            case "del":
              for (let key of m.data) {
                trg_store.delete(key);
              }
              break;
            case "clear":
              for (let [key, value] of trg_store.entries()) {
                trg_store.delete(key);
              }
              break;
            case "init":
              const catchup_data = {};
              for (let [key, value] of trg_store.entries()) {
                catchup_data[key] = value;
              }
              safe_send(char_block.instance, {
                type: "stor",
                op: "set",
                ident: m.ident,
                ...(m.ident == "ls" && { storage_mode }),
                data: catchup_data,
              });
              break;
            default:
              break;
          }
          if (m.op != "init") {
            //forward to other running processes
            Object.values(character_manage)
              .filter((x) => x.instance)
              .forEach((block) => {
                safe_send(block.instance, m);
              });
          }
          break;
        case "runner_action_result": {
          const waiter = char_block.runner_action_waiters &&
            char_block.runner_action_waiters.get(m.requestId);
          if (!waiter) break;
          char_block.runner_action_waiters.delete(m.requestId);
          clearTimeout(waiter.timer);
          if (m.ok) waiter.resolve(m.result || {});
          else {
            const error = new Error(m.error || "CaracAL runner action failed");
            error.statusCode = 502;
            waiter.reject(error);
          }
          break;
        }
        default:
          break;
      }
    });
    if (bwi_instance.publisher) {
      char_block.monitor = monitoring_util.create_monitor_ui(
        bwi_instance,
        char_name,
        char_block,
        cfg.web_app.enable_minimap,
      );
    }

    return result;
  }

  const control_locks = new Map();

  function character_control_state(char_name, char_block) {
    const stopped = char_block.stopped === true;
    return {
      name: char_name,
      paused: !stopped && (char_block.paused === true || char_block.enabled === false),
      stopped,
      enabled: char_block.enabled !== false,
      connected: char_block.connected === true,
      running: !!char_block.instance,
    };
  }

  const RUNNER_ACTIONS = new Set(["dashboard", "skills", "stand", "market", "bank", "mail", "navigate", "courier", "patrol", "ponty", "server", "anniversary"]);
  const RUNNER_ACTION_TIMEOUT_MS = 5000;

  function runner_action(char_name, action, payload = {}) {
    const char_block = character_manage[char_name];
    if (!char_block) throw missing_character_error(char_name);
    if (!RUNNER_ACTIONS.has(action)) {
      const error = new Error("Unknown CaracAL runner action");
      error.statusCode = 400;
      throw error;
    }
    if (!char_block.instance || !char_block.connected) {
      const error = new Error(`${char_name} is not connected to CaracAL`);
      error.statusCode = 409;
      throw error;
    }
    if (!char_block.runner_action_waiters) char_block.runner_action_waiters = new Map();
    const request_id = `PiTools:${Date.now()}:${Math.floor(Math.random() * 1000000)}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        char_block.runner_action_waiters.delete(request_id);
        const error = new Error("CaracAL did not answer the merchant action in time");
        error.statusCode = 504;
        reject(error);
      }, RUNNER_ACTION_TIMEOUT_MS);
      char_block.runner_action_waiters.set(request_id, { resolve, reject, timer });
      safe_send(char_block.instance, {
        type: "runner_action",
        requestId: request_id,
        action,
        payload: payload && typeof payload === "object" ? payload : {},
      });
    });
  }

  function missing_character_error(char_name) {
    const error = new Error(`Unknown configured character: ${char_name}`);
    error.statusCode = 404;
    return error;
  }

  function with_control_lock(char_name, task) {
    const previous = control_locks.get(char_name) || Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    control_locks.set(char_name, next);
    next.then(
      () => {
        if (control_locks.get(char_name) === next) control_locks.delete(char_name);
      },
      () => {
        if (control_locks.get(char_name) === next) control_locks.delete(char_name);
      },
    );
    return next;
  }

  function list_character_controls() {
    return Object.entries(character_manage)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([char_name, char_block]) => character_control_state(char_name, char_block));
  }

  function pause_character(char_name) {
    return with_control_lock(char_name, async () => {
      const char_block = character_manage[char_name];
      if (!char_block) throw missing_character_error(char_name);
      char_block.paused = true;
      char_block.stopped = false;
      char_block.enabled = false;
      await softkill_block(char_block);
      char_block.connected = false;
      persist_character_settings(char_name, char_block);
      write_pi_monitor_settings(pi_monitor_settings);
      return character_control_state(char_name, char_block);
    });
  }

  function resume_character(char_name) {
    return with_control_lock(char_name, async () => {
      const char_block = character_manage[char_name];
      if (!char_block) throw missing_character_error(char_name);
      char_block.paused = false;
      char_block.stopped = false;
      char_block.enabled = true;
      char_block.connected = false;
      if (char_block.monitor) {
        char_block.monitor.destroy();
        char_block.monitor = null;
      }
      if (!char_block.instance) start_char(char_name);
      persist_character_settings(char_name, char_block);
      write_pi_monitor_settings(pi_monitor_settings);
      return character_control_state(char_name, char_block);
    });
  }

  function persist_character_settings(char_name, char_block) {
    pi_monitor_settings.characters[char_name] = {};
    for (const key of CHARACTER_SETTING_KEYS) {
      if (key === "script" || key === "typescript") {
        pi_monitor_settings.characters[char_name][key] = char_block[key] || null;
      } else if (Object.prototype.hasOwnProperty.call(char_block, key)) {
        pi_monitor_settings.characters[char_name][key] = char_block[key];
      }
    }
    pi_monitor_settings.characters[char_name].stopped = char_block.stopped === true;
  }

  function stop_character(char_name) {
    return with_control_lock(char_name, async () => {
      const char_block = character_manage[char_name];
      if (!char_block) throw missing_character_error(char_name);
      char_block.paused = false;
      char_block.stopped = true;
      char_block.enabled = false;
      await softkill_block(char_block);
      char_block.connected = false;
      persist_character_settings(char_name, char_block);
      write_pi_monitor_settings(pi_monitor_settings);
      return character_control_state(char_name, char_block);
    });
  }

  async function stop_all_characters() {
    const states = [];
    for (const char_name of Object.keys(character_manage).sort()) {
      states.push(await stop_character(char_name));
    }
    return states;
  }

  async function update_character_settings(char_name, raw_patch) {
    return with_control_lock(char_name, async () => {
      const char_block = character_manage[char_name];
      if (!char_block) throw missing_character_error(char_name);
      const patch = normalize_character_settings_patch(raw_patch);
      if (!Object.keys(patch).length) throw settings_error("No character settings were supplied");

      const runtime_keys = ["realm", "script", "typescript", "version"];
      const runtime_changed = runtime_keys.some((key) =>
        Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== char_block[key],
      );
      const enabled_was_requested = Object.prototype.hasOwnProperty.call(patch, "enabled");
      Object.assign(char_block, patch);

      let restarted = false;
      if (enabled_was_requested && patch.enabled === false) {
        char_block.paused = true;
        char_block.stopped = false;
        await softkill_block(char_block);
        char_block.connected = false;
      } else if (enabled_was_requested && patch.enabled === true) {
        char_block.paused = false;
        char_block.stopped = false;
        char_block.enabled = true;
        char_block.connected = false;
        if (char_block.instance) {
          await softkill_block(char_block);
          restarted = true;
        }
        if (!char_block.instance) start_char(char_name);
      } else if (runtime_changed && char_block.enabled !== false && char_block.instance) {
        char_block.paused = false;
        char_block.connected = false;
        await softkill_block(char_block);
        restarted = true;
        if (!char_block.instance) start_char(char_name);
      }

      persist_character_settings(char_name, char_block);
      write_pi_monitor_settings(pi_monitor_settings);
      return {
        settings: monitor_settings_snapshot(cfg, character_manage),
        character: character_control_state(char_name, char_block),
        restarted,
      };
    });
  }

  async function update_global_settings(raw_patch) {
    const patch = normalize_global_settings_patch(raw_patch);
    if (!Object.keys(patch).length) throw settings_error("No global settings were supplied");
    Object.assign(cfg, patch);
    if (patch.web_app) {
      if (!cfg.web_app || typeof cfg.web_app !== "object") cfg.web_app = {};
      Object.assign(cfg.web_app, patch.web_app);
    }
    for (const key of GLOBAL_SETTING_KEYS) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) pi_monitor_settings.global[key] = patch[key];
    }
    if (patch.web_app) {
      pi_monitor_settings.global.web_app = {
        ...(pi_monitor_settings.global.web_app || {}),
        ...patch.web_app,
      };
    }
    write_pi_monitor_settings(pi_monitor_settings);
    return {
      settings: monitor_settings_snapshot(cfg, character_manage),
      restartRequired: true,
    };
  }

  async function sync_character_settings() {
    const account = await my_acc.updateInfo();
    const account_names = Array.isArray(account && account.characters)
      ? account.characters.map((character) => character && character.name).filter(Boolean)
      : [];
    const account_name_set = new Set(account_names);
    const template = Object.values(character_manage).find((character) =>
      character && (character.script || character.typescript),
    ) || {};
    const added = [];
    for (const name of account_names) {
      if (character_manage[name]) continue;
      const character = {
        realm: default_realm.key,
        script: template.script || "caracAL/examples/crabs.js",
        typescript: template.typescript || null,
        enabled: false,
        version: 0,
        paused: true,
        connected: false,
        instance: null,
        monitor: null,
      };
      character_manage[name] = character;
      pi_monitor_settings.characters[name] = {
        realm: character.realm,
        script: character.script,
        typescript: character.typescript,
        enabled: false,
        version: 0,
      };
      added.push(name);
    }
    write_pi_monitor_settings(pi_monitor_settings);
    return {
      settings: monitor_settings_snapshot(cfg, character_manage),
      added,
      accountCharacters: account_names,
      existingConfiguredCharacters: Object.keys(character_manage).filter((name) => account_name_set.has(name)),
    };
  }

  async function restart_caracAL() {
    if (restart_requested) return { restarting: true, alreadyRequested: true };
    restart_requested = true;
    if (fs_regular.existsSync("/.dockerenv")) {
      // Docker supervises this process with restart: unless-stopped. Calling
      // systemctl from inside the container is unavailable and crashes the
      // headless service before the supervisor can restart it cleanly.
      setTimeout(() => process.exit(0), 250);
      return { restarting: true, supervisor: "docker" };
    }
    setTimeout(() => {
      const restart_process = child_process.spawn(
        "systemctl",
        ["--user", "restart", "adventureland-headless.service"],
        { detached: true, stdio: "ignore" },
      );
      restart_process.unref();
    }, 250);
    return { restarting: true };
  }

  monitor_settings = {
    state: () => monitor_settings_snapshot(cfg, character_manage),
    update_character: update_character_settings,
    update_global: update_global_settings,
    sync_characters: sync_character_settings,
    restart: restart_caracAL,
  };

  monitor_controls = {
    list: list_character_controls,
    pause: pause_character,
    resume: resume_character,
    stop: stop_character,
    stop_all: stop_all_characters,
    runner_action,
  };

  //TODO beta new logic for #5
  //i need to implement decent lifecycle-handling
  ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) =>
    process.on(signal, async () => {
      console.log(`Received ${signal} on master. Rounding up clients`);
      //softkill all chars, giving them chance to shutdown
      await Promise.all(
        Object.values(character_manage).map((char_block) => {
          char_block.enabled = false;
          return softkill_block(char_block);
        }),
      );
      console.log("now truly exiting");
      process.exit();
    }),
  );

  // Avoid racing all account characters through the server's sibling
  // confirmation window at once. Restarts requested by a running character
  // remain immediate; only the initial launch is staggered.
  const initial_start_delay_ms = 2500;
  let initial_start_index = 0;
  const tasks = Object.keys(character_manage).forEach((c_name) => {
    const char = character_manage[c_name];
    char.connected = false;
    char.paused = char.enabled === false;
    if (char.enabled) {
      const delay = initial_start_index++ * initial_start_delay_ms;
      setTimeout(() => {
        if (char.enabled && !char.instance) start_char(c_name);
      }, delay);
    }
  });
  my_acc.add_listener(update_siblings_and_acc);
})().catch((e) => {
  console.error("failed to start caracAL", e);
});
