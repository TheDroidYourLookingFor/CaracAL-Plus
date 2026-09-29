#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/vendor/caracAL"
node -e 'require("./src/ConfigUtil").prompt_new_cfg().catch((error) => { console.error(error.message || error); process.exit(1); })'
if [[ -f config.js ]]; then
  chmod 600 config.js
fi
