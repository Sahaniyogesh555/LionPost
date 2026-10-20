import { html, raw, icon, avatar, number, timeAgo, dateLong, esc, brand } from './ui.js';
import { sitePage } from './layout.js';
import { TOOLS } from '../lib/tools.js';

const fmt = number;

function toolCard(t) {
  return html`<a class="tool-card" href="/tools/${t.slug}">
    <span class="tic">${icon(t.icon, 20)}</span>
    <span class="go">${icon('arrow', 16)}</span>
    <h3>${t.name}</h3>
    <p>${t.tagline}</p>
  </a>`;
}

function threadMini(p) {
  return html`<a class="thread-mini" href="/community/${p.slug}">
    ${avatar({ name: p.author, avatar_color: p.avatar_color }, 38)}
    <div style="min-width:0">
      <h4>${p.title}</h4>
      <div class="mini-meta">
        <span>${p.author}</span><span>·</span><span>${timeAgo(p.created_at)}</span>
        ${p.category ? html`<span class="chip">${p.emoji} ${p.category}</span>` : ''}
        <span>${icon('comment', 12)} ${p.comments}</span>
        <span>${icon('heart', 12)} ${p.likes}</span>
      </div>
    </div>
  </a>`;
}

function blogCard(p) {
  return html`<a class="post-card" href="/blog/${p.slug}">
    <div class="post-cover" style="--pc:${p.accent}"></div>
    <div class="pc-body">
      <span class="chip gold" style="width:max-content">${p.tag}</span>
      <h3>${p.title}</h3>
      <p>${p.excerpt}</p>
      <div class="post-meta"><span>${p.read_minutes} min read</span><span>·</span><span>${dateLong(p.published_at)}</span></div>
    </div>
  </a>`;
}

