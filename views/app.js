import { html, raw, icon, avatar, number, timeAgo, dateLong, esc } from './ui.js';
import { appPage } from './layout.js';
import { TOOLS } from '../lib/tools.js';

function shell(opts, body) {
  return appPage({ ...opts, body: body ?? opts.body });
}

export function dashboard({ user, csrf, stats, series, automations, runs, blog, threads, unread, flash }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  const total = series.reduce((n, d) => n + d.count, 0);
  return shell({ user, csrf, unread, flash, active: '/app', pageTitle: 'Overview', pageSub: `Good to see you, ${user.name.split(' ')[0]}.`, title: 'Overview · LionPost',
    actions: html`<a class="btn sm" href="/app/studio">${icon('pen', 15)} New content</a>`,
    body: html`
<div class="grid g4" style="margin-bottom:18px">
  <div class="stat"><p>Posts shipped</p><b>${number(stats.sent)}</b><span class="up">${stats.failed} failed · retried</span></div>
  <div class="stat"><p>Articles</p><b>${number(stats.articles)}</b><span>drafts and exports</span></div>
  <div class="stat"><p>Videos made</p><b>${number(stats.videos)}</b><span>rendered on device</span></div>
  <div class="stat"><p>Live connections</p><b>${stats.connections}</b><span>${stats.automations} active automations</span></div>
</div>

<div class="grid g-2-1" style="margin-bottom:18px">
  <div class="card">
    <div class="card-title"><h3>Last 14 days</h3><span class="chip gold">${icon('chart', 12)} ${total} pieces</span></div>
    ${series.length ? html`<svg class="chart" viewBox="0 0 560 150" preserveAspectRatio="none" role="img" aria-label="Activity for the last 14 days">
      ${[0.25, 0.5, 0.75].map((y) => html`<line class="grid-line" x1="0" x2="560" y1="${150 * y}" y2="${150 * y}"></line>`)}
      ${series.map((d, i) => {
        const h = Math.max(3, (d.count / max) * 128);
        return raw(`<rect class="bar" x="${i * 40 + 6}" y="${138 - h}" width="26" height="${h}" rx="5"><title>${d.date}: ${d.count}</title></rect>`);
      })}
    </svg>
    <div class="chart-labels"><span>${series[0].date.slice(5)}</span><span>${series[7].date.slice(5)}</span><span>${series[13].date.slice(5)}</span></div>` : html`<p class="muted">No activity yet.</p>`}
  </div>
  <div class="card">
    <div class="card-title"><h3>Queue</h3><a class="small dim" href="/app/automations">Manage</a></div>
    ${automations.length ? html`<div class="list">
      ${automations.map((a) => html`<div class="list-row">
        <span class="status-dot ${a.status === 'active' ? '' : a.status === 'needs_attention' ? 'warn' : 'off'}"></span>
        <div class="grow"><h4>${a.name}</h4><p>${a.status === 'active' ? `next ${timeAgo(a.next_run_at).replace(' ago', '')}` : a.status}</p></div>
        <span class="chip">${a.interval_minutes >= 1440 ? `${Math.round(a.interval_minutes / 1440)}d` : `${Math.round(a.interval_minutes / 60)}h`}</span>
      </div>`)}
    </div>` : html`<p class="muted small">No automations yet.</p><a class="btn sm ghost" href="/app/automations/new">Create one</a>`}
    <div class="hr"></div>
    <a class="btn ghost sm block" href="/app/connections">${icon('link', 14)} Connections</a>
  </div>
</div>

<div class="grid g-2-1">
  <div class="card">
    <div class="card-title"><h3>Recent runs</h3><a class="small dim" href="/app/automations">All runs</a></div>
    ${runs.length ? html`<div class="table-scroll"><table class="data">
      <thead><tr><th>Run</th><th>Status</th><th>When</th><th>Output</th></tr></thead>
      <tbody>${runs.map((r) => {
        const out = (() => { try { return JSON.parse(r.output || '{}'); } catch { return {}; } })();
        return html`<tr>
          <td class="mono dim">#${r.id}</td>
          <td><span class="run-status ${r.status}">${r.status}</span></td>
          <td class="dim">${timeAgo(r.started_at)}</td>
          <td style="max-width:320px"><span class="dim" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${out.preview || out.error || r.error || '—'}</span></td>
        </tr>`;
      })}</tbody></table></div>` : html`<div class="empty"><h3>No runs yet</h3><p>Generate something in the studio, or start an automation.</p><a class="btn sm" href="/app/studio">Open the studio</a></div>`}
  </div>
  <div class="stack">
    <div class="card">
      <div class="card-title"><h3>Free tools</h3></div>
      <div class="stack" style="gap:6px">
        ${TOOLS.filter((t) => ['keyword-research', 'aeo-checker', 'instagram-carousel', 'ai-video-maker'].includes(t.slug)).map((t) => html`<a class="list-row" href="${t.appPath}" style="border:0;padding:7px 0">
          <span class="tic" style="color:var(--gold-2)">${icon(t.icon, 17)}</span><div class="grow"><h4>${t.name}</h4><p>${t.tagline}</p></div>${icon('arrow', 14)}
        </a>`)}
      </div>
    </div>
    <div class="card" style="background:linear-gradient(180deg,rgba(245,185,66,.09),rgba(255,255,255,.01))">
      <div class="card-title"><h3>The Lounge</h3><span class="chip">${number(threads.length)} new</span></div>
      ${threads.slice(0, 3).map((t) => html`<a href="/community/${t.slug}" class="small" style="display:block;padding:6px 0;color:var(--muted)">${t.title}</a>`)}
      <a class="btn ghost sm block" href="/community" style="margin-top:10px">Open the community</a>
    </div>
  </div>
</div>

<h2 style="font-size:17px;margin:26px 0 12px">Pick up where you left off</h2>
<div class="grid g4">
  ${TOOLS.slice(0, 4).map((t) => html`<a class="tool-tile" href="${t.appPath}"><span class="tic">${icon(t.icon, 17)}</span><h4>${t.name}</h4><p>${t.tagline}</p></a>`)}
</div>`,
  });
}

