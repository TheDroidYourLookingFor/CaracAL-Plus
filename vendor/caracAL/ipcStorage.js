function make_IPC_storage(ident, options = {}) {
  const items = new Map();
  const storage_mode = options.storage_mode || "caracal-native";
  // Adventure Land's built-in local_cm_logic() refreshes activity<character>
  // heartbeats several times per second. They are only a liveness hint for
  // local chat routing, not durable application state. Keeping them inside
  // each headless client's IPC storage avoids broadcasting and persisting a
  // high-frequency runtime heartbeat through CaracAL's shared JSONL store.
  const is_ephemeral_activity_key = (key) => ident === "ls" && key.startsWith("activity");
  const mock_parent = {
    setItem(_key, _val) {
      const key = String(_key);
      const val = String(_val);
      if (is_ephemeral_activity_key(key)) return items.set(key, val);
      process.send({
        type: "stor",
        op: "set",
        ident,
        storage_mode,
        data: { [key]: val },
      });
      return items.set(key, val);
    },
    getItem(_key) {
      const key = String(_key);
      return items.get(key);
    },
    removeItem(_key) {
      const key = String(_key);
      if (is_ephemeral_activity_key(key)) {
        items.delete(key);
        return;
      }
      process.send({
        type: "stor",
        op: "del",
        ident,
        storage_mode,
        data: [key],
      });
      items.delete(key);
    },
    clear() {
      process.send({
        type: "stor",
        op: "clear",
        ident,
        storage_mode,
      });
      items.clear();
    },
    key(n) {
      return Array.from(items.keys())[n];
    },
    get length() {
      return items.size;
    },
  };
  process.on("message", (m) => {
    if (m.type == "stor" && m.ident == ident) {
      if (m.op == "set") {
        for (let key in m.data) {
          items.set(key, m.data[key]);
        }
      }
      if (m.op == "del") {
        for (let key of m.data) {
          items.delete(key);
        }
      }
      if (m.op == "clear") {
        items.clear();
      }
    }
  });

  process.send({
    type: "stor",
    op: "init",
    ident,
    storage_mode,
  });

  return new Proxy(Object.create(mock_parent), {
    get: function (oTarget, sKey) {
      return mock_parent[sKey] || mock_parent.getItem(sKey) || undefined;
    },
    set: function (oTarget, sKey, vValue) {
      //length cannot be set in this manner
      if (sKey == "length") return vValue;
      return mock_parent.setItem(sKey, vValue);
    },
    deleteProperty: function (oTarget, sKey) {
      //base keys can only be deleted with removeItem
      if (sKey in mock_parent) {
        return true;
      }
      return mock_parent.removeItem(sKey);
    },
    //return contents but not base keys
    ownKeys: function (oTarget, sKey) {
      return Array.from(items.keys()).filter((key) => !(key in mock_parent));
    },
    has: function (oTarget, sKey) {
      return sKey in mock_parent || items.has(sKey);
    },
    getOwnPropertyDescriptor: function (oTarget, sKey) {
      if (sKey in mock_parent) {
        return undefined;
      }
      if (!items.has(sKey)) {
        return undefined;
      }
      return {
        value: mock_parent.getItem(sKey),
        writable: true,
        enumerable: true,
        configurable: true,
      };
    },
  });
}

exports.make_IPC_storage = make_IPC_storage;