export function landing({ user, stats, threads, blog, flash }) {
  return sitePage({
    title: 'LionPost · One account for publishing, automation and the people doing it too',
    description: 'Sixteen free tools for people who publish online: social automation, AI writing and video, keyword research, an AEO checker and a creator community. No card, no trial.',
    user, active: '/', flash,
    scripts: ['/assets/js/tools.js'],
    body: html`
<section class="hero">
  <div class="shell hero-grid">
    <div>
      <span class="eyebrow">Free · 16 tools · one login</span>
      <h1>Publish everywhere.<br><span class="hl">Think in one place.</span></h1>
      <p class="lede">LionPost turns one idea into posts, articles, pins and vertical video, schedules them across your channels, and gives you a room full of people solving the same problem.</p>
      <div class="hero-cta">
        <a class="btn lg" href="/register">Start free ${icon('arrow', 17)}</a>
        <a class="btn ghost lg" href="/tools">See all 16 tools</a>
      </div>
      <div class="hero-proof">
        <div class="avatar-stack">
          ${avatar({ name: 'Aria Bennett', avatar_color: '#6EE7B7' }, 26)}
          ${avatar({ name: 'Diego Alvarez', avatar_color: '#93C5FD' }, 26)}
          ${avatar({ name: 'Priya Nair', avatar_color: '#FCA5A5' }, 26)}
          ${avatar({ name: 'Tomas Novak', avatar_color: '#C4B5FD' }, 26)}
        </div>
        <span><b>${fmt(stats.members)}</b> creators · ${fmt(stats.threads)} threads · ${fmt(stats.posts)} posts shipped</span>
      </div>
      <div class="hero-stats">
        <div><b>0</b><span>card required</span></div>
        <div><b>16</b><span>tools, one login</span></div>
        <div><b>AES-256</b><span>keys encrypted</span></div>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="mock main">
        <div class="mock-top"><i class="dot"></i><i class="dot"></i><i class="dot"></i><span class="mock-title">lionpost / studio</span></div>
        <div class="mock-body">
          <div class="mock-composer">
            <div class="mock-text">“Most advice about publishing starts with a tool. It should start with the decision behind it.”<span class="caret"></span></div>
            <div class="chan-row">
              <span class="chan on"><i></i> Instagram</span>
              <span class="chan on"><i></i> X</span>
              <span class="chan on"><i></i> Telegram</span>
              <span class="chan"><i></i> Pinterest</span>
            </div>
            <div class="mock-foot">
              <span class="chip gold">${icon('bolt', 12)} queued 09:00</span>
              <span class="mono dim">1 of 6</span>
            </div>
          </div>
          <div class="queue">
            <div class="queue-item"><b>Mon</b> The boring half of content queues <span class="tick">sent</span></div>
            <div class="queue-item"><b>Wed</b> Carousel: three decisions <span class="tick">sent</span></div>
            <div class="queue-item"><b>Fri</b> Article: a weekly review <span class="mono">draft</span></div>
          </div>
        </div>
      </div>
      <div class="float-card one">
        <span class="mono dim">PARITY OF EFFORT</span>
        <div class="spark">
          <i style="height:30%"></i><i style="height:46%"></i><i style="height:38%"></i><i style="height:62%"></i><i style="height:78%"></i><i style="height:58%"></i><i style="height:90%"></i>
        </div>
        <div class="row" style="justify-content:space-between;margin-top:6px"><span class="dim">posts / week</span><b>+41%</b></div>
      </div>
      <div class="float-card two">
        <div class="row"><span class="status-dot"></span><b>3 channels connected</b></div>
        <p class="dim" style="margin-top:6px;font-size:11.5px">Instagram · X · Telegram<br>Next run in 41 minutes</p>
      </div>
    </div>
  </div>
</section>

<div class="stats-band">
  <div class="shell stats-grid">
    <div class="stat-cell"><b>${fmt(stats.members)}</b><span>members in the Lounge</span><em>one account, every tool</em></div>
    <div class="stat-cell"><b>${fmt(stats.posts)}</b><span>posts shipped by the queue</span><em>dry runs included</em></div>
    <div class="stat-cell"><b>${fmt(stats.articles)}</b><span>articles generated</span><em>exportable HTML</em></div>
    <div class="stat-cell"><b>${fmt(stats.videos)}</b><span>vertical videos made</span><em>rendered on device</em></div>
  </div>
</div>

<section class="section" id="how">
  <div class="shell">
    <div class="section-head">
      <div><span class="eyebrow">Why bundle it</span><h2>Five subscriptions, four logins, one exhausted person.</h2></div>
      <p>Most creator stacks grew sideways. A scheduler here, a keyword tool there, a design app somewhere else. LionPost is one workspace where the writing, the making and the scheduling share the same idea.</p>
    </div>
    <div class="split-3">
      <div class="feature"><div class="fic">${icon('pen', 19)}</div><h3>Write once, adapt everywhere</h3><p>A caption, a thread, a carousel and an article are different shapes of the same argument. The studio keeps them in one place.</p></div>
      <div class="feature"><div class="fic">${icon('bolt', 19)}</div><h3>A queue you can audit</h3><p>Every run has the text it used, the platform it targeted and the result. No black box, no mystery posts at 3am.</p></div>
      <div class="feature"><div class="fic">${icon('users', 19)}</div><h3>People, not a content library</h3><p>When the queue is empty and the numbers are flat, the Lounge is the part that helps. Ask a question, get an answer from someone who tried it.</p></div>
    </div>
  </div>
</section>

<section class="section tight" id="tools">
  <div class="shell">
    <div class="section-head">
      <div><span class="eyebrow">Everything included</span><h2>Sixteen tools. One login. No card.</h2></div>
      <a class="btn ghost sm" href="/tools">Open the tool index ${icon('arrow', 14)}</a>
    </div>
    <div class="tools-grid">${TOOLS.map(toolCard)}</div>
  </div>
</section>

<section class="section community-band">
  <div class="shell">
    <div class="section-head">
      <div><span class="eyebrow">The Lounge</span><h2>The community comes first.</h2><p>Honest numbers, teardowns, and the questions people are slightly embarrassed to ask. Reading is open to everyone.</p></div>
      <a class="btn ghost sm" href="/community">Open the community ${icon('arrow', 14)}</a>
    </div>
    <div class="grid g2" style="gap:12px">
      ${threads.map(threadMini)}
    </div>
  </div>
</section>

<section class="section">
  <div class="shell">
    <div class="section-head"><div><span class="eyebrow">The loop</span><h2>Four steps, then it runs without you.</h2></div></div>
    <div class="steps">
      <div class="step"><div class="num">01</div><h3>Make one account</h3><p>It opens every tool and the community. No card, no trial countdown.</p></div>
      <div class="step"><div class="num">02</div><h3>Connect what you have</h3><p>Instagram, a Facebook Page, X, Telegram, Pinterest, TikTok, YouTube or your own webhook.</p></div>
      <div class="step"><div class="num">03</div><h3>Write one idea</h3><p>The studio turns it into a caption, a thread, a carousel or a full article. Edit before it ships.</p></div>
      <div class="step"><div class="num">04</div><h3>Set it and leave it</h3><p>Pick a cadence. The queue writes, renders and delivers, and logs every attempt.</p></div>
    </div>
  </div>
</section>

<section class="section tight">
  <div class="shell">
    <div class="section-head">
      <div><span class="eyebrow">From the blog</span><h2>Notes from building this in public.</h2></div>
      <a class="btn ghost sm" href="/blog">Read the blog ${icon('arrow', 14)}</a>
    </div>
    <div class="blog-strip">${blog.map(blogCard)}</div>
  </div>
</section>

<section class="section">
  <div class="shell" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:44px;align-items:start" id="faq">
    <div>
      <span class="eyebrow">Questions</span>
      <h2 style="font-size:clamp(30px,3.4vw,42px);letter-spacing:-.04em;margin-top:12px">The things people ask before signing up.</h2>
      <p class="muted" style="margin-top:12px;max-width:32em">Still curious? Ask in the Lounge. Someone answers most days, and the answer stays findable.</p>
      <a class="btn ghost sm" href="/community/category/questions" style="margin-top:20px">Ask a question ${icon('arrow', 14)}</a>
    </div>
    <div class="faq">
      <details open><summary>Is LionPost really free?</summary><p>Yes. Every tool is free, with no card and no trial. The heavy AI features work offline on a built-in engine. If you want to use your own Gemini key, you can add one in settings and it is stored encrypted.</p></details>
      <details><summary>What can it actually do?</summary><p>Write captions, threads and long articles; design carousels and pins; render vertical video; research keywords; score a page for answer engines; read your RSS feed and queue every new item; and schedule all of it across the channels you connect.</p></details>
      <details><summary>Do I need one account for everything?</summary><p>Yes, and that is the point. One login opens the studio, the scheduler, the research tools and the community.</p></details>
      <details><summary>Where do my videos go?</summary><p>Nowhere. They are rendered in your browser and downloaded straight to your device. The server only stores the script if you ask it to.</p></details>
      <details><summary>Is my data safe?</summary><p>Passwords are hashed with scrypt, sessions are HTTP-only cookies, and third-party tokens are encrypted with AES-256-GCM. Nothing posts unless you set it up.</p></details>
      <details><summary>What happens when a connected account fails?</summary><p>The run is marked failed with the exact response, the automation keeps its schedule, and you can retry from the run log.</p></details>
    </div>
  </div>
</section>

<section class="section tight">
  <div class="shell">
    <div class="cta-band">
      <span class="eyebrow" style="justify-content:center">Start with one account</span>
      <h2 style="margin-top:14px">The queue is empty. Let's fix that.</h2>
      <p>Every tool, the community and an honest run log. Free, no card.</p>
      <div class="row" style="justify-content:center">
        <a class="btn lg" href="/register">Create your account ${icon('arrow', 17)}</a>
        <a class="btn ghost lg" href="/login">I already have one</a>
      </div>
    </div>
  </div>
</section>`,
  });
}

