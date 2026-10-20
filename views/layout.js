import { html, raw, icon, brand, avatar, esc, timeAgo, flashMessages } from './ui.js';

const SITE_NAV = [
  ['/tools', 'Tools'],
  ['/community', 'Community'],
  ['/blog', 'Blog'],
  ['/#how', 'How it works'],
];

const APP_NAV = [
  { group: 'Workspace', items: [
    ['/app', 'home', 'Overview'],
    ['/app/studio', 'pen', 'Studio'],
    ['/app/automations', 'bolt', 'Automations'],
    ['/app/connections', 'link', 'Connections'],
    ['/app/feeds', 'folder', 'Website to social'],
  ] },
  { group: 'Free tools', items: [
    ['/app/keywords', 'search', 'Keyword research'],
    ['/app/aeo', 'shield', 'AEO checker'],
    ['/app/videos', 'video', 'Video maker'],
    ['/app/carousel', 'image', 'Carousel & pins'],
    ['/app/shorts', 'grid', 'Shorts cutter'],
  ] },
  { group: 'Account', items: [
    ['/app/settings', 'settings', 'Settings'],
    ['/community', 'users', 'Community'],
  ] },
];

function head({ title, description = '', scripts = [], canonical = '' }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#0B0D12">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/app.css">
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}`;
}

export function sitePage({ title, description, user, active = '', body, scripts = [], bodyClass = '', flash = null, canonical = '', extraHead = '' }) {
  return html`<!doctype html>
<html lang="en">
<head>${raw(head({ title, description, scripts, canonical }))}${raw(extraHead)}</head>
<body class="site ${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="shell nav-shell">
    ${brand(30)}
    <nav class="site-nav" aria-label="Main">
      ${SITE_NAV.map(([href, label]) => html`<a href="${href}" class="${active === href ? 'on' : ''}">${label}</a>`)}
    </nav>
    <div class="nav-actions">
      ${user
        ? html`<a class="btn ghost sm" href="/app">Open app</a><a class="nav-avatar" href="/u/${user.handle}">${avatar(user, 32)}</a>`
        : html`<a class="btn ghost sm hide-sm" href="/login">Sign in</a><a class="btn sm" href="/register">Start free ${icon('arrow', 15)}</a>`}
      <button class="icon-btn menu-btn" data-menu aria-label="Menu">${icon('grid', 18)}</button>
    </div>
  </div>
  <div class="mobile-nav" data-mobile-nav>
    ${SITE_NAV.map(([href, label]) => html`<a href="${href}">${label}</a>`)}
    ${user ? html`<a href="/app">Open app</a>` : html`<a href="/login">Sign in</a><a href="/register">Start free</a>`}
  </div>
</header>
<main id="main">${flashMessages(flash)}${body}</main>
<footer class="site-footer">
  <div class="shell footer-grid">
    <div class="footer-brand">
      ${brand(30)}
      <p>One account for publishing, automation and the people doing the same thing. Free, no card.</p>
      <div class="footer-tags"><span>${icon('shield', 14)} Encrypted keys</span><span>${icon('bolt', 14)} 16 tools</span></div>
    </div>
    <div><h4>Product</h4><a href="/tools">All tools</a><a href="/app/studio">Studio</a><a href="/app/automations">Automations</a><a href="/app/keywords">Keyword research</a></div>
    <div><h4>Community</h4><a href="/community">The Lounge</a><a href="/community/category/questions">Questions</a><a href="/community/category/showcase">Showcase</a><a href="/u/demo">Your profile</a></div>
    <div><h4>Company</h4><a href="/blog">Blog</a><a href="/about">About</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></div>
  </div>
  <div class="shell footer-bottom">
    <span>© ${new Date().getFullYear()} LionPost. Built clean-room, shipped in public.</span>
    <span class="muted">LionPost is an independent product. It is not affiliated with any other publishing tool.</span>
  </div>
</footer>
<script src="/assets/js/site.js" defer></script>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('')}
</body></html>`;
}

export function appPage({ title, description = '', user, csrf = '', active = '', body, scripts = [], pageTitle = '', pageSub = '', actions = '', flash = null, unread = 0, canonical = '', extraHead = '' }) {
  return html`<!doctype html>
<html lang="en">
<head>${raw(head({ title, description, scripts, canonical }))}${raw(extraHead)}</head>
<body class="app">
<a class="skip" href="#main">Skip to content</a>
<div class="app-shell">
  <aside class="sidebar" data-sidebar>
    <div class="sidebar-top">${brand(28)}<button class="icon-btn close-side" data-menu aria-label="Close">${icon('x', 18)}</button></div>
    <nav class="side-nav">
      ${APP_NAV.map((g) => html`<div class="side-group"><p>${g.group}</p>
        ${g.items.map(([href, ic, label]) => html`<a href="${href}" class="${active === href ? 'on' : ''}">${icon(ic, 17)}<span>${label}</span></a>`)}
      </div>`)}
    </nav>
    <div class="side-foot">
      <a class="side-user" href="/u/${user.handle}">${avatar(user, 34)}
        <span><strong>${user.name}</strong><em>@${user.handle}</em></span>
      </a>
      <form method="post" action="/logout">${raw(csrfHidden(csrf))}<button class="icon-btn" title="Sign out" aria-label="Sign out">${icon('logout', 17)}</button></form>
    </div>
  </aside>
  <div class="app-main">
    <header class="app-top">
      <button class="icon-btn menu-btn" data-menu aria-label="Menu">${icon('grid', 18)}</button>
      <div class="app-title"><h1>${pageTitle || title}</h1>${pageSub ? html`<p>${pageSub}</p>` : ''}</div>
      <div class="app-actions">
        ${actions}
        <a class="icon-btn bell" href="/app/notifications" aria-label="Notifications">${icon('bolt', 18)}${unread ? html`<b>${unread}</b>` : ''}</a>
      </div>
    </header>
    <main id="main" class="app-body">${flashMessages(flash)}${body}</main>
  </div>
</div>
<div class="scrim" data-scrim></div>
<script src="/assets/js/site.js" defer></script>
<script src="/assets/js/app.js" defer></script>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('')}
</body></html>`;
}

export function csrfHidden(token) {
  return `<input type="hidden" name="_csrf" value="${esc(token)}">`;
}

export { icon, avatar, timeAgo };
