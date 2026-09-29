"use strict";

const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const envFile = process.env.CARACAL_ENV_FILE || path.join(process.env.CARACAL_HOME || projectRoot, ".env");
try {
  process.loadEnvFile(envFile);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
process.env.CARACAL_HOME ||= projectRoot;

function requireEnv(...names) {
  const missing = names.filter((name) => !process.env[name] || !process.env[name].trim());
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}. Set them in .env or the process environment.`);
  }
}

module.exports = { requireEnv };