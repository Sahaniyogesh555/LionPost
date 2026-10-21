/* The "classic" theme — the 2016 shape of the site this project mirrors.
 *
 * One scrolling front page: fixed navbar that turns solid on scroll, a
 * full-bleed purple-to-red hero with a phone in it, a row of customer marks,
 * a blue call-to-action band, four oversized feature marks, a blue "say
 * hello" band and a black strip of a footer. Plus a year-grouped archive and
 * a plain article page.
 *
 * Everything here is LionPost's own markup and copy, drawn to the 2016
 * measurements rather than pasted from them. No stylesheet, image, font or
 * line of source was lifted: the shared thing is the shape of the page.
 */
import { html, raw, dateLong, esc } from './ui.js';

const base = () => (process.env.LIONPOST_THEME === 'classic' ? '' : '/classic');
const home = () => base() || '/';

function head({ title, description, canonical = '' }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#7b4397">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/assets/manifest.webmanifest">
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/catamaran-latin-200-normal.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/muli-latin-400-normal.woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/classic.css">`;
}

/* ---- little pictures ---------------------------------------------------- */

const ICONS = {
  schedule: '<rect x="8" y="11" width="32" height="29" rx="4"/><path d="M8 20h32M17 6v8M31 6v8M16 28h6M16 34h11"/><path d="M31 30l3 3 6-7"/>',
  device: '<rect x="13" y="6" width="22" height="36" rx="5"/><path d="M20 10h8M24 37.5h.01"/><path d="M18 22h12M18 28h8"/>',
  gift: '<path d="M8 22h32v18H8zM6 15h36v7H6zM24 15v25"/><path d="M24 15c-9 0-11-4-11-6.5S15.5 4 18 5.5 24 15 24 15zM24 15c9 0 11-4 11-6.5S32.5 4 30 5.5 24 15 24 15z"/>',
  infinite: '<path d="M17 24c0-4-3-7-6.5-7S4 20 4 24s3 7 6.5 7S17 28 17 24zm14 0c0 4 3 7 6.5 7S44 28 44 24s-3-7-6.5-7S31 20 31 24z"/><path d="M17 24c0 4 2.5 7 7 7s7-3 7-7-2.5-7-7-7-7 3-7 7z"/>',
  x: '<path d="M10 10l12 13M34 38L22 25M34 10L14 38" stroke-width="3"/>',
  facebook: '<path d="M29 42V26h6l1-7h-7v-4.5c0-2 1-3.5 3.7-3.5H36V5.1C35 5 33 5 31 5c-5 0-8 3-8 8.5V19h-6v7h6v16"/><path d="M0 0"/>',
  linkedin: '<rect x="7" y="18" width="8" height="21"/><circle cx="11" cy="10" r="4"/><path d="M22 39V18h8v3.5c1.4-2.3 3.8-4 7-4 5.4 0 8 3.4 8 9.5V39h-8V28.6c0-2.6-.9-4.1-3-4.1-2.2 0-3.4 1.6-3.4 4.1V39z"/>',
  mail: '<rect x="6" y="11" width="36" height="26" rx="3"/><path d="M7 13l17 13 17-13"/>',
};

function icon(name, size = 80) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true">
<defs><linearGradient id="cl-${name}" x1="44" y1="4" x2="4" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#7b4397"/><stop offset="1" stop-color="#dc2430"/></linearGradient></defs>
<g stroke="url(#cl-${name})" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g></svg>`;
}

function brandMark(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true"><g stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g></svg>`;
}

function phone() {
  return `<div class="c-phone" role="img" aria-label="The LionPost queue on a phone: three scheduled posts and a compose button">
  <div class="c-screen">
    <div class="c-screen-top"><b>Queue</b><span>09:24</span></div>
    <div class="c-slot done"><i></i><div><b>Three decisions before you post</b><span>Posted · X</span></div></div>
    <div class="c-slot"><i></i><div><b>What an answer engine reads</b><span>09:30 · Blog</span></div></div>
    <div class="c-slot"><i></i><div><b>One idea, five formats</b><span>12:00 · Instagram</span></div></div>
    <div class="c-slot"><i></i><div><b>The boring half of publishing</b><span>17:15 · LinkedIn</span></div></div>
    <div class="c-screen-cta">Write something new</div>
  </div>
</div>`;
}

