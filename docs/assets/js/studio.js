(() => {
  const form = document.querySelector('[data-studio-form]');
  if (!form) return;
  const out = document.querySelector('[data-output-body]');
  const meta = document.querySelector('[data-gen-meta]');
  const csrf = () => (document.cookie.match(/(?:^|;\s*)lion_csrf=([^;]+)/) || [])[1] || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let current = null;

  const textOf = (r) => r.text || r.markdown || r.caption || (r.ideas ? r.ideas.map((i, n) => `${n + 1}. ${i}`).join('\n') : '');

  function render(r) {
    current = r;
    const text = textOf(r);
    out.innerHTML = `
      <div class="gen-meta">
        <span class="chip gold">${esc(r.kind)}</span>
        ${r.title ? `<span class="chip">${esc(r.title)}</span>` : ''}
        ${r.wordCount ? `<span class="chip">${r.wordCount} words</span>` : ''}
        ${(r.hashtags || []).slice(0, 3).map((h) => `<span class="chip sky">${esc(h)}</span>`).join('')}
      </div>
      <pre data-output-text>${esc(text)}</pre>
      ${r.hashtags?.length ? `<div class="hr"></div><p class="small dim" style="margin-bottom:6px">Hashtags</p><p class="small" style="color:var(--gold-2)">${esc(r.hashtags.join(' '))}</p>` : ''}
      ${r.image ? `<div class="hr"></div><p class="small dim" style="margin-bottom:8px">Image brief</p>
        <div class="row"><span class="chip">${esc(r.image.motif)}</span><span class="chip">${esc(r.image.kicker)}</span><span class="chip">${esc(r.image.headline)}</span></div>
        <a class="btn ghost sm" href="/app/carousel" style="margin-top:10px">Design it in the carousel maker</a>` : ''}
      ${r.slides ? `<div class="hr"></div><p class="small dim">Slides</p>${r.slides.map((s, i) => `<p class="small" style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${i + 1}. ${esc(s.title)}</b> <span class="dim">${esc(s.body)}</span></p>`).join('')}` : ''}`;
    if (meta) meta.textContent = `${r.kind} · ${r.language || 'English'}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button[type=submit]');
    const old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Writing…';
    out.innerHTML = '<div class="empty" style="border:0"><h3>Writing…</h3><p>The engine is picking a hook and a shape.</p></div>';
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf': decodeURIComponent(csrf()) },
        body: JSON.stringify({ kind: data.kind, topic: data.topic, tone: data.tone, platform: data.platform }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      json.result.language = data.language;
      render(json.result);
    } catch (err) {
      out.innerHTML = `<div class="notice" style="border-color:rgba(251,113,133,.4)">${esc(err.message)}</div>`;
    } finally {
      btn.disabled = false; btn.innerHTML = old;
    }
  });

  document.querySelector('[data-download]')?.addEventListener('click', () => {
    if (!current) return;
    const blob = new Blob([textOf(current)], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lionpost-${current.kind}-${Date.now()}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  });

  document.querySelector('[data-save-draft]')?.addEventListener('click', () => {
    if (!current) { alert('Generate something first.'); return; }
    const f = document.createElement('form');
    f.method = 'post'; f.action = '/app/studio/save';
    const add = (k, v) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); };
    add('_csrf', decodeURIComponent(csrf()));
    add('title', current.title || `${current.kind}: ${form.topic.value}`);
    add('body', textOf(current));
    add('meta', current.metaDescription || '');
    add('keywords', current.keywords || (current.hashtags || []).join(', '));
    document.body.appendChild(f); f.submit();
  });
})();
