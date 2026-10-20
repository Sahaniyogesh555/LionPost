(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Mobile nav + app sidebar
  $$('[data-menu]').forEach((btn) => btn.addEventListener('click', () => {
    const mobile = $('[data-mobile-nav]');
    const sidebar = $('[data-sidebar]');
    const scrim = $('[data-scrim]');
    if (mobile) mobile.classList.toggle('open');
    if (sidebar) { sidebar.classList.toggle('open'); scrim?.classList.toggle('show'); }
  }));
  $('[data-scrim]')?.addEventListener('click', () => {
    $('[data-sidebar]')?.classList.remove('open');
    $('[data-scrim]')?.classList.remove('show');
  });

  // Share row: copy the canonical URL
  $$('[data-copy-url]').forEach((btn) => btn.addEventListener('click', async () => {
    const url = btn.dataset.copyText || location.href;
    try {
      await navigator.clipboard.writeText(url);
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = old; }, 1400);
    } catch {
      window.prompt('Copy this link', url);
    }
  }));

  // Copy any element's text
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    const target = btn.closest('[data-studio-output]')?.querySelector('[data-output-text]')
      || btn.closest('.output')?.querySelector('[data-output-text]')
      || $('[data-output-text]');
    const text = target ? target.textContent : btn.dataset.copy;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const old = btn.innerHTML;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.innerHTML = old; }, 1400);
    } catch { btn.textContent = 'Copy failed'; }
  }));

  // Submit buttons get a busy state
  $$('form').forEach((form) => form.addEventListener('submit', () => {
    const btn = form.querySelector('button[type="submit"]:not([data-allow-double])');
    if (!btn) return;
    setTimeout(() => { btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.innerHTML = 'Working…'; }, 10);
  }));

  // Smooth reveal for keyboard users, no scroll hijack
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }));
})();
