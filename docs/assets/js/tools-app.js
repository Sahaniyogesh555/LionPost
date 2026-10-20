/* App-side tool pages: keyword research and the AEO checker.
 * Both submit as normal form posts, so this file adds the things a static
 * form cannot do: a busy state that survives slow external fetches, copying a
 * row, and cmd/ctrl+Enter to run the thing. */
(() => {
  const busy = (form, label) => {
    const btn = form.querySelector('button[type="submit"], button:not([type])');
    if (!btn) return () => {};
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.dataset.original = original;
    btn.textContent = label;
    return () => { btn.disabled = false; btn.innerHTML = original; };
  };

  const toast = (text) => {
    let el = document.querySelector('.toast-inline');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast-inline';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1600);
  };

  const kwForm = document.querySelector('[data-kw-form]');
  if (kwForm) {
    kwForm.addEventListener('submit', () => { busy(kwForm, 'Researching…'); });
    const table = document.querySelector('.result-table');
    if (table) {
      table.addEventListener('click', async (ev) => {
        const cell = ev.target.closest('tbody tr td:first-child');
        if (!cell) return;
        const text = cell.textContent.trim();
        try {
          await navigator.clipboard.writeText(text);
          toast('Copied “' + text + '”');
        } catch {
          toast('Select and copy: ' + text);
        }
      });
      table.title = 'Click a keyword to copy it';
    }
  }

  // AEO: a remote page plus robots.txt and llms.txt can take a few seconds.
  const aeoForm = document.querySelector('form[action="/app/aeo"]');
  if (aeoForm) {
    aeoForm.addEventListener('submit', (ev) => {
      const url = aeoForm.querySelector('input[name="url"]');
      const restore = busy(aeoForm, 'Reading the page…');
      const note = aeoForm.querySelector('[data-aeo-note]');
      if (note) note.textContent = 'Fetching the page, robots.txt and llms.txt…';
      // A blocked fetch still resolves server-side; only re-enable on failure.
      setTimeout(() => { if (!document.hidden) restore(); }, 20000);
      if (url && url.value && !/^https?:\/\//i.test(url.value.trim())) url.value = 'https://' + url.value.trim();
    });
  }

  document.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
      const form = ev.target.closest && ev.target.closest('form');
      if (form && form.querySelector('input,textarea')) {
        ev.preventDefault();
        form.requestSubmit ? form.requestSubmit() : form.submit();
      }
    }
  });
})();
