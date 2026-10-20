import { html, raw, icon, avatar, timeAgo, number, dateLong, esc } from './ui.js';
import { sitePage } from './layout.js';
import { renderMarkdown, stripMarkdown } from '../lib/markdown.js';

function sidebar({ categories, counts, activeCat, top }) {
  return html`<aside>
    <div class="sidebar-card">
      <h4>Categories</h4>
      <a class="cat-link ${!activeCat ? 'on' : ''}" href="/community">${icon('grid', 14)} Everything <span class="count">${counts.all}</span></a>
      ${categories.map((c) => html`<a class="cat-link ${activeCat === c.slug ? 'on' : ''}" href="/community/category/${c.slug}">
        <span>${c.emoji}</span> ${c.name} <span class="count">${c.count}</span>
      </a>`)}
    </div>
    <div class="sidebar-card">
      <h4>Who is around</h4>
      ${top.map((u) => html`<a class="cat-link" href="/u/${u.handle}">${avatar(u, 22)} <span>${u.name}</span><span class="count">${u.posts}</span></a>`)}
    </div>
    <div class="sidebar-card">
      <h4>House rules</h4>
      <p class="small muted" style="line-height:1.55">Answer the question that was asked. Say when you are guessing. No links in the first reply. Disagree with the idea, not the person.</p>
    </div>
    <div class="sidebar-card" style="background:linear-gradient(180deg,rgba(245,185,66,.1),rgba(255,255,255,.02))">
      <h4 style="color:var(--gold-2)">New here?</h4>
      <p class="small muted" style="line-height:1.55;margin-bottom:10px">Post an intro in Showcase. People answer faster when they know what you are building.</p>
      <a class="btn sm block" href="/community/new">Start a thread</a>
    </div>
  </aside>`;
}

function threadRow(p, user) {
  const excerpt = stripMarkdown(p.body).slice(0, 190);
  return html`<article class="thread">
    <div class="votes">
      <form method="post" action="/community/${p.slug}/like">
        ${raw(`<input type="hidden" name="_csrf" value="${esc(user?.csrf || '')}">`)}
        <button class="${p.liked ? 'on' : ''}" title="${user ? 'Like this thread' : 'Sign in to like'}" ${user ? '' : raw('disabled')}>${icon('heart', 15)}</button>
      </form>
      <b>${p.likes}</b>
    </div>
    <div class="thread-main">
      <h3><a href="/community/${p.slug}">${p.title}</a>
        ${p.pinned ? html`<span class="chip gold" style="vertical-align:2px">${icon('pin', 11)} pinned</span>` : ''}
        ${p.locked ? html`<span class="chip" style="vertical-align:2px">${icon('lock', 11)} locked</span>` : ''}
      </h3>
      <p class="excerpt">${excerpt}</p>
      <div class="thread-foot">
        <span class="who">${avatar({ name: p.author, avatar_color: p.avatar_color }, 20)} <a href="/u/${p.handle}">${p.author}</a></span>
        <span>${timeAgo(p.created_at)}</span>
        ${p.category ? html`<a class="chip" href="/community/category/${p.category_slug}">${p.emoji} ${p.category}</a>` : ''}
        <span>${icon('comment', 13)} ${p.comments} ${p.comments === 1 ? 'reply' : 'replies'}</span>
        <span>${number(p.views)} views</span>
      </div>
    </div>
  </article>`;
}