export function studioPage({ user, csrf, result, history, unread, flash, prefill = {} }) {
  return shell({ user, csrf, unread, flash, active: '/app/studio', pageTitle: 'Studio', pageSub: 'One idea, every shape it needs to take.', title: 'Studio · LionPost',
    scripts: ['/assets/js/studio.js'],
    body: html`
<div class="studio">
  <form class="panel" data-studio-form method="post" action="/app/studio">
    ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
    <div class="panel-head"><h3>Generate</h3><span class="chip">offline engine</span></div>
    <div class="panel-body form">
      <label class="field"><span class="field-label">Format</span>
        <select name="kind">
          ${[['caption', 'Social caption'], ['thread', 'X thread'], ['article', 'Long article'], ['carousel', 'Carousel'], ['pin', 'Pinterest pin'], ['video', 'Video script'], ['ideas', 'Idea list']].map(([v, l]) => html`<option value="${v}" ${prefill.kind === v ? raw('selected') : ''}>${l}</option>`)}
        </select>
      </label>
      <label class="field"><span class="field-label">Topic</span>
        <input name="topic" required maxlength="120" value="${prefill.topic || ''}" placeholder="e.g. keeping a content queue alive on a bad week">
        <span class="field-hint">A specific problem gets a better draft than a broad theme.</span>
      </label>
      <div class="form-grid">
        <label class="field"><span class="field-label">Tone</span>
          <select name="tone">${['practical', 'friendly', 'bold', 'direct'].map((t) => html`<option value="${t}" ${prefill.tone === t ? raw('selected') : ''}>${t}</option>`)}</select>
        </label>
        <label class="field"><span class="field-label">Platform</span>
          <select name="platform">${['instagram', 'x', 'facebook', 'telegram', 'pinterest', 'tiktok', 'youtube', 'blog'].map((p) => html`<option value="${p}" ${prefill.platform === p ? raw('selected') : ''}>${p}</option>`)}</select>
        </label>
      </div>
      <label class="field"><span class="field-label">Language</span>
        <select name="language">${['English', 'Spanish', 'Hindi', 'Urdu', 'Bengali', 'French', 'Portuguese', 'German'].map((l) => html`<option>${l}</option>`)}</select>
        <span class="field-hint">The local engine writes English. Other languages need a Gemini key in settings.</span>
      </label>
      <button class="btn block" type="submit">${icon('spark', 16)} Generate ${''}<span class="dim" style="font-weight:400;font-size:12px">⌘↵</span></button>
      <p class="dim" style="font-size:11.5px;line-height:1.5">Deterministic engine: the same topic and tone produce the same draft. Nothing leaves the server.</p>
    </div>
  </form>

  <div class="panel output" data-studio-output>
    <div class="panel-head">
      <h3>Output</h3>
      <div class="row" style="gap:6px">
        <button class="btn ghost sm" type="button" data-copy>${icon('copy', 14)} Copy</button>
        <button class="btn ghost sm" type="button" data-download>${icon('download', 14)} .md</button>
      </div>
    </div>
    <div class="output-body" data-output-body>
      ${result ? renderResult(result) : html`<div class="empty" style="border:0"><h3>Nothing generated yet</h3><p>Pick a format and a topic. The draft lands here with copy and download actions.</p><div class="row" style="justify-content:center">${['caption', 'thread', 'article', 'carousel'].map((k) => html`<span class="chip">${k}</span>`)}</div></div>`}
    </div>
    <div class="output-actions">
      <a class="btn ghost sm" href="/app/automations/new">${icon('bolt', 14)} Turn into an automation</a>
      <button class="btn ghost sm" type="button" data-save-draft>${icon('folder', 14)} Save draft</button>
      <span class="dim small" style="margin-left:auto" data-gen-meta>${result ? `${result.kind} · ${result.tone || ''}` : ''}</span>
    </div>
  </div>
</div>

${history.length ? html`<h2 style="font-size:16px;margin:26px 0 10px">Recent drafts</h2>
<div class="card"><div class="table-scroll"><table class="data">
  <thead><tr><th>Title</th><th>Status</th><th>Created</th><th></th></tr></thead>
  <tbody>${history.map((a) => html`<tr><td>${a.title}</td><td><span class="chip">${a.status}</span></td><td class="dim">${timeAgo(a.created_at)}</td><td><a class="small" style="color:var(--gold-2)" href="/app/articles/${a.id}">Open</a></td></tr>`)}</tbody>
</table></div></div>` : ''}`,
  });
}

