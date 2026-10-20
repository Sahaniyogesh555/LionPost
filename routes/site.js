import { Router } from '../lib/http.js';
import { HttpError } from '../lib/errors.js';
import {
  hashPassword, verifyPassword, createSession, destroySession, hitLimit,
  issuePasswordReset, findPasswordReset, consumePasswordReset,
} from '../lib/auth.js';
import { isSecureRequest } from '../lib/http.js';
import { send as sendMail } from '../lib/mailer.js';
import { setFlash, takeFlash } from '../lib/flash.js';
import { siteStats, feedPreview } from '../lib/stats.js';
import { bySlug } from '../lib/tools.js';
import { landing, toolsIndex, toolPage, blogIndex, blogPost, videosIndex, videoWatch, aboutPage, legalPage, authPage } from '../views/site.js';

const COLORS = ['#F5B942', '#6EE7B7', '#93C5FD', '#FCA5A5', '#C4B5FD', '#FCD34D', '#67E8F9', '#FDA4AF'];

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function uniqueHandle(db, name) {
  const base = slugify(name).replaceAll('-', '') || 'member';
  let handle = base, i = 1;
  while (db.prepare('SELECT 1 FROM users WHERE handle = ?').get(handle)) handle = `${base}${++i}`;
  return handle;
}

export function siteOrigin(ctx) {
  const host = ctx.req.headers['x-forwarded-host'] || ctx.req.headers.host || 'localhost:3000';
  const proto = String(ctx.req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return `${proto === 'https' || isSecureRequest(ctx.req) ? 'https' : 'http'}://${host}`;
}

function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
}