export function toolsIndex({ user, flash }) {
  const groups = ['Create', 'Automate', 'Research', 'People'];
  return sitePage({
    title: 'All 16 free tools · LionPost',
    description: 'The full LionPost tool index: video, carousels, pins, articles, social scheduling, keyword research, an AEO checker and a creator community.',
    user, active: '/tools', flash,
    body: html`
<section class="tool-hero"><div class="shell">
  <span class="eyebrow">Free tools, no card</span>
  <h1>Sixteen tools that share one login, one queue and one idea of what “done” means.</h1>
  <p class="lede">Each tool has its own page and its own job. They all write to the same workspace, so a keyword can become an article, an article can become a carousel, and a carousel can be scheduled without leaving the tab.</p>
</div></section>
<section class="section tight"><div class="shell" style="display:grid;gap:38px">
  ${groups.map((g) => html`<div>
    <div class="spread" style="margin-bottom:14px"><h2 style="font-size:20px;letter-spacing:-.02em">${g}</h2><span class="chip">${TOOLS.filter((t) => t.group === g).length} tools</span></div>
    <div class="tools-grid">${TOOLS.filter((t) => t.group === g).map(toolCard)}</div>
  </div>`)}
</div></section>`,
  });
}

export function toolPage(t, { user, flash }) {
  const demo = ['keyword-research', 'aeo-checker'].includes(t.slug);
  return sitePage({
    title: `${t.name}: ${t.tagline} · LionPost`,
    description: t.lede.slice(0, 170),
    user, active: '/tools', flash,
    scripts: ['/assets/js/tools.js'],
    body: html`
<section class="tool-hero"><div class="shell">
  <span class="eyebrow">Free tool · no card</span>
  <h1>${t.name}: ${t.tagline}</h1>
  <p class="lede">${t.lede}</p>
  <div class="tool-meta">
    ${t.stats.map(([a, b]) => html`<span class="chip gold">${a} ${b}</span>`)}
    <a class="btn sm" href="${t.appPath}">Open ${t.name} ${icon('arrow', 14)}</a>
    <a class="btn ghost sm" href="/register">Make a free account</a>
  </div>
</div></section>
<section class="tool-body"><div class="shell" style="display:contents">
  <div>
    <h2>What you can do</h2>
    <ul class="tool-list">
      ${t.bullets.map((b) => html`<li>${icon('check', 16)}<span>${b}</span></li>`)}
    </ul>
    <div class="grid g3" style="margin-top:26px">
      ${t.stats.map(([a, b]) => html`<div class="stat"><p>${b}</p><b>${a}</b></div>`)}
    </div>
    <h2 style="margin-top:38px">Questions</h2>
    <div class="faq">
      ${t.faq.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}
    </div>
  </div>
  <aside>
    ${demo ? html`<div class="demo-box-card" data-demo="${t.slug}">
      <h3>Try it right here</h3>
      <p>${t.slug === 'keyword-research' ? 'Five keywords, no account. The full list and export live in the app.' : 'One page, scored out of 100. Paste HTML if a site blocks bots.'}</p>
      <form data-demo-form="${t.slug}">
        ${t.slug === 'keyword-research'
          ? html`<label class="field"><span class="field-label">Topic</span><input name="seed" placeholder="e.g. content automation" required maxlength="60"></label>`
          : html`<label class="field"><span class="field-label">Page URL or HTML</span><textarea name="target" rows="4" placeholder="https://your-site.com/article or paste the HTML" required></textarea></label>`}
        <button class="btn block" type="submit" style="margin-top:12px">${t.slug === 'keyword-research' ? 'Research keywords' : 'Check the page'} ${icon('spark', 15)}</button>
      </form>
      <div class="demo-out" data-demo-out style="margin-top:14px"></div>
      <p class="dim small" style="margin-top:12px">${t.slug === 'keyword-research' ? 'Volume and difficulty are estimates, good for comparing phrases.' : 'Runs the same 18 checks as the app, without saving the report.'}</p>
    </div>` : html`<div class="demo-box-card">
      <h3>Open it in the workspace</h3>
      <p>This one needs your account so it can save drafts and queue runs.</p>
      <a class="btn block" href="${t.appPath}">Open ${t.name} ${icon('arrow', 15)}</a>
      <div class="hr"></div>
      <div class="kv">
        <dt>Login</dt><dd>One account for all 16 tools</dd>
        <dt>Price</dt><dd>Free, no card</dd>
        <dt>Saves</dt><dd>Drafts, runs, exports</dd>
      </div>
    </div>`}
    <div class="demo-box-card" style="margin-top:14px">
      <h3>Other tools</h3>
      <div class="stack" style="gap:8px;margin-top:10px">
        ${TOOLS.filter((x) => x.slug !== t.slug).slice(0, 5).map((x) => html`<a class="row" href="/tools/${x.slug}" style="font-size:13px;color:var(--muted)">${icon(x.icon, 15)} ${x.name}</a>`)}
        <a class="row" href="/tools" style="font-size:13px;color:var(--gold-2);margin-top:4px">All 16 tools ${icon('arrow', 14)}</a>
      </div>
    </div>
  </aside>
</div></section>`,
  });
}