function renderResult(r) {
  const text = r.text || r.markdown || r.caption || (r.ideas ? r.ideas.map((i, n) => `${n + 1}. ${i}`).join('\n') : '');
  return html`
    <div class="gen-meta">
      <span class="chip gold">${r.kind}</span>
      ${r.title ? html`<span class="chip">${r.title}</span>` : ''}
      ${r.wordCount ? html`<span class="chip">${r.wordCount} words</span>` : ''}
      ${r.hashtags ? r.hashtags.slice(0, 3).map((h) => html`<span class="chip sky">${h}</span>`) : ''}
    </div>
    <pre data-output-text>${text}</pre>
    ${r.hashtags && r.hashtags.length ? html`<div class="hr"></div><p class="small dim" style="margin-bottom:6px">Hashtags</p><p class="small" style="color:var(--gold-2)">${r.hashtags.join(' ')}</p>` : ''}
    ${r.image ? html`<div class="hr"></div>
      <p class="small dim" style="margin-bottom:8px">Image brief</p>
      <div class="row"><span class="chip">${r.image.motif}</span><span class="chip">${r.image.kicker}</span><span class="chip">${r.image.headline}</span></div>
      <a class="btn ghost sm" href="/app/carousel" style="margin-top:10px">${icon('image', 14)} Design it in the carousel maker</a>` : ''}
    ${r.slides ? html`<div class="hr"></div><p class="small dim">Slides</p>${r.slides.map((s, i) => html`<p class="small" style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${i + 1}. ${s.title}</b> <span class="dim">${s.body}</span></p>`)}` : ''}`;
}

