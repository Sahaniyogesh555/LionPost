import { Router } from '../lib/http.js';
import { HttpError } from '../lib/errors.js';
import { hashPassword, verifyPassword, destroySession } from '../lib/auth.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { setFlash, takeFlash } from '../lib/flash.js';
import { workspaceStats, activitySeries, feedPreview } from '../lib/stats.js';
import { generate, geminiDraft } from '../lib/generator.js';
import { research } from '../lib/keywords.js';
import { analyze, fetchPage } from '../lib/aeo.js';
import { pollFeed } from '../lib/scheduler.js';
import { executeAutomation, nextRunFor } from '../lib/scheduler.js';
import { dashboard, studioPage, automationsPage, automationNew, automationDetail, connectionsPage, connectionNew, feedsPage, settingsPage } from '../views/app.js';
import { keywordsPage, aeoPage, videosPage, carouselPage, shortsPage, articlePage, notificationsApp } from '../views/studio.js';

function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, 'Sign in first');
  return ctx.user;
}
const unreadFor = (db, id) => db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(id).n;

function automationRows(db, userId, limit = 20) {
  return db.prepare(`SELECT a.*, c.platform FROM automations a LEFT JOIN connections c ON c.id = a.connection_id
                     WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT ?`).all(userId, limit);
}

