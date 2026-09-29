const prettyMilliseconds = require("pretty-ms");
const { PNG } = require("pngjs");
const { STAT_BEAT_INTERVAL } = require("./src/CONSTANTS.js");
const { max, min, abs, round, floor } = Math;

function humanize_int(num, digits) {
  num = round(num);
  const lookup = [
    { value: 1e3, symbol: "" },
    { value: 1e6, symbol: "k" },
    { value: 1e9, symbol: "Mil" },
    { value: 1e12, symbol: "Bil" },
    { value: 1e15, symbol: "Tril" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup.find(function (item) {
    return abs(num) < item.value;
  });
  return item
    ? ((num * 1e3) / item.value).toFixed(digits).replace(rx, "$1") + item.symbol
    : num.toExponential(digits);
}

function register_stat_beat(g_con) {
  const runtime_started_at = Date.now();
  g_con.caracAL.stat_beat = setInterval(() => {
    const character = g_con.character;
    const result = { type: "stat_beat" };
    // Depending on the cached client revision, the local player appearance
    // can live on the rendered entity rather than the top-level character
    // object.  Prefer the player object but keep the entity as a fallback so
    // the monitor can still render the same sprite used by party frames.
    const appearance_sources = [
      character,
      character && character.player,
      character && character.sprite,
      character && g_con.entities && g_con.entities[character.id],
    ].filter((source) => source && typeof source === "object");
    const appearance = appearance_sources.find((source) =>
      source.skin || source.tskin || source.cx || source.tcx || source.ctype || source.cosmetic_head_y,
    ) || character || {};
    result.skin = appearance.tskin || appearance.skin || "";
    result.cx = appearance.tcx || appearance.cx || {};
    result.cosmetic_head_y = Number(appearance.cosmetic_head_y) || 0;
    result.ctype =
      appearance.ctype ||
      (character && character.ctype) ||
      g_con.caracAL_character_type ||
      "";
    result.server =
      g_con.server_name ||
      [g_con.server_region, g_con.server_identifier].filter(Boolean).join(" ") ||
      "";
    result.map = character.map || "";
    result.real_x = character.real_x;
    result.real_y = character.real_y;
    result.ping = character.ping;
    result.goldm = character.goldm;
    result.xpm = character.xpm;
    result.luckm = character.luckm;
    result.cc = character.cc;
    result.runtime_ms = Math.max(0, Date.now() - runtime_started_at);
    const inventory = Array.isArray(character.items) ? character.items : [];
    const inventory_items = inventory.filter(Boolean).map((item) => ({
      name: item.name || "unknown",
      q: Number(item.q) || 1,
      level: Number(item.level) || 0,
      skin: item.skin || item.name || "",
    }));
    const quantityWithPrefix = (prefix) => inventory.reduce((total, item) => {
      if (!item || typeof item.name !== "string" || !item.name.startsWith(prefix)) return total;
      return total + (Number(item.q) || 1);
    }, 0);
    const equipped = character.slots && typeof character.slots === "object"
      ? Object.keys(character.slots).filter((slot) => !slot.startsWith("trade") && character.slots[slot]).length
      : 0;
    const effects = character.s && typeof character.s === "object"
      ? Object.keys(character.s).filter((key) => character.s[key]).slice(0, 12)
      : [];
    const nearby = Object.values(g_con.entities || {}).reduce((counts, entity) => {
      if (!entity || entity.dead) return counts;
      if (entity.mtype) counts.monsters += 1;
      else if (entity.type === "character" || entity.ctype) counts.players += 1;
      return counts;
    }, { monsters: 0, players: 0 });
    result.hp_potions = quantityWithPrefix("hpot");
    result.mp_potions = quantityWithPrefix("mpot");
    result.inventory_items = inventory_items;
    // Keep the complete slot array separate from the display string so the
    // dashboard can render the same item sprites and empty slots as the game.
    result.inventory_slots = inventory.map((item) => item ? {
      name: item.name || "unknown",
      q: Number(item.q) || 1,
      level: Number(item.level) || 0,
      skin: item.skin || item.name || "",
    } : null);
    result.gear_count = equipped;
    result.effects = effects;
    result.nearby_monsters = nearby.monsters;
    result.nearby_players = nearby.players;
    result.dps_estimate = Number.isFinite(Number(character.attack)) && Number.isFinite(Number(character.frequency))
      ? Number(character.attack) * Number(character.frequency)
      : null;
    [
      "rip",
      "hp",
      "max_hp",
      "mp",
      "max_mp",
      "level",
      "xp",
      "max_xp",
      "gold",
      "party",
      "isize",
      "esize",
      // These are consumed by the monitor page's party-frame portrait.  They
      // are kept alongside the stat beat so the portrait always represents
      // the same live character state as the tile data.
    ].forEach((x) => (result[x] = character[x]));
    const targeting = g_con.entities[character.target];
    result.t_mtype = (targeting && targeting.mtype) || null;
    result.t_name = (targeting && targeting.name) || null;
    result.current_status = g_con.current_status;
    if (g_con.caracAL.map_enabled()) {
      result.mmap =
        "data:image/png;base64," + generate_minimap(g_con).toString("base64");
    }
    process.send(result);
  }, STAT_BEAT_INTERVAL);
}

//g_child is a child process with a stat beat
function create_monitor_ui(bwi, char_name, child_block, enable_map) {
  let xp_histo = [];
  let xp_ph = 0;
  let gold_histo = [];
  let last_beat = null;
  child_block.instance.on("message", (m) => {
    if (m.type == "stat_beat") {
      gold_histo.push(m.gold);
      gold_histo = gold_histo.slice(-100);
      if (last_beat && last_beat.level != m.level) {
        xp_histo = [];
      }
      xp_histo.push(m.xp);
      xp_histo = xp_histo.slice(-100);
      xp_ph = val_ph(xp_histo);
      last_beat = m;
    }
  });
  function quick_bar_val(num, denom, humanize = false) {
    let modif = (x) => x;
    if (humanize) {
      modif = (x) => humanize_int(x, 1);
    }
    return [(100 * num) / denom, `${modif(num)}/${modif(denom)}`];
  }
  function val_ph(arr) {
    if (arr.length < 2) {
      return 0;
    }
    return (
      ((arr[arr.length - 1] - arr[0]) * 3600000) /
      (arr.length - 1) /
      STAT_BEAT_INTERVAL
    );
  }
  const schema = [
    { name: "name", type: "text", label: "Name", getter: () => char_name },
    {
      name: "sprite_skin",
      type: "text",
      label: "Sprite skin",
      getter: () => last_beat.skin || "",
    },
    {
      name: "sprite_ctype",
      type: "text",
      label: "Sprite class",
      getter: () => last_beat.ctype || "",
    },
    {
      name: "sprite_cx",
      type: "text",
      label: "Sprite customization",
      getter: () => JSON.stringify(last_beat.cx || {}),
    },
    {
      name: "sprite_cosmetic_head_y",
      type: "text",
      label: "Sprite cosmetic head offset",
      getter: () => Number(last_beat.cosmetic_head_y) || 0,
    },
    {
      name: "realm",
      type: "text",
      label: "Realm",
      getter: () => child_block.realm,
    },
    {
      name: "server",
      type: "text",
      label: "Server",
      getter: () => last_beat.server || child_block.realm,
    },
    {
      name: "not_rip",
      type: "text",
      label: "Alive",
      getter: () => (last_beat.rip && "No") || "Yes",
    },
    {
      name: "level",
      type: "text",
      label: "Level",
      getter: () => last_beat.level,
    },
    {
      name: "class_name",
      type: "text",
      label: "Class",
      getter: () => last_beat.ctype || "N/A",
    },
    {
      name: "uptime",
      type: "text",
      label: "Uptime",
      getter: () => prettyMilliseconds(last_beat.runtime_ms || 0, { unitCount: 2 }),
    },
    {
      name: "health",
      type: "labelProgressBar",
      label: "Health",
      options: { color: "red" },
      getter: () => quick_bar_val(last_beat.hp, last_beat.max_hp),
    },
    {
      name: "mana",
      type: "labelProgressBar",
      label: "Mana",
      options: { color: "blue" },
      getter: () => quick_bar_val(last_beat.mp, last_beat.max_mp),
    },
    {
      name: "xp",
      type: "labelProgressBar",
      label: "XP",
      options: { color: "green" },
      getter: () => quick_bar_val(last_beat.xp, last_beat.max_xp, true),
    },
    {
      name: "inv",
      type: "labelProgressBar",
      label: "Inventory",
      options: { color: "brown" },
      getter: () =>
        quick_bar_val(last_beat.isize - last_beat.esize, last_beat.isize),
    },
    {
      name: "gold",
      type: "text",
      label: "Gold",
      getter: () => humanize_int(last_beat.gold, 1),
    },
    {
      name: "party_leader",
      type: "text",
      label: "Chief",
      getter: () => last_beat.party || "N/A",
    },
    {
      name: "current_status",
      type: "text",
      label: "Status",
      getter: () => last_beat.current_status,
    },
    {
      name: "target",
      type: "text",
      label: "Target",
      getter: () =>
        (last_beat.t_name &&
          (last_beat.t_mtype ? "Player " : "") + last_beat.t_name) ||
        "None",
    },
    {
      name: "location",
      type: "text",
      label: "Location",
      getter: () => {
        const map = last_beat.map || "Unknown";
        const x = Number.isFinite(Number(last_beat.real_x)) ? Math.round(last_beat.real_x) : "-";
        const y = Number.isFinite(Number(last_beat.real_y)) ? Math.round(last_beat.real_y) : "-";
        return `${map} (${x}, ${y})`;
      },
    },
    {
      name: "connection",
      type: "text",
      label: "Connection",
      getter: () => {
        const server = last_beat.server || child_block.realm || "N/A";
        const ping = Number.isFinite(Number(last_beat.ping))
          ? `${Math.round(last_beat.ping)}ms ping`
          : "ping N/A";
        const uptime = prettyMilliseconds(last_beat.runtime_ms || 0, { unitCount: 2 });
        return `${server} · ${ping} · up ${uptime}`;
      },
    },
    {
      name: "ping",
      type: "text",
      label: "Ping",
      getter: () => Number.isFinite(Number(last_beat.ping)) ? `${Math.round(last_beat.ping)}ms` : "N/A",
    },
    {
      name: "gph",
      type: "text",
      label: "Gold/h",
      getter: () => humanize_int(val_ph(gold_histo), 1),
    },
    {
      name: "xpph",
      type: "text",
      label: "XP/h",
      getter: () => humanize_int(xp_ph, 1),
    },
    {
      name: "ttlu",
      type: "text",
      label: "TTLU",
      getter: () =>
        (xp_ph <= 0 && "N/A") ||
        prettyMilliseconds(
          ((last_beat.max_xp - last_beat.xp) * 3600000) / xp_ph,
          { unitCount: 2 },
        ),
    },
    {
      name: "goldm",
      type: "text",
      label: "Gold modifier",
      getter: () => Number.isFinite(Number(last_beat.goldm)) ? `${Math.round(last_beat.goldm * 100)}%` : "N/A",
    },
    {
      name: "xpm",
      type: "text",
      label: "XP modifier",
      getter: () => Number.isFinite(Number(last_beat.xpm)) ? `${Math.round(last_beat.xpm * 100)}%` : "N/A",
    },
    {
      name: "luckm",
      type: "text",
      label: "Luck modifier",
      getter: () => Number.isFinite(Number(last_beat.luckm)) ? `${Math.round(last_beat.luckm * 100)}%` : "N/A",
    },
    {
      name: "cc",
      type: "text",
      label: "CC",
      getter: () => Number.isFinite(Number(last_beat.cc)) ? String(Math.round(Number(last_beat.cc))) : "N/A",
    },
    {
      name: "modifiers",
      type: "text",
      label: "Modifiers",
      getter: () => {
        const modifier = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)}%` : "N/A";
        return `Gold ${modifier(last_beat.goldm)} · XP ${modifier(last_beat.xpm)} · Luck ${modifier(last_beat.luckm)}`;
      },
    },
    {
      name: "hp_potions",
      type: "text",
      label: "HP potions",
      getter: () => String(last_beat.hp_potions ?? 0),
    },
    {
      name: "mp_potions",
      type: "text",
      label: "MP potions",
      getter: () => String(last_beat.mp_potions ?? 0),
    },
    {
      name: "gear_count",
      type: "text",
      label: "Gear",
      getter: () => String(last_beat.gear_count ?? 0),
    },
    {
      name: "effects",
      type: "text",
      label: "Effects",
      getter: () => (Array.isArray(last_beat.effects) && last_beat.effects.length ? last_beat.effects.join(", ") : "None"),
    },
    {
      name: "nearby",
      type: "text",
      label: "Nearby",
      getter: () => `${last_beat.nearby_monsters ?? 0} monsters · ${last_beat.nearby_players ?? 0} players`,
    },
    {
      name: "inventory_items",
      type: "text",
      label: "Inventory items",
      getter: () => (Array.isArray(last_beat.inventory_items) && last_beat.inventory_items.length
        ? last_beat.inventory_items.map((item) => `${item.name}${item.level ? ` +${item.level}` : ""} ×${item.q}`).join(" · ")
        : "Empty"),
    },
    {
      name: "inventory_slots",
      type: "text",
      label: "Inventory slots",
      getter: () => JSON.stringify(Array.isArray(last_beat.inventory_slots) ? last_beat.inventory_slots : []),
    },
    {
      name: "dps_estimate",
      type: "text",
      label: "Est. DPS",
      getter: () => Number.isFinite(Number(last_beat.dps_estimate)) ? humanize_int(last_beat.dps_estimate, 1) : "N/A",
    },
  ];
  if (enable_map) {
    schema.push({
      name: "minimap",
      type: "image",
      label: "Map",
      options: { width: mmap_w, height: mmap_h },
      getter: () => last_beat.mmap,
    });
  }
  const ui = bwi.publisher.createInterface(
    schema.map((x) => ({
      name: x.name,
      type: x.type,
      label: x.label,
      options: x.options,
    })),
  );
  ui.setDataSource(() => {
    if (!last_beat) {
      return {
        name: char_name,
        realm: child_block.realm,
        not_rip: "Hopefully",
        current_status: "Loading...",
      };
    }
    const result = {};
    schema.forEach((x) => (result[x.name] = x.getter()));
    return result;
  });
  return ui;
}

const mmap_cols = {
  //transparent
  background: [0, 0, 0, 0],
  //brown
  monster: [0xb1, 0x4f, 0x1d, 255],
  //light red
  monster_engaged: [0xc1, 0x00, 0x37, 255],
  //dark blue
  character: [50, 177, 245, 255],
  //light blue
  player: [40, 74, 244, 255],
  //gray
  wall: [200, 200, 200, 255],
};
const mmap_w = 200;
const mmap_h = 150;
const mmap_scale = 1 / 3;

function generate_minimap(game_context) {
  var png = new PNG({
    width: mmap_w,
    height: mmap_h,
    filterType: -1,
  });
  const i_data = png.data;
  function fill_rect(x1, y1, x2, y2, col) {
    for (let i = x1; i < x2; i++) {
      for (let j = y1; j < y2; j++) {
        const idd = (mmap_w * j + i) << 2;
        i_data[idd] = col[0];
        i_data[idd + 1] = col[1];
        i_data[idd + 2] = col[2];
        i_data[idd + 3] = col[3];
      }
    }
  }
  function safe_fill_rect(x1, y1, x2, y2, col) {
    x1 = max(0, min(x1, mmap_w));
    x2 = max(0, min(x2, mmap_w));
    y1 = max(0, min(y1, mmap_h));
    y2 = max(0, min(y2, mmap_h));
    fill_rect(x1, y1, x2, y2, col);
  }
  const g_char = game_context.character;
  const c_x = g_char.real_x;
  const c_y = g_char.real_y;
  function relative_coords(x, y) {
    return [
      (x - c_x) * mmap_scale + mmap_w / 2,
      (y - c_y) * mmap_scale + mmap_h / 2,
    ];
  }

  //fill with bg data
  fill_rect(0, 0, mmap_w, mmap_h, mmap_cols.background);

  const geom = game_context.GEO;
  //draw horizontal collision
  for (let i = 0; i < geom.x_lines.length; i++) {
    //raw line data
    const [r_x, r_y1, r_y2] = geom.x_lines[i];
    const l_x = floor((r_x - c_x) * mmap_scale + mmap_w / 2);
    if (l_x < 0) continue;
    if (l_x >= mmap_w) break;
    safe_fill_rect(
      l_x,
      floor((r_y1 - c_y) * mmap_scale + mmap_h / 2),
      l_x + 1,
      floor((r_y2 - c_y) * mmap_scale + mmap_h / 2) + 1,
      mmap_cols.wall,
    );
  }
  //draw vertical collision
  for (let i = 0; i < geom.y_lines.length; i++) {
    //raw line data
    const [r_y, r_x1, r_x2] = geom.y_lines[i];
    const l_y = floor((r_y - c_y) * mmap_scale + mmap_h / 2);
    if (l_y < 0) continue;
    if (l_y >= mmap_h) break;

    safe_fill_rect(
      floor((r_x1 - c_x) * mmap_scale + mmap_w / 2),
      l_y,
      floor((r_x2 - c_x) * mmap_scale + mmap_w / 2) + 1,
      l_y + 1,
      mmap_cols.wall,
    );
  }

  function draw_blip(ent, col) {
    const rel = relative_coords(ent.real_x, ent.real_y);
    const r_x = floor(rel[0]);
    const r_y = floor(rel[1]);
    safe_fill_rect(r_x - 1, r_y, r_x + 2, r_y + 1, col);
    safe_fill_rect(r_x, r_y - 1, r_x + 1, r_y + 2, col);
  }
  function pixel_circle(ent, col) {
    const rel = relative_coords(ent.real_x, ent.real_y);
    const r_x = floor(rel[0]);
    const r_y = floor(rel[1]);
    safe_fill_rect(r_x - 1, r_y - 3, r_x + 2, r_y - 2, col);
    safe_fill_rect(r_x - 1, r_y + 3, r_x + 2, r_y + 4, col);
    safe_fill_rect(r_x - 3, r_y - 1, r_x - 2, r_y + 2, col);
    safe_fill_rect(r_x + 3, r_y - 1, r_x + 4, r_y + 2, col);

    safe_fill_rect(r_x - 2, r_y - 2, r_x - 1, r_y - 1, col);
    safe_fill_rect(r_x + 2, r_y + 2, r_x + 3, r_y + 3, col);
    safe_fill_rect(r_x + 2, r_y - 2, r_x + 3, r_y - 1, col);
    safe_fill_rect(r_x - 2, r_y + 2, r_x - 1, r_y + 3, col);
  }

  //draw entities
  for (let ent_id in game_context.entities) {
    const ent = game_context.entities[ent_id];
    if (ent.npc || ent.dead) {
      continue;
    }
    let color;
    if (ent.mtype) {
      color =
        (ent.target == g_char.name && mmap_cols.monster_engaged) ||
        mmap_cols.monster;
    } else {
      color = mmap_cols.player;
    }
    draw_blip(ent, color);
  }

  const trg = game_context.entities[g_char.target];
  if (trg && !trg.npc && !trg.dead) {
    pixel_circle(trg, mmap_cols.monster_engaged);
  }
  draw_blip(g_char, mmap_cols.character);

  return PNG.sync.write(png);
}

exports.create_monitor_ui = create_monitor_ui;
exports.register_stat_beat = register_stat_beat;
