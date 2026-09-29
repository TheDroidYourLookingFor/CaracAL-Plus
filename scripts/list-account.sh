#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env"
fi
: "${AL_SESSION:?Set AL_SESSION in .env first}"

cd "$ROOT/vendor/caracAL"
node <<'NODE'
const account_info = require("./account_info");
(async () => {
  const account = await account_info(process.env.AL_SESSION);
  const response = account.response || {};
  console.log(JSON.stringify({
    characters: (response.characters || []).map((x) => x.name),
    servers: (response.servers || []).map((x) => ({ key: x.key, name: x.name })),
  }, null, 2));
  account.destroy();
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
NODE