function shareRow({ url, title, compact = false }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    ['X', `https://x.com/intent/tweet?text=${t}&url=${u}`, 'share-x'],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`, 'share-fb'],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, 'share-li'],
    ['Reddit', `https://www.reddit.com/submit?url=${u}&title=${t}`, 'share-rd'],
  ];
  return html`<div class="share-row ${compact ? 'compact' : ''}">
    <span class="share-label">Share</span>
    ${links.map(([label, href, cls]) => html`<a class="share-btn ${cls}" href="${href}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`)}
    <button type="button" class="share-btn" data-copy-url data-copy-text="${url}">Copy link</button>
  </div>`;
}

function tagStrip(tags, active = '') {
  if (!tags.length) return '';
  return html`<div class="tag-strip" role="navigation" aria-label="Filter posts by topic">
    <a class="chip ${active ? '' : 'gold'}" href="/blog">All posts</a>
    ${tags.map((t) => html`<a class="chip ${active === t.tag ? 'gold' : ''}" href="/blog/tag/${encodeURIComponent(t.tag)}">${t.tag}<span class="tag-n">${t.n}</span></a>`)}
  </div>`;
}

export function blogIndex({ user, posts, flash, tags = [], tag = '' }) {
  return sitePage({
    title: tag ? `${tag} posts · LionPost blog` : 'Blog · LionPost',
    description: 'Notes on publishing alone: queues, weekly reviews, answer engines and the boring half of automation.',
    user, active: '/blog', flash,
    body: html`
<section class="tool-hero"><div class="shell">
  <span class="eyebrow">The blog</span>
  <h1>${tag ? `${tag} posts.` : 'Notes from the boring half of publishing.'}</h1>
  <p class="lede">${tag
    ? `Everything filed under ${tag}. Same rule as the rest of the blog: specific, short, no growth theatre.`
    : 'Short, specific posts about keeping a queue alive, reading your own numbers, and getting quoted by machines. No growth theatre.'}</p>
  ${tagStrip(tags, tag)}
