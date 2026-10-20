import { html, raw, icon, number, timeAgo, dateLong, esc } from './ui.js';
import { appPage } from './layout.js';

const shell = (opts, body) => appPage({ ...opts, body: body ?? opts.body });

function sparkline(trend) {
  const min = Math.min(...trend), max = Math.max(...trend);
  const pts = trend.map((v, i) => `${i * (54 / (trend.length - 1))},${18 - ((v - min) / Math.max(1, max - min)) * 16}`).join(' ');
  return raw(`<svg width="56" height="20" viewBox="0 0 56 20" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${trend[trend.length - 1] >= trend[0] ? '#4ade80' : '#fb7185'}" stroke-width="1.6"/></svg>`);
}

export function keywordsPage({ user, csrf, result, history, unread, flash, seed = '' }) {
  return shell({ user, csrf, unread, flash, active: '/app/keywords', pageTitle: 'Keyword research', pageSub: 'Estimates for comparing phrases, not a promise of traffic.', title: 'Keyword research · LionPost',
    scripts: ['/assets/js/tools-app.js'],
    body: html`
<form class="card" method="post" action="/app/keywords" data-kw-form style="display:grid;grid-template-columns:1fr 180px auto;gap:12px;align-items:end;margin-bottom:18px">
  ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
  <label class="field"><span class="field-label">Topic or seed keyword</span><input name="seed" value="${seed}" required maxlength="60" placeholder="e.g. content automation"></label>
  <label class="field"><span class="field-label">Market</span><select name="market">${['US', 'UK', 'CA', 'AU', 'IN', 'DE', 'FR', 'BR'].map((m) => html`<option>${m}</option>`)}</select></label>
  <button class="btn" type="submit">${icon('search', 15)} Research</button>
</form>

${result ? html`
<div class="grid g4" style="margin-bottom:16px">
  <div class="stat"><p>Total volume</p><b>${number(result.summary.totalVolume)}</b><span>across ${result.keywords.length} phrases</span></div>
  <div class="stat"><p>Avg difficulty</p><b>${result.summary.avgDifficulty}</b><span>0 easy · 100 brutal</span></div>
  <div class="stat"><p>Questions</p><b>${result.summary.questions}</b><span>people asking</span></div>
  <div class="stat"><p>Easy wins</p><b>${result.summary.easy}</b><span>difficulty under 25</span></div>
</div>
<div class="card" style="margin-bottom:18px">
  <div class="card-title">
    <h3>“${result.seed}” · ${result.market}</h3>
    <div class="row"><span class="chip">estimated</span><a class="btn ghost sm" href="/app/keywords/export?id=${result.id}">${icon('download', 13)} CSV</a></div>
  </div>
  <div class="table-scroll"><table class="result-table">
    <thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>Intent</th><th>CPC</th><th>Trend</th><th>Opportunity</th></tr></thead>
    <tbody>${result.keywords.map((k) => html`<tr>
      <td style="font-weight:550">${k.keyword}</td>
      <td>${number(k.volume)}</td>
      <td><div class="row" style="gap:8px"><span class="bar-meter" style="flex:1"><i style="width:${k.difficulty}%;background:${k.difficulty > 60 ? 'var(--rose)' : k.difficulty > 35 ? 'var(--gold)' : 'var(--mint)'}"></i></span><span class="mono">${k.difficulty}</span></div></td>
      <td><span class="chip ${k.intent === 'transactional' ? 'mint' : k.intent === 'commercial' ? 'sky' : ''}">${k.intent}</span></td>
      <td class="mono">$${k.cpc.toFixed(2)}</td>
      <td>${sparkline(k.trend)}</td>
      <td class="mono">${k.opportunity}</td>
    </tr>`)}</tbody>
  </table></div>
</div>` : html`<div class="empty" style="margin-bottom:18px"><h3>Start with one topic</h3><p>You get 22 phrase patterns, ranked by opportunity. Same input, same output: the engine is deterministic.</p><div class="row" style="justify-content:center">${['content automation', 'newsletter growth', 'vertical video'].map((s) => html`<a class="chip" href="/app/keywords?seed=${encodeURIComponent(s)}">${s}</a>`)}</div></div>`}

${history.length ? html`<div class="card"><div class="card-title"><h3>Saved research</h3></div>
  ${history.map((h) => html`<div class="list-row">
    <div class="grow"><h4>${h.seed}</h4><p>${h.market} · ${dateLong(h.created_at)} · ${h.count} keywords</p></div>
    <a class="btn ghost sm" href="/app/keywords?run=${h.id}">Open</a>
  </div>`)}
</div>` : ''}`,
  });
}

