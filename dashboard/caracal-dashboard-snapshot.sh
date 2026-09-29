#!/usr/bin/env bash
set -euo pipefail
umask 077

STATE="${CARACAL_STATE_DIR:-/opt/caracal/state}"
ROOT="${CARACAL_REPO_DIR:-/opt/caracal/repo}"
OUT="$STATE/activity.json"
ESC="$STATE/CODEX_ESCALATION.md"
MAX_AUX_JSON_BYTES=1048576
mkdir -p "$STATE"
TMP="$(mktemp "$STATE/activity.XXXXXX.json")"
trap 'rm -f "$TMP"' EXIT

branch="$(git -C "$ROOT" branch --show-current 2>/dev/null || true)"
commit="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
git_ok=false
if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_ok=true
fi
status_ok=false
changes_json='[]'
if status_lines="$(git -C "$ROOT" status --short --untracked-files=all 2>/dev/null)"; then
  status_ok=true
else
  status_lines=''
fi
if [[ "$status_ok" != true ]]; then
  clean=false
elif [[ -n "$status_lines" ]]; then
  clean=false
  changes_json="$(printf '%s\n' "$status_lines" | jq -Rsc 'split("\n") | map(select(length > 0))')"
else
  clean="$git_ok"
  changes_json='[]'
fi
commit_executor_ledger="$STATE/commit-executors.jsonl"
commit_log_json='[]'
if [[ "$git_ok" == true ]]; then
  commit_log_json="$(git -C "$ROOT" log -n 120 --date=iso-strict --pretty=format:'%H%x1f%an%x1f%aI%x1f%s' 2>/dev/null | while IFS=$'\x1f' read -r sha author date message; do
    [[ -n "$sha" ]] || continue
    paths_json="$(git -C "$ROOT" diff-tree --root --no-commit-id --name-only -r "$sha" 2>/dev/null | jq -Rsc 'split("\n") | map(select(length > 0))')"
    executor=""
    summary=""
    if [[ -s "$commit_executor_ledger" ]]; then
      executor="$(jq -r --arg sha "$sha" 'select(.sha == $sha) | .executor // empty' "$commit_executor_ledger" 2>/dev/null | tail -n 1)"
      summary="$(jq -r --arg sha "$sha" 'select(.sha == $sha) | .summary // empty' "$commit_executor_ledger" 2>/dev/null | tail -n 1)"
    fi
    jq -nc --arg sha "$sha" --arg message "$message" --arg summary "$summary" --arg author "$author" --arg date "$date" --arg executor "$executor" --argjson paths "$paths_json" \
      '{sha:$sha,executor:(if $executor == "" then null else $executor end),summary:(if $summary == "" then null else $summary end),commit:{message:$message,author:{name:$author,date:$date}},paths:$paths}'
  done | jq -sc '.')"