/* ---- chrome ------------------------------------------------------------- */

const NAV = [
  ['#download', 'Download'],
  ['#features', 'Features'],
  ['#contact', 'Contact'],
  ['blog', 'Blog'],
];

function nav({ active = '', onLanding = false } = {}) {
  const href = (key) => (key === 'blog' ? `${base()}/blog` : onLanding ? key : `${home()}/${key}`);
  return html`<nav class="c-nav" data-c-nav>
  <div class="wrap">
    <a class="c-brand" href="${home()}" aria-label="LionPost home">Lion<b>Post</b></a>
    <div class="c-links">
      ${NAV.map(([key, label]) => html`<a href="${href(key)}" class="${active === label ? 'on' : ''}">${label}</a>`)}
    </div>
    <button class="c-burger" type="button" data-c-burger aria-expanded="false" aria-controls="c-drawer">☰</button>
  </div>
  <div class="c-drawer" id="c-drawer" data-c-drawer>
    ${NAV.map(([key, label]) => html`<a href="${href(key)}">${label}</a>`)}
    <a href="/register"><b style="color:var(--c-blue-d)">Start free</b></a>
  </div>
</nav>`;
}

function footer() {
  return html`<footer class="c-footer">
  <div class="wrap">
    <p>© ${new Date().getFullYear()} LionPost. All Rights Reserved.</p>
    <div class="links">
      <a href="${base()}/blog">Blog</a>
      <a href="/about">About</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </div>
  </div>
</footer>
${raw(`<a href="#page-top" class="c-top" aria-label="Back to top">↑</a>`)}`;
}

function shell({ title, description, active = '', canonical = '', onLanding = false, body }) {
  return html`<!doctype html>
<html lang="en">
<head>${raw(head({ title, description, canonical }))}</head>
<body class="classic" id="page-top">
${nav({ active, onLanding })}
<main id="main">${body}</main>
${footer()}
<script src="/assets/js/classic.js" defer></script>
</body>
</html>`;
}

const MARKS = [
  ['Northwind', 'm1'],
  ['Kestrel', 'm2'],
  ['tidepool', 'm3'],
  ['Halcyon', 'm4'],
  ['FIELDNOTE', 'm5'],
  ['Brightside', 'm6'],
  ['M A R R O W', 'm7'],
];

/* ---- the front page ----------------------------------------------------- */

export function classicLanding() {
  return shell({
    title: 'LionPost — the next generation publishing tool',
    description: 'One account for writing, scheduling and the community around it. Sixteen free tools, an auditable queue, nothing to upgrade to.',
    active: 'Download',
    onLanding: true,
    canonical: `${process.env.LIONPOST_URL || ''}${base() || '/'}`,
    body: html`
<header class="c-hero">
  <div class="wrap">
    <div class="c-hero-grid">
      <div>
        <h1>LionPost is <i>the</i> next generation publishing tool, a free and open alternative to the scheduler you rent</h1>
        <p>Write once, send it everywhere, and keep a receipt for every post. No card, no trial clock, no seat count.</p>
        <a class="c-btn" href="/register">Get it now for <b>free!</b></a>
      </div>
      <div class="c-device-wrap">${raw(phone())}</div>
    </div>
  </div>
</header>

<div class="c-strip">
  <div class="wrap">
    ${MARKS.map(([name, cls]) => html`<span class="c-mark ${cls}">${name}</span>`)}
  </div>
</div>

<section id="download" class="c-blue c-band">
  <div class="wrap">
    <span class="kicker">No card · no trial clock</span>
    <h2>Get LionPost in your browser</h2>
    <p>Ditch the tab you pay for and the queue you cannot see. Sixteen tools, one login, and a run log that answers back.</p>
    <a class="c-store" href="/register">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2" stroke="#fff" stroke-width="1.6"/><path d="M2 21h20" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M7 9h10M7 13h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      <span><small>Available now</small><b>Open the studio</b></span>
    </a>
  </div>
</section>

<section id="features" class="c-features">
  <div class="wrap">
    <div class="head">
      <h2>Unlimited features, unlimited runs</h2>
      <p class="muted">Check out what you can do with this app!</p>
      <hr>
    </div>
    <div class="c-features-grid">
      <div class="c-device-wrap">${raw(phone())}</div>
      <div class="c-feature-list">
        <div class="c-feature">
          ${raw(icon('schedule'))}
          <h3>Schedule posts</h3>
          <p>Set your timings and queue unlimited posts. Seriously.</p>
        </div>
        <div class="c-feature">
          ${raw(icon('device'))}
          <h3>Completely yours</h3>
          <p>The work happens in your browser, on your connection, with your own keys.</p>
        </div>
        <div class="c-feature">
          ${raw(icon('gift'))}
          <h3>110% free</h3>
          <p>LionPost stays free and never carries ads, in-app purchases or an upgrade button.</p>
        </div>
        <div class="c-feature">
          ${raw(icon('infinite'))}
          <h3>Infinite possibilities</h3>
          <p>There is more than fits on one page. Sixteen tools are waiting on the other side of the button.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="c-blue c-contact">
  <div class="wrap">
    <h2>We <span class="c-heart">♥</span> new friends!</h2>
    <div class="c-social">
      <a class="tw" href="https://x.com/" rel="noopener" aria-label="LionPost on X">${raw(brandMark('x', 22))}</a>
      <a class="fb" href="https://www.facebook.com/" rel="noopener" aria-label="LionPost on Facebook">${raw(brandMark('facebook', 22))}</a>
      <a class="li" href="https://www.linkedin.com/" rel="noopener" aria-label="LionPost on LinkedIn">${raw(brandMark('linkedin', 22))}</a>
      <a class="ml" href="mailto:hello@lionpost.local" aria-label="Email LionPost">${raw(brandMark('mail', 22))}</a>
    </div>
  </div>
</section>`,
  });
}