export function automationsPage({ user, csrf, automations, runs, connections, unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/automations', pageTitle: 'Automations', pageSub: 'The queue writes, delivers and logs every attempt.', title: 'Automations · LionPost',
    actions: html`<a class="btn sm" href="/app/automations/new">${icon('plus', 15)} New automation</a>`,
    body: html`
${automations.length ? html`<div class="grid g2" style="margin-bottom:22px">
  ${automations.map((a) => html`<div class="auto-card">
    <div class="auto-head">
      <span class="status-dot ${a.status === 'active' ? '' : a.status === 'needs_attention' ? 'warn' : 'off'}" style="margin-top:6px"></span>
      <div class="grow">
        <h4>${a.name}</h4>
        <p>${a.kind} · ${a.tone} · ${a.interval_minutes >= 1440 ? `${Math.round(a.interval_minutes / 1440)} day` : `${Math.round(a.interval_minutes / 60)} hour`} cadence · ${a.platform || 'no connection'}</p>
      </div>
      <span class="chip ${a.status === 'active' ? 'mint' : a.status === 'needs_attention' ? 'rose' : ''}">${a.status.replace('_', ' ')}</span>
    </div>
    <p class="small dim" style="border-left:2px solid var(--line-2);padding-left:10px">“${a.topic}”</p>
    <div class="auto-stats">
      <span><b>${a.sent}</b> sent</span><span><b>${a.failed}</b> failed</span>
      <span>last ${a.last_run_at ? timeAgo(a.last_run_at) : 'never'}</span>
      <span>${a.status === 'active' ? `next ${timeAgo(a.next_run_at).replace(' ago', '')}` : 'paused'}</span>
      <span class="chip ${a.publish_mode === 'live' ? 'mint' : ''}">${a.publish_mode === 'live' ? 'live' : 'dry run'}</span>
    </div>
    <div class="auto-actions">
      <form method="post" action="/app/automations/${a.id}/run">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn sm">${icon('play', 13)} Run now</button></form>
      <form method="post" action="/app/automations/${a.id}/toggle">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn ghost sm">${icon(a.status === 'active' ? 'pause' : 'play', 13)} ${a.status === 'active' ? 'Pause' : 'Resume'}</button></form>
      <a class="btn ghost sm" href="/app/automations/${a.id}">Details</a>
      <form method="post" action="/app/automations/${a.id}/delete" onsubmit="return confirm('Delete this automation and its run history?')">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn danger sm">${icon('trash', 13)}</button></form>
    </div>
  </div>`)}
</div>` : html`<div class="empty" style="margin-bottom:22px"><h3>No automations yet</h3><p>Pick a topic and a cadence. Dry run is the default, so nothing leaves the server until you say so.</p><a class="btn sm" href="/app/automations/new">Create your first automation</a></div>`}

<div class="card">
  <div class="card-title"><h3>Run log</h3><span class="chip">${runs.length} latest</span></div>
  ${runs.length ? html`<div class="table-scroll"><table class="data">
    <thead><tr><th>#</th><th>Automation</th><th>Status</th><th>Trigger</th><th>When</th><th>Output</th></tr></thead>
    <tbody>${runs.map((r) => {
      const out = (() => { try { return JSON.parse(r.output || '{}'); } catch { return {}; } })();
      return html`<tr>
        <td class="mono dim">${r.id}</td>
        <td>${r.automation || 'feed'}</td>
        <td><span class="run-status ${r.status}">${r.status}</span></td>
        <td class="dim">${r.trigger}</td>
        <td class="dim">${timeAgo(r.started_at)}</td>
        <td style="max-width:360px">${r.error ? html`<span class="small" style="color:#fda4af">${r.error}</span>` : html`<span class="dim" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${out.preview || '—'}</span>`}</td>
      </tr>`;
    })}</tbody>
  </table></div>` : html`<p class="muted small">No runs yet. Use “Run now” on an automation.</p>`}
</div>`,
  });
}