export function aeoPage({ user, csrf, report, history, unread, flash }) {
  const ring = report ? (report.score >= 80 ? 'var(--mint)' : report.score >= 55 ? 'var(--gold)' : 'var(--rose)') : 'var(--gold)';
  return shell({ user, csrf, unread, flash, active: '/app/aeo', pageTitle: 'AEO checker', pageSub: '18 checks an answer engine runs before it quotes you.', title: 'AEO checker · LionPost',
    body: html`
<form class="card" method="post" action="/app/aeo" style="display:grid;gap:12px;margin-bottom:18px">
  ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
  <div class="form-grid">
    <label class="field"><span class="field-label">Page URL</span><input name="url" placeholder="https://your-site.com/article" value="${report?.url || ''}"></label>
    <label class="field"><span class="field-label">…or paste the HTML</span><input name="pasted" placeholder="Paste HTML when a site blocks bots" value=""></label>
  </div>
  <div class="row"><button class="btn" type="submit">${icon('shield', 15)} Run the 18 checks</button><span class="dim small" data-aeo-note>No API key. Reads the page, robots.txt and llms.txt.</span></div>
</form>

${report ? html`
<div class="card" style="margin-bottom:18px">
  <div class="row" style="gap:22px;align-items:flex-start;flex-wrap:wrap">
    <div class="score-ring" style="--score:${report.score};--ring:${ring}"><span>${report.score}</span><small>/100</small></div>
    <div style="flex:1;min-width:260px">
      <h3 style="font-size:17px">${report.url || 'Pasted HTML'}</h3>
      <p class="small dim" style="margin-top:4px">${report.stats.wordCount} words · ${report.stats.headings} headings · ${report.stats.internal} internal links · ${report.stats.images} images</p>
      <div class="row" style="margin-top:10px">
        <span class="chip mint">${report.checks.filter((c) => c.status === 'pass').length} passed</span>
        <span class="chip">${report.checks.filter((c) => c.status === 'partial').length} partial</span>
        <span class="chip rose">${report.checks.filter((c) => c.status === 'fail').length} failed</span>
        ${report.stats.hasFaqSchema ? html`<span class="chip sky">FAQ schema</span>` : ''}
      </div>
    </div>
    <a class="btn ghost sm" href="/app/aeo">New check</a>
  </div>
</div>
<div class="grid g-2-1">
  <div class="card">
    <div class="card-title"><h3>Every check</h3><span class="chip">weighted</span></div>
    ${report.checks.map((c) => html`<div class="check-row">
      <span class="mark ${c.status === 'pass' ? 'ok' : c.status === 'partial' ? 'skip' : 'no'}">${c.status === 'pass' ? '✓' : c.status === 'partial' ? '~' : '✕'}</span>
      <div class="grow"><h5>${c.label}</h5><p>${c.detail}</p>${c.status !== 'pass' ? html`<p style="color:var(--gold-2);margin-top:3px">Fix: ${c.fix}</p>` : ''}</div>
      <span class="weight">${c.weight}pt</span>
    </div>`)}
  </div>
  <div class="stack">
    <div class="card">
      <div class="card-title"><h3>What to fix first</h3></div>
      ${report.checks.filter((c) => c.status === 'fail').sort((a, b) => b.weight - a.weight).slice(0, 4).map((c, i) => html`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><p class="small"><b>${i + 1}. ${c.label}</b></p><p class="small dim">${c.fix}</p></div>`)}
      ${report.checks.filter((c) => c.status === 'fail').length === 0 ? html`<p class="small muted">Nothing failed. Go write the next piece.</p>` : ''}
    </div>
    <div class="card">
      <div class="card-title"><h3>Parsed</h3></div>
      <dl class="kv">
        <dt>HTTP</dt><dd>${report.status}</dd>
        <dt>FAQ schema</dt><dd>${report.stats.hasFaqSchema ? 'yes' : 'no'}</dd>
        <dt>Schema types</dt><dd>${report.stats.types.length ? report.stats.types.join(', ') : 'none'}</dd>
        <dt>AI crawlers</dt><dd>${report.stats.blockedBots.length ? 'blocked: ' + report.stats.blockedBots.join(', ') : 'allowed'}</dd>
        <dt>llms.txt</dt><dd>${report.stats.llmsTxt ? 'found' : 'not found'}</dd>
      </dl>
    </div>
  </div>
</div>` : html`
<div class="empty">
  <h3>Run it on a page you own</h3>
  <p>Eighteen checks, weighted to 100. Start with the question headings and the FAQ schema: those two move the score the most.</p>
</div>`}

${history.length ? html`<div class="card" style="margin-top:16px"><div class="card-title"><h3>Recent checks</h3></div>
  ${history.map((h) => html`<div class="list-row"><div class="grow"><h4>${h.url}</h4><p>${dateLong(h.created_at)}</p></div><span class="chip ${h.score >= 80 ? 'mint' : h.score >= 55 ? 'gold' : 'rose'}">${h.score}/100</span><a class="btn ghost sm" href="/app/aeo?run=${h.id}">Open</a></div>`)}
</div>` : ''}`,
  });
}

