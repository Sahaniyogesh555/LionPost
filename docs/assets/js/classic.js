/* Classic theme behaviour: sticky navbar state, mobile drawer, smooth anchors,
 * and a back-to-top affordance. Nothing here depends on a framework. */
(() => {
  const nav = document.querySelector('[data-c-nav]');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('stuck', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const burger = document.querySelector('[data-c-burger]');
  const drawer = document.querySelector('[data-c-drawer]');
  burger?.addEventListener('click', () => {
    const open = drawer?.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.textContent = open ? '✕' : '☰';
  });

  // Anchor links inside the theme scroll with the fixed navbar accounted for.
  document.querySelectorAll('a[href*="#"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      const id = a.getAttribute('href').split('#')[1];
      const target = id && document.getElementById(id);
      if (!target) return;
      ev.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
      drawer?.classList.remove('open');
      if (burger) { burger.textContent = '☰'; burger.setAttribute('aria-expanded', 'false'); }
      history.replaceState(null, '', '#' + id);
    });
  });
})();