export function siteRoutes() {
  const r = new Router();

  r.get('/', (ctx) => {
    const db = ctx.db;
    ctx.html(String(landing({
      user: ctx.user,
      stats: siteStats(db),
      threads: feedPreview(db, 4),
      blog: db.prepare('SELECT * FROM blog_posts ORDER BY published_at DESC LIMIT 3').all(),
      flash: takeFlash(ctx),
    })));
  });

  r.get('/tools', (ctx) => {
    ctx.html(String(toolsIndex({ user: ctx.user, flash: takeFlash(ctx) })));
  });

  r.get('/tools/:slug', (ctx) => {
    const tool = bySlug(ctx.params.slug);
    if (!tool) throw new HttpError(404, 'That tool does not exist');
    ctx.html(String(toolPage(tool, { user: ctx.user, flash: takeFlash(ctx) })));
  });

  const blogTags = (db) => db.prepare('SELECT tag, COUNT(*) AS n FROM blog_posts GROUP BY tag ORDER BY n DESC, tag').all();

  r.get('/blog', (ctx) => {
    ctx.html(String(blogIndex({
      user: ctx.user,
      posts: ctx.db.prepare('SELECT * FROM blog_posts ORDER BY published_at DESC').all(),
      tags: blogTags(ctx.db),
      flash: takeFlash(ctx),
    })));
  });

  r.get('/blog/tag/:tag', (ctx) => {
    const tag = String(ctx.params.tag);
    const posts = ctx.db.prepare('SELECT * FROM blog_posts WHERE lower(tag) = lower(?) ORDER BY published_at DESC').all(tag);
    if (!posts.length && !blogTags(ctx.db).some((t) => t.tag.toLowerCase() === tag.toLowerCase())) {
      throw new HttpError(404, 'No posts filed under that topic');
    }
    ctx.html(String(blogIndex({ user: ctx.user, posts, tags: blogTags(ctx.db), tag: posts[0]?.tag || tag, flash: takeFlash(ctx) })));
  });

  r.get('/blog/:slug', (ctx) => {
    const post = ctx.db.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(ctx.params.slug);
    if (!post) throw new HttpError(404, 'That post does not exist');
    const others = ctx.db.prepare('SELECT * FROM blog_posts WHERE slug != ? ORDER BY published_at DESC LIMIT 2').all(post.slug);
    ctx.html(String(blogPost({
      user: ctx.user, post, others, flash: takeFlash(ctx),
      canonical: `${siteOrigin(ctx)}/blog/${post.slug}`,
    })));
  });

  r.get('/videos', (ctx) => {
    ctx.html(String(videosIndex({
      user: ctx.user,
      videos: ctx.db.prepare('SELECT * FROM showcase_videos ORDER BY published_at DESC').all(),
      flash: takeFlash(ctx),
    })));
  });

  r.get('/videos/:slug', (ctx) => {
    const video = ctx.db.prepare('SELECT * FROM showcase_videos WHERE slug = ?').get(ctx.params.slug);
    if (!video) throw new HttpError(404, 'That video does not exist');
    ctx.db.prepare('UPDATE showcase_videos SET views = views + 1 WHERE id = ?').run(video.id);
    const more = ctx.db.prepare('SELECT slug,title,tag,palette FROM showcase_videos WHERE id != ? ORDER BY published_at DESC LIMIT 3').all(video.id);
    ctx.html(String(videoWatch({
      user: ctx.user, video: { ...video, views: video.views + 1 }, more, flash: takeFlash(ctx),
      canonical: `${siteOrigin(ctx)}/videos/${video.slug}`,
    })));
  });

  r.get('/about', (ctx) => {
    ctx.html(String(aboutPage({ user: ctx.user, stats: siteStats(ctx.db), flash: takeFlash(ctx) })));
  });

  r.get('/terms', (ctx) => ctx.html(String(legalPage({ user: ctx.user, kind: 'terms', flash: takeFlash(ctx) }))));
  r.get('/privacy', (ctx) => ctx.html(String(legalPage({ user: ctx.user, kind: 'privacy', flash: takeFlash(ctx) }))));

  r.get('/login', (ctx) => {
    if (ctx.user) return ctx.redirect('/app');
    ctx.html(String(authPage({ mode: 'login', user: ctx.user, csrf: ctx.csrf, next: ctx.query.next || '', flash: takeFlash(ctx) })));
  });

  r.get('/register', (ctx) => {
    if (ctx.user) return ctx.redirect('/app');
    ctx.html(String(authPage({ mode: 'register', user: ctx.user, csrf: ctx.csrf, next: ctx.query.next || '', flash: takeFlash(ctx) })));
  });

  r.post('/register', (ctx) => {
    const { name, email, password, terms, next } = ctx.fields;
    const cleanName = String(name || '').trim().slice(0, 60);
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (hitLimit(`register:${ctx.ip}`, 6, 10 * 60000)) throw new HttpError(429, 'Too many signups from this address. Try again in a few minutes.');
    const fail = (message) => {
      ctx.html(String(authPage({ mode: 'register', csrf: ctx.csrf, next: next || '', flash: { tone: 'error', text: message } })), 422);
    };
    if (cleanName.length < 2) return fail('Tell us your name, at least two characters.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return fail('That email does not look right.');
    if (String(password || '').length < 8) return fail('Passwords need at least eight characters.');
    if (!terms) return fail('Please accept the terms to continue.');
    if (ctx.db.prepare('SELECT 1 FROM users WHERE email = ?').get(cleanEmail)) return fail('An account with that email already exists. Try signing in.');

    const handle = uniqueHandle(ctx.db, cleanName);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const info = ctx.db.prepare('INSERT INTO users (name,email,password_hash,handle,avatar_color,role,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(cleanName, cleanEmail, hashPassword(password), handle, color, 'member', new Date().toISOString());
    const userId = Number(info.lastInsertRowid);
    const { token } = createSession(ctx.db, userId, ctx.req.headers['user-agent']);
    ctx.setCookie('lion_session', token, { httpOnly: true, maxAge: 30 * 86400 });
    ctx.setCookie('lion_csrf', '', { maxAge: 0 });
    ctx.db.prepare('INSERT INTO audit (user_id,action,target,ip,created_at) VALUES (?,?,?,?,?)')
      .run(userId, 'register', cleanEmail, ctx.ip, new Date().toISOString());
    setFlash(ctx, 'ok', `Welcome, ${cleanName}. Your workspace is ready.`);
    ctx.redirect(safeNext(next));
  });

  r.post('/login', (ctx) => {
    const email = String(ctx.fields.email || '').trim().toLowerCase();
    const password = String(ctx.fields.password || '');
    const next = safeNext(ctx.fields.next);
    if (hitLimit(`login:${ctx.ip}:${email}`, 8, 10 * 60000)) {
      ctx.html(String(authPage({ mode: 'login', csrf: ctx.csrf, next, flash: { tone: 'error', text: 'Too many attempts. Wait ten minutes, then try again.' } })), 429);
      return;
    }
    const user = ctx.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      ctx.html(String(authPage({ mode: 'login', csrf: ctx.csrf, next, flash: { tone: 'error', text: 'Email or password is wrong.' } })), 401);
      return;
    }
    const { token } = createSession(ctx.db, user.id, ctx.req.headers['user-agent']);
    ctx.setCookie('lion_session', token, { httpOnly: true, maxAge: 30 * 86400 });
    ctx.setCookie('lion_csrf', '', { maxAge: 0 });
    ctx.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);
    ctx.db.prepare('INSERT INTO audit (user_id,action,target,ip,created_at) VALUES (?,?,?,?,?)').run(user.id, 'login', email, ctx.ip, new Date().toISOString());
    ctx.redirect(next);
  });

  // --- password reset ------------------------------------------------------
  // There is no SMTP in this build, so the link is written to the server log
  // and, on a local or preview host, also offered on the confirmation screen.
  r.get('/forgot', (ctx) => {
    if (ctx.user) return ctx.redirect('/app');
    ctx.html(String(authPage({ mode: 'forgot-ask', csrf: ctx.csrf, flash: takeFlash(ctx) })));
  });

  r.post('/forgot', (ctx) => {
    const email = String(ctx.fields.email || '').trim().toLowerCase();
    if (hitLimit(`forgot:${ctx.ip}`, 5, 10 * 60000)) {
      ctx.html(String(authPage({ mode: 'forgot-ask', csrf: ctx.csrf, flash: { tone: 'error', text: 'Too many requests. Wait ten minutes, then try again.' } })), 429);
      return;
    }
    let devLink = '';
    const user = email ? ctx.db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email) : null;
    if (user) {
      const { token } = issuePasswordReset(ctx.db, user.id);
      const host = ctx.req.headers.host || `localhost:${process.env.PORT || 3000}`;
      const origin = process.env.LIONPOST_URL || `${isSecureRequest(ctx.req) ? 'https' : 'http'}://${host}`;
      const link = `${origin}/reset?token=${token}`;
      sendMail({
        to: user.email,
        subject: 'Reset your LionPost password',
        text: `Hello ${user.name},\n\nUse the link below within the next hour to choose a new password. It works once.\n\n${link}\n\nIf you did not ask for this, ignore this message — your password stays as it is.`,
        link,
      });
      ctx.db.prepare('INSERT INTO audit (user_id,action,target,ip,created_at) VALUES (?,?,?,?,?)')
        .run(user.id, 'password-reset-requested', user.email, ctx.ip, new Date().toISOString());
      if (process.env.LIONPOST_DEV_LINK !== '0') devLink = link;
    }
    ctx.html(String(authPage({ mode: 'forgot-sent', csrf: ctx.csrf, devLink })));
  });

  r.get('/reset', (ctx) => {
    const reset = findPasswordReset(ctx.db, ctx.query.token);
    ctx.html(String(authPage({
      mode: reset ? 'reset-fresh' : 'reset-bad',
      csrf: ctx.csrf,
      token: reset ? String(ctx.query.token) : '',
      flash: takeFlash(ctx),
    })));
  });

  r.post('/reset', (ctx) => {
    const token = String(ctx.fields.token || '');
    const password = String(ctx.fields.password || '');
    const confirm = String(ctx.fields.confirm || '');
    if (hitLimit(`reset:${ctx.ip}`, 8, 10 * 60000)) throw new HttpError(429, 'Too many attempts. Wait ten minutes.');
    const reset = findPasswordReset(ctx.db, token);
    const fail = (text) => ctx.html(String(authPage({
      mode: reset ? 'reset-fresh' : 'reset-bad', csrf: ctx.csrf,
      token: reset ? token : '', flash: { tone: 'error', text },
    })), reset ? 422 : 410);
    if (!reset) return fail('That reset link is used, expired, or never existed. Request a fresh one.');
    if (password.length < 8) return fail('Passwords need at least eight characters.');
    if (password !== confirm) return fail('The two passwords do not match.');
    consumePasswordReset(ctx.db, reset.id, reset.user_id, password);
    ctx.db.prepare('INSERT INTO audit (user_id,action,target,ip,created_at) VALUES (?,?,?,?,?)')
      .run(reset.user_id, 'password-reset', reset.email, ctx.ip, new Date().toISOString());
    ctx.clearCookie('lion_session');
    setFlash(ctx, 'ok', 'Password changed. Sign in with the new one.');
    ctx.redirect('/login');
  });

  r.post('/logout', (ctx) => {
    destroySession(ctx.db, ctx.cookies.lion_session);
    ctx.clearCookie('lion_session');
    ctx.redirect('/');
  });

  return r;
}