export function videosPage({ user, csrf, video, videos, unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/videos', pageTitle: 'Video maker', pageSub: 'Rendered in your browser. No upload, no watermark.', title: 'Video maker · LionPost',
    scripts: ['/assets/js/video.js'],
    body: html`
<div class="canvas-wrap">
  <div class="stack">
    <form class="panel" method="post" action="/app/videos" style="display:grid;gap:14px">
      ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
      <div class="panel-head"><h3>Script</h3><span class="chip">9:16</span></div>
      <div class="panel-body form">
        <label class="field"><span class="field-label">Topic or idea</span><input name="topic" required maxlength="120" value="${video?.topic || ''}" placeholder="the boring half of content automation"></label>
        <div class="form-grid">
          <label class="field"><span class="field-label">Tone</span><select name="tone">${['practical', 'friendly', 'bold', 'direct'].map((t) => html`<option ${video?.tone === t ? raw('selected') : ''}>${t}</option>`)}</select></label>
          <label class="field"><span class="field-label">Palette</span><select name="palette"><option value="gold">Gold</option><option value="mint">Mint</option><option value="sky">Sky</option><option value="rose">Rose</option></select></label>
        </div>
        <button class="btn block">${icon('spark', 15)} Write the script</button>
        <p class="dim" style="font-size:11.5px">Seven scenes, about 35 seconds. Edit any line below.</p>
      </div>
    </form>
    ${video ? html`<div class="panel"><div class="panel-head"><h3>Scenes</h3><span class="chip">${video.scenes.length}</span></div>
      <div class="panel-body" style="display:grid;gap:10px" data-scene-editor>
        ${video.scenes.map((s, i) => html`<label class="field"><span class="field-label">Scene ${i + 1} · ${s.seconds}s</span>
          <input data-scene-text value="${s.text}" maxlength="120">
          <span class="field-hint">${s.sub}</span></label>`)}
      </div></div>` : ''}
    ${videos.length ? html`<div class="panel"><div class="panel-head"><h3>Saved scripts</h3></div><div class="panel-body">
      ${videos.map((v) => html`<a class="list-row" href="/app/videos?id=${v.id}"><div class="grow"><h4>${v.title}</h4><p>${dateLong(v.created_at)}</p></div>${icon('arrow', 14)}</a>`)}
    </div></div>` : ''}
  </div>

  <div class="stack">
    <div class="video-stage">
      <canvas data-video-canvas width="1080" height="1920" style="width:min(100%,360px)"></canvas>
    </div>
    <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn" data-video-play ${video ? '' : 'disabled'}>${icon('play', 15)} Play preview</button>
      <button class="btn ghost" data-video-record ${video ? '' : 'disabled'}>${icon('video', 15)} Render & download</button>
      <span class="dim small" data-video-status>${video ? 'Ready. Rendering captures the animation in real time.' : 'Write a script to unlock playback.'}</span>
      <span class="chip" style="margin-left:auto">WebM · on-device</span>
    </div>
    <div class="notice">${icon('shield', 14)} Frames never touch the server. The script is saved so you can reopen it; the video is recorded from this canvas with MediaRecorder.</div>
  </div>
</div>
${video ? raw(`<script type="application/json" data-video-data>${JSON.stringify({ scenes: video.scenes, palette: video.palette || 'gold', title: video.title }).replaceAll('</', '<\\/')}</script>`) : ''}`,
  });
}

