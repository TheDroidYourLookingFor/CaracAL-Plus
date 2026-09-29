const vm = require("vm");
const io = require("socket.io-client");
const fs = require("fs").promises;
const fs_sync = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const node_query = require("jquery");
const game_files = require("../game_files");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const monitoring_util = require("../monitoring_util");
const ipc_storage = require("../ipcStorage");

const LogUtils = require("./LogUtils");
const { console } = LogUtils;

process.on("unhandledRejection", function (exception) {
  console.warn("promise rejected: \n", exception);
});

const html_spoof = `<!DOCTYPE html>
<html>
<head>
<title>Adventure Land</title>
</head>
<body>
</body>
</html>`;

function make_context(upper = null, storage_mode = "caracal-native") {
  const result = new JSDOM(html_spoof, { url: "https://adventure.land/" })
    .window;
  //jsdom maked globalThis point to Node global
  //but we want it to be window instead
  result.globalThis = result;
  result.fetch = fetch;
  result.$ = result.jQuery = node_query(result);
  result.require = require;
  result.console = console;
  result.__caracAL_storage_mode =
    (upper && upper.__caracAL_storage_mode) || storage_mode;
  if (upper) {
    Object.defineProperty(result, "parent", { value: upper });
    result._localStorage = upper._localStorage;
    result._sessionStorage = upper._sessionStorage;
  } else {
    result._localStorage = ipc_storage.make_IPC_storage("ls", {
      storage_mode: result.__caracAL_storage_mode,
    });
    result._sessionStorage = ipc_storage.make_IPC_storage("ss");
  }
  vm.createContext(result);

  result.eval = function (arg) {
    return vm.runInContext(arg, result);
  };

  return result;
}

async function ev_files(locations, context) {
  for (let location of locations) {
    const resolvedLocation = resolveCodeLocation(location);
    let text = await fs.readFile(resolvedLocation, "utf8");
    // jsdom contexts created for a runner can share String intrinsics with
    // the game window. The native helper is non-configurable, so make the
    // second evaluation idempotent without changing browser-client behavior.
    if (context.parent && location.endsWith("/common_functions.js")) {
      text = text.replace(
        'Object.defineProperty(String.prototype, "hashCode", {',
        'if (!String.prototype.hashCode) Object.defineProperty(String.prototype, "hashCode", {',
      );
    }
    // Adventure Land's clone() helper uses instanceof checks for its built-in
    // types. Headless events can cross the Node/jsdom VM boundary, where those
    // checks fail for otherwise ordinary arrays, dates, and objects. Keep the
    // game helper's behavior while recognizing values from either realm.
    if (location.endsWith("/old_common_functions.js")) {
      const cloneRealmChecks = [
        ["if (obj instanceof Date) {", 'if (Object.prototype.toString.call(obj) === "[object Date]") {'],
        ["if (obj instanceof Array) {", "if (Array.isArray(obj)) {"],
        ["if (obj instanceof Object) {", 'if (Object.prototype.toString.call(obj) === "[object Object]") {'],
      ];
      let patchedText = text;
      let allChecksFound = true;
      for (const [original, replacement] of cloneRealmChecks) {
        if (!patchedText.includes(original)) {
          allChecksFound = false;
          break;
        }
        patchedText = patchedText.replace(original, replacement);
      }
      if (allChecksFound) {
        text = patchedText;
      } else {
        console.warn(
          "Adventure Land clone() compatibility patch was not applied: helper source did not match",
        );
      }
    }
    vm.runInContext(text + "\n//# sourceURL=file://" + resolvedLocation, context);
  }
}

function localCodeRoot() {
  const configured = String(process.env.ADVENTURELAND_CODE_ROOT || "").trim();
  if (configured) return path.resolve(configured);
  const consolidated = path.resolve(process.cwd(), "../../../SYNC/adventureland");
  if (fsSync.existsSync(consolidated)) return consolidated;
  return path.resolve(process.cwd(), "../../CODE/adventureland");
}

function localCodePath(relativeFile) {
  const normalized = String(relativeFile || "").replaceAll("\\", "/");
  if (normalized.startsWith("adventureland/")) {
    return path.join(path.dirname(localCodeRoot()), normalized);
  }
  return path.join(localCodeRoot(), normalized);
}