export function communityIndex({ user, csrf, posts, categories, counts, activeCat, q, sort, top, flash, pageNo = 1, pages = 1 }) {
  const active = categories.find((c) => c.slug === activeCat);
  return sitePage({
    title: `${active ? active.name : 'The Lounge'} · LionPost community`,
    description: 'Questions, automation notes, honest numbers and teardowns from people publishing alone.',
    user, active: '/community', flash,
    body: html`
<div class="shell comm-layout">
  <div>
    <div class="comm-head">
      <div>
        <span class="eyebrow">Community</span>
        <h1>${active ? `${active.emoji} ${active.name}` : 'The Lounge'}</h1>
        <p>${active ? active.description : 'Share strategies, ask the question you think is obvious, and post the numbers nobody else posts. Reading is open to everyone.'}</p>
      </div>
      <a class="btn" href="/community/new">${icon('plus', 15)} New thread</a>
    </div>

    <form class="comm-toolbar" method="get" action="/community${active ? '/category/' + active.slug : ''}">
      <label class="search-box">${icon('search', 16)}<input name="q" value="${q || ''}" placeholder="Search threads, people, answers" aria-label="Search"></label>
      <div class="pill-tabs">
        <a href="?sort=new${q ? '&q=' + encodeURIComponent(q) : ''}" class="${sort !== 'top' ? 'on' : ''}">Newest</a>
        <a href="?sort=top${q ? '&q=' + encodeURIComponent(q) : ''}" class="${sort === 'top' ? 'on' : ''}">Top</a>
      </div>
    </form>

    ${!user ? html`<div class="notice" style="margin-bottom:16px">${icon('eye', 14)} Reading is open. <a href="/register" style="color:var(--gold-2)">Make a free account</a> to post, reply and like.</div>` : ''}
    ${q ? html`<p class="small dim" style="margin-bottom:12px">${posts.length} result${posts.length === 1 ? '' : 's'} for “${q}”</p>` : ''}

    ${posts.length ? posts.map((p) => threadRow(p, { ...user, csrf })) : html`<div class="empty"><h3>Nothing here yet</h3><p>${q ? 'No threads match that search.' : 'Be the first to start a thread in this category.'}</p><a class="btn sm" href="/community/new">Start a thread</a></div>`}

    ${pages > 1 ? html`<div class="row" style="justify-content:center;margin-top:20px">
      ${Array.from({ length: pages }, (_, i) => html`<a class="btn sm ${i + 1 === pageNo ? '' : 'ghost'}" href="?page=${i + 1}${q ? '&q=' + encodeURIComponent(q) : ''}${sort ? '&sort=' + sort : ''}">${i + 1}</a>`)}
    </div>` : ''}
  </div>
  ${sidebar({ categories, counts, activeCat, top })}
</div>`,
  });
}

function commentNode(c, user, csrf, post) {
  return html`<div class="comment" id="c${c.id}">
    ${avatar({ name: c.author, avatar_color: c.avatar_color }, 32)}
    <div class="comment-body">
      <header><strong><a href="/u/${c.handle}">${c.author}</a></strong><span>${timeAgo(c.created_at)}</span>${c.author_id === post.user_id ? html`<span class="chip gold" style="font-size:10px;padding:1px 7px">author</span>` : ''}</header>
      <p>${c.body}</p>
      ${user && !post.locked ? html`<button class="reply-link" data-reply="${c.id}" data-reply-name="${c.author}">Reply</button>` : ''}
    </div>
  </div>`;
}