export function carouselPage({ user, csrf, deck, decks, tab = 'carousel', unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/carousel', pageTitle: 'Carousel & pins', pageSub: 'Design on canvas, export a PNG per slide.', title: 'Carousel maker · LionPost',
    scripts: ['/assets/js/carousel.js'],
    body: html`
<div class="tabs-page">
  <a href="/app/carousel?tab=carousel" class="${tab !== 'pin' ? 'on' : ''}">Carousel</a>
  <a href="/app/carousel?tab=pin" class="${tab === 'pin' ? 'on' : ''}">Pin (2:3)</a>
  <a href="/app/carousel?tab=quote" class="${tab === 'quote' ? 'on' : ''}">Quote card</a>
</div>
<div class="canvas-wrap">
  <div class="stack">
    <form class="panel" method="post" action="/app/carousel" style="display:grid">
      ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="format" value="${tab}">`)}
      <div class="panel-head"><h3>Deck</h3><span class="chip">${tab}</span></div>
      <div class="panel-body form">
        <label class="field"><span class="field-label">Topic</span><input name="topic" required maxlength="120" value="${deck?.topic || ''}" placeholder="what actually keeps a queue alive"></label>
        <div class="form-grid">
          <label class="field"><span class="field-label">Palette</span><select name="palette">${['gold', 'mint', 'sky', 'rose', 'violet'].map((p) => html`<option ${deck?.palette === p ? raw('selected') : ''}>${p}</option>`)}</select></label>
          <label class="field"><span class="field-label">Handle</span><input name="handle" maxlength="30" value="${deck?.handle || '@' + user.handle}" placeholder="@yourhandle"></label>
        </div>
        <button class="btn block">${icon('image', 15)} Build the deck</button>
      </div>
    </form>
    ${deck ? html`<div class="panel"><div class="panel-head"><h3>Slides</h3><span class="chip">${deck.slides.length}</span></div>
      <div class="panel-body" style="display:grid;gap:10px">
        <div class="slide-strip">${deck.slides.map((s, i) => html`<button type="button" class="slide-thumb ${i === 0 ? 'on' : ''}" data-slide="${i}">${i + 1}. ${s.kicker || ''}</button>`)}</div>
        <label class="field"><span class="field-label">Headline</span><input data-edit-title value="${deck.slides[0].title}" maxlength="90"></label>
        <label class="field"><span class="field-label">Body</span><textarea data-edit-body rows="3" maxlength="220">${deck.slides[0].body}</textarea></label>
        <label class="field"><span class="field-label">Kicker</span><input data-edit-kicker value="${deck.slides[0].kicker || ''}" maxlength="18"></label>
      </div></div>` : ''}
  </div>
  <div class="stack">
    <div class="canvas-stage"><canvas data-deck-canvas width="1080" height="${tab === 'pin' ? 1500 : 1350}" style="width:min(100%,440px)"></canvas></div>
    <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn ghost sm" data-prev-slide>←</button>
      <span class="small dim" data-slide-label>Slide 1</span>
      <button class="btn ghost sm" data-next-slide>→</button>
      <button class="btn sm" data-download-slide style="margin-left:auto">${icon('download', 14)} Download PNG</button>
      <button class="btn ghost sm" data-download-all>All slides</button>
    </div>
    ${decks.length ? html`<div class="card"><div class="card-title"><h3>Saved decks</h3></div>
      ${decks.map((d) => html`<a class="list-row" href="/app/carousel?id=${d.id}&tab=${tab}"><div class="grow"><h4>${d.topic}</h4><p>${d.slides} slides · ${dateLong(d.created_at)}</p></div>${icon('arrow', 14)}</a>`)}
    </div>` : ''}
  </div>
</div>
${deck ? raw(`<script type="application/json" data-deck>${JSON.stringify({ ...deck, format: tab }).replaceAll('</', '<\\/')}</script>`) : ''}`,
  });
}

export function shortsPage({ user, csrf, unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/shorts', pageTitle: 'Shorts & captions', pageSub: 'Cut vertical clips and retime subtitles in the browser.', title: 'Shorts maker · LionPost',
    scripts: ['/assets/js/shorts.js'],
    body: html`