function resolveCodeLocation(location) {
  const raw = String(location || "");
  const normalized = raw.replaceAll("\\", "/");
  const prefix = "./CODE/";
  if (normalized.startsWith(prefix)) {
    const relative = normalized.slice(prefix.length);
    if (relative.startsWith("adventureland/")) {
      const local = localCodePath(relative);
      if (fs_sync.existsSync(local)) return local;
    }
  }
  return raw;
}

function getLocalCodeFile(nameOrSlot) {
  const wanted = String(nameOrSlot || "");
  const root = localCodeRoot();
  let metadata = null;
  try {
    metadata = JSON.parse(fs_sync.readFileSync(path.join(root, ".sync.json"), "utf8"));
  } catch (error) {
    metadata = null;
  }

  const entries = metadata && metadata.files && typeof metadata.files === "object"
    ? Object.entries(metadata.files)
    : [];
  for (const [slot, entry] of entries) {
    if (!entry || typeof entry !== "object") continue;
    if (String(slot) !== wanted && String(entry.slot || "") !== wanted && String(entry.name || "") !== wanted) continue;
    try {
      return fs_sync.readFileSync(localCodePath(entry.file), "utf8");
    } catch (error) {
      return null;
    }
  }

  for (const folder of ["codes", "characters"]) {
    const directory = path.join(root, folder);
    let files = [];
    try {
      files = fs_sync.readdirSync(directory);
    } catch (error) {
      continue;
    }
    for (const file of files) {
      const match = String(file).match(/^(.*)\.([^.]+)\.js$/);
      if (!match || (match[2] !== wanted && match[1] !== wanted)) continue;
      try {
        return fs_sync.readFileSync(path.join(directory, file), "utf8");
      } catch (error) {
        return null;
      }
    }
  }
  return null;
}