fi
project_change_logs_json="$(printf '%s' "$commit_log_json" | jq -c '
  [
    {id:"caracal-runtime",name:"CaracAL+",description:"Character runtime, monitor, worker, and integration changes",commits:map(select(any(.paths[]?; test("^CaracAL\\+/(vendor/caracAL/|scripts/(headless|start-headless|status|setup|configure-headless))"))))[0:60]},
    {id:"caracal-storage",name:"CaracAL+ Custom Storage",description:"Shared localStorage, persistence, and browser/runtime storage bridges",commits:map(select(any(.paths[]?; test("^CaracAL\\+/(scripts/pi-localstorage-bridge|vendor/caracAL/(ipcStorage|FileStoredKeyValues|localStorage))"))))[0:60]},
    {id:"custom-client",name:"Custom Game Client",description:"Pi-local Adventure Land client, proxy, and browser integration",commits:map(select(any(.paths[]?; test("^CaracAL\\+/(scripts/pi-client-(server|bridge)|scripts/start-client|client/)"))))[0:60]},
    {id:"custom-hub",name:"Custom Hub",description:"Character monitor, Hub windows, and Pi dashboard client panels",commits:map(select(any(.paths[]?; test("^CaracAL\\+/(vendor/caracAL/(monitor|pi-monitor)|scripts/pi-monitor|dashboard/public/monitor)"))))[0:60]},
    {id:"scripts",name:"In-Game Scripts",description:"Published player-script modules and character loaders",commits:map(select(any(.paths[]?; startswith("InGame_Scripts_WIP/"))))[0:60]},
    {id:"caracal-companions",name:"In-Game Script Companions on CaracAL+",description:"Headless Trio/Merchant adapters and CaracAL script integration",commits:map(select(any(.paths[]?; test("^CaracAL\\+/scripts/(headless|sync-account-code|caracal-.*)"))))[0:60]},
    {id:"ollama-dashboard",name:"Ollama Dashboard",description:"Worker dashboard UI, heartbeat, metrics, and change tracking",commits:map(select(any(.paths[]?; startswith("CaracAL+/dashboard/"))))[0:60]},
    {id:"ollama-server",name:"Ollama Server",description:"Local model chat, worker orchestration, and Ollama monitoring",commits:map(select(any(.paths[]?; test("^CaracAL\\+/(ollama-chat/|scripts/caracal-(worker|autonomous|dashboard-heartbeat|dashboard-queue|codex-escalation|production-watch|worker-metrics))"))))[0:60]},
    {id:"test-server",name:"Test Game Server",description:"Local TEST realm, fixtures, and test-server harnesses",commits:map(select(any(.paths[]?; test("^(Game_Test_Server/|Game_Source/)"))))[0:60]},
    {id:"test-characters",name:"Test Game Characters",description:"Disposable TEST-realm character runners and test account flows",commits:map(select(any(.paths[]?; test("^CaracAL\\+/scripts/(headless|caracal-test-realm|caracal-rpi-test-deploy)"))))[0:60]},
    {id:"production-server",name:"Production Game Server",description:"VPS deployment, services, health checks, and production operations",commits:map(select(any(.paths[]?; test("^CaracAL\\+/(deploy/|systemd/|Deploy-CaracALPlus|scripts/(setup-vps|check-vps|caracal-production|create-portable|install-pi-node))"))))[0:60]},
    {id:"production-characters",name:"Production Game Characters",description:"Production Trio/Merchant headless character configuration and operations",commits:map(select(any(.paths[]?; test("^CaracAL\\+/(scripts/headless/|vendor/caracAL/(CharacterThread|CharacterCoordinator))"))))[0:60]}
  ]')"

