(() => {
  "use strict";

  if (window.__piLocalStorageBridgeInstalled) return;
  window.__piLocalStorageBridgeInstalled = true;

  const STATE_ENDPOINT = "/pi-storage/state";
  const SYNC_ENDPOINT = "/pi-storage/sync";
  const POLL_INTERVAL_MS = 1500;
  const FLUSH_DELAY_MS = 120;
  // Merchant configuration is durable shared state. A stale page or a game
  // logout routine must not turn localStorage.clear() into a server-side
  // deletion of the settings that another client is still using.
  const PROTECTED_SYNC_KEY = /^(?:Character01MCH\.MerchantConfigUI\.(?:settings|lootRules)|cstore_droid_merchant_v[23]_settings_v1|cstore_droid_merchant_v3_loot_rules_v1_.+)$/;
  const nativeStorage = {
    setItem: Storage.prototype.setItem,
    getItem: Storage.prototype.getItem,
    removeItem: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
    key: Storage.prototype.key,
  };
  let suppressSync = 0;
  let initialized = false;
  let piSharedStorageEnabled = true;
  let revision = window.__piStorageRevision || "";
  let knownPiKeys = new Set();
  let observedEntries = {};
  let flushTimer = null;
  let pendingSet = new Map();
  let pendingRemove = new Set();
  let syncInFlight = false;
  let inFlightPayload = null;

  function isLocalStorage(target) {
    try {
      return target === window.localStorage;
    } catch (_) {
      return false;
    }
  }

  function localKeys() {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = nativeStorage.key.call(window.localStorage, index);
      if (key !== null) keys.push(key);
    }
    return keys;
  }

  function localSnapshot() {
    const entries = {};
    for (const key of localKeys()) {
      const value = nativeStorage.getItem.call(window.localStorage, key);
      if (value !== null) entries[key] = value;
    }
    return entries;
  }

  function queueSet(key, value) {
    if (!piSharedStorageEnabled) return;
    pendingRemove.delete(key);
    pendingSet.set(key, value);
    scheduleFlush();
  }

  function queueRemove(key) {
    if (!piSharedStorageEnabled) return;
    if (PROTECTED_SYNC_KEY.test(String(key))) return;
    pendingSet.delete(key);
    pendingRemove.add(key);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer !== null) return;
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      void flushPending();
    }, FLUSH_DELAY_MS);
  }

  function applyRemoteEntries(entries) {
    const nextKeys = new Set(Object.keys(entries || {}));
    suppressSync += 1;
    try {
      for (const [key, value] of Object.entries(entries || {})) {
        const stringValue = String(value);
        if (nativeStorage.getItem.call(window.localStorage, key) !== stringValue) {
          nativeStorage.setItem.call(window.localStorage, key, stringValue);
        }
      }
      for (const key of knownPiKeys) {
        if (!nextKeys.has(key)) nativeStorage.removeItem.call(window.localStorage, key);
      }
    } finally {
      suppressSync -= 1;
    }
    knownPiKeys = nextKeys;
  }

  function adoptPayload(payload, force = false) {
    if (!payload) return;
    if (Object.prototype.hasOwnProperty.call(payload, "sharedWithPiClient")) {
      piSharedStorageEnabled = payload.sharedWithPiClient !== false;
      window.__piStorageMode = payload.storageMode || null;
      if (!piSharedStorageEnabled) {
        pendingSet = new Map();
        pendingRemove = new Set();
        if (flushTimer !== null) {
          window.clearTimeout(flushTimer);
          flushTimer = null;
        }
        console.warn("Pi shared localStorage is disabled by CaracAL configuration");
        return;
      }
    }
    if (payload.changed === false) return;
    // Do not let an older poll response overwrite a local change that is
    // waiting to be committed. The PUT response is the authoritative result
    // for that write and is applied with force=true below.
    if (!force && (syncInFlight || pendingSet.size || pendingRemove.size)) return;
    if (payload.entries && typeof payload.entries === "object") {
      applyRemoteEntries(payload.entries);
    }
    if (payload.revision) revision = String(payload.revision);
    observedEntries = localSnapshot();
  }

  async function flushPending(keepalive = false) {
    if (!piSharedStorageEnabled || syncInFlight || !initialized || (!pendingSet.size && !pendingRemove.size)) return;
    const set = Object.fromEntries(pendingSet.entries());
    const remove = Array.from(pendingRemove);
    pendingSet = new Map();
    pendingRemove = new Set();
    inFlightPayload = { set, remove };
    syncInFlight = true;
    try {
      const response = await fetch(SYNC_ENDPOINT, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ set, remove }),
        cache: "no-store",
        keepalive,
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      adoptPayload(await response.json(), true);
    } catch (error) {
      for (const [key, value] of Object.entries(set)) queueSet(key, value);
      for (const key of remove) queueRemove(key);
      console.debug("Pi localStorage sync unavailable", error);
    } finally {
      syncInFlight = false;
      inFlightPayload = null;
      if (pendingSet.size || pendingRemove.size) scheduleFlush();
    }
  }

  function sendPendingBeacon() {
    if (!piSharedStorageEnabled || !initialized || !navigator.sendBeacon) return false;
    const set = { ...(inFlightPayload && inFlightPayload.set), ...Object.fromEntries(pendingSet.entries()) };
    const remove = new Set([
      ...((inFlightPayload && inFlightPayload.remove) || []),
      ...pendingRemove,
    ]);
    for (const key of Object.keys(set)) remove.delete(key);
    if (!Object.keys(set).length && !remove.size) return true;
    const body = JSON.stringify({
      set,
      remove: Array.from(remove),
    });
    const accepted = navigator.sendBeacon(
      SYNC_ENDPOINT,
      new Blob([body], { type: "application/json" }),
    );
    if (accepted) {
      pendingSet = new Map();
      pendingRemove = new Set();
    }
    return accepted;
  }

  function clearBrowserMirror() {
    const keys = new Set([
      ...knownPiKeys,
      ...Object.keys((inFlightPayload && inFlightPayload.set) || {}),
      ...((inFlightPayload && inFlightPayload.remove) || []),
      ...pendingSet.keys(),
      ...pendingRemove,
    ]);
    suppressSync += 1;
    try {
      for (const key of keys) nativeStorage.removeItem.call(window.localStorage, key);
    } finally {
      suppressSync -= 1;
    }
    knownPiKeys = new Set();
    revision = "";
    observedEntries = localSnapshot();
  }

  function reconcileDirectChanges() {
    if (!initialized || suppressSync || syncInFlight) return;
    const current = localSnapshot();
    for (const [key, value] of Object.entries(current)) {
      if (!Object.prototype.hasOwnProperty.call(observedEntries, key) || observedEntries[key] !== value) {
        queueSet(key, value);
      }
    }
    for (const key of Object.keys(observedEntries)) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) queueRemove(key);
    }
    observedEntries = current;
  }

  function seedFromServer() {
    const seed = window.__piStorageSeed;
    if (!seed || typeof seed !== "object") return {};
    const local = localSnapshot();
    const missing = {};
    const entries = seed.entries && typeof seed.entries === "object" ? seed.entries : {};
    for (const [key, value] of Object.entries(local)) {
      if (!Object.prototype.hasOwnProperty.call(entries, key)) missing[key] = value;
    }
    applyRemoteEntries(entries);
    initialized = true;
    observedEntries = localSnapshot();
    for (const [key, value] of Object.entries(missing)) queueSet(key, value);
    return missing;
  }

  async function initializeFromServer() {
    if (!initialized) {
      try {
        const response = await fetch(STATE_ENDPOINT, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const payload = await response.json();
        const local = localSnapshot();
        const entries = payload.entries && typeof payload.entries === "object" ? payload.entries : {};
        const missing = {};
        for (const [key, value] of Object.entries(local)) {
          if (!Object.prototype.hasOwnProperty.call(entries, key)) missing[key] = value;
        }
        adoptPayload(payload);
        initialized = true;
        observedEntries = localSnapshot();
        for (const [key, value] of Object.entries(missing)) queueSet(key, value);
      } catch (error) {
        console.debug("Pi localStorage bridge unavailable", error);
      }
    }
    void flushPending();
  }

  async function pollServer() {
    try {
      const suffix = revision ? "?revision=" + encodeURIComponent(revision) : "";
      const response = await fetch(STATE_ENDPOINT + suffix, { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      adoptPayload(await response.json());
      initialized = true;
    } catch (error) {
      console.debug("Pi localStorage poll unavailable", error);
    } finally {
      window.setTimeout(pollServer, POLL_INTERVAL_MS);
    }
  }

  Storage.prototype.setItem = function (key, value) {
    const stringKey = String(key);
    const stringValue = String(value);
    nativeStorage.setItem.call(this, stringKey, stringValue);
    if (isLocalStorage(this)) observedEntries[stringKey] = stringValue;
    if (isLocalStorage(this) && !suppressSync) queueSet(stringKey, stringValue);
  };

  Storage.prototype.removeItem = function (key) {
    const stringKey = String(key);
    if (isLocalStorage(this) && PROTECTED_SYNC_KEY.test(stringKey) &&
        Object.prototype.hasOwnProperty.call(observedEntries, stringKey)) {
      nativeStorage.setItem.call(this, stringKey, observedEntries[stringKey]);
      return;
    }
    nativeStorage.removeItem.call(this, stringKey);
    if (isLocalStorage(this)) delete observedEntries[stringKey];
    if (isLocalStorage(this) && !suppressSync) queueRemove(stringKey);
  };

  Storage.prototype.clear = function () {
    const keys = isLocalStorage(this) ? localKeys() : [];
    const preserved = isLocalStorage(this)
      ? Object.fromEntries(keys
        .filter((key) => PROTECTED_SYNC_KEY.test(key))
        .map((key) => [key, nativeStorage.getItem.call(this, key)]))
      : {};
    nativeStorage.clear.call(this);
    if (isLocalStorage(this)) {
      for (const [key, value] of Object.entries(preserved)) {
        if (value !== null) nativeStorage.setItem.call(this, key, value);
      }
      observedEntries = { ...preserved };
    }
    if (isLocalStorage(this) && !suppressSync) keys.forEach(queueRemove);
  };

  seedFromServer();
  window.__piStorageReady = initializeFromServer();
  window.setTimeout(pollServer, POLL_INTERVAL_MS);
  window.setInterval(reconcileDirectChanges, 250);
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage || suppressSync) return;
    if (event.key === null) {
      observedEntries = {};
      return;
    }
    if (event.newValue === null) {
      delete observedEntries[event.key];
      queueRemove(event.key);
    } else {
      observedEntries[event.key] = event.newValue;
      queueSet(event.key, event.newValue);
    }
  });
  window.addEventListener("pagehide", () => {
    const committed = sendPendingBeacon();
    if (committed) clearBrowserMirror();
    void flushPending(true);
  });
})();
