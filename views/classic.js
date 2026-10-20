/* The "classic" theme.
 *
 * A second, complete front end for the public site, built to the shape of the
 * 2016 single-page build of the product this project mirrors: fixed navbar,
 * full-bleed hero with a device mockup, a trust strip, four circular feature
 * marks, a split "under the hood" section, a coloured call-to-action band, a
 * counter row and a heavy footer, plus a year-grouped blog with a sidebar.
 *
 * Everything here is original: LionPost's copy, LionPost's palette, CSS-drawn
 * artwork. No stylesheet, image, font or line of markup comes from the
 * original site — the shared thing is the page skeleton, which is an idea,
 * not an asset.
 */
import { html, raw, icon, dateLong, number, esc } from './ui.js';

function logo(size = 26) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true" style="flex:none">
  <defs><linearGradient id="cl-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD97A"/><stop offset="1" stop-color="#E89B1C"/></linearGradient></defs>
  <rect width="40" height="40" rx="10" fill="#0B0D12"/>
  <path d="M20 4l3.6 3.2 4.7-1.2 1.2 4.7 4 3.6-2.8 4 1 4.8-4.8.9-2.7 4-4.2-2.6-4.2 2.6-2.7-4-4.8-.9 1-4.8-2.8-4 4-3.6 1.2-4.7 4.7 1.2L20 4z" fill="url(#cl-g)"/>
  <circle cx="20" cy="20" r="8" fill="#0B0D12"/>
  <circle cx="17" cy="18.6" r="1.3" fill="#FFD97A"/><circle cx="23" cy="18.6" r="1.3" fill="#FFD97A"/>
  <path d="M16.8 23.2c1.9 1.5 4.5 1.5 6.4 0" stroke="#FFD97A" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;
}

const NAV = [
  ['/classic#download', 'Download'],
  ['/classic#features', 'Features'],
  ['/classic#why', 'Why free'],
  ['/classic#contact', 'Contact'],
  ['/classic/blog', 'Blog'],
];

function head({ title, description, canonical = '', scripts = [] }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#08090e">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/assets/manifest.webmanifest">
<link rel="stylesheet" href="/assets/css/classic.css">
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}`;
}

function nav(active) {
  return html`<nav class="c-nav" data-c-nav>
  <div class="wrap c-nav-inner">
    <a class="c-brand" href="/classic" aria-label="LionPost classic home">
      ${raw(logo(26))}<span>Lion<b>Post</b></span>
    </a>
    <div class="c-links">
      ${NAV.map(([href, label]) => html`<a href="${href}" class="${active === label ? 'on' : ''}">${label}</a>`)}
      <a class="cta" href="/register">Start free</a>
    </div>
    <button class="c-burger" type="button" data-c-burger aria-expanded="false" aria-controls="c-drawer">☰</button>
  </div>
  <div class="c-drawer" id="c-drawer" data-c-drawer>
    ${NAV.map(([href, label]) => html`<a href="${href}">${label}</a>`)}
    <a href="/register"><b style="color:var(--c-gold)">Start free</b></a>
    <a href="/">Switch to the new look</a>
  </div>
</nav>`;
}

function footer() {
  return html`<footer class="c-footer" id="contact">
  <div class="wrap">
    <div class="c-footer-grid">
      <div>
        <a href="/classic" style="display:inline-flex">${raw(logo(28))}<span style="margin-left:10px;font-weight:750;font-size:17px">Lion<b style="color:var(--c-gold)">Post</b></span></a>
        <p>One account for writing, scheduling and the community around it. Sixteen tools, free, no card, no trial clock.</p>
      </div>
      <div>
        <h4>Product</h4>
        <a href="/app/studio">Studio</a>
        <a href="/app/automations">Automations</a>
        <a href="/tools">All sixteen tools</a>
        <a href="/videos">Video shelf</a>
      </div>
      <div>
        <h4>Community</h4>
        <a href="/community">The Lounge</a>
        <a href="/community/category/questions">Questions</a>
        <a href="/u/alex">A member profile</a>
      </div>
      <div>
        <h4>More</h4>
        <a href="/classic/blog">Blog</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/forgot">Reset a password</a>
      </div>
    </div>
    <div class="c-bottom">
      <span>© ${new Date().getFullYear()} LionPost. All rights reserved.</span>
      <span>Classic theme · <a href="/" style="color:#a2aab9">see the current design</a></span>
    </div>
  </div>
