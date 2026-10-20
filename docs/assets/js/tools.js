(() => {
  const csrf = () => (document.cookie.match(/(?:^|;\s*)lion_csrf=([^;]+)/) || [])[1] || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  document.querySelectorAll('[data-demo-form]').forEach((form) => {
    const kind = form.dataset.demoForm;
    const out = form.closest('[data-demo]').querySelector('[data-demo-out]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      const original = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'Running…';
      out.innerHTML = '<p class="small dim">Working…</p>';
      try {
        const payload = kind === 'keyword-research'
          ? { seed: form.querySelector('[name=seed]').value }
          : { target: form.querySelector('[name=target]').value };
        const res = await fetch(kind === 'keyword-research' ? '/api/demo/keywords' : '/api/demo/aeo', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf': decodeURIComponent(csrf()) },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong');
        if (kind === 'keyword-research') {
          out.innerHTML = `<table class="result-table"><thead><tr><th>Keyword</th><th>Vol</th><th>KD</th></tr></thead><tbody>${
            data.result.keywords.map((k) => `<tr><td>${esc(k.keyword)}</td><td>${k.volume}</td><td>${k.difficulty}</td></tr>`).join('')
          }</tbody></table><p class="small dim" style="margin-top:8px">Estimates. ${data.result.summary.questions} question phrases in the full run.</p>`;
        } else {
          out.innerHTML = `<div class="row" style="margin-bottom:8px"><b style="font-size:26px">${data.report.score}</b><span class="dim">/100</span></div>${
            data.report.checks.map((c) => `<div class="check-row"><span class="mark ${c.status === 'pass' ? 'ok' : c.status === 'partial' ? 'skip' : 'no'}">${c.status === 'pass' ? '✓' : c.status === 'partial' ? '~' : '✕'}</span><div class="grow"><h5>${esc(c.label)}</h5><p>${esc(c.detail)}</p></div></div>`).join('')
          }<p class="small dim" style="margin-top:8px">First six of eighteen checks.</p>`;
        }
      } catch (err) {
        out.innerHTML = `<p class="small" style="color:#fda4af">${esc(err.message)}</p>`;
      } finally {
        btn.disabled = false; btn.innerHTML = original;
      }
    });
  });
})();
