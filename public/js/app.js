(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const csrf = () => (document.cookie.match(/(?:^|;\s*)lion_csrf=([^;]+)/) || [])[1] || '';

  // Keyboard shortcut: cmd/ctrl + enter submits the studio form.
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const form = $('[data-studio-form]');
      if (form) { e.preventDefault(); form.requestSubmit(); }
    }
  });

  // Auto-dismiss flash messages after a while.
  document.querySelectorAll('.app-body .flash').forEach((el) => {
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 7000);
  });

  window.LionPost = { csrf };
})();
