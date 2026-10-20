import { Router } from '../lib/http.js';
import { HttpError } from '../lib/errors.js';
import { hitLimit } from '../lib/auth.js';
import { setFlash, takeFlash } from '../lib/flash.js';
import { communityIndex, postPage, newPostPage, profilePage } from '../views/community.js';

const PAGE = 12;

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'thread';
}

function uniqueSlug(db, title) {
  const base = slugify(title);
  let slug = base, i = 1;
  while (db.prepare('SELECT 1 FROM posts WHERE slug = ?').get(slug)) slug = `${base}-${++i}`;
  return slug;
}

function categoriesWithCounts(db) {
  return db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id) AS count
                     FROM categories c ORDER BY c.sort`).all();
}

function topMembers(db) {
  return db.prepare(`SELECT u.name, u.handle, u.avatar_color, COUNT(p.id) AS posts
                     FROM users u LEFT JOIN posts p ON p.user_id = u.id
                     GROUP BY u.id ORDER BY posts DESC, u.created_at ASC LIMIT 5`).all();
}

function listThreads(db, { categoryId = null, q = '', sort = 'new', limit = PAGE, offset = 0, userId = null } = {}) {
  const where = [];
  const args = [];
  if (categoryId) { where.push('p.category_id = ?'); args.push(categoryId); }
  if (q) { where.push('(p.title LIKE ? OR p.body LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const order = sort === 'top'
    ? '(SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) DESC, p.created_at DESC'
    : 'p.pinned DESC, p.created_at DESC';
  const rows = db.prepare(`SELECT p.*, u.name AS author, u.handle, u.avatar_color,
      c.name AS category, c.slug AS category_slug, c.emoji,
      (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comments,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
      EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS liked
    FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN categories c ON c.id = p.category_id
    ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`).all(userId || 0, ...args, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM posts p ${whereSql}`).get(...args).n;
  return { rows, total };
}

function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, 'Sign in first');
  return ctx.user;
}