/* ---- the archive -------------------------------------------------------- */

export function classicBlog({ posts, tags = [], tag = '', canonical = '' }) {
  const byYear = new Map();
  for (const p of posts) {
    const y = String(p.published_at).slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(p);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return shell({
    title: tag ? `${tag} posts · LionPost` : 'Blog · LionPost',
    description: 'Short, specific posts about keeping a queue alive and getting quoted by machines.',
    active: 'Blog',
    canonical,
    body: html`
<header class="c-blog-head">
  <div class="wrap">
    <h1>${tag ? `${tag} posts.` : 'The blog'}</h1>
    <p>${tag ? `Everything filed under ${tag}.` : 'Notes from the boring half of publishing.'}</p>
  </div>
</header>

<div class="c-blog-body">
  <div class="wrap c-blog-grid">
    <div>
      ${years.length === 0 ? html`<p class="muted">Nothing filed here yet. <a href="${base()}/blog">Read everything</a>.</p>` : ''}
      ${years.map((y) => html`<div class="c-year-block">
        <h2 class="c-year" id="${y}-ref">${y}</h2>
        <div class="c-year-rule"></div>
        ${byYear.get(y).map((p) => html`<a class="c-post-row" href="${base()}/blog/${p.slug}">
          <h3>${p.title}</h3>
          <p>${p.excerpt || ''}</p>
          <span class="meta">${p.tag || 'Post'} · ${p.read_minutes || 6} min read · ${dateLong(p.published_at)}</span>
        </a>`)}
      </div>`)}
    </div>
    <aside>
      <div class="c-side-card">
        <h4>Topics</h4>
        <a href="${base()}/blog" class="${tag ? '' : 'on'}">Recent <span>${posts.length || ''}</span></a>
        ${tags.map((t) => html`<a href="${base()}/blog/tag/${encodeURIComponent(t.tag)}" class="${tag === t.tag ? 'on' : ''}">${t.tag} <span>${t.n}</span></a>`)}
      </div>
      <div class="c-side-card">
        <h4>Follow along</h4>
        <a href="/feed.xml">RSS feed <span>↗</span></a>
        <a href="/videos">Video shelf <span>↗</span></a>
        <a href="/community">The Lounge <span>↗</span></a>
      </div>
    </aside>
  </div>
</div>`,
  });
}

export function classicArticle({ post, others = [], canonical = '' }) {
  const share = (label, url, cls) => html`<a class="${cls}" href="${url}" rel="noopener" aria-label="Share on ${label}">${raw(brandMark(cls === 'tw' ? 'x' : cls === 'fb' ? 'facebook' : cls === 'li' ? 'linkedin' : 'mail', 16))}</a>`;
  const pageUrl = canonical || `${process.env.LIONPOST_URL || ''}${base()}/blog/${post.slug}`;
  const enc = encodeURIComponent(pageUrl);
  return shell({
    title: `${post.title} · LionPost`,
    description: post.excerpt || '',
    active: 'Blog',
    canonical,
    body: html`
<article class="c-article">
  <header class="c-blog-head c-article-head">
    <div class="wrap">
      <a class="kicker" href="${base()}/blog/tag/${encodeURIComponent(post.tag || 'Post')}">${post.tag || 'Post'}</a>
      <h1>${post.title}</h1>
      <p>${dateLong(post.published_at)} · ${post.read_minutes || 6} min read</p>
    </div>
  </header>
  <div class="wrap">
    <div class="c-article-body">
      ${raw(post.body || '')}
      <div class="c-share">
        <span class="kicker">Share</span>
        ${share('X', `https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${enc}`, 'tw')}
        ${share('Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc}`, 'fb')}
        ${share('LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, 'li')}
        ${share('Email', `mailto:?subject=${encodeURIComponent(post.title)}&body=${enc}`, 'ml')}
      </div>
    </div>
    ${others.length ? html`<div class="c-more">
      <h4>Keep reading</h4>
      ${others.map((p) => html`<a class="c-post-row" href="${base()}/blog/${p.slug}">
        <h3>${p.title}</h3>
        <span class="meta">${dateLong(p.published_at)}</span>
      </a>`)}
    </div>` : ''}
  </div>
</article>`,
  });
}

/* ---- quieter pages, same clothes ---------------------------------------- */

export function classicLegal({ sections, terms = false }) {
  return shell({
    title: `${terms ? 'Terms' : 'Privacy'} · LionPost`,
    description: terms ? 'The terms that apply to a free LionPost account.' : 'What LionPost stores, what it does not, and how to delete it.',
    body: html`
<header class="c-blog-head">
  <div class="wrap">
    <h1>${terms ? 'Terms of use' : 'Privacy policy'}</h1>
    <p>Last updated 20 October 2026. Plain language on purpose.</p>
  </div>
</header>
<article class="c-article" style="padding-top:56px">
  <div class="wrap">
    <div class="c-article-body">
      ${sections.map(([h, p]) => html`<h2>${h}</h2><p>${p}</p>`)}
      <p class="muted" style="margin-top:26px;font-size:15px">This is a demo product document, not legal advice. If you operate this deployment, review it with a lawyer before taking money or personal data at scale.</p>
    </div>
  </div>
</article>`,
  });
}

export function classicAbout({ stats }) {
  return shell({
    title: 'About · LionPost',
    description: 'Why LionPost exists, what it will not do, and how it is built.',
    body: html`
<header class="c-blog-head">
  <div class="wrap">
    <h1>Built for the person doing all of it.</h1>
    <p>LionPost started because publishing alone means being the writer, the designer, the scheduler and the analyst, usually in the same hour.</p>
  </div>
</header>
<article class="c-article" style="padding-top:56px">
  <div class="wrap">
    <div class="c-article-body">
      <p>The tools were never the hard part. The context switching was. One login, one queue, one place where the writing and the posting share the same idea.</p>
      <h2>What this is</h2>
      <p>An independent workspace: sixteen tools under one login, plus a forum where the people using them compare notes. ${stats.members} members, ${stats.threads} threads, ${stats.posts} runs logged.</p>
      <h2>What it will not do</h2>
      <ul>
        <li>It will not post anywhere you have not connected.</li>
        <li>It will not invent quotes, reviews or statistics to fill a draft.</li>
        <li>It will not upload your video. Rendering happens in your browser.</li>
        <li>It will not pretend a dry run reached a platform.</li>
      </ul>
      <h2>How it is built</h2>
      <p>A small Node service, SQLite, server-rendered pages and vanilla JavaScript. No bundler, no tracking scripts, no third-party analytics. The content engine is deterministic and runs offline; add your own Gemini key if you want a second opinion.</p>
      <div class="c-share" style="margin-top:34px">
        <span class="kicker">Start here</span>
        <a class="c-btn solid" style="padding:11px 26px" href="/register">Create a free account</a>
        <a class="c-btn dark" style="padding:11px 26px" href="${base()}/blog">Read the blog</a>
      </div>
    </div>
  </div>
</article>`,
  });
}
