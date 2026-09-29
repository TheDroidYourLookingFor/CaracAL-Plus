// Copy to vendor/caracAL/config.js. Keep the real session in AL_SESSION.
module.exports = {
  session: (() => {
    const session = process.env.AL_SESSION;
    if (!session) throw new Error("Missing required environment variable AL_SESSION. Set it in .env.");
    return session;
  })(),
  // Keep CaracAL and the Pi custom client on one durable caraGarage store.
  use_pi_shared_local_storage: true,
  cull_versions: true,
  enable_TYPECODE: false,
  log_level: "info",
  log_sinks: [
    [
      "node",
      "./node_modules/logrotate-stream/bin/logrotate-stream",
      "./logs/caracAL.log.jsonl",
      "--keep",
      "3",
      "--size",
      "4500000",
    ],
    ["node", "./standalones/LogPrinter.js"],
  ],
  web_app: {
    enable_bwi: true,
    enable_minimap: false,
    expose_CODE: true,
    expose_TYPECODE: false,
    port: Number(process.env.PI_MONITOR_PORT || 9024),
  },
  characters: {
    Character07: {
      realm: "EUI",
      script: "adventureland/headless/Trio.js",
      enabled: false,
      version: 0,
    },
    Character05: {
      realm: "EUI",
      script: "adventureland/headless/Trio.js",
      enabled: false,
      version: 0,
    },
    Character02: {
      realm: "EUI",
      script: "adventureland/headless/Trio.js",
      enabled: false,
      version: 0,
    },
    Character01MCH: {
      realm: "EUI",
      script: "adventureland/headless/Merchant.js",
      enabled: false,
      version: 0,
    },
  },
};