export function communityRoutes() {
  const r = new Router();

  r.get('/community', (ctx) => {
    const sort = ctx.query.sort === 'top' ? 'top' : 'new';
    const q = String(ctx.query.q || '').trim().slice(0, 80);
    const pageNo = Math.max(1, Number(ctx.query.page) || 1);
    const { rows, total } = listThreads(ctx.db, { q, sort, limit: PAGE, offset: (pageNo - 1) * PAGE, userId: ctx.user?.id });
    const cats = categoriesWithCounts(ctx.db);
    const counts = { all: ctx.db.prepare('SELECT COUNT(*) AS n FROM posts').get().n };
    ctx.html(String(communityIndex({
      user: ctx.user, csrf: ctx.csrf, posts: rows, categories: cats, counts, activeCat: null,
      q, sort, top: topMembers(ctx.db), flash: takeFlash(ctx), pageNo, pages: Math.ceil(total / PAGE),
    })));
  });

  r.get('/community/category/:slug', (ctx) => {
    const cat = ctx.db.prepare('SELECT * FROM categories WHERE slug = ?').get(ctx.params.slug);
    if (!cat) throw new HttpError(404, 'That category does not exist');
    const sort = ctx.query.sort === 'top' ? 'top' : 'new';
    const q = String(ctx.query.q || '').trim().slice(0, 80);
    const pageNo = Math.max(1, Number(ctx.query.page) || 1);
    const { rows, total } = listThreads(ctx.db, { categoryId: cat.id, q, sort, limit: PAGE, offset: (pageNo - 1) * PAGE, userId: ctx.user?.id });
    ctx.html(String(communityIndex({
      user: ctx.user, csrf: ctx.csrf, posts: rows, categories: categoriesWithCounts(ctx.db),
      counts: { all: ctx.db.prepare('SELECT COUNT(*) AS n FROM posts').get().n },
      activeCat: cat.slug, q, sort, top: topMembers(ctx.db), flash: takeFlash(ctx), pageNo, pages: Math.ceil(total / PAGE),
    })));
  });

  r.get('/community/new', (ctx) => {
    if (!ctx.user) return ctx.redirect('/login?next=/community/new');
    ctx.html(String(newPostPage({ user: ctx.user, csrf: ctx.csrf, categories: categoriesWithCounts(ctx.db), flash: takeFlash(ctx) })));
  });

  r.post('/community/new', (ctx) => {
    const user = requireUser(ctx);
    if (hitLimit(`post:${user.id}`, 8, 10 * 60000)) throw new HttpError(429, 'Slow down a little. Try again in a few minutes.');
    const title = String(ctx.fields.title || '').trim().slice(0, 120);
    const body = String(ctx.fields.body || '').trim().slice(0, 20000);
    const categoryId = Number(ctx.fields.category_id) || null;
    if (title.length < 8) throw new HttpError(422, 'Give the thread a clearer title');
    if (body.length < 20) throw new HttpError(422, 'Add a bit more detail to the body');
    const slug = uniqueSlug(ctx.db, title);
    const now = new Date().toISOString();
    const info = ctx.db.prepare('INSERT INTO posts (slug,title,body,user_id,category_id,created_at) VALUES (?,?,?,?,?,?)')
      .run(slug, title, body, user.id, categoryId, now);
    ctx.db.prepare('INSERT INTO activity (user_id,kind,detail,created_at) VALUES (?,?,?,?)').run(user.id, 'thread', slug, now);
    ctx.db.prepare('INSERT INTO audit (user_id,action,target,ip,created_at) VALUES (?,?,?,?,?)').run(user.id, 'post.create', String(info.lastInsertRowid), ctx.ip, now);
    setFlash(ctx, 'ok', 'Thread published.');
    ctx.redirect(`/community/${slug}`);
  });

  r.get('/community/:slug', (ctx) => {
    const db = ctx.db;
    const post = db.prepare(`SELECT p.*, u.name AS author, u.handle, u.avatar_color,
        c.name AS category, c.slug AS category_slug, c.emoji,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comments,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
        EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS liked
      FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ?`).get(ctx.user?.id || 0, ctx.params.slug);
    if (!post) throw new HttpError(404, 'That thread does not exist');
    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
    const all = db.prepare(`SELECT c.*, u.name AS author, u.handle, u.avatar_color, c.user_id AS author_id
      FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at ASC`).all(post.id);
    const roots = all.filter((c) => !c.parent_id);
    const replies = {};
    for (const c of all.filter((c) => c.parent_id)) (replies[c.parent_id] ||= []).push(c);
    const related = db.prepare(`SELECT slug,title FROM posts WHERE category_id = ? AND id != ? ORDER BY created_at DESC LIMIT 4`).all(post.category_id, post.id);
    ctx.html(String(postPage({ user: ctx.user, csrf: ctx.csrf, post, comments: roots, replies, related, flash: takeFlash(ctx) })));
  });

  r.post('/community/:slug/like', (ctx) => {
    const user = requireUser(ctx);
    const post = ctx.db.prepare('SELECT * FROM posts WHERE slug = ?').get(ctx.params.slug);
    if (!post) throw new HttpError(404, 'That thread does not exist');
    const existing = ctx.db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?').get(user.id, post.id);
    if (existing) {
      ctx.db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(user.id, post.id);
    } else {
      ctx.db.prepare('INSERT INTO likes (user_id,post_id,created_at) VALUES (?,?,?)').run(user.id, post.id, new Date().toISOString());
      if (post.user_id !== user.id) {
        ctx.db.prepare('INSERT INTO notifications (user_id,actor_id,kind,post_id,body,created_at) VALUES (?,?,?,?,?,?)')
          .run(post.user_id, user.id, 'like', post.id, `${user.name} liked “${post.title.slice(0, 80)}”`, new Date().toISOString());
      }
    }
    ctx.redirect(`/community/${post.slug}#replies`);
  });

  r.post('/community/:slug/comment', (ctx) => {
    const user = requireUser(ctx);
    const post = ctx.db.prepare('SELECT * FROM posts WHERE slug = ?').get(ctx.params.slug);
    if (!post) throw new HttpError(404, 'That thread does not exist');
    if (post.locked) throw new HttpError(403, 'This thread is locked');
    if (hitLimit(`comment:${user.id}`, 20, 5 * 60000)) throw new HttpError(429, 'Too many replies at once. Take a breath.');
    const body = String(ctx.fields.body || '').trim().slice(0, 8000);
    if (body.length < 2) throw new HttpError(422, 'Write a reply first');
    let parentId = Number(ctx.fields.parent_id) || null;
    if (parentId) {
      const parent = ctx.db.prepare('SELECT id FROM comments WHERE id = ? AND post_id = ?').get(parentId, post.id);
      if (!parent) parentId = null;
    }
    const now = new Date().toISOString();
    ctx.db.prepare('INSERT INTO comments (post_id,user_id,parent_id,body,created_at) VALUES (?,?,?,?,?)')
      .run(post.id, user.id, parentId, body, now);
    if (post.user_id !== user.id) {
      ctx.db.prepare('INSERT INTO notifications (user_id,actor_id,kind,post_id,body,created_at) VALUES (?,?,?,?,?,?)')
        .run(post.user_id, user.id, 'reply', post.id, `${user.name} replied to “${post.title.slice(0, 80)}”`, now);
    }
    ctx.db.prepare('INSERT INTO activity (user_id,kind,detail,created_at) VALUES (?,?,?,?)').run(user.id, 'reply', post.slug, now);
    ctx.redirect(`/community/${post.slug}#replies`);
  });

  const own = (ctx, post) => ctx.user && (ctx.user.id === post.user_id || ctx.user.role === 'admin');

  r.post('/community/:slug/pin', (ctx) => {
    const user = requireUser(ctx);
    const post = ctx.db.prepare('SELECT * FROM posts WHERE slug = ?').get(ctx.params.slug);
    if (!post) throw new HttpError(404, 'Not found');
    if (!own(ctx, post)) throw new HttpError(403, 'Only the author can pin this');
    ctx.db.prepare('UPDATE posts SET pinned = ? WHERE id = ?').run(post.pinned ? 0 : 1, post.id);
    ctx.redirect(`/community/${post.slug}`);
  });

  r.post('/community/:slug/lock', (ctx) => {
    const user = requireUser(ctx);
    const post = ctx.db.prepare('SELECT * FROM posts WHERE slug = ?').get(ctx.params.slug);
    if (!post) throw new HttpError(404, 'Not found');
    if (!own(ctx, post)) throw new HttpError(403, 'Only the author can lock this');
    ctx.db.prepare('UPDATE posts SET locked = ? WHERE id = ?').run(post.locked ? 0 : 1, post.id);
    ctx.redirect(`/community/${post.slug}`);
  });

  r.post('/community/:slug/delete', (ctx) => {
    const user = requireUser(ctx);
    const post = ctx.db.prepare('SELECT * FROM posts WHERE slug = ?').get(ctx.params.slug);
    if (!post) throw new HttpError(404, 'Not found');
    if (!own(ctx, post)) throw new HttpError(403, 'Only the author can delete this');
    ctx.db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
    ctx.db.prepare('INSERT INTO audit (user_id,action,target,ip,created_at) VALUES (?,?,?,?,?)').run(user.id, 'post.delete', post.slug, ctx.ip, new Date().toISOString());
    setFlash(ctx, 'ok', 'Thread deleted.');
    ctx.redirect('/community');
  });

  r.get('/u/:handle', (ctx) => {
    const person = ctx.db.prepare('SELECT * FROM users WHERE handle = ?').get(ctx.params.handle);
    if (!person) throw new HttpError(404, 'No such member');
    const { rows } = listThreads(ctx.db, { userId: ctx.user?.id, limit: 50 });
    const posts = rows.filter((p) => p.user_id === person.id);
    const comments = ctx.db.prepare('SELECT COUNT(*) AS n FROM comments WHERE user_id = ?').get(person.id).n;
    ctx.html(String(profilePage({
      user: ctx.user, csrf: ctx.csrf, person, posts, comments,
      isSelf: ctx.user?.id === person.id, flash: takeFlash(ctx),
    })));
  });

  return r;
}