export function automationNew({ user, csrf, connections, unread, flash, prefill = {} }) {
  const platforms = [...new Set(connections.map((c) => c.platform))];
  return shell({ user, csrf, unread, flash, active: '/app/automations', pageTitle: 'New automation', pageSub: 'Dry run by default. Nothing is published until you switch it to live.', title: 'New automation · LionPost',
    body: html`
<a class="small dim" href="/app/automations">← Automations</a>
<form method="post" action="/app/automations" class="card pad-lg" style="max-width:760px;margin-top:14px;display:grid;gap:16px">
  ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
  <div class="form-grid">
    <label class="field full"><span class="field-label">Name</span><input name="name" required maxlength="80" placeholder="Weekly build notes" value="${prefill.name || ''}"></label>
    <label class="field"><span class="field-label">Format</span>
      <select name="kind">${[['post', 'Social post'], ['article', 'Article'], ['carousel', 'Carousel'], ['pin', 'Pin'], ['video', 'Video script']].map(([v, l]) => html`<option value="${v}" ${prefill.kind === v ? raw('selected') : ''}>${l}</option>`)}</select>
    </label>
    <label class="field"><span class="field-label">Cadence</span>
      <select name="interval_minutes">${[['60', 'Every hour'], ['360', 'Every 6 hours'], ['720', 'Twice a day'], ['1440', 'Every day'], ['10080', 'Every week']].map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select>
    </label>
    <label class="field full"><span class="field-label">Topic</span><input name="topic" required maxlength="160" placeholder="what I shipped this week and what broke" value="${prefill.topic || ''}"><span class="field-hint">A narrow topic keeps the drafts from drifting.</span></label>
    <label class="field"><span class="field-label">Tone</span>
      <select name="tone">${['practical', 'friendly', 'bold', 'direct'].map((t) => html`<option>${t}</option>`)}</select>
    </label>
    <label class="field"><span class="field-label">Connected account</span>
      <select name="connection_id"><option value="">None (dry run only)</option>
        ${connections.map((c) => html`<option value="${c.id}" ${String(prefill.connection_id) === String(c.id) ? raw('selected') : ''}>${c.platform} · ${c.handle}</option>`)}
      </select>
    </label>
    <label class="field"><span class="field-label">Publish mode</span>
      <select name="publish_mode"><option value="dry_run">Dry run (safe)</option><option value="live">Live (deliver to the connection)</option></select>
      <span class="field-hint">${platforms.includes('webhook') ? 'Webhook and Telegram connections can deliver live.' : 'Connect a webhook or Telegram bot for live delivery.'}</span>
    </label>
    <label class="field"><span class="field-label">Language</span>
      <select name="language">${['English', 'Spanish', 'Hindi', 'Urdu', 'Bengali', 'French', 'Portuguese', 'German'].map((l) => html`<option>${l}</option>`)}</select>
    </label>
  </div>
  <label class="check"><input type="checkbox" name="include_image" value="1" checked><span>Include an image brief with every run</span></label>
  <div class="row"><button class="btn" type="submit">Create automation ${icon('arrow', 15)}</button><a class="btn ghost" href="/app/automations">Cancel</a></div>
</form>`,
  });
}

export function automationDetail({ user, csrf, automation, runs, unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/automations', pageTitle: automation.name, pageSub: `${automation.kind} · ${automation.tone} · ${automation.publish_mode}`, title: `${automation.name} · LionPost`,
    actions: html`<form method="post" action="/app/automations/${automation.id}/run">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn sm">${icon('play', 14)} Run now</button></form>`,
    body: html`
<a class="small dim" href="/app/automations">← All automations</a>
<div class="grid g-2-1" style="margin-top:14px">
  <div class="card">
    <div class="card-title"><h3>Runs</h3><span class="chip">${runs.length}</span></div>
    ${runs.length ? html`<div class="table-scroll"><table class="data">
      <thead><tr><th>#</th><th>Status</th><th>When</th><th>Output</th></tr></thead>
      <tbody>${runs.map((r) => {
        const out = (() => { try { return JSON.parse(r.output || '{}'); } catch { return {}; } })();
        return html`<tr>
          <td class="mono dim">${r.id}</td><td><span class="run-status ${r.status}">${r.status}</span></td>
          <td class="dim">${timeAgo(r.started_at)}</td>
          <td style="max-width:380px">${r.error ? html`<span class="small" style="color:#fda4af">${r.error}</span>` : html`<span class="dim">${out.preview || '—'}</span>`}</td>
        </tr>`;
      })}</tbody></table></div>` : html`<p class="muted small">No runs yet.</p>`}
  </div>
  <div class="card">
    <div class="card-title"><h3>Settings</h3></div>
    <dl class="kv">
      <dt>Topic</dt><dd>${automation.topic}</dd>
      <dt>Format</dt><dd>${automation.kind}</dd>
      <dt>Tone</dt><dd>${automation.tone}</dd>
      <dt>Cadence</dt><dd>${automation.interval_minutes} minutes</dd>
      <dt>Mode</dt><dd>${automation.publish_mode === 'live' ? 'Live delivery' : 'Dry run'}</dd>
      <dt>Status</dt><dd>${automation.status}</dd>
      <dt>Sent</dt><dd>${automation.sent}</dd>
      <dt>Failed</dt><dd>${automation.failed}</dd>
      <dt>Last run</dt><dd>${automation.last_run_at ? dateLong(automation.last_run_at) : 'never'}</dd>
    </dl>
    <div class="hr"></div>
    <div class="stack" style="gap:8px">
      <form method="post" action="/app/automations/${automation.id}/toggle">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn ghost sm block">${automation.status === 'active' ? 'Pause' : 'Resume'} automation</button></form>
      <form method="post" action="/app/automations/${automation.id}/delete" onsubmit="return confirm('Delete this automation?')">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn danger sm block">Delete automation</button></form>
    </div>
  </div>
</div>`,
  });
}

