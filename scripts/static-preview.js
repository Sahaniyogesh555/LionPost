/* Static preview behaviour.
 * On GitHub Pages there is no server: forms cannot post and the tool demos
 * have no API. Rather than let them fail silently, catch the submit at the
 * capture phase and explain where the working version lives. */
(() => {
  const note = document.querySelector('.static-note');
  if (note) {
    if (sessionStorage.getItem('lp-static-dismissed') === '1') note.remove();
    note.querySelector('[data-static-dismiss]')?.addEventListener('click', () => {
      sessionStorage.setItem('lp-static-dismissed', '1');
      note.remove();
    });
  }

  const toast = (message) => {
    let el = document.querySelector('.static-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'static-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 4200);
  };

  // capture: runs before tools.js / site.js handlers
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toast(form.hasAttribute('data-demo-form')
      ? 'The live tools need the server. Deploy the app to try this.'
      : 'This is a static preview. Forms work in the running app.');
  }, true);

  // links that only exist in the app
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href*="/app"]');
    if (!link) return;
    event.preventDefault();
    toast('Sign-in and the workspace run in the app, not on GitHub Pages.');
  }, true);
})();
