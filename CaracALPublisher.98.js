// CaracALPublisher.98.js -- read-only durable dashboard publisher.
//
// This module consumes the existing Trio / Merchant publishers and writes the
// CaracAL compatibility records through Shared.1.js.  It does not move,
// attack, trade, switch servers, change targets, or mutate game state.

var CARACAL_PUBLISHER_VERSION = 1;
var CARACAL_PUBLISH_INTERVAL_MS = 10000;
var CARACAL_HISTORY_SAMPLE_MS = 30000;
var CARACAL_HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
var CARACAL_HISTORY_MAX_SAMPLES = 1000;
var CARACAL_MODULE_NAME = "CaracALPublisher.98";
var CARACAL_PLUS_SCHEMA_VERSION = 2;
var CARACAL_ACTIVITY_MAX_EVENTS = 25;
var CARACAL_EVENT_MAX_SAMPLES = 1000;
var CARACAL_RECORD_FRESH_MS = 120000;
var CARACAL_MEMBER_NAMES = ["TheDroidWar", "TheDroidCLR", "TheDroidRNG", "TheDroidMCH"];
var CARACAL_TRACKTRIX_SCHEMA_VERSION = 1;
var CARACAL_TRACKTRIX_RECORD_NAMES = ["Tracktrix.v1", "Exchange.v1", "TracktrixSnapshot.v1"];
var CARACAL_WRITE_AT = typeof CARACAL_WRITE_AT === "object" && CARACAL_WRITE_AT ? CARACAL_WRITE_AT : {};
var CARACAL_WRITE_SIGNATURE = typeof CARACAL_WRITE_SIGNATURE === "object" && CARACAL_WRITE_SIGNATURE ? CARACAL_WRITE_SIGNATURE : {};
var CARACAL_PENDING_LOOT_EVENTS = typeof CARACAL_PENDING_LOOT_EVENTS === "object" && CARACAL_PENDING_LOOT_EVENTS ? CARACAL_PENDING_LOOT_EVENTS : {};
var CARACAL_LOOT_CAPTURE_INSTALLED = !!CARACAL_LOOT_CAPTURE_INSTALLED;
var CARACAL_PUBLISHER_RUNTIME = typeof CARACAL_PUBLISHER_RUNTIME === "object" && CARACAL_PUBLISHER_RUNTIME ? CARACAL_PUBLISHER_RUNTIME : null;

function caracalTimestamp() {
    try { return typeof now === "function" ? now() : Date.now(); } catch (_) { return Date.now(); }
}

function caracalFinite(value) {
    var number = Number(value);
    return isFinite(number) ? number : null;
}

function caracalText(value) {
    return value === null || value === undefined ? null : String(value);
}

function caracalSafe(value, depth, seen) {
    if (value === null || value === undefined) return null;
    if (typeof value === "function" || typeof value === "symbol") return null;
    if (typeof value === "number") return isFinite(value) ? value : null;
    if (typeof value === "string" || typeof value === "boolean") return value;
    if (depth > 7) return null;
    if (typeof value === "object" && typeof value.nodeType === "number") return null;
    if (value instanceof Date) return isFinite(value.getTime()) ? value.getTime() : null;
    seen = seen || [];
    if (seen.indexOf(value) !== -1) return null;
    seen.push(value);
    var result;
    if (Array.isArray(value)) {
        result = [];
        for (var i = 0; i < value.length && i < 300; i++) result.push(caracalSafe(value[i], depth + 1, seen));
    } else {
        result = {};
        var keys = Object.keys(value);
        for (var k = 0; k < keys.length && k < 300; k++) {
            var key = keys[k];
            var child = caracalSafe(value[key], depth + 1, seen);
            if (child !== null || value[key] === null) result[key] = child;
        }
    }
    seen.pop();
    return result;
}

function caracalToken(value) {
    var text = caracalText(value);
    if (!text) return "Unknown";
    try {
        if (typeof alStorageToken === "function") return alStorageToken(text);
    } catch (_) { }
    return text.replace(/[^A-Za-z0-9_-]/g, "_");
}

// The requested records intentionally keep the dotted v1 suffix.  alStorageWrite
// remains the storage bridge, so this does not bypass the shared localStorage
// selection or the parent-window storage fallback.
function caracalKey(characterName, recordName) {
    return (characterName ? caracalToken(characterName) + "." : "") + "CaracAL." + recordName;
}

function caracalRead(key, fallback) {
    try {
        if (typeof alStorageRead === "function") return alStorageRead(key, fallback);
    } catch (_) { }
    return fallback;
}

function caracalWrite(key, value) {
    var payload = caracalSafe(value, 0, []);
    var signature;
    try { signature = JSON.stringify(payload); } catch (_) { return false; }
    var at = caracalTimestamp();
    if (CARACAL_WRITE_SIGNATURE[key] === signature) return false;
    if (CARACAL_WRITE_AT[key] && at - CARACAL_WRITE_AT[key] < CARACAL_PUBLISH_INTERVAL_MS) return false;
    try {
        if (typeof alStorageWrite !== "function") return false;
        alStorageWrite(key, payload);
        CARACAL_WRITE_AT[key] = at;
        CARACAL_WRITE_SIGNATURE[key] = signature;
        return true;
    } catch (_) { return false; }
}

function caracalSource(name, area) {
    return { character: name || null, module: CARACAL_MODULE_NAME, area: area || null };
}

function caracalCharacterName() {
    try { return character && character.name ? String(character.name) : null; } catch (_) { return null; }
}

function caracalRole() {
    try {
        if (typeof role === "string" && role) return role;
        if (character && character.ctype) return String(character.ctype);
    } catch (_) { }
    return null;
}

function caracalCurrentServer() {
    var region = null;
    var id = null;
    try {
        region = typeof server !== "undefined" && server ? server.region : null;
        id = typeof server !== "undefined" && server ? server.id : null;
    } catch (_) { }
    try {
        if (!region && typeof server_region !== "undefined") region = server_region;
        if (!id && typeof server_identifier !== "undefined") id = server_identifier;
    } catch (_) { }
    return { region: caracalText(region), id: caracalText(id) };
}

function caracalHomeServer() {
    try {
        if (typeof homeServerSyncOwnHome === "function") return homeServerSyncOwnHome();
    } catch (_) { }
    try {
        return { key: character.home || null, region: null, id: null };
    } catch (_) { return { key: null, region: null, id: null }; }
}

function caracalState() {
    var state = null;
    try {
        if (typeof ownState === "function") state = ownState();
    } catch (_) { }
    if (!state) {
        try {
            if (typeof statusSnapshot === "function") state = statusSnapshot();
        } catch (_) { }
    }
    if (!state) {
        var name = caracalCharacterName();
        var key = null;
        try { if (typeof teamStateKey === "function") key = teamStateKey(name); } catch (_) { }
        try { if (!key && typeof alStorageKey === "function") key = alStorageKey(name, "Trio", "state"); } catch (_) { }
        if (!key) key = caracalToken(name) + ".Trio.state";
        state = caracalRead(key, null);
        if (!state && name === "TheDroidMCH") {
            try { state = caracalRead(MERCHANT_STATE_V3_KEY, null); } catch (_) { }
        }
    }
    return state || {};
}

function caracalField(state, names, fallback) {
    for (var i = 0; i < names.length; i++) {
        if (state && state[names[i]] !== undefined && state[names[i]] !== null) return state[names[i]];
        try {
            if (character && character[names[i]] !== undefined && character[names[i]] !== null) return character[names[i]];
        } catch (_) { }
    }
    return fallback;
}

function caracalCharacterValue(names) {
    try {
        for (var i = 0; i < names.length; i++) {
            if (character && character[names[i]] !== undefined && character[names[i]] !== null) {
                var number = caracalFinite(character[names[i]]);
                if (number !== null) return { name: names[i], value: number };
            }
        }
    } catch (_) { }
    return { name: null, value: null };
}

function caracalResource() {
    var value = caracalCharacterValue(["cc", "resource", "energy", "rage", "courage"]);
    var maximum = caracalCharacterValue(["max_cc", "max_resource", "max_energy", "max_rage", "max_courage"]);
    return {
        name: value.name || maximum.name,
        value: value.value,
        max: maximum.value,
        available: value.value !== null || maximum.value !== null
    };
}

function caracalModifierPercent(names) {
    try {
        for (var i = 0; i < names.length; i++) {
            var name = names[i];
            if (!character || character[name] === undefined || character[name] === null) continue;
            var number = caracalFinite(character[name]);
            if (number === null) continue;
            if (name.indexOf("percent") !== -1 || name.indexOf("bonus") !== -1) return number;
            if (name.indexOf("multiplier") !== -1 || /m$/.test(name)) return (number - 1) * 100;
        }
    } catch (_) { }
    return null;
}

function caracalModifiers() {
    return {
        goldPercent: caracalModifierPercent(["gold_percent", "goldPercent", "gold_bonus", "goldBonus", "gold_multiplier", "goldMultiplier", "goldm"]),
        xpPercent: caracalModifierPercent(["xp_percent", "xpPercent", "xp_bonus", "xpBonus", "xp_multiplier", "xpMultiplier", "xpm"]),
        luckPercent: caracalModifierPercent(["luck_percent", "luckPercent", "luck_bonus", "luckBonus", "luck_multiplier", "luckMultiplier", "luckm"])
    };
}

function caracalEffects() {
    var effects = [];
    var statuses = null;
    try { statuses = character && character.s; } catch (_) { }
    if (!statuses || typeof statuses !== "object") return effects;
    var at = caracalTimestamp();
    Object.keys(statuses).forEach(function (name) {
        var effect = statuses[name];
        if (!effect || typeof effect !== "object" || typeof effect.nodeType === "number") return;
        var remaining = null;
        var remainingKeys = ["remainingMs", "ms", "expiresAt", "expires"];
        for (var i = 0; i < remainingKeys.length; i++) {
            var candidate = caracalFinite(effect[remainingKeys[i]]);
            if (candidate === null) continue;
            remaining = remainingKeys[i].indexOf("expire") === 0 || remainingKeys[i].indexOf("expires") === 0 ?
                Math.max(0, candidate - at) : Math.max(0, candidate);
            break;
        }
        var stacks = null;
        ["stacks", "stack", "count", "n"].some(function (key) {
            var candidate = caracalFinite(effect[key]);
            if (candidate === null) return false;
            stacks = candidate;
            return true;
        });
        effects.push({ name: name, remainingMs: remaining, stacks: stacks, values: caracalSafe(effect, 0, []) });
    });
    return effects;
}

function caracalTarget(state) {
    var target = null;
    try { if (typeof get_targeted_monster === "function") target = get_targeted_monster(); } catch (_) { }
    if (!target) {
        try {
            if (character && character.target && typeof get_entity === "function") target = get_entity(character.target);
        } catch (_) { }
    }
    var targetId = target && (target.id || target.eid) || (state && state.targetId) || null;
    var targetType = target && (target.mtype || target.type) || (state && state.targetType) || null;
    var targetName = target && (target.name || targetType) || (state && state.targetName) || targetType;
    var hp = target ? caracalFinite(target.hp) : caracalFinite(state && state.targetHp);
    var maxHp = target ? caracalFinite(target.max_hp || target.maxHp) : caracalFinite(state && state.targetMaxHp);
    return {
        id: targetId === null ? null : String(targetId),
        type: caracalText(targetType),
        name: caracalText(targetName),
        hp: hp,
        maxHp: maxHp,
        level: caracalFinite(target && target.level || state && state.targetLevel),
        alive: target ? !target.dead : !!(state && state.targetLive)
    };
}