const PLATFORM_META = {
  instagram: { label: 'Instagram', color: '#FCA5A5', hint: 'Posts, carousels and reels', needs: 'Access token from your Meta app' },
  facebook: { label: 'Facebook Page', color: '#93C5FD', hint: 'Page posts', needs: 'Page access token' },
  x: { label: 'X', color: '#E5E7EB', hint: 'Posts and threads', needs: 'API key and secret from your X app' },
  telegram: { label: 'Telegram', color: '#67E8F9', hint: 'Channel posts through a bot', needs: 'Bot token from @BotFather' },
  pinterest: { label: 'Pinterest', color: '#FCA5A5', hint: 'Pins and boards', needs: 'Access token from your Pinterest app' },
  tiktok: { label: 'TikTok', color: '#E5E7EB', hint: 'Vertical video', needs: 'Access token from your TikTok app' },
  youtube: { label: 'YouTube', color: '#FCA5A5', hint: 'Shorts and videos', needs: 'OAuth refresh token' },
  dailymotion: { label: 'Dailymotion', color: '#93C5FD', hint: 'Video uploads', needs: 'API key from your Dailymotion app' },
  webhook: { label: 'Webhook', color: '#6EE7B7', hint: 'Send every post to your own URL', needs: 'Any HTTPS endpoint' },
};

export function connectionsPage({ user, csrf, connections, unread, flash }) {
  const byPlatform = Object.fromEntries(connections.map((c) => [c.platform, c]));
  return shell({ user, csrf, unread, flash, active: '/app/connections', pageTitle: 'Connections', pageSub: 'Connect once. Tokens are encrypted with AES-256-GCM.', title: 'Connections · LionPost',
    body: html`
<div class="notice" style="margin-bottom:18px">${icon('shield', 15)} Tokens are encrypted before they are stored and decrypted only for a send. A webhook is the fastest way to prove a live delivery end to end.</div>
<div class="grid g2">
  ${Object.entries(PLATFORM_META).map(([slug, meta]) => {
    const c = byPlatform[slug];
    return html`<div class="conn-card">
      <span class="conn-logo" style="background:${meta.color}">${meta.label.slice(0, 2).toUpperCase()}</span>
      <div class="grow">
        <h4>${meta.label}</h4>
        <p>${c ? `${c.handle} · ${c.status.replace('_', ' ')}` : meta.hint}</p>
        ${c?.last_error ? html`<p style="color:#fda4af">${c.last_error}</p>` : ''}
      </div>
      <div class="actions">
        ${c ? html`
          <form method="post" action="/app/connections/${c.id}/test">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn ghost sm" title="Send a test">Test</button></form>
          <form method="post" action="/app/connections/${c.id}/delete" onsubmit="return confirm('Disconnect ${meta.label}?')">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn danger sm">${icon('trash', 13)}</button></form>`
          : html`<a class="btn sm" href="/app/connections/new?platform=${slug}">Connect</a>`}
      </div>
    </div>`;
  })}
</div>
<h2 style="font-size:16px;margin:26px 0 10px">How live delivery works</h2>
<div class="card">
  <div class="table-scroll"><table class="data">
    <thead><tr><th>Platform</th><th>Dry run</th><th>Live delivery</th><th>What you need</th></tr></thead>
    <tbody>
      <tr><td>Webhook</td><td>Logged</td><td class="mint">Yes, real HTTP POST</td><td>Any HTTPS endpoint</td></tr>
      <tr><td>Telegram</td><td>Logged</td><td class="mint">Yes, Bot API</td><td>Bot token + channel admin</td></tr>
      <tr><td>Everything else</td><td>Logged</td><td class="dim">Needs OAuth app credentials</td><td>Your own developer app</td></tr>
    </tbody>
  </table></div>
</div>`,
  });
}