async function make_runner(upper, CODE_file, version, is_typescript, storage_mode) {
  const runner_sources = game_files
    .get_runner_files()
    .map((f) => game_files.locate_game_file(f, version));
  console.log("constructing runner instance");
  console.debug("source files:\n%s", runner_sources);
  const runner_context = make_context(upper, storage_mode);
  // The browser runner declares Place="code". The headless runner executes
  // shared movement helpers without loading runner.html, so provide the same
  // value for code paths that otherwise read the game-only `transporting`.
  runner_context.Place = "code";
  // Shared deferred helpers also read the browser's development flag.
  runner_context.Dev = upper.Dev || "";
  //contents of adventure.land/runner
  //its an html file but not labeled as such
  //TODO in the future i should consider parsing the relevant parts out of the html files directly
  //for the runners as well as the instances
  vm.runInContext(
    "var active=false,catch_errors=true,is_code=1,is_server=0,is_game=0,is_bot=parent.is_bot,is_cli=parent.is_cli,is_sdk=parent.is_sdk;",
    runner_context,
  );
  await ev_files(runner_sources, runner_context);
  // The browser implementation of load_code() appends a script element to
  // document.head. CaracAL uses jsdom without script execution enabled, so
  // that append is inert and account loaders such as TrioLoader never run.
  // Evaluate the already-synced local CODE directly in this runner context so
  // native Adventure Land loaders behave the same way in headless mode.
  const evaluateLocalCode = (name_or_slot, onerror) => {
    const code = upper.get_code_file(name_or_slot);
    if (code === null) {
      const error = new Error(`Local CODE slot not found: ${name_or_slot}`);
      if (typeof onerror === "function") {
        onerror(error);
        return;
      }
      throw error;
    }
    try {
      return vm.runInContext(
        code + `\n//# sourceURL=CODE/${String(name_or_slot)}`,
        runner_context,
      );
    } catch (error) {
      console.warn("local load_code failed for %s: %s", name_or_slot, error.stack || error);
      if (typeof onerror === "function") {
        onerror(error);
        return;
      }
      throw error;
    }
  };
  runner_context.load_code = evaluateLocalCode;
  runner_context.require_code = (name_or_slot) => {
    const code = upper.get_code_file(name_or_slot);
    if (code === null) {
      throw new Error(`Local CODE slot not found: ${name_or_slot}`);
    }
    const sourceKey = "__caracal_require_source";
    runner_context[sourceKey] = code;
    try {
      return vm.runInContext(
        `(function() { var module = { exports: {} }; var exports = module.exports; eval(${sourceKey}); return module.exports; })()`,
        runner_context,
        { filename: `CODE/${String(name_or_slot)}` },
      );
    } finally {
      delete runner_context[sourceKey];
    }
  };
  runner_context.send_cm = function (to, data) {
    process.send({
      type: "cm",
      to,
      data,
    });
  };
  //we need to do this here because of scoping
  upper.caracAL.load_scripts = async function (locations) {
    if (!is_typescript) {
      return await ev_files(
        locations.map((x) => "./CODE/" + x),
        runner_context,
      );
    } else {
      throw new Exception(
        "Runtime Loading Code is not supported in Typescript Mode.\nUse an import instead",
      );
    }
  };
  vm.runInContext(
    "active = true;parent.code_active = true;set_message('Code Active');if (character.rip) character.trigger('death', {past: true});",
    runner_context,
  );

  process.on("message", (m) => {
    switch (m.type) {
      case "closing_client":
        console.log("terminating self");
        vm.runInContext("on_destroy()", runner_context);
        process.exit();
        //vscode says this is unreachable.
        //with how whack node is better be safe
        break;
      case "runner_action":
        Promise.resolve()
          .then(() => run_runner_action(m.action, m.payload || {}))
          .then((result) => process.send({ type: "runner_action_result", requestId: m.requestId, ok: true, result }))
          .catch((error) => process.send({
            type: "runner_action_result",
            requestId: m.requestId,
            ok: false,
            error: error && error.message ? error.message : String(error),
          }));
        break;
    }
  });

  //so.
  //these should send a shutdown to parent
  //parent deletes instance and marks them inactive
  //if its duplicate then no instance and no double shutdown
  ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) =>
    process.on(signal, async () => {
      console.log(`Received ${signal} on client. Requesting termination`);
      process.send({
        type: "shutdown",
      });
    }),
  );

  //awaits the arrival of a message from parent process
  //indicating the servers_and_characters proxy that we use
  const connected_signoff = new Promise((resolve) => {
    process.on("message", (m) => {
      switch (m.type) {
        case "siblings_and_acc":
          resolve();
          break;
      }
    });
  });

  process.send({ type: "connected" });

  console.log("runner instance constructed");
  monitoring_util.register_stat_beat(upper);

  function run_runner_action(action, payload) {
    runner_context.__pi_runner_action_payload = payload && typeof payload === "object" ? payload : {};
    const actionSource = JSON.stringify(String(action || ""));
    const expression = `(function() {
      const action = ${actionSource};
      const payload = globalThis.__pi_runner_action_payload || {};
      const safe = (callback, fallback) => {
        try { const value = callback(); return value === undefined ? fallback : value; }
        catch (_) { return fallback; }
      };
      if (action === "dashboard") {
        const base = safe(() => typeof statusSnapshot === "function" ? statusSnapshot() : {}, {});
        const production = safe(() => typeof productionStatus === "function" ? productionStatus() : {}, {});
        const gatherSkill = safe(() => typeof gatheringSkill === "function" ? gatheringSkill() : null, null);
        const gatherWait = gatherSkill ? safe(() => typeof gatheringCooldownMs === "function" ? gatheringCooldownMs(gatherSkill) : 0, 0) : 0;
        const marketReward = safe(() => typeof merchantMerritRewardTimer === "function" ? merchantMerritRewardTimer() : null, null);
        const marketEnabled = !!(typeof MERCHANT_CONFIG !== "undefined" && MERCHANT_CONFIG.market && MERCHANT_CONFIG.market.enabled);
        const activeJob = character.rip ? "Respawning" : (mrt.escapePromise ? "Escaping" : mrt.action);
        let activeStep = character.rip ? "Waiting to respawn before resuming merchant work" :
          (mrt.escapePromise ? "Interrupting the current job to escape a threat" : mrt.currentStep);
        if (!character.rip && mrt.action === "Idle" && MERCHANT_CONFIG.gathering && MERCHANT_CONFIG.gathering.enabled && gatherSkill && gatherWait > 0) {
          activeStep = "Waiting " + gatherWait + "ms before the next " + gatherSkill + " attempt. Courier and other jobs can run meanwhile.";
        }
        const servers = safe(() => typeof merchantAvailableServers === "function" ? merchantAvailableServers().map((item) => ({
          region: item.region, id: item.name, players: typeof item.players === "number" ? item.players : null,
          pvp: !!item.pvp, bonus: item.bonus || item.bonuses || item.serverBonus || item.server_bonus || null,
        })) : [], []);
        return Object.assign({}, base, {
          live: true, phase: safe(() => mrt.escapePromise ? "Escaping" : mrt.phase, base.phase || "Idle"),
          action: activeJob || "Idle", currentStep: activeStep || "Idle",
          actionStartedAt: mrt.actionStartedAt || null, stepStartedAt: mrt.stepStartedAt || null,
          sessionStartedAt: mrt.sessionStartedAt || null, sessionStartGold: mrt.sessionStartGold || 0,
          sessionGoldBanked: mrt.sessionGoldBanked || 0, sessionCourierTrips: mrt.sessionCourierTrips || 0,
          sessionDeliveries: mrt.sessionDeliveries || 0, sessionPickupStacks: mrt.sessionPickupStacks || 0,
          sessionJunkStacksSold: mrt.sessionJunkStacksSold || 0, sessionMluckTrio: mrt.sessionMluckTrio || 0,
          sessionMluckOther: mrt.sessionMluckOther || 0, lastCourierService: mrt.lastCourierService || "None",
          courierPhase: mrt.courierPhase || "idle", courierMember: mrt.courierCurrentMember || null,
          freeSlots: safe(() => typeof freeSlots === "function" ? freeSlots() : null, base.freeSlots),
          potions: { hp: safe(() => typeof quantity === "function" ? quantity("hpot0") : null, null), mp: safe(() => typeof quantity === "function" ? quantity("mpot0") : null, null) },
          goldDelta: character.gold - (mrt.sessionStartGold || character.gold) + (mrt.sessionGoldBanked || 0),
          gathering: { skill: gatherSkill, waitMs: gatherWait,
            mining: safe(() => typeof gatheringCooldownMs === "function" ? gatheringCooldownMs("mining") : null, null),
            fishing: safe(() => typeof gatheringCooldownMs === "function" ? gatheringCooldownMs("fishing") : null, null) },
         production, market: { enabled: marketEnabled,
             value: marketReward ? "Gift in " + marketReward.remainingMs + "ms" : (marketEnabled ? "Enabled" : "Off"),
             detail: marketReward ? "Stand out · Merrit reward cycle" : (marketEnabled ? "Stand automation" : "Stand automation off") },
          anniversary: safe(() => {
            const event = typeof anniversaryEvent === "function" ? anniversaryEvent() : null;
            const counts = typeof anniversaryCounts === "function" ? anniversaryCounts() : {};
            const ticket = character.s && character.s.anniversary_visit;
            const status = typeof anniversaryStatusText === "function" && mrt.anniversaryStatus
              ? anniversaryStatusText(mrt.anniversaryStatus)
              : "No event action recorded";
            return {
              event: event ? {
                active: event.active !== false,
                live: event.live !== false,
                round: event.round === undefined ? null : event.round,
                target: event.target || null,
                available: event.available !== false,
                expires: event.expires || null,
              } : null,
              counts,
              ticket: ticket ? {
                ms: ticket.ms || 0,
                round: ticket.round || null,
                realm: ticket.realm || null,
                expires: ticket.expires || null,
              } : null,
              statusText: status,
              gold: character.gold,
              freeSlots: typeof freeSlots === "function" ? freeSlots() : null,
            };
          }, { event: null, counts: {}, ticket: null, statusText: "Not detected", gold: character.gold, freeSlots: null }),
          deferredCraft: safe(() => typeof activeCraftDeferral === "function" ? activeCraftDeferral() : null, null),
          servers, currentServer: { region: server.region, id: server.id }, updatedAt: Date.now(),
        });
      }
      if (action === "skills") {
        const skills = safe(() => Object.entries(G && G.skills || {}).map(([id, skill]) => ({
          id, name: String(skill && skill.name || id), type: String(skill && skill.type || "ability"),
          classes: Array.isArray(skill && skill.class) ? skill.class.map(String) : [],
          range: Number(skill && skill.range || 0), mp: Number(skill && skill.mp || 0), cooldown: Number(skill && skill.cooldown || 0),
          explanation: String(skill && skill.explanation || ""), definition: skill || {},
        })), []);
        return { live: true, updatedAt: Date.now(), character: character.name, skills };
      }
      if (action === "stand" || action === "market") {
        const describeItem = (item, slot, owner, side, ownerId) => {
          if (!item || typeof item !== "object" || !item.name) return null;
          const definition = safe(() => G && G.items && G.items[item.name] ? G.items[item.name] : {}, {});
          return {
             slot: String(slot || ""), owner: owner || null, ownerId: ownerId || null, rid: item.rid || null, side: side || (item.b ? "BUY" : "SELL"),
            name: String(item.name), skin: item.skin || definition.skin || String(item.name),
            quantity: item.q === undefined ? (item.quantity === undefined ? 1 : item.quantity) : item.q,
            price: item.price === undefined ? null : item.price,
            level: item.level === undefined ? null : item.level,
            giveaway: item.giveaway || null,
          };
        };
        const describeSlots = (owner, slots, ownerId) => {
          const result = [];
          Object.keys(slots || {}).filter((slot) => /^trade\\d+$/.test(slot)).sort((a, b) => Number(a.slice(5)) - Number(b.slice(5))).forEach((slot) => {
            const item = slots[slot];
            const described = describeItem(item, slot, owner, undefined, ownerId);
            if (described) result.push(described);
          });
          return result;
        };
        const ownItems = describeSlots(character.name, character.slots, character.id);
        const playerStands = [];
        const entities = safe(() => parent && parent.entities ? parent.entities : {}, {});
        Object.keys(entities || {}).forEach((id) => {
          const entity = entities[id];
          if (!entity || entity.type !== "character" || !entity.stand || entity.name === character.name) return;
          if (entity.map && character.map && entity.map !== character.map) return;
           const listings = describeSlots(entity.name, entity.slots, entity.id);
          if (!listings.length) return;
          playerStands.push({
             name: entity.name, id: entity.id || null, map: entity.map || null, x: Math.round(Number(entity.x) || 0), y: Math.round(Number(entity.y) || 0),
            stand: entity.stand, level: entity.level || null, ctype: entity.ctype || null, listings,
          });
        });
        playerStands.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        return {
          live: true, updatedAt: Date.now(), character: character.name, stand: character.stand || false,
          map: character.map || null, x: Math.round(Number(character.x) || 0), y: Math.round(Number(character.y) || 0),
          server: { region: server.region, id: server.id }, ownItems,
          playerStands: action === "market" ? playerStands.slice(0, 100) : [],
          visibleStandCount: playerStands.length,
        };
      }
       if (action === "bank") {
         const operation = String(payload.operation || "now");
         if (operation === "now") {
           if (typeof merchant_bank_now === "function") { merchant_bank_now(); return { applied: true, operation }; }
           mrt.forceBank = true; return { applied: true, operation };
         }
         if (operation === "deposit" || operation === "withdraw") {
           const amount = Math.max(0, Math.floor(Number(payload.amount)));
           if (!amount) throw new Error("Enter a positive gold amount");
           const fn = operation === "deposit" ? bank_deposit : bank_withdraw;
           if (typeof fn !== "function") throw new Error("Bank gold control is unavailable");
           return Promise.resolve(fn(amount)).then((result) => ({ applied: true, operation, amount, result }));
         }
         if (operation === "retrieve") {
           const pack = String(payload.pack || ""), slot = Number(payload.bankSlot);
           if (!pack || !Number.isInteger(slot) || slot < 0) throw new Error("Select a valid bank slot");
           if (typeof bank_retrieve !== "function") throw new Error("Bank item retrieval is unavailable");
           return Promise.resolve(bank_retrieve(pack, slot)).then((result) => ({ applied: true, operation, pack, slot, result }));
         }
         if (operation === "store") {
           const inventorySlot = Number(payload.inventorySlot);
           if (!Number.isInteger(inventorySlot) || inventorySlot < 0) throw new Error("Select a valid inventory slot");
           if (typeof bank_store !== "function") throw new Error("Bank item storage is unavailable");
           return Promise.resolve(bank_store(inventorySlot, payload.pack || undefined, Number.isInteger(Number(payload.bankSlot)) ? Number(payload.bankSlot) : undefined)).then((result) => ({ applied: true, operation, inventorySlot, result }));
         }
         throw new Error("Unknown bank operation");
       }
       if (action === "stand") {
         const operation = String(payload.operation || "state");
         if (operation === "open" || operation === "close") {
           const fn = operation === "open" ? open_stand : close_stand;
           if (typeof fn !== "function") throw new Error("Stand control is unavailable");
           return Promise.resolve(fn(operation === "open" ? (Number.isInteger(Number(payload.inventorySlot)) ? Number(payload.inventorySlot) : undefined) : undefined)).then((result) => ({ applied: true, operation, result }));
         }
         if (operation === "publish") {
           const inventorySlot = Number(payload.inventorySlot), tradeSlot = String(payload.tradeSlot || ""), price = Number(payload.price), quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
           if (!Number.isInteger(inventorySlot) || inventorySlot < 0 || !/^trade\d+$/.test(tradeSlot) || !Number.isFinite(price) || price <= 0) throw new Error("Enter a valid inventory slot, trade slot, price, and quantity");
           if (typeof trade !== "function") throw new Error("Stand listing control is unavailable");
           return Promise.resolve(trade(inventorySlot, tradeSlot, price, quantity)).then((result) => ({ applied: true, operation, result }));
         }
         return { applied: false, operation };
       }
       if (action === "market") {
         const operation = String(payload.operation || "state");
         if (operation !== "buy") return { applied: false, operation };
         const ownerId = String(payload.ownerId || ""), tradeSlot = String(payload.tradeSlot || ""), rid = String(payload.rid || ""), quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
         const entities = safe(() => parent && parent.entities ? parent.entities : {}, {});
         const target = Object.values(entities || {}).find((entity) => entity && (String(entity.id || "") === ownerId || String(entity.name || "") === String(payload.owner || "")));
         if (!target || !target.slots || !target.slots[tradeSlot]) throw new Error("That player stand is no longer visible to the merchant");
         if (rid && String(target.slots[tradeSlot].rid || "") !== rid) throw new Error("That listing changed; refresh the market first");
         if (typeof parent.trade_buy !== "function") throw new Error("Market purchase control is unavailable");
         return Promise.resolve(parent.trade_buy(tradeSlot, target.id, target.slots[tradeSlot].rid, quantity)).then((result) => ({ applied: true, operation, result }));
       }
       if (action === "mail") {
         const operation = String(payload.operation || "");
         if (operation === "send") {
           const to = String(payload.to || "").trim(), subject = String(payload.subject || "").trim(), message = String(payload.message || "");
           if (!to || !subject) throw new Error("Recipient and subject are required");
           if (typeof send_mail !== "function") throw new Error("Mail sending is unavailable");
           const slot = payload.inventorySlot === undefined || payload.inventorySlot === null ? null : Number(payload.inventorySlot);
           if (slot !== null && slot !== 0) throw new Error("Mail attachments must currently be in inventory slot 0");
           return Promise.resolve(send_mail(to, subject, message, slot === 0)).then((result) => ({ applied: true, operation, result }));
         }
         const id = String(payload.id || "");
         if (!id) throw new Error("Select a mail message first");
         if (operation === "delete") {
           if (typeof api_call !== "function") throw new Error("Mail deletion is unavailable");
           return Promise.resolve(api_call("delete_mail", { mid: id }, { promise: true, silent: true })).then((result) => ({ applied: true, operation, result }));
         }
         if (operation === "take") {
           if (!parent || !parent.socket) throw new Error("Mail attachment collection is unavailable");
           parent.socket.emit("mail_take_item", { id });
           return { applied: true, operation };
         }
         throw new Error("Unknown mail operation");
       }
       if (action === "navigate") {
         const destination = payload.destination && typeof payload.destination === "object" ? payload.destination : null;
         if (!destination || !destination.map || typeof smart_move !== "function") throw new Error("That destination is unavailable");
         return Promise.resolve(smart_move(destination)).then((result) => ({ applied: true, destination, result }));
       }
      if (action === "anniversary") {
        const operation = String(payload.operation || "");
        const recipe = String(payload.recipe || "");
        const item = String(payload.item || "");
        const recipes = new Set(["sixcake", "homecomingcape", "makeawishjar"]);
        const rewards = new Set(["sixcake", "anniversarygift"]);
        const operations = {
          visit: () => typeof visitAnniversaryFeaturedPlayer === "function" ? visitAnniversaryFeaturedPlayer() : (() => { throw new Error("Anniversary visit is unavailable"); })(),
          craft: () => { if (!recipes.has(recipe)) throw new Error("Select a supported anniversary recipe"); if (typeof craftAnniversaryRecipe !== "function") throw new Error("Anniversary craft is unavailable"); return craftAnniversaryRecipe(recipe); },
          preview: () => typeof compoundAnniversaryCopies === "function" ? compoundAnniversaryCopies(true) : (() => { throw new Error("Anniversary compound is unavailable"); })(),
          compound: () => typeof compoundAnniversaryCopies === "function" ? compoundAnniversaryCopies(false) : (() => { throw new Error("Anniversary compound is unavailable"); })(),
          open: () => { if (!rewards.has(item)) throw new Error("Select a supported anniversary reward"); if (typeof openAnniversaryReward !== "function") throw new Error("Anniversary reward opening is unavailable"); return openAnniversaryReward(item); },
        };
        if (!operations[operation]) throw new Error("Unknown anniversary operation");
        if (typeof startAction !== "function") throw new Error("Merchant action queue is unavailable");
        const applied = startAction("Anniversary " + operation, operations[operation]);
        return { applied: applied !== false, queued: applied === false, operation };
      }
      const actionFunctions = { courier: "requestCourierTrip", patrol: "requestMluckPatrol", ponty: "requestPontyRun" };
      if (actionFunctions[action]) {
        const functionName = actionFunctions[action];
        if (typeof globalThis[functionName] !== "function") throw new Error(functionName + " is not available in this merchant runtime");
        return { applied: globalThis[functionName]() !== false };
      }
      if (action === "server") {
        const region = String(payload.region || ""); const id = String(payload.id || "");
        if (!region || !id || typeof requestMerchantServerSwitch !== "function") throw new Error("Merchant server switching is not available");
        return { applied: requestMerchantServerSwitch(region, id), region, id };
      }
      throw new Error("Unsupported runner action");
    })()`;
    try {
      return vm.runInContext(expression, runner_context);
    } finally {
      delete runner_context.__pi_runner_action_payload;
    }
  }

  //Fix a bug where parent.X is initially empty
  await connected_signoff;
  await ev_files([CODE_file], runner_context);
  //TODO put a process end handler here

  return runner_context;
}