</div></section>
<section class="section tight"><div class="shell">
  ${posts.length
    ? html`<div class="blog-strip">${posts.map(blogCard)}</div>`
    : html`<div class="empty"><h3>Nothing filed here yet</h3><p>Try another topic, or <a href="/blog">read everything</a>.</p></div>`}
</div></section>`,
  });
}

export function blogPost({ user, post, others, flash, canonical = '' }) {
  const faq = [];
  const faqMatches = [...String(post.body_html).matchAll(/<h3>(.*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)];
  for (const m of faqMatches) faq.push({ q: m[1].replace(/<[^>]+>/g, ''), a: m[2].replace(/<[^>]+>/g, '').trim() });
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting', headline: post.title, description: post.excerpt,
        datePublished: post.published_at, dateModified: post.published_at,
        author: { '@type': 'Organization', name: 'LionPost' },
        publisher: { '@type': 'Organization', name: 'LionPost' },
        mainEntityOfPage: `${canonical || `/blog/${post.slug}`}`,
      },
      ...(faq.length ? [{ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
    ],
  };
  return sitePage({
    title: `${post.title} · LionPost`,
    description: post.excerpt,
    user, active: '/blog', flash,
    canonical: canonical || `/blog/${post.slug}`,
    extraHead: `<meta property="og:type" content="article"><script type="application/ld+json">${JSON.stringify(schema).replaceAll('</', '<\\/')}</script>`,
    body: html`
<article class="section"><div class="shell" style="max-width:760px">
  <a class="small dim" href="/blog">← All posts</a>
  <div class="row" style="margin:18px 0 12px"><a class="chip gold" href="/blog/tag/${encodeURIComponent(post.tag)}">${post.tag}</a><span class="dim small">${post.read_minutes} min read · ${dateLong(post.published_at)}</span></div>
  <h1 style="font-size:clamp(32px,4.4vw,48px);letter-spacing:-.04em;line-height:1.06">${post.title}</h1>
  <p class="lede" style="margin-top:16px">${post.excerpt}</p>
  <div class="hr"></div>
  <div class="md post-body">${raw(post.body_html)}</div>
  <div class="hr"></div>
  ${shareRow({ url: canonical || `/blog/${post.slug}`, title: post.title })}
  <div class="hr"></div>
  <div class="card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
    <div class="grow"><h3 style="font-size:16px">Get the next one in the queue</h3><p class="muted small" style="margin-top:4px">One account, sixteen tools, no card.</p></div>
    <a class="btn" href="/register">Start free</a>
  </div>
  <h3 style="margin:34px 0 12px;font-size:16px">Keep reading</h3>
  <div class="grid g2">${others.map((p) => html`<a class="thread-mini" href="/blog/${p.slug}"><div><h4>${p.title}</h4><div class="mini-meta"><span>${p.tag}</span><span>·</span><span>${p.read_minutes} min</span></div></div></a>`)}</div>
</div></article>`,
  });
}

export function aboutPage({ user, stats, flash }) {
  return sitePage({
    title: 'About · LionPost',
    description: 'Why LionPost exists, what it will not do, and how it is built.',
    user, active: '', flash,
    body: html`
<section class="tool-hero"><div class="shell" style="max-width:800px">
  <span class="eyebrow">About</span>
  <h1>Built for the person doing all of it.</h1>
  <p class="lede">LionPost started because publishing alone means being the writer, the designer, the scheduler and the analyst, usually in the same hour. The tools were never the hard part. The context switching was.</p>
</div></section>
<section class="section tight"><div class="shell" style="max-width:760px;display:grid;gap:20px">
  <div class="card pad-lg"><h2 style="font-size:22px;margin-bottom:10px">What this is</h2>
    <p class="muted">An independent workspace: sixteen tools under one login, plus a forum where the people using them compare notes. ${number(stats.members)} members, ${number(stats.threads)} threads, ${number(stats.posts)} runs logged.</p></div>
  <div class="card pad-lg"><h2 style="font-size:22px;margin-bottom:10px">What it will not do</h2>
    <ul class="tool-list">
      <li>${icon('check', 16)}<span>It will not post anywhere you have not connected.</span></li>
      <li>${icon('check', 16)}<span>It will not invent quotes, reviews or statistics to fill a draft.</span></li>
      <li>${icon('check', 16)}<span>It will not upload your video. Rendering happens in your browser.</span></li>
      <li>${icon('check', 16)}<span>It will not pretend a dry run reached a platform.</span></li>
    </ul></div>
  <div class="card pad-lg"><h2 style="font-size:22px;margin-bottom:10px">How it is built</h2>
    <p class="muted">A small Node service, SQLite, server-rendered pages and vanilla JavaScript. No bundler, no tracking scripts, no third-party analytics. The content engine is deterministic and runs offline; add your own Gemini key if you want a second opinion.</p></div>
  <div class="cta-band" style="margin-top:10px"><h2 style="font-size:30px">See it with your own queue.</h2><p>Free account, no card.</p><a class="btn" href="/register">Start free ${icon('arrow', 16)}</a></div>