function caracalInventory() {
    var items = null;
    try { items = Array.isArray(character.items) ? character.items : null; } catch (_) { }
    var capacity = items ? items.length : null;
    var free = null;
    try { free = caracalFinite(character.esize); } catch (_) { }
    var used = capacity !== null && free !== null ? Math.max(0, capacity - free) : null;
    var hpPotions = null;
    var mpPotions = null;
    try {
        if (typeof quantity === "function") {
            hpPotions = caracalFinite(quantity("hpot0"));
            mpPotions = caracalFinite(quantity("mpot0"));
        }
    } catch (_) { }
    var gearCount = null;
    try {
        if (typeof equippedGearSnapshot === "function") gearCount = Object.keys(equippedGearSnapshot() || {}).length;
        else if (character && character.slots) {
            var gearSlots = ["helmet", "chest", "pants", "shoes", "gloves", "mainhand", "offhand", "amulet", "ring1", "ring2", "belt", "earring1", "earring2", "cape", "orb"];
            gearCount = gearSlots.filter(function (slot) { return !!character.slots[slot]; }).length;
        }
    } catch (_) { }
    if (items === null) {
        try {
            if (typeof merchantTrioInventoryResponseKey === "function") {
                var saved = caracalRead(merchantTrioInventoryResponseKey(caracalCharacterName()), null);
                if (saved && Array.isArray(saved.items)) {
                    items = saved.items;
                    capacity = caracalFinite(saved.size);
                    used = capacity;
                    if (gearCount === null && saved.slots && typeof saved.slots === "object") {
                        gearCount = Object.keys(saved.slots).length;
                    }
                }
            }
        } catch (_) { }
    }
    return {
        slots: { used: used, capacity: capacity, free: free },
        hpPotions: hpPotions,
        mpPotions: mpPotions,
        gearCount: gearCount
    };
}

function caracalMonsterTracker() {
    var performance = null;
    var observations = null;
    var performanceKey = null;
    var observationsKey = null;
    try {
        if (typeof targetPerformance !== "undefined") performance = targetPerformance;
        if (typeof monsterObservations !== "undefined") observations = monsterObservations;
        if (typeof TARGET_PERFORMANCE_KEY !== "undefined") performanceKey = TARGET_PERFORMANCE_KEY;
        if (typeof MONSTER_OBSERVATIONS_KEY !== "undefined") observationsKey = MONSTER_OBSERVATIONS_KEY;
    } catch (_) { }
    var firstMember = null;
    try {
        var names = caracalTeamNames();
        firstMember = names.length ? names[0] : null;
    } catch (_) { }
    try {
        if (!performanceKey && typeof MERCHANT_TRIO_TARGET_PERFORMANCE_KEY !== "undefined") {
            performanceKey = MERCHANT_TRIO_TARGET_PERFORMANCE_KEY;
        }
        if (!observationsKey && firstMember && typeof alStorageKey === "function") {
            observationsKey = alStorageKey(firstMember, "Combat", "monsterObservations", "droid_monster_observations_v1");
        }
    } catch (_) { }
    if (!performance && performanceKey) performance = caracalRead(performanceKey, null);
    if (!observations && observationsKey) observations = caracalRead(observationsKey, null);
    return {
        available: !!(performance || observations),
        scores: performance && typeof performance === "object" ? performance : {},
        observations: observations && typeof observations === "object" ? observations : {},
        performanceKey: performanceKey,
        observationsKey: observationsKey
    };
}

function caracalExistingMetrics(name) {
    var key = null;
    try { if (typeof merchantTrioMetricsDataKey === "function") key = merchantTrioMetricsDataKey(name); } catch (_) { }
    if (!key) key = caracalToken(name) + ".Trio.metricsData";
    var data = caracalRead(key, null);
    return { key: key, data: data && typeof data === "object" ? data : null };
}

function caracalCurrentMetrics(name) {
    if (name === caracalCharacterName()) {
        try {
            if (typeof trioStatsSnapshot === "function") return { key: caracalExistingMetrics(name).key, data: trioStatsSnapshot() };
        } catch (_) { }
    }
    return caracalExistingMetrics(name);
}

function caracalInventoryResponse(name) {
    var key = null;
    try { if (typeof merchantTrioInventoryResponseKey === "function") key = merchantTrioInventoryResponseKey(name); } catch (_) { }
    var data = key ? caracalRead(key, null) : null;
    return { key: key, data: data && typeof data === "object" ? data : null };
}

function caracalDamageDps(metrics, at) {
    var result = {};
    var damage = metrics && metrics.damage && typeof metrics.damage === "object" ? metrics.damage : {};
    Object.keys(damage).forEach(function (name) {
        var entry = damage[name] || {};
        var total = (caracalFinite(entry.damage) || 0) + (caracalFinite(entry.damageReturn) || 0) + (caracalFinite(entry.reflect) || 0);
        var since = caracalFinite(entry.since);
        var elapsed = since !== null && at > since ? at - since : null;
        result[name] = elapsed && total >= 0 ? total * 1000 / elapsed : null;
    });
    return result;
}

function caracalSumMap(target, source) {
    if (!source || typeof source !== "object") return;
    Object.keys(source).forEach(function (key) {
        var value = caracalFinite(source[key]);
        if (value !== null) target[key] = (target[key] || 0) + value;
    });
}

function caracalSeriesMerge(first, second, at) {
    var points = [];
    [first, second].forEach(function (series) {
        if (!Array.isArray(series)) return;
        series.forEach(function (point) {
            if (!Array.isArray(point) || point.length < 2) return;
            var timestamp = caracalFinite(point[0]);
            var value = caracalFinite(point[1]);
            if (timestamp !== null && value !== null && timestamp >= at - CARACAL_HISTORY_MAX_AGE_MS) {
                points.push([timestamp, value]);
            }
        });
    });
    points.sort(function (a, b) { return a[0] - b[0]; });
    var unique = [];
    points.forEach(function (point) {
        var previous = unique[unique.length - 1];
        if (previous && previous[0] === point[0] && previous[1] === point[1]) return;
        unique.push(point);
    });
    return unique.slice(-CARACAL_HISTORY_MAX_SAMPLES);
}

function caracalHistory(previous, metrics, current, at) {
    var old = previous && previous.history ? previous.history : {};
    var existing = metrics && metrics.history ? metrics.history : {};
    var history = {
        gold: caracalSeriesMerge(old.gold, existing.gold, at),
        xp: caracalSeriesMerge(old.xp, existing.xp, at),
        kills: caracalSeriesMerge(old.kills, existing.kills, at),
        dps: caracalSeriesMerge(old.dps, null, at)
    };
    var lastSample = previous && caracalFinite(previous.historySampleAt);
    if (lastSample === null || at - lastSample >= CARACAL_HISTORY_SAMPLE_MS) {
        history.gold = caracalSeriesMerge(history.gold, [[at, current.goldEarned || 0]], at);
        history.xp = caracalSeriesMerge(history.xp, [[at, current.xpEarned || 0]], at);
        history.kills = caracalSeriesMerge(history.kills, [[at, current.kills || 0]], at);
        history.dps = caracalSeriesMerge(history.dps, [[at, current.dps || 0]], at);
        current.historySampleAt = at;
    } else {
        current.historySampleAt = lastSample;
    }
    return history;
}

function caracalMetricsRecord(name, dashboard) {
    var live = caracalCurrentMetrics(name);
    var metrics = live.data || {};
    var at = caracalTimestamp();
    var previous = caracalRead(caracalKey(name, "Metrics.v1"), null);
    var startedAt = caracalFinite(metrics.startedAt);
    if (startedAt === null) {
        try { startedAt = caracalFinite(typeof sessionStartedAt !== "undefined" ? sessionStartedAt : null); } catch (_) { }
    }
    if (startedAt === null) {
        try { startedAt = caracalFinite(typeof mrt !== "undefined" && mrt ? mrt.sessionStartedAt : null); } catch (_) { }
    }
    var elapsedMs = startedAt !== null && at >= startedAt ? at - startedAt : null;
    var goldEarned = caracalFinite(metrics.lootGold);
    var xpEarned = caracalFinite(metrics.xpGained);
    var kills = caracalFinite(metrics.kills);
    var dpsByCharacter = caracalDamageDps(metrics, at);
    var totalDps = 0;
    Object.keys(dpsByCharacter).forEach(function (id) { if (dpsByCharacter[id] !== null) totalDps += dpsByCharacter[id]; });
    var ownDps = dpsByCharacter[name];
    var maxXp = caracalFinite(dashboard && dashboard.maxXp);
    var xp = caracalFinite(dashboard && dashboard.xp);
    var remainingXp = maxXp !== null && xp !== null ? Math.max(0, maxXp - xp) : null;
    var xpPerHour = elapsedMs && xpEarned !== null ? xpEarned * 3600000 / elapsedMs : null;
    var xpPerMs = elapsedMs && xpEarned !== null && xpEarned > 0 ? xpEarned / elapsedMs : null;
    var record = {
        schema: "CaracAL.Metrics.v1",
        revision: CARACAL_PUBLISHER_VERSION,
        updatedAt: at,
        source: caracalSource(name, "FarmMetrics.6 / CaracALPublisher.98"),
        characterName: name,
        existingMetricsKey: live.key,
        startedAt: startedAt,
        elapsedMs: elapsedMs,
        goldEarned: goldEarned,
        xpEarned: xpEarned,
        kills: kills,
        goldPerHour: elapsedMs && goldEarned !== null ? goldEarned * 3600000 / elapsedMs : null,
        xpPerHour: xpPerHour,
        dps: ownDps !== undefined ? ownDps : (Object.keys(dpsByCharacter).length ? totalDps : null),
        ttluMs: xpPerMs && remainingXp !== null ? remainingXp / xpPerMs : null,
        dpsByCharacter: dpsByCharacter,
        killsByMonster: metrics.mobKills || {},
        itemTotals: metrics.itemCounts || {},
        largestGoldDrop: caracalFinite(metrics.largestGoldDrop),
        history: {},
        historySampleAt: null
    };
    record.history = caracalHistory(previous, metrics, record, at);
    return record;
}

function caracalDashboardRecord(metricsRecord) {
    var name = caracalCharacterName();
    var state = caracalState();
    var current = caracalCurrentServer();
    var home = caracalHomeServer();
    var roleName = caracalRole();
    var resource = caracalResource();
    var inventory = caracalInventory();
    var at = caracalTimestamp();
    var hp = caracalFinite(caracalField(state, ["hp"], null));
    var maxHp = caracalFinite(caracalField(state, ["max_hp", "maxHp"], null));
    var mp = caracalFinite(caracalField(state, ["mp"], null));
    var maxMp = caracalFinite(caracalField(state, ["max_mp", "maxMp"], null));
    var xp = caracalFinite(caracalField(state, ["xp"], null));
    var maxXp = caracalFinite(caracalField(state, ["max_xp", "maxXp"], null));
    var startedAt = caracalFinite(metricsRecord && metricsRecord.startedAt);
    var uptimeMs = startedAt !== null && at >= startedAt ? at - startedAt : null;
    var skin = caracalField(state, ["skin"], null);
    var ctype = caracalField(state, ["ctype"], roleName);
    var cx = caracalField(state, ["cx"], null);
    var alive = caracalField(state, ["rip"], null) !== true && (hp === null || hp > 0);
    var paused = caracalField(state, ["scriptPaused", "paused"], null);
    var statusText = caracalField(state, ["statusText", "phase"], null);
    if (statusText === null) statusText = !alive ? "Dead" : (paused === true ? "Paused" : "Active");
    var dashboard = {
        schema: "CaracAL.Dashboard.v1",
        revision: CARACAL_PUBLISHER_VERSION,
        updatedAt: at,
        source: caracalSource(name, "TrioTeamState.52 / MerchantEvents.16 / CaracALPublisher.98"),
        characterName: name,
        class: ctype,
        ctype: ctype,
        level: caracalFinite(caracalField(state, ["level"], null)),
        appearance: { skin: skin, ctype: ctype, cx: cx },
        skin: skin,
        cx: cx,
        hp: hp,
        maxHp: maxHp,
        mp: mp,
        maxMp: maxMp,
        xp: xp,
        maxXp: maxXp,
        xpPercent: maxXp !== null && maxXp > 0 && xp !== null ? xp * 100 / maxXp : null,
        resource: resource,
        cc: resource.value,
        maxCc: resource.max,
        currentServer: current,
        homeServer: home,
        map: caracalField(state, ["map"], null),
        instance: caracalField(state, ["instance", "in"], null),
        x: caracalFinite(caracalField(state, ["x"], null)),
        y: caracalFinite(caracalField(state, ["y"], null)),
        uptimeMs: uptimeMs,
        alive: alive,
        paused: paused,
        statusText: caracalText(statusText),
        pingMs: caracalFinite(caracalField(state, ["ping"], null)),
        target: caracalTarget(state),
        gold: caracalFinite(caracalField(state, ["gold"], null)),
        inventory: inventory,
        inventorySlots: inventory.slots,
        hpPotionCount: inventory.hpPotions,
        mpPotionCount: inventory.mpPotions,
        gearCount: inventory.gearCount,
        goldPerHour: metricsRecord ? metricsRecord.goldPerHour : null,
        xpPerHour: metricsRecord ? metricsRecord.xpPerHour : null,
        dps: metricsRecord ? metricsRecord.dps : null,
        ttluMs: metricsRecord ? metricsRecord.ttluMs : null,
        rates: {
            goldPerHour: metricsRecord ? metricsRecord.goldPerHour : null,
            xpPerHour: metricsRecord ? metricsRecord.xpPerHour : null,
            dps: metricsRecord ? metricsRecord.dps : null,
            ttluMs: metricsRecord ? metricsRecord.ttluMs : null
        },
        modifiers: caracalModifiers(),
        effects: caracalEffects(),
        monsterTracker: caracalMonsterTracker()
    };
    return dashboard;
}