</footer>`;
}

function shell({ title, description, active = '', canonical = '', body, scripts = [] }) {
  return html`<!doctype html>
<html lang="en">
<head>${raw(head({ title, description, canonical, scripts }))}</head>
<body class="classic">
${nav(active)}
${body}
${footer()}
${raw(`<a href="#page-top" class="c-top" aria-label="Back to top" style="position:fixed;right:18px;bottom:18px;z-index:40;width:40px;height:40px;display:grid;place-items:center;border-radius:50%;border:1px solid var(--c-line);background:#14171f;color:#a2aab9;box-shadow:0 12px 30px rgba(0,0,0,.5)">↑</a>`)}
${raw(`<script src="/assets/js/classic.js" defer></script>`)}
</body></html>`;
}

export function classicLanding({ stats, posts, flash = null }) {
  const queue = [
    ['Mon', 'The boring half of content queues', 'Mon 09:00', 'sent'],
    ['Wed', 'Carousel: three decisions', 'Wed 09:00', 'sent'],
    ['Fri', 'Article: a weekly review', 'Fri 09:00', 'queued'],
    ['Sun', 'Short: what actually scales', 'Sun 17:30', 'draft'],
  ];
  return shell({
    title: 'LionPost — free scheduling, writing tools and a creator community',
    description: 'A free alternative to the paid scheduler stack: write once, adapt it to every channel, queue it, and read the log afterwards. Sixteen tools, one login, no card.',
    active: 'Download',
    body: html`
<header class="c-hero" id="page-top">
  <div class="wrap">
    <div>
      <span class="c-kicker">Free · no card · no trial clock</span>
      <h1>LionPost is <em>the</em> calm way to publish everywhere.</h1>
      <p class="c-lede">One place to write the idea, cut it into a caption, a thread, a carousel, a pin and a short — then let a queue you can audit do the delivery. Sixteen tools and a room full of people doing the same thing.</p>
      <div class="c-hero-actions">
        <a class="c-btn lg" href="/register">${icon('spark', 17)} Get it now — free</a>
        <a class="c-btn ghost lg" href="/tools">See all sixteen tools</a>
      </div>
      <div class="c-proof">
        <div class="c-faces" aria-hidden="true"><span>AL</span><span>DA</span><span>PN</span><span>TN</span></div>
        <span><b style="color:#f2f4f9">${number(stats.members)}</b> creators · ${number(stats.threads)} threads · ${number(stats.posts)} runs logged</span>
      </div>
    </div>
    <div class="c-phone-wrap">
      <div class="c-phone" role="img" aria-label="The LionPost queue on a phone: two posts sent, one queued, one draft">
        <div class="c-screen">
          <div class="c-screen-top"><i class="c-dot"></i><b>LionPost queue</b><span>09:41</span></div>
          <div class="c-queue">
            ${queue.map(([d, title, when, state], i) => html`<div class="c-q-item">
              <i style="background:${['#241d0f', '#0f2019', '#1a1d2a', '#20161d'][i]};color:${['#f5b942', '#6ee7b7', '#93c5fd', '#fca5a5'][i]}">${d}</i>
              <div><b>${title}</b><small>${when}</small></div>
              <u class="${state}">${state === 'sent' ? 'sent' : state === 'queued' ? 'queued' : 'draft'}</u>
            </div>`)}
          </div>
          <div class="c-screen-foot"><div>Write one idea</div></div>
        </div>
        <div class="c-float"><b>+41%</b><span>posts per week, one queue</span></div>
      </div>
    </div>
  </div>
</header>

<div class="c-strip">
  <div class="wrap">
    <span>Publishes to</span>
    <div class="c-channels"><span>Instagram</span><span>Facebook</span><span>X</span><span>Pinterest</span><span>Telegram</span><span>TikTok</span><span>YouTube</span><span>Any webhook</span></div>
  </div>
</div>

<section class="c-section" id="features">
  <div class="wrap">
    <div class="c-head">
      <span class="c-eyebrow">What it does</span>
      <h2>Everything a one-person publishing operation needs, in one login.</h2>
      <p>Not a bundle of ten products with ten bills. One workspace where the writing, the making and the scheduling share the same idea.</p>
    </div>
    <div class="c-features">
      ${[
        ['pen', 'Write once, adapt everywhere', 'One idea becomes a caption, a thread, a full article, a carousel and a short. Edit any of them before anything ships.'],
        ['bolt', 'A queue you can audit', 'Every run stores the text it used, the channel it targeted and the exact response. No black box, no mystery posts.'],
        ['shield', 'Keys you keep', 'Third-party tokens are encrypted with AES-256-GCM. Passwords are hashed with scrypt, never stored in the clear.'],
        ['image', 'Made on the device', 'Carousels export as PNG, video and shorts record as WebM in your browser. Files never touch the server.'],
      ].map(([ic, title, copy]) => html`<div class="c-feature">
        <div class="c-mark">${icon(ic, 30)}</div>
        <h3>${title}</h3>
        <p>${copy}</p>
      </div>`)}
    </div>
  </div>