</div></section>`,
  });
}

export function legalPage({ user, kind, flash }) {
  const terms = kind === 'terms';
  const sections = terms ? [
    ['The deal', 'LionPost is provided as-is, free of charge. You keep everything you create. We do not claim a licence to your content beyond storing and delivering it at your request.'],
    ['Your account', 'One person, one account. Keep your password to yourself. You are responsible for what is posted through your connected channels.'],
    ['Acceptable use', 'No spam, no impersonation, no scraping other people’s private data, no bulk posting to channels you do not own. Automated posting must respect the destination platform’s rules.'],
    ['Third-party services', 'Connecting a platform means their terms apply too. Tokens are stored encrypted and used only to deliver what you scheduled.'],
    ['Cancellation', 'There is nothing to cancel. Delete your account and the workspace goes with it.'],
    ['Liability', 'The service may be unavailable or wrong. It is provided without warranty, and our liability is limited to what you paid, which is nothing.'],
  ] : [
    ['What we store', 'Your name, email, a password hash (scrypt), the content you create, the run logs of your automations, and encrypted third-party tokens you choose to add.'],
    ['What we do not store', 'Rendered video frames, uploaded source video, or payment details. There are no payment details because there is no payment.'],
    ['Cookies', 'One session cookie (HTTP-only) and one CSRF cookie. No advertising cookies, no third-party analytics.'],
    ['Encryption', 'Platform tokens and API keys are encrypted with AES-256-GCM before they touch the database.'],
    ['Your choices', 'You can delete a connection, an automation, an article or your whole account from settings. Deletion is immediate.'],
    ['Contact', 'Privacy questions go through the community questions category or the address on the about page.'],
  ];
  return sitePage({
    title: `${terms ? 'Terms' : 'Privacy'} · LionPost`,
    description: terms ? 'The terms that apply to a free LionPost account.' : 'What LionPost stores, what it does not, and how to delete it.',
    user, flash,
    body: html`
<section class="section"><div class="shell" style="max-width:760px">
  <span class="eyebrow">Legal</span>
  <h1 style="font-size:clamp(30px,4vw,46px);margin:12px 0 10px">${terms ? 'Terms of use' : 'Privacy policy'}</h1>
  <p class="muted">Last updated 20 October 2026. Plain language on purpose.</p>
  <div class="hr"></div>
  <div class="stack" style="gap:22px">
    ${sections.map(([h, p]) => html`<div><h2 style="font-size:19px;margin-bottom:8px">${h}</h2><p class="muted">${p}</p></div>`)}
  </div>
  <div class="notice" style="margin-top:26px">This is a demo product document, not legal advice. If you operate this deployment, review it with a lawyer before taking money or personal data at scale.</div>
</div></section>`,
  });
}


const AUTH_COPY = {
  'forgot-ask': {
    title: 'Reset your password', sub: 'Enter the email on your account and we will send a one-hour reset link.',
    heading: 'Forgot the password?', cta: 'Send the reset link',
  },
  'forgot-sent': {
    title: 'Check your inbox', sub: 'If that address is on an account, the link is on its way.',
    heading: 'Link sent', cta: null,
  },
  'reset-fresh': {
    title: 'Choose a new password', sub: 'Pick something at least eight characters long, then sign in again.',
    heading: 'New password', cta: 'Save and sign in',
  },
  'reset-bad': {
    title: 'Link expired', sub: 'That reset link is used, expired, or never existed.',
    heading: 'Start again', cta: null,
  },
};

function resetCard({ mode, csrf, flash, token = '', devLink = '' }) {
  const copy = AUTH_COPY[mode];
  const body = html`
    <form method="post" action="/forgot">
      ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
      <label class="field"><span class="field-label">Email</span>
        <input type="email" name="email" required autocomplete="email" placeholder="you@example.com">
      </label>
      <button class="btn block" type="submit">${copy.cta} ${icon('arrow', 16)}</button>
    </form>`;
  const resetForm = html`
    <form method="post" action="/reset">
      ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
      <input type="hidden" name="token" value="${token}">
      <label class="field"><span class="field-label">New password</span>
        <input type="password" name="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters">
      </label>
      <label class="field"><span class="field-label">Say it again</span>
        <input type="password" name="confirm" required minlength="8" autocomplete="new-password" placeholder="Same password">
      </label>
      <button class="btn block" type="submit">${copy.cta} ${icon('arrow', 16)}</button>
    </form>`;
  return sitePage({
    title: `${copy.title} · LionPost`,
    description: copy.sub,
    user: null, flash, bodyClass: 'auth-body',
    body: html`