export function postPage({ user, csrf, post, comments, replies, related, flash }) {
  return sitePage({
    title: `${post.title} · LionPost community`,
    description: stripMarkdown(post.body).slice(0, 160),
    user, active: '/community', flash,
    scripts: ['/assets/js/community.js'],
    body: html`
<div class="shell comm-layout">
  <div>
    <a class="small dim" href="/community">← The Lounge</a>
    <article class="community-post" style="margin-top:14px">
      <div class="row" style="gap:8px;margin-bottom:12px;flex-wrap:wrap">
        ${post.category ? html`<a class="chip" href="/community/category/${post.category_slug}">${post.emoji} ${post.category}</a>` : ''}
        ${post.pinned ? html`<span class="chip gold">${icon('pin', 11)} pinned</span>` : ''}
        ${post.locked ? html`<span class="chip">${icon('lock', 11)} locked</span>` : ''}
      </div>
      <h1>${post.title}</h1>
      <div class="post-byline">
        ${avatar({ name: post.author, avatar_color: post.avatar_color }, 30)}
        <span><a href="/u/${post.handle}"><strong style="color:var(--text)">${post.author}</strong></a> · ${dateLong(post.created_at)} · ${number(post.views)} views</span>
      </div>
      <div class="md post-body">${raw(renderMarkdown(post.body))}</div>

      <div class="row" style="margin-top:22px;padding-top:16px;border-top:1px solid var(--line);gap:8px">
        <form method="post" action="/community/${post.slug}/like">
          ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
          <button class="btn sm ${post.liked ? 'soft' : 'ghost'}" ${user ? '' : raw('disabled')}>${icon('heart', 15)} ${post.liked ? 'Liked' : 'Like'} · ${post.likes}</button>
        </form>
        <a class="btn ghost sm" href="#reply">${icon('comment', 15)} Reply</a>
        ${(user && (user.id === post.user_id || user.role === 'admin')) ? html`
          <form method="post" action="/community/${post.slug}/pin">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn ghost sm">${icon('pin', 14)} ${post.pinned ? 'Unpin' : 'Pin'}</button></form>
          <form method="post" action="/community/${post.slug}/lock">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn ghost sm">${icon('lock', 14)} ${post.locked ? 'Unlock' : 'Lock'}</button></form>
          <form method="post" action="/community/${post.slug}/delete" onsubmit="return confirm('Delete this thread and its replies?')">${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}<button class="btn danger sm">${icon('trash', 14)} Delete</button></form>` : ''}
        <span class="dim small" style="margin-left:auto">${post.comments} replies</span>
      </div>
    </article>

    <section class="comments" id="replies">
      <h2 style="font-size:18px;margin-bottom:6px">${post.comments} ${post.comments === 1 ? 'reply' : 'replies'}</h2>
      ${comments.length ? comments.map((c) => html`
        ${commentNode(c, user, csrf, post)}
        ${(replies[c.id] || []).map((r) => html`<div class="comment reply">${avatar({ name: r.author, avatar_color: r.avatar_color }, 30)}<div class="comment-body"><header><strong><a href="/u/${r.handle}">${r.author}</a></strong><span>${timeAgo(r.created_at)}</span></header><p>${r.body}</p></div></div>`)}
      `) : html`<p class="muted" style="padding:18px 0 6px">No replies yet. Be useful.</p>`}

      <div id="reply"></div>
      ${post.locked ? html`<div class="notice">${icon('lock', 14)} This thread is locked. New replies are closed.</div>`
        : user ? html`<form class="comment-form" method="post" action="/community/${post.slug}/comment" data-comment-form>
          ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
          <input type="hidden" name="parent_id" value="" data-parent>
          <div class="row small dim" data-reply-to style="display:none">Replying to <b data-reply-name></b> <button type="button" class="reply-link" data-cancel-reply>cancel</button></div>
          <label class="field"><span class="field-label">Your reply</span><textarea name="body" rows="4" required placeholder="Answer the question, or add what worked for you."></textarea></label>
          <div class="row"><button class="btn sm" type="submit">Post reply ${icon('arrow', 14)}</button><span class="dim small">Markdown works. Be kind.</span></div>
        </form>` : html`<div class="notice" style="margin-top:16px"><a href="/login?next=/community/${post.slug}" style="color:var(--gold-2)">Sign in</a> to join the conversation.</div>`}
    </section>
  </div>

  <aside>
    <div class="sidebar-card">
      <h4>About this thread</h4>
      <div class="kv">
        <dt>Started</dt><dd>${dateLong(post.created_at)}</dd>
        <dt>Category</dt><dd>${post.category || 'Uncategorised'}</dd>
        <dt>Views</dt><dd>${number(post.views)}</dd>
        <dt>Replies</dt><dd>${post.comments}</dd>
      </div>
    </div>
    ${related.length ? html`<div class="sidebar-card"><h4>More in ${post.category || 'the Lounge'}</h4>
      ${related.map((r) => html`<a class="cat-link" href="/community/${r.slug}" style="align-items:flex-start"><span style="line-height:1.4">${r.title}</span></a>`)}
    </div>` : ''}
    <div class="sidebar-card"><h4>Keep it useful</h4><p class="small muted">Edit your reply within the first few minutes rather than posting twice. If a thread solved it, say what solved it.</p></div>
  </aside>
</div>`,
  });
}

