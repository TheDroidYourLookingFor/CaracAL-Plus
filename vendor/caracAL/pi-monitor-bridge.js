(() => {
  const BUTTON_ID = "pi-monitor-tools-button";
  const MENU_ID = "pi-monitor-tools-menu";
  const OVERLAY_ID = "pi-character-overlay";
  const CHARACTER_WINDOWS_ID = "pi-character-windows";
  const CHARACTER_WINDOW_ATTR = "data-pi-character-window";
  const PI_WINDOW_KIND_ATTR = "data-pi-window-kind";
  const CHARACTER_WINDOW_STATE_PREFIX = "pi-character-window-state:";
  const CHARACTER_WINDOW_LAYOUT_ENDPOINT = "/pi-monitor/window-layout";
  const CHARACTER_CONTROL_ATTR = "data-pi-character-control";
  const CHARACTER_STOP_ATTR = "data-pi-character-stop";
  const CHARACTER_HUB_ATTR = "data-pi-character-hub";
  const CHARACTER_SETTINGS_ATTR = "data-pi-character-settings";
  const CHARACTER_CONTROLS_ID = "pi-character-controls";
  const CHARACTER_SETTINGS_MENU_ID = "pi-character-settings-menu";
  const SETTINGS_PANEL_ID = "pi-character-settings-panel";
  const SETTINGS_ENDPOINT = "/pi-settings/state";
  const CLIENT_UPDATE_CHECK_ENDPOINT = "/pi-client-update/check";
  const CLIENT_UPDATE_APPLY_ENDPOINT = "/pi-client-update/apply";
  const SERVER_LATENCY_ENDPOINT = "/pi-monitor/server-latency";
  const SERVER_LATENCY_PANEL_ID = "pi-server-latency-panel";
  const RESOURCE_PANEL_ID = "pi-resource-panel";
  const RESOURCE_ENDPOINT = "/pi-monitor/resources";
  const PROJECT_DASHBOARD_PATH = "/project-dashboard/";
  const OLLAMA_CHAT_PATH = "/ollama-chat/lan/chat/";
  const OPERATIONS_DASHBOARD_ID = "caracal-operations-dashboard";
  const OPERATIONS_STORAGE_ENDPOINT = "/pi-storage/state";
  const OPERATIONS_STORAGE_SYNC_ENDPOINT = "/pi-storage/sync";
  const OPERATIONS_SESSION_METRICS_RESET_KEY = "CaracAL.Operations.metricsReset";
  const OPERATIONS_ACTIVITY_ENDPOINT = "/pi-monitor/activity";
  const OPERATIONS_STATS_ENDPOINT = "/pi-monitor/stats";
  const OPERATIONS_AUTH_ENDPOINT = "/pi-auth/state";
  const OPERATIONS_GAME_DATA_ENDPOINT = "/pi-game-data/trio";
  const CLIENT_LAUNCH_MODE_STORAGE_KEY = "pi-client-launch-mode";
  const OPTIONAL_MENU_FEATURES_STORAGE_KEY = "pi-optional-menu-features";
  const SCRIPT_DASHBOARD_MENU_ID = "pi-ingame-scripts-menu";
  const INGAME_SCRIPT_DASHBOARDS = [
    { id: "merchant-dashboard", label: "Merchant Dashboard" },
    { id: "merchant-config", label: "Merchant Configuration" },
    { id: "merchant-loot", label: "Merchant V3 Loot Policies" },
    { id: "merchant-upgrade", label: "Merchant V3 Upgrade Rules" },
    { id: "merchant-anniversary", label: "10th Anniversary Event" },
    { id: "merchant-ponty", label: "Merchant V3 Ponty Items" },
    { id: "trio-dashboard", label: "Party Frames / Trio Dashboard" },
    { id: "trio-options", label: "Trio Options" },
    { id: "trio-hunt", label: "Trio Hunt" },
    { id: "trio-hunt-menu", label: "Hunt Menu" },
    { id: "trio-inventory", label: "Trio Inventory" },
    { id: "trio-runtime", label: "Trio Runtime" },
    { id: "trio-stats", label: "Trio Stats" },
    { id: "script-storage", label: "Script Storage" },
  ];
  const boundNames = new WeakSet();
  const controlStates = new Map();
  let settingsSnapshot = null;
  function readOptionalMenuFeatures() {
    const defaults = { ingameScripts: true, projectDashboard: true, ollamaChat: true };
    try {
      const stored = JSON.parse(window.localStorage.getItem(OPTIONAL_MENU_FEATURES_STORAGE_KEY) || "null");
      if (!stored || typeof stored !== "object") return defaults;
      return Object.fromEntries(Object.keys(defaults).map((key) => [key, stored[key] !== false]));
    } catch (_) {
      return defaults;
    }
  }
  const optionalMenuFeatures = readOptionalMenuFeatures();
  function optionalMenuFeatureEnabled(key) {
    return optionalMenuFeatures[key] === true;
  }
  function setOptionalMenuFeature(key, enabled) {
    if (!Object.prototype.hasOwnProperty.call(optionalMenuFeatures, key)) return;
    optionalMenuFeatures[key] = enabled === true;
    try {
      window.localStorage.setItem(OPTIONAL_MENU_FEATURES_STORAGE_KEY, JSON.stringify(optionalMenuFeatures));
    } catch (_) { }
    if (!enabled) {
      if (key === "ingameScripts") {
        closeIngameScriptMenu();
        if (window.PiScriptDashboards && typeof window.PiScriptDashboards.closeAll === "function") {
          window.PiScriptDashboards.closeAll();
        } else {
          document.querySelectorAll(".pi-script-dashboard-window").forEach((panel) => panel.remove());
        }
      } else if (key === "projectDashboard") {
        closeCharacterWindow(findCharacterWindow("Project Dashboard", "project-dashboard"));
      } else if (key === "ollamaChat") {
        closeCharacterWindow(findCharacterWindow("Ollama Chat", "ollama-chat"));
      }
    }
    if (document.getElementById(MENU_ID)) {
      document.getElementById(MENU_ID)?.remove();
      openToolsMenu();
    }
  }
  function readClientLaunchMode() {
    try {
      return window.localStorage.getItem(CLIENT_LAUNCH_MODE_STORAGE_KEY) === "official"
        ? "official"
        : "custom";
    } catch (_) {
      return "custom";
    }
  }
  let clientLaunchMode = readClientLaunchMode();
  let nextWindowZIndex = 2147483000;
  let activeWindowInteraction = null;
  let persistedWindowLayout = null;
  let persistedWindowLayoutReady = false;
  let persistedWindowRestoreAttempted = false;
  let restoringPersistedWindows = false;
  let persistWindowLayoutTimer = null;
  let resourceRefreshTimer = null;
  let scriptDashboardLoadPromise = null;
  let operationsStorageSnapshot = null;
  let operationsStorageRefresh = null;
  const operationsPrevious = new Map();
  const operationsLastSnapshots = new Map();
  const operationsLastBoxes = new Map();
  const operationsActivity = [];
  let operationsActivityLoad = null;
  let operationsStatsLoad = null;
  let operationsStats = [];
  let operationsStatsLastSentAt = 0;
  let operationsHistoryRange = "month";
  let operationsLastGraphDrawAt = 0;
  let operationsLastGraphData = null;
  let operationsGraphMissingSince = 0;
  let operationsActivityHydrated = false;
  let operationsViewOnly = true;
  let operationsAuthLoaded = false;
  let operationsBankViewMode = "tab";
  let operationsTrackerViewMode = "monsters";
  let equipmentWindow = null;

  function operationsMarkLayoutDirty() {
    const dashboard = document.getElementById(OPERATIONS_DASHBOARD_ID);
    if (dashboard) delete dashboard.dataset.layoutKey;
  }

  function operationsRefreshAuthState() {
    return fetch(OPERATIONS_AUTH_ENDPOINT, { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json().catch(() => ({})).then((payload) => {
        if (!response.ok || payload.ok !== true) throw new Error(payload.error || "Authentication state unavailable");
        const nextViewOnly = payload.viewOnly !== false;
        const changed = !operationsAuthLoaded || nextViewOnly !== operationsViewOnly;
        operationsViewOnly = nextViewOnly;
        operationsAuthLoaded = true;
        if (changed) {
          document.getElementById(MENU_ID)?.remove();
          operationsMarkLayoutDirty();
          mountToolsButton();
          bindCharacterNames();
          renderOperationsDashboard();
        }
        return payload;
      }))
      .catch((error) => {
        if (!operationsAuthLoaded || !operationsViewOnly) {
          operationsViewOnly = true;
          operationsAuthLoaded = true;
          document.getElementById(MENU_ID)?.remove();
          operationsMarkLayoutDirty();
          mountToolsButton();
          bindCharacterNames();
          renderOperationsDashboard();
        }
        console.debug("CaracAL monitor authentication state unavailable", error);
        return { ok: false, viewOnly: true };
      });
  }

  function operationsLoadActivity() {
    if (operationsActivityLoad) return operationsActivityLoad;
    operationsActivityLoad = fetch(OPERATIONS_ACTIVITY_ENDPOINT, { cache: "no-store" })
      .then((response) => response.json().catch(() => ({})).then((payload) => {
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Server activity history is unavailable");
        const loaded = Object.entries(payload.characters || {}).flatMap(([name, events]) => (Array.isArray(events) ? events : [])
          .filter((event) => event && event.message && event.time)
          .map((event) => ({ name, message: String(event.message), time: new Date(event.time) }))
          .filter((event) => !Number.isNaN(event.time.getTime())));
        const seen = new Set();
        const merged = [...operationsActivity, ...loaded].filter((event) => {
          const key = `${event.name}\u0000${event.time.toISOString()}\u0000${event.message}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        operationsActivity.splice(0, operationsActivity.length, ...merged);
        operationsTrimActivity();
        operationsActivityHydrated = true;
        operationsSeedActivity();
        renderOperationsDashboard();
      }))
      .catch((error) => {
        operationsActivityHydrated = true;
        console.debug("CaracAL server activity history unavailable", error);
      })
      .finally(() => {
        operationsActivityLoad = null;
      });
    return operationsActivityLoad;
  }

  function operationsPersistActivity(event) {
    if (!event || operationsViewOnly) return;
    fetch(OPERATIONS_ACTIVITY_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ name: event.name, message: event.message, time: event.time.toISOString() }),
    })
      .then((response) => response.json().catch(() => ({})).then((payload) => {
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Server activity history write failed");
      }))
      .catch((error) => console.debug("CaracAL server activity history write unavailable", error));
  }

  function operationsHistorySample(snapshots) {
    const characters = [];
    const seen = new Set();
    snapshots.forEach((snapshot) => {
      const source = snapshot.shared?.metrics && typeof snapshot.shared.metrics === "object"
        ? snapshot.shared.metrics
        : {};
      const trio = snapshot.shared?.trio && typeof snapshot.shared.trio === "object" ? snapshot.shared.trio : null;
      const metrics = trio && (trio.history || trio.killsByMonster || trio.loot)
        ? operationsGraphFromTrio(trio, snapshot.shared?.loot)
        : operationsGraphNormalizeMetrics(source);
      const name = String(snapshot.name || metrics.characterName || "Unknown").slice(0, 160);
      if (seen.has(name)) return;
      seen.add(name);
      characters.push({
        name,
        role: snapshot.role || "",
        startedAt: metrics.startedAt || source.startedAt || source.sessionStartedAt || "",
        goldEarned: metrics.lootGold || 0,
        goldBanked: Number(source.goldBanked ?? trio?.goldBanked) || 0,
        xpGained: metrics.xpGained || 0,
        kills: metrics.kills || Object.values(metrics.mobKills || {}).reduce((sum, value) => sum + (Number(value) || 0), 0),
        mobKills: metrics.mobKills || {},
        itemCounts: metrics.itemCounts || {},
        damage: metrics.damage || {},
      });
    });
    if (!characters.length) return null;
    const startedAt = characters.map((character) => operationsTimestamp(character.startedAt)).filter(Number.isFinite).sort((a, b) => a - b)[0] || 0;
    const sessionKey = `${characters.map((character) => character.name).sort().join(",")}|${startedAt || "unknown"}`;
    const minute = Math.floor(Date.now() / 60000) * 60000;
    return { at: new Date(minute).toISOString(), sessionKey, characters };
  }

  function operationsLoadStats() {
    if (operationsStatsLoad) return operationsStatsLoad;
    operationsStatsLoad = fetch(OPERATIONS_STATS_ENDPOINT, { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json().catch(() => ({})).then((payload) => {
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Server statistics history is unavailable");
        operationsStats = Array.isArray(payload.samples) ? payload.samples : [];
        const dashboard = document.getElementById(OPERATIONS_DASHBOARD_ID);
        if (dashboard) operationsUpdateHistoryPanel(dashboard, dashboard._caracalSnapshots || []);
      }))
      .catch((error) => console.debug("CaracAL server statistics history unavailable", error))
      .finally(() => { operationsStatsLoad = null; });
    return operationsStatsLoad;
  }

  function operationsPersistStats(snapshots) {
    if (operationsViewOnly || Date.now() - operationsStatsLastSentAt < 55000) return;
    const sample = operationsHistorySample(snapshots);
    if (!sample) return;
    operationsStatsLastSentAt = Date.now();
    fetch(OPERATIONS_STATS_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(sample),
      keepalive: true,
    }).catch((error) => console.debug("CaracAL server statistics history write unavailable", error));
    operationsStats.push(sample);
    operationsStats = operationsStats.slice(-52560);
  }

  function operationsTrimActivity() {
    const perCharacter = new Map();
    operationsActivity
      .slice()
      .sort((left, right) => right.time.getTime() - left.time.getTime())
      .forEach((event) => {
        const events = perCharacter.get(event.name) || [];
        if (events.length < 25) events.push(event);
        perCharacter.set(event.name, events);
      });
    const trimmed = Array.from(perCharacter.values()).flat().sort((left, right) => right.time.getTime() - left.time.getTime());
    operationsActivity.splice(0, operationsActivity.length, ...trimmed);
  }

  function operationsSeedActivity() {
    const snapshots = Array.from(document.querySelectorAll(".botUIContainer > .box")).map(operationsSnapshot);
    const seeded = [];
    snapshots.forEach((snapshot) => {
      if (!snapshot || !snapshot.name || operationsActivity.some((event) => event.name === snapshot.name)) return;
      const event = { name: snapshot.name, message: "Monitor connected", time: new Date() };
      operationsActivity.unshift(event);
      seeded.push(event);
    });
    if (!seeded.length) return;
    operationsTrimActivity();
    seeded.forEach(operationsPersistActivity);
  }

  function clientLaunchModeLabel() {
    return clientLaunchMode === "official"
      ? "Official Adventure Land"
      : "Pi custom client · shared server storage";
  }

  function clientLaunchModeTitle() {
    return clientLaunchMode === "official"
      ? "New client launches use Official Adventure Land and its separate browser storage. Click to switch to the Pi custom client."
      : "New client launches use the Pi custom client and shared server storage. Click to switch to Official Adventure Land.";
  }

  function setClientLaunchMode(button) {
    clientLaunchMode = clientLaunchMode === "custom" ? "official" : "custom";
    try { window.localStorage.setItem(CLIENT_LAUNCH_MODE_STORAGE_KEY, clientLaunchMode); } catch (_) { }
    if (button) {
      button.textContent = "Launch clients: " + clientLaunchModeLabel();
      button.title = clientLaunchModeTitle();
      button.setAttribute("aria-pressed", String(clientLaunchMode === "official"));
    }
  }

  function style(element, values) {
    Object.assign(element.style, values);
    return element;
  }

  const MONITOR_TILE_STYLE_ID = "caracal-party-frame-tile-styles";
  const SPRITE_ORIGIN = "https://adventure.land";
  const SPRITE_RENDERER_FILE_SETS = [
    [
      "/pi-sprite/common-functions.js",
      "/pi-sprite/legacy-functions.js",
      "/pi-sprite/data.js",
      "/pi-sprite/html.js",
    ],
    [
      "/js/common_functions.js",
      "/js/old_common_functions.js",
      "/data.js",
      "/js/html.js",
    ],
  ];
  let spriteRendererPromise = null;
  let operationsCatalogLoad = null;
  let operationsCatalogItems = [];
  let operationsCatalogMonsters = [];
  let operationsTrackerCatalogAttempted = false;
  const OPERATIONS_CATALOG_ALIASES = {
    ringjs: "ringsj",
    npbelt: "hpbelt",
    rawemerald: "gem0",
  };

  function installPartyFrameTileStyles() {
    document.body.classList.add("caracal-monitor-page");
    if (document.getElementById(MONITOR_TILE_STYLE_ID)) return;
    const styleNode = document.createElement("style");
    styleNode.id = MONITOR_TILE_STYLE_ID;
    styleNode.textContent = `
      body.caracal-monitor-page {
        padding-top: 56px !important;
        box-sizing: border-box;
      }
      body.caracal-monitor-page .botUIContainer {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 0 8px 12px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box {
        box-sizing: border-box !important;
        display: block !important;
        flex: 1 1 255px !important;
        min-width: 235px !important;
        max-width: 315px !important;
        margin: 0 !important;
        padding: 5px !important;
        border: 3px solid #929292 !important;
        border-radius: 0 !important;
        background: #050505 !important;
        box-shadow: 0 0 0 1px #202020, 0 2px 0 #000 !important;
        vertical-align: top !important;
      }
      body.caracal-monitor-page .botUIContainer > .caracal-ops-paused-placeholder {
        position: relative !important;
        border-color: #b58b3e !important;
        opacity: .92;
      }
      body.caracal-monitor-page .caracal-paused-banner {
        grid-column: 1 / -1 !important;
        margin: 8px 0 2px !important;
        padding: 7px 9px !important;
        border: 1px solid #b58b3e !important;
        border-radius: 5px !important;
        background: #2a2111 !important;
        color: #f4d17a !important;
        font: 700 12px/16px system-ui, "Segoe UI", sans-serif !important;
        letter-spacing: .04em !important;
        text-align: center !important;
        text-transform: uppercase !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .boxRow {
        box-sizing: border-box !important;
        margin: 2px 0 !important;
        line-height: 16px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .name {
        display: block !important;
        min-height: 18px !important;
        border-bottom: 1px solid #6d6d6d !important;
        font-size: 18px !important;
        line-height: 18px !important;
        text-align: center !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .name .textDisplayLabel {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .name .textDisplayValue {
        display: block !important;
        float: none !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .realm,
      body.caracal-monitor-page .botUIContainer > .box .not_rip,
      body.caracal-monitor-page .botUIContainer > .box .level,
      body.caracal-monitor-page .botUIContainer > .box .class_name {
        min-height: 15px !important;
        border-bottom: 1px dotted #444 !important;
        font-size: 13px !important;
        line-height: 15px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay {
        margin: 3px 0 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay .border {
        height: 20px !important;
        border: 3px solid #858585 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay .barLabel {
        top: -20px !important;
        height: 20px !important;
        overflow: hidden !important;
        font-size: 15px !important;
        line-height: 20px !important;
        text-align: center !important;
        text-shadow: 1px 1px #000 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay .barLabel .value {
        display: inline !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay:not(.name):not(.realm):not(.not_rip):not(.level) {
        display: grid !important;
        grid-template-columns: max-content minmax(0, 1fr) !important;
        gap: 6px !important;
        min-height: 16px !important;
        border-bottom: 1px dotted #393939 !important;
        font-size: 14px !important;
        line-height: 16px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay:not(.name):not(.realm):not(.not_rip):not(.level) .textDisplayValue {
        float: none !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-align: right !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .current_status .textDisplayValue {
        color: #f6d36a !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .sprite_skin,
      body.caracal-monitor-page .botUIContainer > .box .sprite_ctype,
      body.caracal-monitor-page .botUIContainer > .box .sprite_cx,
      body.caracal-monitor-page .botUIContainer > .box .sprite_cosmetic_head_y {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
        min-width: 0 !important;
        height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
      }
      .caracal-party-portrait {
        position: relative !important;
        width: 56px !important;
        height: 58px !important;
        margin: 0 auto 3px !important;
        overflow: hidden !important;
        background: #050505 !important;
        image-rendering: pixelated !important;
      }
      .caracal-party-portrait-fallback {
        display: grid !important;
        width: 100% !important;
        height: 100% !important;
        place-items: center !important;
        color: #d9d9d9 !important;
        font-size: 22px !important;
        text-transform: uppercase !important;
      }
      .caracal-party-portrait img {
        image-rendering: pixelated !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .minimap {
        margin-top: 5px !important;
        border-top: 1px solid #555 !important;
        padding-top: 4px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .minimap img {
        display: block !important;
        width: 100% !important;
        height: 220px !important;
        max-height: none !important;
        object-fit: fill !important;
        image-rendering: pixelated !important;
      }

      /* Party-frame presentation: keep every existing monitor field, but
         present the character header and vitals like the in-game frames. */
      body.caracal-monitor-page {
        background: #070b12 !important;
        color: #edf4f7 !important;
        font-family: system-ui, "Segoe UI", sans-serif !important;
      }
      body.caracal-monitor-page .botUIContainer {
        display: grid !important;
        grid-template-columns: repeat(var(--caracal-character-columns, 1), minmax(0, 1fr)) !important;
        align-items: stretch !important;
        box-sizing: border-box !important;
        width: min(1840px, calc(100vw - 28px)) !important;
        max-width: none !important;
        margin: 0 auto !important;
        padding: 12px 0 24px !important;
        gap: 12px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box {
        position: relative !important;
        min-width: 0 !important;
        max-width: none !important;
        width: auto !important;
        flex: none !important;
        padding: 14px !important;
        border: 1px solid #315164 !important;
        border-left: 4px solid #28c7b2 !important;
        border-radius: 10px !important;
        background: linear-gradient(180deg, #111b29 0%, #0b121d 100%) !important;
        box-shadow: 0 8px 26px rgba(0, 0, 0, .35) !important;
        font-family: system-ui, "Segoe UI", sans-serif !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      body.caracal-monitor-page .botUIContainer > .box,
      body.caracal-monitor-page .botUIContainer > .caracal-character-activity {
        width: 100% !important;
        align-self: stretch !important;
      }
      body.caracal-monitor-page .caracal-character-activity {
        box-sizing: border-box;
        min-width: 0;
        padding: 12px 13px;
        border: 1px solid #2c4355;
        border-top: 2px solid #2c9eaa;
        border-radius: 10px;
        background: linear-gradient(180deg, #101d29 0%, #0b141f 100%);
        box-shadow: 0 6px 18px rgba(0, 0, 0, .2);
        color: #dbe8ec;
      }
      body.caracal-monitor-page .caracal-character-activity-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      body.caracal-monitor-page .caracal-character-activity-title {
        min-width: 0;
        overflow: hidden;
        color: #69d7df;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .11em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }
      body.caracal-monitor-page .caracal-character-activity-live {
        flex: 0 0 auto;
        color: #7ce8ae;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .05em;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-character-activity-current {
        margin-top: 9px;
        padding: 9px 10px;
        border: 1px solid #1a6670;
        border-radius: 7px;
        background: #0c252d;
      }
      body.caracal-monitor-page .caracal-character-activity-current-label {
        color: #8fb7c1;
        font-size: 10px;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-character-activity-current-value {
        margin-top: 3px;
        color: #f3f8fa;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-character-activity-meta {
        margin-top: 4px;
        color: #8fa8b4;
        font-size: 10px;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-character-activity-history {
        display: grid;
        gap: 4px;
        height: 220px;
        min-height: 220px;
        max-height: 220px;
        margin-top: 9px;
        overflow-y: auto;
        overflow-anchor: none;
        padding-right: 4px;
        scrollbar-color: #2c6674 #08131b;
        scrollbar-width: thin;
      }
      body.caracal-monitor-page .caracal-character-activity-event {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr);
        gap: 7px;
        padding-top: 4px;
        border-top: 1px solid rgba(101, 137, 156, .16);
        color: #c8d6dc;
        font-size: 10px;
        line-height: 1.3;
      }
      body.caracal-monitor-page .caracal-character-activity-event-time {
        color: #77c9d2;
      }
      body.caracal-monitor-page .caracal-character-activity-event-message {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-party-portrait {
        position: absolute !important;
        left: 14px !important;
        top: 12px !important;
        width: 102px !important;
        height: 118px !important;
        margin: 0 !important;
        border: 1px solid #235e6b !important;
        border-radius: 8px !important;
        background: #08131b !important;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.04) !important;
        display: flex !important;
        align-items: flex-end !important;
        justify-content: center !important;
        overflow: visible !important;
        z-index: 4 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-party-portrait {
        cursor: pointer !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-party-portrait:focus-visible {
        outline: 2px solid #ffd34e !important;
        outline-offset: 2px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-party-portrait > div:not(.caracal-party-portrait-fallback) {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        transform: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-party-portrait-fallback {
        color: #9db4c2 !important;
        font: 700 18px system-ui, "Segoe UI", sans-serif !important;
      }
      body.caracal-monitor-page .caracal-equipment-modal {
        position: fixed;
        inset: 0;
        z-index: 2147482500;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(0, 0, 0, .68);
      }
      body.caracal-monitor-page .caracal-equipment-window {
        box-sizing: border-box;
        width: min(382px, calc(100vw - 36px));
        max-height: min(560px, calc(100vh - 36px));
        overflow: auto;
        padding: 10px;
        border: 3px solid #888;
        border-radius: 2px;
        background: #050505;
        color: #fff;
        box-shadow: 0 12px 34px rgba(0, 0, 0, .8);
        font-family: system-ui, "Segoe UI", sans-serif;
      }
      body.caracal-monitor-page .caracal-equipment-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }
      body.caracal-monitor-page .caracal-equipment-title {
        min-width: 0;
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-equipment-close {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        border: 1px solid #777;
        border-radius: 2px;
        background: #171717;
        color: #fff;
        cursor: pointer;
        font-size: 18px;
        line-height: 24px;
      }
      body.caracal-monitor-page .caracal-equipment-close:hover,
      body.caracal-monitor-page .caracal-equipment-close:focus-visible {
        border-color: #ffd34e;
        color: #ffd34e;
        outline: none;
      }
      body.caracal-monitor-page .caracal-equipment-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(56px, 1fr));
        gap: 4px;
      }
      body.caracal-monitor-page .caracal-equipment-slot {
        position: relative;
        aspect-ratio: 1;
        min-width: 0;
        min-height: 56px;
        box-sizing: border-box;
        border: 2px solid #777;
        background: #080808;
        color: #fff;
        overflow: hidden;
      }
      body.caracal-monitor-page .caracal-equipment-slot.empty {
        border-color: #555;
      }
      body.caracal-monitor-page .caracal-equipment-slot-icon {
        display: grid;
        width: 100%;
        height: 100%;
        place-items: center;
        overflow: hidden;
        image-rendering: pixelated;
      }
      body.caracal-monitor-page .caracal-equipment-slot-icon > * {
        max-width: 100%;
        max-height: 100%;
        image-rendering: pixelated;
      }
      body.caracal-monitor-page .caracal-equipment-slot-level,
      body.caracal-monitor-page .caracal-equipment-slot-quantity {
        position: absolute;
        z-index: 2;
        min-width: 14px;
        padding: 0 2px;
        background: rgba(0, 0, 0, .8);
        color: #fff;
        font: 700 11px/14px ui-monospace, SFMono-Regular, Consolas, monospace;
        text-align: center;
        text-shadow: 1px 1px #000;
      }
      body.caracal-monitor-page .caracal-equipment-slot-level {
        top: 0;
        left: 0;
        color: #f6d36a;
      }
      body.caracal-monitor-page .caracal-equipment-slot-quantity {
        right: 0;
        bottom: 0;
      }
      body.caracal-monitor-page .caracal-equipment-slot-label {
        position: absolute;
        right: 2px;
        bottom: 1px;
        left: 2px;
        overflow: hidden;
        color: #dce6ea;
        font: 600 8px/10px system-ui, "Segoe UI", sans-serif;
        text-align: center;
        text-overflow: ellipsis;
        text-shadow: 1px 1px #000;
        white-space: nowrap;
      }
      body.caracal-monitor-page .botUIContainer > .box .name {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        min-height: 31px !important;
        margin-left: 120px !important;
        border: 0 !important;
        color: #f5f8fa !important;
        font: 700 18px/22px system-ui, "Segoe UI", sans-serif !important;
        text-align: left !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .name .textDisplayValue {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        color: #f5f8fa !important;
        font: inherit !important;
        text-align: left !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .name button {
        flex: 0 0 auto !important;
        width: 27px !important;
        min-width: 27px !important;
        height: 25px !important;
        margin: 0 0 0 2px !important;
        padding: 0 !important;
        border: 1px solid #456276 !important;
        border-radius: 5px !important;
        background: #172535 !important;
        color: #bfe9f0 !important;
        font: 13px/23px system-ui, "Segoe UI", sans-serif !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .realm,
      body.caracal-monitor-page .botUIContainer > .box .not_rip,
      body.caracal-monitor-page .botUIContainer > .box .level {
        margin-left: 120px !important;
        border: 0 !important;
        color: #8da3b2 !important;
        font: 12px/17px system-ui, "Segoe UI", sans-serif !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .realm .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .not_rip .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .level .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .class_name .textDisplayValue {
        color: #e2edf1 !important;
        font-weight: 650 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay {
        clear: both !important;
        margin: 9px 0 0 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay .border {
        height: 15px !important;
        border: 1px solid #4d6170 !important;
        border-radius: 4px !important;
        background: #0a0f16 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay .barLabel {
        top: -18px !important;
        height: 15px !important;
        font: 650 12px/15px system-ui, "Segoe UI", sans-serif !important;
        text-shadow: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay:not(.name):not(.realm):not(.not_rip):not(.level) {
        min-height: 20px !important;
        border-bottom: 1px solid rgba(112, 145, 161, .16) !important;
        color: #8da3b2 !important;
        font: 12px/20px system-ui, "Segoe UI", sans-serif !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay:not(.name):not(.realm):not(.not_rip):not(.level) .textDisplayValue {
        color: #eef4f5 !important;
        font-weight: 600 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .current_status {
        margin: 12px 0 4px !important;
        padding: 8px 10px !important;
        border: 1px solid #1a6670 !important;
        border-radius: 7px !important;
        background: #0c252d !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .current_status .textDisplayValue {
        color: #8fe7dc !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .minimap {
        display: flex !important;
        box-sizing: border-box !important;
        width: 100% !important;
        height: 220px !important;
        min-height: 220px !important;
        margin-top: auto !important;
        align-self: end !important;
        overflow: hidden !important;
        border-top: 1px solid rgba(112, 145, 161, .3) !important;
        padding-top: 8px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box {
        padding-bottom: 246px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .minimap {
        position: absolute !important;
        left: 14px !important;
        right: 14px !important;
        bottom: 14px !important;
        width: auto !important;
        height: 220px !important;
        min-height: 220px !important;
        margin: 0 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .minimap img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-height: none !important;
        object-fit: fill !important;
        image-rendering: pixelated !important;
      }

      /* Crown-style telemetry: keep the full monitor data, but make the
         high-value fields read like a compact operations card. */
      body.caracal-monitor-page .botUIContainer > .box {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        column-gap: 9px !important;
        row-gap: 0 !important;
        align-content: start !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-party-portrait,
      body.caracal-monitor-page .botUIContainer > .box .name,
      body.caracal-monitor-page .botUIContainer > .box .realm,
      body.caracal-monitor-page .botUIContainer > .box .server,
      body.caracal-monitor-page .botUIContainer > .box .location,
      body.caracal-monitor-page .botUIContainer > .box .not_rip,
      body.caracal-monitor-page .botUIContainer > .box .level,
      body.caracal-monitor-page .botUIContainer > .box .class_name,
      body.caracal-monitor-page .botUIContainer > .box .uptime,
      body.caracal-monitor-page .botUIContainer > .box .progressBarDisplay,
      body.caracal-monitor-page .botUIContainer > .box .current_status,
      body.caracal-monitor-page .botUIContainer > .box .location,
      body.caracal-monitor-page .botUIContainer > .box .connection,
      body.caracal-monitor-page .botUIContainer > .box .modifiers,
      body.caracal-monitor-page .botUIContainer > .box .minimap {
        grid-column: 1 / -1 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-party-portrait {
        grid-row: 1 / span 5 !important;
        grid-column: 1 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .name,
      body.caracal-monitor-page .botUIContainer > .box .realm,
      body.caracal-monitor-page .botUIContainer > .box .server,
      body.caracal-monitor-page .botUIContainer > .box .location,
      body.caracal-monitor-page .botUIContainer > .box .not_rip,
      body.caracal-monitor-page .botUIContainer > .box .class_name,
      body.caracal-monitor-page .botUIContainer > .box .uptime {
        display: block !important;
        grid-column: 1 / -1 !important;
        margin-left: 120px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .level {
        position: absolute !important;
        top: 12px !important;
        right: 14px !important;
        z-index: 5 !important;
        display: flex !important;
        align-items: center !important;
        width: auto !important;
        min-height: 24px !important;
        margin: 0 !important;
        border: 0 !important;
        color: #8da3b2 !important;
        font: 750 17px/22px system-ui, "Segoe UI", sans-serif !important;
        letter-spacing: .04em !important;
        text-transform: uppercase !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .level .textDisplayLabel {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .level .textDisplayValue {
        color: #e2edf1 !important;
        font-weight: 800 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .level .textDisplayValue::before {
        content: "LV " !important;
        color: #8da3b2 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gold,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.party_leader,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.target,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ping,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gph,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpph,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ttlu,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.goldm,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpm,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.luckm,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.cc {
        display: block !important;
        min-width: 0 !important;
        min-height: 43px !important;
        box-sizing: border-box !important;
        padding: 7px 3px 5px !important;
        border-top: 1px solid rgba(112, 145, 161, .2) !important;
        border-bottom: 0 !important;
        overflow: hidden !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gold .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.party_leader .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.target .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ping .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gph .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpph .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ttlu .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.goldm .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpm .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.luckm .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.cc .textDisplayLabel {
        display: block !important;
        margin-bottom: 3px !important;
        color: #8197a8 !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: .08em !important;
        line-height: 12px !important;
        text-transform: uppercase !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gold .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.party_leader .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.target .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ping .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gph .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpph .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ttlu .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.goldm .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpm .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.luckm .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.cc .textDisplayValue {
        display: block !important;
        max-width: 100% !important;
        color: #edf4f7 !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        line-height: 17px !important;
        overflow: visible !important;
        overflow-wrap: anywhere !important;
        text-align: left !important;
        text-overflow: clip !important;
        white-space: normal !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.party_leader {
        grid-column: span 2 !important;
        min-width: 0 !important;
        overflow: visible !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.party_leader .textDisplayValue {
        overflow: visible !important;
        overflow-wrap: anywhere !important;
        text-overflow: clip !important;
        white-space: normal !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gold .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.goldm .textDisplayLabel {
        color: #ffd34e !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ping .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ping .textDisplayValue {
        color: #36d7e8 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.target .textDisplayLabel {
        color: #f06b78 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.gph .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.ttlu .textDisplayLabel {
        color: #ffcf4f !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpph .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.xpm .textDisplayLabel {
        color: #58a9ff !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.luckm .textDisplayLabel {
        color: #52dc7a !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.cc .textDisplayLabel {
        color: #d7dee5 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .name::before {
        content: "" !important;
        display: inline-block !important;
        width: 8px !important;
        height: 8px !important;
        flex: 0 0 8px !important;
        border-radius: 50% !important;
        background: #39d98a !important;
        box-shadow: 0 0 8px rgba(57, 217, 138, .65) !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .server .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .location .textDisplayValue {
        color: #86c5d5 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .uptime .textDisplayValue {
        color: #9fb4c1 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplayValue {
        overflow: visible !important;
        overflow-wrap: anywhere !important;
        text-overflow: clip !important;
        white-space: normal !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.server,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.uptime,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.location,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.connection {
        min-height: 20px !important;
        border-bottom: 1px solid rgba(112, 145, 161, .16) !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.modifiers {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.connection {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.hp_potions,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.mp_potions {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.nearby {
        display: none !important;
        grid-column: 1 / -1 !important;
        min-width: 0 !important;
        overflow: hidden !important;
        padding: 7px 3px 5px !important;
        border-top: 1px solid rgba(112, 145, 161, .2) !important;
        border-bottom: 0 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.nearby .textDisplayLabel {
        display: block !important;
        margin-bottom: 3px !important;
        color: #36d7e8 !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: .08em !important;
        line-height: 12px !important;
        text-transform: uppercase !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.nearby .textDisplayValue {
        display: block !important;
        min-width: 0 !important;
        overflow: hidden !important;
        color: #edf4f7 !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        line-height: 17px !important;
        text-align: left !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.realm {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.effects,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.inventory_items,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.inventory_slots,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.dps_estimate {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-details {
        grid-column: 1 / -1 !important;
        min-width: 0 !important;
        margin-top: 10px !important;
        padding-top: 8px !important;
        border-top: 1px solid rgba(112, 145, 161, .3) !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-section {
        min-width: 0 !important;
        margin-top: 7px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-section:first-child {
        margin-top: 0 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-label {
        margin-bottom: 4px !important;
        color: #69d7df !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        letter-spacing: .1em !important;
        line-height: 13px !important;
        text-transform: uppercase !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-list {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 5px !important;
        min-width: 0 !important;
        overflow: visible !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-chip {
        display: inline-flex !important;
        position: relative !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 0 !important;
        width: 36px !important;
        height: 36px !important;
        min-height: 36px !important;
        padding: 2px !important;
        border: 1px solid rgba(101, 137, 156, .38) !important;
        border-radius: 6px !important;
        background: rgba(8, 15, 24, .62) !important;
        color: #dce8ec !important;
        font: inherit !important;
        line-height: 1 !important;
        cursor: pointer !important;
        appearance: none !important;
        -webkit-appearance: none !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        transition: border-color .15s ease, background .15s ease, transform .15s ease !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-chip:hover,
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-chip:focus-visible,
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-chip.is-open {
        border-color: #69d7df !important;
        background: rgba(11, 44, 54, .9) !important;
        outline: none !important;
        transform: translateY(-1px) !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-icon {
        display: grid !important;
        flex: 0 0 32px !important;
        width: 32px !important;
        height: 32px !important;
        place-items: center !important;
        overflow: hidden !important;
        border-radius: 4px !important;
        background: #05090e !important;
        color: #91a8b4 !important;
        font-size: 9px !important;
        font-weight: 800 !important;
        text-align: center !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-icon img {
        display: block !important;
        max-width: none !important;
        max-height: none !important;
        image-rendering: pixelated !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-chip-text {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-chip-popup {
        position: absolute !important;
        z-index: 30 !important;
        left: 50% !important;
        bottom: calc(100% + 7px) !important;
        display: block !important;
        max-width: min(260px, calc(100vw - 40px)) !important;
        padding: 5px 7px !important;
        border: 1px solid rgba(105, 215, 223, .72) !important;
        border-radius: 5px !important;
        background: #07131b !important;
        box-shadow: 0 5px 16px rgba(0, 0, 0, .4) !important;
        color: #f3f8fa !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        line-height: 13px !important;
        text-align: center !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        pointer-events: none !important;
        transform: translateX(-50%) !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-chip-popup[hidden] {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-empty {
        color: #8da3b2 !important;
        font-size: 10px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-grid {
        display: grid !important;
        grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
        gap: 4px !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-slot {
        position: relative !important;
        display: grid !important;
        place-items: center !important;
        aspect-ratio: 1 !important;
        min-width: 0 !important;
        min-height: 34px !important;
        padding: 2px !important;
        border: 1px solid rgba(151, 164, 176, .78) !important;
        border-radius: 0 !important;
        background: rgba(0, 0, 0, .56) !important;
        color: #dce8ec !important;
        cursor: pointer !important;
        appearance: none !important;
        -webkit-appearance: none !important;
        box-sizing: border-box !important;
        overflow: visible !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-slot:disabled {
        cursor: default !important;
        opacity: .92 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-slot:not(:disabled):hover,
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-slot:not(:disabled):focus-visible,
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-slot.is-open {
        border-color: #69d7df !important;
        background: rgba(11, 44, 54, .9) !important;
        outline: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-icon {
        display: grid !important;
        place-items: center !important;
        width: 42px !important;
        height: 42px !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        color: #91a8b4 !important;
        font-size: 8px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-align: center !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-icon img {
        display: block !important;
        max-width: none !important;
        max-height: none !important;
        image-rendering: pixelated !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-quantity,
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-level {
        position: absolute !important;
        z-index: 2 !important;
        padding: 0 2px !important;
        border-radius: 2px !important;
        background: rgba(0, 0, 0, .78) !important;
        color: #f5f8fa !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        line-height: 13px !important;
        text-shadow: 1px 1px #000 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-quantity {
        right: 1px !important;
        bottom: 1px !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-level {
        left: 1px !important;
        top: 1px !important;
        color: #ffe183 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-name {
        position: absolute !important;
        z-index: 30 !important;
        left: 50% !important;
        bottom: calc(100% + 7px) !important;
        display: block !important;
        max-width: min(260px, calc(100vw - 40px)) !important;
        padding: 5px 7px !important;
        border: 1px solid rgba(105, 215, 223, .72) !important;
        border-radius: 5px !important;
        background: #07131b !important;
        box-shadow: 0 5px 16px rgba(0, 0, 0, .4) !important;
        color: #f3f8fa !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        line-height: 13px !important;
        text-align: center !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        pointer-events: none !important;
        transform: translateX(-50%) !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-inventory-name[hidden] {
        display: none !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-dps {
        color: #f0c766 !important;
        font-size: 12px !important;
        font-weight: 750 !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .caracal-tile-detail-target {
        color: #f3f8fa !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        overflow-wrap: anywhere !important;
      }
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.server .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.uptime .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.location .textDisplayLabel,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.server .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.uptime .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.location .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.connection .textDisplayValue,
      body.caracal-monitor-page .botUIContainer > .box .textDisplay.modifiers .textDisplayValue {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
      }
      @media (max-width: 820px) {
        body.caracal-monitor-page .botUIContainer > .box {
          min-width: min(350px, calc(100vw - 34px)) !important;
        }
      }

      /* Operations dashboard inspired by the richer party-console layouts.
         It is deliberately fed from the existing monitor tiles so it remains
         read-only and does not change any in-game script. */
      body.caracal-monitor-page #${OPERATIONS_DASHBOARD_ID} {
        box-sizing: border-box;
        width: min(1840px, calc(100vw - 28px));
        margin: 0 auto 18px;
        color: #e7eef3;
        font-family: system-ui, "Segoe UI", sans-serif;
      }
      body.caracal-monitor-page .caracal-ops-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        padding: 0 2px 11px;
        border-bottom: 1px solid rgba(94, 132, 151, .32);
      }
      body.caracal-monitor-page .caracal-ops-heading {
        min-width: 170px;
        flex: 1 1 190px;
      }
      body.caracal-monitor-page .caracal-ops-header-actions {
        display: flex;
        flex: 2 1 760px;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }
      body.caracal-monitor-page .caracal-ops-header-action {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 32px;
        padding: 6px 9px;
        border: 1px solid #315164;
        border-radius: 9px;
        background: rgba(12, 24, 36, .8);
        color: #c9e8ed;
        cursor: pointer;
        font: 650 11px/16px system-ui, "Segoe UI", sans-serif;
        white-space: nowrap;
        transition: border-color .15s ease, background .15s ease, color .15s ease, transform .15s ease;
      }
      body.caracal-monitor-page .caracal-ops-header-action:hover,
      body.caracal-monitor-page .caracal-ops-header-action:focus-visible {
        border-color: #69d7df;
        background: #12313a;
        color: #fff;
        outline: none;
        transform: translateY(-1px);
      }
      body.caracal-monitor-page .caracal-ops-header-action:disabled,
      body.caracal-monitor-page .caracal-ops-header-action.view-only {
        border-color: #3b4650 !important;
        background: rgba(32, 39, 45, .72) !important;
        color: #7f8a91 !important;
        cursor: not-allowed;
        opacity: .72;
        transform: none;
      }
      body.caracal-monitor-page .caracal-ops-header-action.mail { border-color: #347b9c; color: #9cddf5; }
      body.caracal-monitor-page .caracal-ops-header-action.catalog { border-color: #2b95a5; color: #78e7ef; }
      body.caracal-monitor-page .caracal-ops-header-action.bestiary { border-color: #a74b68; color: #ff9fb8; }
      body.caracal-monitor-page .caracal-ops-header-action.skills { border-color: #7f56b4; color: #c9a9ff; }
      body.caracal-monitor-page .caracal-ops-header-action.stand { border-color: #a8791d; color: #ffd66b; }
      body.caracal-monitor-page .caracal-ops-header-action.market { border-color: #2b95a5; color: #78e7ef; }
      body.caracal-monitor-page .caracal-ops-header-action.bank { border-color: #258e72; color: #7eeac1; }
      body.caracal-monitor-page .caracal-ops-header-action.logs { border-color: #586b7c; color: #c6d5df; }
      body.caracal-monitor-page .caracal-ops-header-action.settings { border-color: #586b7c; color: #c6d5df; }
      body.caracal-monitor-page .caracal-ops-header-icon {
        display: inline-grid;
        width: 16px;
        place-items: center;
        font-size: 14px;
        line-height: 16px;
      }
      body.caracal-monitor-page .caracal-ops-account-gold {
        min-width: 108px;
        padding-left: 8px;
        border-left: 1px solid rgba(94, 132, 151, .35);
        color: #ffd34e;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        text-align: right;
        white-space: nowrap;
      }
      body.caracal-monitor-page .caracal-ops-account-gold-main {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 5px;
        font-size: 13px;
        font-weight: 800;
      }
      body.caracal-monitor-page .caracal-ops-account-gold-total {
        margin-top: 2px;
        color: #e7bd40;
        font-size: 10px;
      }
      body.caracal-monitor-page .caracal-ops-eyebrow,
      body.caracal-monitor-page .caracal-ops-section-title,
      body.caracal-monitor-page .caracal-ops-label {
        color: #69d7df;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .13em;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-ops-title {
        margin: 0;
        color: #f5f8fa;
        font-size: clamp(24px, 3vw, 42px);
        font-weight: 750;
        letter-spacing: -.035em;
        line-height: 1.05;
      }
      body.caracal-monitor-page .caracal-ops-subtitle,
      body.caracal-monitor-page .caracal-ops-muted {
        color: #8fa5b3;
        font-size: 12px;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-uptime {
        min-width: 130px;
        text-align: right;
      }
      body.caracal-monitor-page .caracal-ops-uptime-value {
        margin-top: 4px;
        color: #f5f8fa;
        font-size: 20px;
        font-weight: 750;
      }
      body.caracal-monitor-page .caracal-ops-summary-grid,
      body.caracal-monitor-page .caracal-ops-character-grid,
      body.caracal-monitor-page .caracal-ops-metric-grid {
        display: grid;
        gap: 12px;
      }
      body.caracal-monitor-page .caracal-ops-summary-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 16px 0 22px;
      }
      body.caracal-monitor-page .caracal-ops-summary-card,
      body.caracal-monitor-page .caracal-ops-panel,
      body.caracal-monitor-page .caracal-ops-character {
        box-sizing: border-box;
        border: 1px solid #2c4355;
        border-radius: 10px;
        background: linear-gradient(180deg, #111d2b 0%, #0c1520 100%);
        box-shadow: 0 8px 24px rgba(0, 0, 0, .22);
      }
      body.caracal-monitor-page .caracal-ops-summary-card {
        min-height: 78px;
        padding: 13px 15px;
      }
      body.caracal-monitor-page .caracal-ops-summary-value {
        margin-top: 5px;
        color: #f4f8fa;
        font-size: 23px;
        font-weight: 750;
        line-height: 1.1;
      }
      body.caracal-monitor-page .caracal-ops-character-grid {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }
      body.caracal-monitor-page .caracal-ops-character {
        min-width: 0;
        padding: 13px;
      }
      body.caracal-monitor-page .caracal-ops-character-head {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      body.caracal-monitor-page .caracal-ops-avatar {
        display: grid;
        flex: 0 0 54px;
        width: 54px;
        height: 58px;
        place-items: center;
        overflow: hidden;
        border: 1px solid #2c6a78;
        border-radius: 8px;
        background: #08131b;
        color: #a6bfca;
        font-size: 17px;
        font-weight: 750;
      }
      body.caracal-monitor-page .caracal-ops-avatar img,
      body.caracal-monitor-page .caracal-ops-avatar canvas,
      body.caracal-monitor-page .caracal-ops-avatar svg {
        max-width: 100%;
        max-height: 100%;
        image-rendering: pixelated;
      }
      body.caracal-monitor-page .caracal-ops-identity {
        min-width: 0;
        flex: 1 1 auto;
      }
      body.caracal-monitor-page .caracal-ops-name {
        color: #f4f8fa;
        font-size: 19px;
        font-weight: 750;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-role {
        margin-top: 2px;
        color: #8fa5b3;
        font-size: 11px;
        letter-spacing: .05em;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-ops-state {
        flex: 0 0 auto;
        padding: 4px 7px;
        border: 1px solid rgba(57, 217, 138, .45);
        border-radius: 999px;
        color: #7ce8ae;
        font-size: 10px;
        font-weight: 750;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-ops-progress {
        margin-top: 13px;
      }
      body.caracal-monitor-page .caracal-ops-progress-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: #9db3bf;
        font-size: 11px;
      }
      body.caracal-monitor-page .caracal-ops-progress-head strong {
        color: #e7eef3;
        font-weight: 650;
      }
      body.caracal-monitor-page .caracal-ops-track {
        height: 7px;
        margin-top: 5px;
        overflow: hidden;
        border-radius: 99px;
        background: #09111a;
      }
      body.caracal-monitor-page .caracal-ops-fill {
        height: 100%;
        border-radius: inherit;
      }
      body.caracal-monitor-page .caracal-ops-fill.xp {
        background: linear-gradient(90deg, #237fa6, #8c59d8);
      }
      body.caracal-monitor-page .caracal-ops-fill.hp {
        background: #32b878;
      }
      body.caracal-monitor-page .caracal-ops-fill.mp {
        background: #2499bf;
      }
      body.caracal-monitor-page .caracal-ops-hpmp {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 10px;
      }
      body.caracal-monitor-page .caracal-ops-metric-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 12px;
      }
      body.caracal-monitor-page .caracal-ops-metric {
        min-width: 0;
        padding: 9px 10px;
        border: 1px solid rgba(101, 137, 156, .27);
        border-radius: 7px;
        background: rgba(8, 15, 24, .45);
      }
      body.caracal-monitor-page .caracal-ops-metric-value {
        margin-top: 3px;
        color: #edf4f7;
        font-size: 14px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-location {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid rgba(101, 137, 156, .3);
        color: #9db3bf;
        font-size: 11px;
      }
      body.caracal-monitor-page .caracal-ops-location strong {
        color: #f06b78;
        text-align: right;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-map {
        margin-top: 12px;
        overflow: hidden;
        border: 1px solid rgba(101, 137, 156, .3);
        border-radius: 7px;
        background: #07101a;
      }
      body.caracal-monitor-page .caracal-ops-map img {
        display: block;
        width: 100%;
        height: auto;
        max-height: 150px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      body.caracal-monitor-page .caracal-ops-items {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid rgba(101, 137, 156, .3);
      }
      body.caracal-monitor-page .caracal-ops-item-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 6px;
      }
      body.caracal-monitor-page .caracal-ops-item {
        max-width: 100%;
        padding: 4px 6px;
        border: 1px solid rgba(101, 137, 156, .32);
        border-radius: 5px;
        background: rgba(8, 15, 24, .56);
        color: #d5e1e6;
        font-size: 10px;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-bottom-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 16px;
        margin-top: 22px;
      }
      body.caracal-monitor-page .caracal-ops-party-details {
        grid-column: 1 / -1;
      }
      body.caracal-monitor-page .caracal-ops-graphs-panel {
        grid-column: 1 / -1;
      }
      body.caracal-monitor-page .caracal-ops-party-row {
        display: grid;
        grid-template-columns: minmax(180px, .75fr) minmax(0, 2.25fr);
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(101, 137, 156, .22);
      }
      body.caracal-monitor-page .caracal-ops-party-row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      body.caracal-monitor-page .caracal-ops-party-identity {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
      }
      body.caracal-monitor-page .caracal-ops-party-avatar {
        display: grid;
        flex: 0 0 54px;
        place-items: center;
        width: 54px;
        height: 64px;
        overflow: hidden;
        border: 1px solid #2c8190;
        border-radius: 7px;
        background: #06121a;
      }
      body.caracal-monitor-page .caracal-ops-party-avatar .caracal-party-portrait {
        width: 48px;
        height: 58px;
      }
      body.caracal-monitor-page .caracal-ops-party-avatar img {
        max-width: 48px;
        max-height: 58px;
      }
      body.caracal-monitor-page .caracal-ops-party-name {
        color: #f3f6f8;
        font-size: 15px;
        font-weight: 750;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-party-role {
        margin-top: 4px;
        color: #8fb0be;
        font-size: 11px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-party-state {
        display: inline-block;
        margin-top: 8px;
        padding: 3px 7px;
        border: 1px solid rgba(62, 204, 150, .5);
        border-radius: 999px;
        color: #63e2a8;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-ops-party-progress {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      body.caracal-monitor-page .caracal-ops-party-metrics {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 7px 12px;
        margin-top: 10px;
      }
      body.caracal-monitor-page .caracal-ops-party-field {
        min-width: 0;
        color: #c9d6dc;
        font-size: 11px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-party-field strong {
        display: block;
        margin-top: 2px;
        color: #f3f6f8;
        font-size: 12px;
        font-weight: 650;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-party-footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 10px;
        margin-top: 10px;
        padding-top: 9px;
        border-top: 1px solid rgba(101, 137, 156, .22);
        color: #9db3bf;
        font-size: 11px;
        line-height: 1.4;
      }
      body.caracal-monitor-page .caracal-ops-party-footer strong {
        color: #f06b78;
        text-align: right;
      }
      body.caracal-monitor-page .caracal-ops-chart-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
        margin-top: 18px;
      }
      body.caracal-monitor-page .caracal-ops-chart {
        min-width: 0;
        padding: 15px;
        border: 2px solid rgba(101, 137, 156, .3);
        border-radius: 8px;
        background: rgba(0, 0, 0, .3);
      }
      body.caracal-monitor-page .caracal-ops-chart[data-section="gold"] { border-color: rgba(255, 215, 0, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="xp"] { border-color: rgba(135, 206, 235, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="dps"] { border-color: rgba(255, 107, 107, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="kills"] { border-color: rgba(157, 78, 221, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="items"] { border-color: rgba(0, 229, 255, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="damage"] { border-color: rgba(255, 149, 0, .3); }
      body.caracal-monitor-page .caracal-ops-chart-metric-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 12px 0 15px;
      }
      body.caracal-monitor-page .caracal-ops-chart-metric {
        min-width: 0;
        padding: 12px;
        border: 1px solid rgba(101, 137, 156, .3);
        border-radius: 8px;
        background: rgba(0, 0, 0, .4);
        text-align: center;
      }
      body.caracal-monitor-page .caracal-ops-chart-metric-label {
        margin-bottom: 7px;
        color: #aaa;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .05em;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-ops-chart-metric-value {
        color: #f3f6f8;
        font-size: 20px;
        font-weight: 750;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-chart[data-section="gold"] .caracal-ops-chart-metric { border-color: rgba(255, 215, 0, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="gold"] .caracal-ops-chart-metric-value,
      body.caracal-monitor-page .caracal-ops-chart[data-section="gold"] .caracal-ops-chart-title { color: #FFD700; }
      body.caracal-monitor-page .caracal-ops-chart[data-section="xp"] .caracal-ops-chart-metric { border-color: rgba(135, 206, 235, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="xp"] .caracal-ops-chart-metric-value,
      body.caracal-monitor-page .caracal-ops-chart[data-section="xp"] .caracal-ops-chart-title { color: #87CEEB; }
      body.caracal-monitor-page .caracal-ops-chart[data-section="dps"] .caracal-ops-chart-metric { border-color: rgba(255, 107, 107, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="dps"] .caracal-ops-chart-metric-value,
      body.caracal-monitor-page .caracal-ops-chart[data-section="dps"] .caracal-ops-chart-title { color: #FF6B6B; }
      body.caracal-monitor-page .caracal-ops-chart[data-section="kills"] .caracal-ops-chart-metric { border-color: rgba(157, 78, 221, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="kills"] .caracal-ops-chart-metric-value,
      body.caracal-monitor-page .caracal-ops-chart[data-section="kills"] .caracal-ops-chart-title { color: #9D4EDD; }
      body.caracal-monitor-page .caracal-ops-chart[data-section="items"] .caracal-ops-chart-metric { border-color: rgba(0, 229, 255, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="items"] .caracal-ops-chart-metric-value,
      body.caracal-monitor-page .caracal-ops-chart[data-section="items"] .caracal-ops-chart-title { color: #00E5FF; }
      body.caracal-monitor-page .caracal-ops-chart[data-section="damage"] .caracal-ops-chart-metric { border-color: rgba(255, 149, 0, .3); }
      body.caracal-monitor-page .caracal-ops-chart[data-section="damage"] .caracal-ops-chart-metric-value,
      body.caracal-monitor-page .caracal-ops-chart[data-section="damage"] .caracal-ops-chart-title { color: #FF9500; }
      body.caracal-monitor-page .caracal-ops-history-panel { grid-column: 1 / -1; padding: 16px; }
      body.caracal-monitor-page .caracal-ops-history-range { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      body.caracal-monitor-page .caracal-ops-history-range-button { padding: 6px 12px; border: 1px solid #38566a; border-radius: 999px; background: #0d1925; color: #b9d0dc; cursor: pointer; }
      body.caracal-monitor-page .caracal-ops-history-range-button.is-active { border-color: #68d391; background: #173b2b; color: #eafff0; }
      body.caracal-monitor-page .caracal-ops-history-summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
      body.caracal-monitor-page .caracal-ops-history-card { padding: 12px; border: 1px solid rgba(101, 137, 156, .3); border-radius: 8px; background: rgba(0, 0, 0, .24); }
      body.caracal-monitor-page .caracal-ops-history-value { display: block; margin-top: 7px; color: #68d391; font-size: 20px; }
      body.caracal-monitor-page .caracal-ops-history-loot { margin-top: 18px; }
      body.caracal-monitor-page .caracal-ops-history-subtitle { color: #f3f6f8; font-size: 15px; font-weight: 700; }
      body.caracal-monitor-page .caracal-ops-history-month { padding: 10px 0 16px; border-bottom: 1px solid rgba(101, 137, 156, .2); color: #9db3bf; }
      body.caracal-monitor-page .caracal-ops-history-month strong { color: #f0c45c; }
      body.caracal-monitor-page .caracal-ops-history-month-grid { margin-top: 10px; }
      @media (max-width: 1000px) { body.caracal-monitor-page .caracal-ops-history-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      @media (max-width: 600px) { body.caracal-monitor-page .caracal-ops-history-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } body.caracal-monitor-page .caracal-ops-history-month { flex-direction: column; gap: 4px; } }
      body.caracal-monitor-page .caracal-ops-chart-title {
        font-size: 18px;
        font-weight: 750;
        letter-spacing: .05em;
        text-align: center;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-ops-chart-subtitle {
        min-height: 18px;
        margin-top: 5px;
        color: #8fa8b4;
        font-size: 11px;
        text-align: center;
      }
      body.caracal-monitor-page .caracal-ops-chart canvas {
        display: block;
        width: 100%;
        height: 360px;
        margin-top: 8px;
        border-radius: 8px;
        background: rgba(0, 0, 0, .3);
      }
      body.caracal-monitor-page .caracal-ops-activity-panel,
      body.caracal-monitor-page .caracal-ops-loot-panel,
      body.caracal-monitor-page .caracal-ops-bank-panel {
        grid-column: 1 / -1;
      }
      body.caracal-monitor-page .caracal-ops-activity-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      body.caracal-monitor-page .caracal-ops-activity-panel .caracal-character-activity {
        height: 100%;
      }
      body.caracal-monitor-page .caracal-ops-collection-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
        gap: 7px;
        max-height: 360px;
        overflow-y: auto;
        padding-right: 4px;
        scrollbar-color: #2c6674 #08131b;
        scrollbar-width: thin;
      }
      body.caracal-monitor-page .caracal-ops-collection-card {
        min-width: 0;
        padding: 8px;
        border: 1px solid rgba(101, 137, 156, .3);
        border-radius: 7px;
        background: rgba(8, 15, 24, .56);
      }
      body.caracal-monitor-page .caracal-ops-collection-header {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      body.caracal-monitor-page .caracal-ops-collection-icon {
        display: grid;
        flex: 0 0 36px;
        place-items: center;
        width: 36px;
        height: 36px;
        overflow: hidden;
        border: 1px solid rgba(101, 137, 156, .35);
        border-radius: 5px;
        background: rgba(3, 9, 15, .8);
        color: #9db3bf;
        font-size: 10px;
        font-weight: 700;
      }
      body.caracal-monitor-page .caracal-ops-collection-icon img,
      body.caracal-monitor-page .caracal-ops-collection-icon .game-sprite {
        image-rendering: pixelated;
      }
      body.caracal-monitor-page .caracal-ops-collection-name {
        min-width: 0;
        color: #e7eef3;
        font-size: 11px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-collection-value {
        margin-top: 4px;
        color: #f0c766;
        font-size: 13px;
        font-weight: 750;
      }
      body.caracal-monitor-page .caracal-ops-collection-meta {
        margin-top: 2px;
        color: #8fa8b4;
        font-size: 10px;
      }
      body.caracal-monitor-page .caracal-ops-tracker-panel {
        grid-column: 1 / -1;
      }
      body.caracal-monitor-page .caracal-ops-tracker-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      body.caracal-monitor-page .caracal-ops-tracker-toolbar {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      body.caracal-monitor-page .caracal-ops-tracker-mode {
        min-width: 76px;
        padding: 6px 10px;
        border: 1px solid #2d4356;
        border-radius: 4px;
        background: #172230;
        color: #8fa8b4;
        cursor: pointer;
        font: 700 10px/1 system-ui, "Segoe UI", sans-serif;
        text-transform: capitalize;
      }
      body.caracal-monitor-page .caracal-ops-tracker-mode:hover,
      body.caracal-monitor-page .caracal-ops-tracker-mode:focus-visible,
      body.caracal-monitor-page .caracal-ops-tracker-mode.is-active {
        border-color: #f0c766;
        background: #24242a;
        color: #f0c766;
        outline: none;
      }
      body.caracal-monitor-page .caracal-ops-tracker-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
        gap: 8px;
        padding: 2px 4px 3px 0;
      }
      body.caracal-monitor-page .caracal-ops-tracker-card {
        position: relative;
        min-width: 0;
        min-height: 88px;
        padding: 10px;
        border: 1px solid rgba(101, 137, 156, .34);
        border-radius: 5px;
        background: rgba(8, 15, 24, .58);
      }
      body.caracal-monitor-page .caracal-ops-tracker-card:hover {
        border-color: rgba(240, 199, 102, .72);
        background: rgba(17, 29, 43, .84);
      }
      body.caracal-monitor-page .caracal-ops-tracker-name {
        max-width: calc(100% - 36px);
        color: #f0c766;
        font-size: 11px;
        font-weight: 750;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-tracker-icon {
        position: absolute;
        top: 9px;
        right: 9px;
        display: grid;
        width: 30px;
        height: 30px;
        place-items: center;
        color: #8fa8b4;
        font: 700 8px/1 system-ui, "Segoe UI", sans-serif;
      }
      body.caracal-monitor-page .caracal-ops-tracker-icon img {
        display: block;
        width: 30px;
        height: 30px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      body.caracal-monitor-page .caracal-ops-tracker-stat {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-top: 16px;
        color: #8fa8b4;
        font-size: 10px;
      }
      body.caracal-monitor-page .caracal-ops-tracker-stat + .caracal-ops-tracker-stat {
        margin-top: 5px;
      }
      body.caracal-monitor-page .caracal-ops-tracker-stat strong {
        color: #f5f8fa;
        font-size: 11px;
        font-weight: 750;
        text-align: right;
      }
      body.caracal-monitor-page .caracal-ops-tracker-empty {
        grid-column: 1 / -1;
        min-height: 116px;
        display: grid;
        place-items: center;
        padding: 18px;
        border: 1px dashed rgba(101, 137, 156, .34);
        border-radius: 6px;
        color: #8fa5b3;
        text-align: center;
      }
      body.caracal-monitor-page .caracal-ops-bank-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }
      body.caracal-monitor-page .caracal-ops-bank-toolbar {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      body.caracal-monitor-page .caracal-ops-bank-mode {
        min-width: 52px;
        padding: 5px 8px;
        border: 1px solid #2d4356;
        border-radius: 3px;
        background: #172230;
        color: #8fa8b4;
        cursor: pointer;
        font: 700 10px/1 system-ui, "Segoe UI", sans-serif;
        text-transform: capitalize;
      }
      body.caracal-monitor-page .caracal-ops-bank-mode:hover,
      body.caracal-monitor-page .caracal-ops-bank-mode:focus-visible,
      body.caracal-monitor-page .caracal-ops-bank-mode.is-active {
        border-color: #f0c766;
        background: #24242a;
        color: #f0c766;
        outline: none;
      }
      body.caracal-monitor-page .caracal-ops-bank-tabs {
        display: grid;
        gap: 14px;
        max-height: 680px;
        overflow-y: auto;
        padding-right: 6px;
        scrollbar-color: #2c6674 #08131b;
        scrollbar-width: thin;
      }
      body.caracal-monitor-page .caracal-ops-bank-tabs.is-tab-mode {
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        align-items: start;
      }
      body.caracal-monitor-page .caracal-ops-bank-tab,
      body.caracal-monitor-page .caracal-ops-bank-group {
        padding-top: 10px;
        border-top: 1px solid rgba(101, 137, 156, .22);
      }
      body.caracal-monitor-page .caracal-ops-bank-tabs.is-tab-mode .caracal-ops-bank-tab {
        min-width: 0;
        padding: 10px;
        border: 1px solid rgba(101, 137, 156, .32);
        border-radius: 5px;
        background: rgba(8, 19, 27, .24);
      }
      body.caracal-monitor-page .caracal-ops-bank-tab:first-child,
      body.caracal-monitor-page .caracal-ops-bank-group:first-child {
        padding-top: 0;
        border-top: 0;
      }
      body.caracal-monitor-page .caracal-ops-bank-tabs.is-tab-mode .caracal-ops-bank-tab:first-child {
        padding-top: 10px;
        border-top: 1px solid rgba(101, 137, 156, .32);
      }
      body.caracal-monitor-page .caracal-ops-bank-tab-title,
      body.caracal-monitor-page .caracal-ops-bank-group-title {
        margin-bottom: 7px;
        color: #f0c766;
        font-size: 11px;
        font-weight: 750;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      body.caracal-monitor-page .caracal-ops-bank-grid {
        display: grid;
        grid-template-columns: repeat(7, 42px);
        grid-auto-rows: 42px;
        gap: 4px;
        align-content: start;
        justify-content: start;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot {
        position: relative;
        width: 42px;
        height: 42px;
        padding: 0;
        overflow: hidden;
        border: 1px solid #455467;
        border-radius: 0;
        background: #080f18;
        color: #dce7ed;
        cursor: pointer;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot:disabled {
        cursor: default;
        opacity: .62;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot:not(:disabled):hover,
      body.caracal-monitor-page .caracal-ops-bank-slot:not(:disabled):focus-visible {
        z-index: 1;
        border-color: #42d9dc;
        outline: none;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot-icon {
        display: grid;
        width: 100%;
        height: 100%;
        place-items: center;
        color: #8fa8b4;
        font: 700 8px/1 system-ui, "Segoe UI", sans-serif;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot-icon img {
        display: block;
        width: 36px;
        height: 36px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot-quantity,
      body.caracal-monitor-page .caracal-ops-bank-slot-level {
        position: absolute;
        z-index: 2;
        padding: 0 2px;
        background: rgba(0, 0, 0, .72);
        color: #f5f8fa;
        font: 700 9px/13px ui-monospace, SFMono-Regular, Consolas, monospace;
        text-shadow: 0 1px 1px #000;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot-quantity {
        right: 1px;
        bottom: 0;
      }
      body.caracal-monitor-page .caracal-ops-bank-slot-level {
        top: 0;
        left: 0;
        color: #f0c766;
      }
      body.caracal-monitor-page .caracal-ops-bank-note {
        margin: 0 0 10px;
        color: #8fa8b4;
        font-size: 11px;
      }
      body.caracal-monitor-page .caracal-ops-panel {
        min-width: 0;
        padding: 15px;
      }
      body.caracal-monitor-page .caracal-ops-section-title {
        margin-bottom: 12px;
        color: #f0c766;
        font-size: 13px;
        letter-spacing: .08em;
      }
      body.caracal-monitor-page .caracal-ops-graphs-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      body.caracal-monitor-page .caracal-ops-graphs-heading .caracal-ops-section-title {
        margin: 0;
      }
      body.caracal-monitor-page .caracal-ops-reset-button {
        flex: 0 0 auto;
        padding: 7px 10px;
        border: 1px solid rgba(240, 199, 102, .55);
        border-radius: 6px;
        background: rgba(240, 199, 102, .08);
        color: #f0c766;
        font: 700 11px system-ui, sans-serif;
        cursor: pointer;
      }
      body.caracal-monitor-page .caracal-ops-reset-button:hover:not(:disabled) {
        background: rgba(240, 199, 102, .18);
      }
      body.caracal-monitor-page .caracal-ops-reset-button:disabled {
        cursor: not-allowed;
        opacity: .55;
      }
      body.caracal-monitor-page .caracal-ops-rate-row {
        display: grid;
        grid-template-columns: 90px minmax(0, 1fr) 80px;
        align-items: center;
        gap: 9px;
        min-height: 34px;
        border-bottom: 1px solid rgba(101, 137, 156, .16);
        color: #c8d6dc;
        font-size: 11px;
      }
      body.caracal-monitor-page .caracal-ops-rate-bar {
        height: 8px;
        overflow: hidden;
        border-radius: 99px;
        background: #0a111a;
      }
      body.caracal-monitor-page .caracal-ops-rate-fill {
        height: 100%;
        min-width: 2px;
        border-radius: inherit;
        background: linear-gradient(90deg, #3ba7cd, #8062d9);
      }
      body.caracal-monitor-page .caracal-ops-rate-value {
        color: #8fe7dc;
        text-align: right;
        overflow-wrap: anywhere;
      }
      body.caracal-monitor-page .caracal-ops-activity {
        display: grid;
        gap: 6px;
      }
      body.caracal-monitor-page .caracal-ops-event {
        display: grid;
        grid-template-columns: 70px 110px minmax(0, 1fr);
        gap: 8px;
        padding: 7px 0;
        border-bottom: 1px solid rgba(101, 137, 156, .16);
        color: #c8d6dc;
        font-size: 11px;
      }
      body.caracal-monitor-page .caracal-ops-event-time,
      body.caracal-monitor-page .caracal-ops-event-name {
        color: #77c9d2;
      }
      body.caracal-monitor-page .caracal-ops-event-message {
        overflow-wrap: anywhere;
      }
      @media (max-width: 900px) {
        body.caracal-monitor-page .caracal-ops-summary-grid,
        body.caracal-monitor-page .caracal-ops-bottom-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        body.caracal-monitor-page .caracal-ops-party-metrics {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        body.caracal-monitor-page .caracal-ops-chart-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        body.caracal-monitor-page .caracal-ops-chart-metric-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 620px) {
        body.caracal-monitor-page #${OPERATIONS_DASHBOARD_ID} {
          width: calc(100vw - 20px);
        }
        body.caracal-monitor-page .caracal-ops-header {
          align-items: flex-start;
          flex-direction: column;
        }
        body.caracal-monitor-page .caracal-ops-header-actions {
          flex-basis: 100%;
          justify-content: flex-start;
        }
        body.caracal-monitor-page .caracal-ops-account-gold {
          border-left: 0;
          padding-left: 0;
          text-align: left;
        }
        body.caracal-monitor-page .caracal-ops-account-gold-main {
          justify-content: flex-start;
        }
        body.caracal-monitor-page .caracal-ops-uptime {
          text-align: left;
        }
        body.caracal-monitor-page .caracal-ops-summary-grid,
        body.caracal-monitor-page .caracal-ops-bottom-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        body.caracal-monitor-page .caracal-ops-chart-metric-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        body.caracal-monitor-page .caracal-ops-chart canvas {
          height: 300px;
        }
        body.caracal-monitor-page .caracal-ops-party-row,
        body.caracal-monitor-page .caracal-ops-party-footer {
          grid-template-columns: minmax(0, 1fr);
        }
        body.caracal-monitor-page .caracal-ops-party-progress,
        body.caracal-monitor-page .caracal-ops-party-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        body.caracal-monitor-page .caracal-ops-party-footer strong {
          text-align: left;
        }
      }
    `;
    document.head.appendChild(styleNode);
  }

  function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const resolvedSrc = src.startsWith("/pi-sprite/") ? src : SPRITE_ORIGIN + src;
      script.src = resolvedSrc;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Adventure Land sprite resource failed: ${resolvedSrc}`));
      document.head.appendChild(script);
    });
  }

  function ensureSpriteRenderer() {
    if (
      typeof window.sprite === "function" &&
      window.G &&
      window.G.sprites
    ) {
      return Promise.resolve();
    }
    if (!spriteRendererPromise) {
      const loadSet = (files) => files.reduce(
        (promise, file) => promise.then(() => loadExternalScript(file)),
        Promise.resolve(),
      ).then(() => {
        if (typeof window.process_game_data === "function" && window.T && !Object.keys(window.T).length) {
          window.process_game_data();
        }
        if (typeof window.precompute_image_positions === "function") {
          window.precompute_image_positions();
        }
        if (typeof window.sprite !== "function") {
          throw new Error("Adventure Land sprite renderer is unavailable");
        }
      }).catch((error) => {
        throw error;
      });
      spriteRendererPromise = SPRITE_RENDERER_FILE_SETS.reduce(
        (promise, files) => promise.catch(() => loadSet(files)),
        Promise.reject(new Error("No Adventure Land sprite renderer has loaded")),
      ).catch((error) => {
        spriteRendererPromise = null;
        console.debug("CaracAL sprite renderer could not initialize", error);
        throw error;
      });
    }
    return spriteRendererPromise;
  }

  function hideTileSpriteMetadata(box) {
    box.querySelectorAll(".sprite_skin, .sprite_ctype, .sprite_cx, .sprite_cosmetic_head_y").forEach((node) => {
      node.hidden = true;
      node.style.display = "none";
    });
  }

  function readTileSprite(box) {
    const skinNode = box.querySelector(".sprite_skin .textDisplayValue");
    const ctypeNode = box.querySelector(".sprite_ctype .textDisplayValue");
    const cxNode = box.querySelector(".sprite_cx .textDisplayValue");
    const cosmeticHeadYNode = box.querySelector(".sprite_cosmetic_head_y .textDisplayValue");
    const nameNode = box.querySelector(".name .textDisplayValue");
    const skin = skinNode ? skinNode.textContent.trim() : "";
    const ctype = ctypeNode ? ctypeNode.textContent.trim().toLowerCase() : "";
    let cx = {};
    if (cxNode) {
      try {
        const parsed = JSON.parse(cxNode.textContent || "{}");
        if (parsed && typeof parsed === "object") cx = parsed;
      } catch (_) {
        cx = {};
      }
    }
    return {
      skin,
      ctype,
      cx,
      cosmeticHeadY: Number(cosmeticHeadYNode?.textContent) || 0,
      fallback: (nameNode?.textContent || "?").slice(0, 2),
    };
  }

  function defaultSpriteForClass(ctype) {
    return ({
      warrior: "mwarrior",
      priest: "mpriest",
      ranger: "mranger",
      rogue: "mrogue",
      mage: "mmage",
      merchant: "mmerchant",
    })[ctype] || "";
  }

  function normalizeGameMarkupImages(root) {
    root.querySelectorAll("img").forEach((image) => {
      const source = image.getAttribute("src") || "";
      if (source && !/^(?:https?:|data:|blob:|\/\/)/i.test(source)) {
        image.src = new URL(source, `${SPRITE_ORIGIN}/`).href;
      }
    });
  }

  function renderTileSprite(box, portrait, spriteState) {
    const skin = spriteState.skin || defaultSpriteForClass(spriteState.ctype);
    if (!skin) {
      portrait.replaceChildren();
      const fallback = document.createElement("div");
      fallback.className = "caracal-party-portrait-fallback";
      fallback.textContent = spriteState.fallback;
      portrait.appendChild(fallback);
      return;
    }
    try {
      const markup = window.sprite(skin, {
        cx: { ...spriteState.cx },
        cosmetic_head_y: spriteState.cosmeticHeadY,
        scale: 3,
        width: 102,
        height: 118,
        overflow: true,
      });
       portrait.innerHTML = markup || "";
       normalizeGameMarkupImages(portrait);
       if (!portrait.firstElementChild) throw new Error("empty sprite");
    } catch (_) {
      portrait.replaceChildren();
      const fallback = document.createElement("div");
      fallback.className = "caracal-party-portrait-fallback";
      fallback.textContent = spriteState.fallback;
      portrait.appendChild(fallback);
    }
  }

  function bindPartyFrameTiles() {
    document.querySelectorAll(".botUIContainer > .box").forEach((box) => {
      let portrait = box.querySelector(".caracal-party-portrait");
      if (!portrait) {
        portrait = document.createElement("div");
        portrait.className = "caracal-party-portrait";
        box.insertBefore(portrait, box.firstChild);
      }
      const spriteState = tileSpriteState(box);
      hideTileSpriteMetadata(box);
      normalizePartyFrameFields(box);
      renderPartyTileDetails(box);
      const characterName = operationsRead(box, "name", "Character");
      portrait.title = `View equipped equipment for ${characterName}`;
      portrait.setAttribute("role", "button");
      portrait.setAttribute("aria-label", `View equipped equipment for ${characterName}`);
      portrait.tabIndex = 0;
      if (!portrait.dataset.equipmentWindowBound) {
        portrait.dataset.equipmentWindowBound = "1";
        portrait.addEventListener("click", () => openEquipmentWindow(operationsSnapshot(box)));
        portrait.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openEquipmentWindow(operationsSnapshot(box));
        });
      }
      const key = spriteState.skin + "|" + spriteState.ctype + "|" + spriteState.cosmeticHeadY + "|" + JSON.stringify(spriteState.cx);
      if (portrait.dataset.spriteKey === key) return;
      portrait.dataset.spriteKey = key;
      renderTileSprite(box, portrait, spriteState);
      if (spriteState.skin || spriteState.ctype) {
        ensureSpriteRenderer().then(() => {
          if (portrait.dataset.spriteKey === key) renderTileSprite(box, portrait, spriteState);
        }).catch(() => { });
      }
    });
  }

  function operationsMake(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function operationsRead(box, name, fallback = "—") {
    const node = box.querySelector("." + name + " .textDisplayValue");
    const value = node && node.textContent ? node.textContent.trim() : "";
    return value || fallback;
  }

  function operationsParseNumber(value) {
    const text = String(value || "").replace(/,/g, "").trim();
    const match = text.match(/-?\d+(?:\.\d+)?/);
    if (!match) return Number.NaN;
    let number = Number(match[0]);
    const suffix = text.slice(match.index + match[0].length).toLowerCase();
    if (suffix.startsWith("bil") || suffix.startsWith("b")) number *= 1e9;
    else if (suffix.startsWith("mil") || suffix.startsWith("m")) number *= 1e6;
    else if (suffix.startsWith("k")) number *= 1e3;
    return Number.isFinite(number) ? number : Number.NaN;
  }

  function operationsFormatCompact(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const absolute = Math.abs(number);
    if (absolute >= 1e9) return `${(number / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
    if (absolute >= 1e6) return `${(number / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (absolute >= 1e3) return `${(number / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
    return Math.round(number).toLocaleString();
  }

  function operationsParseProgress(value) {
    const text = String(value || "");
    const match = text.match(/:\s*([^/]+)\/\s*(.+)$/);
    if (!match) return { text: value || "—", percent: 0 };
    const current = operationsParseNumber(match[1]);
    const maximum = operationsParseNumber(match[2]);
    const percent = Number.isFinite(current) && Number.isFinite(maximum) && maximum > 0
      ? Math.max(0, Math.min(100, current * 100 / maximum))
      : 0;
    return { text: `${match[1].trim()} / ${match[2].trim()}`, percent };
  }

  function operationsStoredValue(raw) {
    if (raw && typeof raw === "object") return raw;
    if (typeof raw !== "string") return raw;
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }

  function operationsTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return Number.NaN;
  }

  function operationsFiniteNumber(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function operationsSessionGoldValue(record) {
    if (!record || typeof record !== "object") return null;
    const explicitSessionGold = operationsFiniteNumber(record.sessionGold);
    if (explicitSessionGold !== null) return explicitSessionGold;
    const earned = operationsEarnedGoldValue(record);
    const banked = operationsFiniteNumber(record.goldBanked, record.sessionGoldBanked);
    if (earned !== null && banked !== null) return earned + banked;
    if (earned !== null) return earned;
    return banked;
  }

  function operationsEarnedGoldValue(record) {
    if (!record || typeof record !== "object") return null;
    return operationsFiniteNumber(record.goldEarned, record.lootGold, record.loot?.gold);
  }

  function operationsSessionXpValue(record) {
    return operationsFiniteNumber(record?.xpEarned, record?.xpGained);
  }

  function operationsStoredObject(entries, key) {
    if (!entries || !key) return null;
    const value = operationsStoredValue(entries[key]);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function operationsStoredFirst(entries, keys) {
    for (const key of keys || []) {
      const value = operationsStoredObject(entries, key);
      if (value) return value;
    }
    return null;
  }

  function operationsStoredMerge(entries, keys) {
    const values = (keys || [])
      .filter(Boolean)
      .map((key) => operationsStoredObject(entries, key))
      .filter(Boolean)
      .sort((left, right) => (operationsTimestamp(left.updatedAt) || 0) - (operationsTimestamp(right.updatedAt) || 0));
    if (!values.length) return null;
    return Object.assign({}, ...values);
  }

  function operationsSharedCharacter(name) {
    const entries = operationsStorageSnapshot?.entries || {};
    const stateKeys = [
      `${name}.Trio.state`,
      name === "Character01MCH" ? "Character01MCH.MerchantEvents.stateV3" : "",
      name === "Character01MCH" ? "Character01MCH.MerchantEvents.state" : "",
      `cstore_droid_trio_state_v2_${name}`,
      name === "Character07" ? "cstore_droid_warrior_live_state_v1" : "",
      name === "Character01MCH" ? "cstore_droid_merchant_state_v3" : "",
      name === "Character01MCH" ? "cstore_droid_merchant_state_v1" : "",
    ];
    const metrics = operationsStoredFirst(entries, [
      `${name}.CaracAL.Metrics.v2`,
    ]) || operationsStoredMerge(entries, [
      `${name}.CaracAL.Metrics.v1`,
      `${name}.Trio.metricsData`,
      `${name}.Trio.metricsState`,
      `cstore_droid_trio_metrics_state_v1_${name}`,
    ]) || {};
    const dashboard = operationsStoredFirst(entries, [
      `${name}.CaracAL.Dashboard.v2`,
    ]) || operationsStoredMerge(entries, [
      `${name}.CaracAL.Dashboard.v1`,
    ]) || {};
    const trio = operationsStoredFirst(entries, [
      "CaracAL.TrioMetrics.v2",
    ]) || operationsStoredMerge(entries, [
      "CaracAL.TrioMetrics.v1",
    ]) || {};
    const tracktrixSnapshot = name === "Character01MCH" ? operationsStoredFirst(entries, [
      "CaracAL.TracktrixSnapshot.v1",
      "Character01MCH.CaracAL.TracktrixSnapshot.v1",
    ]) || {} : {};
    const tracktrix = name === "Character01MCH" ? operationsStoredFirst(entries, [
      "CaracAL.Tracktrix.v1",
      "Character01MCH.CaracAL.Tracktrix.v1",
    ]) || tracktrixSnapshot.tracktrix || {} : {};
    const exchange = name === "Character01MCH" ? operationsStoredFirst(entries, [
      "CaracAL.Exchange.v1",
      "Character01MCH.CaracAL.Exchange.v1",
    ]) || tracktrixSnapshot.exchange || {} : {};
    const activity = operationsStoredFirst(entries, [
      `${name}.CaracAL.Activity.v1`,
    ]) || {};
    const equipment = operationsStoredFirst(entries, [
      `${name}.CaracAL.Equipment.v1`,
      `${name}.CaracAL.Equipment.v2`,
    ]) || operationsStoredMerge(entries, [
      `${name}.MerchantTrioUI.equipment`,
    ]) || {};
    const loot = operationsStoredFirst(entries, [
      "CaracAL.Loot.v2",
      "Character01MCH.CaracAL.Loot.v2",
    ]) || operationsStoredMerge(entries, [
      "CaracAL.Loot.v1",
      "Character01MCH.CaracAL.Loot.v1",
    ]) || {};
    const bank = operationsStoredFirst(entries, [
      "CaracAL.Bank.v2",
      "Character01MCH.CaracAL.Bank.v2",
    ]) || operationsStoredMerge(entries, [
      "CaracAL.Bank.v1",
      "Character01MCH.CaracAL.Bank.v1",
      "MerchantBankUI.BankSnapshot.v1",
      "Character01MCH.MerchantBankUI.bankSnapshot",
    ]) || {};
    const inventory = operationsStoredMerge(entries, [
      `${name}.MerchantTrioUI.inventoryResponse`,
      `cstore_droid_merchant_trio_inventory_v1_${name}`,
    ]) || {};
    const position = operationsStoredMerge(entries, [
      `${name}.TrioMovement.position`,
      `cstore_droid_trio_position_v1_${name}`,
    ]) || {};
    const state = operationsStoredMerge(entries, stateKeys) || {};
    const updatedAt = Math.max(
      operationsTimestamp(state.updatedAt) || 0,
      operationsTimestamp(metrics.updatedAt) || 0,
      operationsTimestamp(dashboard.updatedAt) || 0,
      operationsTimestamp(activity.updatedAt) || 0,
      operationsTimestamp(trio.updatedAt) || 0,
      operationsTimestamp(tracktrix.updatedAt) || 0,
      operationsTimestamp(exchange.updatedAt) || 0,
      operationsTimestamp(loot.updatedAt) || 0,
      operationsTimestamp(bank.updatedAt) || 0,
      operationsTimestamp(inventory.updatedAt) || 0,
      operationsTimestamp(position.updatedAt) || 0,
    );
    if (!Object.keys(state).length && !Object.keys(metrics).length && !Object.keys(dashboard).length && !Object.keys(activity).length && !Object.keys(tracktrix).length && !Object.keys(exchange).length && !Object.keys(inventory).length && !Object.keys(position).length) return null;
    return { state, metrics, dashboard, activity, equipment, trio, tracktrix, exchange, loot, bank, inventory, position, updatedAt };
  }

  function operationsHas(value, key) {
    return value && Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined && value[key] !== null && value[key] !== "";
  }

  function operationsFirstShared(shared, keys) {
    const dashboard = shared?.dashboard || {};
    const identity = dashboard.identity || {};
    const appearance = dashboard.appearance || {};
    const location = dashboard.location || {};
    const vitals = dashboard.vitals || {};
    const economy = dashboard.economy || {};
    const connection = dashboard.connection || {};
    const status = dashboard.status || {};
    const modifiers = dashboard.modifiers || {};
    const target = dashboard.target || {};
    const server = dashboard.currentServer || identity.server || {};
    const nested = {
      name: dashboard.characterName ?? identity.name,
      characterName: dashboard.characterName ?? identity.name,
      ctype: identity.ctype ?? identity.class ?? appearance.ctype,
      class_name: identity.class ?? identity.ctype ?? appearance.ctype,
      level: identity.level,
      currentServer: server,
      homeServer: dashboard.homeServer || server,
      serverRegion: server.region,
      serverId: server.id ?? server.key,
      map: location.map,
      instance: location.instance,
      x: location.x,
      y: location.y,
      real_x: location.x,
      real_y: location.y,
      hp: vitals.hp,
      maxHp: vitals.maxHp,
      max_hp: vitals.maxHp,
      mp: vitals.mp,
      maxMp: vitals.maxMp,
      max_mp: vitals.maxMp,
      xp: vitals.xp,
      maxXp: vitals.maxXp,
      max_xp: vitals.maxXp,
      cc: vitals.cc,
      maxCc: vitals.maxCc,
      gold: economy.gold,
      goldPerHour: economy.goldPerHour,
      ping: connection.pingMs,
      pingMs: connection.pingMs,
      uptimeMs: connection.uptimeMs,
      serverConnected: connection.serverConnected,
      current_status: status.text,
      statusText: status.text,
      status: status.text,
      phase: status.phase,
      scriptPaused: status.paused,
      currentAction: status.currentAction,
      targetName: target.name,
      targetType: target.type,
      target: dashboard.target,
      alive: dashboard.alive,
      rip: dashboard.rip,
      skin: appearance.skin,
      tskin: appearance.tskin,
      cx: appearance.cx,
      tcx: appearance.tcx,
      goldm: modifiers.goldPercent,
      xpm: modifiers.xpPercent,
      luckm: modifiers.luckPercent,
      sessionStartedAt: dashboard.sessionStartedAt,
      startedAt: dashboard.sessionStartedAt,
    };
    for (const key of keys) {
      if (operationsHas(dashboard, key)) return dashboard[key];
      if (operationsHas(nested, key)) return nested[key];
    }
    for (const key of keys) if (operationsHas(shared?.state, key)) return shared.state[key];
    for (const key of keys) if (operationsHas(shared?.position, key)) return shared.position[key];
    return undefined;
  }

  function operationsServerText(value) {
    if (!value) return "—";
    if (typeof value === "string") return value;
    if (typeof value !== "object") return String(value);
    return [value.region, value.id, value.key].filter(Boolean).join(" ") || "—";
  }

  function operationsTargetText(value) {
    if (!value) return "None";
    const raw = typeof value === "string"
      ? value
      : typeof value !== "object"
        ? String(value)
        : value.name || value.type || value.id || "None";
    return String(raw).replace(/^Player\s+/i, "").trim() || "None";
  }

  function tileSpriteState(box) {
    const domState = readTileSprite(box);
    const name = operationsRead(box, "name", "");
    const shared = name ? operationsSharedCharacter(name) : null;
    const sharedCx = operationsFirstShared(shared, ["cx"]);
    const sharedCtype = operationsFirstShared(shared, ["ctype", "class_name"]);
    return {
      skin: operationsFirstShared(shared, ["skin"]) || domState.skin,
      ctype: String(sharedCtype || domState.ctype || operationsRead(box, "class_name", "")).toLowerCase(),
      cx: sharedCx && typeof sharedCx === "object" && !Array.isArray(sharedCx) ? sharedCx : domState.cx,
      cosmeticHeadY: Number(operationsFirstShared(shared, ["cosmetic_head_y"]) ?? domState.cosmeticHeadY) || 0,
      fallback: name.slice(0, 2).toUpperCase() || domState.fallback,
    };
  }

  function operationsFormatInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number).toLocaleString() : "—";
  }

  function operationsPair(current, maximum, fallback = "—") {
    return Number.isFinite(Number(current)) && Number.isFinite(Number(maximum))
      ? `${operationsFormatInteger(current)} / ${operationsFormatInteger(maximum)}`
      : fallback;
  }

  function operationsHistoryRate(history) {
    if (!Array.isArray(history) || history.length < 2) return Number.NaN;
    const points = history.map((point) => {
      if (Array.isArray(point)) return { at: operationsTimestamp(point[0]), value: Number(point[1]) };
      return { at: operationsTimestamp(point?.at ?? point?.timestamp ?? point?.time), value: Number(point?.value ?? point?.amount ?? point?.total) };
    }).filter((point) => Number.isFinite(point.at) && Number.isFinite(point.value));
    if (points.length < 2) return Number.NaN;
    const first = points[0];
    const last = points[points.length - 1];
    const elapsed = last.at - first.at;
    if (elapsed <= 0) return Number.NaN;
    return (last.value - first.value) * 3600000 / elapsed;
  }

  function operationsInventorySlots(inventory) {
    const items = Array.isArray(inventory)
      ? inventory
      : Array.isArray(inventory?.items)
        ? inventory.items
        : Array.isArray(inventory?.slots)
          ? inventory.slots
        : [];
    return items.map((item, slot) => item ? {
        ...(typeof item === "object" ? item : {}),
        slot: typeof item === "object" && Number.isInteger(Number(item.slot)) ? Number(item.slot) : slot,
        name: typeof item === "string" ? item : item.name || "item",
        q: typeof item === "string" ? 1 : Number(item.q ?? item.quantity) || 1,
        quantity: typeof item === "string" ? 1 : Number(item.quantity ?? item.q) || 1,
        level: typeof item === "string" ? 0 : Number(item.level ?? item.upgradeLevel) || 0,
        skin: typeof item === "string" ? item : item.skin || item.name || "",
      } : null);
  }

  function operationsInventorySnapshotSlots(inventory) {
    if (!inventory) return [];
    const hasPublishedSlots = Array.isArray(inventory) || Array.isArray(inventory.items) || Array.isArray(inventory.slots);
    if (!hasPublishedSlots) return [];
    const slots = operationsInventorySlots(inventory);
    const capacity = Number(inventory.capacity);
    if (Number.isFinite(capacity) && capacity > slots.length) slots.push(...Array.from({ length: capacity - slots.length }, () => null));
    return slots;
  }

  function operationsInventoryItems(inventory) {
    return operationsInventorySlots(inventory).filter(Boolean);
  }

  function operationsInventorySlotsFromText(value) {
    const text = String(value || "").trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? operationsInventorySlots(parsed) : [];
    } catch (_) {
      return [];
    }
  }

  function operationsInventoryItemsFromText(value) {
    const text = String(value || "").trim();
    if (!text || /^empty$/i.test(text) || text === "—") return [];
    return text.split(/\s+·\s+/).map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      const match = entry.match(/^(.*?)(?:\s+\+(\d+))?(?:\s+[×x](\d+))?$/);
      return {
        name: (match?.[1] || entry).trim(),
        q: Number(match?.[3]) || 1,
        level: Number(match?.[2]) || 0,
        skin: "",
      };
    }).filter((item) => item.name);
  }

  function operationsMergeInventoryItems(primary, secondary) {
    const merged = new Map();
    [...(primary || []), ...(secondary || [])].forEach((item) => {
      const key = `${item.name}|${item.level || 0}`;
      const previous = merged.get(key);
      if (!previous || Number(item.q) > Number(previous.q)) merged.set(key, { ...previous, ...item });
    });
    return Array.from(merged.values());
  }

  function operationsEffectRecords(dashboard, state) {
    let raw = Array.isArray(dashboard?.effects) && dashboard.effects.length
      ? dashboard.effects
      : Array.isArray(state?.effects) && state.effects.length
        ? state.effects
        : null;
    if (!raw && state?.s && typeof state.s === "object") {
      raw = Object.entries(state.s).map(([name, effect]) => ({ name, ...(effect && typeof effect === "object" ? effect : {}) }));
    }
    if (!Array.isArray(raw)) return [];
    return raw.map((effect) => {
      const record = typeof effect === "string" ? { name: effect } : effect && typeof effect === "object" ? effect : {};
      const name = String(record.name || record.id || record.type || "effect");
      let remainingMs = Number(record.remainingMs ?? record.ms);
      if (!Number.isFinite(remainingMs) && Number.isFinite(Number(record.expiresAt))) remainingMs = Number(record.expiresAt) - Date.now();
      if (!Number.isFinite(remainingMs) && typeof record.expires === "string") {
        const expiresAt = Date.parse(record.expires);
        if (Number.isFinite(expiresAt)) remainingMs = expiresAt - Date.now();
      }
      return {
        name,
        skin: record.skin || "",
        stacks: Number.isFinite(Number(record.stacks ?? record.stack ?? record.count ?? record.n)) ? Number(record.stacks ?? record.stack ?? record.count ?? record.n) : null,
        remainingMs: Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : null,
      };
    }).filter((effect) => effect.name);
  }

  function operationsItemText(item) {
    return `${item.name}${item.level ? ` +${item.level}` : ""}${item.q > 1 ? ` ×${item.q}` : ""}`;
  }

  function operationsActivityRecords(record, name) {
    const raw = Array.isArray(record?.events) ? record.events : Array.isArray(record?.entries) ? record.entries : Array.isArray(record?.activity) ? record.activity : [];
    return raw.map((event) => {
      const at = event?.at ?? event?.time ?? event?.updatedAt;
      const time = operationsTimestamp(at);
      return {
        name,
        message: String(event?.message || event?.text || event?.action || event?.type || "Activity"),
        time: new Date(Number.isFinite(time) ? time : Date.now()),
      };
    }).filter((event) => event.message);
  }

  function normalizePartyFrameFields(box) {
    box.querySelectorAll(".textDisplay").forEach((node) => {
      const label = node.querySelector(".textDisplayLabel");
      if (!label) return;
      const text = label.textContent || "";
      if (node.classList.contains("hp_potions") || node.classList.contains("mp_potions")) {
        node.style.setProperty("display", "none", "important");
        node.setAttribute("aria-hidden", "true");
        return;
      }
      if (/^\s*(?:modifiers?|gear|target|effects|inventory\s*(?:items|slots)|est\.?\s*dps|connection|realm)\s*:?\s*$/i.test(text)) {
        node.style.setProperty("display", "none", "important");
        node.setAttribute("aria-hidden", "true");
        return;
      }
      if (/modifier/i.test(text)) label.textContent = text.replace(/modifier/gi, "MOD");
    });
    const serverNode = box.querySelector(".textDisplay.server");
    const locationNode = box.querySelector(".textDisplay.location");
    if (serverNode && locationNode && serverNode.parentElement === locationNode.parentElement && serverNode.nextElementSibling !== locationNode) {
      serverNode.parentElement.insertBefore(locationNode, serverNode.nextElementSibling);
    }
  }

  function operationsNearbyPlayerNames(shared) {
    const candidates = [
      shared?.dashboard?.nearby?.players,
      shared?.state?.nearby?.players,
      shared?.position?.nearby?.players,
      shared?.dashboard?.nearbyPlayers,
      shared?.state?.nearbyPlayers,
    ];
    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) continue;
      const names = [...new Set(candidate.map((player) => {
        if (typeof player === "string") return player.trim();
        return String(player?.name || player?.characterName || player?.id || "").trim();
      }).filter(Boolean))];
      if (names.length) return names.join(", ");
      if (candidate.length === 0) return "None";
    }
    return "None";
  }

  function operationsSnapshot(box) {
    const name = operationsRead(box, "name", "Character");
    const shared = operationsSharedCharacter(name);
    const dashboard = shared?.dashboard || {};
    const state = shared?.state || {};
    const metrics = shared?.metrics || {};
    const inventoryRecord = shared?.inventory || {};
    const dashboardInventory = dashboard.inventory && typeof dashboard.inventory === "object"
      ? dashboard.inventory
      : dashboard.inventorySlots && typeof dashboard.inventorySlots === "object"
        ? dashboard.inventorySlots
        : {};
    const dashboardInventorySlots = operationsInventorySnapshotSlots(dashboardInventory);
    const storedInventorySlots = dashboardInventorySlots.length ? dashboardInventorySlots : operationsInventorySnapshotSlots(inventoryRecord);
    const liveInventorySlots = operationsInventorySlotsFromText(operationsRead(box, "inventory_slots", ""));
    // The native live slot array is the same slot-aware inventory the game Hub
    // shows. It must outrank stored responses, which can be stale after the
    // merchant transfers or sells items. Stored data remains the fallback when
    // the live slot field is unavailable.
    const hasStoredInventorySnapshot = Boolean(
      dashboard.inventory && typeof dashboard.inventory === "object"
      || Array.isArray(inventoryRecord?.items)
      || Array.isArray(inventoryRecord?.slots),
    );
    const authoritativeInventorySlots = liveInventorySlots.length
      ? liveInventorySlots
      : hasStoredInventorySnapshot
        ? storedInventorySlots
        : [];
    const authoritativeInventoryItems = authoritativeInventorySlots.length
      ? authoritativeInventorySlots.filter(Boolean)
      : operationsInventoryItemsFromText(operationsRead(box, "inventory_items", ""));
    const storedInventoryItems = storedInventorySlots.filter(Boolean);
    const inventoryItems = authoritativeInventoryItems.length
      ? authoritativeInventoryItems
      : storedInventoryItems.length
        ? storedInventoryItems
        : operationsInventoryItems(inventoryRecord);
    let effectRecords = operationsEffectRecords(dashboard, state);
    const monitorEffects = operationsRead(box, "effects", "None");
    if (!effectRecords.length && monitorEffects && !/^none$/i.test(monitorEffects)) {
      effectRecords = operationsEffectRecords({ effects: monitorEffects.split(/\s*,\s*/) }, {});
    }
    const domAlive = operationsRead(box, "not_rip", "Unknown");
    const domStatus = operationsRead(box, "current_status", "Unknown");
    const domTarget = operationsRead(box, "target", "None");
    const sharedTarget = operationsFirstShared(shared, ["targetName", "targetType", "selectedMonster"]);
    const dashboardTarget = dashboard.target && typeof dashboard.target === "object" && (dashboard.target.name || dashboard.target.type || dashboard.target.id)
      ? dashboard.target
      : null;
    const target = operationsTargetText(dashboardTarget || sharedTarget || domTarget);
    const sharedStatus = operationsFirstShared(shared, ["current_status", "statusText", "status", "phase"]);
    const status = (domStatus !== "Unknown" && domStatus !== "—") ? domStatus : (sharedStatus || (state.scriptPaused ? "Paused" : state.town ? "In town" : target !== "None" ? `Hunting ${target}` : "Idle"));
    const sharedAlive = operationsHas(state, "rip") ? (state.rip ? "No" : "Yes") : (operationsHas(dashboard, "alive") ? (dashboard.alive ? "Yes" : "No") : domAlive);
    const hpValue = operationsFirstShared(shared, ["hp"]);
    const maxHpValue = operationsFirstShared(shared, ["maxHp", "max_hp"]);
    const mpValue = operationsFirstShared(shared, ["mp"]);
    const maxMpValue = operationsFirstShared(shared, ["maxMp", "max_mp"]);
    const xpValue = operationsFirstShared(shared, ["xp"]);
    const maxXpValue = operationsFirstShared(shared, ["maxXp", "max_xp"]);
    const health = operationsPair(hpValue, maxHpValue, operationsRead(box, "health", "—"));
    const mana = operationsPair(mpValue, maxMpValue, operationsRead(box, "mana", "—"));
    const xp = operationsPair(xpValue, maxXpValue, operationsRead(box, "xp", "—"));
    const inventorySize = Number(inventoryRecord.size) || (dashboardInventory.capacity !== null && dashboardInventory.capacity !== undefined ? Number(dashboardInventory.capacity) : 0) || Number(state.isize) || 0;
    const inventoryUsed = dashboardInventory.used !== null && dashboardInventory.used !== undefined && Number.isFinite(Number(dashboardInventory.used))
      ? Number(dashboardInventory.used)
      : authoritativeInventorySlots.length
        ? authoritativeInventoryItems.length
        : inventoryItems.length;
    const inventory = inventoryItems.length || inventorySize || inventoryUsed ? `${inventoryUsed}/${inventorySize || "?"}` : operationsRead(box, "inv", "—");
    const goldValue = operationsFirstShared(shared, ["gold"]) ?? inventoryRecord.gold;
    const gold = Number.isFinite(Number(goldValue)) ? operationsFormatInteger(goldValue) : operationsRead(box, "gold", "—");
    const xpRateNumber = Number.isFinite(Number(metrics.xpPerHour)) ? Number(metrics.xpPerHour) : operationsHistoryRate(metrics.history?.xp);
    const goldRateNumber = Number.isFinite(Number(metrics.goldPerHour)) ? Number(metrics.goldPerHour) : operationsHistoryRate(metrics.history?.gold);
    const domXpRate = operationsRead(box, "xpph", "—");
    const domGoldRate = operationsRead(box, "gph", "—");
    const effectiveXpRateNumber = Number.isFinite(xpRateNumber) ? xpRateNumber : operationsParseNumber(domXpRate);
    const effectiveGoldRateNumber = Number.isFinite(goldRateNumber) ? goldRateNumber : operationsParseNumber(domGoldRate);
    const xpRate = Number.isFinite(xpRateNumber) ? operationsFormatCompact(xpRateNumber) : domXpRate;
    const goldRate = Number.isFinite(goldRateNumber) ? operationsFormatCompact(goldRateNumber) : domGoldRate;
    const storedTtluSeconds = Number(metrics.ttluMs) > 0 ? Number(metrics.ttluMs) / 1000 : Number.NaN;
    const ttlSeconds = Number.isFinite(storedTtluSeconds) ? storedTtluSeconds : Number.isFinite(Number(maxXpValue)) && Number.isFinite(Number(xpValue)) && effectiveXpRateNumber > 0
      ? Math.max(0, (Number(maxXpValue) - Number(xpValue)) * 3600 / effectiveXpRateNumber)
      : Number.NaN;
    const ttl = Number.isFinite(ttlSeconds) ? formatResourceDuration(Math.round(ttlSeconds)) : operationsRead(box, "ttlu", "—");
    const map = operationsFirstShared(shared, ["map", "instance"]) || "";
    const x = operationsFirstShared(shared, ["x", "real_x"]);
    const y = operationsFirstShared(shared, ["y", "real_y"]);
    const location = map && Number.isFinite(Number(x)) && Number.isFinite(Number(y))
      ? `${map} (${Math.round(Number(x))}, ${Math.round(Number(y))})`
      : operationsRead(box, "location", "—");
    const equipmentRecord = shared?.equipment && typeof shared.equipment === "object" ? shared.equipment : {};
    const equipment = dashboard.equipment && typeof dashboard.equipment === "object"
      ? dashboard.equipment
      : state.equipment && typeof state.equipment === "object"
        ? state.equipment
        : equipmentRecord.slots && typeof equipmentRecord.slots === "object"
          ? equipmentRecord.slots
          : equipmentRecord;
    const effects = effectRecords.map((effect) => effect.name);
    const nearbyPlayers = operationsNearbyPlayerNames(shared);
    const hpPotions = dashboard.hpPotionCount !== null && dashboard.hpPotionCount !== undefined && Number.isFinite(Number(dashboard.hpPotionCount)) ? dashboard.hpPotionCount : operationsHas(state, "hpPotionCount") ? state.hpPotionCount : inventoryItems.filter((item) => item.name.startsWith("hpot")).reduce((sum, item) => sum + item.q, 0);
    const mpPotions = dashboard.mpPotionCount !== null && dashboard.mpPotionCount !== undefined && Number.isFinite(Number(dashboard.mpPotionCount)) ? dashboard.mpPotionCount : operationsHas(state, "mpPotionCount") ? state.mpPotionCount : inventoryItems.filter((item) => item.name.startsWith("mpot")).reduce((sum, item) => sum + item.q, 0);
    const dps = Number.isFinite(Number(metrics.dps))
      ? Number(metrics.dps)
      : Number.isFinite(Number(dashboard.dps))
        ? Number(dashboard.dps)
        : Number.isFinite(Number(state.attack)) && Number.isFinite(Number(state.frequency))
          ? Number(state.attack) * Number(state.frequency)
          : Number.NaN;
    const role = operationsFirstShared(shared, ["ctype", "class_name"]) || operationsRead(box, "class_name", operationsRead(box, "sprite_ctype", "Class unavailable"));
    const serverValue = operationsFirstShared(shared, ["currentServer"]);
    const server = operationsServerText(serverValue) !== "—" ? operationsServerText(serverValue) : [operationsFirstShared(shared, ["serverRegion"]), operationsFirstShared(shared, ["serverId"])].filter(Boolean).join(" ") || operationsRead(box, "server", operationsRead(box, "realm", "—"));
    const realm = operationsRead(box, "realm", server || "—");
    const uptimeMs = operationsFirstShared(shared, ["uptimeMs"]);
    const startedAt = operationsFirstShared(shared, ["startedAt"]);
    const uptimeSeconds = Number(uptimeMs) > 0 ? Number(uptimeMs) / 1000 : operationsTimestamp(startedAt) > 0 ? Math.max(0, (Date.now() - operationsTimestamp(startedAt)) / 1000) : Number.NaN;
    const uptime = Number.isFinite(uptimeSeconds) ? formatResourceDuration(Math.floor(uptimeSeconds)) : operationsRead(box, "uptime", "—");
    const modifierRecord = dashboard.modifiers && typeof dashboard.modifiers === "object" ? dashboard.modifiers : state;
    const formatModifier = (label, value) => Number.isFinite(Number(value)) ? `${label} ${Math.round(Number(value))}%` : `${label} —`;
    const modifiers = dashboard.modifiers && typeof dashboard.modifiers === "object"
      ? [formatModifier("Gold", modifierRecord.goldPercent), formatModifier("XP", modifierRecord.xpPercent), formatModifier("Luck", modifierRecord.luckPercent)].join(" · ")
      : operationsHas(state, "goldm") || operationsHas(state, "xpm") || operationsHas(state, "luckm")
      ? `Gold ${Math.round(Number(state.goldm || 1) * 100)}% · XP ${Math.round(Number(state.xpm || 1) * 100)}% · Luck ${Math.round(Number(state.luckm || 1) * 100)}%`
      : operationsRead(box, "modifiers", "—");
    const spriteState = {
      skin: operationsFirstShared(shared, ["skin"]) || readTileSprite(box).skin,
      ctype: String(role || "").toLowerCase(),
      cx: operationsFirstShared(shared, ["cx"]) || readTileSprite(box).cx,
      fallback: name.slice(0, 2).toUpperCase(),
    };
    const active = /fight|combat|travel|mov|gather|hunt|bank|courier|patrol/i.test(status) || target !== "None" || state.moving === true || state.runtimeActive === true;
    return {
      box,
      name,
      shared,
      role,
      realm,
      server,
      alive: sharedAlive,
      level: operationsFirstShared(shared, ["level"]) !== undefined ? String(operationsFirstShared(shared, ["level"])) : operationsRead(box, "level", "—"),
      uptime,
      health,
      mana,
      xp,
      inventory,
      gold,
      status,
      target,
      location,
      ping: Number.isFinite(Number(operationsFirstShared(shared, ["pingMs"]))) ? operationsFormatInteger(operationsFirstShared(shared, ["pingMs"])) + " ms" : operationsRead(box, "ping", "—"),
      goldRate,
      xpRate,
      ttl,
      modifiers,
      connection: operationsFirstShared(shared, ["serverConnected"]) === true ? "Connected" : operationsFirstShared(shared, ["serverConnected"]) === false ? "Disconnected" : operationsRead(box, "connection", "—"),
      hpPotions: operationsHas(state, "hpPotionCount") || inventoryItems.length ? operationsFormatInteger(hpPotions) : operationsRead(box, "hp_potions", "—"),
      mpPotions: operationsHas(state, "mpPotionCount") || inventoryItems.length ? operationsFormatInteger(mpPotions) : operationsRead(box, "mp_potions", "—"),
      gear: equipment && typeof equipment === "object" ? String(Object.keys(equipment).filter((key) => equipment[key]).length) : operationsRead(box, "gear_count", "—"),
      effects: effects.length ? effects.join(", ") : operationsRead(box, "effects", "None"),
      effectRecords,
      nearby: operationsRead(box, "nearby", "—"),
      nearbyPlayers,
      inventoryItems: inventoryItems.length ? inventoryItems.map(operationsItemText).join(" · ") : operationsRead(box, "inventory_items", "Empty"),
      inventoryItemRecords: inventoryItems,
      inventorySlots: authoritativeInventorySlots.length ? authoritativeInventorySlots : inventoryItems,
      inventorySize,
      equipment,
      dps: Number.isFinite(dps) ? operationsFormatCompact(dps) : operationsRead(box, "dps_estimate", "N/A"),
      active,
      online: String(sharedAlive).toLowerCase() !== "no" && String(sharedAlive).toLowerCase() !== "offline",
      healthProgress: Number.isFinite(Number(hpValue)) && Number.isFinite(Number(maxHpValue)) ? { text: health, percent: Math.max(0, Math.min(100, Number(hpValue) * 100 / Number(maxHpValue))) } : operationsParseProgress(operationsRead(box, "health", "—")),
      manaProgress: Number.isFinite(Number(mpValue)) && Number.isFinite(Number(maxMpValue)) ? { text: mana, percent: Math.max(0, Math.min(100, Number(mpValue) * 100 / Number(maxMpValue))) } : operationsParseProgress(operationsRead(box, "mana", "—")),
      xpProgress: Number.isFinite(Number(xpValue)) && Number.isFinite(Number(maxXpValue)) ? { text: xp, percent: Math.max(0, Math.min(100, Number(xpValue) * 100 / Number(maxXpValue))) } : operationsParseProgress(operationsRead(box, "xp", "—")),
      goldNumber: Number.isFinite(Number(goldValue)) ? Number(goldValue) : operationsParseNumber(operationsRead(box, "gold", "")),
      xpNumber: Number.isFinite(Number(xpValue)) ? Number(xpValue) : operationsParseNumber(operationsRead(box, "xp", "")),
      xpRateNumber: effectiveXpRateNumber,
      goldRateNumber: effectiveGoldRateNumber,
      cc: operationsFirstShared(shared, ["cc"]) !== null && operationsFirstShared(shared, ["cc"]) !== undefined && operationsFirstShared(shared, ["maxCc"]) !== null && operationsFirstShared(shared, ["maxCc"]) !== undefined ? operationsPair(operationsFirstShared(shared, ["cc"]), operationsFirstShared(shared, ["maxCc"]), "—") : operationsRead(box, "cc", "—"),
      homeServer: operationsServerText(dashboard.homeServer),
      spriteState,
      activityEvents: operationsActivityRecords(shared?.activity, name),
    };
  }

  function operationsMinimalPausedSnapshot(name, state) {
    return {
      box: null,
      name,
      shared: {},
      role: "—",
      realm: "—",
      server: "—",
      alive: "Paused",
      level: "—",
      uptime: "—",
      health: "—",
      mana: "—",
      xp: "—",
      inventory: "—",
      gold: "—",
      status: state && state.stopped ? "Stopped" : "Paused",
      target: "None",
      location: "—",
      ping: "—",
      goldRate: "—",
      xpRate: "—",
      ttl: "—",
      modifiers: "—",
      connection: "Stopped",
      hpPotions: "—",
      mpPotions: "—",
      gear: "—",
      effects: "None",
      effectRecords: [],
      nearby: "—",
      nearbyPlayers: "None",
      inventoryItems: "Empty",
      inventoryItemRecords: [],
      inventorySlots: [],
      inventorySize: 0,
      equipment: {},
      dps: "N/A",
      active: false,
      online: false,
      healthProgress: { text: "—", percent: 0 },
      manaProgress: { text: "—", percent: 0 },
      xpProgress: { text: "—", percent: 0 },
      goldNumber: Number.NaN,
      xpNumber: Number.NaN,
      xpRateNumber: Number.NaN,
      goldRateNumber: Number.NaN,
      cc: "—",
      homeServer: "—",
      spriteState: { skin: "", ctype: "", cx: {}, fallback: String(name).slice(0, 2).toUpperCase() },
      activityEvents: [],
      paused: !(state && state.stopped),
      stopped: Boolean(state && state.stopped),
    };
  }

  function operationsPausedSnapshot(name, state, placeholder) {
    const cached = operationsLastSnapshots.get(name);
    const snapshot = cached
      ? { ...cached, box: placeholder }
      : operationsMinimalPausedSnapshot(name, state);
    snapshot.box = placeholder;
    snapshot.paused = !(state && state.stopped);
    snapshot.stopped = Boolean(state && state.stopped);
    snapshot.online = false;
    snapshot.active = false;
    snapshot.alive = snapshot.stopped ? "Stopped" : "Paused";
    snapshot.status = snapshot.stopped ? "Stopped" : "Paused";
    snapshot.connection = snapshot.stopped ? "Stopped" : "Paused";
    return snapshot;
  }

  function operationsPausedCharacterBox(snapshot, cachedBox) {
    const reusableBox = cachedBox && cachedBox.isConnected && cachedBox.classList.contains("caracal-ops-paused-placeholder")
      ? cachedBox
      : null;
    const box = reusableBox || (cachedBox ? cachedBox.cloneNode(true) : operationsMake("div", "box"));
    box.classList.add("caracal-ops-paused-placeholder");
    box.dataset.characterName = snapshot.name;
    box.querySelectorAll(".caracal-paused-banner").forEach((node) => node.remove());
    if (!reusableBox) {
      box.querySelectorAll(
        `[${CHARACTER_HUB_ATTR}], [${CHARACTER_SETTINGS_ATTR}], [${CHARACTER_CONTROL_ATTR}], [${CHARACTER_STOP_ATTR}]`,
      ).forEach((node) => node.remove());
    }
    const portrait = box.querySelector(".caracal-party-portrait");
    if (portrait) {
      delete portrait.dataset.equipmentWindowBound;
      delete portrait.dataset.spriteKey;
    }
    let nameNode = box.querySelector(".name .textDisplayValue");
    if (!nameNode) {
      const nameRow = operationsMake("div", "name");
      nameNode = operationsMake("span", "textDisplayValue", snapshot.name);
      nameRow.appendChild(nameNode);
      box.prepend(nameRow);
    } else {
      nameNode.textContent = snapshot.name;
    }
    const statusNode = box.querySelector(".current_status .textDisplayValue");
    if (statusNode) statusNode.textContent = snapshot.status;
    const banner = operationsMake("div", "caracal-paused-banner", snapshot.status + " · not running");
    box.appendChild(banner);
    return box;
  }

  function operationsCatalogToken(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function operationsCatalogDistance(left, right) {
    const a = operationsCatalogToken(left);
    const b = operationsCatalogToken(right);
    if (a === b) return 0;
    if (!a || !b) return Math.max(a.length, b.length);
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const saved = row[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
        previous = saved;
      }
    }
    return row[b.length];
  }

  function operationsCatalogCandidates() {
    const candidates = [];
    const seen = new Set();
    const add = (id, definition, item = null) => {
      const key = String(id || "");
      if (!key || !definition || seen.has(key)) return;
      seen.add(key);
      candidates.push({ id: key, definition, item });
    };
    Object.entries(window.G?.items || {}).forEach(([id, definition]) => add(id, definition));
    operationsCatalogItems.forEach((item) => add(item?.id, item?.definition || item, item));
    return candidates;
  }

  function operationsCatalogRecord(name) {
    const key = String(name || "");
    if (!key) return null;
    const alias = OPERATIONS_CATALOG_ALIASES[key.toLowerCase()] || key;
    const direct = window.G?.items?.[alias];
    if (direct) return { id: alias, definition: direct, item: null };

    const candidates = operationsCatalogCandidates();
    const exact = candidates.find((candidate) => candidate.id === alias || candidate.definition?.skin === alias || candidate.item?.skin === alias);
    if (exact) return exact;

    const token = operationsCatalogToken(alias);
    const named = candidates.filter((candidate) => operationsCatalogToken(candidate.definition?.name) === token || operationsCatalogToken(candidate.item?.name) === token);
    if (named.length === 1) return named[0];

    // Loot counters written by older scripts contain a few transposed or
    // human-readable keys (for example ringjs/ringsj and rawemerald/gem0).
    // Use a small, unique fuzzy match only after exact ID/name/skin matches.
    const fuzzyUnique = (field) => {
      const ranked = candidates
        .map((candidate) => ({ candidate, distance: operationsCatalogDistance(key, field(candidate)) }))
        .sort((left, right) => left.distance - right.distance);
      return ranked.length && ranked[0].distance <= 2 && ranked[0].distance < (ranked[1]?.distance ?? Infinity) ? ranked[0].candidate : null;
    };
    return fuzzyUnique((candidate) => candidate.id)
      || fuzzyUnique((candidate) => candidate.definition?.skin)
      || fuzzyUnique((candidate) => candidate.definition?.name)
      || null;
  }

  function operationsCatalogDefinition(name) {
    const key = String(name || "");
    const record = operationsCatalogRecord(key);
    if (record?.definition) return record.definition;
    const conditions = window.G?.conditions;
    const skills = window.G?.skills;
    return (conditions && conditions[key]) || (skills && skills[key]) || null;
  }

  function operationsCatalogLabel(name, fallback = "item") {
    const record = operationsCatalogRecord(name);
    return record?.definition?.name || record?.item?.name || String(name || fallback);
  }

  function operationsLoadCatalog() {
    if (operationsCatalogItems.length || operationsCatalogMonsters.length) return Promise.resolve(operationsCatalogItems);
    if (operationsCatalogLoad) return operationsCatalogLoad;
    operationsCatalogLoad = fetch(OPERATIONS_GAME_DATA_ENDPOINT, { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json().catch(() => ({})).then((payload) => {
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.items)) throw new Error(payload.error || "Game item catalog unavailable");
        operationsCatalogItems = payload.items;
        operationsCatalogMonsters = Array.isArray(payload.bestiary) ? payload.bestiary : [];
        return operationsCatalogItems;
      }))
      .catch((error) => {
        console.debug("CaracAL item catalog unavailable", error);
        return operationsCatalogItems;
      })
      .finally(() => { operationsCatalogLoad = null; });
    return operationsCatalogLoad;
  }

  function operationsNormalizeItemContainerMarkup(markup, size) {
    const cell = Number(size) || 36;
    return String(markup || "")
      .replace(
        "margin: 2px; border: 2px solid",
        "margin: 0; box-sizing: border-box; border: 2px solid",
      )
      .replace(
        "background: black; position: absolute; bottom: -2px; left: -2px; border: 2px solid",
        `background: black; position: absolute; bottom: 0; left: 0; width: ${cell + 6}px; height: ${cell + 6}px; box-sizing: border-box; border: 2px solid`,
      )
      .replace(/border:\s*2px solid [^;]+;?/g, "border: 0;");
  }

  function operationsRenderCatalogIcon(target, skin, actual) {
    target.replaceChildren();
    const visualSkin = String(skin || "");
    if (!visualSkin) return false;
    try {
      const record = operationsCatalogRecord(visualSkin);
      const definition = record?.definition || operationsCatalogDefinition(visualSkin);
      const directPosition = window.G?.positions?.[visualSkin];
      const resolvedSkin = String(directPosition ? visualSkin : definition?.skin || visualSkin);
      const itemSize = actual ? 36 : 24;
      let markup = "";
      if (actual && typeof window.item_container === "function") {
        markup = window.item_container({ skin: resolvedSkin, size: itemSize, draggable: false }, { name: actual.name });
        markup = operationsNormalizeItemContainerMarkup(markup, itemSize);
      } else if (typeof window.item_container === "function" && window.G?.positions?.[resolvedSkin]) {
        markup = window.item_container({ skin: resolvedSkin, size: itemSize, draggable: false });
      } else if (typeof window.sprite === "function") {
        markup = window.sprite(resolvedSkin, { scale: 1.15, width: 24, height: 28, overflow: true });
      }
      target.innerHTML = markup || "";
      normalizeGameMarkupImages(target);
      return Boolean(target.querySelector("img") || target.firstElementChild);
    } catch (_) {
      target.replaceChildren();
      return false;
    }
  }

  function closeEquipmentWindow() {
    if (!equipmentWindow) return;
    const modal = equipmentWindow;
    equipmentWindow = null;
    if (modal._caracalEscapeHandler) document.removeEventListener("keydown", modal._caracalEscapeHandler);
    modal.remove();
  }

  function operationsEquipmentSlots(equipment) {
    const source = equipment?.slots && typeof equipment.slots === "object" ? equipment.slots : equipment || {};
    const order = [
      ["earring1", "Earring 1"],
      ["helmet", "Helmet"],
      ["earring2", "Earring 2"],
      ["amulet", "Amulet"],
      ["mainhand", "Main hand"],
      ["chest", "Chest"],
      ["offhand", "Off hand"],
      ["cape", "Cape"],
      ["ring1", "Ring 1"],
      ["pants", "Pants"],
      ["ring2", "Ring 2"],
      ["orb", "Orb"],
      ["belt", "Belt"],
      ["shoes", "Shoes"],
      ["gloves", "Gloves"],
      ["elixir", "Elixir"],
    ];
    return order.map(([key, label]) => {
      const raw = source[key];
      if (!raw) return { key, label, item: null };
      const item = typeof raw === "object" ? { ...raw } : { name: String(raw) };
      const name = String(item.name || item.skin || "").trim();
      if (!name) return { key, label, item: null };
      const levelValue = Number(item.level ?? item.upgradeLevel ?? 0);
      const quantityValue = Number(item.q ?? item.quantity ?? 1);
      return {
        key,
        label,
        item: {
          ...item,
          name,
          skin: item.skin || name,
          level: Number.isFinite(levelValue) ? levelValue : 0,
          q: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1,
        },
      };
    });
  }

  function openEquipmentWindow(snapshot) {
    closeEquipmentWindow();
    const modal = operationsMake("div", "caracal-equipment-modal");
    const panel = operationsMake("section", "caracal-equipment-window");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", `${snapshot?.name || "Character"} equipped equipment`);
    const header = operationsMake("div", "caracal-equipment-header");
    const title = operationsMake("div", "caracal-equipment-title", snapshot?.name || "Character");
    const close = operationsMake("button", "caracal-equipment-close", "×");
    close.type = "button";
    close.title = "Close equipment window";
    close.setAttribute("aria-label", "Close equipment window");
    close.addEventListener("click", closeEquipmentWindow);
    header.append(title, close);
    const grid = operationsMake("div", "caracal-equipment-grid");
    operationsEquipmentSlots(snapshot?.equipment).forEach((entry) => {
      const item = entry.item;
      const slot = operationsMake("div", `caracal-equipment-slot${item ? "" : " empty"}`);
      const label = item ? operationsCatalogLabel(item.name, item.name) : "Empty";
      const suffix = item?.level ? ` +${item.level}` : "";
      slot.title = `${entry.label}: ${label}${suffix}`;
      slot.setAttribute("aria-label", `${entry.label}: ${item ? `${label}${suffix}` : "Empty"}`);
      if (item) {
        const icon = operationsMake("span", "caracal-equipment-slot-icon", String(label || "?").slice(0, 2).toUpperCase());
        icon.setAttribute("aria-hidden", "true");
        const definition = operationsCatalogDefinition(item.name);
        const hasIcon = operationsRenderCatalogIcon(icon, item.skin || definition?.skin || item.name, item);
        if (!hasIcon) icon.textContent = String(label || "?").slice(0, 2).toUpperCase();
        slot.appendChild(icon);
        if (item.level) slot.appendChild(operationsMake("span", "caracal-equipment-slot-level", `+${item.level}`));
        if (item.q > 1) slot.appendChild(operationsMake("span", "caracal-equipment-slot-quantity", String(item.q)));
        slot.appendChild(operationsMake("span", "caracal-equipment-slot-label", label));
      }
      grid.appendChild(slot);
    });
    panel.append(header, grid);
    modal.appendChild(panel);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeEquipmentWindow();
    });
    modal._caracalEscapeHandler = (event) => {
      if (event.key === "Escape") closeEquipmentWindow();
    };
    document.addEventListener("keydown", modal._caracalEscapeHandler);
    document.body.appendChild(modal);
    equipmentWindow = modal;
    close.focus();
    if (snapshot?.equipment && (typeof window.sprite !== "function" || !window.G?.sprites)) {
      ensureSpriteRenderer().then(() => {
        if (equipmentWindow === modal && modal.isConnected) openEquipmentWindow(snapshot);
      }).catch(() => { });
    }
  }

  function operationsDetailChip(list, label, skin, suffix, title) {
    const chip = operationsMake("button", "caracal-tile-detail-chip");
    chip.type = "button";
    const fullLabel = `${label || "item"}${suffix || ""}`;
    if (title || fullLabel) {
      chip.title = title ? `${fullLabel} (${title})` : fullLabel;
      chip.setAttribute("aria-label", fullLabel);
    }
    const icon = operationsMake("span", "caracal-tile-detail-icon", String(label || "?").slice(0, 2).toUpperCase());
    icon.setAttribute("aria-hidden", "true");
    const hasIcon = operationsRenderCatalogIcon(icon, skin);
    if (!hasIcon) icon.textContent = String(label || "?").slice(0, 2).toUpperCase();
    const text = operationsMake("span", "caracal-tile-detail-chip-text", fullLabel);
    text.setAttribute("aria-hidden", "true");
    const popup = operationsMake("span", "caracal-tile-detail-chip-popup", fullLabel);
    popup.hidden = true;
    popup.setAttribute("aria-hidden", "true");
    const closeOtherPopups = () => {
      list.querySelectorAll(".caracal-tile-detail-chip.is-open").forEach((other) => {
        if (other !== chip) {
          other.classList.remove("is-open");
          const otherPopup = other.querySelector(".caracal-tile-detail-chip-popup");
          if (otherPopup) otherPopup.hidden = true;
        }
      });
    };
    const togglePopup = () => {
      const open = !popup.hidden;
      closeOtherPopups();
      popup.hidden = open;
      chip.classList.toggle("is-open", !open);
    };
    chip.addEventListener("click", togglePopup);
    chip.append(icon, text, popup);
    list.appendChild(chip);
    return hasIcon;
  }

  function operationsInventorySlot(item, index, list) {
    const slot = operationsMake("button", "caracal-tile-inventory-slot");
    slot.type = "button";
    if (!item) {
      slot.disabled = true;
      slot.title = `Empty slot ${index + 1}`;
      slot.setAttribute("aria-label", `Empty inventory slot ${index + 1}`);
      return slot;
    }
    const definition = operationsCatalogDefinition(item.name);
    const label = operationsCatalogLabel(item.name, item.name);
    const suffix = `${item.level ? ` +${item.level}` : ""}${item.q > 1 ? ` ×${item.q}` : ""}`;
    const fullLabel = `${label}${suffix}`;
    slot.title = fullLabel;
    slot.setAttribute("aria-label", `Inventory slot ${index + 1}: ${fullLabel}`);
    const icon = operationsMake("span", "caracal-tile-inventory-icon", String(label || "?").slice(0, 2).toUpperCase());
    icon.setAttribute("aria-hidden", "true");
    const hasIcon = operationsRenderCatalogIcon(icon, item.skin || definition?.skin || item.name, item);
    if (!hasIcon) icon.textContent = String(label || "?").slice(0, 2).toUpperCase();
    slot.dataset.iconRendered = hasIcon ? "1" : "0";
    slot.appendChild(icon);
    if (item.level) slot.appendChild(operationsMake("span", "caracal-tile-inventory-level", `+${item.level}`));
    if (item.q > 1) slot.appendChild(operationsMake("span", "caracal-tile-inventory-quantity", String(item.q)));
    const name = operationsMake("span", "caracal-tile-inventory-name", fullLabel);
    name.hidden = true;
    name.setAttribute("aria-hidden", "true");
    slot.appendChild(name);
    slot.addEventListener("click", () => {
      list.querySelectorAll(".caracal-tile-inventory-slot.is-open").forEach((other) => {
        if (other !== slot) {
          other.classList.remove("is-open");
          const otherName = other.querySelector(".caracal-tile-inventory-name");
          if (otherName) otherName.hidden = true;
        }
      });
      const open = !name.hidden;
      name.hidden = open;
      slot.classList.toggle("is-open", !open);
    });
    return slot;
  }

  function renderPartyTileDetails(box, force = false) {
    const snapshot = operationsSnapshot(box);
    const nearbyNode = box.querySelector(".textDisplay.nearby");
    if (nearbyNode) {
      nearbyNode.style.setProperty("display", "none", "important");
      nearbyNode.setAttribute("aria-hidden", "true");
    }
    let details = box.querySelector(".caracal-tile-details");
    if (!details) {
      details = operationsMake("div", "caracal-tile-details");
      const minimap = box.querySelector(".minimap");
      if (minimap) box.insertBefore(details, minimap);
      else box.appendChild(details);
    }
    const key = JSON.stringify({
      dps: snapshot.dps,
      nearbyPlayers: snapshot.nearbyPlayers,
      target: snapshot.target,
      effects: snapshot.effectRecords,
      inventory: snapshot.inventorySlots,
      inventorySize: snapshot.inventorySize,
    });
    if (!force && details.dataset.detailKey === key) return;
    if (details.dataset.detailKey !== key) delete details.dataset.iconsAttempted;
    details.dataset.detailKey = key;
    details.replaceChildren();
    let renderedIcons = 0;
    const visualRecords = snapshot.effectRecords.length + snapshot.inventoryItemRecords.length;

    const nearbySection = operationsMake("section", "caracal-tile-detail-section caracal-tile-nearby-section");
    nearbySection.append(
      operationsMake("div", "caracal-tile-detail-label", "Nearby:"),
      operationsMake("div", "caracal-tile-detail-target", snapshot.nearbyPlayers),
    );
    details.appendChild(nearbySection);

    const targetSection = operationsMake("section", "caracal-tile-detail-section");
    targetSection.append(
      operationsMake("div", "caracal-tile-detail-label", "Target"),
      operationsMake("div", "caracal-tile-detail-target", snapshot.target),
    );
    details.appendChild(targetSection);

    const effectsSection = operationsMake("section", "caracal-tile-detail-section");
    effectsSection.appendChild(operationsMake("div", "caracal-tile-detail-label", "Effects"));
    const effectsList = operationsMake("div", "caracal-tile-detail-list");
    snapshot.effectRecords.forEach((effect) => {
      const definition = operationsCatalogDefinition(effect.name);
      const label = operationsCatalogLabel(effect.name, effect.name);
      const suffix = `${effect.stacks && effect.stacks > 1 ? ` ×${effect.stacks}` : ""}${effect.remainingMs !== null ? ` · ${formatResourceDuration(Math.max(1, Math.ceil(effect.remainingMs / 1000)))}` : ""}`;
      if (operationsDetailChip(effectsList, label, effect.skin || definition?.skin || effect.name, suffix, effect.name)) renderedIcons += 1;
    });
    if (!effectsList.childElementCount) effectsList.appendChild(operationsMake("span", "caracal-tile-detail-empty", "None"));
    effectsSection.appendChild(effectsList);
    details.appendChild(effectsSection);

    const inventorySection = operationsMake("section", "caracal-tile-detail-section");
    inventorySection.appendChild(operationsMake("div", "caracal-tile-detail-label", "Inventory"));
    const inventoryList = operationsMake("div", "caracal-tile-inventory-grid");
    const inventorySlotCount = Math.max(Number(snapshot.inventorySize) || 0, snapshot.inventorySlots.length);
    for (let index = 0; index < inventorySlotCount; index += 1) {
      const item = snapshot.inventorySlots[index] || null;
      const slot = operationsInventorySlot(item, index, inventoryList);
      if (item && slot.dataset.iconRendered === "1") renderedIcons += 1;
      inventoryList.appendChild(slot);
    }
    if (!inventoryList.childElementCount) inventoryList.appendChild(operationsMake("span", "caracal-tile-detail-empty", "Empty"));
    inventorySection.appendChild(inventoryList);
    details.appendChild(inventorySection);

    if (visualRecords && renderedIcons < visualRecords && !details.dataset.iconsAttempted) {
      details.dataset.iconsAttempted = "1";
      ensureSpriteRenderer().then(() => {
        if (box.isConnected) renderPartyTileDetails(box, true);
      }).catch(() => { });
    }
  }

  async function refreshOperationsStorage() {
    if (operationsStorageRefresh) return operationsStorageRefresh;
    operationsStorageRefresh = fetch(OPERATIONS_STORAGE_ENDPOINT, { cache: "no-store" })
      .then((response) => response.json().catch(() => ({})).then((payload) => {
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Shared character storage is unavailable");
        operationsStorageSnapshot = payload;
        bindPartyFrameTiles();
        renderOperationsDashboard();
      }))
      .catch((error) => {
        console.debug("CaracAL shared character storage unavailable", error);
      })
      .finally(() => {
        operationsStorageRefresh = null;
      });
    return operationsStorageRefresh;
  }

  function operationsProgressRow(label, progress, colorClass) {
    const row = operationsMake("div", "caracal-ops-progress");
    const head = operationsMake("div", "caracal-ops-progress-head");
    head.append(operationsMake("span", "", label), operationsMake("strong", "", progress.text));
    const track = operationsMake("div", "caracal-ops-track");
    const fill = operationsMake("div", "caracal-ops-fill " + colorClass);
    fill.style.width = `${progress.percent}%`;
    track.appendChild(fill);
    row.append(head, track);
    return row;
  }

  function operationsMetric(label, value) {
    const metric = operationsMake("div", "caracal-ops-metric");
    metric.append(
      operationsMake("div", "caracal-ops-label", label),
      operationsMake("div", "caracal-ops-metric-value", value),
    );
    return metric;
  }

  function operationsRecordActivity(snapshot) {
    const previous = operationsPrevious.get(snapshot.name);
    let recorded = false;
    let recordedEvent = null;
    if (!previous) {
      if (operationsActivityHydrated && !operationsActivity.some((event) => event.name === snapshot.name)) {
        recordedEvent = { name: snapshot.name, message: "Monitor connected", time: new Date() };
        operationsActivity.unshift(recordedEvent);
        recorded = true;
      }
    } else {
      const changes = [];
      if (previous.status !== snapshot.status) changes.push(`status: ${snapshot.status}`);
      if (previous.target !== snapshot.target) changes.push(`target: ${snapshot.target}`);
      if (previous.location !== snapshot.location) changes.push(`location: ${snapshot.location}`);
      if (changes.length) {
        recordedEvent = { name: snapshot.name, message: changes.join(" · "), time: new Date() };
        operationsActivity.unshift(recordedEvent);
        recorded = true;
      }
    }
    operationsPrevious.set(snapshot.name, {
      status: snapshot.status,
      target: snapshot.target,
      location: snapshot.location,
    });
    if (recorded) {
      operationsTrimActivity();
      operationsPersistActivity(recordedEvent);
    }
  }

  function operationsCharacterActivityEvents(name, snapshot = null) {
    const stored = Array.isArray(snapshot?.activityEvents) ? snapshot.activityEvents : [];
    const live = operationsActivity.filter((event) => event.name === name);
    const seen = new Set();
    return [...stored, ...live]
      .filter((event) => {
        const key = `${event.time.toISOString()}\u0000${event.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => right.time.getTime() - left.time.getTime())
      .slice(0, 25);
  }

  function operationsCharacterActivityKey(name, snapshot = null) {
    return operationsCharacterActivityEvents(name, snapshot)
      .map((event) => `${event.time.toISOString()}\u0000${event.message}`)
      .join("\u0001");
  }

  function operationsCharacterActivityTile(snapshot) {
    const tile = operationsMake("article", "caracal-character-activity");
    tile.dataset.characterName = snapshot.name;
    tile.dataset.activityKey = operationsCharacterActivityKey(snapshot.name, snapshot);
    const head = operationsMake("div", "caracal-character-activity-head");
    head.append(
      operationsMake("div", "caracal-character-activity-title", `${snapshot.name} · live activity`),
      operationsMake("div", "caracal-character-activity-live", snapshot.stopped ? "Stopped" : snapshot.paused ? "Paused" : snapshot.online ? "Live" : "Offline"),
    );

    const history = operationsMake("div", "caracal-character-activity-history");
    operationsCharacterActivityEvents(snapshot.name, snapshot).forEach((event) => {
      const row = operationsMake("div", "caracal-character-activity-event");
      row.append(
        operationsMake("span", "caracal-character-activity-event-time", event.time.toLocaleTimeString()),
        operationsMake("span", "caracal-character-activity-event-message", event.message),
      );
      history.appendChild(row);
    });
    if (!history.childElementCount) {
      history.appendChild(operationsMake("div", "caracal-ops-muted", "Waiting for live status changes…"));
    }

    tile.append(head, history);
    return tile;
  }

  function operationsRefreshCharacterActivityTiles(container, snapshots) {
    if (!container) return;
    const tiles = new Map(Array.from(container.querySelectorAll(":scope > .caracal-character-activity")).map((tile) => [tile.dataset.characterName, tile]));
    snapshots.forEach((snapshot) => {
      const tile = tiles.get(snapshot.name);
      if (!tile) return;
      const live = tile.querySelector(".caracal-character-activity-live");
      if (live) live.textContent = snapshot.online ? "Live" : "Offline";
      const history = tile.querySelector(".caracal-character-activity-history");
      const activityKey = operationsCharacterActivityKey(snapshot.name, snapshot);
      if (!history || tile.dataset.activityKey === activityKey) return;
      const wasAtBottom = history.scrollHeight - history.scrollTop - history.clientHeight <= 8;
      const savedScroll = history.scrollTop;
      history.replaceChildren();
      operationsCharacterActivityEvents(snapshot.name, snapshot).forEach((event) => {
        const row = operationsMake("div", "caracal-character-activity-event");
        row.append(
          operationsMake("span", "caracal-character-activity-event-time", event.time.toLocaleTimeString()),
          operationsMake("span", "caracal-character-activity-event-message", event.message),
        );
        history.appendChild(row);
      });
      if (!history.childElementCount) history.appendChild(operationsMake("div", "caracal-ops-muted", "Waiting for live status changes…"));
      history.scrollTop = wasAtBottom ? history.scrollHeight : Math.min(savedScroll, history.scrollHeight);
      tile.dataset.activityKey = activityKey;
    });
  }

  function operationsPanel(title, className) {
    const panel = operationsMake("section", `caracal-ops-panel ${className || ""}`.trim());
    panel.appendChild(operationsMake("div", "caracal-ops-section-title", title));
    return panel;
  }

  function operationsTrioRecord(snapshots) {
    return snapshots.map((snapshot) => snapshot.shared?.trio).find((record) => record && Object.keys(record).length) || null;
  }

  function operationsCurrentCharacterStartedAt(snapshot) {
    const dashboard = snapshot?.shared?.dashboard;
    const uptimeMs = Number(operationsFirstShared(snapshot?.shared, ["uptimeMs"]));
    if (Number.isFinite(uptimeMs) && uptimeMs > 0) return Date.now() - uptimeMs;
    const characterStartedAt = operationsTimestamp(operationsFirstShared(snapshot?.shared, ["startedAt"]));
    if (Number.isFinite(characterStartedAt) && characterStartedAt > 0) return characterStartedAt;
    const dashboardStartedAt = operationsTimestamp(dashboard?.sessionStartedAt ?? dashboard?.startedAt);
    return Number.isFinite(dashboardStartedAt) && dashboardStartedAt > 0 ? dashboardStartedAt : null;
  }

  function operationsSessionSummary(snapshots) {
    const trio = operationsTrioRecord(snapshots);
    const liveStartedAt = snapshots
      .filter((snapshot) => snapshot.online)
      .map(operationsCurrentCharacterStartedAt)
      .filter((startedAt) => Number.isFinite(startedAt) && startedAt > 0);
    const currentStartedAt = liveStartedAt.length ? Math.min(...liveStartedAt) : null;
    if (trio) {
      return {
        // The header describes the longest current character uptime. Do not
        // substitute a persisted TrioMetrics session start when all members
        // are offline, because that timestamp can outlive their processes.
        startedAt: currentStartedAt,
        goldEarned: operationsSessionGoldValue(trio),
        xpEarned: operationsSessionXpValue(trio),
      };
    }
    const summary = { startedAt: currentStartedAt, goldEarned: null, xpEarned: null };
    let gold = 0;
    let xp = 0;
    let hasGold = false;
    let hasXp = false;
    snapshots.forEach((snapshot) => {
      const metrics = snapshot.shared?.metrics;
      if (!metrics || typeof metrics !== "object") return;
      const metricGold = operationsSessionGoldValue(metrics);
      if (metricGold !== null) {
        gold += metricGold;
        hasGold = true;
      }
      const metricXp = operationsSessionXpValue(metrics);
      if (metricXp !== null) {
        xp += metricXp;
        hasXp = true;
      }
    });
    summary.goldEarned = hasGold ? gold : null;
    summary.xpEarned = hasXp ? xp : null;
    return summary;
  }

  function operationsCollectionCard(name, value, meta) {
    const card = operationsMake("div", "caracal-ops-collection-card");
    const icon = operationsMake("span", "caracal-ops-collection-icon", String(name || "item").slice(0, 2).toUpperCase());
    icon.setAttribute("aria-hidden", "true");
    const visualName = operationsCatalogLabel(name, name);
    const header = operationsMake("div", "caracal-ops-collection-header");
    const nameNode = operationsMake("div", "caracal-ops-collection-name", visualName);
    header.append(icon, nameNode);
    card.title = String(name || visualName);
    card.appendChild(header);
    if (!operationsRenderCatalogIcon(icon, name)) {
      icon.textContent = String(name || "item").slice(0, 2).toUpperCase();
    }
    Promise.all([operationsLoadCatalog(), ensureSpriteRenderer()]).then(() => {
      if (!icon.isConnected) return;
      nameNode.textContent = operationsCatalogLabel(name, name);
      if (!operationsRenderCatalogIcon(icon, name)) icon.textContent = String(name || "item").slice(0, 2).toUpperCase();
    }).catch(() => { });
    card.append(
      operationsMake("div", "caracal-ops-collection-value", value),
    );
    if (meta) card.appendChild(operationsMake("div", "caracal-ops-collection-meta", meta));
    return card;
  }

  function operationsActivityPanel(snapshots) {
    const panel = operationsPanel("Live activity", "caracal-ops-activity-panel");
    panel.appendChild(operationsMake("div", "caracal-ops-muted", "The latest server-persisted activity for each character."));
    const grid = operationsMake("div", "caracal-ops-activity-grid");
    snapshots.forEach((snapshot) => grid.appendChild(operationsCharacterActivityTile(snapshot)));
    panel.appendChild(grid);
    return panel;
  }

  function operationsTrackerNumeric(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function operationsEnsureTrackerCatalog() {
    if (operationsTrackerCatalogAttempted) return;
    const gameMonsters = Object.keys(window.G?.monsters || {});
    if (gameMonsters.length || operationsCatalogMonsters.length) return;
    operationsTrackerCatalogAttempted = true;
    Promise.all([
      operationsLoadCatalog().catch(() => null),
      ensureSpriteRenderer().catch(() => null),
    ]).then(() => {
      const panel = document.querySelector(".caracal-ops-tracker-panel");
      if (panel?._caracalSnapshots) {
        const trackerScroll = operationsTrackerScrollPosition(panel);
        const nextPanel = operationsTrackerPanel(panel._caracalSnapshots);
        panel.replaceWith(nextPanel);
        operationsRestoreTrackerScroll(nextPanel, trackerScroll);
      }
    });
  }

  function operationsTrackerMonsterCatalog() {
    const catalog = new Map();
    const add = (id, raw) => {
      const value = raw && typeof raw === "object" ? raw : {};
      const definition = value.definition && typeof value.definition === "object" ? value.definition : value;
      const monsterId = String(id || value.id || "").trim();
      if (!monsterId || !definition || typeof definition !== "object") return;
      if ((definition.cute && !definition.achievements) || definition.unlist) return;
      catalog.set(monsterId, {
        id: monsterId,
        name: String(value.name || definition.name || monsterId),
        skin: String(value.skin || definition.skin || monsterId),
        drops: Array.isArray(value.drops) ? value.drops : null,
        homeServerDrops: Array.isArray(value.homeServerDrops) ? value.homeServerDrops : null,
        definition,
      });
    };
    Object.entries(window.G?.monsters || {}).forEach(([id, definition]) => add(id, definition));
    operationsCatalogMonsters.forEach((monster) => add(monster?.id, monster));
    return catalog;
  }

  function operationsTrackerRecord(snapshots) {
    const trio = operationsTrioRecord(snapshots) || {};
    const merchant = snapshots.find((snapshot) => snapshot.name === "Character01MCH")?.shared || {};
    const dashboard = merchant.dashboard || {};
    const state = merchant.state || {};
    const tracktrix = trio.tracktrix || merchant.tracktrix || dashboard.tracktrix || state.tracktrix || {};
    const exchangeRecord = merchant.exchange || {};
    const trackerCandidate = trio.monsterTracker || tracktrix.monsterTracker || tracktrix.tracker || dashboard.monsterTracker || state.monsterTracker || tracktrix;
    const tracker = trackerCandidate && (Array.isArray(trackerCandidate.monsters) || Array.isArray(trackerCandidate.entries) || trackerCandidate.scores || trackerCandidate.observations || trackerCandidate.available !== undefined) ? trackerCandidate : {};
    const exchangeCandidate = trio.merchantExchange || tracktrix.merchantExchange || tracktrix.exchange || dashboard.merchantExchange || state.merchantExchange || {};
    const exchange = exchangeCandidate && (Array.isArray(exchangeCandidate.items) || Array.isArray(exchangeCandidate.entries) || Array.isArray(exchangeCandidate.listings) || exchangeCandidate.items) ? exchangeCandidate : (Array.isArray(exchangeRecord.exchanges) ? { ...exchangeRecord, items: exchangeRecord.exchanges } : exchangeRecord);
    return {
      trio,
      tracker,
      exchange,
    };
  }

  function operationsTrackerMonsterRows(snapshots) {
    const { trio, tracker } = operationsTrackerRecord(snapshots);
    const killsByMonster = trio.killsByMonster && typeof trio.killsByMonster === "object" ? trio.killsByMonster : {};
    const scores = tracker.scores && typeof tracker.scores === "object" ? tracker.scores : {};
    const observations = tracker.observations && typeof tracker.observations === "object" ? tracker.observations : {};
    const metadata = tracker.metadata && typeof tracker.metadata === "object" ? tracker.metadata : {};
    const maxMonsters = tracker.max?.monsters && typeof tracker.max.monsters === "object"
      ? tracker.max.monsters
      : metadata.max?.monsters && typeof metadata.max.monsters === "object"
        ? metadata.max.monsters
        : {};
    const drops = tracker.drops && typeof tracker.drops === "object"
      ? tracker.drops
      : metadata.drops && typeof metadata.drops === "object"
        ? metadata.drops
        : {};
    const dropsHome = tracker.drops_home && typeof tracker.drops_home === "object"
      ? tracker.drops_home
      : metadata.dropsHome && typeof metadata.dropsHome === "object"
        ? metadata.dropsHome
        : {};
    const monstersHomeServer = tracker.monsters_home_server && typeof tracker.monsters_home_server === "object"
      ? tracker.monsters_home_server
      : metadata.monstersHomeServer && typeof metadata.monstersHomeServer === "object"
        ? metadata.monstersHomeServer
        : {};
    const rows = new Map();
    const upsert = (key, raw, fallbackKills, fallbackScore) => {
      const record = raw && typeof raw === "object" ? raw : {};
      const id = String(record.id || record.monster || record.mtype || key || "").trim();
      const name = String(record.name || record.monsterName || record.mtypeName || id || "").trim();
      if (!name) return;
      const rowKey = id.toLowerCase() || name.toLowerCase();
      const previous = rows.get(rowKey) || {
        id,
        name,
        skin: name,
        kills: null,
        score: null,
        maxScore: null,
        maxOwner: null,
        drops: null,
        homeServerDrops: null,
        homeServerDropMetadata: null,
        record: {},
      };
      previous.id = id || previous.id;
      previous.name = name || previous.name;
      previous.skin = record.skin || record.monsterSkin || record.sprite || record.icon || previous.skin || name;
      const kills = operationsTrackerNumeric(record.kills, record.killCount, record.count, fallbackKills);
      const score = operationsTrackerNumeric(record.score, record.points, record.value, fallbackScore);
      if (kills !== null) previous.kills = kills;
      if (score !== null) previous.score = score;
      const maxEntry = record.maxScore !== undefined
        ? [record.maxScore, record.maxOwner]
        : maxMonsters[id] || maxMonsters[key];
      if (Array.isArray(maxEntry)) {
        const maxScore = operationsTrackerNumeric(maxEntry[0]);
        if (maxScore !== null) previous.maxScore = maxScore;
        if (maxEntry[1] !== null && maxEntry[1] !== undefined && maxEntry[1] !== "") previous.maxOwner = String(maxEntry[1]);
      }
      const regularDrops = record.drops !== undefined ? record.drops : drops[id] ?? drops[key];
      const homeDrops = record.homeServerDrops !== undefined ? record.homeServerDrops : dropsHome[id] ?? dropsHome[key];
      const homeDropMetadata = record.homeServerDropMetadata !== undefined
        ? record.homeServerDropMetadata
        : monstersHomeServer[id] ?? monstersHomeServer[key];
      if (regularDrops !== undefined) previous.drops = regularDrops;
      if (homeDrops !== undefined) previous.homeServerDrops = homeDrops;
      if (homeDropMetadata !== undefined) previous.homeServerDropMetadata = homeDropMetadata;
      previous.record = { ...previous.record, ...record };
      rows.set(rowKey, previous);
    };

    const includeCatalog = tracker.available === true || Object.keys(tracker).length > 0;
    if (includeCatalog) operationsTrackerMonsterCatalog().forEach((record) => upsert(record.id, record, 0, null));
    if (Array.isArray(tracker.monsters)) tracker.monsters.forEach((record) => upsert(record?.name || record?.monster || record?.id, record));
    if (Array.isArray(tracker.entries)) tracker.entries.forEach((record) => upsert(record?.name || record?.monster || record?.id, record));
    Object.entries(killsByMonster).forEach(([name, value]) => upsert(name, null, value, null));
    Object.entries(scores).forEach(([name, value]) => {
      const score = value && typeof value === "object" ? value.score ?? value.points ?? value.value : value;
      upsert(name, value, null, score);
    });
    Object.entries(observations).forEach(([name, value]) => upsert(name, value, null, null));

    return Array.from(rows.values()).sort((left, right) =>
      (right.kills ?? -1) - (left.kills ?? -1)
      || (right.score ?? -1) - (left.score ?? -1)
      || left.name.localeCompare(right.name));
  }

  function operationsTrackerExchangeRows(snapshots) {
    const { exchange } = operationsTrackerRecord(snapshots);
    const rows = new Map();
    const upsert = (key, raw, fallbackCount) => {
      const record = raw && typeof raw === "object" ? raw : {};
      const id = String(record.id || key || record.item || record.itemName || "").trim();
      const name = String(record.name || record.item || record.itemName || record.id || key || "").trim();
      if (!name) return;
      const count = operationsTrackerNumeric(record.count, record.quantity, record.total, record.amount, record.value, record.exchangeCount, fallbackCount);
      if (count === null) return;
      const rowKey = id.toLowerCase() || name.toLowerCase();
      const previous = rows.get(rowKey) || { id, name, itemId: id, level: null, skin: name, count: 0, requiredQuantity: null, quantity: null, record: {} };
      previous.id = id || previous.id;
      previous.name = name || previous.name;
      previous.itemId = record.itemId || previous.itemId || id;
      previous.level = record.level !== undefined ? record.level : previous.level;
      previous.skin = record.skin || record.itemSkin || record.sprite || previous.skin || name;
      previous.count = count;
      if (record.requiredQuantity !== undefined) previous.requiredQuantity = record.requiredQuantity;
      if (record.quantity !== undefined) previous.quantity = record.quantity;
      previous.record = { ...previous.record, ...record };
      rows.set(rowKey, previous);
    };

    const rawItems = Array.isArray(exchange.items)
      ? exchange.items
      : Array.isArray(exchange.entries)
        ? exchange.entries
        : Array.isArray(exchange.listings)
          ? exchange.listings
          : Array.isArray(exchange.exchanges)
            ? exchange.exchanges
          : null;
    const knownExchangeIds = new Set((rawItems || []).map((record) => String(record?.id || "")).filter(Boolean));
    Object.keys(exchange.totals || {}).forEach((id) => knownExchangeIds.add(id));

    const addCatalogDefinition = (id, definition, item = null) => {
      const baseId = String(id || item?.id || "").trim();
      const value = definition && typeof definition === "object" ? definition : {};
      if (!baseId || !value.e || value.ignore) return;
      const levels = value.upgrade || value.compound
        ? Array.from({ length: 13 }, (_, level) => level).filter((level) => window.G?.drops?.[baseId + level] || knownExchangeIds.has(baseId + level))
        : [null];
      levels.forEach((level) => {
        const exchangeId = level === null ? baseId : baseId + level;
        upsert(exchangeId, {
          id: exchangeId,
          itemId: baseId,
          name: String(item?.name || value.name || baseId),
          skin: String(item?.skin || value.skin || baseId),
          level,
          exchangeCount: 0,
          quantity: null,
          requiredQuantity: value.e,
          definition: value,
        }, 0);
      });
    };
    const includeCatalog = exchange.available === true || Object.keys(exchange).length > 0;
    if (includeCatalog) {
      Object.entries(window.G?.items || {}).forEach(([id, definition]) => addCatalogDefinition(id, definition));
      operationsCatalogItems.forEach((item) => addCatalogDefinition(item?.id, item?.definition || item, item));
    }

    if (rawItems) rawItems.forEach((record) => upsert(record?.id || record?.name || record?.item || record?.itemName, record));
    else if (exchange.items && typeof exchange.items === "object") {
      Object.entries(exchange.items).forEach(([name, value]) => upsert(name, value, typeof value === "number" ? value : null));
    }

    return Array.from(rows.values()).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  }

  function operationsRenderTrackerIcon(target, name, skin, actual) {
    const label = String(name || "?");
    target.replaceChildren();
    const fallback = label.slice(0, 2).toUpperCase();
    const visualSkin = String(skin || label);
    if (actual && operationsRenderCatalogIcon(target, visualSkin, actual)) return true;
    try {
      const monster = window.G?.monsters?.[visualSkin] || window.G?.monsters?.[label];
      const resolvedSkin = String(monster?.skin || visualSkin);
      if (typeof window.sprite === "function") {
        target.innerHTML = window.sprite(resolvedSkin, { scale: 1.1, width: 30, height: 30, overflow: true }) || "";
        normalizeGameMarkupImages(target);
        if (target.querySelector("img") || target.firstElementChild) return true;
      }
    } catch (_) { }
    target.textContent = fallback;
    return false;
  }

  function operationsTrackerStat(label, value) {
    const row = operationsMake("div", "caracal-ops-tracker-stat");
    row.append(operationsMake("span", "", label), operationsMake("strong", "", value));
    return row;
  }

  function operationsTrackerCard(row, mode) {
    const isExchange = mode === "exchange";
    const baseLabel = isExchange ? operationsCatalogLabel(row.itemId || row.name, row.name) : row.name;
    const label = isExchange && row.level !== null && row.level !== undefined ? `${baseLabel} +${row.level}` : baseLabel;
    const card = operationsMake("article", "caracal-ops-tracker-card");
    card.title = row.id ? `${label} (${row.id})` : label;
    const name = operationsMake("div", "caracal-ops-tracker-name", label);
    const icon = operationsMake("span", "caracal-ops-tracker-icon", label.slice(0, 2).toUpperCase());
    icon.setAttribute("aria-hidden", "true");
    operationsRenderTrackerIcon(icon, isExchange ? row.itemId || row.name : row.name, row.skin, isExchange ? row.record || row : null);
    card.append(name, icon);
    if (isExchange) {
      card.append(
        operationsTrackerStat("Count", operationsFormatCompact(row.count)),
        operationsTrackerStat("Required", row.requiredQuantity === null || row.requiredQuantity === undefined ? "—" : operationsFormatCompact(row.requiredQuantity)),
        operationsTrackerStat("Quantity", row.quantity === null || row.quantity === undefined ? "—" : operationsFormatCompact(row.quantity)),
      );
    } else {
      card.append(
        operationsTrackerStat("Kills", row.kills === null ? "—" : operationsFormatCompact(row.kills)),
        operationsTrackerStat("Score", row.score === null ? "—" : operationsFormatCompact(row.score)),
      );
      if (row.maxScore !== null || row.maxOwner) {
        card.appendChild(operationsTrackerStat("Max", row.maxScore === null ? row.maxOwner : `${operationsFormatCompact(row.maxScore)}${row.maxOwner ? ` · ${row.maxOwner}` : ""}`));
      }
      if (Array.isArray(row.drops) || Array.isArray(row.homeServerDrops)) {
        const regularCount = Array.isArray(row.drops) ? row.drops.length : 0;
        const homeCount = Array.isArray(row.homeServerDrops) ? row.homeServerDrops.length : 0;
        card.appendChild(operationsTrackerStat("Drops", `${regularCount} · Home ${homeCount}`));
      }
    }
    return card;
  }

  function operationsTrackerRenderKey(snapshots) {
    const record = operationsTrackerRecord(snapshots);
    return `${operationsTrackerViewMode}|${JSON.stringify(record)}`;
  }

  function operationsTrackerPanel(snapshots) {
    const panel = operationsMake("section", "caracal-ops-panel caracal-ops-tracker-panel");
    panel.dataset.renderKey = operationsTrackerRenderKey(snapshots);
    const { trio, tracker, exchange } = operationsTrackerRecord(snapshots);
    const heading = operationsMake("div", "caracal-ops-tracker-heading");
    heading.appendChild(operationsMake("div", "caracal-ops-section-title", "Tracker & exchange"));
    const toolbar = operationsMake("div", "caracal-ops-tracker-toolbar");
    ["monsters", "exchange"].forEach((mode) => {
      const button = operationsMake("button", `caracal-ops-tracker-mode${operationsTrackerViewMode === mode ? " is-active" : ""}`, mode);
      button.type = "button";
      button.setAttribute("aria-pressed", operationsTrackerViewMode === mode ? "true" : "false");
      button.addEventListener("click", () => {
        operationsTrackerViewMode = mode;
        const currentPanel = button.closest(".caracal-ops-tracker-panel");
        if (currentPanel) currentPanel.replaceWith(operationsTrackerPanel(currentPanel._caracalSnapshots || snapshots));
      });
      toolbar.appendChild(button);
    });
    heading.appendChild(toolbar);
    panel.appendChild(heading);

    const rows = operationsTrackerViewMode === "exchange"
      ? operationsTrackerExchangeRows(snapshots)
      : operationsTrackerMonsterRows(snapshots);
    const observedKills = rows.some((row) => row.kills !== null)
      ? rows.reduce((sum, row) => sum + (row.kills || 0), 0)
      : null;
    const updatedAt = operationsTimestamp(tracker.updatedAt || exchange.updatedAt || trio.updatedAt);
    const totalKills = operationsTrackerNumeric(trio.kills, tracker.totalKills, observedKills);
    const hasTrackerRecord = Object.keys(trio).length || tracker.available === true || exchange.available === true || rows.length;
    panel.appendChild(operationsMake(
      "div",
      "caracal-ops-muted",
      hasTrackerRecord
        ? `${operationsTrackerViewMode === "exchange" ? "Tracktrix exchange totals" : totalKills !== null ? `Total kills: ${operationsFormatCompact(totalKills)}` : "Tracktrix monster data"} · Updated ${new Date(updatedAt || Date.now()).toLocaleTimeString()}`
        : "Waiting for CaracAL.TrioMetrics.v2…",
    ));

    const grid = operationsMake("div", "caracal-ops-tracker-grid");
    rows.forEach((row) => grid.appendChild(operationsTrackerCard(row, operationsTrackerViewMode)));
    if (!rows.length) {
      const reason = operationsTrackerViewMode === "exchange"
        ? exchange.unavailableReason || "Waiting for the merchant to publish Tracktrix exchange data…"
        : tracker.unavailableReason || "Waiting for the merchant to publish Tracktrix monster data…";
      grid.appendChild(operationsMake("div", "caracal-ops-tracker-empty", reason));
    }
    panel.appendChild(grid);
    panel._caracalSnapshots = snapshots;
    operationsEnsureTrackerCatalog();
    return panel;
  }

  function operationsLootTotals(snapshots, trio, loot) {
    const directTotals = operationsGraphItemTotals(loot);
    if (Object.keys(directTotals).length) return directTotals;
    const trioTotals = operationsGraphItemTotals(trio);
    if (Object.keys(trioTotals).length) return trioTotals;
    const totals = {};
    snapshots.forEach((snapshot) => {
      const metrics = operationsGraphNormalizeMetrics(snapshot.shared?.metrics || {});
      Object.entries(metrics.itemCounts || {}).forEach(([name, value]) => {
        const quantity = Number(value) || 0;
        if (quantity > 0) totals[name] = (totals[name] || 0) + quantity;
      });
    });
    return totals;
  }

  function operationsLootPanel(snapshots) {
    const panel = operationsPanel("Loot", "caracal-ops-loot-panel");
    const trio = operationsTrioRecord(snapshots);
    const loot = snapshots.map((snapshot) => snapshot.shared?.loot).find((record) => record && Object.keys(record).length) || {};
    const totals = operationsLootTotals(snapshots, trio, loot);
    const monthly = loot.monthly || {};
    const hasMonthlyItems = monthly.items && typeof monthly.items === "object" && Object.keys(monthly.items).length > 0;
    const title = hasMonthlyItems ? `${monthly.month || "Current month"} · ${operationsFormatCompact(Object.values(monthly.items).reduce((sum, value) => sum + (Number(value) || 0), 0))} items` : `Cumulative loot · ${operationsFormatCompact(Object.values(totals).reduce((sum, value) => sum + (Number(value) || 0), 0))} items`;
    panel.appendChild(operationsMake("div", "caracal-ops-muted", `${title}${monthly.gold !== null && monthly.gold !== undefined ? ` · ${operationsFormatCompact(monthly.gold)} gold` : ""}`));
    if (!hasMonthlyItems && monthly.unavailableReason) panel.appendChild(operationsMake("div", "caracal-ops-muted", monthly.unavailableReason));
    const grid = operationsMake("div", "caracal-ops-collection-grid");
    Object.entries(hasMonthlyItems ? monthly.items : totals).sort((left, right) => (Number(right[1]) || 0) - (Number(left[1]) || 0)).slice(0, 120).forEach(([name, value]) => {
      grid.appendChild(operationsCollectionCard(name, operationsFormatCompact(value), hasMonthlyItems ? "This month" : "All-time total"));
    });
    if (!grid.childElementCount) grid.appendChild(operationsMake("div", "caracal-ops-muted", "No loot totals available."));
    panel.appendChild(grid);
    return panel;
  }

  const OPERATIONS_MIN_BANK_TAB_SLOTS = 42;

  function operationsBankTabs(bank) {
    if (Array.isArray(bank?.tabs) && bank.tabs.length) {
      return bank.tabs.map((tab, index) => {
        const rawSlots = Array.isArray(tab?.slots) ? tab.slots : null;
        const rawItems = Array.isArray(tab?.items) ? tab.items : [];
        const declaredCapacity = Number(tab?.capacity) || 0;
        const minimumCapacity = Math.max(OPERATIONS_MIN_BANK_TAB_SLOTS, declaredCapacity, rawSlots ? rawSlots.length : rawItems.length);
        const slots = rawSlots
          ? rawSlots.map((item) => operationsNormalizeBankItem(item))
          : Array.from({ length: minimumCapacity }, () => null);
        while (slots.length < minimumCapacity) slots.push(null);
        let nextOpen = 0;
        rawItems.forEach((item) => {
          const normalized = operationsNormalizeBankItem(item);
          if (!normalized) return;
          const slot = Number(item.slot ?? item.index);
          if (Number.isInteger(slot) && slot >= 0) {
            while (slots.length <= slot) slots.push(null);
            slots[slot] = normalized;
            nextOpen = Math.max(nextOpen, slot + 1);
            return;
          }
          while (nextOpen < slots.length && slots[nextOpen]) nextOpen += 1;
          if (nextOpen >= slots.length) slots.push(normalized);
          else slots[nextOpen] = normalized;
          nextOpen += 1;
        });
        const items = slots.filter(Boolean);
        return {
          ...tab,
          index: Number.isFinite(Number(tab?.index)) ? Number(tab.index) : index,
          name: tab?.name || `Items${index}`,
          slots,
          items,
          capacity: Math.max(OPERATIONS_MIN_BANK_TAB_SLOTS, Number(tab?.capacity) || 0, slots.length),
          used: Number.isFinite(Number(tab?.used)) ? Number(tab.used) : items.length,
        };
      });
    }
    return Object.keys(bank || {})
      .filter((key) => /^items\d+$/i.test(key) && Array.isArray(bank[key]))
      .sort((left, right) => Number(left.slice(5)) - Number(right.slice(5)))
      .map((key, index) => {
        const rawItems = bank[key];
        const capacity = Math.max(OPERATIONS_MIN_BANK_TAB_SLOTS, rawItems.length);
        const slots = rawItems.map((item) => operationsNormalizeBankItem(item));
        while (slots.length < capacity) slots.push(null);
        const items = slots.filter(Boolean);
        return {
          index,
          name: key.replace(/^items/i, "Items "),
          capacity,
          used: items.length,
          slots,
          items,
        };
      });
  }

  function operationsNormalizeBankItem(item) {
    if (!item || typeof item !== "object") return null;
    const quantityValue = item.quantity ?? item.q;
    const quantity = Number.isFinite(Number(quantityValue)) ? Number(quantityValue) : 1;
    const upgradeValue = item.upgradeLevel ?? item.level;
    const upgradeLevel = Number.isFinite(Number(upgradeValue)) ? Number(upgradeValue) : 0;
    return { ...item, quantity, q: quantity, upgradeLevel, level: upgradeLevel };
  }

  function operationsBankItems(tabs) {
    return tabs.flatMap((tab) => (Array.isArray(tab.slots) ? tab.slots : tab.items || [])
      .filter(Boolean)
      .map((item) => ({ ...item, _bankTab: tab.name })));
  }

  function operationsBankCategory(item) {
    const definition = operationsCatalogDefinition(item?.name);
    const name = String(item?.name || "").toLowerCase();
    const token = [
      item?.category,
      item?.type,
      item?.slot,
      definition?.category,
      definition?.type,
      definition?.slot,
      name,
    ].filter(Boolean).join(" ").toLowerCase();
    if (/helmet|headgear|hat\b/.test(token)) return "Helmets";
    if (/underarmor|under-armour|underarmour|underwear/.test(token)) return "Underarmors";
    if (/glove|gauntlet/.test(token)) return "Gloves";
    if (/shoe|boot|footwear/.test(token)) return "Shoes";
    if (/cape|cloak/.test(token)) return "Capes";
    if (/ring|amulet|necklace/.test(token)) return "Rings";
    if (/armor|armour|coat|shirt|chest|body/.test(token)) return "Armors";
    if (/weapon|bow|staff|sword|blade|mace|quiver|throwing/.test(token)) return "Weapons";
    if (/consume|potion|elixir|food|material|quest/.test(token)) return "Items";
    return "Other";
  }

  function operationsBankStackItems(items) {
    const merged = new Map();
    items.forEach((rawItem) => {
      const item = operationsNormalizeBankItem(rawItem);
      if (!item) return;
      const key = [item.name || "item", item.skin || "", item.upgradeLevel || 0].join("\u0000");
      const previous = merged.get(key);
      if (!previous) {
        merged.set(key, { ...item, quantity: Math.max(1, Number(item.quantity) || 1) });
        return;
      }
      previous.quantity += Math.max(1, Number(item.quantity) || 1);
      previous.q = previous.quantity;
    });
    return Array.from(merged.values());
  }

  function operationsBankSlot(grid, item, index) {
    const button = operationsMake("button", "caracal-ops-bank-slot");
    button.type = "button";
    if (!item) {
      button.disabled = true;
      button.title = `Empty bank slot ${index + 1}`;
      button.setAttribute("aria-label", `Empty bank slot ${index + 1}`);
      grid.appendChild(button);
      return;
    }
    const name = String(item?.name || "item");
    const definition = operationsCatalogDefinition(name);
    const label = operationsCatalogLabel(name, name);
    const upgradeLevel = Number(item?.upgradeLevel) || 0;
    const quantity = Number(item?.quantity);
    const suffix = `${upgradeLevel > 0 ? ` +${upgradeLevel}` : ""}${quantity > 1 ? ` ×${quantity}` : ""}`;
    const fullLabel = `${label}${suffix}`;
    button.title = fullLabel;
    button.setAttribute("aria-label", fullLabel);
    const icon = operationsMake("span", "caracal-ops-bank-slot-icon", String(label).slice(0, 2).toUpperCase());
    icon.setAttribute("aria-hidden", "true");
    const hasIcon = operationsRenderCatalogIcon(icon, item.skin || definition?.skin || name, item);
    if (!hasIcon) icon.textContent = String(label).slice(0, 2).toUpperCase();
    button.appendChild(icon);
    if (upgradeLevel > 0) button.appendChild(operationsMake("span", "caracal-ops-bank-slot-level", `+${upgradeLevel}`));
    if (quantity > 1) button.appendChild(operationsMake("span", "caracal-ops-bank-slot-quantity", String(quantity)));
    grid.appendChild(button);
  }

  function operationsBankPanel(snapshots) {
    const panel = operationsMake("section", "caracal-ops-panel caracal-ops-bank-panel");
    const bank = snapshots.map((snapshot) => snapshot.shared?.bank).find((record) => record && Object.keys(record).length) || {};
    const tabsData = operationsBankTabs(bank);
    const hasSnapshot = Boolean(bank.available) || tabsData.length > 0;
    const used = tabsData.length
      ? tabsData.reduce((sum, tab) => sum + tab.items.length, 0)
      : Number.isFinite(Number(bank.used)) ? Number(bank.used) : 0;
    const capacity = tabsData.length
      ? tabsData.reduce((sum, tab) => sum + tab.slots.length, 0)
      : Number.isFinite(Number(bank.capacity)) ? Number(bank.capacity) : 0;
    const heading = operationsMake("div", "caracal-ops-bank-heading");
    heading.appendChild(operationsMake("div", "caracal-ops-section-title", "Bank"));
    const toolbar = operationsMake("div", "caracal-ops-bank-toolbar");
    ["flat", "stack", "tab"].forEach((mode) => {
      const button = operationsMake("button", `caracal-ops-bank-mode${operationsBankViewMode === mode ? " is-active" : ""}`, mode);
      button.type = "button";
      button.setAttribute("aria-pressed", operationsBankViewMode === mode ? "true" : "false");
      button.addEventListener("click", () => {
        if (operationsBankViewMode === mode) return;
        operationsBankViewMode = mode;
        operationsMarkLayoutDirty();
        renderOperationsDashboard();
      });
      toolbar.appendChild(button);
    });
    heading.appendChild(toolbar);
    panel.appendChild(heading);
    const bankGold = bank.accountGold ?? bank.gold ?? bank.bankGold;
    const bankSchemaLabel = bank.schema === "CaracAL.Bank.v2" ? "CaracAL.Bank.v2" : "legacy bank snapshot";
    panel.appendChild(operationsMake("div", "caracal-ops-bank-note", hasSnapshot ? `${operationsFormatInteger(used)} / ${operationsFormatInteger(capacity)} slots · ${bankGold === null || bankGold === undefined ? "Gold unavailable" : `${operationsFormatCompact(bankGold)} gold`} · ${bankSchemaLabel}` : "Waiting for CaracAL.Bank.v2…"));
    const content = operationsMake("div", `caracal-ops-bank-tabs${operationsBankViewMode === "tab" ? " is-tab-mode" : ""}`);
    if (!tabsData.length) {
      content.appendChild(operationsMake("div", "caracal-ops-muted", "No bank snapshot available."));
      panel.appendChild(content);
      return panel;
    }
    if (operationsBankViewMode === "tab") {
      tabsData.forEach((tab) => {
        const section = operationsMake("section", "caracal-ops-bank-tab");
        const slots = Array.isArray(tab.slots) ? tab.slots : tab.items || [];
        const tabCapacity = Math.max(Number(tab.capacity) || 0, slots.length);
        const tabUsed = Number.isFinite(Number(tab.used)) ? Number(tab.used) : slots.filter(Boolean).length;
        section.appendChild(operationsMake("div", "caracal-ops-bank-tab-title", `${tab.name || `Items${tab.index}`} · ${tabUsed}/${tabCapacity}`));
        const grid = operationsMake("div", "caracal-ops-bank-grid");
        for (let index = 0; index < Math.min(tabCapacity, 250); index += 1) operationsBankSlot(grid, slots[index] || null, index);
        section.appendChild(grid);
        content.appendChild(section);
      });
    } else {
      const items = operationsBankItems(tabsData);
      const groups = new Map();
      if (operationsBankViewMode === "stack") {
        groups.set("Stacked items", operationsBankStackItems(items));
      } else {
        items.forEach((item) => {
          const category = operationsBankCategory(item);
          const group = groups.get(category) || [];
          group.push(item);
          groups.set(category, group);
        });
      }
      Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right)).forEach(([name, groupItems]) => {
        const section = operationsMake("section", "caracal-ops-bank-group");
        section.appendChild(operationsMake("div", "caracal-ops-bank-group-title", `${name} · ${groupItems.length}`));
        const grid = operationsMake("div", "caracal-ops-bank-grid");
        groupItems.slice(0, 500).forEach((item, index) => operationsBankSlot(grid, item, index));
        section.appendChild(grid);
        content.appendChild(section);
      });
    }
    panel.appendChild(content);
    return panel;
  }

  function operationsScrollTo(selector, fallback) {
    const target = document.querySelector(selector);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    showDashboardNotice(fallback || "That CaracAL panel is not available yet.", true);
  }

  function operationsOpenScriptDashboard(id, label) {
    if (operationsViewOnly) {
      showDashboardNotice("Sign in to use CaracAL controls.", true);
      return;
    }
    if (window.PiScriptDashboards && typeof window.PiScriptDashboards.open === "function") {
      window.PiScriptDashboards.open(id);
      return;
    }
    // Header actions are independent of the optional Ingame Scripts sidebar menu.
    showDashboardNotice("Loading " + label + "...");
    loadScriptDashboardHost()
      .then(() => window.PiScriptDashboards.open(id))
      .catch((error) => showDashboardNotice(error.message || (label + " is unavailable."), true));
  }

  function operationsHeaderAction(label, icon, title, handler, tone) {
    const viewOnly = operationsViewOnly;
    const button = operationsMake("button", `caracal-ops-header-action ${tone || ""}${viewOnly ? " view-only" : ""}`.trim());
    button.type = "button";
    button.disabled = viewOnly;
    button.title = viewOnly ? `${title} · Sign in to use this control` : title;
    button.setAttribute("aria-label", title);
    if (viewOnly) button.setAttribute("aria-disabled", "true");
    button.append(
      operationsMake("span", "caracal-ops-header-icon", icon),
      document.createTextNode(label),
    );
    button.addEventListener("click", () => {
      if (!operationsViewOnly) handler();
    });
    return button;
  }

  function operationsAccountGold(snapshots) {
    const bank = snapshots
      .map((snapshot) => snapshot.shared?.bank)
      .find((record) => record && Object.keys(record).length) || {};
    const balances = snapshots.map((snapshot) => snapshot.goldNumber);
    const carried = balances.every((value) => Number.isFinite(Number(value)))
      ? balances.reduce((sum, value) => sum + Number(value), 0)
      : null;
    const bankBalance = bank.accountGold ?? bank.gold ?? bank.bankGold;
    const bankGold = Number.isFinite(Number(bankBalance)) ? Number(bankBalance) : null;
    return {
      bankGold,
      carried,
      total: bankGold !== null && carried !== null ? bankGold + carried : null,
    };
  }

  function operationsHeaderActions(snapshots) {
    const actions = operationsMake("nav", "caracal-ops-header-actions");
    actions.append(
      operationsHeaderAction("Mail", "✉", "Open the server-backed CaracAL mail panel", () => operationsOpenScriptDashboard("mail", "Mail"), "mail"),
      operationsHeaderAction("Catalog", "▦", "Open the client-free Adventure Land equipment catalog", () => operationsOpenScriptDashboard("catalog", "Catalog"), "catalog"),
      operationsHeaderAction("Bestiary", "▤", "Open the client-free CaracAL bestiary", () => operationsOpenScriptDashboard("bestiary", "Bestiary"), "bestiary"),
      operationsHeaderAction("Skills", "✦", "Open the client-free Adventure Land skills catalog", () => operationsOpenScriptDashboard("skills", "Skills"), "skills"),
      operationsHeaderAction("Inspect stand", "🛒", "Show the items currently listed on the merchant stand", () => operationsOpenScriptDashboard("merchant-stand", "Inspect stand"), "stand"),
      operationsHeaderAction("View market", "⌕", "Show player stands currently visible to the merchant", () => operationsOpenScriptDashboard("merchant-market", "View market"), "market"),
      operationsHeaderAction("Inspect bank", "▥", "Open the server-persisted bank snapshot", () => operationsOpenScriptDashboard("bank", "Inspect bank"), "bank"),
      operationsHeaderAction("Logs", "≡", "Open server-persisted per-character activity logs", () => operationsOpenScriptDashboard("logs", "Logs"), "logs"),
      operationsHeaderAction("Settings", "⚙", "Open CaracAL settings", () => openSettingsPanel(), "settings"),
    );
    return actions;
  }

  function operationsCharacterColumns(container, count) {
    const gap = Number.parseFloat(window.getComputedStyle(container).columnGap) || 16;
    const minimumTileWidth = 350;
    const availableWidth = Math.max(minimumTileWidth, container.clientWidth);
    return Math.max(1, Math.min(count || 1, Math.floor((availableWidth + gap) / (minimumTileWidth + gap))));
  }

  function operationsLayoutCharacterTiles(container, boxes, snapshots) {
    if (!container) return;
    container.querySelectorAll(":scope > .caracal-character-activity").forEach((tile) => tile.remove());
    const columns = operationsCharacterColumns(container, boxes.length);
    const characterRows = Math.ceil(boxes.length / columns);
    container.style.setProperty("--caracal-character-columns", String(columns));
    container.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    boxes.forEach((box, index) => {
      box.style.gridColumn = String((index % columns) + 1);
      box.style.gridRow = String(Math.floor(index / columns) + 1);
      box.style.width = "100%";
    });
    snapshots.forEach((snapshot, index) => {
      const tile = operationsCharacterActivityTile(snapshot);
      tile.style.gridColumn = String((index % columns) + 1);
      tile.style.gridRow = String(characterRows + Math.floor(index / columns) + 1);
      tile.style.width = "100%";
      container.appendChild(tile);
    });
  }

  function operationsCharacterCard(snapshot) {
    const card = operationsMake("article", "caracal-ops-character");
    const head = operationsMake("div", "caracal-ops-character-head");
    const avatar = operationsMake("div", "caracal-ops-avatar");
    const portrait = operationsMake("div", "caracal-party-portrait");
    const spriteState = snapshot.spriteState || readTileSprite(snapshot.box);
    renderTileSprite(snapshot.box, portrait, spriteState);
    avatar.appendChild(portrait);
    if (spriteState.skin || spriteState.ctype) {
      ensureSpriteRenderer().then(() => {
        if (portrait.isConnected) renderTileSprite(snapshot.box, portrait, spriteState);
      }).catch(() => { });
    }
    const identity = operationsMake("div", "caracal-ops-identity");
    identity.append(
      operationsMake("div", "caracal-ops-name", snapshot.name),
      operationsMake("div", "caracal-ops-role", `${snapshot.role} · level ${snapshot.level} · ${snapshot.server}`),
    );
    const state = operationsMake("div", "caracal-ops-state", snapshot.active ? "Active" : snapshot.alive === "No" ? "Offline" : "Idle");
    head.append(avatar, identity, state);
    card.append(head);
    card.appendChild(operationsProgressRow("Experience", snapshot.xpProgress, "xp"));
    const hpmp = operationsMake("div", "caracal-ops-hpmp");
    hpmp.append(
      operationsProgressRow("HP", snapshot.healthProgress, "hp"),
      operationsProgressRow("MP", snapshot.manaProgress, "mp"),
    );
    card.appendChild(hpmp);
    const metrics = operationsMake("div", "caracal-ops-metric-grid");
    metrics.append(
      operationsMetric("XP rate", snapshot.xpRate),
      operationsMetric("Gold rate", snapshot.goldRate),
      operationsMetric("Gold", snapshot.gold),
      operationsMetric("Inventory", snapshot.inventory),
      operationsMetric("Ping", snapshot.ping),
      operationsMetric("CC / resource", snapshot.cc),
      operationsMetric("TTLU", snapshot.ttl),
      operationsMetric("Uptime", snapshot.uptime),
      operationsMetric("Modifiers", snapshot.modifiers),
      operationsMetric("HP potions", snapshot.hpPotions),
      operationsMetric("MP potions", snapshot.mpPotions),
      operationsMetric("Gear", snapshot.gear),
      operationsMetric("Nearby", snapshot.nearby),
      operationsMetric("Effects", snapshot.effects),
      operationsMetric("Est. DPS", snapshot.dps),
    );
    card.appendChild(metrics);
    const items = operationsMake("div", "caracal-ops-items");
    items.appendChild(operationsMake("div", "caracal-ops-label", "Inventory items"));
    const itemList = operationsMake("div", "caracal-ops-item-list");
    String(snapshot.inventoryItems || "Empty").split(" · ").filter(Boolean).slice(0, 12).forEach((item) => {
      itemList.appendChild(operationsMake("span", "caracal-ops-item", item));
    });
    if (!itemList.childElementCount) itemList.appendChild(operationsMake("span", "caracal-ops-muted", "Empty"));
    items.appendChild(itemList);
    card.appendChild(items);
    const location = operationsMake("div", "caracal-ops-location");
    location.append(
      operationsMake("span", "", `Location ${snapshot.location}`),
      operationsMake("strong", "", `Target ${snapshot.target}`),
    );
    card.appendChild(location);
    const mapImage = snapshot.box.querySelector(".minimap img");
    if (mapImage && mapImage.src) {
      const map = operationsMake("div", "caracal-ops-map");
      map.appendChild(mapImage.cloneNode(true));
      card.appendChild(map);
    }
    return card;
  }

  function operationsPartyField(label, value) {
    const field = operationsMake("div", "caracal-ops-party-field");
    field.append(
      operationsMake("span", "caracal-ops-label", label),
      operationsMake("strong", "", value || "—"),
    );
    return field;
  }

  function operationsPartyDetailRow(snapshot) {
    const row = operationsMake("article", "caracal-ops-party-row");
    const identity = operationsMake("div", "caracal-ops-party-identity");
    const avatar = operationsMake("div", "caracal-ops-party-avatar");
    const portrait = operationsMake("div", "caracal-party-portrait");
    const spriteState = snapshot.spriteState || readTileSprite(snapshot.box);
    renderTileSprite(snapshot.box, portrait, spriteState);
    avatar.appendChild(portrait);
    if (spriteState.skin || spriteState.ctype) {
      ensureSpriteRenderer().then(() => {
        if (portrait.isConnected) renderTileSprite(snapshot.box, portrait, spriteState);
      }).catch(() => { });
    }
    const identityText = operationsMake("div");
    identityText.append(
      operationsMake("div", "caracal-ops-party-name", snapshot.name),
      operationsMake("div", "caracal-ops-party-role", `${snapshot.role} · level ${snapshot.level} · ${snapshot.server}`),
      operationsMake("div", "caracal-ops-party-state", snapshot.active ? "Active" : snapshot.alive === "No" ? "Offline" : "Idle"),
    );
    identity.append(avatar, identityText);

    const body = operationsMake("div");
    const progress = operationsMake("div", "caracal-ops-party-progress");
    progress.append(
      operationsProgressRow("XP", snapshot.xpProgress, "xp"),
      operationsProgressRow("HP", snapshot.healthProgress, "hp"),
      operationsProgressRow("MP", snapshot.manaProgress, "mp"),
    );
    const metrics = operationsMake("div", "caracal-ops-party-metrics");
    [
      ["XP rate", snapshot.xpRate], ["Gold rate", snapshot.goldRate], ["Gold", snapshot.gold],
      ["Inventory", snapshot.inventory], ["Ping", snapshot.ping], ["TTLU", snapshot.ttl],
      ["Uptime", snapshot.uptime], ["Modifiers", snapshot.modifiers], ["HP pots", snapshot.hpPotions],
      ["MP pots", snapshot.mpPotions], ["Gear", snapshot.gear], ["Nearby", snapshot.nearby],
      ["Effects", snapshot.effects], ["Est. DPS", snapshot.dps],
    ].forEach(([label, value]) => metrics.appendChild(operationsPartyField(label, value)));
    const items = operationsMake("div", "caracal-ops-party-field");
    items.style.marginTop = "10px";
    items.append(
      operationsMake("span", "caracal-ops-label", "Inventory items"),
      operationsMake("strong", "", snapshot.inventoryItems || "Empty"),
    );
    const footer = operationsMake("div", "caracal-ops-party-footer");
    footer.append(
      operationsMake("span", "", `Location ${snapshot.location}`),
      operationsMake("strong", "", `Target ${snapshot.target}`),
    );
    body.append(progress, metrics, items, footer);
    row.append(identity, body);
    return row;
  }

  function operationsRateRow(snapshot, label, value, maximum, tone) {
    const row = operationsMake("div", "caracal-ops-rate-row");
    const name = operationsMake("span", "", `${snapshot.name} ${label}`);
    const bar = operationsMake("div", "caracal-ops-rate-bar");
    const fill = operationsMake("div", "caracal-ops-rate-fill");
    const percent = Number.isFinite(value) && maximum > 0 ? Math.max(3, Math.min(100, value * 100 / maximum)) : 3;
    fill.style.width = `${percent}%`;
    if (tone === "gold") fill.style.background = "linear-gradient(90deg, #c79538, #f0d06b)";
    bar.appendChild(fill);
    row.append(name, bar, operationsMake("strong", "caracal-ops-rate-value", label === "XP" ? snapshot.xpRate : snapshot.goldRate));
    return row;
  }

  function operationsGraphPoints(history) {
    return (Array.isArray(history) ? history : [])
      .map((point) => ({
        time: operationsTimestamp(Array.isArray(point) ? point[0] : point?.time ?? point?.at ?? point?.timestamp),
        value: Number(Array.isArray(point) ? point[1] : point?.value ?? point?.amount ?? point?.total),
      }))
      .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
      .sort((left, right) => left.time - right.time);
  }

  function operationsGraphDamageScore(entry) {
    if (!entry || typeof entry !== "object") return 0;
    return Math.max(0, Number(entry.dps) || 0) + ["damage", "burn", "blast", "base", "cleave", "heal", "manaSteal", "damageReturn", "reflect"]
      .reduce((sum, key) => sum + Math.max(0, Number(entry[key]) || 0), 0);
  }

  function operationsGraphItemTotals(source) {
    if (!source || typeof source !== "object") return {};
    const candidates = [
      source.itemTotals,
      source.itemCounts,
      source.loot?.itemTotals,
      source.loot?.itemCounts,
      source.totals?.items,
      source.loot?.totals?.items,
      source.items,
    ];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const entries = Object.entries(candidate).filter(([, value]) => Number(value) > 0);
      if (entries.length) return Object.fromEntries(entries);
    }
    return {};
  }

  function operationsGraphNormalizeMetrics(metrics) {
    const source = metrics && typeof metrics === "object" ? metrics : {};
    const normalized = { ...source };
    normalized.startedAt = operationsTimestamp(source.startedAt ?? source.sessionStartedAt) || 0;
    normalized.lootGold = operationsEarnedGoldValue(source) ?? 0;
    normalized.xpGained = operationsSessionXpValue(source) ?? 0;
    normalized.mobKills = source.killsByMonster && typeof source.killsByMonster === "object" ? source.killsByMonster : source.mobKills && typeof source.mobKills === "object" ? source.mobKills : {};
    normalized.itemCounts = operationsGraphItemTotals(source);
    normalized.damage = source.damage && typeof source.damage === "object" ? { ...source.damage } : {};
    Object.entries(source.dpsByCharacter || {}).forEach(([name, dps]) => {
      if (normalized.damage[name]) return;
      normalized.damage[name] = { dps: Number(dps) || 0, since: operationsTimestamp(source.startedAt) || 0 };
    });
    if (!Object.keys(normalized.damage).length && Number.isFinite(Number(source.dps))) {
      normalized.damage[source.characterName || "Trio"] = { dps: Number(source.dps) || 0, since: operationsTimestamp(source.startedAt) || 0 };
    }
    return normalized;
  }

  function operationsGraphMemberDamage(source) {
    const members = source?.members;
    if (!members || typeof members !== "object" || Array.isArray(members)) return {};
    const damage = {};
    Object.entries(members).forEach(([name, member]) => {
      if (!member || member.included === false) return;
      const metrics = member.metrics && typeof member.metrics === "object" ? member.metrics : {};
      const dps = Number(metrics.dps);
      const directDamage = Number(metrics.damage);
      if (!Number.isFinite(dps) && !Number.isFinite(directDamage)) return;
      const since = operationsTimestamp(
        metrics.startedAt
        ?? metrics.sessionStartedAt
        ?? member.dashboard?.startedAt
        ?? source.startedAt
        ?? source.sessionStartedAt,
      ) || 0;
      damage[name] = {
        ...(Number.isFinite(dps) ? { dps } : {}),
        ...(Number.isFinite(directDamage) ? { damage: directDamage } : {}),
        since,
      };
    });
    return damage;
  }

  function operationsGraphFromTrio(trio, loot) {
    const trioItems = operationsGraphItemTotals(trio);
    const lootItems = operationsGraphItemTotals(loot);
    const itemTotals = Object.keys(trioItems).length ? trioItems : lootItems;
    const normalized = operationsGraphNormalizeMetrics({
      ...trio,
      lootGold: operationsEarnedGoldValue(trio),
      xpGained: trio.xpEarned,
      itemTotals,
    });
    normalized.startedAt = operationsTimestamp(trio.startedAt ?? trio.sessionStartedAt) || normalized.startedAt || 0;
    normalized.updatedAt = operationsTimestamp(trio.updatedAt) || 0;
    normalized.history = trio.history || {};
    normalized.mobKills = trio.killsByMonster || normalized.mobKills;
    normalized.itemCounts = itemTotals;
    const memberDamage = operationsGraphMemberDamage(trio);
    if (Object.keys(memberDamage).length) {
      const existingDamage = Object.fromEntries(
        Object.entries(normalized.damage).filter(([name]) => name !== "Trio" && name !== trio.characterName),
      );
      normalized.damage = { ...existingDamage, ...memberDamage };
    }
    return normalized;
  }

  function operationsGraphAggregateHistory(records, name, updatedAt) {
    const lists = records.map(({ metrics }) => operationsGraphPoints(metrics?.history?.[name])).filter((points) => points.length);
    if (!lists.length) return [];
    const first = Math.min(...lists.map((points) => points[0].time));
    const last = Math.max(...lists.map((points) => points[points.length - 1].time), operationsTimestamp(updatedAt) || 0);
    const start = Math.floor(first / 60000) * 60000;
    const points = [];
    for (let time = start, index = 0; time <= last && index < 1440; time += 60000, index += 1) {
      const value = lists.reduce((sum, list) => {
        let carried = 0;
        for (const point of list) {
          if (point.time > time) break;
          carried = point.value;
        }
        return sum + carried;
      }, 0);
      points.push([time, value]);
    }
    return points;
  }

  function operationsGraphPrimary(snapshots) {
    const trio = snapshots.map((snapshot) => snapshot.shared?.trio).find((record) => record && (record.history || record.killsByMonster || record.loot));
    const loot = snapshots.map((snapshot) => snapshot.shared?.loot).find((record) => Object.keys(operationsGraphItemTotals(record)).length);
    if (trio) return operationsGraphFromTrio(trio, loot);
    const records = snapshots
      .map((snapshot) => ({ snapshot, metrics: operationsGraphNormalizeMetrics(snapshot.shared?.metrics || {}) }))
      .filter(({ metrics }) => metrics && (
        Object.keys(metrics.history || {}).length
        || Object.keys(metrics.damage || {}).length
        || Object.keys(metrics.mobKills || {}).length
        || Object.keys(metrics.itemCounts || {}).length
      ));
    if (!records.length) return null;

    const nonMerchants = records.filter(({ snapshot }) => String(snapshot.role || "").toLowerCase() !== "merchant");
    const source = nonMerchants.length ? nonMerchants : records;
    const aggregate = {
      history: {},
      damage: {},
      mobKills: {},
      itemCounts: {},
      lootGold: 0,
      xpGained: 0,
      kills: 0,
      startedAt: 0,
      updatedAt: 0,
    };

    source.forEach(({ metrics }) => {
      const historyTimes = [
        ...operationsGraphPoints(metrics.history?.gold),
        ...operationsGraphPoints(metrics.history?.xp),
      ].map((point) => point.time);
      const startedAt = operationsTimestamp(metrics.startedAt) || (historyTimes.length ? Math.min(...historyTimes) : operationsTimestamp(metrics.updatedAt) || 0);
      if (startedAt > 0 && (!aggregate.startedAt || startedAt < aggregate.startedAt)) aggregate.startedAt = startedAt;
      aggregate.updatedAt = Math.max(aggregate.updatedAt, operationsTimestamp(metrics.updatedAt) || 0, ...historyTimes);
      aggregate.lootGold += Number(metrics.lootGold) || 0;
      aggregate.xpGained += Number(metrics.xpGained) || 0;
      aggregate.kills = Math.max(aggregate.kills, Number(metrics.kills) || 0);

      Object.entries(metrics.mobKills || {}).forEach(([name, value]) => {
        aggregate.mobKills[name] = Math.max(aggregate.mobKills[name] || 0, Number(value) || 0);
      });
      Object.entries(metrics.itemCounts || {}).forEach(([name, value]) => {
        aggregate.itemCounts[name] = (aggregate.itemCounts[name] || 0) + (Number(value) || 0);
      });
      Object.entries(metrics.damage || {}).forEach(([name, entry]) => {
        if (operationsGraphDamageScore(entry) <= operationsGraphDamageScore(aggregate.damage[name])) return;
        aggregate.damage[name] = entry;
      });
    });

    aggregate.history.gold = operationsGraphAggregateHistory(source, "gold", aggregate.updatedAt);
    aggregate.history.xp = operationsGraphAggregateHistory(source, "xp", aggregate.updatedAt);
    return aggregate;
  }

  function operationsGraphHistory(metrics, name, unitSeconds, clock, startedAt, currentValue) {
    const points = operationsGraphPoints(metrics?.history?.[name]);
    const result = points
      .map((point) => ({
        time: point.time,
        value: (point.time - startedAt) > 0 ? point.value / ((point.time - startedAt) / 1000 / unitSeconds) : 0,
      }))
      .filter((point) => point.time - startedAt >= 60000);
    const elapsed = clock - startedAt;
    if (elapsed > 0 && Number.isFinite(Number(currentValue))) {
      result.push({ time: clock, value: Number(currentValue) / (elapsed / 1000 / unitSeconds) });
    }
    return result.slice(-60);
  }

  function operationsGraphResetBaseline(metrics) {
    const historyValue = (name) => {
      const points = operationsGraphPoints(metrics.history?.[name]);
      return points.length ? points[points.length - 1].value : 0;
    };
    const damageCounters = ["damage", "burn", "blast", "base", "cleave", "heal", "manaSteal", "damageReturn", "reflect"];
    return {
      gold: Math.max(Number(metrics.lootGold) || 0, historyValue("gold")),
      xp: Math.max(Number(metrics.xpGained) || 0, historyValue("xp")),
      kills: Number(metrics.kills) || 0,
      mobKills: { ...(metrics.mobKills || {}) },
      itemCounts: { ...(metrics.itemCounts || {}) },
      damage: Object.fromEntries(Object.entries(metrics.damage || {}).map(([name, entry]) => [name, Object.fromEntries(
        damageCounters.map((key) => [key, Number(entry?.[key]) || 0]),
      )])),
    };
  }

  function operationsSessionMetricsReset(sample) {
    if (!sample?.sessionKey) return null;
    const marker = operationsStoredObject(operationsStorageSnapshot?.entries, OPERATIONS_SESSION_METRICS_RESET_KEY);
    const resetAt = operationsTimestamp(marker?.resetAt);
    return marker?.version === 1
      && marker.sessionKey === sample.sessionKey
      && Number.isFinite(resetAt)
      && marker.baseline && typeof marker.baseline === "object"
      ? { ...marker, resetAt }
      : null;
  }

  function operationsGraphMetricsAfterReset(metrics, marker) {
    const baseline = marker.baseline || {};
    const resetAt = marker.resetAt;
    const delta = (current, before) => {
      const value = Math.max(0, Number(current) || 0);
      const prior = Math.max(0, Number(before) || 0);
      return value >= prior ? value - prior : value;
    };
    const history = { ...(metrics.history || {}) };
    ["gold", "xp"].forEach((name) => {
      const prior = Number(baseline[name]) || 0;
      history[name] = [[resetAt, 0], ...operationsGraphPoints(metrics.history?.[name])
        .filter((point) => point.time > resetAt)
        .map((point) => [point.time, delta(point.value, prior)])];
    });
    const mobKills = Object.fromEntries(Object.entries(metrics.mobKills || {})
      .map(([name, value]) => [name, delta(value, baseline.mobKills?.[name])])
      .filter(([, value]) => value > 0));
    const itemCounts = Object.fromEntries(Object.entries(metrics.itemCounts || {})
      .map(([name, value]) => [name, delta(value, baseline.itemCounts?.[name])])
      .filter(([, value]) => value > 0));
    const damageCounters = ["damage", "burn", "blast", "base", "cleave", "heal", "manaSteal", "damageReturn", "reflect"];
    const damage = Object.fromEntries(Object.entries(metrics.damage || {}).map(([name, entry]) => {
      const adjusted = { ...entry, since: resetAt };
      damageCounters.forEach((key) => {
        if (entry?.[key] !== undefined) adjusted[key] = delta(entry[key], baseline.damage?.[name]?.[key]);
      });
      return [name, adjusted];
    }));
    return {
      ...metrics,
      startedAt: resetAt,
      updatedAt: Math.max(operationsTimestamp(metrics.updatedAt) || 0, resetAt),
      lootGold: delta(metrics.lootGold, baseline.gold),
      xpGained: delta(metrics.xpGained, baseline.xp),
      kills: delta(metrics.kills, baseline.kills),
      mobKills,
      itemCounts,
      damage,
      history,
    };
  }

  function operationsGraphData(snapshots) {
    const sourceMetrics = operationsGraphPrimary(snapshots);
    if (!sourceMetrics) return null;
    const reset = operationsSessionMetricsReset(operationsHistorySample(snapshots));
    const metrics = reset ? operationsGraphMetricsAfterReset(sourceMetrics, reset) : sourceMetrics;
    const history = metrics.history || {};
    const historyTimes = [
      ...(Array.isArray(history.gold) ? history.gold : []),
      ...(Array.isArray(history.xp) ? history.xp : []),
    ].map((point) => operationsTimestamp(Array.isArray(point) ? point[0] : point?.time ?? point?.at ?? point?.timestamp)).filter(Number.isFinite);
    const updatedAt = operationsTimestamp(metrics.updatedAt) || 0;
    const latestUpdate = Math.max(updatedAt, ...historyTimes, 0);
    const clock = latestUpdate && Date.now() - latestUpdate > 90000 ? latestUpdate : Date.now();
    const firstHistory = historyTimes.length ? Math.min(...historyTimes) : clock;
    const startedAt = Number(metrics.startedAt) || firstHistory;
    const elapsedMs = Math.max(1000, clock - startedAt);
    const roleMap = Object.fromEntries(snapshots.map((snapshot) => [snapshot.name, String(snapshot.role || "").toLowerCase()]));
    const damageRows = Object.entries(metrics.damage || {}).map(([name, entry]) => {
      const since = operationsTimestamp(entry?.since) || startedAt;
      const elapsed = Math.max(1000, clock - since);
      const damage = (Number(entry?.damage) || 0) + (Number(entry?.damageReturn) || 0) + (Number(entry?.reflect) || 0);
      const directDps = Number(entry?.dps);
      const value = Number.isFinite(directDps) ? directDps : damage * 1000 / elapsed;
      const total = Number.isFinite(directDps) ? directDps * elapsed / 1000 : damage;
      return { name, value, total, color: ({ warrior: "#C69B6D", priest: "#FFFFFF", ranger: "#AAD372", mage: "#3FC7EB", rogue: "#FFF468" })[roleMap[name]] || "#E53935" };
    }).filter((row) => row.value > 0).sort((left, right) => right.value - left.value);
    const elapsedDays = Math.max(elapsedMs / 86400000, 1 / 24);
    const kills = Object.entries(metrics.mobKills || {}).map(([name, value]) => ({ name, value: (Number(value) || 0) / elapsedDays, count: Number(value) || 0, color: "#9D4EDD" })).filter((row) => row.value > 0).sort((left, right) => right.value - left.value);
    const items = Object.entries(metrics.itemCounts || {}).map(([name, value]) => ({ name, value: (Number(value) || 0) / elapsedDays, count: Number(value) || 0, color: "#00E5FF" })).filter((row) => row.value > 0).sort((left, right) => right.value - left.value);
    const recordedKills = Number(metrics.kills) || 0;
    const mobKillTotal = kills.reduce((sum, row) => sum + row.count, 0);
    const totalKills = recordedKills > 0 ? recordedKills : mobKillTotal;
    const totalItems = items.reduce((sum, row) => sum + row.count, 0);
    const totalDps = damageRows.reduce((sum, row) => sum + row.value, 0);
    const totalDamage = damageRows.reduce((sum, row) => sum + row.total, 0);
    return {
      gold: operationsGraphHistory(metrics, "gold", 3600, clock, startedAt, metrics.lootGold),
      xp: operationsGraphHistory(metrics, "xp", 1, clock, startedAt, metrics.xpGained),
      damage: damageRows,
      damageTotals: damageRows.map((row) => ({ name: row.name, value: row.total, color: row.color })),
      kills,
      items,
      roleMap,
      elapsedMs,
      totalGold: Number(metrics.lootGold) || 0,
      totalXp: Number(metrics.xpGained) || 0,
      totalKills,
      totalItems,
      totalDps,
      totalDamage,
    };
  }

  const operationsGraphColors = {
    gold: { primary: "#FFD700", axis: "rgba(255, 215, 0, .18)" },
    xp: { primary: "#87CEEB", axis: "rgba(135, 206, 235, .18)" },
    dps: { primary: "#FF6B6B", axis: "rgba(255, 107, 107, .18)" },
    kills: { primary: "#9D4EDD", axis: "rgba(157, 78, 221, .18)" },
    items: { primary: "#00E5FF", axis: "rgba(0, 229, 255, .18)" },
    damage: { primary: "#FF9500", axis: "rgba(255, 149, 0, .18)" },
  };
  const operationsGraphScrollOffsets = new Map();

  function operationsGraphNiceMax(raw) {
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    const steps = [1, 2, 2.5, 5, 10];
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    for (const step of steps) {
      const candidate = Math.ceil(raw / (magnitude * step)) * magnitude * step;
      if (candidate >= raw) return candidate;
    }
    return Math.ceil(raw / magnitude) * magnitude;
  }

  function operationsBindGraphScroll(canvas) {
    if (canvas.dataset.graphScrollBound === "true") return;
    canvas.dataset.graphScrollBound = "true";
    canvas.addEventListener("pointerdown", (event) => {
      const config = canvas._caracalGraphScroll;
      if (!config || config.total <= config.visibleCount) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = config.width / Math.max(1, rect.width);
      const scaleY = config.height / Math.max(1, rect.height);
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      if (x < config.trackX || x > config.trackX + config.trackWidth || y < config.trackY || y > config.trackY + config.scrollBarHeight) return;
      const nextOffset = Math.round((x - config.trackX) * config.total / Math.max(1, config.trackWidth) - config.visibleCount / 2);
      operationsGraphScrollOffsets.set(config.key, Math.max(0, Math.min(config.maxOffset, nextOffset)));
      canvas._caracalGraphDrag = { startX: x, startOffset: operationsGraphScrollOffsets.get(config.key) };
      canvas.setPointerCapture?.(event.pointerId);
      config.redraw();
    });
    canvas.addEventListener("pointermove", (event) => {
      const config = canvas._caracalGraphScroll;
      const drag = canvas._caracalGraphDrag;
      if (!config || !drag) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = config.width / Math.max(1, rect.width);
      const x = (event.clientX - rect.left) * scaleX;
      const nextOffset = drag.startOffset + Math.round((x - drag.startX) * config.total / Math.max(1, config.trackWidth));
      operationsGraphScrollOffsets.set(config.key, Math.max(0, Math.min(config.maxOffset, nextOffset)));
      config.redraw();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      canvas.addEventListener(eventName, () => { canvas._caracalGraphDrag = null; });
    });
  }

  function operationsChartCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(260, Math.floor(rect.width || 600));
    const height = Math.max(220, Math.floor(rect.height || 360));
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    operationsBindGraphScroll(canvas);
    return { canvas, context, width, height };
  }

  function operationsChartEmpty(target, message) {
    if (!target) return;
    target.canvas._caracalGraphScroll = null;
    target.canvas._caracalGraphDrag = null;
    target.context.fillStyle = "#7f929d";
    target.context.font = "18px system-ui, sans-serif";
    target.context.textAlign = "center";
    target.context.fillText(message, target.width / 2, target.height / 2);
  }

  function operationsChartFormat(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const absolute = Math.abs(number);
    if (absolute >= 1e9) return `${(number / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
    if (absolute >= 1e6) return `${(number / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (absolute >= 1e3) return `${(number / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
    return Math.round(number).toLocaleString();
  }

  function operationsChartLabel(value) {
    const text = String(value || "");
    return text.length > 13 ? `${text.slice(0, 12)}…` : text;
  }

  function operationsDrawLineChart(canvasId, series, color, emptyText, axisColor) {
    const target = operationsChartCanvas(canvasId);
    if (!target || !Array.isArray(series) || series.length < 2) return operationsChartEmpty(target, emptyText || "Collecting data…");
    const { context: ctx, width, height } = target;
    const rawMax = Math.max(1, ...series.map((point) => Number(point.value) || 0));
    const max = operationsGraphNiceMax(rawMax * 1.1);
    ctx.font = "12px system-ui, sans-serif";
    const left = Math.max(58, ctx.measureText(operationsChartFormat(max)).width + 18);
    const right = 18, top = 22, bottom = 42;
    const graphWidth = width - left - right, graphHeight = height - top - bottom;
    ctx.strokeStyle = axisColor || "rgba(143, 168, 180, .18)";
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    for (let index = 0; index <= 5; index += 1) {
      const value = max * index / 5;
      const y = top + graphHeight - graphHeight * index / 5;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
      ctx.fillText(operationsChartFormat(value), left - 8, y + 4);
    }
    ctx.strokeStyle = axisColor || "rgba(143, 168, 180, .18)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + graphHeight); ctx.lineTo(width - right, top + graphHeight); ctx.stroke();
    const xAt = (index) => left + graphWidth * index / (series.length - 1);
    const yAt = (value) => top + graphHeight - graphHeight * Math.max(0, Number(value) || 0) / max;
    const gradient = ctx.createLinearGradient(0, top, 0, top + graphHeight);
    gradient.addColorStop(0, `${color}55`); gradient.addColorStop(1, `${color}0D`);
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(left, top + graphHeight);
    series.forEach((point, index) => ctx.lineTo(xAt(index), yAt(point.value)));
    ctx.lineTo(left + graphWidth, top + graphHeight); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    series.forEach((point, index) => index ? ctx.lineTo(xAt(index), yAt(point.value)) : ctx.moveTo(xAt(index), yAt(point.value)));
    ctx.stroke();
    ctx.fillStyle = color;
    series.forEach((point, index) => {
      ctx.beginPath(); ctx.arc(xAt(index), yAt(point.value), 3, 0, Math.PI * 2); ctx.fill();
    });
    const last = series[series.length - 1];
    const firstTime = Number(series[0].time) || 0;
    const lastTime = Number(last.time) || firstTime;
    const lastMinutes = Math.max(0, Math.round((lastTime - firstTime) / 60000));
    ctx.fillStyle = "#e8f1f5"; ctx.textAlign = "right"; ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(operationsChartFormat(last.value), width - right, top + 11);
    ctx.fillStyle = "#8fa8b4"; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(new Date(series[0].time).toLocaleTimeString(), left, height - 23);
    ctx.textAlign = "right"; ctx.fillText(new Date(last.time).toLocaleTimeString(), width - right, height - 23);
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`Last ${lastMinutes} min${lastMinutes === 1 ? "" : "s"}`, width / 2, height - 8);
  }

  function operationsDrawBarChart(canvasId, rows, emptyText, axisColor) {
    const target = operationsChartCanvas(canvasId);
    if (!target || !Array.isArray(rows) || !rows.length) return operationsChartEmpty(target, emptyText || "No data available");
    const { canvas, context: ctx, width, height } = target;
    const left = 58, right = 18, top = 22, bottom = 82, scrollBarHeight = 12;
    const graphWidth = width - left - right, graphHeight = height - top - bottom;
    const groupWidth = 80;
    const visibleCount = Math.max(1, Math.floor(graphWidth / groupWidth));
    const maxOffset = Math.max(0, rows.length - visibleCount);
    const offset = Math.max(0, Math.min(maxOffset, operationsGraphScrollOffsets.get(canvasId) || 0));
    operationsGraphScrollOffsets.set(canvasId, offset);
    const visible = rows.slice(offset, offset + visibleCount);
    const rawMax = Math.max(1, ...visible.map((row) => Number(row.value) || 0));
    const max = operationsGraphNiceMax(rawMax * 1.1);
    const centerOffset = visible.length < visibleCount ? (graphWidth - visible.length * groupWidth) / 2 : 0;
    ctx.font = "12px system-ui, sans-serif"; ctx.strokeStyle = axisColor || "rgba(143, 168, 180, .18)"; ctx.fillStyle = axisColor || "#8fa8b4"; ctx.textAlign = "right";
    for (let index = 0; index <= 5; index += 1) {
      const value = max * index / 5; const y = top + graphHeight - graphHeight * index / 5;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke(); ctx.fillText(operationsChartFormat(value), left - 6, y + 3);
    }
    ctx.strokeStyle = axisColor || "rgba(143, 168, 180, .18)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + graphHeight); ctx.lineTo(width - right, top + graphHeight); ctx.stroke();
    const barWidth = Math.min(50, groupWidth * .62);
    visible.forEach((row, index) => {
      const value = Number(row.value) || 0;
      const barHeight = graphHeight * value / max;
      const groupX = left + centerOffset + groupWidth * index;
      const x = groupX + (groupWidth - barWidth) / 2;
      const y = top + graphHeight - barHeight;
      ctx.fillStyle = row.color || "#3ba7cd"; ctx.fillRect(x, y, barWidth, barHeight);
      ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.strokeRect(x, y, barWidth, barHeight);
      ctx.fillStyle = "#e8f1f5"; ctx.textAlign = "center"; ctx.font = "700 12px system-ui, sans-serif"; ctx.fillText(operationsChartFormat(value), x + barWidth / 2, Math.max(16, y - 7));
      ctx.fillStyle = row.color || "#8fa8b4"; ctx.font = "12px system-ui, sans-serif"; ctx.fillText(operationsChartLabel(row.name), x + barWidth / 2, height - 45);
    });
    if (rows.length > visibleCount) {
      const trackX = left;
      const trackY = top + graphHeight + 12;
      const thumbWidth = Math.max(30, visibleCount / rows.length * graphWidth);
      const thumbX = trackX + offset / rows.length * graphWidth;
      ctx.fillStyle = "rgba(255,255,255,.1)";
      ctx.beginPath(); ctx.roundRect(trackX, trackY, graphWidth, scrollBarHeight, 6); ctx.fill();
      ctx.fillStyle = axisColor || "rgba(143, 168, 180, .65)";
      ctx.beginPath(); ctx.roundRect(thumbX, trackY, thumbWidth, scrollBarHeight, 6); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
      ctx.fillText(`${offset + 1}–${offset + visible.length} of ${rows.length}`, width - right, top - 6);
    }
    canvas._caracalGraphScroll = {
      key: canvasId,
      total: rows.length,
      visibleCount,
      maxOffset,
      width,
      height,
      trackX: left,
      trackY: top + graphHeight + 12,
      trackWidth: graphWidth,
      scrollBarHeight,
      redraw: () => operationsDrawBarChart(canvasId, rows, emptyText, axisColor),
    };
  }

  function operationsChartCard(section, title, subtitle, canvasId, metrics) {
    const card = operationsMake("article", "caracal-ops-chart");
    card.dataset.section = section;
    card.append(operationsMake("div", "caracal-ops-chart-title", title), operationsMake("div", "caracal-ops-chart-subtitle", subtitle));
    const metricGrid = operationsMake("div", "caracal-ops-chart-metric-grid");
    metrics.forEach(([key, label]) => {
      const metric = operationsMake("div", "caracal-ops-chart-metric");
      metric.dataset.metric = key;
      metric.append(
        operationsMake("div", "caracal-ops-chart-metric-label", label),
        operationsMake("div", "caracal-ops-chart-metric-value", "—"),
      );
      metricGrid.appendChild(metric);
    });
    card.appendChild(metricGrid);
    card.appendChild(operationsMake("canvas"));
    card.lastElementChild.id = canvasId;
    return card;
  }

  function operationsGraphsPanel(snapshots) {
    const panel = operationsMake("div", "caracal-ops-panel caracal-ops-graphs-panel");
    const heading = operationsMake("div", "caracal-ops-graphs-heading");
    const resetButton = operationsMake("button", "caracal-ops-reset-button", "Reset session metrics");
    resetButton.type = "button";
    resetButton.disabled = operationsViewOnly;
    resetButton.title = operationsViewOnly
      ? "Sign in to reset the current Trio Metrics session"
      : "Start a new metrics baseline for this Trio session; historical sessions stay unchanged";
    resetButton.addEventListener("click", () => { void operationsResetSessionMetrics(panel, resetButton); });
    heading.append(operationsMake("div", "caracal-ops-section-title", "Trio metrics"), resetButton);
    panel.append(
      heading,
      operationsMake("div", "caracal-ops-muted", "The same shared metrics records used by MerchantTrioGraphs.30.js."),
    );
    const grid = operationsMake("div", "caracal-ops-chart-grid");
    grid.append(
      operationsChartCard("gold", "Gold Tracking", "Gold earned per hour across the current trio session", "caracal-ops-chart-gold", [["rate", "Gold / Hour"], ["total", "Total Gold"], ["session", "Session Time"]]),
      operationsChartCard("xp", "XP Tracking", "Experience gained per second across the current trio session", "caracal-ops-chart-xp", [["rate", "XP / Second"], ["total", "Total XP"], ["session", "Session Time"]]),
      operationsChartCard("dps", "DPS Tracking", "Current damage per second by character", "caracal-ops-chart-dps", [["party", "Party Total"], ["top", "Top Member"], ["session", "Session Time"]]),
      operationsChartCard("kills", "Kill Tracking", "Monster kill rate by type", "caracal-ops-chart-kills", [["rate", "Kills / Day"], ["total", "Total Kills"], ["unique", "Unique Mobs"]]),
      operationsChartCard("items", "Item Tracking", "Loot rate by item", "caracal-ops-chart-items", [["total", "Total Looted"], ["unique", "Unique Items"], ["top", "Top Item"]]),
      operationsChartCard("damage", "Damage Totals", "Total damage recorded by character", "caracal-ops-chart-damage", [["total", "Party Total"], ["top", "Top Member"], ["session", "Session Time"]]),
    );
    panel.appendChild(grid);
    panel._caracalSnapshots = snapshots;
    return panel;
  }

  async function operationsResetSessionMetrics(panel, button) {
    if (operationsViewOnly) {
      showDashboardNotice("Sign in to reset Trio session metrics.", true);
      return;
    }
    const dashboard = document.getElementById(OPERATIONS_DASHBOARD_ID);
    const snapshots = dashboard?._caracalSnapshots || panel._caracalSnapshots || [];
    const sample = operationsHistorySample(snapshots);
    const metrics = operationsGraphPrimary(snapshots);
    if (!sample || sample.sessionKey.endsWith("|unknown") || !metrics) {
      showDashboardNotice("Current Trio session metrics are not available to reset yet.", true);
      return;
    }
    if (!window.confirm("Reset the Trio Metrics tile to zero from now for this current session? Historical session records and character data will remain unchanged.")) return;
    const marker = {
      version: 1,
      sessionKey: sample.sessionKey,
      resetAt: Date.now(),
      baseline: operationsGraphResetBaseline(metrics),
    };
    button.disabled = true;
    button.textContent = "Saving reset…";
    try {
      const response = await fetch(OPERATIONS_STORAGE_SYNC_ENDPOINT, {
        method: "PUT",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ set: { [OPERATIONS_SESSION_METRICS_RESET_KEY]: JSON.stringify(marker) } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "The session metrics reset could not be saved");
      operationsStorageSnapshot = payload;
      operationsDrawGraphs(snapshots);
      showDashboardNotice("Trio Metrics now starts from zero for this session. Historical sessions are unchanged.");
    } catch (error) {
      showDashboardNotice(error?.message || "The session metrics reset could not be saved.", true);
    } finally {
      button.textContent = "Reset session metrics";
      button.disabled = operationsViewOnly;
    }
  }

  function operationsHistoryRangeStart(range) {
    const now = Date.now();
    if (range === "day") return now - 86400000;
    if (range === "week") return now - 7 * 86400000;
    if (range === "year") return now - 365 * 86400000;
    if (range === "month") {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    }
    return 0;
  }

  function operationsHistoricalTotals(range) {
    const since = operationsHistoryRangeStart(range);
    const samples = operationsStats
      .filter((sample) => Date.parse(sample.at) >= since)
      .slice()
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
    const previous = new Map();
    const totals = { gold: 0, banked: 0, kills: 0, drops: 0, damage: 0, dps: 0, dpsSamples: 0, sessions: new Set(), items: {}, months: {} };
    samples.forEach((sample) => {
      totals.sessions.add(sample.sessionKey);
      const month = String(sample.at).slice(0, 7);
      const monthItems = totals.months[month] || (totals.months[month] = {});
      (sample.characters || []).forEach((character) => {
        const key = `${sample.sessionKey}\u0000${character.name}`;
        const last = previous.get(key);
        const delta = (field) => {
          const current = Math.max(0, Number(character[field]) || 0);
          const before = Math.max(0, Number(last?.[field]) || 0);
          return current >= before ? current - before : current;
        };
        totals.gold += delta("goldEarned");
        totals.banked += delta("goldBanked");
        totals.kills += delta("kills");
        const itemCounts = character.itemCounts || {};
        Object.entries(itemCounts).forEach(([name, value]) => {
          const current = Math.max(0, Number(value) || 0);
          const before = Math.max(0, Number(last?.itemCounts?.[name]) || 0);
          const amount = current >= before ? current - before : current;
          totals.drops += amount;
          totals.items[name] = (totals.items[name] || 0) + amount;
          monthItems[name] = (monthItems[name] || 0) + amount;
        });
        Object.values(character.damage || {}).forEach((entry) => {
          const dps = Number(entry?.dps);
          if (Number.isFinite(dps) && dps > 0) {
            totals.dps += dps;
            totals.dpsSamples += 1;
          }
          totals.damage += Math.max(0, Number(entry?.damage) || 0);
        });
        previous.set(key, character);
      });
    });
    totals.avgDps = totals.dpsSamples ? totals.dps / totals.dpsSamples : 0;
    return totals;
  }

  function operationsHistoryValue(value) {
    return operationsFormatCompact(Math.round(Number(value) || 0));
  }

  function operationsHistoricalPanel() {
    const panel = operationsMake("div", "caracal-ops-panel caracal-ops-history-panel");
    panel.append(
      operationsMake("div", "caracal-ops-section-title", "Historical sessions"),
      operationsMake("div", "caracal-ops-muted", "Durable CaracAL+ samples across bot restarts. Gold earned excludes merchant bank transfers."),
    );
    const controls = operationsMake("div", "caracal-ops-history-range");
    ["day", "week", "month", "year", "all"].forEach((range) => {
      const button = operationsMake("button", `caracal-ops-history-range-button${operationsHistoryRange === range ? " is-active" : ""}`, range[0].toUpperCase() + range.slice(1));
      button.type = "button";
      button.dataset.historyRange = range;
      button.setAttribute("aria-pressed", String(operationsHistoryRange === range));
      button.addEventListener("click", () => {
        operationsHistoryRange = range;
        controls.querySelectorAll(".caracal-ops-history-range-button").forEach((rangeButton) => {
          const isActive = rangeButton.dataset.historyRange === operationsHistoryRange;
          rangeButton.classList.toggle("is-active", isActive);
          rangeButton.setAttribute("aria-pressed", String(isActive));
        });
        const dashboard = document.getElementById(OPERATIONS_DASHBOARD_ID);
        if (dashboard) operationsUpdateHistoryPanel(dashboard, dashboard._caracalSnapshots || []);
      });
      controls.appendChild(button);
    });
    panel.appendChild(controls);
    panel.appendChild(operationsMake("div", "caracal-ops-history-content"));
    panel._caracalSnapshots = [];
    return panel;
  }

  function operationsUpdateHistoryPanel(dashboard, snapshots) {
    const panel = dashboard?.querySelector(".caracal-ops-history-panel");
    if (!panel) return;
    panel._caracalSnapshots = snapshots;
    panel.querySelectorAll(".caracal-ops-history-range-button").forEach((button) => {
      const isActive = button.dataset.historyRange === operationsHistoryRange;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    const content = panel.querySelector(".caracal-ops-history-content");
    if (!content) return;
    const latestSample = operationsStats.length ? operationsStats[operationsStats.length - 1] : null;
    const historyKey = `${operationsHistoryRange}|${operationsStats.length}|${latestSample?.sessionKey || ""}|${latestSample?.at || ""}`;
    if (panel.dataset.historyKey === historyKey) return;
    panel.dataset.historyKey = historyKey;
    const totals = operationsHistoricalTotals(operationsHistoryRange);
    const cards = [
      ["Gold earned", operationsHistoryValue(totals.gold)],
      ["Gold banked", operationsHistoryValue(totals.banked)],
      ["Kills", operationsHistoryValue(totals.kills)],
      ["Drops", operationsHistoryValue(totals.drops)],
      ["Average DPS", operationsHistoryValue(totals.avgDps)],
      ["Sessions", operationsHistoryValue(totals.sessions.size)],
    ];
    const grid = operationsMake("div", "caracal-ops-history-summary");
    cards.forEach(([label, value]) => {
      const card = operationsMake("div", "caracal-ops-history-card");
      card.append(operationsMake("div", "caracal-ops-label", label), operationsMake("strong", "caracal-ops-history-value", value));
      grid.appendChild(card);
    });
    const months = Object.entries(totals.months).sort((left, right) => right[0].localeCompare(left[0]));
    const loot = operationsMake("div", "caracal-ops-history-loot");
    loot.appendChild(operationsMake("div", "caracal-ops-history-subtitle", "Monthly loot"));
    if (!months.length) loot.appendChild(operationsMake("div", "caracal-ops-muted", "No historical loot samples yet; the page will build this history while the monitor is running."));
    months.slice(0, 24).forEach(([month, items]) => {
      const row = operationsMake("div", "caracal-ops-history-month");
      row.appendChild(operationsMake("strong", "", month));
      const itemGrid = operationsMake("div", "caracal-ops-collection-grid caracal-ops-history-month-grid");
      Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 24).forEach(([name, count]) => {
        itemGrid.appendChild(operationsCollectionCard(name, operationsHistoryValue(count), "Monthly total"));
      });
      if (!itemGrid.childElementCount) itemGrid.appendChild(operationsMake("div", "caracal-ops-muted", "No item drops recorded"));
      row.appendChild(itemGrid);
      loot.appendChild(row);
    });
    content.replaceChildren(grid, loot);
  }

  function operationsUpdateGraphMetricCards(graphData) {
    const lastValue = (series) => Array.isArray(series) && series.length ? Number(series[series.length - 1].value) || 0 : 0;
    const totalKillRate = graphData ? graphData.kills.reduce((sum, row) => sum + (Number(row.value) || 0), 0) : 0;
    const topDps = graphData?.damage?.[0];
    const topItem = graphData?.items?.slice().sort((left, right) => right.count - left.count)[0];
    const topDamage = graphData?.damageTotals?.slice().sort((left, right) => right.value - left.value)[0];
    const session = graphData ? formatResourceDuration(Math.floor(Math.max(0, graphData.elapsedMs) / 1000)) : "—";
    const values = graphData ? {
      gold: { rate: operationsChartFormat(lastValue(graphData.gold)), total: operationsChartFormat(graphData.totalGold), session },
      xp: { rate: operationsChartFormat(lastValue(graphData.xp)), total: operationsChartFormat(graphData.totalXp), session },
      dps: { party: operationsChartFormat(graphData.totalDps), top: topDps ? `${operationsChartLabel(topDps.name)} · ${operationsChartFormat(topDps.value)}` : "—", session },
      kills: { rate: operationsChartFormat(totalKillRate), total: operationsChartFormat(graphData.totalKills), unique: operationsChartFormat(graphData.kills.length) },
      items: { total: operationsChartFormat(graphData.totalItems), unique: operationsChartFormat(graphData.items.length), top: topItem ? `${operationsChartLabel(topItem.name)} · ${operationsChartFormat(topItem.count)}` : "—" },
      damage: { total: operationsChartFormat(graphData.totalDamage), top: topDamage ? `${operationsChartLabel(topDamage.name)} · ${operationsChartFormat(topDamage.value)}` : "—", session },
    } : null;
    document.querySelectorAll(".caracal-ops-chart[data-section]").forEach((card) => {
      const sectionValues = values?.[card.dataset.section] || {};
      card.querySelectorAll(".caracal-ops-chart-metric").forEach((metric) => {
        const value = metric.querySelector(".caracal-ops-chart-metric-value");
        if (value) value.textContent = sectionValues[metric.dataset.metric] ?? "—";
      });
    });
  }

  function operationsDrawGraphs(snapshots) {
    const graphData = operationsGraphData(snapshots);
    const displayData = graphData || operationsLastGraphData;
    operationsUpdateGraphMetricCards(displayData);
    if (Date.now() - operationsLastGraphDrawAt < 5000) return;
    if (!graphData) {
      if (!operationsGraphMissingSince) operationsGraphMissingSince = Date.now();
      if (!operationsLastGraphData || Date.now() - operationsGraphMissingSince >= 15000) {
        ["gold", "xp", "dps", "kills", "items", "damage"].forEach((name) => operationsChartEmpty(operationsChartCanvas(`caracal-ops-chart-${name}`), "Waiting for shared metrics…"));
      }
      return;
    }
    operationsLastGraphData = graphData;
    operationsGraphMissingSince = 0;
    operationsLastGraphDrawAt = Date.now();
    operationsDrawLineChart("caracal-ops-chart-gold", graphData.gold, operationsGraphColors.gold.primary, "Collecting gold history…", operationsGraphColors.gold.axis);
    operationsDrawLineChart("caracal-ops-chart-xp", graphData.xp, operationsGraphColors.xp.primary, "Collecting XP history…", operationsGraphColors.xp.axis);
    operationsDrawBarChart("caracal-ops-chart-dps", graphData.damage, "No damage data available", operationsGraphColors.dps.axis);
    operationsDrawBarChart("caracal-ops-chart-kills", graphData.kills, "No kills recorded", operationsGraphColors.kills.axis);
    operationsDrawBarChart("caracal-ops-chart-items", graphData.items, "No item history available", operationsGraphColors.items.axis);
    operationsDrawBarChart("caracal-ops-chart-damage", graphData.damageTotals, "No damage data available", operationsGraphColors.damage.axis);
  }

  function operationsDashboardLayoutKey(snapshots) {
    return JSON.stringify({
      characters: snapshots.map((snapshot) => ({
        name: snapshot.name,
        paused: snapshot.paused === true,
        stopped: snapshot.stopped === true,
        role: snapshot.role,
        server: snapshot.server,
        skin: snapshot.spriteState?.skin || "",
        ctype: snapshot.spriteState?.ctype || "",
      })),
    });
  }

  function operationsTrackerScrollPosition(panel) {
    const grid = panel?.querySelector(".caracal-ops-tracker-grid");
    return grid ? { left: grid.scrollLeft || 0, top: grid.scrollTop || 0 } : null;
  }

  function operationsRestoreTrackerScroll(panel, position) {
    if (!panel || !position) return;
    const grid = panel.querySelector(".caracal-ops-tracker-grid");
    if (!grid) return;
    const restore = () => {
      grid.scrollLeft = Math.min(position.left, Math.max(0, grid.scrollWidth - grid.clientWidth));
      grid.scrollTop = Math.min(position.top, Math.max(0, grid.scrollHeight - grid.clientHeight));
    };
    restore();
    window.requestAnimationFrame(restore);
  }

  function operationsUpdateDashboard(dashboard, snapshots) {
    dashboard._caracalSnapshots = snapshots;
    operationsPersistStats(snapshots);
    operationsUpdateHistoryPanel(dashboard, snapshots);
    const trio = operationsTrioRecord(snapshots);
    const session = operationsSessionSummary(snapshots);
    const online = snapshots.filter((snapshot) => snapshot.online).length;
    const active = snapshots.filter((snapshot) => snapshot.active).length;
    const totalXpRate = Number.isFinite(Number(trio?.xpPerHour)) ? Number(trio.xpPerHour) : snapshots.reduce((sum, snapshot) => sum + (Number.isFinite(snapshot.xpRateNumber) ? snapshot.xpRateNumber : 0), 0);
    const accountGold = operationsAccountGold(snapshots);
    const summaryValues = dashboard.querySelectorAll(".caracal-ops-summary-card .caracal-ops-summary-value");
    if (summaryValues[0]) summaryValues[0].textContent = `${online} / ${snapshots.length}`;
    if (summaryValues[1]) summaryValues[1].textContent = operationsFormatCompact(session.xpEarned);
    if (summaryValues[2]) summaryValues[2].textContent = operationsFormatCompact(session.goldEarned);
    if (summaryValues[3]) summaryValues[3].textContent = `${active} · ${operationsFormatCompact(totalXpRate)} XP/h`;
    const bankGoldText = accountGold.bankGold === null ? "—" : operationsFormatCompact(accountGold.bankGold);
    const totalGoldText = accountGold.total === null ? "—" : operationsFormatCompact(accountGold.total);
    const carriedGoldText = accountGold.carried === null ? "—" : operationsFormatCompact(accountGold.carried);
    const accountGoldNode = dashboard.querySelector(".caracal-ops-account-gold");
    if (accountGoldNode) {
      accountGoldNode.title = `Bank: ${bankGoldText}; carried: ${carriedGoldText}; combined: ${totalGoldText} gold.`;
      const main = accountGoldNode.querySelector(".caracal-ops-account-gold-main");
      const total = accountGoldNode.querySelector(".caracal-ops-account-gold-total");
      if (main) main.textContent = `◉ ${bankGoldText}`;
      if (total) total.textContent = `(${totalGoldText} total)`;
    }
    const uptime = dashboard.querySelector(".caracal-ops-uptime-value");
    if (uptime) uptime.textContent = session.startedAt ? formatResourceDuration(Math.floor(Math.max(0, Date.now() - session.startedAt) / 1000)) : "—";
    operationsRefreshCharacterActivityTiles(dashboard.querySelector(".botUIContainer"), snapshots);
    const trackerPanel = dashboard.querySelector(".caracal-ops-tracker-panel");
    const trackerScroll = operationsTrackerScrollPosition(trackerPanel);
    const pageScroller = document.scrollingElement || document.documentElement;
    const pageScrollX = window.scrollX;
    const pageScrollY = pageScroller ? Math.max(pageScroller.scrollTop || 0, window.scrollY || 0) : (window.scrollY || 0);
    const wasAtPageBottom = pageScroller
      ? pageScroller.scrollHeight - pageScrollY - window.innerHeight <= 24
      : false;
    if (trackerPanel && trackerPanel.dataset.renderKey !== operationsTrackerRenderKey(snapshots)) {
      const nextPanel = operationsTrackerPanel(snapshots);
      trackerPanel.replaceWith(nextPanel);
      operationsRestoreTrackerScroll(nextPanel, trackerScroll);
    }
    const nextScroller = document.scrollingElement || document.documentElement;
    const maxPageScroll = nextScroller ? Math.max(0, nextScroller.scrollHeight - window.innerHeight) : 0;
    window.scrollTo(pageScrollX, wasAtPageBottom ? maxPageScroll : Math.min(pageScrollY, maxPageScroll));
    operationsDrawGraphs(snapshots);
  }

  function renderOperationsDashboard() {
    const container = document.querySelector(".botUIContainer");
    const existingPausedBoxes = new Map(
      Array.from(container?.querySelectorAll(":scope > .caracal-ops-paused-placeholder") || []).map((box) => [box.dataset.characterName, box]),
    );
    const allBoxes = container
      ? Array.from(container.querySelectorAll(":scope > .box:not(.caracal-ops-paused-placeholder)"))
      : [];
    const boxes = [];
    allBoxes.forEach((box) => {
      const name = operationsRead(box, "name", "");
      const control = controlStates.get(name);
      if (control && (control.paused || control.stopped)) {
        box.remove();
        return;
      }
      boxes.push(box);
    });
    let dashboard = document.getElementById(OPERATIONS_DASHBOARD_ID);
    const pageScroller = document.scrollingElement || document.documentElement;
    const pageScrollX = window.scrollX;
    const pageScrollY = pageScroller ? Math.max(pageScroller.scrollTop || 0, window.scrollY || 0) : (window.scrollY || 0);
    const wasAtPageBottom = pageScroller
      ? pageScroller.scrollHeight - pageScrollY - window.innerHeight <= 24
      : false;
    const activityScroll = new Map(
      Array.from(dashboard?.querySelectorAll(".caracal-character-activity") || []).map((tile) => [
        tile.dataset.characterName,
        tile.querySelector(".caracal-character-activity-history")?.scrollTop || 0,
      ]),
    );
    const trackerScroll = operationsTrackerScrollPosition(dashboard?.querySelector(".caracal-ops-tracker-panel"));
    if (!dashboard) {
      dashboard = operationsMake("section");
      dashboard.id = OPERATIONS_DASHBOARD_ID;
      if (container && container.parentNode && container.parentNode !== dashboard) {
        container.parentNode.insertBefore(dashboard, container);
      }
      else if (document.body) document.body.prepend(dashboard);
    }
    dashboard.hidden = false;
    const liveSnapshots = boxes.map(operationsSnapshot);
    liveSnapshots.forEach((snapshot) => {
      const control = controlStates.get(snapshot.name);
      snapshot.paused = Boolean(control && control.paused);
      snapshot.stopped = Boolean(control && control.stopped);
      operationsLastSnapshots.set(snapshot.name, snapshot);
      operationsLastBoxes.set(snapshot.name, snapshot.box.cloneNode(true));
    });
    const liveNames = new Set(liveSnapshots.map((snapshot) => snapshot.name));
    const pausedStates = Array.from(controlStates.values())
      .filter((state) => state && state.paused && !state.stopped && !liveNames.has(state.name))
      .sort((left, right) => left.name.localeCompare(right.name));
    const pausedNames = new Set(pausedStates.map((state) => state.name));
    existingPausedBoxes.forEach((box, name) => {
      if (!pausedNames.has(name)) box.remove();
    });
    const pausedBoxes = [];
    const pausedSnapshots = pausedStates.map((state) => {
      const pausedPreview = operationsPausedSnapshot(state.name, state, null);
      const placeholder = operationsPausedCharacterBox(
        pausedPreview,
        existingPausedBoxes.get(state.name) || operationsLastBoxes.get(state.name),
      );
      pausedBoxes.push(placeholder);
      return operationsPausedSnapshot(state.name, state, placeholder);
    });
    pausedBoxes.forEach((box) => {
      if (box.parentElement !== container) container?.appendChild(box);
    });
    const snapshots = [...liveSnapshots, ...pausedSnapshots];
    if (!snapshots.length) {
      dashboard.hidden = true;
      return;
    }
    snapshots.forEach((snapshot) => {
      operationsRecordActivity(snapshot);
    });
    const layoutKey = operationsDashboardLayoutKey(snapshots);
    if (dashboard.dataset.layoutKey === layoutKey) {
      operationsUpdateDashboard(dashboard, snapshots);
      return;
    }
    const online = snapshots.filter((snapshot) => snapshot.online).length;
    const active = snapshots.filter((snapshot) => snapshot.active).length;
    const trio = operationsTrioRecord(snapshots);
    const session = operationsSessionSummary(snapshots);
    const totalGoldRate = Number.isFinite(Number(trio?.goldPerHour)) ? Number(trio.goldPerHour) : snapshots.reduce((sum, snapshot) => sum + (Number.isFinite(snapshot.goldRateNumber) ? snapshot.goldRateNumber : 0), 0);
    const totalXpRate = Number.isFinite(Number(trio?.xpPerHour)) ? Number(trio.xpPerHour) : snapshots.reduce((sum, snapshot) => sum + (Number.isFinite(snapshot.xpRateNumber) ? snapshot.xpRateNumber : 0), 0);
    const maxRate = Math.max(1, ...snapshots.map((snapshot) => snapshot.xpRateNumber || 0), ...snapshots.map((snapshot) => snapshot.goldRateNumber || 0));
    const accountGold = operationsAccountGold(snapshots);

    const header = operationsMake("div", "caracal-ops-header");
    const heading = operationsMake("div", "caracal-ops-heading");
    heading.append(
      operationsMake("div", "caracal-ops-title", "CaracAL+"),
    );
    const headerActions = operationsHeaderActions(snapshots);
    const accountGoldNode = operationsMake("div", "caracal-ops-account-gold");
    const bankGoldText = accountGold.bankGold === null ? "—" : operationsFormatCompact(accountGold.bankGold);
    const totalGoldText = accountGold.total === null ? "—" : operationsFormatCompact(accountGold.total);
    const carriedGoldText = accountGold.carried === null ? "—" : operationsFormatCompact(accountGold.carried);
    accountGoldNode.title = `Bank: ${bankGoldText}; carried: ${carriedGoldText}; combined: ${totalGoldText} gold.`;
    accountGoldNode.append(
      operationsMake("div", "caracal-ops-account-gold-main", `◉ ${bankGoldText}`),
      operationsMake("div", "caracal-ops-account-gold-total", `(${totalGoldText} total)`),
    );
    const uptime = operationsMake("div", "caracal-ops-uptime");
    uptime.append(
      operationsMake("div", "caracal-ops-label", "Longest character uptime"),
      operationsMake("div", "caracal-ops-uptime-value", session.startedAt ? formatResourceDuration(Math.floor(Math.max(0, Date.now() - session.startedAt) / 1000)) : "—"),
    );
    header.append(heading, headerActions, accountGoldNode, uptime);

    const summary = operationsMake("div", "caracal-ops-summary-grid");
    summary.append(
      (() => { const card = operationsMake("div", "caracal-ops-summary-card"); card.append(operationsMake("div", "caracal-ops-label", "Online"), operationsMake("div", "caracal-ops-summary-value", `${online} / ${snapshots.length}`)); return card; })(),
       (() => { const card = operationsMake("div", "caracal-ops-summary-card"); card.append(operationsMake("div", "caracal-ops-label", "Session XP"), operationsMake("div", "caracal-ops-summary-value", operationsFormatCompact(session.xpEarned))); return card; })(),
       (() => { const card = operationsMake("div", "caracal-ops-summary-card"); card.append(operationsMake("div", "caracal-ops-label", "Session gold"), operationsMake("div", "caracal-ops-summary-value", operationsFormatCompact(session.goldEarned))); return card; })(),
      (() => { const card = operationsMake("div", "caracal-ops-summary-card"); card.append(operationsMake("div", "caracal-ops-label", "Active / rates"), operationsMake("div", "caracal-ops-summary-value", `${active} · ${operationsFormatCompact(totalXpRate)} XP/h`)); return card; })(),
    );

    const bottom = operationsMake("div", "caracal-ops-bottom-grid");
    const graphs = operationsGraphsPanel(snapshots);
    bottom.append(graphs, operationsLootPanel(snapshots), operationsBankPanel(snapshots), operationsHistoricalPanel(), operationsTrackerPanel(snapshots));
    if (container) {
      container.hidden = false;
      operationsLayoutCharacterTiles(container, [...boxes, ...pausedBoxes], snapshots);
    }
    const dashboardChildren = [header, summary];
    if (container) dashboardChildren.push(container);
    dashboardChildren.push(bottom);
    dashboard.replaceChildren(...dashboardChildren);
    dashboard.dataset.layoutKey = layoutKey;
    dashboard._caracalSnapshots = snapshots;
    operationsPersistStats(snapshots);
    operationsUpdateHistoryPanel(dashboard, snapshots);
    operationsDrawGraphs(snapshots);
    const restoreScroll = () => {
      const nextScroller = document.scrollingElement || document.documentElement;
      const maxPageScroll = nextScroller ? Math.max(0, nextScroller.scrollHeight - window.innerHeight) : 0;
      const nextPageScroll = wasAtPageBottom ? maxPageScroll : Math.min(pageScrollY, maxPageScroll);
      window.scrollTo(pageScrollX, nextPageScroll);
      dashboard.querySelectorAll(".caracal-character-activity").forEach((tile) => {
        const history = tile.querySelector(".caracal-character-activity-history");
        const savedScroll = activityScroll.get(tile.dataset.characterName);
        if (history && savedScroll !== undefined) history.scrollTop = Math.min(savedScroll, history.scrollHeight);
      });
      operationsRestoreTrackerScroll(dashboard, trackerScroll);
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(restoreScroll));
  }

  function updateCharacterControlButton(button) {
    const name = button.dataset.characterName || "character";
    const state = controlStates.get(name);
    const paused = state ? state.paused : false;
    const stopped = state ? state.stopped : false;
    const label = paused || stopped ? "▶" : "⏸";
    if (button.textContent !== label) button.textContent = label;
    button.title = stopped
      ? "Start " + name + " on the Pi"
      : paused
      ? "Resume " + name + " on the Pi"
      : "Pause " + name + " on the Pi before logging in elsewhere";
    button.setAttribute("aria-label", stopped ? "Start " + name : paused ? "Resume " + name : "Pause " + name);
  }

  function updateCharacterStopButton(button) {
    const name = button.dataset.characterName || "character";
    const state = controlStates.get(name);
    const stopped = state ? state.stopped : false;
    button.disabled = stopped;
    button.title = stopped ? name + " is already stopped" : "Stop " + name + " and remove its tile";
    button.setAttribute("aria-label", button.title);
  }

  function markCharacterControlsViewOnly() {
    const changed = !operationsViewOnly || !operationsAuthLoaded;
    operationsViewOnly = true;
    operationsAuthLoaded = true;
    if (changed) {
      document.getElementById(MENU_ID)?.remove();
      operationsMarkLayoutDirty();
      mountToolsButton();
      bindCharacterNames();
      renderOperationsDashboard();
    }
  }

  async function refreshCharacterControls() {
    if (operationsViewOnly) return;
    try {
      const response = await fetch("/pi-control/state", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401 || response.status === 403) {
        markCharacterControlsViewOnly();
        return;
      }
      if (!response.ok) return;
      const payload = await response.json();
      (payload.characters || []).forEach((state) => {
        if (state && state.name) controlStates.set(state.name, state);
      });
      document.querySelectorAll("[" + CHARACTER_CONTROL_ATTR + "]").forEach(updateCharacterControlButton);
      document.querySelectorAll("[" + CHARACTER_STOP_ATTR + "]").forEach(updateCharacterStopButton);
      renderCharacterControls();
    } catch (error) {
      console.debug("Pi character control state unavailable", error);
    }
  }

  function renderCharacterControls() {
    const container = document.getElementById(CHARACTER_CONTROLS_ID);
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    Array.from(controlStates.values())
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((state) => {
        const row = style(document.createElement("div"), {
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 28px 28px",
          alignItems: "center",
          gap: "5px",
          margin: "3px 0",
          minHeight: "28px",
          color: "#eee",
          font: "12px system-ui, sans-serif",
        });
        const label = style(document.createElement("span"), {
          minWidth: "0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: "18px",
        });
        label.textContent = state.name + (state.stopped ? " (stopped)" : state.paused ? " (paused)" : "");
        label.title = label.textContent;
        const button = makeCharacterControlButton(state.name);
        const stopButton = makeCharacterStopButton(state.name);
        button.style.margin = "0";
        stopButton.style.margin = "0";
        row.append(label, button, stopButton);
        container.appendChild(row);
      });
  }

  async function toggleCharacter(name, button) {
    if (operationsViewOnly) return;
    const current = controlStates.get(name);
    const action = current && (current.paused || current.stopped) ? "resume" : "pause";
    button.disabled = true;
    button.textContent = "…";
    try {
      const response = await fetch(
        "/pi-control/" + action + "/" + encodeURIComponent(name),
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        const error = new Error("Your CaracAL session has expired. Sign in again to use play/pause.");
        error.auth = true;
        throw error;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "The Pi did not accept the character control request");
      }
      if (payload.character) controlStates.set(name, payload.character);
      renderOperationsDashboard();
    } catch (error) {
      console.error("Pi character control failed", name, error);
      if (error && error.auth) markCharacterControlsViewOnly();
      showDashboardNotice(`${name} control failed: ${error && error.message ? error.message : "unknown error"}`, true);
    } finally {
      button.disabled = false;
      updateCharacterControlButton(button);
      await refreshCharacterControls();
    }
  }

  async function stopCharacter(name, button) {
    if (operationsViewOnly) return;
    button.disabled = true;
    try {
      const response = await fetch(
        "/pi-control/stop/" + encodeURIComponent(name),
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        const error = new Error("Your CaracAL session has expired. Sign in again to use character controls.");
        error.auth = true;
        throw error;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "The Pi did not accept the stop request");
      }
      if (payload.character) controlStates.set(name, payload.character);
      renderOperationsDashboard();
    } catch (error) {
      console.error("Pi character stop failed", name, error);
      if (error && error.auth) markCharacterControlsViewOnly();
      showDashboardNotice(`${name} stop failed: ${error && error.message ? error.message : "unknown error"}`, true);
    } finally {
      button.disabled = false;
      updateCharacterStopButton(button);
      await refreshCharacterControls();
    }
  }

  function makeCharacterControlButton(name) {
    const button = style(document.createElement("button"), {
      display: "inline-block",
      boxSizing: "border-box",
      width: "28px",
      minWidth: "28px",
      height: "24px",
      margin: "0 0 0 4px",
      padding: "0",
      cursor: "pointer",
      border: "1px solid #777",
      borderRadius: "3px",
      background: "#353535",
      color: "#fff",
      font: "14px system-ui, sans-serif",
      lineHeight: "18px",
      verticalAlign: "middle",
    });
    button.type = "button";
    button.setAttribute(CHARACTER_CONTROL_ATTR, "");
    button.dataset.characterName = name;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleCharacter(button.dataset.characterName, button);
    });
    updateCharacterControlButton(button);
    return button;
  }

  function makeCharacterStopButton(name) {
    const button = style(document.createElement("button"), {
      display: "inline-block",
      boxSizing: "border-box",
      width: "28px",
      minWidth: "28px",
      height: "24px",
      margin: "0 0 0 4px",
      padding: "0",
      cursor: "pointer",
      border: "1px solid #8b4d54",
      borderRadius: "3px",
      background: "#3a1d22",
      color: "#ffd8d8",
      font: "14px system-ui, sans-serif",
      lineHeight: "18px",
      verticalAlign: "middle",
    });
    button.type = "button";
    button.textContent = "■";
    button.setAttribute(CHARACTER_STOP_ATTR, "");
    button.dataset.characterName = name;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopCharacter(button.dataset.characterName, button);
    });
    updateCharacterStopButton(button);
    return button;
  }

  function makeCharacterHubButton(name) {
    const button = style(document.createElement("button"), {
      display: "inline-block",
      width: "auto",
      minWidth: "24px",
      margin: "0 0 0 8px",
      padding: "2px 5px",
      cursor: "pointer",
      border: "1px solid #777",
      borderRadius: "3px",
      background: "#353535",
      color: "#fff",
      font: "13px system-ui, sans-serif",
      lineHeight: "1",
      verticalAlign: "middle",
    });
    button.type = "button";
    button.textContent = "🔍";
    button.title = "Open the Pi-local Character Hub focused on " + name;
    button.setAttribute("aria-label", "Open Character Hub focused on " + name);
    button.setAttribute(CHARACTER_HUB_ATTR, "");
    button.dataset.characterName = name;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nameElement = button.parentElement && button.parentElement.querySelector(".textDisplayValue");
      openHub(button.dataset.characterName, nameElement);
    });
    return button;
  }

  function makeCharacterSettingsButton(name) {
    const button = style(document.createElement("button"), {
      display: "inline-block",
      width: "auto",
      minWidth: "24px",
      margin: "0 0 0 8px",
      padding: "2px 5px",
      cursor: "pointer",
      border: "1px solid #777",
      borderRadius: "3px",
      background: "#353535",
      color: "#fff",
      font: "13px system-ui, sans-serif",
      lineHeight: "1",
      verticalAlign: "middle",
    });
    button.type = "button";
    button.textContent = "⚙";
    button.title = "Edit CaracAL settings for " + name;
    button.setAttribute("aria-label", "Edit CaracAL settings for " + name);
    button.setAttribute(CHARACTER_SETTINGS_ATTR, "");
    button.dataset.characterName = name;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openSettingsPanel(button.dataset.characterName);
    });
    return button;
  }

  function closeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function characterWindowElements() {
    return Array.from(document.querySelectorAll("[" + CHARACTER_WINDOW_ATTR + "]"));
  }

  function findCharacterWindow(name, kind = "character") {
    return characterWindowElements().find((element) =>
      element.dataset.characterName === name && element.dataset.windowKind === kind,
    );
  }

  function findCharacterNameElement(name) {
    return Array.from(document.querySelectorAll(".botUIContainer > .box .name .textDisplayValue"))
      .find((element) => element.textContent.trim() === name) || null;
  }

  function characterWindowLayout() {
    return {
      version: 1,
      windows: characterWindowElements().filter((windowElement) =>
        windowElement.dataset.windowKind === "character",
      ).map((windowElement) => {
        const rect = windowElement.getBoundingClientRect();
        return {
          name: windowElement.dataset.characterName,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }),
    };
  }

  function persistCharacterWindowLayout() {
    if (restoringPersistedWindows) return;
    if (!persistedWindowLayoutReady) return;
    if (persistWindowLayoutTimer) window.clearTimeout(persistWindowLayoutTimer);
    persistWindowLayoutTimer = window.setTimeout(async () => {
      persistWindowLayoutTimer = null;
      try {
        const response = await fetch(CHARACTER_WINDOW_LAYOUT_ENDPOINT, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(characterWindowLayout()),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
      } catch (error) {
        console.debug("Pi character window layout could not be saved", error);
      }
    }, 100);
  }

  async function loadPersistedCharacterWindowLayout() {
    try {
      const response = await fetch(CHARACTER_WINDOW_LAYOUT_ENDPOINT, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      persistedWindowLayout = payload && Array.isArray(payload.windows)
        ? { version: 1, windows: payload.windows }
        : { version: 1, windows: [] };
      persistedWindowLayoutReady = true;
      restorePersistedCharacterWindows();
    } catch (error) {
      console.debug("Pi character window layout unavailable", error);
    }
  }

  function restorePersistedCharacterWindows() {
    if (persistedWindowRestoreAttempted || !persistedWindowLayout) return;
    const availableNames = new Set(
      Array.from(document.querySelectorAll(".botUIContainer > .box .name .textDisplayValue"))
        .map((element) => element.textContent.trim())
        .filter(Boolean),
    );
    if (!availableNames.size) return;
    persistedWindowRestoreAttempted = true;
    restoringPersistedWindows = true;
    try {
      persistedWindowLayout.windows
        .filter((windowState) => windowState && availableNames.has(windowState.name))
        .forEach((windowState) => {
          const nameElement = findCharacterNameElement(windowState.name);
          const windowElement = openCharacterWindow(windowState.name, nameElement);
          if (windowElement) {
            windowElement.style.left = Number(windowState.left) + "px";
            windowElement.style.top = Number(windowState.top) + "px";
            windowElement.style.width = Number(windowState.width) + "px";
            windowElement.style.height = Number(windowState.height) + "px";
            clampCharacterWindow(windowElement);
          }
        });
    } finally {
      restoringPersistedWindows = false;
    }
  }

  function ensureCharacterWindowsLayer() {
    let layer = document.getElementById(CHARACTER_WINDOWS_ID);
    if (layer) return layer;
    layer = style(document.createElement("div"), {
      position: "fixed",
      inset: "0",
      zIndex: "2147483000",
      pointerEvents: "none",
    });
    layer.id = CHARACTER_WINDOWS_ID;
    document.body.appendChild(layer);
    return layer;
  }

  function bringCharacterWindowToFront(windowElement) {
    nextWindowZIndex += 1;
    windowElement.style.zIndex = String(nextWindowZIndex);
  }

  function characterWindowStateKey(name, kind = "character") {
    return CHARACTER_WINDOW_STATE_PREFIX + kind + ":" + encodeURIComponent(name);
  }

  function readCharacterWindowState(name, kind = "character") {
    try {
      const stored = JSON.parse(window.localStorage.getItem(characterWindowStateKey(name, kind)) || "null");
      if (!stored || typeof stored !== "object") return null;
      const numeric = [stored.left, stored.top, stored.width, stored.height];
      if (!numeric.every((value) => Number.isFinite(Number(value)))) return null;
      return {
        left: Number(stored.left),
        top: Number(stored.top),
        width: Number(stored.width),
        height: Number(stored.height),
      };
    } catch (error) {
      return null;
    }
  }

  function saveCharacterWindowState(windowElement) {
    if (!windowElement || !windowElement.isConnected) return;
    const rect = windowElement.getBoundingClientRect();
    try {
      window.localStorage.setItem(
        characterWindowStateKey(
          windowElement.dataset.characterName,
          windowElement.dataset.windowKind || "character",
        ),
        JSON.stringify({
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }),
      );
    } catch (error) {
      console.debug("Character window position could not be saved", error);
    }
  }

  function clampCharacterWindow(windowElement) {
    if (!windowElement || !windowElement.isConnected) return;
    const margin = 8;
    const rect = windowElement.getBoundingClientRect();
    const maxWidth = Math.max(360, window.innerWidth - margin * 2);
    const maxHeight = Math.max(260, window.innerHeight - margin * 2);
    const width = Math.min(Math.max(rect.width, 360), maxWidth);
    const height = Math.min(Math.max(rect.height, 260), maxHeight);
    const left = Math.min(Math.max(rect.left, margin), Math.max(margin, window.innerWidth - width - margin));
    const top = Math.min(Math.max(rect.top, margin), Math.max(margin, window.innerHeight - height - margin));
    windowElement.style.width = Math.round(width) + "px";
    windowElement.style.height = Math.round(height) + "px";
    windowElement.style.left = Math.round(left) + "px";
    windowElement.style.top = Math.round(top) + "px";
  }

  function closeCharacterWindow(windowElement) {
    if (!windowElement) return;
    saveCharacterWindowState(windowElement);
    windowElement.remove();
    const layer = document.getElementById(CHARACTER_WINDOWS_ID);
    if (layer && !layer.children.length) layer.remove();
    persistCharacterWindowLayout();
  }

  function resetCharacterWindow(windowElement) {
    const index = characterWindowElements().indexOf(windowElement);
    windowElement.style.left = Math.min(24 + Math.max(index, 0) * 34, Math.max(8, window.innerWidth - 768)) + "px";
    windowElement.style.top = Math.min(58 + Math.max(index, 0) * 34, Math.max(8, window.innerHeight - 548)) + "px";
    windowElement.style.width = Math.min(760, Math.max(360, window.innerWidth - 32)) + "px";
    windowElement.style.height = Math.min(540, Math.max(260, window.innerHeight - 82)) + "px";
    clampCharacterWindow(windowElement);
    saveCharacterWindowState(windowElement);
    bringCharacterWindowToFront(windowElement);
    persistCharacterWindowLayout();
  }

  function finishCharacterWindowInteraction() {
    if (!activeWindowInteraction) return;
    saveCharacterWindowState(activeWindowInteraction.windowElement);
    persistCharacterWindowLayout();
    document.body.style.userSelect = "";
    activeWindowInteraction = null;
  }

  function updateCharacterWindowInteraction(event) {
    const interaction = activeWindowInteraction;
    if (!interaction || (interaction.pointerId !== undefined && interaction.pointerId !== event.pointerId)) return;
    const deltaX = event.clientX - interaction.startX;
    const deltaY = event.clientY - interaction.startY;
    if (interaction.kind === "drag") {
      interaction.windowElement.style.left = Math.round(interaction.left + deltaX) + "px";
      interaction.windowElement.style.top = Math.round(interaction.top + deltaY) + "px";
    } else {
      interaction.windowElement.style.width = Math.round(interaction.width + deltaX) + "px";
      interaction.windowElement.style.height = Math.round(interaction.height + deltaY) + "px";
    }
    clampCharacterWindow(interaction.windowElement);
  }

  function beginCharacterWindowInteraction(event, windowElement, kind) {
    if (event.button !== undefined && event.button !== 0) return;
    if (kind === "drag" && event.target.closest("button")) return;
    const rect = windowElement.getBoundingClientRect();
    activeWindowInteraction = {
      kind,
      pointerId: event.pointerId,
      windowElement,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
    bringCharacterWindowToFront(windowElement);
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  document.addEventListener("pointermove", updateCharacterWindowInteraction);
  document.addEventListener("pointerup", finishCharacterWindowInteraction);
  document.addEventListener("pointercancel", finishCharacterWindowInteraction);

  function openCharacterWindow(name, nameElement, options = {}) {
    const kind = options.kind || "character";
    const source = options.source || characterClientUrl(name, nameElement);
    const existing = findCharacterWindow(name, kind);
    if (existing) {
      const frame = existing.querySelector("iframe");
      if (frame && frame.src !== source) frame.src = source;
      bringCharacterWindowToFront(existing);
      return existing;
    }

    const layer = ensureCharacterWindowsLayer();
    const windowElement = style(document.createElement("section"), {
      position: "fixed",
      left: "24px",
      top: "58px",
      width: "760px",
      height: "540px",
      minWidth: "360px",
      minHeight: "260px",
      maxWidth: "calc(100vw - 16px)",
      maxHeight: "calc(100vh - 16px)",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      pointerEvents: "auto",
      background: "#111",
      border: "2px solid #777",
      borderRadius: "6px",
      boxShadow: "0 8px 30px rgba(0, 0, 0, .7)",
      overflow: "hidden",
      resize: "both",
    });
    windowElement.className = "pi-character-window";
    windowElement.setAttribute(CHARACTER_WINDOW_ATTR, "");
    windowElement.dataset.characterName = name;
    windowElement.dataset.windowKind = kind;

    const titlebar = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      flex: "0 0 34px",
      minHeight: "34px",
      padding: "4px 6px 4px 10px",
      boxSizing: "border-box",
      cursor: "move",
      background: "#202020",
      color: "#eee",
      font: "bold 13px system-ui, sans-serif",
      userSelect: "none",
    });
    titlebar.className = "pi-character-titlebar";
    titlebar.title = options.dragTitle || "Drag to move this window";

    const title = document.createElement("span");
    title.textContent = options.title || (name + " — Adventure Land client");
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.whiteSpace = "nowrap";

    const actions = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flex: "0 0 auto",
    });

    const actionButton = (label, titleText, onClick) => {
      const button = style(document.createElement("button"), {
        cursor: "pointer",
        border: "1px solid #777",
        borderRadius: "3px",
        padding: "2px 7px",
        background: "#333",
        color: "#fff",
        font: "12px system-ui, sans-serif",
      });
      button.type = "button";
      button.textContent = label;
      button.title = titleText;
      button.addEventListener("pointerdown", (event) => event.stopPropagation());
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      });
      return button;
    };

    actions.append(
      actionButton("Reset", "Reset position and size", () => resetCharacterWindow(windowElement)),
      actionButton("Close", options.closeTitle || "Close this window", () => closeCharacterWindow(windowElement)),
    );
    titlebar.append(title, actions);
    titlebar.addEventListener("pointerdown", (event) => beginCharacterWindowInteraction(event, windowElement, "drag"));

    const frame = style(document.createElement("iframe"), {
      flex: "1 1 auto",
      minHeight: "0",
      width: "100%",
      border: "0",
      background: "#111",
    });
    frame.title = options.frameTitle || ("Adventure Land client for " + name);
    frame.src = source;

    const resizeHandle = style(document.createElement("div"), {
      position: "absolute",
      right: "1px",
      bottom: "1px",
      width: "18px",
      height: "18px",
      cursor: "nwse-resize",
      background: "linear-gradient(135deg, transparent 0 45%, #aaa 46% 51%, transparent 52% 62%, #aaa 63% 68%, transparent 69% 79%, #aaa 80% 85%, transparent 86%)",
      zIndex: "2",
    });
    resizeHandle.title = options.resizeTitle || "Drag to resize this window";
    resizeHandle.addEventListener("pointerdown", (event) => beginCharacterWindowInteraction(event, windowElement, "resize"));

    windowElement.append(titlebar, frame, resizeHandle);
    layer.appendChild(windowElement);

    const serverState = kind === "character" && persistedWindowLayout && persistedWindowLayout.windows
      .find((windowState) => windowState && windowState.name === name);
    const savedState = serverState || readCharacterWindowState(name, kind);
    if (savedState) {
      windowElement.style.left = savedState.left + "px";
      windowElement.style.top = savedState.top + "px";
      windowElement.style.width = savedState.width + "px";
      windowElement.style.height = savedState.height + "px";
    } else {
      resetCharacterWindow(windowElement);
    }
    clampCharacterWindow(windowElement);
    bringCharacterWindowToFront(windowElement);
    persistCharacterWindowLayout();
    return windowElement;
  }

  function makeButton(label, onClick) {
    const button = style(document.createElement("button"), {
      display: "block",
      width: "100%",
      boxSizing: "border-box",
      margin: "4px 0",
      padding: "7px 9px",
      cursor: "pointer",
      border: "1px solid #666",
      borderRadius: "4px",
      background: "#353535",
      color: "#fff",
      textAlign: "left",
      font: "13px system-ui, sans-serif",
    });
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function makeOptionalMenuToggle(label, key) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = optionalMenuFeatureEnabled(key);
    input.setAttribute("aria-label", "Enable " + label);
    input.style.accentColor = "#62c462";
    input.addEventListener("change", () => setOptionalMenuFeature(key, input.checked));
    return settingsRow(label, input);
  }

  function formatResourceBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes)) return "Unavailable";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let amount = Math.max(0, bytes);
    let unit = 0;
    while (amount >= 1024 && unit < units.length - 1) {
      amount /= 1024;
      unit += 1;
    }
    return amount.toFixed(amount >= 100 || unit === 0 ? 0 : 1) + " " + units[unit];
  }

  function formatResourcePercent(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(1) + "%" : "Sampling...";
  }

  function formatResourceDuration(value) {
    const seconds = Math.max(0, Number(value) || 0);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return (days ? days + "d " : "") + String(hours).padStart(2, "0") + "h " + String(minutes).padStart(2, "0") + "m";
  }

  function resourceTone(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "#f0c766";
    return amount >= 90 ? "#ff8d8d" : amount >= 75 ? "#f0c766" : "#8fe388";
  }

  function closeResourcePanel() {
    if (resourceRefreshTimer) {
      window.clearInterval(resourceRefreshTimer);
      resourceRefreshTimer = null;
    }
    document.getElementById(RESOURCE_PANEL_ID)?.remove();
  }

  function renderResourcePanel(body, payload) {
    while (body.firstChild) body.removeChild(body.firstChild);
    if (!payload || !payload.ok) {
      body.textContent = "Resource information is unavailable.";
      return;
    }
    const host = payload.host || {};
    const cpu = payload.cpu || {};
    const memory = payload.memory || {};
    const disk = payload.disk || {};
    const process = payload.process || {};
    const addSection = (title, rows) => {
      const sectionTitle = style(document.createElement("div"), {
        margin: "10px 0 3px",
        color: "#f0c766",
        font: "bold 12px system-ui, sans-serif",
      });
      sectionTitle.textContent = title;
      body.appendChild(sectionTitle);
      rows.forEach((row) => body.appendChild(makeClientUpdateRow(row[0], row[1], row[2])));
    };
    addSection("Host", [
      ["Machine", (host.hostname || "Unknown") + " (" + (host.arch || "unknown") + ")"],
      ["CPU", (host.cpuCount || "?") + " cores" + (host.cpuModel ? " — " + host.cpuModel : "")],
      ["Uptime", formatResourceDuration(host.uptimeSeconds)],
    ]);
    addSection("CPU", [
      ["Utilization", formatResourcePercent(cpu.utilizationPercent), resourceTone(cpu.utilizationPercent)],
      ["Normalized load", formatResourcePercent(cpu.normalizedLoadPercent), resourceTone(cpu.normalizedLoadPercent)],
      ["Load average", Array.isArray(cpu.loadAverage) ? cpu.loadAverage.map((value) => Number(value).toFixed(2)).join(" / ") : "Unavailable"],
    ]);
    addSection("Memory", [
      ["Used", formatResourceBytes(memory.usedBytes) + " / " + formatResourceBytes(memory.totalBytes), resourceTone(memory.usedPercent)],
      ["Usage", formatResourcePercent(memory.usedPercent), resourceTone(memory.usedPercent)],
      ["Available", formatResourceBytes(memory.availableBytes)],
    ]);
    addSection("Root disk", disk ? [
      ["Used", formatResourceBytes(disk.usedBytes) + " / " + formatResourceBytes(disk.totalBytes), resourceTone(disk.usedPercent)],
      ["Usage", formatResourcePercent(disk.usedPercent), resourceTone(disk.usedPercent)],
      ["Available", formatResourceBytes(disk.availableBytes)],
    ] : [["Status", "Unavailable"]]);
    addSection("CaracAL process", [
      ["Node", process.nodeVersion || "Unknown"],
      ["PID", String(process.pid || "Unknown")],
      ["Resident memory", formatResourceBytes(process.rssBytes)],
      ["Heap", formatResourceBytes(process.heapUsedBytes) + " / " + formatResourceBytes(process.heapTotalBytes)],
    ]);
  }

  async function openResourcePanel() {
    closeResourcePanel();
    const panel = style(document.createElement("section"), {
      position: "fixed",
      left: "50%",
      top: "8vh",
      transform: "translateX(-50%)",
      width: "min(560px, calc(100vw - 24px))",
      maxHeight: "84vh",
      overflowY: "auto",
      zIndex: "2147483647",
      boxSizing: "border-box",
      padding: "12px",
      border: "2px solid #777",
      borderRadius: "6px",
      background: "#111",
      color: "#eee",
      boxShadow: "0 8px 32px rgba(0,0,0,.75)",
    });
    panel.id = RESOURCE_PANEL_ID;
    const header = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "8px",
    });
    const title = style(document.createElement("div"), {
      color: "#f0c766",
      font: "bold 15px system-ui, sans-serif",
    });
    title.textContent = "Machine resources";
    const close = settingsPanelButton("Close", closeResourcePanel, true);
    header.append(title, close);
    const status = style(document.createElement("div"), {
      minHeight: "16px",
      margin: "0 2px 4px",
      color: "#aaa",
      font: "11px system-ui, sans-serif",
    });
    const body = document.createElement("div");
    panel.append(header, status, body);
    document.body.appendChild(panel);
    const refresh = async () => {
      try {
        const response = await fetch(RESOURCE_ENDPOINT, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Resource information is unavailable");
        renderResourcePanel(body, payload);
        status.textContent = "Updated " + new Date(payload.checkedAtUtc || Date.now()).toLocaleTimeString() + " — refreshes every 5 seconds.";
        status.style.color = "#aaa";
      } catch (error) {
        status.textContent = error && error.message ? error.message : String(error);
        status.style.color = "#ffadad";
      }
    };
    await refresh();
    resourceRefreshTimer = window.setInterval(refresh, 5000);
  }

  function characterRealm(nameElement) {
    const card = nameElement && nameElement.closest(".box");
    const cardText = card ? (card.innerText || card.textContent) : "";
    const match = cardText.match(
      /Realm:\s*SR_(US|EU|ASIA)(PVP|HARDCORE|DUNGEON|TEST|[IVX]+)(?=\s|Alive|Level|Health|Mana|$)/i,
    );
    return {
      region: match ? match[1].toUpperCase() : "US",
      server: match ? match[2].toUpperCase() : "III",
    };
  }

  function characterClientUrl(name, nameElement) {
    const realm = characterRealm(nameElement);
    const pathname = "/character/" +
        encodeURIComponent(name) +
        "/in/" +
        encodeURIComponent(realm.region) +
        "/" +
        encodeURIComponent(realm.server) +
        "/";
    if (clientLaunchMode === "official") {
      return new URL(pathname, "https://adventure.land/").toString();
    }
    const url = new URL(piClientUrl("/_alhub" + pathname));
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  function piCharacterClientUrl(name, nameElement) {
    const realm = characterRealm(nameElement);
    const pathname = "/character/" +
      encodeURIComponent(name) +
      "/in/" +
      encodeURIComponent(realm.region) +
      "/" +
      encodeURIComponent(realm.server) +
      "/";
    return new URL(piClientUrl("/_alhub" + pathname)).toString();
  }

  function piClientUrl(pathname) {
    const url = new URL(window.location.href);
    const clientHost = url.hostname.replace(/-ctrl(?=\.)/i, "");
    if (clientHost !== url.hostname) {
      url.protocol = "https:";
      url.hostname = clientHost;
      url.port = "";
    } else {
      url.port = "8088";
    }
    url.pathname = pathname;
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  function openOverlay(title, source, frameTitle, compact = false, closeLabel = "Back to Monitor") {
    closeOverlay();
    const overlay = style(document.createElement("div"), {
      position: "fixed",
      left: compact ? "6vw" : "0",
      top: compact ? "5vh" : "0",
      width: compact ? "88vw" : "100vw",
      height: compact ? "90vh" : "100vh",
      zIndex: "2147483646",
      display: "flex",
      flexDirection: "column",
      background: "#111",
      border: "1px solid #777",
      borderRadius: "6px",
      boxShadow: "0 8px 30px rgba(0, 0, 0, .65)",
      overflow: "hidden",
    });
    overlay.id = OVERLAY_ID;

    const toolbar = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      minHeight: "42px",
      padding: "6px 10px",
      boxSizing: "border-box",
      background: "#202020",
      color: "#eee",
      font: "14px system-ui, sans-serif",
    });

    const close = style(document.createElement("button"), {
      cursor: "pointer",
      border: "1px solid #777",
      borderRadius: "4px",
      padding: "6px 10px",
      background: "#333",
      color: "#fff",
      font: "inherit",
    });
    close.type = "button";
    close.textContent = closeLabel;
    close.addEventListener("click", closeOverlay);

    const label = document.createElement("span");
    label.textContent = title;
    toolbar.append(close, label);

    const frame = style(document.createElement("iframe"), {
      flex: "1 1 auto",
      width: "100%",
      border: "0",
      background: "#111",
    });
    frame.title = frameTitle;
    frame.src = source;

    overlay.append(toolbar, frame);
    document.body.appendChild(overlay);
  }

  function openCharacterView(name, nameElement) {
    if (operationsViewOnly) return;
    openCharacterWindow(name, nameElement);
  }

  function characterHubUrl(name) {
    const url = new URL(piClientUrl("/_alhub/hub"));
    if (name) url.searchParams.set("pi_character", name);
    return url.toString();
  }

  function openHub(name, nameElement) {
    if (operationsViewOnly) return;
    if (name) {
      return openCharacterWindow(name, nameElement, {
        kind: "hub",
        source: characterHubUrl(name),
        title: name + " — Character Hub",
        frameTitle: "Adventure Land Character Hub for " + name,
        dragTitle: "Drag to move this Character Hub window",
        resizeTitle: "Drag to resize this Character Hub window",
        closeTitle: "Close this Character Hub window",
      });
    }
    openOverlay(
      "Character Hub (Pi-local)",
      characterHubUrl(),
      "Adventure Land Character Hub",
    );
  }

  function showDashboardNotice(message, isError = false) {
    document.getElementById("pi-dashboard-notice")?.remove();
    const notice = style(document.createElement("div"), {
      position: "fixed",
      left: "50%",
      bottom: "18px",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      maxWidth: "min(620px, calc(100vw - 32px))",
      padding: "10px 14px",
      border: "1px solid " + (isError ? "#b45d5d" : "#777"),
      borderRadius: "5px",
      background: "rgba(24, 24, 24, .97)",
      color: isError ? "#ffb0b0" : "#eee",
      font: "13px system-ui, sans-serif",
      lineHeight: "1.35",
      boxShadow: "0 4px 18px rgba(0, 0, 0, .55)",
    });
    notice.id = "pi-dashboard-notice";
    notice.textContent = message;
    document.body.appendChild(notice);
    window.setTimeout(() => notice.remove(), 8000);
  }

  function loadScriptDashboardHost() {
    if (window.PiScriptDashboards && typeof window.PiScriptDashboards.open === "function") {
      return Promise.resolve();
    }
    if (scriptDashboardLoadPromise) return scriptDashboardLoadPromise;
    scriptDashboardLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-pi-script-dashboard-host]");
      const script = existing || document.createElement("script");
      const finish = () => {
        if (window.PiScriptDashboards && typeof window.PiScriptDashboards.open === "function") resolve();
        else reject(new Error("The project dashboard host did not initialize"));
      };
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => reject(new Error("The project dashboard host could not be loaded")), { once: true });
      if (!existing) {
        script.src = "/pi-script-dashboards.js?v=caracal-v2-50";
        script.dataset.piScriptDashboardHost = "";
        document.head.appendChild(script);
      } else if (window.PiScriptDashboards) {
        finish();
      }
    }).catch((error) => {
      scriptDashboardLoadPromise = null;
      throw error;
    });
    return scriptDashboardLoadPromise;
  }

  function openIngameScriptDashboard(dashboard) {
    if (!optionalMenuFeatureEnabled("ingameScripts")) return;
    closeIngameScriptMenu();
    showDashboardNotice("Loading the client-free script dashboard...");
    loadScriptDashboardHost()
      .then(() => {
        if (optionalMenuFeatureEnabled("ingameScripts")) window.PiScriptDashboards.open(dashboard.id);
      })
      .catch((error) => showDashboardNotice(error.message || "The project dashboard host is unavailable.", true));
  }

  function closeIngameScriptMenu() {
    document.getElementById(SCRIPT_DASHBOARD_MENU_ID)?.remove();
  }

  function openIngameScriptMenu() {
    if (!optionalMenuFeatureEnabled("ingameScripts")) return;
    const current = document.getElementById(SCRIPT_DASHBOARD_MENU_ID);
    if (current) {
      current.remove();
      return;
    }
    const menu = document.getElementById(MENU_ID);
    if (!menu) return;

    const panel = style(document.createElement("div"), {
      margin: "4px 0 6px 10px",
      padding: "5px 5px 3px",
      borderLeft: "2px solid #777",
      background: "rgba(12, 12, 12, .65)",
    });
    panel.id = SCRIPT_DASHBOARD_MENU_ID;
    const note = style(document.createElement("div"), {
      padding: "2px 4px 5px",
      color: "#aaa",
      font: "11px system-ui, sans-serif",
      lineHeight: "1.3",
    });
    note.textContent = "These project panels read and write shared CaracAL localStorage directly. No game client is required.";
    panel.appendChild(note);
    INGAME_SCRIPT_DASHBOARDS.forEach((dashboard) => {
      const button = makeButton(dashboard.label, () => {
        closeIngameScriptMenu();
        openIngameScriptDashboard(dashboard);
      });
      button.style.fontSize = "12px";
      button.style.margin = "3px 0";
      panel.appendChild(button);
    });
    menu.appendChild(panel);
  }

  function openFullClient() {
    const source = clientLaunchMode === "official"
      ? "https://adventure.land/"
      : piClientUrl("/");
    openOverlay(
      "Full Game Client (" + clientLaunchModeLabel() + ")",
      source,
      "Adventure Land full client",
    );
  }

  function openProjectDashboard() {
    if (!optionalMenuFeatureEnabled("projectDashboard")) return;
    closeOverlay();
    const localDashboardUrl = new URL(PROJECT_DASHBOARD_PATH, window.location.origin).toString();
    openCharacterWindow("Project Dashboard", null, {
      kind: "project-dashboard",
      source: localDashboardUrl,
      title: "CaracAL+ Project Dashboard",
      frameTitle: "CaracAL+ project dashboard",
      dragTitle: "Drag to move the Project Dashboard window",
      resizeTitle: "Drag to resize the Project Dashboard window",
      closeTitle: "Close the Project Dashboard window",
    });
  }

  function openOllamaChat() {
    if (!optionalMenuFeatureEnabled("ollamaChat")) return;
    closeOverlay();
    const localChatUrl = new URL(OLLAMA_CHAT_PATH, window.location.origin).toString();
    openCharacterWindow("Ollama Chat", null, {
      kind: "ollama-chat",
      source: localChatUrl,
      title: "Local Ollama Chat",
      frameTitle: "Local Ollama Chat on Ubuntu",
      dragTitle: "Drag to move the Ollama Chat window",
      resizeTitle: "Drag to resize the Ollama Chat window",
      closeTitle: "Close the Ollama Chat window",
    });
  }

  function makeClientUpdateRow(label, value, color = "#eee") {
    const row = style(document.createElement("div"), {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "5px 0",
      borderBottom: "1px dotted #555",
      font: "12px system-ui, sans-serif",
    });
    const name = document.createElement("span");
    name.textContent = label;
    name.style.color = "#aaa";
    const result = document.createElement("strong");
    result.textContent = value;
    result.style.color = color;
    row.append(name, result);
    return row;
  }

  async function openClientUpdateCheck() {
    const existing = document.getElementById("pi-client-update-panel");
    if (existing) existing.remove();

    const panel = style(document.createElement("section"), {
      position: "fixed",
      left: "50%",
      top: "12vh",
      transform: "translateX(-50%)",
      width: "min(520px, calc(100vw - 24px))",
      maxHeight: "76vh",
      overflowY: "auto",
      zIndex: "2147483647",
      boxSizing: "border-box",
      padding: "12px",
      border: "2px solid #777",
      borderRadius: "6px",
      background: "#111",
      color: "#eee",
      boxShadow: "0 8px 32px rgba(0,0,0,.75)",
    });
    panel.id = "pi-client-update-panel";

    const header = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "8px",
    });
    const title = style(document.createElement("div"), {
      color: "#f0c766",
      font: "bold 15px system-ui, sans-serif",
    });
    title.textContent = "Adventure Land client cache";
    const close = settingsPanelButton("Close", () => panel.remove(), true);
    header.append(title, close);

    const status = style(document.createElement("div"), {
      minHeight: "18px",
      margin: "0 2px 8px",
      color: "#aaa",
      font: "12px system-ui, sans-serif",
    });
    const body = document.createElement("div");
    const actions = style(document.createElement("div"), {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "12px",
    });
    const checkAgain = settingsPanelButton("Check again", () => runCheck(), false);
    let updateButton = null;
    actions.append(checkAgain);
    panel.append(header, status, body, actions);
    document.body.appendChild(panel);

    async function runCheck() {
      checkAgain.disabled = true;
      if (updateButton) {
        updateButton.remove();
        updateButton = null;
      }
      status.textContent = "Checking the live game version and Pi caches...";
      status.style.color = "#aaa";
      while (body.firstChild) body.removeChild(body.firstChild);
      try {
        const response = await fetch(CLIENT_UPDATE_CHECK_ENDPOINT, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "The Pi could not check the client version");
        }
        const remoteVersion = payload.remote && payload.remote.latestVersion;
        const full = payload.fullClient || {};
        const runtime = payload.caracALRuntime || {};
        const updateNeeded = payload.needsUpdate === true;
        status.textContent = updateNeeded
          ? "An update is available for one or more Pi client caches."
          : "Both Pi client caches match the live game version.";
        status.style.color = updateNeeded ? "#f0c766" : "#73d273";
        body.append(
          makeClientUpdateRow("Live game version", String(remoteVersion), "#73d273"),
          makeClientUpdateRow(
            "Full browser client in 8088",
            full.activeVersion === null || full.activeVersion === undefined ? "Missing" : String(full.activeVersion),
            full.needsUpdate ? "#f0c766" : "#73d273",
          ),
          makeClientUpdateRow(
            "CaracAL runtime cache",
            runtime.latestCachedVersion === null || runtime.latestCachedVersion === undefined ? "Missing" : String(runtime.latestCachedVersion),
            runtime.needsUpdate ? "#f0c766" : "#73d273",
          ),
        );
        const note = style(document.createElement("div"), {
          marginTop: "10px",
          color: "#aaa",
          font: "11px system-ui, sans-serif",
          lineHeight: "1.35",
        });
        note.textContent = updateNeeded
          ? "Updating downloads a new versioned client cache, preserves older caches and localStorage, then restarts the browser client and CaracAL service."
          : "Both client caches are current. No service restart is needed.";
        body.appendChild(note);
        if (updateNeeded) {
          updateButton = settingsPanelButton("Update and restart services", applyUpdate, false);
          updateButton.style.background = "#4a3518";
          updateButton.style.borderColor = "#ccaa22";
          updateButton.style.color = "#ffd98a";
          actions.insertBefore(updateButton, checkAgain);
        }
      } catch (error) {
        status.textContent = error && error.message ? error.message : String(error);
        status.style.color = "#ff8585";
      } finally {
        checkAgain.disabled = false;
      }
    }

    async function applyUpdate() {
      if (updateButton) updateButton.disabled = true;
      checkAgain.disabled = true;
      status.textContent = "Downloading the latest Adventure Land client and runtime cache...";
      status.style.color = "#f0c766";
      try {
        const response = await fetch(CLIENT_UPDATE_APPLY_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || "The Pi could not update the client cache");
        status.textContent = payload.updated
          ? (payload.clientRestarted === false ? "Caches updated, but the browser client restart was not confirmed." : "Caches updated. Browser client and CaracAL are restarting now...")
          : "The caches were already current; no restart was needed.";
        status.style.color = payload.clientRestarted === false ? "#ff8585" : "#73d273";
        if (updateButton) updateButton.textContent = "Update requested";
        window.setTimeout(() => { if (panel.isConnected) runCheck(); }, 7000);
      } catch (error) {
        status.textContent = error && error.message ? error.message : String(error);
        status.style.color = "#ff8585";
        if (updateButton) updateButton.disabled = false;
        checkAgain.disabled = false;
      }
    }

    await runCheck();
  }

  function serverLatencyTone(server) {
    if (!server || server.status !== "online") return "#ffadad";
    const ping = Number(server.pingMs);
    if (!Number.isFinite(ping)) return "#f0c766";
    return ping >= 250 ? "#ffadad" : ping >= 100 ? "#f0c766" : "#73d273";
  }

  function serverLatencyHistorySamples(payload, key) {
    const servers = payload?.history?.servers;
    return Array.isArray(servers?.[key]) ? servers[key] : [];
  }

  function serverLatencyValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(1).replace(/\.0$/, "")} ms` : "—";
  }

  function renderServerLatencyHistory(body, payload, server, onBack) {
    while (body.firstChild) body.removeChild(body.firstChild);
    const samples = serverLatencyHistorySamples(payload, server.key);
    const valid = samples.filter((sample) => Number.isFinite(Number(sample.pingMs)) && sample.status === "online");
    const failed = samples.filter((sample) => sample.status !== "online").length;
    const latest = valid.length ? valid[valid.length - 1].pingMs : null;
    const values = valid.map((sample) => Number(sample.pingMs));
    const minimum = values.length ? Math.min(...values) : null;
    const maximum = values.length ? Math.max(...values) : null;
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const loss = samples.length ? failed * 100 / samples.length : null;

    const heading = style(document.createElement("div"), {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: "10px",
      flexWrap: "wrap",
      marginBottom: "10px",
    });
    const headingName = style(document.createElement("strong"), {
      color: "#f0c766",
      font: "bold 14px system-ui, sans-serif",
    });
    headingName.textContent = server.name || server.key || "Unknown server";
    const headingEndpoint = style(document.createElement("span"), {
      color: "#aaa",
      font: "12px ui-monospace, SFMono-Regular, Consolas, monospace",
    });
    headingEndpoint.textContent = server.endpoint || "Unavailable";
    const back = settingsPanelButton("All servers", onBack, true);
    heading.append(headingName, headingEndpoint, back);
    body.appendChild(heading);

    const stats = style(document.createElement("div"), {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
      gap: "6px",
      marginBottom: "10px",
    });
    [
      ["Current", latest === null ? "—" : serverLatencyValue(latest), latest === null ? "#f0c766" : serverLatencyTone({ status: "online", pingMs: latest })],
      ["Minimum", serverLatencyValue(minimum), "#73d273"],
      ["Average", serverLatencyValue(average), "#f0c766"],
      ["Maximum", serverLatencyValue(maximum), "#ffadad"],
      ["Loss", loss === null ? "—" : `${loss.toFixed(1)}%`, loss !== null && loss > 0 ? "#ffadad" : "#73d273"],
    ].forEach(([label, value, color]) => {
      const card = style(document.createElement("div"), {
        minWidth: "0",
        padding: "7px 8px",
        border: "1px solid #444",
        borderRadius: "4px",
        background: "#181818",
      });
      const labelNode = style(document.createElement("div"), { color: "#aaa", font: "10px system-ui, sans-serif" });
      labelNode.textContent = label;
      const valueNode = style(document.createElement("strong"), { display: "block", marginTop: "3px", color, font: "bold 13px ui-monospace, SFMono-Regular, Consolas, monospace" });
      valueNode.textContent = value;
      card.append(labelNode, valueNode);
      stats.appendChild(card);
    });
    body.appendChild(stats);

    const graph = style(document.createElement("div"), {
      border: "1px solid #444",
      borderRadius: "4px",
      background: "#0d1116",
      overflow: "hidden",
    });
    const graphHeader = style(document.createElement("div"), {
      display: "flex",
      justifyContent: "space-between",
      gap: "8px",
      padding: "7px 9px",
      color: "#aaa",
      font: "11px system-ui, sans-serif",
    });
    const graphTitle = document.createElement("span");
    graphTitle.textContent = "TCP latency history";
    const graphRange = document.createElement("span");
    graphRange.textContent = samples.length
      ? `${samples.length} samples · ${new Date(samples[0].at).toLocaleTimeString()} – ${new Date(samples[samples.length - 1].at).toLocaleTimeString()}`
      : "Collecting samples";
    graphHeader.append(graphTitle, graphRange);
    graph.appendChild(graphHeader);

    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", "0 0 900 310");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Ping history for ${server.name || server.key || "server"}`);
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = "310px";
    const svgNode = (tag, attributes = {}) => {
      const node = document.createElementNS(namespace, tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      return node;
    };
    const left = 54, right = 18, top = 18, bottom = 34;
    const plotWidth = 900 - left - right, plotHeight = 310 - top - bottom;
    const finiteValues = values.length ? values : [0];
    const rawMin = Math.min(...finiteValues), rawMax = Math.max(...finiteValues);
    const padding = Math.max(10, (rawMax - rawMin) * 0.18);
    const low = Math.max(0, rawMin - padding);
    const high = Math.max(low + 10, rawMax + padding);
    const xAt = (index) => left + plotWidth * (samples.length <= 1 ? 0.5 : index / (samples.length - 1));
    const yAt = (value) => top + plotHeight - (Number(value) - low) * plotHeight / (high - low);
    for (let index = 0; index <= 4; index += 1) {
      const value = low + (high - low) * (4 - index) / 4;
      const y = top + plotHeight * index / 4;
      svg.appendChild(svgNode("line", { x1: left, y1: y, x2: 900 - right, y2: y, stroke: "#26313a", "stroke-width": 1 }));
      const label = svgNode("text", { x: left - 8, y: y + 4, fill: "#82919b", "font-size": 11, "text-anchor": "end" });
      label.textContent = `${Math.round(value)} ms`;
      svg.appendChild(label);
    }
    if (valid.length) {
      const validPoints = samples.map((sample, index) => ({ sample, index })).filter(({ sample }) => sample.status === "online" && Number.isFinite(Number(sample.pingMs)));
      const line = validPoints.map(({ sample, index }, pointIndex) => `${pointIndex ? "L" : "M"}${xAt(index).toFixed(1)} ${yAt(sample.pingMs).toFixed(1)}`).join(" ");
      const area = `${line} L ${xAt(validPoints[validPoints.length - 1].index).toFixed(1)} ${(top + plotHeight).toFixed(1)} L ${xAt(validPoints[0].index).toFixed(1)} ${(top + plotHeight).toFixed(1)} Z`;
      svg.appendChild(svgNode("path", { d: area, fill: "#3ba7cd22", stroke: "none" }));
      svg.appendChild(svgNode("path", { d: line, fill: "none", stroke: "#61d4e4", "stroke-width": 2 }));
      validPoints.slice(-180).forEach(({ sample, index }) => {
        svg.appendChild(svgNode("circle", { cx: xAt(index), cy: yAt(sample.pingMs), r: 2.5, fill: serverLatencyTone({ status: "online", pingMs: sample.pingMs }) }));
      });
    }
    const firstLabel = svgNode("text", { x: left, y: 300, fill: "#82919b", "font-size": 11 });
    firstLabel.textContent = samples.length ? new Date(samples[0].at).toLocaleTimeString() : "No samples yet";
    const lastLabel = svgNode("text", { x: 900 - right, y: 300, fill: "#82919b", "font-size": 11, "text-anchor": "end" });
    lastLabel.textContent = samples.length ? new Date(samples[samples.length - 1].at).toLocaleTimeString() : "Keep this window open to collect data";
    svg.append(firstLabel, lastLabel);
    if (!valid.length) {
      const empty = svgNode("text", { x: 450, y: 160, fill: "#82919b", "font-size": 14, "text-anchor": "middle" });
      empty.textContent = "No successful samples yet";
      svg.appendChild(empty);
    }
    graph.appendChild(svg);
    body.appendChild(graph);
  }

  function renderServerLatency(body, payload, onSelect) {
    while (body.firstChild) body.removeChild(body.firstChild);
    const servers = Array.isArray(payload && payload.servers) ? payload.servers : [];
    if (!servers.length) {
      body.textContent = "No Adventure Land servers were returned for this account.";
      return;
    }
    const table = style(document.createElement("div"), {
      border: "1px solid #555",
      borderRadius: "4px",
      overflow: "hidden",
      font: "12px system-ui, sans-serif",
    });
    const header = style(document.createElement("div"), {
      display: "grid",
      gridTemplateColumns: "minmax(130px, 1fr) minmax(150px, 1.2fr) 76px 64px",
      gap: "8px",
      padding: "7px 8px",
      background: "#262626",
      color: "#f0c766",
      fontWeight: "bold",
    });
    ["Server", "Endpoint", "Ping", "Samples"].forEach((label) => {
      const cell = document.createElement("span");
      cell.textContent = label;
      header.appendChild(cell);
    });
    table.appendChild(header);
    servers.forEach((server) => {
      const row = style(document.createElement("div"), {
        display: "grid",
        gridTemplateColumns: "minmax(130px, 1fr) minmax(150px, 1.2fr) 76px 64px",
        gap: "8px",
        alignItems: "center",
        padding: "7px 8px",
        borderTop: "1px dotted #555",
      });
      const name = style(document.createElement("button"), {
        border: "0",
        padding: "0",
        background: "transparent",
        color: "#e8f1f5",
        cursor: "pointer",
        font: "inherit",
        textAlign: "left",
        textDecoration: "underline dotted #777",
      });
      name.type = "button";
      name.textContent = server.name || server.key || "Unknown server";
      name.title = server.key || "";
      name.addEventListener("click", () => onSelect?.(server));
      const endpoint = style(document.createElement("span"), {
        color: "#aaa",
        overflowWrap: "anywhere",
      });
      endpoint.textContent = server.endpoint || "Unavailable";
      const ping = style(document.createElement("strong"), {
        color: serverLatencyTone(server),
        textAlign: "right",
      });
      ping.textContent = server.status === "online"
        ? String(server.pingMs) + " ms"
        : String(server.status || "Unavailable");
      if (server.error) ping.title = server.error;
      const history = serverLatencyHistorySamples(payload, server.key);
      const samples = style(document.createElement("span"), { color: "#aaa", textAlign: "right" });
      samples.textContent = history.length ? String(history.length) : "—";
      row.append(name, endpoint, ping, samples);
      table.appendChild(row);
    });
    body.appendChild(table);
  }

  async function openServerLatencyPanel() {
    document.getElementById(SERVER_LATENCY_PANEL_ID)?.remove();
    let latestPayload = null;
    let selectedServerKey = null;
    let pollTimer = null;
    const panel = style(document.createElement("section"), {
      position: "fixed",
      left: "50%",
      top: "12vh",
      transform: "translateX(-50%)",
      width: "min(960px, calc(100vw - 24px))",
      maxHeight: "84vh",
      overflowY: "auto",
      zIndex: "2147483647",
      boxSizing: "border-box",
      padding: "12px",
      border: "2px solid #777",
      borderRadius: "6px",
      background: "#111",
      color: "#eee",
      boxShadow: "0 8px 32px rgba(0,0,0,.75)",
    });
    panel.id = SERVER_LATENCY_PANEL_ID;
    const header = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "8px",
    });
    const title = style(document.createElement("div"), {
      color: "#f0c766",
      font: "bold 15px system-ui, sans-serif",
    });
    title.textContent = "Adventure Land server ping";
    const close = settingsPanelButton("Close", () => panel.remove(), true);
    header.append(title, close);
    const status = style(document.createElement("div"), {
      minHeight: "18px",
      margin: "0 2px 8px",
      color: "#aaa",
      font: "12px system-ui, sans-serif",
    });
    const body = document.createElement("div");
    const actions = style(document.createElement("div"), {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "12px",
    });
    const refresh = settingsPanelButton("Refresh", runCheck, false);
    const closePanel = () => {
      if (pollTimer) window.clearInterval(pollTimer);
      panel.remove();
    };
    const closeButton = header.querySelector("button");
    if (closeButton) closeButton.onclick = closePanel;
    actions.appendChild(refresh);
    panel.append(header, status, body, actions);
    document.body.appendChild(panel);

    const showOverview = () => {
      selectedServerKey = null;
      title.textContent = "Adventure Land server ping";
      if (latestPayload) renderServerLatency(body, latestPayload, showHistory);
    };
    const showHistory = (server) => {
      selectedServerKey = server.key;
      title.textContent = `Ping history — ${server.name || server.key || "server"}`;
      renderServerLatencyHistory(body, latestPayload || {}, server, showOverview);
    };

    async function runCheck() {
      refresh.disabled = true;
      status.textContent = "Checking every Adventure Land server from this host...";
      status.style.color = "#aaa";
      try {
        const response = await fetch(SERVER_LATENCY_ENDPOINT, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Server ping information is unavailable");
        latestPayload = payload;
        if (selectedServerKey) {
          const selected = payload.servers.find((server) => server.key === selectedServerKey);
          if (selected) showHistory(selected);
          else showOverview();
        } else {
          renderServerLatency(body, payload, showHistory);
        }
        status.textContent = (payload.measurement || "Latency check") + " — updated " + new Date(payload.checkedAtUtc || Date.now()).toLocaleTimeString();
        status.style.color = "#aaa";
      } catch (error) {
        status.textContent = error && error.message ? error.message : String(error);
        status.style.color = "#ffadad";
      } finally {
        refresh.disabled = false;
      }
    }

    pollTimer = window.setInterval(() => {
      if (!panel.isConnected) {
        window.clearInterval(pollTimer);
        return;
      }
      runCheck();
    }, 30000);
    await runCheck();
  }

  function closeSettingsPanel() {
    document.getElementById(SETTINGS_PANEL_ID)?.remove();
  }

  function settingsPanelButton(label, onClick, secondary = false) {
    const button = style(document.createElement("button"), {
      cursor: "pointer",
      border: "1px solid #777",
      borderRadius: "4px",
      padding: "6px 10px",
      background: secondary ? "#262626" : "#353535",
      color: "#fff",
      font: "12px system-ui, sans-serif",
    });
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function settingsTextInput(value, type = "text") {
    return style(Object.assign(document.createElement("input"), {
      type,
      value: value === undefined || value === null ? "" : String(value),
    }), {
      width: "100%",
      boxSizing: "border-box",
      padding: "5px 6px",
      border: "1px solid #666",
      borderRadius: "3px",
      background: "#111",
      color: "#fff",
      font: "12px system-ui, sans-serif",
    });
  }

  function settingsSelect(values, selected) {
    const select = style(document.createElement("select"), {
      width: "100%",
      boxSizing: "border-box",
      padding: "5px 6px",
      border: "1px solid #666",
      borderRadius: "3px",
      background: "#111",
      color: "#fff",
      font: "12px system-ui, sans-serif",
    });
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === selected;
      select.appendChild(option);
    });
    return select;
  }

  function settingsCodeSelect(paths, selected) {
    const selectedValue = String(selected || "").trim();
    const available = Array.isArray(paths)
      ? paths.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const values = Array.from(new Set(["", ...available, ...(selectedValue ? [selectedValue] : [])]));
    const select = settingsSelect(values, selectedValue);
    const selectedIsMissing = selectedValue && !available.includes(selectedValue);
    Array.from(select.options).forEach((option) => {
      if (option.value === "") option.textContent = "— No JavaScript CODE —";
      else if (option.value === selectedValue && selectedIsMissing) {
        option.textContent = option.value + " (saved path not currently synced)";
      }
    });
    return select;
  }

  function settingsCheckbox(checked) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked === true;
    input.style.accentColor = "#62c462";
    input.style.transform = "scale(1.15)";
    return input;
  }

  function settingsRow(label, control, note = "") {
    const row = style(document.createElement("label"), {
      display: "grid",
      gridTemplateColumns: "minmax(150px, 0.8fr) minmax(180px, 1.2fr)",
      alignItems: "center",
      gap: "10px",
      margin: "6px 0",
      color: "#eee",
      font: "12px system-ui, sans-serif",
    });
    const labelText = document.createElement("span");
    labelText.textContent = label;
    const value = style(document.createElement("div"), {
      minWidth: "0",
    });
    value.appendChild(control);
    if (note) {
      const help = style(document.createElement("div"), {
        gridColumn: "2",
        marginTop: "-4px",
        color: "#999",
        fontSize: "11px",
        lineHeight: "1.3",
      });
      help.textContent = note;
      row.append(labelText, value, help);
    } else {
      row.append(labelText, value);
    }
    return row;
  }

  function settingsSection(title, note = "") {
    const section = style(document.createElement("section"), {
      margin: "12px 0 0",
      padding: "8px 10px 10px",
      border: "1px solid #555",
      borderRadius: "4px",
      background: "#1b1b1b",
    });
    const heading = style(document.createElement("div"), {
      color: "#f0c766",
      font: "bold 13px system-ui, sans-serif",
      marginBottom: "5px",
    });
    heading.textContent = title;
    section.appendChild(heading);
    if (note) {
      const description = style(document.createElement("div"), {
        color: "#aaa",
        font: "11px system-ui, sans-serif",
        lineHeight: "1.35",
        marginBottom: "6px",
      });
      description.textContent = note;
      section.appendChild(description);
    }
    return section;
  }

  function settingsStatus(panel, message, isError = false) {
    const status = panel.querySelector("[data-pi-settings-status]");
    if (!status) return;
    status.textContent = message || "";
    status.style.color = isError ? "#ff8b8b" : "#9cde9c";
  }

  async function fetchSettingsState() {
    const response = await fetch(SETTINGS_ENDPOINT, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "The Pi could not load CaracAL settings");
    }
    return payload;
  }

  function renderSettingsForm(panel, snapshot, selectedName) {
    const body = panel.querySelector("[data-pi-settings-body]");
    if (!body) return;
    while (body.firstChild) body.removeChild(body.firstChild);

    const globals = snapshot.globals || {};
    const webApp = globals.web_app || {};
    const characters = Array.isArray(snapshot.characters) ? snapshot.characters : [];
    const codePaths = Array.isArray(snapshot.codePaths) ? snapshot.codePaths : [];
    const selected = characters.find((entry) => entry.name === selectedName) || characters[0];
    const selectedCharacterName = selected ? selected.name : "";
    let characterInputs = null;
    let pendingSave = null;
    let saveFailed = false;
    let restartButton = null;
    let characterSelect = null;

    const form = document.createElement("form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const characterName = characterSelect ? characterSelect.value : selectedCharacterName;
      if (!characterInputs || !characterName) {
        settingsStatus(panel, "No configured character is available to edit.", true);
        return;
      }
      if (pendingSave) return;
      const characterPatch = {
        realm: characterInputs.realm.value,
        enabled: characterInputs.enabled.checked,
        version: characterInputs.version.value,
        script: characterInputs.script.value,
        typescript: characterInputs.typescript.value,
      };
      const globalPatch = {
        cull_versions: globalInputs.cull_versions.checked,
        enable_TYPECODE: globalInputs.enable_TYPECODE.checked,
        use_pi_shared_local_storage: globalInputs.use_pi_shared_local_storage.checked,
        log_level: globalInputs.log_level.value,
        web_app: {
          enable_bwi: globalInputs.enable_bwi.checked,
          enable_minimap: globalInputs.enable_minimap.checked,
          expose_CODE: globalInputs.expose_CODE.checked,
          expose_TYPECODE: globalInputs.expose_TYPECODE.checked,
          port: globalInputs.port.value,
        },
      };
      saveButton.disabled = true;
      if (restartButton) restartButton.disabled = true;
      settingsStatus(panel, "Saving settings...");
      saveFailed = false;
      const saveTask = (async () => {
        try {
        const characterResponse = await fetch(
          "/pi-settings/character/" + encodeURIComponent(characterName),
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(characterPatch),
            cache: "no-store",
          },
        );
        const characterPayload = await characterResponse.json().catch(() => ({}));
        if (!characterResponse.ok || !characterPayload.ok) {
          throw new Error(characterPayload.error || "The character settings were not accepted");
        }
        const globalResponse = await fetch("/pi-settings/global", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(globalPatch),
          cache: "no-store",
        });
        const globalPayload = await globalResponse.json().catch(() => ({}));
        if (!globalResponse.ok || !globalPayload.ok) {
          throw new Error(globalPayload.error || "The global settings were not accepted");
        }
        settingsSnapshot = globalPayload.settings || characterPayload.settings || snapshot;
        if (characterPayload.character) controlStates.set(characterName, characterPayload.character);
        refreshCharacterControls();
        const messages = ["Settings saved."];
        if (characterPayload.restarted) messages.push("The character client is restarting.");
        if (globalPayload.restartRequired) messages.push("Restart CaracAL to apply global changes.");
        renderSettingsForm(panel, settingsSnapshot, characterName);
        settingsStatus(panel, messages.join(" "));
        } catch (error) {
          saveFailed = true;
          settingsStatus(panel, error && error.message ? error.message : String(error), true);
        } finally {
          saveButton.disabled = false;
          if (restartButton) restartButton.disabled = false;
        }
      })();
      pendingSave = saveTask;
      try {
        await saveTask;
      } finally {
        if (pendingSave === saveTask) pendingSave = null;
      }
    });

    const characterSection = settingsSection(
      "Character settings",
      "These are the per-character fields CaracAL reads from config.js. Saving a running character's realm, script, TypeScript path, or version restarts its headless client.",
    );
    characterSelect = settingsSelect(
      characters.map((entry) => entry.name),
      selectedCharacterName,
    );
    characterSection.appendChild(settingsRow("Character", characterSelect));
    const syncRow = style(document.createElement("div"), {
      display: "flex",
      justifyContent: "flex-end",
      margin: "8px 0 4px",
    });
    const syncButton = settingsPanelButton("Sync characters from game", async () => {
      syncButton.disabled = true;
      settingsStatus(panel, "Refreshing the character list from Adventure Land...");
      try {
        const response = await fetch("/pi-settings/sync-characters", {
          method: "POST",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "The Pi could not refresh the character list");
        }
        settingsSnapshot = payload.settings || snapshot;
        renderSettingsForm(panel, settingsSnapshot, selectedCharacterName);
        const added = Array.isArray(payload.added) ? payload.added : [];
        settingsStatus(
          panel,
          added.length
            ? "Added " + added.join(", ") + " as disabled character settings."
            : "Character list is already up to date.",
        );
      } catch (error) {
        settingsStatus(panel, error && error.message ? error.message : String(error), true);
      } finally {
        syncButton.disabled = false;
      }
    }, true);
    syncButton.title = "Refresh the Pi character list from the game account";
    syncRow.appendChild(syncButton);
    characterSection.appendChild(syncRow);
    const characterFields = style(document.createElement("div"), { marginTop: "6px" });
    characterSection.appendChild(characterFields);

    function renderCharacterFields(name) {
      while (characterFields.firstChild) characterFields.removeChild(characterFields.firstChild);
      const entry = characters.find((candidate) => candidate.name === name);
      if (!entry) {
        characterInputs = null;
        return;
      }
      const values = entry.settings || {};
      const realm = settingsTextInput(values.realm);
      const enabled = settingsCheckbox(values.enabled);
      const version = settingsTextInput(values.version);
      const script = settingsCodeSelect(codePaths, values.script);
      const typescript = settingsTextInput(values.typescript);
      characterInputs = { realm, enabled, version, script, typescript };
      characterFields.append(
        settingsRow("Realm", realm, "Example: SR_USIII"),
        settingsRow("Enabled", enabled, "Controls whether CaracAL starts this character."),
        settingsRow("Client version", version, "0 means the latest cached game client."),
        settingsRow("JavaScript CODE path", script, "Select a synchronized .js file relative to the Pi's CODE directory."),
        settingsRow("TypeScript path", typescript, "Relative to TYPECODE.out; setting one code path clears the other."),
      );
    }
    characterSelect.addEventListener("change", () => renderCharacterFields(characterSelect.value));
    renderCharacterFields(selectedCharacterName);

    const globalInputs = {
      cull_versions: settingsCheckbox(globals.cull_versions),
      enable_TYPECODE: settingsCheckbox(globals.enable_TYPECODE),
      use_pi_shared_local_storage: settingsCheckbox(globals.use_pi_shared_local_storage !== false),
      log_level: settingsSelect(["debug", "info", "warn", "error"], globals.log_level || "info"),
      enable_bwi: settingsCheckbox(webApp.enable_bwi),
      enable_minimap: settingsCheckbox(webApp.enable_minimap),
      expose_CODE: settingsCheckbox(webApp.expose_CODE),
      expose_TYPECODE: settingsCheckbox(webApp.expose_TYPECODE),
      port: settingsTextInput(webApp.port, "number"),
    };
    globalInputs.port.min = "1";
    globalInputs.port.max = "65535";
    const globalSection = settingsSection(
      "Global CaracAL settings",
      "These fields apply to the whole Pi service. They are saved immediately but require a CaracAL restart before they change the running service. The session key and command-based log sinks stay hidden.",
    );
    globalSection.append(
      settingsRow("Cull old client versions", globalInputs.cull_versions),
      settingsRow("Enable TypeScript", globalInputs.enable_TYPECODE),
      settingsRow("Use shared Pi localStorage", globalInputs.use_pi_shared_local_storage, "CaracAL and the Pi custom client use caraGarage.jsonl; requires restart."),
      settingsRow("Log level", globalInputs.log_level),
      settingsRow("Web monitor", globalInputs.enable_bwi),
      settingsRow("Minimap", globalInputs.enable_minimap),
      settingsRow("Expose CODE", globalInputs.expose_CODE),
      settingsRow("Expose TypeScript output", globalInputs.expose_TYPECODE),
      settingsRow("Monitor port", globalInputs.port),
    );

    const optionalMenusSection = settingsSection(
      "Optional Menus",
      "Choose which optional panels appear in the CaracAL+ menu. These preferences are saved in this browser. Disabling a menu closes its active panel and stops its refresh work.",
    );
    optionalMenusSection.append(
      makeOptionalMenuToggle("Ingame Scripts", "ingameScripts"),
      makeOptionalMenuToggle("Project Dashboard", "projectDashboard"),
      makeOptionalMenuToggle("Ollama Chat", "ollamaChat"),
    );

    const codeSyncSection = settingsSection(
      "CODE downloads",
      "Download the latest CODE slots and libraries from Adventure Land into CaracAL's local CODE tree. This never uploads local files, and running characters are not restarted automatically.",
    );
    const codeSyncButton = settingsPanelButton("Download latest CODE", async () => {
      codeSyncButton.disabled = true;
      settingsStatus(panel, "Downloading latest CODE scripts from Adventure Land...");
      try {
        const response = await fetch("/pi-settings/sync-code", {
          method: "POST",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          const detail = payload.error || `${response.status} ${response.statusText || "CODE Sync request failed"}`;
          throw new Error(detail);
        }
        try {
          settingsSnapshot = await fetchSettingsState();
          renderSettingsForm(panel, settingsSnapshot, selectedCharacterName);
        } catch (_) {
          // The sync succeeded even if the settings refresh is temporarily unavailable.
        }
        const summary = payload.summary ? ` ${payload.summary}` : "";
        settingsStatus(panel, `CODE download complete.${summary} Restart CaracAL to load changed scripts.`);
      } catch (error) {
        settingsStatus(panel, error && error.message ? error.message : String(error), true);
      } finally {
        codeSyncButton.disabled = false;
      }
    }, false);
    codeSyncButton.title = "Download the online CODE slots and libraries into CaracAL without uploading local files or restarting characters";
    codeSyncSection.appendChild(codeSyncButton);

    const securityNote = style(document.createElement("div"), {
      margin: "10px 2px 0",
      color: "#999",
      font: "11px system-ui, sans-serif",
      lineHeight: "1.35",
    });
    securityNote.textContent = "Your account session is never sent to or displayed by this editor.";

    const actions = style(document.createElement("div"), {
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      marginTop: "12px",
    });
    restartButton = settingsPanelButton("Restart CaracAL", async () => {
      if (!window.confirm("Restart CaracAL now? All headless characters will briefly reconnect.")) return;
      if (pendingSave) {
        settingsStatus(panel, "Finishing the character save before restarting...");
        await pendingSave;
      }
      if (saveFailed) {
        settingsStatus(panel, "Restart canceled because the last save failed. Fix the error and save again.", true);
        return;
      }
      restartButton.disabled = true;
      settingsStatus(panel, "Restarting CaracAL; the monitor will reconnect shortly...");
      try {
        const response = await fetch("/pi-settings/restart", {
          method: "POST",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "The Pi did not accept the restart request");
        }
      } catch (error) {
        settingsStatus(panel, error && error.message ? error.message : String(error), true);
        restartButton.disabled = false;
        return;
      }
      window.setTimeout(() => window.location.reload(), 1800);
    }, true);
    restartButton.title = "Reload CaracAL so saved global settings take effect";
    restartButton.style.marginRight = "auto";
    const saveButton = settingsPanelButton("Save settings", () => form.requestSubmit());
    const closeButton = settingsPanelButton("Close", closeSettingsPanel, true);
    actions.append(restartButton, closeButton, saveButton);
    form.append(characterSection, globalSection, optionalMenusSection, codeSyncSection, securityNote, actions);
    body.appendChild(form);
  }

  async function openSettingsPanel(initialName = "") {
    if (operationsViewOnly) {
      showDashboardNotice("Sign in to edit CaracAL settings.", true);
      return;
    }
    closeSettingsPanel();
    const panel = style(document.createElement("section"), {
      position: "fixed",
      left: "50%",
      top: "5vh",
      transform: "translateX(-50%)",
      width: "min(760px, calc(100vw - 24px))",
      maxHeight: "90vh",
      overflowY: "auto",
      zIndex: "2147483647",
      boxSizing: "border-box",
      padding: "12px",
      border: "2px solid #777",
      borderRadius: "6px",
      background: "#111",
      color: "#eee",
      boxShadow: "0 8px 32px rgba(0,0,0,.75)",
    });
    panel.id = SETTINGS_PANEL_ID;

    const header = style(document.createElement("div"), {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      marginBottom: "8px",
    });
    const title = style(document.createElement("div"), {
      color: "#f0c766",
      font: "bold 15px system-ui, sans-serif",
    });
    title.textContent = "CaracAL settings";
    header.append(title, settingsPanelButton("Close", closeSettingsPanel, true));
    const status = style(document.createElement("div"), {
      minHeight: "16px",
      margin: "0 2px 4px",
      color: "#aaa",
      font: "11px system-ui, sans-serif",
    });
    status.setAttribute("data-pi-settings-status", "");
    const body = document.createElement("div");
    body.setAttribute("data-pi-settings-body", "");
    panel.append(header, status, body);
    document.body.appendChild(panel);
    settingsStatus(panel, "Loading settings...");
    try {
      settingsSnapshot = await fetchSettingsState();
      renderSettingsForm(panel, settingsSnapshot, initialName);
      settingsStatus(panel, "");
    } catch (error) {
      settingsStatus(panel, error && error.message ? error.message : String(error), true);
    }
  }

  function openToolsMenu() {
    if (operationsViewOnly) return;
    const current = document.getElementById(MENU_ID);
    if (current) {
      current.remove();
      return;
    }

    const menu = style(document.createElement("div"), {
      position: "fixed",
      top: "44px",
      left: "8px",
      zIndex: "2147483645",
      width: "235px",
      maxHeight: "calc(100vh - 54px)",
      overflowY: "auto",
      padding: "8px",
      boxSizing: "border-box",
      border: "1px solid #777",
      borderRadius: "5px",
      background: "rgba(28, 28, 28, .98)",
      color: "#eee",
      boxShadow: "0 2px 12px rgba(0,0,0,.45)",
    });
    menu.id = MENU_ID;

    const title = style(document.createElement("div"), {
      padding: "2px 4px 7px",
      color: "#f0c766",
      font: "bold 14px system-ui, sans-serif",
    });
    title.textContent = "CaracAL+";
    menu.appendChild(title);
    menu.appendChild(makeButton("Character Hub", () => openHub()));
    menu.appendChild(makeButton("Full Game Client", openFullClient));
    if (optionalMenuFeatureEnabled("ingameScripts")) menu.appendChild(makeButton("Ingame Scripts", openIngameScriptMenu));
    if (optionalMenuFeatureEnabled("projectDashboard")) menu.appendChild(makeButton("Project Dashboard", openProjectDashboard));
    if (optionalMenuFeatureEnabled("ollamaChat")) {
      const ollamaChatButton = makeButton("Ollama Chat", openOllamaChat);
      ollamaChatButton.title = "Open Ollama Chat in a movable CaracAL+ window.";
      menu.appendChild(ollamaChatButton);
    }
    const clientModeButton = makeButton("Launch clients: " + clientLaunchModeLabel(), () => setClientLaunchMode(clientModeButton));
    clientModeButton.title = clientLaunchModeTitle();
    clientModeButton.setAttribute("aria-pressed", String(clientLaunchMode === "official"));
    menu.appendChild(clientModeButton);
    menu.appendChild(makeButton("Check Client Update", openClientUpdateCheck));
    menu.appendChild(makeButton("Server Ping Times", openServerLatencyPanel));
    menu.appendChild(makeButton("Resources", openResourcePanel));
    menu.appendChild(makeButton("CaracAL Settings", () => openSettingsPanel()));
    menu.appendChild(makeButton("Refresh Monitor", () => window.location.reload()));

    const controlsTitle = style(document.createElement("div"), {
      margin: "10px 4px 4px",
      color: "#f0c766",
      font: "bold 12px system-ui, sans-serif",
    });
    controlsTitle.textContent = "Character Controls";
    menu.appendChild(controlsTitle);

    const controls = document.createElement("div");
    controls.id = CHARACTER_CONTROLS_ID;
    menu.appendChild(controls);
    renderCharacterControls();

    const note = style(document.createElement("div"), {
      margin: "8px 4px 2px",
      color: "#aaa",
      font: "11px system-ui, sans-serif",
      lineHeight: "1.35",
    });
    note.textContent = "Click a character name to open the Pi custom client (shared server storage). Use the magnifying glass to watch that character in Hub, or the gear to edit its CaracAL settings. The Pi remembers open clients and their layouts for the next browser load. Pause a character before logging into it elsewhere; use Stop to remove its tile, and Play to start it again.";
    menu.appendChild(note);
    document.body.appendChild(menu);
  }

  function mountToolsButton() {
    if (operationsViewOnly) {
      document.getElementById(BUTTON_ID)?.remove();
      document.getElementById(MENU_ID)?.remove();
      return;
    }
    if (!document.body || document.getElementById(BUTTON_ID)) return;
    const button = style(document.createElement("button"), {
      position: "fixed",
      top: "8px",
      left: "8px",
      zIndex: "2147483645",
      cursor: "pointer",
      border: "1px solid #777",
      borderRadius: "4px",
      padding: "7px 10px",
      background: "rgba(32, 32, 32, .92)",
      color: "#fff",
      font: "14px system-ui, sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,.35)",
    });
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "+";
    button.title = "Open CaracAL+ tools, Pi-local Character Hub, and full client";
    button.addEventListener("click", openToolsMenu);
    document.body.appendChild(button);
  }

  function bindCharacterNames() {
    document.querySelectorAll(".botUIContainer > .box .name .textDisplayValue").forEach((element) => {
      const name = element.textContent.trim();
      const nameContainer = element.parentElement;
      if (!nameContainer || !name) return;
      if (!boundNames.has(element)) {
        boundNames.add(element);
        const activate = () => {
          if (operationsViewOnly) return;
          openCharacterView(element.textContent.trim(), element);
        };
        element.addEventListener("click", activate);
        element.addEventListener("keydown", (event) => {
          if (operationsViewOnly) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        });
      }
      if (operationsViewOnly) {
        style(element, { cursor: "default", textDecoration: "none" });
        element.removeAttribute("title");
        element.removeAttribute("role");
        element.removeAttribute("tabindex");
      } else {
        style(element, {
          cursor: "pointer",
          textDecoration: "underline",
          textDecorationStyle: "dotted",
        });
        element.title = "Open this character in the selected Adventure Land client";
        element.setAttribute("role", "button");
        element.tabIndex = 0;
      }
      let hubButton = nameContainer.querySelector("[" + CHARACTER_HUB_ATTR + "]");
      const existingSettingsButton = nameContainer.querySelector("[" + CHARACTER_SETTINGS_ATTR + "]");
      const existingControlButton = nameContainer.querySelector("[" + CHARACTER_CONTROL_ATTR + "]");
      const existingStopButton = nameContainer.querySelector("[" + CHARACTER_STOP_ATTR + "]");
      if (operationsViewOnly) {
        hubButton?.remove();
        existingSettingsButton?.remove();
        existingControlButton?.remove();
        existingStopButton?.remove();
        return;
      }
      if (!hubButton) {
        hubButton = makeCharacterHubButton(name);
        nameContainer.appendChild(hubButton);
      }
      hubButton.dataset.characterName = name;
      hubButton.title = "Open the Pi-local Character Hub focused on " + name;
      hubButton.setAttribute("aria-label", "Open Character Hub focused on " + name);
      let settingsButton = existingSettingsButton;
      if (!settingsButton) {
        settingsButton = makeCharacterSettingsButton(name);
        nameContainer.appendChild(settingsButton);
      }
      settingsButton.dataset.characterName = name;
      settingsButton.title = "Edit CaracAL settings for " + name;
      settingsButton.setAttribute("aria-label", "Edit CaracAL settings for " + name);
      let controlButton = existingControlButton;
      if (!controlButton) {
        controlButton = makeCharacterControlButton(name);
        nameContainer.appendChild(controlButton);
      }
      controlButton.dataset.characterName = name;
      updateCharacterControlButton(controlButton);
      let stopButton = existingStopButton;
      if (!stopButton) {
        stopButton = makeCharacterStopButton(name);
        nameContainer.appendChild(stopButton);
      }
      stopButton.dataset.characterName = name;
      updateCharacterStopButton(stopButton);
    });
    restorePersistedCharacterWindows();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.getElementById(MENU_ID)?.remove();
      closeOverlay();
      closeResourcePanel();
    }
  });
  installPartyFrameTileStyles();
  mountToolsButton();
  bindCharacterNames();
  bindPartyFrameTiles();
  renderOperationsDashboard();
  operationsRefreshAuthState();
  window.setInterval(operationsRefreshAuthState, 30000);
  operationsLoadActivity();
  window.setInterval(operationsLoadActivity, 5000);
  operationsLoadStats();
  window.setInterval(operationsLoadStats, 60000);
  refreshOperationsStorage();
  loadPersistedCharacterWindowLayout();
  refreshCharacterControls();
  new MutationObserver(bindCharacterNames).observe(document.body, { childList: true, subtree: true });
  window.setInterval(mountToolsButton, 1000);
  window.setInterval(bindCharacterNames, 1000);
  window.setInterval(bindPartyFrameTiles, 1000);
  window.setInterval(renderOperationsDashboard, 2000);
  window.setInterval(refreshOperationsStorage, 3000);
  window.setInterval(refreshCharacterControls, 3000);
})();