<div class="auth-wrap solo">
  <main class="auth-main">
    <div class="auth-card">
      ${brand(30)}
      <h1 style="margin-top:22px">${copy.heading}</h1>
      <p>${copy.sub}</p>
      ${mode === 'forgot-ask' ? body : ''}
      ${mode === 'reset-fresh' ? resetForm : ''}
      ${mode === 'forgot-sent' ? html`
        <div class="demo-box">
          <strong style="color:var(--text)">No mail server in this build</strong><br>
          Reset messages are printed to the server log.${devLink ? html`<br><br><a href="${devLink}" style="color:var(--gold-2);word-break:break-all">Open the reset link</a><br><span class="dim">Shown because you are on localhost.</span>` : ''}
        </div>` : ''}
      ${mode === 'reset-bad' ? html`
        <p class="auth-alt"><a href="/forgot">Request a fresh link</a></p>` : ''}
      <p class="auth-alt"><a href="/login">Back to sign in</a></p>
    </div>
  </main>
</div>`,
  });
}

export function authPage({ mode, user, flash, next = '', csrf = '', token = '', devLink = '' }) {
  if (AUTH_COPY[mode]) return resetCard({ mode, csrf, flash, token, devLink });
  const isRegister = mode === 'register';
  return sitePage({
    title: `${isRegister ? 'Create your account' : 'Sign in'} · LionPost`,
    description: isRegister ? 'One free account opens all sixteen LionPost tools and the community.' : 'Sign in to LionPost.',
    user: null, flash, bodyClass: 'auth-body',
    body: html`
<div class="auth-wrap">
  <aside class="auth-side">
    ${brand(32)}
    <div>
      <span class="eyebrow">One login</span>
      <h2>Write one idea. Send it everywhere.</h2>
      <p>Connect your channels once. Then post to all of them from one screen, now or later, with every run logged and reversible.</p>
      <div class="auth-points">
        <div class="auth-point">${icon('check', 16)}<span>Instagram, Facebook, X, Telegram, Pinterest, TikTok, YouTube and webhooks</span></div>
        <div class="auth-point">${icon('check', 16)}<span>Pick a day and time; the queue handles it</span></div>
        <div class="auth-point">${icon('check', 16)}<span>Tokens encrypted with AES-256-GCM, used only to post</span></div>
        <div class="auth-point">${icon('check', 16)}<span>Sixteen tools and the community on the same account</span></div>
      </div>
    </div>
    <div class="row" style="gap:10px">
      <div class="avatar-stack">
        ${avatar({ name: 'Aria B', avatar_color: '#6EE7B7' }, 28)}
        ${avatar({ name: 'Diego A', avatar_color: '#93C5FD' }, 28)}
        ${avatar({ name: 'Priya N', avatar_color: '#FCA5A5' }, 28)}
      </div>
      <span class="small dim">5,480+ creators publish here</span>
    </div>
  </aside>
  <main class="auth-main">
    <div class="auth-card">
      <h1>${isRegister ? 'Make your account' : 'Welcome back'}</h1>
      <p>${isRegister ? 'Free, no card, about a minute.' : 'Sign in and pick up the queue where you left it.'}</p>
      <form method="post" action="${isRegister ? '/register' : '/login'}">
        ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
        <input type="hidden" name="next" value="${next}">
        ${isRegister ? html`<label class="field"><span class="field-label">Your name</span><input name="name" required maxlength="60" autocomplete="name" placeholder="Alex Rivera"></label>` : ''}
        <label class="field"><span class="field-label">Email</span><input type="email" name="email" required autocomplete="email" placeholder="you@example.com" value="${isRegister ? '' : ''}"></label>
        <label class="field"><span class="field-label">Password</span><input type="password" name="password" required minlength="8" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="At least 8 characters"></label>
        ${isRegister ? html`<label class="check"><input type="checkbox" name="terms" value="1" required><span>I agree to the <a href="/terms" style="color:var(--gold-2)">terms</a> and the <a href="/privacy" style="color:var(--gold-2)">privacy policy</a>.</span></label>` : ''}
        <button class="btn block" type="submit">${isRegister ? 'Create my account' : 'Sign in'} ${icon('arrow', 16)}</button>
      </form>
      <p class="auth-alt">${isRegister ? html`Already have an account? <a href="/login">Sign in</a>` : html`New here? <a href="/register">Make a free account</a> · <a href="/forgot">Forgot password?</a>`}</p>
      <div class="demo-box">
        <strong style="color:var(--text)">Demo account</strong><br>
        Email <code>demo@lionpost.local</code> · password <code>demo1234</code><br>
        <span class="dim">Seeded with connections, automations, runs and drafts.</span>
      </div>
    </div>
  </main>
