const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = (value) => value ? new Date(value).toLocaleString() : '—';
const projectChangeDetails = new Map();
const bytes = (value) => { const n = Number(value || 0); if (!n) return '—'; const units = ['B', 'KiB', 'MiB', 'GiB']; let i = 0; let size = n; while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; } return `${size.toFixed(i ? 1 : 0)} ${units[i]}`; };
const badge = (ok, text) => `<span class="badge ${ok ? 'ok' : 'bad'}"><i></i>${esc(text)}</span>`;
function card(title, ok, detail) { return `<article class="health-card"><div class="card-title">${esc(title)}</div>${badge(ok, ok ? 'Online' : 'Needs attention')}<div class="card-detail">${esc(detail || '')}</div></article>`; }
function productionDetail(data) {
  if (!data || typeof data !== 'object' || !data.timestamp) return 'Read-only production watcher snapshot unavailable';
  const trio = data.signals?.trio || {};
  const merchant = data.signals?.merchant || {};
  const autoHeal = data.autoHeal || {};
  const severe = Number(data.severeLogLines || 0);
  const state = data.ok === true ? 'Trio and Merchant signals healthy' : 'Read-only watcher needs attention';
  const heal = autoHeal.enabled === true ? `Auto-heal armed${autoHeal.lastAction && autoHeal.lastAction !== 'none' ? ` · ${autoHeal.lastAction}` : ''}` : 'Auto-heal disabled';
  return `${state} · Trio ${trio.ok === true ? 'OK' : 'incomplete'} · Merchant ${merchant.ok === true ? 'OK' : 'missing'} · ${severe} severe recent log lines · ${heal}`;
}
function renderProjectState(data) {
  const git = data.git || {};
  const changes = Array.isArray(git.changes) ? git.changes : [];
  const root = data.project?.root || 'Project root unavailable';
  $('branch').textContent = git.branch || 'No branch snapshot';
  $('project-state').innerHTML = `<div>${badge(git.clean === true, git.clean === true ? 'Working tree clean' : `${changes.length} local change${changes.length === 1 ? '' : 's'}`)}</div><div class="path mono">${esc(root)}</div>${changes.length ? `<pre class="change-list">${esc(changes.join('\n'))}</pre>` : '<p class="muted">No local changes were recorded in the deployment snapshot.</p>'}`;
}
function renderModels(data) {
  const ollama = data.ollama || {};
  const activeModels = Array.isArray(ollama.loadedModels) ? ollama.loadedModels : [];
  const availableModels = Array.isArray(ollama.availableModels) ? ollama.availableModels : [];
  const availability = availableModels.length ? `${availableModels.length} installed` : 'installed list unavailable';
  $('ollama-snapshot').textContent = ollama.version ? `Ollama ${ollama.version} · ${activeModels.length ? `${activeModels.length} active` : 'idle'} · ${availability}` : '';
  $('models').innerHTML = activeModels.length ? activeModels.map((model) => {
    const name = model.name || model.model || 'Unnamed model';
    const vram = model.size_vram ? bytes(model.size_vram) : null;
    const context = model.context_length ? `${Number(model.context_length).toLocaleString()} context` : null;
    return `<div class="model-row"><strong>${esc(name)}</strong><span class="muted">${esc([vram, context].filter(Boolean).join(' · ') || 'Active now')}</span></div>`;
  }).join('') : `<p class="muted">${ollama.ok ? `No model is currently active; ${availableModels.length || 'no'} installed locally.` : `Local Ollama snapshot unavailable${ollama.error ? `: ${ollama.error}` : '.'}`}</p>`;
}
function renderEscalations(data) {
  const entries = Array.isArray(data.escalation) ? data.escalation : [];
  $('escalations').innerHTML = entries.length ? entries.map((entry) => `<article class="escalation"><strong>${esc(entry.file || 'CODEX_ESCALATION.md')}</strong><small>${esc(time(entry.updatedAt))}</small><pre>${esc(entry.text || '')}</pre></article>`).join('') : '<p class="muted">No active Codex escalation.</p>';
}
function renderStatus(data) {
  const service = data.service || {};
  const ollama = data.ollama || {};
  const production = data.production || null;
  const git = data.git || {};
  const snapshotAge = Number.isFinite(Number(data.snapshotAgeSeconds)) ? ` · local data synced ${Math.floor(Number(data.snapshotAgeSeconds))}s ago` : '';
  const snapshotWarning = data.snapshotReadError
    ? `Local snapshot read is retrying (${data.snapshotReadError}).`
    : data.snapshotFresh === false
      ? `Local snapshot is stale (${snapshotAge ? snapshotAge.replace(/^ · /, '') : 'age unavailable'}).`
      : '';
  $('last-updated').textContent = `Updated ${time(data.checkedAtUtc)}${snapshotAge}`;
  $('health-cards').innerHTML = [
    card('Ollama', ollama.ok === true, ollama.version || (ollama.error ? 'Snapshot unavailable' : 'No version reported')),
    card('GitHub project', git.ok === true, git.branch || 'Git snapshot unavailable'),
    card('Production VPS', production?.ok === true && data.snapshotFresh !== false, snapshotWarning || productionDetail(production)),
    card('Node runtime', Number(service.uptimeSeconds) >= 0, service.uptimeSeconds != null ? `Up ${Math.floor(service.uptimeSeconds / 60)} min · ${bytes(service.rssBytes)} RSS` : 'Runtime unavailable'),
    '<article class="health-card models-card"><div class="card-title">Local models</div><span id="ollama-snapshot" class="muted"></span><div id="models" class="stack"></div></article>',
  ].join('');
  renderProjectState(data);
  renderModels(data);
  renderEscalations(data);
  renderProjectChangeLogs(data);
  renderProjectMetrics(data);
}
function commitExecutor(item) {
  const explicit = String(item.executor || '').toLowerCase();
  if (/chatgpt|codex/.test(explicit)) return 'ChatGPT Codex';
  if (/ollama|aider/.test(explicit)) return 'Ollama';
  const author = String(item.commit?.author?.name || '').toLowerCase();
  if (/your name|chatgpt|codex/.test(author)) return 'ChatGPT Codex';
  if (/Character01yourlookingfor/.test(author)) return 'Ollama';
  return '';
}
function commitDescription(item) {
  return String(item.summary || item.commit?.message || 'Commit').split('\n')[0];
}
function executorTag(item) {
  const executor = commitExecutor(item);
  return executor ? `<span class="commit-executor-tag executor-${executor === 'ChatGPT Codex' ? 'chatgpt-codex' : 'ollama'}">${esc(executor)}</span>` : '';
}
function renderCommits(payload) {
  const commits = Array.isArray(payload?.commits) ? payload.commits : (Array.isArray(payload?.git?.commits) ? payload.git.commits : []);
  $('activity').innerHTML = commits.length ? commits.map((item) => {
    const sourceTag = executorTag(item);
    return `<div class="event"><div class="dot"></div><div><strong>${esc(String(item.sha || '').slice(0, 8))}</strong><span>${esc(commitDescription(item))}</span><small>${sourceTag}${sourceTag ? ' · ' : ''}${esc(item.commit?.author?.name || 'Local repository')} · ${esc(time(item.commit?.author?.date))}</small></div></div>`;
  }).join('') : '<p class="muted">No local deployment history is available on the VPS yet.</p>';
}
function projectPathMatches(id, path) {
  const value = String(path || '');
  if (id === 'caracal-runtime') return /^CaracAL\+\/(vendor\/caracAL\/|scripts\/(headless|start-headless|status|setup|configure-headless))/.test(value);
  if (id === 'caracal-storage') return /^CaracAL\+\/(scripts\/pi-localstorage-bridge|vendor\/caracAL\/(ipcStorage|FileStoredKeyValues|localStorage))/.test(value);
  if (id === 'custom-client') return /^CaracAL\+\/(scripts\/pi-client-(server|bridge)|scripts\/start-client|client\/)/.test(value);
  if (id === 'custom-hub') return /^CaracAL\+\/(vendor\/caracAL\/(monitor|pi-monitor)|scripts\/pi-monitor|dashboard\/public\/monitor)/.test(value);
  if (id === 'scripts') return value.startsWith('InGame_Scripts_WIP/');
  if (id === 'caracal-companions') return /^CaracAL\+\/scripts\/(headless|sync-account-code|caracal-.*)/.test(value);
  if (id === 'ollama-dashboard') return value.startsWith('CaracAL+/dashboard/');
  if (id === 'ollama-server') return /^CaracAL\+\/(ollama-chat\/|scripts\/caracal-(worker|autonomous|dashboard-heartbeat|dashboard-queue|codex-escalation|production-watch|worker-metrics))/.test(value);
  if (id === 'test-server') return /^(Game_Test_Server\/|Game_Source\/)/.test(value);
  if (id === 'test-characters') return /^CaracAL\+\/scripts\/(headless|caracal-test-realm|caracal-rpi-test-deploy)/.test(value);
  if (id === 'production-server') return /^CaracAL\+\/(deploy\/|systemd\/|Deploy-CaracALPlus|scripts\/(setup-vps|check-vps|caracal-production|create-portable|install-pi-node))/.test(value);
  if (id === 'production-characters') return /^CaracAL\+\/(scripts\/headless\/|vendor\/caracAL\/(CharacterThread|CharacterCoordinator))/.test(value);
  return true;
}
function projectPathLabel(id, path) {
  const value = String(path || '');
  if (id === 'ollama-dashboard') return value.startsWith('CaracAL+/dashboard/') ? value.slice('CaracAL+/dashboard/'.length) : value;
  if (id !== 'scripts' && id !== 'test-server' && value.startsWith('CaracAL+/')) return value.slice('CaracAL+/'.length);
  if (id === 'scripts') return value.startsWith('InGame_Scripts_WIP/') ? value.slice('InGame_Scripts_WIP/'.length) : value;
  if (id === 'test-server') return value.replace(/^(Game_Test_Server|Game_Source)\//, '');
  return value;
}
function projectLogsFromCommits(commits) {
  const definitions = [
    ['caracal-runtime', 'CaracAL+', 'Character runtime, monitor, worker, and integration changes'],
    ['caracal-storage', 'CaracAL+ Custom Storage', 'Shared localStorage, persistence, and browser/runtime storage bridges'],
    ['custom-client', 'Custom Game Client', 'Pi-local Adventure Land client, proxy, and browser integration'],
    ['custom-hub', 'Custom Hub', 'Character monitor, Hub windows, and Pi dashboard client panels'],
    ['scripts', 'In-Game Scripts', 'Published player-script improvements'],
    ['caracal-companions', 'In-Game Script Companions on CaracAL+', 'Headless Trio/Merchant adapters and CaracAL script integration'],
    ['ollama-dashboard', 'Ollama Dashboard', 'Worker dashboard UI, heartbeat, metrics, and change tracking'],
    ['ollama-server', 'Ollama Server', 'Local model chat, worker orchestration, and Ollama monitoring'],
    ['test-server', 'Test Game Server', 'Local TEST realm, fixtures, and test-server harnesses'],
    ['test-characters', 'Test Game Characters', 'Disposable TEST-realm character runners and test account flows'],
    ['production-server', 'Production Game Server', 'VPS deployment, services, health checks, and production operations'],
    ['production-characters', 'Production Game Characters', 'Production Trio/Merchant headless character configuration and operations'],
  ];
  return definitions.map(([id, name, description]) => ({
    id,
    name,
    description,
    commits: commits.filter((item) => Array.isArray(item.paths) && item.paths.some((path) => projectPathMatches(id, path))).slice(0, 60),
  }));
}
function renderProjectChangeLogs(payload) {
  const commits = Array.isArray(payload?.commits) ? payload.commits : (Array.isArray(payload?.git?.commits) ? payload.git.commits : []);
  const logs = Array.isArray(payload?.projectChangeLogs) && payload.projectChangeLogs.length ? payload.projectChangeLogs : projectLogsFromCommits(commits);
  projectChangeDetails.clear();
  $('project-change-logs').innerHTML = logs.map((log) => {
    const entries = Array.isArray(log.commits) ? log.commits : [];
    const body = entries.length ? entries.map((item, entryIndex) => {
      const paths = Array.isArray(item.paths) ? item.paths : [];
      const projectPaths = paths.filter((path) => projectPathMatches(log.id, path));
      const shownPaths = projectPaths.slice(0, 4).map((path) => projectPathLabel(log.id, path));
      const remainingPaths = Math.max(0, projectPaths.length - shownPaths.length);
      const scope = projectPaths.length ? `${projectPaths.length} file${projectPaths.length === 1 ? '' : 's'} changed` : 'Published commit';
      const pathSummary = shownPaths.length ? `<small class="project-change-paths">Changed: ${shownPaths.map((path) => `<code>${esc(path)}</code>`).join(', ')}${remainingPaths ? ` <span>+${remainingPaths} more</span>` : ''}</small>` : '';
      const sourceTag = executorTag(item);
      const detailId = `${log.id}-${String(item.sha || entryIndex)}-${entryIndex}`;
      projectChangeDetails.set(detailId, { item, log, projectPaths });
      return `<button type="button" class="project-change-entry" data-project-change-id="${esc(detailId)}"><div class="project-change-entry-head"><strong>${esc(String(item.sha || '').slice(0, 8))}</strong><small>${esc(time(item.commit?.author?.date))}</small></div><span>${esc(commitDescription(item))}</span><small>${sourceTag}${sourceTag ? ' · ' : ''}${esc(item.commit?.author?.name || 'Local repository')} · ${esc(scope)}</small>${pathSummary}<small class="project-change-open-hint">Click for commit details</small></button>`;
    }).join('') : '<p class="muted">No meaningful published changes recorded yet.</p>';
    return `<article class="project-change-log"><div class="project-change-log-head"><div><h3>${esc(log.name || 'Project')}</h3><p class="muted">${esc(log.description || '')}</p></div><span class="muted">${entries.length} change${entries.length === 1 ? '' : 's'}</span></div><div class="project-change-list">${body}</div></article>`;
  }).join('');
}
function openProjectChangeDetails(detailId) {
  const detail = projectChangeDetails.get(detailId);
  const modal = $('project-change-modal');
  const content = $('project-change-modal-content');
  if (!detail || !modal || !content) return;
  const item = detail.item || {};
  const commit = item.commit || {};
  const fullMessage = String(commit.message || item.message || 'No commit message recorded.');
  const sha = String(item.sha || '');
  const paths = detail.projectPaths.length ? detail.projectPaths : (Array.isArray(item.paths) ? item.paths : []);
  const diff = item.diff || item.patch;
  const githubUrl = /^[0-9a-f]{7,40}$/i.test(sha) ? `https://github.com/Character01YourLookingFor/AdventureLandCode-Droid/commit/${encodeURIComponent(sha)}` : '';
  content.innerHTML = `<div class="project-change-modal-meta"><span>${esc(detail.log?.name || 'Project change')}</span><span>${esc(time(commit.author?.date))}</span></div><h2>${esc(fullMessage.split('\n')[0] || 'Commit')}</h2><p class="muted">${esc(item.executor || commit.author?.name || 'Local repository')} · ${esc(sha || 'commit unavailable')}</p><h3>What changed</h3><pre class="project-change-modal-message">${esc(fullMessage)}</pre><h3>Files changed (${paths.length})</h3>${paths.length ? `<ul class="project-change-modal-files">${paths.map((path) => `<li><code>${esc(path)}</code></li>`).join('')}</ul>` : '<p class="muted">No changed-file list was recorded.</p>'}${diff ? `<h3>Recorded diff</h3><pre class="project-change-modal-diff">${esc(diff)}</pre>` : '<p class="muted">The dashboard snapshot does not include the full diff for this commit.</p>'}${githubUrl ? `<p><a class="project-change-modal-link" href="${githubUrl}" target="_blank" rel="noreferrer">Open this commit on GitHub</a></p>` : ''}`;
  modal.showModal ? modal.showModal() : modal.removeAttribute('hidden');
}
function renderProjectMetrics(data) {
  const metrics = data.workerMetrics || {};
  const logs = Array.isArray(data.projectChangeLogs) ? data.projectChangeLogs : projectLogsFromCommits(Array.isArray(data.commits) ? data.commits : []);
  const count = (value) => Number(value || 0);
  const attempted = count(metrics.attemptedJobs);
  const completed = count(metrics.completedJobs);
  const upgrades = count(metrics.successfulUpgrades);
  const noUpgrades = count(metrics.noUpgradeJobs);
  const errors = count(metrics.erroredJobs);
  const percent = (value) => attempted ? `${((value / attempted) * 100).toFixed(1)}%` : '0.0%';
  const publishedCommits = logs.reduce((total, log) => total + (Array.isArray(log.commits) ? log.commits.length : 0), 0);
  const changedFiles = new Set(logs.flatMap((log) => (Array.isArray(log.commits) ? log.commits : []).flatMap((item) => Array.isArray(item.paths) ? item.paths : [])));
  const tiles = [
    ['Attempted cycles', attempted, 'Persisted worker cycles started'],
    ['Completed cycles', completed, `${percent(completed)} reached an ending`],
    ['Successful upgrades', upgrades, `${percent(upgrades)} of attempts produced a commit`],
    ['No upgrades', noUpgrades, `${percent(noUpgrades)} completed without a change`],
    ['Errored cycles', errors, `${percent(errors)} stopped by error or escalation`],
    ['Completion rate', percent(completed), `${completed.toLocaleString()} of ${attempted.toLocaleString()} attempts`],
    ['Upgrade rate', percent(upgrades), `${upgrades.toLocaleString()} successful upgrade cycles`],
    ['Published commits', publishedCommits, 'Commits in the displayed project logs'],
    ['Changed files recorded', changedFiles.size, 'Unique paths in those commits'],
  ];
  const workerBars = [
    ['Completed', completed, 'completed'],
    ['Successful upgrades', upgrades, 'upgrades'],
    ['No upgrades', noUpgrades, 'no-upgrades'],
    ['Errored', errors, 'errors'],
  ];
  const workerMax = Math.max(1, ...workerBars.map(([, value]) => value));
  const workerChart = workerBars.map(([label, value, kind]) => {
    const width = Math.round((value / workerMax) * 100);
    return `<div class="metrics-bar-row" title="${esc(`${label}: ${value.toLocaleString()}`)}"><span class="metrics-bar-label">${esc(label)}</span><div class="metrics-bar-track"><div class="metrics-bar-fill metric-${kind}" style="width:${width}%"></div></div><strong class="metrics-bar-value">${value.toLocaleString()}</strong><small class="metrics-bar-detail">${esc(percent(value))} of attempts</small></div>`;
  }).join('');
  const pending = Math.max(0, attempted - completed - errors);
  const outcomeSegments = [
    ['Completed', completed, 'completed'],
    ['Errored', errors, 'errors'],
    ['Active / unrecorded', pending, 'active'],
  ];
  const outcomeMix = outcomeSegments.map(([label, value, kind]) => {
    const width = attempted ? Math.max(value ? 1 : 0, Math.round((value / attempted) * 100)) : 0;
    return `<div class="metrics-stack-segment metric-${kind}" style="width:${width}%" title="${esc(`${label}: ${value.toLocaleString()} (${percent(value)})`)}"></div>`;
  }).join('');
  const outcomeLegend = outcomeSegments.map(([label, value, kind]) => `<span class="metrics-legend-item"><i class="metric-${kind}"></i>${esc(label)} <strong>${value.toLocaleString()}</strong></span>`).join('');
  const projectBars = logs.map((log) => {
    const entries = Array.isArray(log.commits) ? log.commits : [];
    const files = new Set(entries.flatMap((item) => Array.isArray(item.paths) ? item.paths : [])).size;
    return { id: String(log.id || 'project'), name: log.name || 'Project', value: entries.length, detail: `${files} file${files === 1 ? '' : 's'}` };
  }).filter(({ value }) => value > 0).sort((a, b) => b.value - a.value);
  const emptyProjectCount = Math.max(0, logs.length - projectBars.length);
  const projectMax = Math.max(1, ...projectBars.map(({ value }) => value));
  const executorCounts = metrics.executorUsage || {};
  const executorCodex = count(executorCounts['chatgpt-codex']);
  const executorOllama = count(executorCounts.ollama);
  const executorTracked = executorCodex + executorOllama;
  const executorUntracked = Math.max(0, attempted - executorTracked);
  const executorSegments = [
    ['ChatGPT Codex', executorCodex, 'chatgpt-codex'],
    ['Ollama', executorOllama, 'ollama'],
    ['Prior / unrecorded', executorUntracked, 'unattributed'],
  ];
  const executorMix = executorSegments.map(([label, value, kind]) => {
    const width = attempted ? Math.max(value ? 1 : 0, Math.round((value / attempted) * 100)) : 0;
    return `<div class="metrics-stack-segment metric-${kind}" style="width:${width}%" title="${esc(`${label}: ${value.toLocaleString()} (${attempted ? ((value / attempted) * 100).toFixed(1) : '0.0'}%)`)}"></div>`;
  }).join('');
  const executorLegend = executorSegments.map(([label, value, kind]) => `<span class="metrics-legend-item"><i class="metric-${kind}"></i>${esc(label)} <strong>${value.toLocaleString()}</strong></span>`).join('');
  const projectChart = projectBars.length ? `${projectBars.map(({ id, name, value, detail }) => {
    const width = Math.round((value / projectMax) * 100);
    return `<div class="metrics-bar-row" title="${esc(`${name}: ${value.toLocaleString()} published commits, ${detail}`)}"><span class="metrics-bar-label">${esc(name)}</span><div class="metrics-bar-track"><div class="metrics-bar-fill metric-project metric-${esc(id)}" style="width:${width}%"></div></div><strong class="metrics-bar-value">${value.toLocaleString()}</strong><small class="metrics-bar-detail">${esc(detail)}</small></div>`;
  }).join('')}${emptyProjectCount ? `<p class="muted metrics-chart-note">${emptyProjectCount} project categor${emptyProjectCount === 1 ? 'y has' : 'ies have'} no published changes yet.</p>` : ''}` : '<p class="muted">No project change data recorded yet.</p>';
  const last = metrics.lastJob || metrics.activeJob || null;
  $('project-metrics-updated').textContent = last ? `Last cycle: ${String(last.outcome || 'running').replaceAll('_', ' ')}` : 'No worker cycle recorded';
  $('project-metrics').innerHTML = `<div class="project-metric-grid">${tiles.map(([title, value, detail]) => `<article class="project-metric-tile"><strong>${esc(String(value))}</strong><span>${esc(title)}</span><small>${esc(detail)}</small></article>`).join('')}</div><div class="metrics-chart-grid"><article class="metrics-chart"><div class="metrics-chart-head"><div><h3>Recorded cycle outcomes</h3><p class="muted">Outcome counts; attempted cycles are shown in the summary tiles.</p></div><span class="metrics-chart-key">${attempted.toLocaleString()} attempted</span></div><div class="metrics-bars" role="img" aria-label="Recorded worker cycle outcomes bar chart">${workerChart}</div></article><article class="metrics-chart"><div class="metrics-chart-head"><div><h3>Cycle status mix</h3><p class="muted">How attempted cycles currently divide between completed and errored work.</p></div><span class="metrics-chart-key">${percent(completed)} complete</span></div><div class="metrics-stacked" role="img" aria-label="Worker cycle status stacked bar">${outcomeMix}</div><div class="metrics-legend">${outcomeLegend}</div></article><article class="metrics-chart"><div class="metrics-chart-head"><div><h3>Executor usage</h3><p class="muted">Attempted cycles attributed to the executor that ultimately handled them.</p></div><span class="metrics-chart-key">${executorTracked.toLocaleString()} tracked</span></div><div class="metrics-stacked" role="img" aria-label="Worker executor usage stacked bar">${executorMix}</div><div class="metrics-legend">${executorLegend}</div></article><article class="metrics-chart metrics-project-chart"><div class="metrics-chart-head"><div><h3>Published changes by project</h3><p class="muted">Active categories only; empty categories are summarized below.</p></div><span class="metrics-chart-key">${publishedCommits.toLocaleString()} commits · ${projectBars.length} active</span></div><div class="metrics-bars" role="img" aria-label="Published changes by project bar chart">${projectChart}</div></article></div>`;
}
function messageTopics(message) {
  const text = String(message.text || '');
  const tags = [];
  const add = (label) => { if (!tags.includes(label)) tags.push(label); };
  const lane = String(message.lane || '').toLowerCase();
  if (lane === 'caracal') add('CaracAL+');
  if (lane === 'scripts') add('Scripts');
  if (/caracal\+|\[caracal lane\]/i.test(text)) add('CaracAL+');
  if (/dashboard|worker-metrics/i.test(text)) add('Dashboard');
  if (/ingame_scripts_wip|ideas\/|\[scripts lane\]|in-game script/i.test(text)) add('Scripts');
  if (/rpi5|linux test|test gate|test stage/i.test(text)) add('Testing');
  if (/vps|github|deploy|deployment/i.test(text)) add('Deployment');
  if (/ollama|autonomous planner|planner/i.test(text)) add('Planner');
  if (!tags.length) add('Worker');
  return tags.map((tag) => `<span class="chat-topic-tag topic-${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${esc(tag)}</span>`).join('');
}
function messageExecutor(message) {
  const explicit = String(message.executor || '').toLowerCase();
  if (/chatgpt|codex/.test(explicit)) return 'ChatGPT Codex';
  if (/ollama|aider/.test(explicit)) return 'Ollama';
  const text = String(message.text || '');
  return /codex executor|chatgpt codex|codex review/i.test(text) ? 'ChatGPT Codex' : 'Ollama';
}
function renderChat(messages) {
  const container = $('chat-messages');
  if (!messages.length) {
    container.innerHTML = '<p class="muted chat-empty">No worker messages yet.</p>';
    return 0;
  }
  const groups = [];
  for (const message of messages) {
    const role = message.role === 'assistant' ? 'worker' : 'you';
    const signature = role === 'worker'
      ? JSON.stringify([message.status || '', messageExecutor(message), message.lane || '', message.text || ''])
      : '';
    const previous = groups[groups.length - 1];
    if (role === 'worker' && previous?.role === 'worker' && previous.signature === signature) {
      previous.count += 1;
      previous.lastAt = message.createdAtUtc;
      continue;
    }
    groups.push({ message, role, signature, count: 1, firstAt: message.createdAtUtc, lastAt: message.createdAtUtc });
  }
  container.innerHTML = groups.map((group) => {
    const { message, role } = group;
    const label = role === 'worker' ? 'Local worker' : 'You';
    const status = message.status ? `<span class="chat-status-tag">${esc(message.status)}</span>` : '';
    const repeated = group.count > 1 ? `<span class="chat-status-tag">${group.count.toLocaleString()} identical updates</span>` : '';
    const executor = role === 'worker' ? messageExecutor(message) : '';
    const executorTag = executor ? `<span class="chat-executor-tag executor-${executor === 'ChatGPT Codex' ? 'chatgpt-codex' : 'ollama'}">${esc(executor)}</span>` : '';
    const topics = messageTopics(message);
    const timestamp = group.count > 1
      ? `${time(group.firstAt)} – ${time(group.lastAt)}`
      : time(group.lastAt);
    const repeatNote = group.count > 1
      ? `<p class="muted chat-repeat-note">Collapsed ${group.count.toLocaleString()} consecutive identical worker updates; individual records remain in history.</p>`
      : '';
    return `<article class="chat-message ${role}" title="${esc(timestamp)}"><div class="chat-message-head"><strong>${label}</strong><span class="chat-message-tags">${status}${repeated}${executorTag}${topics}</span><time>${esc(timestamp)}</time></div><p>${esc(message.text)}</p>${repeatNote}</article>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
  return groups.length;
}
async function refreshChat() {
  try {
    const response = await fetch('./chat', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data.ok !== true) throw new Error(data.error || 'Chat unavailable');
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const displayed = renderChat(messages);
    $('chat-status').textContent = displayed < messages.length ? `${messages.length} messages · ${displayed} displayed groups` : `${messages.length} messages`;
  } catch (error) {
    $('chat-status').textContent = 'Sign-in required';
    $('chat-messages').innerHTML = `<p class="muted chat-empty">${esc(error.message)}</p>`;
  }
}
async function submitChat(event) {
  event.preventDefault();
  const input = $('chat-input');
  const send = $('chat-send');
  const text = input.value.trim();
  if (!text) return;
  send.disabled = true;
  try {
    const response = await fetch('./chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
    const data = await response.json();
    if (!response.ok || data.ok !== true) throw new Error(data.error || 'Instruction could not be queued');
    input.value = '';
    await refreshChat();
  } catch (error) {
    $('chat-status').textContent = error.message;
  } finally { send.disabled = false; }
}
let refreshInFlight = false;
let refreshChatInFlight = false;
async function refresh() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  $('refresh').disabled = true;
  try {
    const statusResponse = await fetch('./status', { cache: 'no-store' });
    const status = await statusResponse.json();
    if (!statusResponse.ok) throw new Error(status.error || 'Server status unavailable');
    renderStatus(status);
    renderCommits({ commits: status.commits, git: status.git });
    try {
      const activityResponse = await fetch('./activity', { cache: 'no-store' });
      if (activityResponse.ok) {
        const activity = await activityResponse.json();
        const activityCommits = Array.isArray(activity.commits) && activity.commits.length
          ? activity.commits
          : activity.git?.commits;
        if (Array.isArray(activityCommits) && activityCommits.length) renderCommits(activity);
        if (Array.isArray(activity.projectChangeLogs) && activity.projectChangeLogs.length) {
          renderProjectChangeLogs(activity);
          renderProjectMetrics(activity);
        }
      }
    } catch (_) { /* The status snapshot remains visible. */ }
  } catch (error) {
    $('last-updated').textContent = `Dashboard error: ${error.message}`;
    $('health-cards').innerHTML = card('CaracAL+ server', false, error.message);
    renderCommits({});
  } finally {
    refreshInFlight = false;
    $('refresh').disabled = false;
  }
}
async function refreshChat() {
  if (refreshChatInFlight) return;
  refreshChatInFlight = true;
  try {
    const response = await fetch('./chat', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data.ok !== true) throw new Error(data.error || 'Chat unavailable');
    renderChat(Array.isArray(data.messages) ? data.messages : []);
    $('chat-status').textContent = `${Array.isArray(data.messages) ? data.messages.length : 0} messages`;
  } catch (error) {
    $('chat-status').textContent = 'Sign-in required';
    $('chat-messages').innerHTML = `<p class="muted chat-empty">${esc(error.message)}</p>`;
  } finally {
    refreshChatInFlight = false;
  }
}
$('refresh').addEventListener('click', refresh);
$('chat-form').addEventListener('submit', submitChat);
$('project-change-logs').addEventListener('click', (event) => {
  const entry = event.target.closest('[data-project-change-id]');
  if (entry) openProjectChangeDetails(entry.dataset.projectChangeId);
});
$('project-change-modal-close').addEventListener('click', () => $('project-change-modal').close?.());
$('project-change-modal').addEventListener('click', (event) => {
  if (event.target === $('project-change-modal')) $('project-change-modal').close?.();
});
refresh();
refreshChat();
setInterval(refresh, 5000);
setInterval(refreshChat, 10000);