default_ollama_base="http://localhost:11434"
ollama_base="${OLLAMA_API_BASE:-$default_ollama_base}"
ollama_base="${ollama_base%/}"
if [[ ! "$ollama_base" =~ ^http://(localhost|127\.0\.0\.1|172\.20\.0\.57)(:[0-9]{1,5})?$ ]]; then
  ollama_base="$default_ollama_base"
fi
ollama_version="$(curl -fsS --connect-timeout 2 --max-time 4 "$ollama_base/api/version" 2>/dev/null | jq -r '.version // empty' 2>/dev/null || true)"
ollama_ps="$(curl -fsS --connect-timeout 2 --max-time 4 "$ollama_base/api/ps" 2>/dev/null || true)"
ollama_tags="$(curl -fsS --connect-timeout 2 --max-time 4 "$ollama_base/api/tags" 2>/dev/null || true)"
if [[ -n "$ollama_ps" ]]; then
  # Extract models with their sizes for monitoring
  loaded_models_json="$(printf '%s' "$ollama_ps" | jq -c '{
    models: (.models // [] | map({name: .name, size: (.size | if . then . else 0 end), details: (.details // {})})),
    total_size: (.total_size | if . then . else 0 end)
  }' 2>/dev/null || printf '{"models":[],"total_size":0}')"
else
  loaded_models_json='{"models":[],"total_size":0}'
fi
if [[ -n "$ollama_tags" ]]; then
  available_models_json="$(printf '%s' "$ollama_tags" | jq -c '[.models[]? | {name, size, modified_at}]' 2>/dev/null || printf '[]')"
else
  available_models_json='[]'
fi
if [[ -n "$ollama_version" ]]; then
  ollama_ok=true
  ollama_error=null
else
  ollama_ok=false
  ollama_error='Ollama snapshot unavailable'
fi

if [[ -s "$ESC" ]]; then
  escalation_text="$(head -c 12000 "$ESC")"
  escalation_json="$(jq -n --arg file "$ESC" --arg body "$escalation_text" '[{file:$file,updatedAt:(now|todateiso8601),text:$body}]')"
else
  escalation_json='[]'
fi

if [[ -e "$STATE/STOP" ]]; then
  worker_state=stopped
elif [[ -e "$STATE/ENABLE_WORKER" ]]; then
  worker_state=enabled
else
  worker_state=disabled
fi

if [[ -s "$STATE/production-status.json" ]]; then
  production_size="$(wc -c < "$STATE/production-status.json" 2>/dev/null || printf '0')"
  if [[ "$production_size" =~ ^[0-9]+$ ]] && (( production_size <= MAX_AUX_JSON_BYTES )); then
    production_json="$(jq -c 'if type == "object" then {timestamp,ok,readOnly,target,polls,signals,severeLogLines,warningLogLines,autoHeal} else {} end' "$STATE/production-status.json" 2>/dev/null || printf '{}')"
  else
    production_json='{}'
  fi
else
  production_json='{}'
fi

if [[ -s "$STATE/worker-metrics.json" ]]; then
  worker_metrics_size="$(wc -c < "$STATE/worker-metrics.json" 2>/dev/null || printf '0')"
  if [[ "$worker_metrics_size" =~ ^[0-9]+$ ]] && (( worker_metrics_size <= MAX_AUX_JSON_BYTES )); then
    worker_metrics_json="$(jq -c '
      def safe_job:
        if type != "object" then null else {
          id: (.id // null),
          lane: (.lane // null),
          outcome: (.outcome // null),
          executor: (.executor // null),
          startedAtUtc: (.startedAtUtc // null),
          endedAtUtc: (.endedAtUtc // null),
          commit: (.commit // null),
          detail: ((.detail // "") | tostring | .[0:700])
        } end;
      if type == "object" then {
        version: (.version // null),
        updatedAtUtc: (.updatedAtUtc // null),
        attemptedJobs: (.attemptedJobs // 0),
        completedJobs: (.completedJobs // 0),
        successfulUpgrades: (.successfulUpgrades // 0),
        noUpgradeJobs: (.noUpgradeJobs // 0),
        erroredJobs: (.erroredJobs // 0),
        executorUsage: (if (.executorUsage | type) == "object" then {
          "chatgpt-codex": (.executorUsage["chatgpt-codex"] // 0),
          ollama: (.executorUsage.ollama // 0),
          unknown: (.executorUsage.unknown // 0)
        } else {} end),
        activeJob: (.activeJob | safe_job),
        lastJob: (.lastJob | safe_job)
      } else {} end
    ' "$STATE/worker-metrics.json" 2>/dev/null || printf '{}')"
  else
    worker_metrics_json='{}'
  fi
else
  worker_metrics_json='{}'
fi

jq -n \
  --arg branch "$branch" \
  --arg commit "$commit" \
  --arg root "$ROOT" \
  --argjson git_ok "$git_ok" \
  --argjson clean "$clean" \
  --argjson changes "$changes_json" \
  --argjson commits "$commit_log_json" \
  --arg version "$ollama_version" \
  --argjson ollama_ok "$ollama_ok" \
  --arg ollama_error "$ollama_error" \
  --argjson loaded_models "$loaded_models_json" \
  --argjson available_models "$available_models_json" \
  --argjson escalation "$escalation_json" \
  --argjson production "$production_json" \
  --argjson worker_metrics "$worker_metrics_json" \
  --argjson project_change_logs "$project_change_logs_json" \
  --arg worker_state "$worker_state" \
  '{version:3,source:"Ubuntu local worker heartbeat",generatedAtUtc:(now|todateiso8601),project:{repository:"Character01YourLookingFor/AdventureLandCode-Droid",root:$root,caracalRoot:($root + "/CaracAL+")},git:{ok:$git_ok,branch:$branch,clean:$clean,changes:$changes,commits:$commits[0:12]},projectChangeLogs:$project_change_logs,ollama:{ok:$ollama_ok,version:(if $version == "" then null else $version end),loadedModels:$loaded_models,availableModels:$available_models,error:(if $ollama_ok then null else $ollama_error end)},worker_state:$worker_state,worker_metrics:$worker_metrics,escalation:$escalation,production:$production}' > "$TMP"
chmod 600 "$TMP"
mv -f "$TMP" "$OUT"