</div>`,
  });
}

export function videosIndex({ user, videos, flash }) {
  return sitePage({
    title: 'Videos · LionPost',
    description: 'Short vertical videos on publishing, filmed as scripts and rendered in the browser. No watermark, no upload.',
    user, active: '/videos', flash,
    body: html`
<section class="tool-hero"><div class="shell">
  <span class="eyebrow">The shelf</span>
  <h1>Thirty-five seconds, one idea.</h1>
  <p class="lede">Every clip here is a script the studio wrote and the browser rendered. Click one to play it: the player draws each scene on a canvas, so nothing is streamed and nothing is stored.</p>
  <div class="row"><a class="btn" href="/app/videos">${icon('video', 16)} Make one</a><a class="btn ghost" href="/tools/ai-video-maker">How the tool works</a></div>
</div></section>
<section class="section tight"><div class="shell">
  <div class="video-grid">
    ${videos.map((v) => html`<a class="video-card" href="/videos/${v.slug}">
      <div class="video-thumb" style="--vc:${v.palette === 'mint' ? '#6EE7B7' : v.palette === 'sky' ? '#93C5FD' : v.palette === 'rose' ? '#FCA5A5' : '#F5B942'}">
        ${icon('play', 26)}
        <span class="video-dur">${Math.floor(v.duration_seconds / 60)}:${String(v.duration_seconds % 60).padStart(2, '0')}</span>
      </div>
      <div class="video-meta">
        <span class="chip">${v.tag}</span>
        <h3>${v.title}</h3>
        <p>${v.summary}</p>
        <span class="dim small">${number(v.views)} views · ${dateLong(v.published_at)}</span>
      </div>
    </a>`)}
  </div>
</div></section>`,
  });
}

export function videoWatch({ user, video, more, flash, canonical = '' }) {
  const scenes = JSON.parse(video.scenes);
  const payload = JSON.stringify({ scenes, palette: video.palette, title: video.title }).replaceAll('</', '<\\/');
  const duration = `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, '0')}`;
  return sitePage({
    title: `${video.title} · LionPost`,
    description: video.summary,
    user, active: '/videos', flash, canonical,
    scripts: ['/assets/js/video.js'],
    extraHead: `<meta property="og:type" content="video.other">`,
    body: html`
<script type="application/ld+json">${raw(JSON.stringify({
  '@context': 'https://schema.org', '@type': 'VideoObject',
  name: video.title, description: video.summary, duration: `PT${video.duration_seconds}S`,
  uploadDate: video.published_at, thumbnailUrl: `${canonical || ''}/assets/icons/icon-512.png`,
}))}</script>
<section class="section"><div class="shell watch-layout">
  <div class="stack">
    <div class="video-stage watch-stage"><canvas data-video-canvas width="1080" height="1920"></canvas></div>
    <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn" data-video-play>${icon('play', 15)} Play</button>
      <button class="btn ghost" data-video-record>${icon('download', 14)} Record &amp; save</button>
      <span class="small dim" data-video-status>Ready. ${scenes.length} scenes, ${duration}.</span>
    </div>
  </div>
  <div class="stack">
    <a class="small dim" href="/videos">← All videos</a>
    <h1 style="font-size:clamp(26px,3vw,36px)">${video.title}</h1>
    <div class="row"><span class="chip gold">${video.tag}</span><span class="dim small">${duration} · ${number(video.views)} views · ${dateLong(video.published_at)}</span></div>
    <p class="muted">${video.summary}</p>
    ${shareRow({ url: canonical || `/videos/${video.slug}`, title: video.title })}
    <div class="card">
      <div class="card-title"><h3>Script</h3><span class="chip">${scenes.length} scenes</span></div>
      <ol class="script-list">${scenes.map((sc) => html`<li><b>${sc.text}</b><span>${sc.sub || ''} · ${sc.seconds}s</span></li>`)}</ol>
    </div>
    <div class="notice">${icon('shield', 14)} Rendered on your device from this script. Nothing is uploaded, and the download is a WebM you can post anywhere.</div>
  </div>
</div></section>
<section class="section tight"><div class="shell">
  <h2 style="font-size:20px;margin-bottom:14px">More from the shelf</h2>
  <div class="video-grid">${more.map((v) => html`<a class="video-card" href="/videos/${v.slug}">
    <div class="video-thumb small" style="--vc:${v.palette === 'mint' ? '#6EE7B7' : v.palette === 'sky' ? '#93C5FD' : v.palette === 'rose' ? '#FCA5A5' : '#F5B942'}">${icon('play', 18)}</div>
    <div class="video-meta"><h4>${v.title}</h4><span class="dim small">${v.tag}</span></div>
  </a>`)}</div>
</div></section>
<script type="application/json" data-video-data>${raw(payload)}</script>`,
  });
}