function caracalTeamNames() {
    try {
        if (Array.isArray(MERCHANT_TEAM)) return MERCHANT_TEAM.slice();
    } catch (_) { }
    try {
        if (Array.isArray(TEAM)) return TEAM.slice();
    } catch (_) { }
    try {
        if (typeof CONFIG !== "undefined") return [CONFIG.warrior, CONFIG.priest, CONFIG.ranger];
    } catch (_) { }
    try {
        if (typeof MERCHANT_CONFIG !== "undefined") return [MERCHANT_CONFIG.warrior, MERCHANT_CONFIG.priest, MERCHANT_CONFIG.ranger];
    } catch (_) { }
    return [];
}

function caracalAggregateHistory(memberRecords) {
    var result = { gold: [], xp: [], dps: [], kills: [] };
    var names = Object.keys(memberRecords || {});
    var bySeries = function (seriesName) {
        var points = {};
        names.forEach(function (name) {
            var series = memberRecords[name] && memberRecords[name].history && memberRecords[name].history[seriesName];
            if (!Array.isArray(series)) return;
            series.forEach(function (point) {
                if (!Array.isArray(point) || point.length < 2) return;
                var at = caracalFinite(point[0]);
                var value = caracalFinite(point[1]);
                if (at !== null && value !== null) points[at] = (points[at] || 0) + value;
            });
        });
        return Object.keys(points).map(function (at) { return [Number(at), points[at]]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(-CARACAL_HISTORY_MAX_SAMPLES);
    };
    ["gold", "xp", "dps", "kills"].forEach(function (name) { result[name] = bySeries(name); });
    return result;
}

function caracalPontyExchange() {
    var key = null;
    try { if (typeof MERCHANT_PONTY_LOG_KEY !== "undefined") key = MERCHANT_PONTY_LOG_KEY; } catch (_) { }
    if (!key) {
        try { if (typeof MERCHANT_CONFIG !== "undefined") key = alStorageKey(MERCHANT_CONFIG.merchant, "MerchantPontyLog", "entries"); } catch (_) { }
    }
    var data = key ? caracalRead(key, null) : null;
    return {
        available: !!(data && Array.isArray(data.entries)),
        sourceKey: key,
        entries: data && Array.isArray(data.entries) ? data.entries.slice(-100) : []
    };
}

function caracalMerchantExchange() {
    var pending = null;
    var configuredItems = [];
    try {
        if (typeof nextExchange === "function") pending = nextExchange();
    } catch (_) { }
    try {
        if (typeof MERCHANT_CONFIG !== "undefined" && MERCHANT_CONFIG.production &&
            Array.isArray(MERCHANT_CONFIG.production.exchangeItems)) {
            configuredItems = MERCHANT_CONFIG.production.exchangeItems.slice();
        }
    } catch (_) { }
    return {
        ponty: caracalPontyExchange(),
        pending: pending,
        configuredItems: configuredItems
    };
}

function caracalTrioRecord() {
    var merchantName = null;
    try { merchantName = MERCHANT_CONFIG && MERCHANT_CONFIG.merchant; } catch (_) { }
    if (!merchantName || caracalCharacterName() !== merchantName) return null;
    var at = caracalTimestamp();
    var names = caracalTeamNames();
    var members = {};
    var metricsByName = {};
    var gold = 0;
    var xp = 0;
    var kills = 0;
    var dps = 0;
    var itemTotals = {};
    var killsByMonster = {};
    var dpsByCharacter = {};
    var startedAt = null;
    var inventoryResponses = {};
    names.forEach(function (name) {
        var dashboard = caracalRead(caracalKey(name, "Dashboard.v1"), null);
        var metrics = caracalRead(caracalKey(name, "Metrics.v1"), null);
        var inventoryResponse = caracalInventoryResponse(name);
        if (inventoryResponse.data) inventoryResponses[name] = { key: inventoryResponse.key, data: inventoryResponse.data };
        if (!metrics) metrics = caracalMetricsRecord(name, dashboard || {});
        if (dashboard || metrics) members[name] = { dashboard: dashboard, metrics: metrics };
        if (metrics) {
            metricsByName[name] = metrics;
            gold += caracalFinite(metrics.goldEarned) || 0;
            xp += caracalFinite(metrics.xpEarned) || 0;
            kills += caracalFinite(metrics.kills) || 0;
            dps += caracalFinite(metrics.dps) || 0;
            var memberStartedAt = caracalFinite(metrics.startedAt);
            if (memberStartedAt !== null && (startedAt === null || memberStartedAt < startedAt)) startedAt = memberStartedAt;
            caracalSumMap(itemTotals, metrics.itemTotals);
            caracalSumMap(killsByMonster, metrics.killsByMonster);
            if (metrics.dpsByCharacter) caracalSumMap(dpsByCharacter, metrics.dpsByCharacter);
        }
    });
    var histories = caracalAggregateHistory(metricsByName);
    var elapsedMs = startedAt !== null && at >= startedAt ? at - startedAt : null;
    return {
        schema: "CaracAL.TrioMetrics.v1",
        revision: CARACAL_PUBLISHER_VERSION,
        updatedAt: at,
        source: caracalSource(merchantName, "MerchantTrioStats.42 / FarmMetrics.6 / CaracALPublisher.98"),
        merchantName: merchantName,
        startedAt: startedAt,
        elapsedMs: elapsedMs,
        members: members,
        inventoryResponses: inventoryResponses,
        goldEarned: gold,
        xpEarned: xp,
        kills: kills,
        dps: dps,
        goldPerHour: elapsedMs ? gold * 3600000 / elapsedMs : null,
        xpPerHour: elapsedMs ? xp * 3600000 / elapsedMs : null,
        dpsByCharacter: dpsByCharacter,
        killsByMonster: killsByMonster,
        loot: { gold: gold, itemTotals: itemTotals },
        history: histories,
        monsterTracker: caracalMonsterTracker(),
        merchantExchange: caracalMerchantExchange()
    };
}

function caracalMonthlyGold(history, monthStart, currentAt) {
    var series = history && Array.isArray(history.gold) ? history.gold : [];
    var before = null;
    var latest = null;
    series.forEach(function (point) {
        if (!Array.isArray(point) || point.length < 2) return;
        var at = caracalFinite(point[0]);
        var value = caracalFinite(point[1]);
        if (at === null || value === null) return;
        if (at < monthStart) before = value;
        if (at >= monthStart && at <= currentAt) latest = value;
    });
    return before !== null && latest !== null ? Math.max(0, latest - before) : null;
}

function caracalLootRecord(trio) {
    var name = caracalCharacterName();
    var at = caracalTimestamp();
    var previous = caracalRead(caracalKey(null, "Loot.v1"), null);
    if (previous === null) previous = caracalRead(caracalKey(name, "Loot.v1"), null);
    var monthDate = new Date(at);
    var monthNumber = monthDate.getUTCMonth() + 1;
    var month = monthDate.getUTCFullYear() + "-" + (monthNumber < 10 ? "0" : "") + monthNumber;
    var monthStart = Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1);
    var monthlyGold = caracalMonthlyGold(trio && trio.history, monthStart, at);
    var previousMonthly = previous && previous.monthly && previous.monthly.month === month ? previous.monthly : null;
    return {
        schema: "CaracAL.Loot.v1",
        revision: CARACAL_PUBLISHER_VERSION,
        updatedAt: at,
        source: caracalSource(name, "FarmMetrics.6 / MerchantTrioStats.42 / CaracALPublisher.98"),
        totals: {
            gold: trio ? trio.loot.gold : 0,
            items: trio ? trio.loot.itemTotals : {}
        },
        monthly: {
            month: month,
            gold: monthlyGold !== null ? monthlyGold : (previousMonthly ? previousMonthly.gold : null),
            items: previousMonthly ? previousMonthly.items : null,
            itemsAvailable: false,
            unavailableReason: "Existing FarmMetrics publishes cumulative item totals without timestamped item history."
        },
        history: trio ? trio.history : { gold: [], xp: [], dps: [], kills: [] },
        merchantExchange: trio ? trio.merchantExchange : caracalMerchantExchange()
    };
}

// ======== CaracAL+ v2 records =================================================
// The v2 bank record is the sole published bank surface.  The raw
// MerchantBankUI.BankSnapshot.v1 record remains an internal fallback for
// merchant modules and is not duplicated into a second CaracAL bank schema.

function caracalV2Key(characterName, recordName) {
    return caracalKey(characterName, recordName);
}

function caracalWriteSharedRecord(recordName, record) {
    var sharedKey = caracalKey(null, recordName);
    var wrote = caracalWrite(sharedKey, record);
    var shared = caracalRead(sharedKey, null);
    if ((wrote || shared !== null) && typeof alStorageRemove === "function") {
        try { alStorageRemove(caracalKey("TheDroidMCH", recordName)); } catch (_) { }
    }
    return wrote;
}

function caracalWriteSharedBankV2(record) {
    return caracalWriteSharedRecord("Bank.v2", record);
}

function caracalWriteSharedMerchantRecord(recordName, record) {
    return caracalWriteSharedRecord(recordName, record);
}

// A source can return a well-shaped object while it is reconnecting. Treat
// those empty reads like unavailable data so the dashboard can keep showing
// the last sanitized snapshot until the source has real content again.
function caracalRecordHasValue(value) {
    return value !== undefined && value !== null;
}

function caracalRecordHasEntries(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return caracalRecordHasValue(value);
}

function caracalRecordHasData(record) {
    if (!record || typeof record !== "object") return false;
    if (record.available === false) return false;
    var schema = record.schema || "";
    if (schema === "CaracAL.Dashboard.v1") {
        return !!record.characterName && (caracalRecordHasValue(record.hp) || caracalRecordHasValue(record.mp) ||
            caracalRecordHasValue(record.xp) || caracalRecordHasValue(record.map));
    }
    if (schema === "CaracAL.Dashboard.v2") {
        var vitals = record.vitals || {};
        var location = record.location || {};
        return !!record.characterName && (caracalRecordHasValue(vitals.hp) || caracalRecordHasValue(vitals.mp) ||
            caracalRecordHasValue(vitals.xp) || caracalRecordHasValue(location.map) || record.status &&
            (caracalRecordHasValue(record.status.text) || caracalRecordHasValue(record.status.phase)));
    }
    if (schema === "CaracAL.Metrics.v1" || schema === "CaracAL.Metrics.v2") {
        return record.goldEarned !== null || record.xpEarned !== null ||
            record.kills !== null || record.dps !== null ||
            (record.history && Object.keys(record.history).some(function (key) {
                return Array.isArray(record.history[key]) && record.history[key].length > 0;
            })) || (record.itemTotals && Object.keys(record.itemTotals).length > 0);
    }
    if (schema === "CaracAL.Loot.v1" || schema === "CaracAL.Loot.v2") {
        var totals = record.totals || {};
        return (totals.items && Object.keys(totals.items).length > 0) ||
            (Array.isArray(record.events) && record.events.length > 0) ||
            (record.history && Object.keys(record.history).some(function (key) {
                return Array.isArray(record.history[key]) && record.history[key].length > 0;
            }));
    }
    if (schema === "CaracAL.Bank.v2") {
        return record.available === true && Array.isArray(record.tabs) && record.tabs.length > 0;
    }
    if (schema === "CaracAL.Tracktrix.v1") {
        return record.available === true && (caracalRecordHasEntries(record.monsters) ||
            record.metadata && (caracalRecordHasEntries(record.metadata.max) || caracalRecordHasEntries(record.metadata.maps) ||
                caracalRecordHasEntries(record.metadata.tables)));
    }
    if (schema === "CaracAL.Exchange.v1") {
        return record.available === true && ((record.exchanges && record.exchanges.length > 0) ||
            (record.totals && Object.keys(record.totals).length > 0));
    }
    if (schema === "CaracAL.TracktrixSnapshot.v1") {
        return !!(record.tracktrix && record.exchange &&
            caracalRecordHasData(record.tracktrix) && caracalRecordHasData(record.exchange));
    }
    if (schema === "CaracAL.Activity.v1") return Array.isArray(record.events) && record.events.length > 0;
    return !record.unavailableReason;
}

// A character can publish a short-lived unavailable snapshot while its game
// frame is reconnecting or still rebuilding state after a restart. Do not let
// that transient gap erase the last useful account-wide record.
function caracalRetainAvailableSharedRecord(recordName, current) {
    if (caracalRecordHasData(current)) return current;
    var previous = caracalRead(caracalKey(null, recordName), null);
    if (caracalRecordHasData(previous)) return previous;
    return current;
}

// Keep a first unavailable snapshot for the dashboard, but never replace a
// previously useful snapshot with an empty transient read.
function caracalPublishIfValid(key, record, force) {
    if (record && (force || caracalRecordHasData(record))) {
        return caracalWrite(key, record);
    }

    var previous = caracalRead(key, null);
    if (caracalRecordHasData(previous)) return false;

    return caracalWrite(key, record);
}

function caracalV2Server() {
    var current = caracalCurrentServer();
    var name = null;
    try { name = typeof server !== "undefined" && server ? server.name : null; } catch (_) { }
    return { region: current.region, id: current.id, name: caracalText(name) };
}

function caracalV2ServerKey(serverValue) {
    if (!serverValue || serverValue.region === null || serverValue.id === null) return null;
    return String(serverValue.region) + ":" + String(serverValue.id);
}

function caracalV2SessionInfo(name) {
    var startedAt = null;
    var serverValue = name === caracalCharacterName() ? caracalV2Server() : null;
    if (name === caracalCharacterName()) {
        try { startedAt = caracalFinite(typeof sessionStartedAt !== "undefined" ? sessionStartedAt : null); } catch (_) { }
        if (startedAt === null) {
            try { startedAt = caracalFinite(typeof mrt !== "undefined" && mrt ? mrt.sessionStartedAt : null); } catch (_) { }
        }
        if (startedAt === null) {
            try { startedAt = caracalFinite(trioStats && trioStats.startedAt); } catch (_) { }
        }
        if (serverValue && serverValue.region === null && serverValue.id === null) serverValue = null;
    } else {
        var dashboard = caracalRead(caracalV2Key(name, "Dashboard.v2"), null);
        var metrics = caracalRead(caracalV2Key(name, "Metrics.v2"), null);
        startedAt = caracalFinite(dashboard && dashboard.sessionStartedAt);
        if (startedAt === null) startedAt = caracalFinite(metrics && metrics.sessionStartedAt);
        if (dashboard && dashboard.identity && dashboard.identity.server) serverValue = dashboard.identity.server;
    }
    var sessionId = null;
    if (startedAt !== null) {
        sessionId = String(name || "Unknown") + "|" + String(startedAt) + "|" +
            (serverValue ? String(serverValue.region) : "unknown") + "|" +
            (serverValue ? String(serverValue.id) : "unknown");
    }
    return { sessionId: sessionId, sessionStartedAt: startedAt, server: serverValue };
}

function caracalV2MerchantGoldBanked(name) {
    if (name !== "TheDroidMCH") return null;
    try {
        return caracalFinite(typeof mrt !== "undefined" && mrt ? mrt.sessionGoldBanked : null);
    } catch (_) { return null; }
}

function caracalV2SessionGold(lootGold, goldBanked) {
    if (lootGold === null && goldBanked === null) return null;
    return (lootGold || 0) + (goldBanked || 0);
}

function caracalV2StaticSkin(item) {
    if (!item || !item.name) return null;
    try {
        if (item.skin !== undefined && item.skin !== null) return caracalText(item.skin);
        if (item.s !== undefined && item.s !== null && typeof item.s === "string") return item.s;
        if (typeof G !== "undefined" && G.items && G.items[item.name]) return caracalText(G.items[item.name].skin);
    } catch (_) { }
    return null;
}

function caracalV2Item(item, slot) {
    if (!item || typeof item !== "object") return null;
    var quantity = caracalFinite(item.q !== undefined ? item.q : item.quantity);
    var level = caracalFinite(item.level);
    var price = caracalFinite(item.price !== undefined ? item.price : item.p);
    var locked = item.locked !== undefined ? !!item.locked :
        (item.l !== undefined ? !!item.l : null);
    var bound = item.bound !== undefined ? !!item.bound :
        (item.b !== undefined ? !!item.b : null);
    var metadata = {};
    var excluded = { slot: true, name: true, skin: true, s: true, quantity: true, q: true,
        level: true, locked: true, l: true, bound: true, b: true, price: true, p: true };
    Object.keys(item).forEach(function (key) {
        if (excluded[key]) return;
        var safe = caracalSafe(item[key], 0, []);
        if (safe !== null || item[key] === null) metadata[key] = safe;
    });
    return {
        slot: slot === undefined ? null : slot,
        name: caracalText(item.name),
        skin: caracalV2StaticSkin(item),
        quantity: quantity,
        q: quantity,
        level: level,
        locked: locked,
        bound: bound,
        price: price,
        metadata: metadata
    };
}

function caracalV2PublicItem(item) {
    var normalized = caracalV2Item(item, null);
    if (!normalized) return null;
    return { name: normalized.name, skin: normalized.skin, quantity: normalized.quantity,
        q: normalized.q, level: normalized.level };
}

function caracalV2MailAttachment(item) {
    var normalized = caracalV2Item(item, null);
    if (!normalized) return null;
    return { name: normalized.name, skin: normalized.skin, quantity: normalized.quantity,
        q: normalized.q, level: normalized.level, metadata: normalized.metadata };
}

function caracalV2Inventory() {
    var items = null;
    try { items = Array.isArray(character.items) ? character.items : null; } catch (_) { }
    if (!items) {
        return { used: null, capacity: null, free: null, slots: [],
            unavailableReason: "Adventure Land character.items is unavailable in this client revision." };
    }
    var slots = items.map(function (item, slot) { return item ? caracalV2Item(item, slot) : null; });
    var used = slots.reduce(function (count, item) { return count + (item ? 1 : 0); }, 0);
    var free = null;
    try { free = caracalFinite(character.esize); } catch (_) { }
    return { used: used, capacity: slots.length, free: free, slots: slots };
}

function caracalV2Equipment() {
    var names = ["helmet", "chest", "pants", "shoes", "gloves", "mainhand", "offhand",
        "amulet", "ring1", "ring2", "belt", "earring1", "earring2", "cape", "orb", "elixir"];
    var slots = {};
    names.forEach(function (name) {
        var item = null;
        try { item = character && character.slots ? character.slots[name] : null; } catch (_) { }
        slots[name] = item ? caracalV2Item(item, null) : null;
    });
    return slots;
}

function caracalV2Nearby() {
    var entities = null;
    try { entities = typeof parent !== "undefined" && parent && parent.entities ? parent.entities : null; } catch (_) { }
    if (!entities || typeof entities !== "object") {
        return { monsters: [], players: [], unavailableReason: "parent.entities is unavailable in this client revision." };
    }
    var result = { monsters: [], players: [] };
    Object.keys(entities).forEach(function (id) {
        var entity = entities[id];
        if (!entity || typeof entity !== "object") return;
        var type = entity.type || (entity.mtype ? "monster" : null);
        if (type !== "monster" && type !== "character") return;
        var x = caracalFinite(entity.real_x !== undefined ? entity.real_x : entity.x);
        var y = caracalFinite(entity.real_y !== undefined ? entity.real_y : entity.y);
        var record = {
            id: entity.id !== undefined ? String(entity.id) : String(id),
            name: caracalText(entity.name || entity.mtype),
            type: caracalText(entity.mtype || entity.type),
            level: caracalFinite(entity.level),
            hp: caracalFinite(entity.hp),
            maxHp: caracalFinite(entity.max_hp !== undefined ? entity.max_hp : entity.maxHp),
            alive: entity.dead === undefined && entity.rip === undefined ? null :
                !(entity.dead || entity.rip),
            map: caracalText(entity.map),
            x: x,
            y: y,
            skin: caracalText(entity.skin),
            ctype: caracalText(entity.ctype)
        };
        if (type === "monster") result.monsters.push(record);
        else result.players.push(record);
    });
    return result;
}

function caracalV2Effects() {
    var statuses = null;
    try { statuses = character && character.s; } catch (_) { }
    if (!statuses || typeof statuses !== "object") return [];
    var at = caracalTimestamp();
    return Object.keys(statuses).map(function (name) {
        var effect = statuses[name];
        if (!effect || typeof effect !== "object") return null;
        var expiresAt = caracalFinite(effect.expiresAt !== undefined ? effect.expiresAt : effect.expires);
        var remainingMs = caracalFinite(effect.remainingMs !== undefined ? effect.remainingMs : effect.ms);
        if (expiresAt !== null) remainingMs = Math.max(0, expiresAt - at);
        if (expiresAt === null && remainingMs !== null) expiresAt = at + remainingMs;
        var stacks = caracalFinite(effect.stacks !== undefined ? effect.stacks :
            (effect.stack !== undefined ? effect.stack : effect.count));
        return { name: name, skin: caracalText(effect.skin), stacks: stacks,
            remainingMs: remainingMs, expiresAt: expiresAt };
    }).filter(function (effect) { return !!effect; });
}

function caracalV2Target(state) {
    var target = null;
    try { if (typeof get_targeted_monster === "function") target = get_targeted_monster(); } catch (_) { }
    if (!target) {
        try {
            if (character && character.target && typeof get_entity === "function") target = get_entity(character.target);
        } catch (_) { }
    }
    var targetId = target && (target.id !== undefined ? target.id : target.eid);
    if (targetId === undefined || targetId === null) targetId = state && state.targetId;
    var targetType = target && (target.mtype || target.type);
    if (!targetType) targetType = state && state.targetType;
    var targetName = target && (target.name || targetType);
    if (!targetName) targetName = state && state.targetName;
    var targetAlive = target ? !(target.dead || target.rip) :
        (state && state.targetLive !== undefined && state.targetLive !== null ? !!state.targetLive : null);
    return {
        name: caracalText(targetName),
        type: caracalText(targetType),
        id: targetId === undefined || targetId === null ? null : String(targetId),
        level: caracalFinite(target && target.level !== undefined ? target.level : state && state.targetLevel),
        map: caracalText(target && target.map !== undefined ? target.map : state && state.targetMap),
        x: caracalFinite(target && (target.real_x !== undefined ? target.real_x : target.x)),
        y: caracalFinite(target && (target.real_y !== undefined ? target.real_y : target.y)),
        alive: targetAlive
    };
}

function caracalV2Party(state) {
    var members = null;
    var sourceAvailable = false;
    try {
        if (typeof get_party === "function") {
            var party = get_party();
            if (party && typeof party === "object") {
                members = Object.keys(party);
                sourceAvailable = true;
            }
        }
    } catch (_) { }
    var inParty = null;
    try {
        if (character && character.party) inParty = true;
        else if (sourceAvailable) inParty = members.indexOf(character.name) !== -1;
    } catch (_) { }
    return { inParty: inParty, partyLeader: caracalText(state && state.partyLeader), members: members };
}

function caracalV2Connection(state, uptimeMs) {
    var connected = null;
    try {
        if (typeof parent !== "undefined" && parent && parent.socket && parent.socket.connected !== undefined) {
            connected = !!parent.socket.connected;
        }
    } catch (_) { }
    return {
        pingMs: caracalFinite(caracalField(state, ["ping"], null)),
        uptimeMs: uptimeMs,
        serverConnected: connected
    };
}

function caracalV2Status(state) {
    var paused = caracalField(state, ["scriptPaused", "paused"], null);
    var phase = caracalField(state, ["phase"], null);
    var currentAction = caracalField(state, ["currentAction", "currentStep"], null);
    try {
        if (typeof mrt !== "undefined" && mrt) {
            if (phase === null) phase = mrt.phase;
            if (currentAction === null) currentAction = mrt.currentStep || mrt.action;
            if (paused === null && mrt.cancelRequested !== undefined) paused = !!mrt.cancelRequested;
        }
    } catch (_) { }
    var text = caracalField(state, ["statusText", "text"], null);
    if (text === null) text = currentAction || phase;
    if (text === null && paused === true) text = "Paused";
    return { text: caracalText(text), phase: caracalText(phase), paused: paused,
        currentAction: caracalText(currentAction) };
}

function caracalV2DashboardRecord(metricsRecord) {
    var name = caracalCharacterName();
    var state = caracalState();
    var session = caracalV2SessionInfo(name);
    var at = caracalTimestamp();
    var roleName = caracalRole();
    var resource = caracalResource();
    var hp = caracalFinite(caracalField(state, ["hp"], null));
    var maxHp = caracalFinite(caracalField(state, ["max_hp", "maxHp"], null));
    var mp = caracalFinite(caracalField(state, ["mp"], null));
    var maxMp = caracalFinite(caracalField(state, ["max_mp", "maxMp"], null));
    var xp = caracalFinite(caracalField(state, ["xp"], null));
    var maxXp = caracalFinite(caracalField(state, ["max_xp", "maxXp"], null));
    var rip = caracalField(state, ["rip"], null);
    var alive = rip === null ? (hp === null ? null : hp > 0) : (!rip && (hp === null || hp > 0));
    var paused = caracalField(state, ["scriptPaused", "paused"], null);
    var uptimeMs = session.sessionStartedAt !== null && at >= session.sessionStartedAt ?
        at - session.sessionStartedAt : null;
    var skin = caracalField(state, ["skin"], null);
    var tskin = caracalField(state, ["tskin"], null);
    var ctype = caracalField(state, ["ctype"], roleName);
    var cx = caracalField(state, ["cx"], null);
    var tcx = caracalField(state, ["tcx"], null);
    var status = caracalV2Status(state);
    if (status.text === null) status.text = alive === false ? "Dead" : (paused === true ? "Paused" : null);
    var inventory = caracalV2Inventory();
    var party = caracalV2Party(state);
    var gold = caracalFinite(caracalField(state, ["gold"], null));
    var dashboard = {
        schema: "CaracAL.Dashboard.v2",
        version: CARACAL_PLUS_SCHEMA_VERSION,
        characterName: name,
        updatedAt: at,
        sessionId: session.sessionId,
        sessionStartedAt: session.sessionStartedAt,
        lastSeenAt: at,
        source: caracalSource(name, "TrioTeamState.52 / MerchantEvents.16 / Shared.1 / CaracALPublisher.98"),
        identity: {
            name: caracalText(caracalField(state, ["name"], name)),
            class: caracalText(ctype),
            ctype: caracalText(ctype),
            level: caracalFinite(caracalField(state, ["level"], null)),
            server: session.server || { region: null, id: null, name: null }
        },
        appearance: { skin: caracalText(skin), tskin: caracalText(tskin), ctype: caracalText(ctype),
            cx: caracalSafe(cx, 0, []), tcx: caracalSafe(tcx, 0, []) },
        location: {
            map: caracalText(caracalField(state, ["map"], null)),
            instance: caracalText(caracalField(state, ["instance", "in"], null)),
            x: caracalFinite(caracalField(state, ["x"], null)),
            y: caracalFinite(caracalField(state, ["y"], null))
        },
        alive: alive,
        rip: rip === null ? null : !!rip,
        vitals: {
            hp: hp, maxHp: maxHp, mp: mp, maxMp: maxMp, xp: xp, maxXp: maxXp,
            xpPercent: maxXp !== null && maxXp > 0 && xp !== null ? xp * 100 / maxXp : null,
            cc: resource.value, maxCc: resource.max, resourceName: caracalText(resource.name)
        },
        economy: {
            gold: gold,
            goldPerHour: metricsRecord ? caracalFinite(metricsRecord.goldPerHour) : null
        },
        party: party,
        connection: caracalV2Connection(state, uptimeMs),
        status: status,
        modifiers: caracalModifiers(),
        target: caracalV2Target(state),
        effects: caracalV2Effects(),
        inventory: inventory,
        equipment: caracalV2Equipment(),
        nearby: caracalV2Nearby()
    };
    if (inventory.unavailableReason) dashboard.unavailableReason = inventory.unavailableReason;
    return dashboard;
}

function caracalV2SeriesMerge(first, second, at) {
    var points = [];
    [first, second].forEach(function (series) {
        if (!Array.isArray(series)) return;
        series.forEach(function (point) {
            var timestamp = null, value = null;
            if (Array.isArray(point)) {
                timestamp = caracalFinite(point[0]); value = caracalFinite(point[1]);
            } else if (point && typeof point === "object") {
                timestamp = caracalFinite(point.at); value = caracalFinite(point.value);
            }
            if (timestamp !== null && value !== null && timestamp >= at - CARACAL_HISTORY_MAX_AGE_MS) {
                points.push({ at: timestamp, value: value });
            }
        });
    });
    points.sort(function (a, b) { return a.at - b.at; });
    var unique = [];
    points.forEach(function (point) {
        var previous = unique[unique.length - 1];
        if (previous && previous.at === point.at && previous.value === point.value) return;
        unique.push(point);
    });
    return unique.slice(-CARACAL_EVENT_MAX_SAMPLES);
}

function caracalV2ItemEventKey(event) {
    return [event.at, event.characterName, event.item, event.quantity, event.source, event.monster || ""].join("|");
}

function caracalV2MergeItemEvents(first, second, at) {
    var events = [];
    var seen = {};
    [first, second].forEach(function (source) {
        if (!Array.isArray(source)) return;
        source.forEach(function (event) {
            if (!event || typeof event !== "object") return;
            var normalized = {
                at: caracalFinite(event.at),
                item: caracalText(event.item),
                quantity: caracalFinite(event.quantity),
                source: caracalText(event.source),
                characterName: caracalText(event.characterName),
                monster: caracalText(event.monster)
            };
            if (normalized.at === null || normalized.item === null || normalized.quantity === null ||
                normalized.at < at - CARACAL_HISTORY_MAX_AGE_MS) return;
            var key = caracalV2ItemEventKey(normalized);
            if (seen[key]) return;
            seen[key] = true;
            events.push(normalized);
        });
    });
    events.sort(function (a, b) { return a.at - b.at; });
    return events.slice(-CARACAL_EVENT_MAX_SAMPLES);
}

function caracalInstallLootCapture() {
    if (CARACAL_LOOT_CAPTURE_INSTALLED) return true;
    var name = caracalCharacterName();
    if (!name) return false;
    var handler = function (data) {
        try {
            if (!data) return;
            if (!CARACAL_PENDING_LOOT_EVENTS[name]) CARACAL_PENDING_LOOT_EVENTS[name] = [];
            var at = caracalFinite(data.at !== undefined ? data.at : data.time);
            if (at === null) at = caracalTimestamp();
            var monster = data.mtype || data.monster || data.monsterType || null;
            (Array.isArray(data.items) ? data.items : []).forEach(function (item) {
                if (!item || !item.name || (item.looter && item.looter !== name)) return;
                CARACAL_PENDING_LOOT_EVENTS[name].push({
                    at: at,
                    item: String(item.name),
                    quantity: caracalFinite(item.q !== undefined ? item.q : item.quantity) || 1,
                    source: "FarmMetrics.6 loot event",
                    characterName: name,
                    monster: caracalText(monster)
                });
            });
            CARACAL_PENDING_LOOT_EVENTS[name] = CARACAL_PENDING_LOOT_EVENTS[name].slice(-CARACAL_EVENT_MAX_SAMPLES);
        } catch (_) { }
    };
    try {
        if (typeof trioOn === "function") {
            trioOn("loot", handler);
            CARACAL_LOOT_CAPTURE_INSTALLED = true;
            return true;
        }
        if (typeof character !== "undefined" && character && typeof character.on === "function") {
            character.on("loot", handler);
            CARACAL_LOOT_CAPTURE_INSTALLED = true;
            return true;
        }
    } catch (_) { }
    return false;
}

function caracalV2MetricsRecord(name, dashboard) {
    var live = caracalCurrentMetrics(name);
    var metrics = live.data && typeof live.data === "object" ? live.data : null;
    var previous = caracalRead(caracalV2Key(name, "Metrics.v2"), null);
    var at = caracalTimestamp();
    var session = caracalV2SessionInfo(name);
    var startedAt = session.sessionStartedAt;
    var elapsedMs = startedAt !== null && at >= startedAt ? at - startedAt : null;
    var xpEarned = metrics ? caracalFinite(metrics.xpGained) : null;
    var lootGold = metrics ? caracalFinite(metrics.lootGold) : null;
    var goldBanked = caracalV2MerchantGoldBanked(name);
    var goldEarned = lootGold;
    var sessionGold = caracalV2SessionGold(lootGold, goldBanked);
    var kills = metrics ? caracalFinite(metrics.kills) : null;
    var dpsByCharacter = metrics ? caracalDamageDps(metrics, at) : {};
    var totalDps = 0;
    Object.keys(dpsByCharacter).forEach(function (id) { if (dpsByCharacter[id] !== null) totalDps += dpsByCharacter[id]; });
    var ownDps = dpsByCharacter[name];
    var maxXp = dashboard && dashboard.vitals ? caracalFinite(dashboard.vitals.maxXp) : null;
    var xp = dashboard && dashboard.vitals ? caracalFinite(dashboard.vitals.xp) : null;
    var remainingXp = maxXp !== null && xp !== null ? Math.max(0, maxXp - xp) : null;
    var xpPerHour = elapsedMs && xpEarned !== null ? xpEarned * 3600000 / elapsedMs : null;
    var xpPerMs = elapsedMs && xpEarned !== null && xpEarned > 0 ? xpEarned / elapsedMs : null;
    var oldHistory = previous && previous.history ? previous.history : {};
    var sourceHistory = metrics && metrics.history ? metrics.history : {};
    var history = {
        xp: caracalV2SeriesMerge(oldHistory.xp, sourceHistory.xp, at),
        gold: caracalV2SeriesMerge(oldHistory.gold, sourceHistory.gold, at),
        sessionGold: caracalV2SeriesMerge(oldHistory.sessionGold, sourceHistory.sessionGold, at),
        dps: caracalV2SeriesMerge(oldHistory.dps, null, at),
        kills: caracalV2SeriesMerge(oldHistory.kills, sourceHistory.kills, at),
        items: caracalV2MergeItemEvents(oldHistory.items, CARACAL_PENDING_LOOT_EVENTS[name], at)
    };
    var lastSampleAt = previous ? caracalFinite(previous.historySampleAt) : null;
    if (metrics && (lastSampleAt === null || at - lastSampleAt >= CARACAL_HISTORY_SAMPLE_MS)) {
        if (xpEarned !== null) history.xp = caracalV2SeriesMerge(history.xp, [{ at: at, value: xpEarned }], at);
        if (goldEarned !== null) history.gold = caracalV2SeriesMerge(history.gold, [{ at: at, value: goldEarned }], at);
        if (sessionGold !== null) history.sessionGold = caracalV2SeriesMerge(history.sessionGold, [{ at: at, value: sessionGold }], at);
        if (kills !== null) history.kills = caracalV2SeriesMerge(history.kills, [{ at: at, value: kills }], at);
        if (ownDps !== undefined && ownDps !== null) history.dps = caracalV2SeriesMerge(history.dps, [{ at: at, value: ownDps }], at);
        lastSampleAt = at;
    }
    return {
        schema: "CaracAL.Metrics.v2",
        version: CARACAL_PLUS_SCHEMA_VERSION,
        characterName: name,
        sessionId: session.sessionId,
        sessionStartedAt: session.sessionStartedAt,
        updatedAt: at,
        source: caracalSource(name, "FarmMetrics.6 / TrioTeamState.52 / CaracALPublisher.98"),
        xpEarned: xpEarned,
        xpPerHour: xpPerHour,
        lootGold: lootGold,
        goldBanked: goldBanked,
        sessionGold: sessionGold,
        goldEarned: goldEarned,
        goldPerHour: elapsedMs && goldEarned !== null ? goldEarned * 3600000 / elapsedMs : null,
        sessionGoldPerHour: elapsedMs && sessionGold !== null ? sessionGold * 3600000 / elapsedMs : null,
        dps: ownDps !== undefined ? ownDps : (Object.keys(dpsByCharacter).length ? totalDps : null),
        kills: kills,
        killsByMonster: metrics ? caracalSafe(metrics.mobKills || {}, 0, []) : null,
        damage: metrics && metrics.damage && metrics.damage[name] ? caracalFinite(metrics.damage[name].damage) : null,
        itemTotals: metrics ? caracalSafe(metrics.itemCounts || {}, 0, []) : null,
        history: history,
        historySampleAt: lastSampleAt,
        unavailableReason: metrics ? (history.items.length ? null :
            "No timestamped loot item events have been observed yet.") :
            "FarmMetrics.6 has not published a metrics snapshot for this character."
    };
}

function caracalV2ActivityRecord(name) {
    var key = null;
    try {
        if (name === "TheDroidMCH") key = typeof MERCHANT_ACTIVITY_KEY !== "undefined" ? MERCHANT_ACTIVITY_KEY :
            alStorageKey(name, "MerchantActivityLog", "entries");
        else key = alStorageKey(name, "TrioBase", "activityLog");
    } catch (_) { }
    var saved = key ? caracalRead(key, null) : null;
    var source = Array.isArray(saved) ? saved : (saved && Array.isArray(saved.entries) ? saved.entries : []);
    var events = source.filter(function (entry) { return entry && typeof entry === "object"; }).slice(-CARACAL_ACTIVITY_MAX_EVENTS)
        .map(function (entry) {
            var message = caracalText(entry.message || entry.text);
            var outcomeMatch = message && /^\[(bank|loot|courier|craft|upgrade)\]\[(success|error|no-op|warning)\]/.exec(message);
            var id = entry.id !== undefined && entry.id !== null ? String(entry.id) :
                String(entry.at || caracalTimestamp()) + ":" + String(entry.message || "");
            return {
                id: id,
                at: caracalFinite(entry.at),
                type: caracalText(entry.type || entry.category),
                message: message,
                job: outcomeMatch ? outcomeMatch[1] : null,
                outcome: outcomeMatch ? outcomeMatch[2] : null,
                level: caracalText(entry.level),
                map: caracalText(entry.map),
                x: caracalFinite(entry.x),
                y: caracalFinite(entry.y),
                target: caracalText(entry.target),
                details: caracalSafe(entry, 0, [])
            };
        });
    return {
        schema: "CaracAL.Activity.v1",
        version: 1,
        characterName: name,
        updatedAt: caracalTimestamp(),
        source: caracalSource(name, name === "TheDroidMCH" ? "MerchantCore.61 / MerchantEvents.16" : "TrioBase.47 / FarmMetrics.6"),
        events: events,
        unavailableReason: key && source.length ? null : "No existing action/state activity entries are available for this character."
    };
}

function caracalV2RecordServer(record) {
    return record && record.identity && record.identity.server ? record.identity.server : null;
}

function caracalV2AggregateSeries(memberRecords, seriesName, at) {
    var values = {};
    Object.keys(memberRecords || {}).forEach(function (name) {
        var member = memberRecords[name];
        if (!member || !member.included || !member.metrics || !member.metrics.history) return;
        var series = member.metrics.history[seriesName];
        if (!Array.isArray(series)) return;
        series.forEach(function (point) {
            var timestamp = caracalFinite(point && point.at);
            var value = caracalFinite(point && point.value);
            if (timestamp !== null && value !== null && timestamp >= at - CARACAL_HISTORY_MAX_AGE_MS) {
                values[timestamp] = (values[timestamp] || 0) + value;
            }
        });
    });
    return Object.keys(values).map(function (timestamp) {
        return { at: Number(timestamp), value: values[timestamp] };
    }).sort(function (a, b) { return a.at - b.at; }).slice(-CARACAL_EVENT_MAX_SAMPLES);
}

function caracalV2TrioRecord() {
    if (caracalCharacterName() !== "TheDroidMCH") return null;
    var at = caracalTimestamp();
    var session = caracalV2SessionInfo("TheDroidMCH");
    var merchantServerKey = caracalV2ServerKey(session.server);
    var members = {};
    var gold = 0, goldBanked = 0, xp = 0, kills = 0, dps = 0;
    var goldAvailable = false, goldBankedAvailable = false, xpAvailable = false, killsAvailable = false, dpsAvailable = false;
    var itemTotals = {};
    var killsByMonster = {};
    CARACAL_MEMBER_NAMES.forEach(function (name) {
        var dashboard = caracalRead(caracalV2Key(name, "Dashboard.v2"), null);
        var metrics = caracalRead(caracalV2Key(name, "Metrics.v2"), null);
        var updatedAt = caracalFinite(dashboard && dashboard.updatedAt);
        var fresh = updatedAt !== null && at - updatedAt <= CARACAL_RECORD_FRESH_MS;
        var memberServer = caracalV2RecordServer(dashboard);
        var memberServerKey = caracalV2ServerKey(memberServer);
        var sameServer = merchantServerKey === null || memberServerKey === merchantServerKey;
        var included = !!(dashboard && metrics && fresh && metrics.sessionId && sameServer);
        var reason = null;
        if (!dashboard || !metrics) reason = "The member has not published both v2 records.";
        else if (!fresh) reason = "The member dashboard record is stale.";
        else if (!sameServer) reason = "The member is on a different server; excluded to prevent cross-server aggregation.";
        else if (!metrics.sessionId) reason = "The member session identity is unavailable.";
        members[name] = { dashboard: dashboard, metrics: metrics, included: included, unavailableReason: reason };
        if (!included) return;
        var value = caracalFinite(metrics.goldEarned); if (value !== null) { gold += value; goldAvailable = true; }
        value = caracalFinite(metrics.goldBanked); if (value !== null) { goldBanked += value; goldBankedAvailable = true; }
        value = caracalFinite(metrics.xpEarned); if (value !== null) { xp += value; xpAvailable = true; }
        value = caracalFinite(metrics.kills); if (value !== null) { kills += value; killsAvailable = true; }
        value = caracalFinite(metrics.dps); if (value !== null) { dps += value; dpsAvailable = true; }
        caracalSumMap(killsByMonster, metrics.killsByMonster);
        caracalSumMap(itemTotals, metrics.itemTotals);
    });
    var histories = {
        xp: caracalV2AggregateSeries(members, "xp", at),
        gold: caracalV2AggregateSeries(members, "gold", at),
        dps: caracalV2AggregateSeries(members, "dps", at),
        kills: caracalV2AggregateSeries(members, "kills", at),
        items: []
    };
    Object.keys(members).forEach(function (name) {
        var member = members[name];
        if (!member.included || !member.metrics || !member.metrics.history) return;
        histories.items = caracalV2MergeItemEvents(histories.items, member.metrics.history.items, at);
    });
    var elapsedMs = session.sessionStartedAt !== null && at >= session.sessionStartedAt ? at - session.sessionStartedAt : null;
    var sessionGoldAvailable = goldAvailable || goldBankedAvailable;
    var sessionGold = sessionGoldAvailable ? gold + goldBanked : null;
    return {
        schema: "CaracAL.TrioMetrics.v2",
        version: CARACAL_PLUS_SCHEMA_VERSION,
        updatedAt: at,
        sessionId: session.sessionId,
        sessionStartedAt: session.sessionStartedAt,
        source: caracalSource("TheDroidMCH", "TrioTeamState.52 / MerchantTrioStats.42 / FarmMetrics.6 / CaracALPublisher.98"),
        members: members,
        onlineCount: Object.keys(members).filter(function (name) { return members[name].included; }).length,
        activeCount: Object.keys(members).filter(function (name) {
            var member = members[name], dashboard = member.dashboard;
            return member.included && dashboard && dashboard.alive !== false &&
                !(dashboard.status && dashboard.status.paused === true);
        }).length,
        xpEarned: xpAvailable ? xp : null,
        xpPerHour: xpAvailable && elapsedMs ? xp * 3600000 / elapsedMs : null,
        goldEarned: goldAvailable ? gold : null,
        goldPerHour: goldAvailable && elapsedMs ? gold * 3600000 / elapsedMs : null,
        goldBanked: goldBankedAvailable ? goldBanked : null,
        sessionGold: sessionGold,
        sessionGoldPerHour: sessionGoldAvailable && elapsedMs ? sessionGold * 3600000 / elapsedMs : null,
        kills: killsAvailable ? kills : null,
        killsByMonster: killsByMonster,
        dps: dpsAvailable ? dps : null,
        itemTotals: Object.keys(itemTotals).length ? itemTotals : null,
        history: histories,
        unavailableReason: Object.keys(members).some(function (name) { return members[name].included; }) ? null :
            "No fresh same-server member records are available for aggregation."
    };
}

function caracalV2MonthlyGold(history, monthStart, at) {
    var series = history && Array.isArray(history.gold) ? history.gold : [];
    var before = null, latest = null;
    series.forEach(function (point) {
        var timestamp = caracalFinite(point && point.at), value = caracalFinite(point && point.value);
        if (timestamp === null || value === null) return;
        if (timestamp < monthStart) before = value;
        if (timestamp >= monthStart && timestamp <= at) latest = value;
    });
    return before !== null && latest !== null ? Math.max(0, latest - before) : null;
}

function caracalV2LootRecord(trio) {
    var at = caracalTimestamp();
    var date = new Date(at);
    var monthNumber = date.getUTCMonth() + 1;
    var month = date.getUTCFullYear() + "-" + (monthNumber < 10 ? "0" : "") + monthNumber;
    var monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    var events = [];
    if (trio && trio.members) Object.keys(trio.members).forEach(function (name) {
        var member = trio.members[name];
        if (!member || !member.included || !member.metrics || !member.metrics.history) return;
        events = caracalV2MergeItemEvents(events, member.metrics.history.items, at);
    });
    var monthlyItems = {};
    events.forEach(function (event) {
        if (event.at >= monthStart && event.at <= at) monthlyItems[event.item] =
            (monthlyItems[event.item] || 0) + (event.quantity || 0);
    });
    var itemsAvailable = events.length > 0;
    return {
        schema: "CaracAL.Loot.v2",
        version: CARACAL_PLUS_SCHEMA_VERSION,
        updatedAt: at,
        source: "TheDroidMCH",
        sourceDescription: "Merchant-owned aggregation of FarmMetrics.6 loot totals and captured loot events.",
        totals: {
            gold: trio ? trio.goldEarned : null,
            goldBanked: trio ? trio.goldBanked : null,
            sessionGold: trio ? trio.sessionGold : null,
            items: trio ? trio.itemTotals : null
        },
        events: events,
        monthly: {
            month: month,
            gold: caracalV2MonthlyGold(trio && trio.history, monthStart, at),
            items: itemsAvailable ? monthlyItems : null,
            itemsAvailable: itemsAvailable,
            unavailableReason: itemsAvailable ? null :
                "No timestamped loot item events are available in the current 24-hour history."
        },
        unavailableReason: trio ? null : "TrioMetrics.v2 is unavailable on the merchant publisher."
    };
}

function caracalV2BankItem(item, slot) {
    var normalized = item ? caracalV2Item(item, slot) : null;
    if (!normalized) return null;
    return { slot: normalized.slot, name: normalized.name, skin: normalized.skin,
        quantity: normalized.quantity, q: normalized.q, level: normalized.level,
        locked: normalized.locked, bound: normalized.bound, metadata: normalized.metadata };
}

function caracalV2BankRecord() {
    var bank = null;
    var source = caracalCharacterName();
    try { if (character && character.bank) bank = character.bank; } catch (_) { }
    var tabs = [];
    if (bank && typeof bank === "object") {
        Object.keys(bank).filter(function (key) { return /^items\d+$/.test(key) && Array.isArray(bank[key]); })
            .sort(function (a, b) { return Number(a.slice(5)) - Number(b.slice(5)); })
            .forEach(function (key) {
                var slots = bank[key].map(function (item, slot) { return caracalV2BankItem(item, slot); });
                // The game bank menu always renders at least 42 slots per tab,
                // even when the live bank array is shorter.
                while (slots.length < 42) slots.push(null);
                tabs.push({ name: key, index: Number(key.slice(5)), capacity: slots.length,
                    used: slots.reduce(function (count, item) { return count + (item ? 1 : 0); }, 0), slots: slots });
            });
    }
    var accountGold = bank ? caracalFinite(bank.gold !== undefined ? bank.gold : bank.bankGold) : null;
    var capacity = tabs.reduce(function (total, tab) { return total + tab.capacity; }, 0);
    var used = tabs.reduce(function (total, tab) { return total + tab.used; }, 0);
    return {
        schema: "CaracAL.Bank.v2",
        version: CARACAL_PLUS_SCHEMA_VERSION,
        source: source,
        updatedAt: caracalTimestamp(),
        sourceDescription: bank ? "Live character.bank exposed by " + source + " and maintained by MerchantBanking.63." :
            "Live character.bank is unavailable for the current character.",
        available: !!bank,
        accountGold: accountGold,
        capacity: bank ? capacity : null,
        used: bank ? used : null,
        tabs: tabs,
        unavailableReason: bank ? null :
            "Live character.bank is unavailable until the merchant is connected to the bank; the untimestamped MerchantBankUI snapshot is not treated as authoritative."
    };
}

function caracalV2MailRecord() {
    var unreadCount = null, messages = null;
    try {
        var root = typeof parent !== "undefined" && parent ? parent : null;
        var info = root && root.X ? root.X : (typeof X !== "undefined" ? X : null);
        if (info && info.unread !== undefined) unreadCount = caracalFinite(info.unread);
        var candidate = root && Array.isArray(root.mail) ? root.mail : null;
        if (!candidate && info && Array.isArray(info.mail)) candidate = info.mail;
        if (candidate) messages = candidate.map(function (message) {
            return {
                id: caracalText(message.id), from: caracalText(message.from), to: caracalText(message.to),
                subject: caracalText(message.subject), body: caracalText(message.body || message.message),
                sentAt: caracalFinite(message.sentAt), receivedAt: caracalFinite(message.receivedAt),
                read: message.read === undefined ? null : !!message.read,
                attachments: Array.isArray(message.attachments) ? message.attachments.map(function (item) {
                    return caracalV2MailAttachment(item);
                }) : []
            };
        });
    } catch (_) { }
    return {
        schema: "CaracAL.Mail.v1",
        version: 1,
        updatedAt: caracalTimestamp(),
        source: "TheDroidMCH",
        sourceDescription: "Read-only server/account mail fields exposed by the current client revision.",
        unreadCount: unreadCount,
        messages: messages || [],
        unavailableReason: messages ? null :
            "The player-code API exposes unread mail count only; full account mail messages and attachments are not available without opening the full client mail view."
    };
}

function caracalV2VisiblePlayerListings() {
    var entities = null;
    try { entities = typeof parent !== "undefined" && parent ? parent.entities : null; } catch (_) { }
    if (!entities || typeof entities !== "object") return { listings: [], unavailableReason: "parent.entities is unavailable in this client revision." };
    var listings = [];
    Object.keys(entities).forEach(function (id) {
        var seller = entities[id];
        if (!seller || seller.type !== "character" || !seller.name || seller.name === caracalCharacterName() || !seller.stand) return;
        var slots = seller.slots && typeof seller.slots === "object" ? seller.slots : {};
        Object.keys(slots).filter(function (key) { return /^trade\d+$/.test(key); }).sort(function (a, b) {
            return Number(a.slice(5)) - Number(b.slice(5));
        }).forEach(function (slotName) {
            var listing = slots[slotName];
            if (!listing || listing.b) return;
            var quantity = caracalFinite(listing.q !== undefined ? listing.q : listing.quantity);
            var price = caracalFinite(listing.price !== undefined ? listing.price : listing.p);
            var distanceValue = null;
            try { if (typeof distance === "function") distanceValue = caracalFinite(distance(character, seller)); } catch (_) { }
            return listings.push({
                seller: String(seller.name), sellerType: caracalText(seller.type), sellerSkin: caracalText(seller.skin),
                sellerCtype: caracalText(seller.ctype), map: caracalText(seller.map),
                x: caracalFinite(seller.real_x !== undefined ? seller.real_x : seller.x),
                y: caracalFinite(seller.real_y !== undefined ? seller.real_y : seller.y),
                distance: distanceValue, slot: Number(slotName.slice(5)),
                item: caracalV2PublicItem(listing), price: price,
                pricePerItem: listing.pricePerItem !== undefined ? caracalFinite(listing.pricePerItem) :
                    (price !== null && quantity ? price / quantity : null),
                currency: caracalText(listing.currency || listing.currencyType), lastSeenAt: caracalTimestamp()
            });
        });
    });
    return { listings: listings };
}

// Tracktrix is not a player-code localStorage record in the Adventure Land
// client. The authoritative response is assigned to the game-frame runtime
// object parent.tracker by the socket.on("tracker") handler in js/game.js.
// This publisher only reads that object; it never emits the tracker request.
function caracalTracktrixRuntime() {
    var root = null, tracker = null;
    try { root = typeof parent !== "undefined" && parent ? parent : null; } catch (_) { }
    try {
        tracker = root && root.tracker && typeof root.tracker === "object" ? root.tracker : null;
    } catch (_) { }
    var fields = tracker ? Object.keys(tracker) : [];
    var loaded = !!(tracker && fields.some(function (field) {
        return field === "monsters" || field === "monsters_diff" || field === "exchanges" ||
            field === "max" || field === "maps" || field === "tables";
    }));
    return { root: root, tracker: loaded ? tracker : null, fields: fields, loaded: loaded };
}

function caracalTracktrixServer(root) {
    var current = caracalV2Server();
    var name = null;
    try { name = root && root.server_name !== undefined ? root.server_name : null; } catch (_) { }
    if (name === null) {
        try { name = typeof server !== "undefined" && server ? server.name : null; } catch (_) { }
    }
    return { region: current.region, id: current.id, name: caracalText(name) };
}

function caracalTracktrixDefinition(root, id) {
    var definition = null;
    try { definition = root && root.G && root.G.monsters ? root.G.monsters[id] : null; } catch (_) { }
    return definition && typeof definition === "object" ? definition : null;
}

function caracalTracktrixMonsterIds(tracker) {
    var ids = {};
    ["monsters", "monsters_diff", "monsters_home_server"].forEach(function (field) {
        var source = tracker && tracker[field];
        if (!source || typeof source !== "object") return;
        Object.keys(source).forEach(function (id) { ids[id] = true; });
    });
    if (tracker && tracker.max && tracker.max.monsters && typeof tracker.max.monsters === "object") {
        Object.keys(tracker.max.monsters).forEach(function (id) { ids[id] = true; });
    }
    return Object.keys(ids).sort();
}

function caracalTracktrixNumber(source, id) {
    if (!source || typeof source !== "object" || !Object.prototype.hasOwnProperty.call(source, id)) return null;
    return caracalFinite(source[id]);
}

function caracalTracktrixMonsterRecord(root, tracker, id) {
    var definition = caracalTracktrixDefinition(root, id);
    var kills = caracalTracktrixNumber(tracker.monsters, id);
    var scoreAdjustment = caracalTracktrixNumber(tracker.monsters_diff, id);
    var score = kills !== null || scoreAdjustment !== null ? (kills || 0) + (scoreAdjustment || 0) : null;
    var maxScore = null, maxOwner = null;
    try {
        var maxEntry = tracker.max && tracker.max.monsters && tracker.max.monsters[id];
        if (Array.isArray(maxEntry)) {
            maxScore = caracalFinite(maxEntry[0]);
            maxOwner = caracalText(maxEntry[1]);
        }
    } catch (_) { }
    var drops = tracker.drops && tracker.drops[id] !== undefined ? caracalSafe(tracker.drops[id], 0, []) : null;
    var homeDrops = tracker.drops_home && tracker.drops_home[id] !== undefined ? caracalSafe(tracker.drops_home[id], 0, []) : null;
    var homeServerDrops = tracker.monsters_home_server && tracker.monsters_home_server[id] !== undefined ?
        caracalSafe(tracker.monsters_home_server[id], 0, []) : null;
    return {
        id: id,
        name: definition ? caracalText(definition.name) : null,
        skin: definition ? caracalText(definition.skin || id) : null,
        kills: kills,
        scoreAdjustment: scoreAdjustment,
        score: score,
        maxScore: maxScore,
        maxOwner: maxOwner,
        drops: drops,
        homeServerDrops: homeDrops,
        homeServerDropMetadata: homeServerDrops
    };
}

function caracalTracktrixRecord() {
    var runtime = caracalTracktrixRuntime();
    var at = caracalTimestamp();
    var serverValue = caracalTracktrixServer(runtime.root);
    var record = {
        schema: "CaracAL.Tracktrix.v1",
        version: CARACAL_TRACKTRIX_SCHEMA_VERSION,
        source: "TheDroidMCH",
        sourceDescription: "parent.tracker populated by Adventure Land js/game.js socket.on(\"tracker\"); names and skins from parent.G.monsters.",
        updatedAt: at,
        trackerObservedAt: runtime.loaded ? at : null,
        server: serverValue,
        available: runtime.loaded,
        monsters: [],
        metadata: {
            runtimeObject: "parent.tracker",
            responseFields: runtime.fields,
            maps: runtime.tracker ? caracalSafe(runtime.tracker.maps, 0, []) : null,
            max: runtime.tracker ? caracalSafe(runtime.tracker.max, 0, []) : null,
            tables: runtime.tracker ? caracalSafe(runtime.tracker.tables, 0, []) : null,
            global: runtime.tracker ? caracalSafe(runtime.tracker.global, 0, []) : null,
            globalStatic: runtime.tracker ? caracalSafe(runtime.tracker.global_static, 0, []) : null,
            drops: runtime.tracker ? caracalSafe(runtime.tracker.drops, 0, []) : null,
            dropsHome: runtime.tracker ? caracalSafe(runtime.tracker.drops_home, 0, []) : null,
            monstersHomeServer: runtime.tracker ? caracalSafe(runtime.tracker.monsters_home_server, 0, []) : null,
            hasDrops: !!(runtime.tracker && runtime.tracker.drops),
            hasHomeServerDrops: !!(runtime.tracker && runtime.tracker.drops_home),
            hasMonsterHomeServerMetadata: !!(runtime.tracker && runtime.tracker.monsters_home_server)
        },
        unavailableReason: runtime.loaded ? null :
            "parent.tracker is not populated; the game client has not received a tracker response in this session."
    };
    if (runtime.loaded) {
        record.monsters = caracalTracktrixMonsterIds(runtime.tracker).map(function (id) {
            return caracalTracktrixMonsterRecord(runtime.root, runtime.tracker, id);
        });
    }
    return record;
}

function caracalTracktrixExchangeDefinitions(root, tracker) {
    var ids = {};
    var exchanges = tracker && tracker.exchanges && typeof tracker.exchanges === "object" ? tracker.exchanges : {};
    Object.keys(exchanges).forEach(function (id) { ids[id] = true; });
    return Object.keys(ids).sort().map(function (exchangeId) {
        var itemId = exchangeId, level = null, definition = null;
        try {
            definition = root && root.G && root.G.items ? root.G.items[itemId] : null;
            if (!definition && root && root.G && root.G.items) {
                Object.keys(root.G.items).some(function (candidate) {
                    var candidateDef = root.G.items[candidate];
                    if (!candidateDef || (!candidateDef.upgrade && !candidateDef.compound)) return false;
                    for (var i = 0; i < 13; i++) {
                        if (exchangeId === candidate + i && root.G.drops && root.G.drops[exchangeId]) {
                            itemId = candidate;
                            level = i;
                            definition = candidateDef;
                            return true;
                        }
                    }
                    return false;
                });
            }
        } catch (_) { }
        var count = caracalFinite(exchanges[exchangeId]);
        var requiredQuantity = definition ? caracalFinite(definition.e) : null;
        return {
            id: exchangeId,
            itemId: itemId,
            name: definition ? caracalText(definition.name) : null,
            skin: definition ? caracalText(definition.skin || itemId) : null,
            level: level,
            exchangeCount: count,
            quantity: null,
            requiredQuantity: requiredQuantity,
            quantityUnavailableReason: "tracker.exchanges contains completed exchange counts, not current inventory quantity.",
            definition: definition ? caracalSafe({ type: definition.type, e: definition.e, upgrade: !!definition.upgrade,
                compound: !!definition.compound, quest: definition.quest || null }, 0, []) : null
        };
    });
}

function caracalTracktrixExchangeRecord() {
    var runtime = caracalTracktrixRuntime();
    var at = caracalTimestamp();
    var exchanges = runtime.loaded ? runtime.tracker.exchanges : null;
    return {
        schema: "CaracAL.Exchange.v1",
        version: CARACAL_TRACKTRIX_SCHEMA_VERSION,
        source: "TheDroidMCH",
        sourceDescription: "parent.tracker.exchanges completed-exchange totals; item names, skins, and required quantities from parent.G.items and parent.G.drops.",
        updatedAt: at,
        trackerObservedAt: runtime.loaded ? at : null,
        server: caracalTracktrixServer(runtime.root),
        available: !!(runtime.loaded && exchanges && typeof exchanges === "object"),
        exchanges: runtime.loaded ? caracalTracktrixExchangeDefinitions(runtime.root, runtime.tracker) : [],
        totals: runtime.loaded ? caracalSafe(exchanges, 0, []) : null,
        unavailableReason: runtime.loaded ? null :
            "parent.tracker.exchanges is unavailable because the game client has not received a tracker response in this session."
    };
}

function caracalTracktrixSnapshotRecord(tracktrix, exchange) {
    var at = caracalTimestamp();
    var available = !!(tracktrix && tracktrix.available && exchange && exchange.available);
    return {
        schema: "CaracAL.TracktrixSnapshot.v1",
        version: CARACAL_TRACKTRIX_SCHEMA_VERSION,
        source: "TheDroidMCH",
        sourceDescription: "Combined merchant-owned Tracktrix monster and exchange snapshot from the live game-frame tracker response.",
        updatedAt: at,
        server: tracktrix ? tracktrix.server : null,
        tracktrix: tracktrix,
        exchange: exchange,
        unavailableReason: available ? null : "Tracktrix and exchange data are not both available from parent.tracker."
    };
}

function caracalPublishTracktrixRecords() {
    if (caracalCharacterName() !== "TheDroidMCH") return false;
    var tracktrix = caracalRetainAvailableSharedRecord("Tracktrix.v1", caracalTracktrixRecord());
    var exchange = caracalRetainAvailableSharedRecord("Exchange.v1", caracalTracktrixExchangeRecord());
    var snapshot = caracalRetainAvailableSharedRecord("TracktrixSnapshot.v1", caracalTracktrixSnapshotRecord(tracktrix, exchange));

    // Keep the shared-record cleanup while retaining the last valid snapshot.
    caracalWriteSharedRecord("Tracktrix.v1", tracktrix);
    caracalWriteSharedRecord("Exchange.v1", exchange);
    caracalWriteSharedRecord("TracktrixSnapshot.v1", snapshot);

    return true;
}

function caracalV2MarketRecord() {
    var serverValue = caracalV2Server();
    var visible = caracalV2VisiblePlayerListings();
    return {
        schema: "CaracAL.Market.v1",
        version: 1,
        source: "TheDroidMCH",
        updatedAt: caracalTimestamp(),
        sourceDescription: "Visible player entities and their read-only trade slots; the merchant's own dashboard is excluded.",
        server: serverValue,
        map: caracalText(caracalField(caracalState(), ["map"], null)),
        listings: visible.listings,
        unavailableReason: visible.unavailableReason || null
    };
}

function caracalV2StandRecord() {
    var listings = [];
    var slots = null;
    try { slots = character && character.slots ? character.slots : null; } catch (_) { }
    if (slots) Object.keys(slots).filter(function (key) { return /^trade\d+$/.test(key); }).sort(function (a, b) {
        return Number(a.slice(5)) - Number(b.slice(5));
    }).forEach(function (slotName) {
        var listing = slots[slotName];
        if (!listing) return;
        var quantity = caracalFinite(listing.q !== undefined ? listing.q : listing.quantity);
        var price = caracalFinite(listing.price !== undefined ? listing.price : listing.p);
        listings.push({
            slot: Number(slotName.slice(5)), item: caracalV2PublicItem(listing), price: price,
            pricePerItem: listing.pricePerItem !== undefined ? caracalFinite(listing.pricePerItem) :
                (price !== null && quantity ? price / quantity : null),
            currency: caracalText(listing.currency || listing.currencyType),
            buyerOnly: listing.b === undefined ? null : !!listing.b
        });
    });
    var map = null, x = null, y = null, open = null;
    try { map = caracalText(character.map); x = caracalFinite(character.x); y = caracalFinite(character.y); open = !!character.stand; } catch (_) { }
    return {
        schema: "CaracAL.Stand.v1",
        version: 1,
        owner: "TheDroidMCH",
        updatedAt: caracalTimestamp(),
        sourceDescription: "TheDroidMCH character.stand and read-only character.slots.tradeN values.",
        map: map, x: x, y: y, open: open, listings: listings,
        unavailableReason: slots ? null : "character.slots is unavailable in this client revision."
    };
}

function caracalPublishV2() {
    var name = caracalCharacterName();
    if (!name) return;
    caracalInstallLootCapture();
    var dashboard = caracalV2DashboardRecord(null);
    var metrics = caracalV2MetricsRecord(name, dashboard);
    dashboard = caracalV2DashboardRecord(metrics);
    metrics = caracalV2MetricsRecord(name, dashboard);

    // Use enhanced publishing for individual records
    caracalPublishIfValid(caracalV2Key(name, "Dashboard.v2"), dashboard);
    caracalPublishIfValid(caracalV2Key(name, "Metrics.v2"), metrics);
    caracalPublishIfValid(caracalV2Key(name, "Activity.v1"), caracalV2ActivityRecord(name));

    var bank = caracalV2BankRecord();
    if (bank.available) {
        // Use enhanced publishing for bank record
        caracalPublishIfValid(caracalKey(null, "Bank.v2"), bank);
    }

    if (name !== "TheDroidMCH") return;
    var trio = caracalV2TrioRecord();

    // Use enhanced publishing for TrioMetrics.v2
    caracalPublishIfValid(caracalV2Key(null, "TrioMetrics.v2"), trio || {
        schema: "CaracAL.TrioMetrics.v2", version: CARACAL_PLUS_SCHEMA_VERSION,
        updatedAt: caracalTimestamp(), sessionId: null, sessionStartedAt: null,
        source: caracalSource(name, "CaracALPublisher.98"), members: {}, onlineCount: 0,
        activeCount: 0, xpEarned: null, xpPerHour: null, goldEarned: null, goldPerHour: null,
        goldBanked: null, sessionGold: null, sessionGoldPerHour: null,
        kills: null, dps: null, itemTotals: null, history: { xp: [], gold: [], dps: [], kills: [], items: [] },
        unavailableReason: "The merchant session is not available."
    });

    // Use enhanced publishing for Loot.v2
    caracalPublishIfValid(caracalKey(null, "Loot.v2"), caracalRetainAvailableSharedRecord("Loot.v2", caracalV2LootRecord(trio)));

    // Use enhanced publishing for Mail.v1
    caracalPublishIfValid(caracalKey(null, "Mail.v1"), caracalV2MailRecord());

    // Use enhanced publishing for Market.v1
    caracalPublishIfValid(caracalKey(null, "Market.v1"), caracalV2MarketRecord());

    // Use enhanced publishing for Stand.v1
    caracalPublishIfValid(caracalKey(null, "Stand.v1"), caracalV2StandRecord());

    caracalPublishTracktrixRecords();
}

function caracalPublishAll() {
    try {
        var name = caracalCharacterName();
        if (!name) return;
        var metrics = caracalMetricsRecord(name, null);
        var dashboard = caracalDashboardRecord(metrics);
        // Recalculate metrics once with dashboard XP/max-XP available for TTLU.
        metrics = caracalMetricsRecord(name, dashboard);
        dashboard = caracalDashboardRecord(metrics);

        // Use enhanced publishing for v1 records
        caracalPublishIfValid(caracalKey(name, "Dashboard.v1"), dashboard);
        caracalPublishIfValid(caracalKey(name, "Metrics.v1"), metrics);

        var trio = caracalTrioRecord();
        if (trio) {
            // Use enhanced publishing for TrioMetrics.v1
            caracalPublishIfValid(caracalKey(null, "TrioMetrics.v1"), trio);

            // Use enhanced publishing for Loot.v1
            caracalPublishIfValid(caracalKey(null, "Loot.v1"), caracalLootRecord(trio));
        }

        // Bank publication is owned by caracalPublishV2 so only the shared
        // CaracAL.Bank.v2 record is refreshed.
        caracalPublishV2();
    } catch (_) { }
}

if (!CARACAL_PUBLISHER_RUNTIME || CARACAL_PUBLISHER_RUNTIME.version < 2) {
    CARACAL_PUBLISHER_RUNTIME = { version: 2, installedAt: caracalTimestamp(), intervalMs: CARACAL_PUBLISH_INTERVAL_MS };
    caracalPublishAll();
    if (typeof alTrackInterval === "function") CARACAL_PUBLISHER_RUNTIME.timer = alTrackInterval(caracalPublishAll, CARACAL_PUBLISH_INTERVAL_MS);
    else if (typeof setInterval === "function") CARACAL_PUBLISHER_RUNTIME.timer = setInterval(caracalPublishAll, CARACAL_PUBLISH_INTERVAL_MS);
}