<div class="grid g-2-1">
  <div class="card">
    <div class="card-title"><h3>Short from a long video</h3><span class="chip">on-device</span></div>
    <label class="field" style="margin-bottom:12px"><span class="field-label">Video file</span><input type="file" accept="video/*" data-video-file></label>
    <video data-source-video controls playsinline style="width:100%;border-radius:12px;background:#05060a;max-height:300px"></video>
    <div class="form-grid" style="margin-top:14px">
      <label class="field"><span class="field-label">Start (seconds)</span><input type="number" data-start value="0" min="0" step="0.1"></label>
      <label class="field"><span class="field-label">End (seconds)</span><input type="number" data-end value="20" min="1" step="0.1"></label>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn" data-cut>${icon('video', 15)} Capture clip</button>
      <button class="btn ghost" data-download-clip disabled>${icon('download', 14)} Download</button>
      <span class="small dim" data-cut-status>Load a file, then capture the range.</span>
    </div>
    <div class="notice" style="margin-top:14px">${icon('shield', 14)} The file stays on your machine. Capture plays the range once and records a vertical canvas.</div>
  </div>
  <div class="stack">
    <div class="video-stage"><canvas data-short-canvas width="1080" height="1920" style="width:min(100%,260px)"></canvas></div>
  </div>
</div>

<div class="card" style="margin-top:18px">
  <div class="card-title"><h3>Subtitle translator</h3><span class="chip">SRT / VTT</span></div>
  <div class="grid g2">
    <div>
      <label class="field"><span class="field-label">Paste SRT or VTT</span><textarea data-srt rows="9" placeholder="1
00:00:01,000 --> 00:00:04,000
Your first line"></textarea></label>
      <div class="form-grid" style="margin-top:10px">
        <label class="field"><span class="field-label">Target language</span><select data-lang>${['Spanish', 'Hindi', 'Urdu', 'Bengali', 'French', 'Portuguese', 'German'].map((l) => html`<option>${l}</option>`)}</select></label>
        <label class="field"><span class="field-label">Shift (seconds)</span><input type="number" data-shift value="0" step="0.1"></label>
      </div>
      <div class="row" style="margin-top:10px"><button class="btn" data-translate>${icon('globe', 15)} Translate</button><button class="btn ghost" data-shift-apply>Apply shift</button><button class="btn ghost" data-download-srt>${icon('download', 14)} Export .srt</button></div>
    </div>
    <div>
      <label class="field"><span class="field-label">Output</span><textarea data-srt-out rows="14" placeholder="Translated subtitles land here" readonly></textarea></label>
      <p class="small dim" style="margin-top:8px" data-srt-status>Translation uses your Gemini key when one is set in settings. Without a key, timing tools still work and the output stays editable.</p>
    </div>
  </div>
</div>`,
  });
}

export function articlePage({ user, csrf, article, unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/studio', pageTitle: article.title, pageSub: `${article.status} · ${timeAgo(article.created_at)}`, title: `${article.title} · LionPost`,
    actions: html`<a class="btn ghost sm" href="/app/articles/${article.id}/export">${icon('download', 14)} HTML</a>`,
    body: html`
<a class="small dim" href="/app/studio">← Studio</a>
<div class="grid g-2-1" style="margin-top:14px">
  <div class="card"><div class="md">${raw(article.body_html)}</div></div>
  <div class="card"><div class="card-title"><h3>Meta</h3></div>
    <dl class="kv"><dt>Status</dt><dd>${article.status}</dd><dt>Words</dt><dd>${article.body_html.split(/\s+/).length}</dd><dt>Keywords</dt><dd>${article.keywords || '—'}</dd></dl>
    <p class="small dim" style="margin-top:12px">${article.meta_description}</p>
    <div class="hr"></div>
    <a class="btn ghost sm block" href="/app/articles/${article.id}/export">Download publishable HTML</a>
  </div>
</div>`,
  });
}

export function notificationsApp({ user, csrf, notifications, unread, flash }) {
  return shell({ user, csrf, unread, flash, active: '/app/notifications', pageTitle: 'Notifications', pageSub: 'Replies and likes on your threads.', title: 'Notifications · LionPost',
    body: html`
${notifications.length ? html`<div class="card" style="padding:6px 18px">
  ${notifications.map((n) => html`<div class="list-row">
    <div class="grow"><h4>${n.body}</h4><p>${timeAgo(n.created_at)}${n.read_at ? '' : ' · new'}</p></div>
    ${n.post_slug ? html`<a class="btn ghost sm" href="/community/${n.post_slug}">Open thread</a>` : ''}
  </div>`)}
</div>` : html`<div class="empty"><h3>Nothing yet</h3><p>Replies to your threads show up here.</p><a class="btn sm" href="/community">Go to the Lounge</a></div>`}`,
  });
}