export function newPostPage({ user, csrf, categories, flash, error = '' }) {
  return sitePage({
    title: 'Start a thread · LionPost community',
    description: 'Ask a question or share what worked.',
    user, active: '/community', flash,
    body: html`
<div class="shell" style="max-width:760px;padding:38px 0 70px">
  <a class="small dim" href="/community">← The Lounge</a>
  <h1 style="font-size:34px;letter-spacing:-.04em;margin:14px 0 6px">Start a thread</h1>
  <p class="muted" style="margin-bottom:22px">A specific title gets a specific answer. Include what you already tried.</p>
  ${error ? html`<div class="flash bad" style="width:100%">${error}</div>` : ''}
  <form method="post" action="/community/new" class="card pad-lg" style="display:grid;gap:16px">
    ${raw(`<input type="hidden" name="_csrf" value="${esc(csrf)}">`)}
    <label class="field"><span class="field-label">Title</span><input name="title" required minlength="8" maxlength="120" placeholder="How do you keep a queue alive on a bad week?" value=""></label>
    <label class="field"><span class="field-label">Category</span>
      <select name="category_id" required>
        ${categories.map((c) => html`<option value="${c.id}">${c.emoji} ${c.name}</option>`)}
      </select>
    </label>
    <label class="field"><span class="field-label">Body</span>
      <textarea name="body" rows="12" required minlength="20" placeholder="What are you trying to do, what have you tried, and what is actually happening? Markdown works."></textarea>
      <span class="field-hint">Markdown: **bold**, *italic*, lists, links, tables, quotes, code.</span>
    </label>
    <div class="row"><button class="btn" type="submit">Publish thread ${icon('arrow', 15)}</button><a class="btn ghost" href="/community">Cancel</a></div>
  </form>
</div>`,
  });
}

export function profilePage({ user, csrf, person, posts, comments, isSelf, flash }) {
  return sitePage({
    title: `${person.name} (@${person.handle}) · LionPost`,
    description: person.bio || `${person.name} in the LionPost community.`,
    user, active: '/community', flash,
    body: html`
<div class="shell" style="padding:34px 0 70px;max-width:900px">
  <div class="profile-head">
    ${avatar(person, 72)}
    <div>
      <h1>${person.name}</h1>
      <p>@${person.handle} · joined ${dateLong(person.created_at)}</p>
      ${person.bio ? html`<p style="margin-top:8px;max-width:40em">${person.bio}</p>` : ''}
      ${person.website ? html`<p style="margin-top:6px"><a href="${person.website}" rel="nofollow noopener" style="color:var(--gold-2)">${person.website}</a></p>` : ''}
    </div>
    <div class="profile-stats">
      <div><b>${posts.length}</b><span>threads</span></div>
      <div><b>${comments}</b><span>replies</span></div>
      <div><b>${person.points || 0}</b><span>reputation</span></div>
    </div>
  </div>
  ${isSelf ? html`<div class="row" style="margin-bottom:20px"><a class="btn ghost sm" href="/app/settings">Edit profile</a><a class="btn ghost sm" href="/community/new">New thread</a></div>` : ''}
  <h2 style="font-size:18px;margin-bottom:12px">Threads</h2>
  ${posts.length ? posts.map((p) => threadRow(p, { ...user, csrf })) : html`<div class="empty"><h3>No threads yet</h3><p>${isSelf ? 'Start with one question.' : 'Nothing public from this member.'}</p>${isSelf ? html`<a class="btn sm" href="/community/new">Start a thread</a>` : ''}</div>`}
</div>`,
  });
}

export function notificationsPage({ user, csrf, notifications, flash }) {
  return sitePage({
    title: 'Notifications · LionPost',
    description: 'Replies and likes on your threads.',
    user, active: '/community', flash,
    body: html`
<div class="shell" style="max-width:760px;padding:34px 0 70px">
  <h1 style="font-size:30px;letter-spacing:-.035em;margin-bottom:6px">Notifications</h1>
  <p class="muted" style="margin-bottom:20px">Replies and likes on what you posted.</p>
  ${notifications.length ? html`<div class="card" style="padding:6px 18px">
    ${notifications.map((n) => html`<div class="list-row">
      ${n.actor ? avatar({ name: n.actor, avatar_color: n.avatar_color }, 30) : html`<span class="status-dot warn"></span>`}
      <div class="grow"><h4>${n.body}</h4><p>${timeAgo(n.created_at)}${n.read_at ? '' : ' · new'}</p></div>
      ${n.post_slug ? html`<a class="btn ghost sm" href="/community/${n.post_slug}">Open</a>` : ''}
    </div>`)}
  </div>` : html`<div class="empty"><h3>Nothing yet</h3><p>Replies to your threads will show up here.</p><a class="btn sm" href="/community">Go to the Lounge</a></div>`}
</div>`,
  });
}