export function connectionNew({ user, csrf, platform, unread, flash }) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.webhook;
  return shell({ user, csrf, unread, flash, active: '/app/connections', pageTitle: `Connect ${meta.label}`, pageSub: meta.hint, title: `Connect ${meta.label} · LionPost`,
    body: html`
<a class="small dim" href="/app/connections">← Connections</a>
<form method="post" action="/app/connections" class="card pad-lg" style="max-width:620px;margin-top:14px;display:grid;gap:16px">
  ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="platform" value="${esc(platform)}">`)}
  <div class="row"><span class="conn-logo" style="background:${meta.color}">${meta.label.slice(0, 2).toUpperCase()}</span><div><h3 style="font-size:17px">${meta.label}</h3><p class="small dim">${meta.needs}</p></div></div>
  <label class="field"><span class="field-label">${platform === 'webhook' ? 'Endpoint URL' : 'Account handle or channel'}</span>
    <input name="handle" required placeholder="${platform === 'webhook' ? 'https://example.com/hooks/lionpost' : platform === 'telegram' ? '@yourchannel' : '@yourhandle'}">
  </label>
  <label class="field"><span class="field-label">${platform === 'webhook' ? 'Signing secret (optional)' : 'Token or key'}</span>
    <input name="secret" type="password" placeholder="${platform === 'telegram' ? '123456:ABC-DEF...' : 'Paste the token your developer app gave you'}" autocomplete="off">
    <span class="field-hint">Encrypted immediately. It is never rendered back to the page.</span>
  </label>
  <label class="check"><input type="checkbox" name="skip_test" value="1"><span>Save without testing. You can test it from the connections page.</span></label>
  <div class="row"><button class="btn" type="submit">Save connection</button><a class="btn ghost" href="/app/connections">Cancel</a></div>
</form>`,
  });
}

export function feedsPage({ user, csrf, feeds, items, connections = [], unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/feeds', pageTitle: 'Website to social', pageSub: 'Every new item in your feed becomes a captioned post.', title: 'Website to social · LionPost',
    body: html`
<div class="grid g-1-2">
  <form class="card" method="post" action="/app/feeds" style="display:grid;gap:14px;align-content:start">
    ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
    <h3 style="font-size:15px">Add a feed</h3>
    <label class="field"><span class="field-label">RSS, Atom or sitemap URL</span><input name="url" required placeholder="https://yourblog.com/feed.xml"></label>
    <label class="field"><span class="field-label">Deliver to</span>
      <select name="connection_id"><option value="">Log only (dry run)</option>
        ${connections.map((c) => html`<option value="${c.id}">${c.platform} · ${c.handle}</option>`)}
      </select>
    </label>
    <label class="check"><input type="checkbox" name="auto_caption" value="1" checked><span>Rewrite the title into a caption</span></label>
    <button class="btn" type="submit">Add feed</button>
    <p class="dim small">Checked hourly. Existing items are skipped by GUID, so nothing posts twice.</p>
  </form>
  <div class="stack">
    ${feeds.length ? feeds.map((f) => html`<div class="card">
      <div class="card-title"><h3>${f.title || f.url}</h3><span class="chip ${f.active ? 'mint' : ''}">${f.active ? 'active' : 'paused'}</span></div>
      <p class="small dim" style="word-break:break-all">${f.url}</p>
      <div class="row" style="margin-top:10px;gap:12px">
        <span class="small dim">last check ${f.last_checked_at ? timeAgo(f.last_checked_at) : 'never'}</span>
        <span class="small dim">${f.items} items</span>
        ${f.last_error ? html`<span class="small" style="color:#fda4af">${f.last_error}</span>` : ''}
      </div>
      <div class="row" style="margin-top:12px">
        <form method="post" action="/app/feeds/${f.id}/check">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn ghost sm">${icon('refresh', 13)} Check now</button></form>
        <form method="post" action="/app/feeds/${f.id}/toggle">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn ghost sm">${f.active ? 'Pause' : 'Resume'}</button></form>
        <form method="post" action="/app/feeds/${f.id}/delete" onsubmit="return confirm('Remove this feed?')">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn danger sm">${icon('trash', 13)}</button></form>
      </div>
    </div>`) : html`<div class="empty"><h3>No feeds yet</h3><p>Add the feed from your blog. WordPress and Blogger both publish one.</p></div>`}
    ${items.length ? html`<div class="card"><div class="card-title"><h3>Latest items</h3></div>
      ${items.map((i) => html`<div class="list-row"><span class="status-dot"></span><div class="grow"><h4>${i.title}</h4><p>${i.feed_title || ''} · ${i.published_at ? dateLong(i.published_at) : 'no date'}</p></div><a class="small" style="color:var(--gold-2)" href="${i.link}" rel="nofollow noopener" target="_blank">Open</a></div>`)}
    </div>` : ''}
  </div>