export function appRoutes() {
  const r = new Router();

  r.get('/app', (ctx) => {
    const user = requireUser(ctx);
    const db = ctx.db;
    const automations = db.prepare(`SELECT * FROM automations WHERE user_id = ? ORDER BY status = 'active' DESC, next_run_at ASC LIMIT 5`).all(user.id);
    const runs = db.prepare('SELECT * FROM runs WHERE user_id = ? ORDER BY started_at DESC LIMIT 8').all(user.id);
    const threads = db.prepare('SELECT slug,title,created_at FROM posts ORDER BY created_at DESC LIMIT 4').all();
    ctx.html(String(dashboard({
      user, csrf: ctx.csrf, stats: workspaceStats(db, user.id), series: activitySeries(db, user.id),
      automations, runs, threads, unread: unreadFor(db, user.id), flash: takeFlash(ctx),
      blog: db.prepare('SELECT * FROM blog_posts ORDER BY published_at DESC LIMIT 3').all(),
    })));
  });

  r.get('/app/studio', (ctx) => {
    const user = requireUser(ctx);
    const history = ctx.db.prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC LIMIT 6').all(user.id);
    ctx.html(String(studioPage({
      user, csrf: ctx.csrf, result: null, history, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
      prefill: { topic: ctx.query.topic || '', kind: ctx.query.kind || '', tone: ctx.query.tone || '', platform: ctx.query.platform || '' },
    })));
  });

  r.post('/app/studio', (ctx) => {
    const user = requireUser(ctx);
    const { kind = 'caption', topic = '', tone = 'practical', platform = 'instagram', language = 'English' } = ctx.fields;
    const result = generate(String(kind), { topic: String(topic).slice(0, 160), tone: String(tone), platform: String(platform) });
    result.language = language;
    result.tone = tone;
    const history = ctx.db.prepare('SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC LIMIT 6').all(user.id);
    ctx.html(String(studioPage({
      user, csrf: ctx.csrf, result, history, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
      prefill: { kind, topic, tone, platform },
    })));
  });

  r.post('/app/studio/save', (ctx) => {
    const user = requireUser(ctx);
    const title = String(ctx.fields.title || '').trim().slice(0, 160) || 'Untitled draft';
    const body = String(ctx.fields.body || '').slice(0, 60000);
    if (!body.trim()) throw new HttpError(422, 'Nothing to save');
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'draft';
    const info = ctx.db.prepare(`INSERT INTO articles (user_id,title,slug,body_html,meta_description,keywords,status,created_at)
                                 VALUES (?,?,?,?,?,?,?,?)`)
      .run(user.id, title, `${slug}-${Date.now().toString(36)}`, body, String(ctx.fields.meta || ''), String(ctx.fields.keywords || ''), 'draft', new Date().toISOString());
    ctx.db.prepare('INSERT INTO activity (user_id,kind,detail,created_at) VALUES (?,?,?,?)').run(user.id, 'article', title, new Date().toISOString());
    setFlash(ctx, 'ok', 'Draft saved.');
    ctx.redirect(`/app/articles/${info.lastInsertRowid}`);
  });

  r.get('/app/articles/:id', (ctx) => {
    const user = requireUser(ctx);
    const article = ctx.db.prepare('SELECT * FROM articles WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!article) throw new HttpError(404, 'Draft not found');
    ctx.html(String(articlePage({ user, csrf: ctx.csrf, article, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.get('/app/articles/:id/export', (ctx) => {
    const user = requireUser(ctx);
    const article = ctx.db.prepare('SELECT * FROM articles WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!article) throw new HttpError(404, 'Draft not found');
    const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${article.title}</title><meta name="description" content="${article.meta_description || ''}">
</head><body><article><h1>${article.title}</h1>${article.body_html}
</article></body></html>`;
    ctx.res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${article.slug}.html"`,
    });
    ctx.res.end(body);
  });

  r.get('/app/automations', (ctx) => {
    const user = requireUser(ctx);
    const rows = automationRows(ctx.db, user.id);
    const runs = ctx.db.prepare(`SELECT r.*, a.name AS automation FROM runs r LEFT JOIN automations a ON a.id = r.automation_id
                                 WHERE r.user_id = ? ORDER BY r.started_at DESC LIMIT 25`).all(user.id);
    ctx.html(String(automationsPage({
      user, csrf: ctx.csrf, automations: rows, runs,
      connections: ctx.db.prepare('SELECT * FROM connections WHERE user_id = ?').all(user.id),
      unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
    })));
  });

  r.get('/app/automations/new', (ctx) => {
    const user = requireUser(ctx);
    ctx.html(String(automationNew({
      user, csrf: ctx.csrf,
      connections: ctx.db.prepare('SELECT * FROM connections WHERE user_id = ?').all(user.id),
      unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
      prefill: { kind: ctx.query.kind || 'post', connection_id: ctx.query.connection || '', topic: ctx.query.topic || '', name: ctx.query.name || '' },
    })));
  });

  r.post('/app/automations', (ctx) => {
    const user = requireUser(ctx);
    const f = ctx.fields;
    const name = String(f.name || '').trim().slice(0, 80);
    const topic = String(f.topic || '').trim().slice(0, 160);
    if (name.length < 3 || topic.length < 3) throw new HttpError(422, 'Name and topic are required');
    const interval = Math.max(60, Math.min(43200, Number(f.interval_minutes) || 1440));
    const connectionId = Number(f.connection_id) || null;
    if (connectionId) {
      const own = ctx.db.prepare('SELECT id FROM connections WHERE id = ? AND user_id = ?').get(connectionId, user.id);
      if (!own) throw new HttpError(403, 'That connection does not belong to you');
    }
    const now = new Date().toISOString();
    const info = ctx.db.prepare(`INSERT INTO automations (user_id,name,kind,connection_id,topic,tone,language,interval_minutes,publish_mode,include_image,status,next_run_at,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      user.id, name, String(f.kind || 'post'), connectionId, topic, String(f.tone || 'practical'), String(f.language || 'English'),
      interval, f.publish_mode === 'live' ? 'live' : 'dry_run', f.include_image ? 1 : 0, 'active', nextRunFor(interval), now);
    setFlash(ctx, 'ok', 'Automation created. First run is scheduled.');
    ctx.redirect(`/app/automations/${info.lastInsertRowid}`);
  });

  r.get('/app/automations/:id', (ctx) => {
    const user = requireUser(ctx);
    const automation = ctx.db.prepare('SELECT * FROM automations WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!automation) throw new HttpError(404, 'Automation not found');
    const runs = ctx.db.prepare('SELECT * FROM runs WHERE automation_id = ? ORDER BY started_at DESC LIMIT 40').all(automation.id);
    ctx.html(String(automationDetail({ user, csrf: ctx.csrf, automation, runs, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.post('/app/automations/:id/run', async (ctx) => {
    const user = requireUser(ctx);
    const automation = ctx.db.prepare('SELECT * FROM automations WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!automation) throw new HttpError(404, 'Automation not found');
    const result = await executeAutomation(ctx.db, automation, { trigger: 'manual' });
    setFlash(ctx, result.ok ? 'ok' : 'error', result.ok
      ? `Run #${result.id} finished. ${result.output?.delivery?.simulated ? 'Dry run: logged only.' : 'Delivered.'}`
      : `Run #${result.id} failed: ${result.error || result.output?.delivery?.error || 'see the log'}`);
    ctx.redirect(`/app/automations/${automation.id}`);
  });

  r.post('/app/automations/:id/toggle', (ctx) => {
    const user = requireUser(ctx);
    const automation = ctx.db.prepare('SELECT * FROM automations WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!automation) throw new HttpError(404, 'Automation not found');
    const active = automation.status === 'active';
    ctx.db.prepare('UPDATE automations SET status = ?, next_run_at = ? WHERE id = ?')
      .run(active ? 'paused' : 'active', active ? automation.next_run_at : nextRunFor(automation.interval_minutes), automation.id);
    setFlash(ctx, 'ok', active ? 'Automation paused.' : 'Automation resumed.');
    ctx.redirect('/app/automations');
  });

  r.post('/app/automations/:id/delete', (ctx) => {
    const user = requireUser(ctx);
    ctx.db.prepare('DELETE FROM automations WHERE id = ? AND user_id = ?').run(Number(ctx.params.id), user.id);
    setFlash(ctx, 'ok', 'Automation deleted.');
    ctx.redirect('/app/automations');
  });

  r.get('/app/connections', (ctx) => {
    const user = requireUser(ctx);
    ctx.html(String(connectionsPage({
      user, csrf: ctx.csrf, connections: ctx.db.prepare('SELECT * FROM connections WHERE user_id = ? ORDER BY created_at ASC').all(user.id),
      unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
    })));
  });

  r.get('/app/connections/new', (ctx) => {
    const user = requireUser(ctx);
    ctx.html(String(connectionNew({ user, csrf: ctx.csrf, platform: String(ctx.query.platform || 'webhook'), unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.post('/app/connections', (ctx) => {
    const user = requireUser(ctx);
    const platform = String(ctx.fields.platform || '').slice(0, 24);
    const handle = String(ctx.fields.handle || '').trim().slice(0, 200);
    const secret = String(ctx.fields.secret || '');
    if (!platform || !handle) throw new HttpError(422, 'Platform and handle are required');
    if (platform === 'webhook' && !/^(https?:\/\/|\/)/.test(handle)) throw new HttpError(422, 'Webhook URLs need http://, https:// or a path like /api/echo');
    const existing = ctx.db.prepare('SELECT id FROM connections WHERE user_id = ? AND platform = ?').get(user.id, platform);
    if (existing) throw new HttpError(409, 'That platform is already connected. Disconnect it first.');
    const now = new Date().toISOString();
    ctx.db.prepare(`INSERT INTO connections (user_id,platform,handle,status,secret_enc,webhook_url,created_at,last_checked_at)
                    VALUES (?,?,?,?,?,?,?,?)`)
      .run(user.id, platform, handle, 'connected', secret ? encrypt(secret) : null, platform === 'webhook' ? handle : null, now, now);
    ctx.db.prepare('INSERT INTO audit (user_id,action,target,ip,created_at) VALUES (?,?,?,?,?)').run(user.id, 'connection.create', platform, ctx.ip, now);
    setFlash(ctx, 'ok', `${platform} connected.${platform === 'webhook' || platform === 'telegram' ? ' This one can deliver live.' : ' Live posting needs your own app credentials.'}`);
    ctx.redirect('/app/connections');
  });

  r.post('/app/connections/:id/test', async (ctx) => {
    const user = requireUser(ctx);
    const c = ctx.db.prepare('SELECT * FROM connections WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!c) throw new HttpError(404, 'Connection not found');
    let ok = true, message = 'Connection looks valid.';
    try {
      if (c.platform === 'webhook') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(c.webhook_url, {
          method: 'POST', signal: controller.signal,
          headers: { 'content-type': 'application/json', 'x-lionpost-event': 'test' },
          body: JSON.stringify({ event: 'test', platform: 'webhook', text: 'LionPost test delivery', at: new Date().toISOString() }),
        }).finally(() => clearTimeout(timer));
        ok = res.ok;
        message = `Webhook responded ${res.status}.`;
      } else if (c.platform === 'telegram') {
        const token = decrypt(c.secret_enc);
        if (!token) { ok = false; message = 'No bot token stored.'; }
        else {
          const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const data = await res.json().catch(() => ({}));
          ok = res.ok && data.ok !== false;
          message = ok ? `Bot @${data.result?.username || 'unknown'} is reachable.` : 'Telegram rejected the token.';
        }
      } else {
        const hasSecret = Boolean(c.secret_enc);
        ok = hasSecret;
        message = hasSecret ? 'Token stored. Live posting still needs a supported adapter for this platform.' : 'No token stored for this platform.';
      }
    } catch (err) {
      ok = false;
      message = `Test failed: ${err.message}`;
    }
    ctx.db.prepare('UPDATE connections SET status = ?, last_checked_at = ?, last_error = ? WHERE id = ?')
      .run(ok ? 'connected' : 'needs_attention', new Date().toISOString(), ok ? null : message, c.id);
    setFlash(ctx, ok ? 'ok' : 'error', message);
    ctx.redirect('/app/connections');
  });

  r.post('/app/connections/:id/delete', (ctx) => {
    const user = requireUser(ctx);
    ctx.db.prepare('DELETE FROM connections WHERE id = ? AND user_id = ?').run(Number(ctx.params.id), user.id);
    setFlash(ctx, 'ok', 'Connection removed.');
    ctx.redirect('/app/connections');
  });

  r.get('/app/feeds', (ctx) => {
    const user = requireUser(ctx);
    const feeds = ctx.db.prepare(`SELECT f.*, (SELECT COUNT(*) FROM feed_items i WHERE i.feed_id = f.id) AS items
                                  FROM feeds f WHERE f.user_id = ? ORDER BY f.created_at DESC`).all(user.id);
    const items = ctx.db.prepare(`SELECT i.*, f.title AS feed_title FROM feed_items i JOIN feeds f ON f.id = i.feed_id
                                  WHERE f.user_id = ? ORDER BY i.id DESC LIMIT 12`).all(user.id);
    ctx.html(String(feedsPage({
      user, csrf: ctx.csrf, feeds, items,
      connections: ctx.db.prepare('SELECT * FROM connections WHERE user_id = ?').all(user.id),
      unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
    })));
  });

  r.post('/app/feeds', async (ctx) => {
    const user = requireUser(ctx);
    const url = String(ctx.fields.url || '').trim();
    if (!/^https?:\/\//.test(url)) throw new HttpError(422, 'Feed URLs need http:// or https://');
    const now = new Date().toISOString();
    const info = ctx.db.prepare('INSERT INTO feeds (user_id,url,auto_caption,connection_id,active,created_at) VALUES (?,?,?,?,?,?)')
      .run(user.id, url, ctx.fields.auto_caption ? 1 : 0, Number(ctx.fields.connection_id) || null, 1, now);
    const feed = ctx.db.prepare('SELECT * FROM feeds WHERE id = ?').get(info.lastInsertRowid);
    const result = await pollFeed(ctx.db, feed);
    setFlash(ctx, result.error ? 'error' : 'ok', result.error ? `Feed saved, but the first check failed: ${result.error}` : `Feed added. ${result.added} new item${result.added === 1 ? '' : 's'} queued.`);
    ctx.redirect('/app/feeds');
  });

  r.post('/app/feeds/:id/check', async (ctx) => {
    const user = requireUser(ctx);
    const feed = ctx.db.prepare('SELECT * FROM feeds WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!feed) throw new HttpError(404, 'Feed not found');
    const result = await pollFeed(ctx.db, feed);
    setFlash(ctx, result.error ? 'error' : 'ok', result.error || `Checked. ${result.added} new item${result.added === 1 ? '' : 's'}.`);
    ctx.redirect('/app/feeds');
  });

  r.post('/app/feeds/:id/toggle', (ctx) => {
    const user = requireUser(ctx);
    const feed = ctx.db.prepare('SELECT * FROM feeds WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!feed) throw new HttpError(404, 'Feed not found');
    ctx.db.prepare('UPDATE feeds SET active = ? WHERE id = ?').run(feed.active ? 0 : 1, feed.id);
    ctx.redirect('/app/feeds');
  });

  r.post('/app/feeds/:id/delete', (ctx) => {
    const user = requireUser(ctx);
    ctx.db.prepare('DELETE FROM feeds WHERE id = ? AND user_id = ?').run(Number(ctx.params.id), user.id);
    setFlash(ctx, 'ok', 'Feed removed.');
    ctx.redirect('/app/feeds');
  });

  r.get('/app/keywords', (ctx) => {
    const user = requireUser(ctx);
    let result = null;
    if (ctx.query.run) {
      const saved = ctx.db.prepare('SELECT * FROM keyword_research WHERE id = ? AND user_id = ?').get(Number(ctx.query.run), user.id);
      if (saved) result = { id: saved.id, seed: saved.seed, market: saved.market, ...JSON.parse(saved.results) };
    }
    const history = ctx.db.prepare('SELECT id,seed,market,created_at,results FROM keyword_research WHERE user_id = ? ORDER BY created_at DESC LIMIT 8').all(user.id)
      .map((h) => ({ ...h, count: (JSON.parse(h.results).keywords || []).length }));
    ctx.html(String(keywordsPage({
      user, csrf: ctx.csrf, result, history, seed: String(ctx.query.seed || ''),
      unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
    })));
  });

  r.post('/app/keywords', (ctx) => {
    const user = requireUser(ctx);
    const seed = String(ctx.fields.seed || '').trim();
    const market = String(ctx.fields.market || 'US').slice(0, 4);
    let result;
    try { result = research(seed, { market }); } catch (err) { throw new HttpError(422, err.message); }
    const info = ctx.db.prepare('INSERT INTO keyword_research (user_id,seed,market,results,created_at) VALUES (?,?,?,?,?)')
      .run(user.id, seed, market, JSON.stringify({ keywords: result.keywords, summary: result.summary }), new Date().toISOString());
    result = { ...result, id: Number(info.lastInsertRowid) };
    const history = ctx.db.prepare('SELECT id,seed,market,created_at,results FROM keyword_research WHERE user_id = ? ORDER BY created_at DESC LIMIT 8').all(user.id)
      .map((h) => ({ ...h, count: (JSON.parse(h.results).keywords || []).length }));
    ctx.html(String(keywordsPage({ user, csrf: ctx.csrf, result, history, seed, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.get('/app/keywords/export', (ctx) => {
    const user = requireUser(ctx);
    const saved = ctx.db.prepare('SELECT * FROM keyword_research WHERE id = ? AND user_id = ?').get(Number(ctx.query.id), user.id);
    if (!saved) throw new HttpError(404, 'Research not found');
    const data = JSON.parse(saved.results);
    const head = 'keyword,volume,difficulty,cpc,intent,direction,opportunity\n';
    const rows = data.keywords.map((k) => [k.keyword, k.volume, k.difficulty, k.cpc, k.intent, k.direction, k.opportunity]
      .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(',')).join('\n');
    ctx.res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="keywords-${saved.seed.replace(/[^a-z0-9]+/gi, '-')}.csv"`,
    });
    ctx.res.end(head + rows);
  });

  r.get('/app/aeo', (ctx) => {
    const user = requireUser(ctx);
    let report = null;
    if (ctx.query.run) {
      const saved = ctx.db.prepare('SELECT * FROM aeo_reports WHERE id = ? AND user_id = ?').get(Number(ctx.query.run), user.id);
      if (saved) report = { ...JSON.parse(saved.checks), url: saved.url, score: saved.score };
    }
    const history = ctx.db.prepare('SELECT * FROM aeo_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 8').all(user.id);
    ctx.html(String(aeoPage({ user, csrf: ctx.csrf, report, history, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.post('/app/aeo', async (ctx) => {
    const user = requireUser(ctx);
    const url = String(ctx.fields.url || '').trim();
    const pasted = String(ctx.fields.pasted || '').trim();
    if (!url && !pasted) throw new HttpError(422, 'Give me a URL or paste the HTML');
    let analysis, finalUrl = url, status = 200;
    try {
      if (pasted) {
        analysis = analyze({ html: pasted, url: '', robots: null, llms: null });
      } else {
        const page = await fetchPage(url);
        finalUrl = page.url; status = page.status;
        analysis = analyze({ html: page.html, url: page.url, robots: page.robots, llms: page.llms, status: page.status });
      }
    } catch (err) {
      throw new HttpError(422, `Could not read that page: ${err.message}. Paste the HTML instead.`);
    }
    const info = ctx.db.prepare('INSERT INTO aeo_reports (user_id,url,score,checks,created_at) VALUES (?,?,?,?,?)')
      .run(user.id, finalUrl || 'pasted HTML', analysis.score, JSON.stringify({ ...analysis, status }), new Date().toISOString());
    const history = ctx.db.prepare('SELECT * FROM aeo_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 8').all(user.id);
    ctx.html(String(aeoPage({
      user, csrf: ctx.csrf, report: { ...analysis, url: finalUrl || 'Pasted HTML', id: Number(info.lastInsertRowid) },
      history, unread: unreadFor(ctx.db, user.id), flash: { tone: analysis.score >= 70 ? 'ok' : 'info', text: `Scored ${analysis.score}/100.` },
    })));
  });

  r.get('/app/videos', (ctx) => {
    const user = requireUser(ctx);
    let video = null;
    if (ctx.query.id) {
      const row = ctx.db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(Number(ctx.query.id), user.id);
      if (row) video = { ...row, scenes: JSON.parse(row.scenes) };
    }
    if (!video) {
      const script = generate('video', { topic: 'The half of publishing nobody films', tone: 'practical' });
      video = { id: null, title: script.title, topic: script.topic || 'The half of publishing nobody films', scenes: script.scenes, starter: true };
    }
    const videos = ctx.db.prepare('SELECT id,title,created_at FROM videos WHERE user_id = ? ORDER BY created_at DESC LIMIT 8').all(user.id);
    ctx.html(String(videosPage({ user, csrf: ctx.csrf, video, videos, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.post('/app/videos', (ctx) => {
    const user = requireUser(ctx);
    const topic = String(ctx.fields.topic || '').trim().slice(0, 160);
    if (!topic) throw new HttpError(422, 'Give the video a topic');
    const script = generate('video', { topic, tone: String(ctx.fields.tone || 'practical') });
    const palette = ['gold', 'mint', 'sky', 'rose'].includes(ctx.fields.palette) ? ctx.fields.palette : 'gold';
    const info = ctx.db.prepare('INSERT INTO videos (user_id,title,topic,scenes,created_at) VALUES (?,?,?,?,?)')
      .run(user.id, script.title, topic, JSON.stringify(script.scenes), new Date().toISOString());
    ctx.db.prepare('INSERT INTO activity (user_id,kind,detail,created_at) VALUES (?,?,?,?)').run(user.id, 'video', topic, new Date().toISOString());
    ctx.redirect(`/app/videos?id=${info.lastInsertRowid}`);
  });

  // The carousel screen is a live canvas, so it always carries a deck. A cold
  // visit gets a starter built from the member's newest automation topic; it is
  // rendered but never saved, and the saved-decks list stays honest.
  const buildDeck = (format, topic, handle, palette) => {
    const script = generate(format === 'pin' ? 'pin' : 'carousel', { topic });
    const slides = format === 'pin'
      ? [{ kicker: 'PIN', title: script.title, body: script.description }, ...script.overlay.lines.map((l, i) => ({ kicker: `0${i + 1}`, title: l.split(':')[0], body: l }))]
      : script.slides;
    return { format, topic, handle, palette, slides };
  };

  const starterDeck = (db, user, format) => {
    const row = db.prepare("SELECT topic FROM automations WHERE user_id = ? AND topic <> '' ORDER BY created_at DESC LIMIT 1").get(user.id)
      || db.prepare('SELECT title AS topic FROM articles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id);
    const topic = (row && row.topic) || 'A queue that runs while you sleep';
    return { ...buildDeck(format, topic, '@' + user.handle, 'gold'), starter: true, id: null };
  };

  r.get('/app/carousel', (ctx) => {
    const user = requireUser(ctx);
    const tab = ['carousel', 'pin', 'quote'].includes(ctx.query.tab) ? ctx.query.tab : 'carousel';
    let deck = null;
    if (ctx.query.id) {
      const row = ctx.db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(Number(ctx.query.id), user.id);
      if (row) deck = { ...row, slides: JSON.parse(row.slides) };
    }
    if (!deck) deck = starterDeck(ctx.db, user, tab);
    const decks = ctx.db.prepare('SELECT d.id,d.topic,d.format,d.created_at,(SELECT 1) AS slides FROM decks d WHERE d.user_id = ? ORDER BY d.created_at DESC LIMIT 8').all(user.id)
      .map((d) => ({ ...d, slides: JSON.parse(ctx.db.prepare('SELECT slides FROM decks WHERE id = ?').get(d.id).slides).length }));
    ctx.html(String(carouselPage({ user, csrf: ctx.csrf, deck, decks, tab, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.post('/app/carousel', (ctx) => {
    const user = requireUser(ctx);
    const topic = String(ctx.fields.topic || '').trim().slice(0, 160);
    if (!topic) throw new HttpError(422, 'Give the deck a topic');
    const format = ['carousel', 'pin', 'quote'].includes(ctx.fields.format) ? ctx.fields.format : 'carousel';
    const palette = ['gold', 'mint', 'sky', 'rose', 'violet'].includes(ctx.fields.palette) ? ctx.fields.palette : 'gold';
    const handle = String(ctx.fields.handle || '').slice(0, 30) || '@' + user.handle;
    const { slides } = buildDeck(format, topic, handle, palette);
    const info = ctx.db.prepare('INSERT INTO decks (user_id,topic,format,palette,handle,slides,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(user.id, topic, format, palette, handle, JSON.stringify(slides), new Date().toISOString());
    ctx.redirect(`/app/carousel?id=${info.lastInsertRowid}&tab=${format}`);
  });

  r.get('/app/shorts', (ctx) => {
    const user = requireUser(ctx);
    ctx.html(String(shortsPage({ user, csrf: ctx.csrf, unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx) })));
  });

  r.get('/app/settings', (ctx) => {
    const user = requireUser(ctx);
    const sessions = ctx.db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(user.id);
    ctx.html(String(settingsPage({
      user, csrf: ctx.csrf, sessions, geminiSet: Boolean(user.gemini_key_enc),
      unread: unreadFor(ctx.db, user.id), flash: takeFlash(ctx),
    })));
  });

  r.post('/app/settings/profile', (ctx) => {
    const user = requireUser(ctx);
    const name = String(ctx.fields.name || '').trim().slice(0, 60);
    const handle = String(ctx.fields.handle || '').trim().toLowerCase();
    const bio = String(ctx.fields.bio || '').slice(0, 280);
    const website = String(ctx.fields.website || '').slice(0, 200);
    if (name.length < 2) throw new HttpError(422, 'Name is too short');
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) throw new HttpError(422, 'Handles are 3-30 lowercase letters, numbers or underscores');
    const clash = ctx.db.prepare('SELECT id FROM users WHERE handle = ? AND id != ?').get(handle, user.id);
    if (clash) throw new HttpError(409, 'That handle is taken');
    ctx.db.prepare('UPDATE users SET name = ?, handle = ?, bio = ?, website = ? WHERE id = ?').run(name, handle, bio, website, user.id);
    setFlash(ctx, 'ok', 'Profile updated.');
    ctx.redirect('/app/settings');
  });

  r.post('/app/settings/password', (ctx) => {
    const user = requireUser(ctx);
    if (!verifyPassword(String(ctx.fields.current || ''), ctx.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id).password_hash)) {
      throw new HttpError(403, 'Current password is wrong');
    }
    const next = String(ctx.fields.password || '');
    if (next.length < 8) throw new HttpError(422, 'New password needs eight characters');
    ctx.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), user.id);
    setFlash(ctx, 'ok', 'Password changed.');
    ctx.redirect('/app/settings');
  });

  r.post('/app/settings/gemini', (ctx) => {
    const user = requireUser(ctx);
    if (ctx.fields.remove) {
      ctx.db.prepare('UPDATE users SET gemini_key_enc = NULL WHERE id = ?').run(user.id);
      setFlash(ctx, 'ok', 'Gemini key removed.');
      return ctx.redirect('/app/settings');
    }
    const key = String(ctx.fields.key || '').trim();
    if (!key) throw new HttpError(422, 'Paste a key first');
    ctx.db.prepare('UPDATE users SET gemini_key_enc = ? WHERE id = ?').run(encrypt(key), user.id);
    setFlash(ctx, 'ok', 'Key stored encrypted.');
    ctx.redirect('/app/settings');
  });

  r.post('/app/settings/delete', (ctx) => {
    const user = requireUser(ctx);
    ctx.db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    destroySession(ctx.db, ctx.cookies.lion_session);
    ctx.clearCookie('lion_session');
    ctx.redirect('/');
  });

  r.get('/app/notifications', (ctx) => {
    const user = requireUser(ctx);
    const rows = ctx.db.prepare(`SELECT n.*, p.slug AS post_slug FROM notifications n LEFT JOIN posts p ON p.id = n.post_id
                                 WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 60`).all(user.id);
    ctx.db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(new Date().toISOString(), user.id);
    ctx.html(String(notificationsApp({ user, csrf: ctx.csrf, notifications: rows, unread: 0, flash: takeFlash(ctx) })));
  });

  return r;
}