</section>

<section class="c-section tight" id="why" style="border-top:1px solid var(--c-line)">
  <div class="wrap c-split">
    <div>
      <span class="c-eyebrow">Under the hood</span>
      <h2>Free because the expensive half runs on your machine.</h2>
      <p>The generator, the keyword engine and the answer-engine checker are deterministic local code. Carousels and video are rendered by the browser, not by a render farm.</p>
      <p>That removes the per-generation bill that forces every other tool into a subscription.</p>
      <ul class="c-checks">
        <li><span class="c-tick">✓</span><span><b>No model bill.</b> Swap in your own API key whenever you want a different voice — it stays encrypted and optional.</span></li>
        <li><span class="c-tick">✓</span><span><b>No render farm.</b> A 1080×1350 deck or a 9:16 short is drawn frame by frame on your device.</span></li>
        <li><span class="c-tick">✓</span><span><b>No advertising.</b> There is no third-party analytics script and nothing to upgrade to.</span></li>
      </ul>
      <a class="c-btn ghost" href="/about">Why it is built this way</a>
    </div>
    <div class="c-window">
      <div class="c-window-bar"><i></i><i></i><i></i><span>library/scheduler.js</span></div>
      <div class="c-window-body">
        <div class="c-code-line"><span>1</span><b>export async function</b><em>deliver</em>(db, automation, connection, content) {</div>
        <div class="c-code-line"><span>2</span><u>if</u> (automation.publish_mode !== <span style="color:#f5b942">'live'</span>) {</div>
        <div class="c-code-line"><span>3</span>return { ok: <b>true</b>, simulated: <b>true</b> }; <span style="color:#5c6474">// dry run</span></div>
        <div class="c-code-line"><span>4</span>}</div>
        <div class="c-code-line"><span>5</span><u>const</u> res = <u>await</u> postJson(connection.webhook_url, payload);</div>
        <div class="c-code-line"><span>6</span><u>return</u> res.ok ? { delivered: <b>true</b>, status: res.status } : { error: res.text };</div>
        <div class="c-code-line"><span>7</span>}</div>
      </div>
    </div>
  </div>
</section>

<section class="c-band" id="download">
  <div class="wrap">
    <h2>The queue is empty. Let's fix that.</h2>
    <p>Make an account, connect one channel, write one idea. It takes about a minute, and nothing posts until you say so.</p>
    <div class="c-hero-actions" style="justify-content:center">
      <a class="c-btn lg" href="/register">Create your free account</a>
      <a class="c-btn ghost lg" href="/community">Look around the Lounge first</a>
    </div>
  </div>
</section>

<section class="c-section tight">
  <div class="wrap">
    <div class="c-stats">
      <div class="c-stat"><b>${number(stats.members)}</b><span>members in the Lounge</span></div>
      <div class="c-stat"><b>${number(stats.posts)}</b><span>runs logged</span></div>
      <div class="c-stat"><b>16</b><span>tools on one login</span></div>
      <div class="c-stat"><b>0</b><span>cards required</span></div>
    </div>
  </div>
</section>

<section class="c-section" style="border-top:1px solid var(--c-line)">
  <div class="wrap">
    <div class="c-head">
      <span class="c-eyebrow">From the blog</span>
      <h2>Notes from the boring half of publishing.</h2>
      <p>Short, specific posts about keeping a queue alive and getting quoted by machines.</p>
    </div>
    <div style="display:grid;gap:0">
      ${posts.map((p) => html`<a class="c-post-row" href="/classic/blog/${p.slug}">
        <div><h3>${p.title}</h3><p>${p.excerpt}</p></div>
        <time>${dateLong(p.published_at)}</time>
      </a>`)}
    </div>
    <div style="text-align:center;margin-top:34px"><a class="c-btn ghost" href="/classic/blog">Read the blog</a></div>
  </div>