</div>`,
  });
}

export function settingsPage({ user, csrf, unread, flash, geminiSet, sessions }) {
  return shell({ user, csrf, unread, flash, active: '/app/settings', pageTitle: 'Settings', pageSub: 'Profile, keys and the exit door.', title: 'Settings · LionPost',
    body: html`
<div class="grid g2">
  <form class="card" method="post" action="/app/settings/profile" style="display:grid;gap:14px">
    ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
    <div class="card-title"><h3>Profile</h3></div>
    <label class="field"><span class="field-label">Name</span><input name="name" value="${user.name}" required maxlength="60"></label>
    <label class="field"><span class="field-label">Handle</span><input name="handle" value="${user.handle}" required pattern="[a-z0-9_]{3,30}" maxlength="30"><span class="field-hint">Lowercase letters, numbers and underscores.</span></label>
    <label class="field"><span class="field-label">Bio</span><textarea name="bio" rows="3" maxlength="280">${user.bio || ''}</textarea></label>
    <label class="field"><span class="field-label">Website</span><input name="website" value="${user.website || ''}" placeholder="https://"></label>
    <button class="btn" type="submit">Save profile</button>
  </form>

  <div class="stack">
    <form class="card" method="post" action="/app/settings/password" style="display:grid;gap:14px">
      ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
      <div class="card-title"><h3>Password</h3><span class="chip">scrypt</span></div>
      <label class="field"><span class="field-label">Current password</span><input type="password" name="current" required autocomplete="current-password"></label>
      <label class="field"><span class="field-label">New password</span><input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
      <button class="btn ghost" type="submit">Change password</button>
    </form>

    <form class="card" method="post" action="/app/settings/gemini" style="display:grid;gap:14px">
      ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
      <div class="card-title"><h3>Gemini key (optional)</h3><span class="chip ${geminiSet ? 'mint' : ''}">${geminiSet ? 'stored' : 'not set'}</span></div>
      <p class="small dim">The built-in engine works without this. A key lets you upgrade drafts and translate other languages.</p>
      <label class="field"><span class="field-label">API key</span><input type="password" name="key" placeholder="${geminiSet ? '•••• stored, paste a new one to replace' : 'AIza...'}" autocomplete="off"></label>
      <div class="row"><button class="btn ghost" type="submit">Save key</button>${geminiSet ? html`<button class="btn danger sm" type="submit" name="remove" value="1">Remove</button>` : ''}</div>
    </form>
  </div>
</div>

<div class="card" style="margin-top:16px">
  <div class="card-title"><h3>Sessions</h3><span class="chip">${sessions.length} active</span></div>
  <div class="table-scroll"><table class="data">
    <thead><tr><th>Started</th><th>Expires</th><th>Device</th></tr></thead>
    <tbody>${sessions.map((s) => html`<tr><td class="dim">${dateLong(s.created_at)}</td><td class="dim">${dateLong(s.expires_at)}</td><td class="dim" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.user_agent || 'unknown'}</td></tr>`)}</tbody>
  </table></div>
</div>

<div class="card" style="margin-top:16px;border-color:rgba(251,113,133,.3)">
  <div class="card-title"><h3 style="color:#fda4af">Delete account</h3></div>
  <p class="small muted" style="margin-bottom:12px">Everything goes: posts, drafts, runs, connections and sessions. This cannot be undone.</p>
  <form method="post" action="/app/settings/delete" onsubmit="return confirm('Delete your account and everything in it?')">
    ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
    <button class="btn danger" type="submit">Delete my account</button>
  </form>
</div>`,
  });
}