async function make_game(proc_args) {
  const game_sources = game_files
    .get_game_files()
    .map((f) => game_files.locate_game_file(f, proc_args.version))
    .concat(["./html_vars.js"]);
  console.log("constructing game instance");
  console.debug("source files:\n%s", game_sources);
  const game_context = make_context(null, proc_args.storage_mode);
  game_context.caracAL_character_type = proc_args.ctype || "";
  game_context.io = io;
  game_context.bowser = {};
  const realm_address = /:\/\//.test(proc_args.realm_addr || "")
    ? proc_args.realm_addr
    : `https://${proc_args.realm_addr}`;
  // These values are read while the browser client source is evaluating, so
  // they must exist before ev_files() loads game.js.
  game_context.Local = "";
  game_context.Dev = "";
  game_context.Prod = "true";
  game_context.Staging = "";
  game_context.is_tauri = "";
  game_context.music_volume = 100;
  game_context.sfx_volume = 100;
  game_context.close_buttons_enabled = true;
  game_context.proximity_guides = "1";
  game_context.last_deploy = "";
  game_context.update_notes_more = false;
  game_context.server_address = realm_address;
  game_context.server_path = proc_args.realm_path || "/socket.io/";
  game_context.server_addr = realm_address;
  game_context.server_port = proc_args.realm_port;
  await ev_files(game_sources, game_context);
  // Current runner_functions.js handles get_secondhands() with a request-ID
  // scoped game_response listener instead of push_deferred(). The game
  // response dispatcher still attempts the generic deferred path for that
  // place, so ignore an empty secondhands queue while preserving real deferreds.
  const resolveDeferred = game_context.resolve_deferred;
  if (typeof resolveDeferred === "function") {
    game_context.resolve_deferred = function (name, data) {
      const pending = game_context.deferreds && game_context.deferreds[name];
      if (name === "secondhands" && (!pending || pending.length === 0)) return;
      return resolveDeferred(name, data);
    };
  }
  game_context.VERSION = "" + game_context.G.version;
  // Current clients use server_address/server_path; older client code used
  // server_addr/server_port. Populate both names so native client code keeps
  // working across game-client revisions.
  game_context.server_address = realm_address;
  game_context.server_path = proc_args.realm_path || "/socket.io/";
  game_context.server_addr = realm_address;
  game_context.server_port = proc_args.realm_port;
  game_context.user_id = proc_args.sess.split("-")[0];
  game_context.user_auth = proc_args.sess.split("-")[1];
  game_context.character_to_load = proc_args.cid;

  //expose the block under parent.caracAL
  const extensions = {};

  extensions.log = LogUtils.log;
  extensions.storage_mode = proc_args.storage_mode || "caracal-native";
  extensions.shared_with_pi_client = extensions.storage_mode === "pi-shared-localstorage";

  extensions.deploy = function (char_name, realm, script_file, game_version) {
    process.send({
      type: "deploy",
      ...(char_name && { character: char_name }),
      ...(realm && { realm }),
      ...(script_file && { script: script_file }),
      ...(game_version && { version: game_version }),
    });
  };
  extensions.shutdown = function (char_name) {
    process.send({
      type: "shutdown",
      character: char_name,
    });
  };
  extensions.map_enabled = function () {
    return proc_args.enable_map;
  };

  game_context.caracAL = extensions;

  const old_ng_logic = game_context.new_game_logic;
  game_context.new_game_logic = function () {
    old_ng_logic();
    clearTimeout(reload_task);
    //people reported bad performance when switching maps
    //and this allegedly fixes it.
    vm.runInContext("pause()", game_context);

    const is_typescript =
      proc_args.typescript_file && proc_args.typescript_file.length > 0;
    const target_script = is_typescript
      ? "./TYPECODE.out/" + proc_args.typescript_file
      : "./CODE/" + proc_args.script_file;
    (async function () {
      const runner_context = await make_runner(
        game_context,
        target_script,
        proc_args.version,
        is_typescript,
        proc_args.storage_mode,
      );
      extensions.runner = runner_context;
    })();
  };
  const old_dc = game_context.disconnect;
  game_context.disconnect = function () {
    old_dc();
    extensions.deploy();
  };
  const old_api = game_context.api_call;
  game_context.api_call = function (method, args, r_args) {
    //servers and characters are handled centrally
    if (method == "servers_and_characters") {
      console.debug("filtered s&c call");
      return Promise.resolve({ success: true });
    }
    // The browser tries to refresh CODE through /api/load_code after the
    // account snapshot arrives. Headless caracAL loads the selected local
    // CODE file directly, so avoid a session-less request to adventure.land.
    if (method == "load_code") {
      console.debug("filtered local load_code call");
      return Promise.resolve({ success: true });
    }
    return old_api(method, args, r_args);
  };
  // Native Adventure Land loaders call load_code(slot). Resolve those calls
  // from the pull-only account CODE mirror so headless execution uses the
  // same character entry file and module slots as the browser client.
  game_context.get_code_file = getLocalCodeFile;
  game_context.get_code_function = function (f_name) {
    return (extensions.runner && extensions.runner[f_name]) || function () {};
  };
  //call_code_function("trigger_character_event","cm",{name:data.name,message:JSON.parse(data.message)});

  vm.runInContext(
    `
  (function() {
    const old_add_log = add_log; 
    add_log = function(msg, col) {
      old_add_log(msg,col);
      for(let [msg, col] of game_logs) {
        caracAL.log.info({col:col, type:"game_logs"}, msg);
      }
      game_logs = [];
    }
  })();
  `,
    game_context,
  );
  //show_json causes a popup so it must be important
  //therefore we use warn level here
  vm.runInContext(
    'show_json = function(json) {caracAL.log.warn({data:json, type:"AL", func:"show_json"});}',
    game_context,
  );
  process.send({ type: "initialized" });
  process.on("message", (m) => {
    switch (m.type) {
      case "siblings_and_acc":
        extensions.siblings = m.siblings;
        game_context.handle_information([m.account]);
        break;
      case "receive_cm":
        game_context.call_code_function("trigger_character_event", "cm", {
          name: m.name,
          message: m.data,
          caracAL: true,
        });
        break;
      case "send_cm":
        game_context.send_code_message(m.to, m.data);
        break;
    }
  });
  vm.runInContext("the_game()", game_context);
  const reload_timeout = 14;
  const reload_task = setTimeout(
    function () {
      console.warn(
        `game not loaded after ${reload_timeout} seconds, reloading`,
      );
      extensions.deploy();
    },
    reload_timeout * 1000 + 100,
  );
  console.log("game instance constructed");
  return game_context;
}
//have to use on, localstorage may send messages
process.on("message", async (msg) => {
  if (msg.type == "process_args") {
    const { cname, clid } = msg.arguments;
    console.debug(
      "starting character thread with arguments: %O",
      msg.arguments,
    );
    const new_log = LogUtils.log.child({ cname, clid });
    LogUtils.log = new_log;
    await make_game(msg.arguments);
  }
});

process.send({
  type: "process_ready",
});