</section>`,
  });
}

export function classicBlog({ posts, tags = [], tag = '', canonical = '' }) {
  const byYear = new Map();
  for (const p of posts) {
    const y = String(p.published_at).slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(p);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return shell({
    title: tag ? `${tag} posts · LionPost classic blog` : 'Blog · LionPost classic',
    description: 'Notes on publishing alone, grouped by year with a category index.',
    active: 'Blog',
    canonical,
    body: html`
<header class="c-blog-head">
  <div class="wrap">
    <span class="c-eyebrow">The blog</span>
    <h1>${tag ? `Filed under ${tag}` : 'All posts'}</h1>
    <p>${tag ? `Everything in ${tag}, newest first.` : 'Keeping up with publishing, one specific post at a time. Older entries are grouped by year, the way an archive should be.'}</p>
  </div>
</header>
<div class="wrap c-blog-body">
  <div>
    ${years.length === 0 ? html`<p style="color:var(--c-muted)">Nothing filed here yet. <a href="/classic/blog" style="color:var(--c-gold)">Read everything</a>.</p>` : ''}
    ${years.map((y) => html`
      <h2 class="c-year" id="${y}-ref">${y}</h2>
      ${byYear.get(y).map((p) => html`<a class="c-post-row" href="/classic/blog/${p.slug}">
        <div>
          <h3>${p.title}</h3>
          <p>${p.excerpt}</p>
          <p style="font-size:12px;color:#6d7688;margin-top:6px">${p.tag} · ${p.read_minutes} min read</p>
        </div>
        <time>${dateLong(p.published_at)}</time>
      </a>`)}
    `)}
  </div>
  <aside class="c-side">
    <div class="c-side-card">
      <h4>Order by</h4>
      <a href="/classic/blog" class="${tag ? '' : 'on'}">Recent <span>${posts.length || ''}</span></a>
      <a href="/blog">Topics <span>→</span></a>
      <a href="/videos">Videos <span>→</span></a>
    </div>
    <div class="c-side-card">
      <h4>Categories</h4>
      ${tags.map((t) => html`<a href="/classic/blog/tag/${encodeURIComponent(t.tag)}" class="${tag === t.tag ? 'on' : ''}">${t.tag} <span>${t.n}</span></a>`)}
    </div>
    <div class="c-side-card">
      <h4>About</h4>
      <p style="color:var(--c-muted);font-size:13.5px">LionPost is a free publishing workspace and a community for people who make things alone.</p>
      <a href="/register" style="color:var(--c-gold);margin-top:10px">Make an account →</a>
    </div>
  </aside>
</div>`,
  });
}

export function classicArticle({ post, others, canonical = '' }) {
  return shell({
    title: `${post.title} · LionPost`,
    description: post.excerpt,
    active: 'Blog',
    canonical,
    body: html`
<article class="c-article">
  <div class="c-wrap-narrow">
    <a href="/classic/blog" style="font-size:13px;color:#6d7688">← All posts</a>
    <div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <a href="/classic/blog/tag/${encodeURIComponent(post.tag)}" style="color:var(--c-gold);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600">${post.tag}</a>
      <span style="color:#6d7688;font-size:12.5px">${post.read_minutes} min read · ${dateLong(post.published_at)}</span>
    </div>
    <h1>${post.title}</h1>
    <p class="c-lede">${post.excerpt}</p>
    <div class="md">${raw(post.body_html)}</div>
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--c-line);display:flex;gap:14px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6d7688">Share</span>
      <a href="https://x.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer nofollow" style="border:1px solid var(--c-line);border-radius:999px;padding:6px 13px;font-size:12.5px;color:#a2aab9">X</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer nofollow" style="border:1px solid var(--c-line);border-radius:999px;padding:6px 13px;font-size:12.5px;color:#a2aab9">Facebook</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer nofollow" style="border:1px solid var(--c-line);border-radius:999px;padding:6px 13px;font-size:12.5px;color:#a2aab9">LinkedIn</a>
      <a href="${canonical.startsWith('http') ? canonical : `/classic/blog/${post.slug}`}" style="border:1px solid var(--c-line);border-radius:999px;padding:6px 13px;font-size:12.5px;color:#a2aab9">Permalink</a>
    </div>
    <h3 style="font-size:15px;margin:44px 0 8px">Keep reading</h3>
    ${others.map((p) => html`<a class="c-post-row" href="/classic/blog/${p.slug}">
      <div><h3 style="font-size:16.5px">${p.title}</h3></div>
      <time>${dateLong(p.published_at)}</time>
    </a>`)}
  </div>
</article>`,
  });
}
