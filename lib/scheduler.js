import { generate } from './generator.js';
import { decrypt } from './crypto.js';
import { fetchFeed } from './rss.js';

export const PLATFORM_LABEL = {
  instagram: 'Instagram', facebook: 'Facebook Page', x: 'X', telegram: 'Telegram',
  pinterest: 'Pinterest', tiktok: 'TikTok', youtube: 'YouTube', dailymotion: 'Dailymotion',
  blog: 'Blog', webhook: 'Webhook',
};

const nowIso = () => new Date().toISOString();
const addMinutes = (date, n) => new Date(new Date(date).getTime() + n * 60000);

export function nextRunFor(intervalMinutes, from = Date.now()) {
  return new Date(new Date(from).getTime() + Math.max(1, Number(intervalMinutes) || 1440) * 60000).toISOString();
}

function summaryLine(content) {
  if (content.text) return content.text.split('\n').find((l) => l.trim().length > 12) || content.text.slice(0, 140);
  if (content.caption) return content.caption.split('\n')[0];
  if (content.markdown) return content.markdown.replace(/[#*]/g, '').split('\n').find((l) => l.trim().length > 20) || '';
  return '';
}

async function postJson(url, body, { headers = {}, timeout = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'user-agent': 'LionPost/1.0', ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text: text.slice(0, 500) };
  } catch (err) {
    return { ok: false, status: 0, text: err.name === 'AbortError' ? 'Timed out' : err.message };
  } finally { clearTimeout(timer); }
}

export async function deliver(db, automation, connection, content) {
  const platform = connection?.platform || 'webhook';
  const payload = {
    id: `lp_${Date.now()}`,
    platform,
    title: content.title || summaryLine(content).slice(0, 90),
    text: content.text || content.caption || content.markdown || '',
    hashtags: content.hashtags || [],
    link: content.link || null,
    image: content.image ? { headline: content.image.headline, palette: content.image.palette, motif: content.image.motif } : null,
    scenes: content.scenes || undefined,
    source: 'lionpost',
    created_at: nowIso(),
  };

  if (automation.publish_mode !== 'live') {
    return { ok: true, simulated: true, platform, note: 'Dry run: the post was built and logged, nothing left the server.' };
  }
  if (!connection) {
    return { ok: false, simulated: false, platform, error: 'No connected account attached to this automation.' };
  }
  if (platform === 'webhook') {
    let url = connection.webhook_url || JSON.parse(connection.meta || '{}').webhook_url;
    if (!url) return { ok: false, error: 'This webhook connection has no URL.' };
    if (url.startsWith('/')) url = `${process.env.LIONPOST_URL || `http://127.0.0.1:${process.env.PORT || 3000}`}${url}`;
    const res = await postJson(url, payload);
    return res.ok
      ? { ok: true, simulated: false, platform, status: res.status, note: `Delivered to ${url}` }
      : { ok: false, simulated: false, platform, status: res.status, error: `Webhook failed (${res.status}): ${res.text}` };
  }
  if (platform === 'telegram') {
    const token = decrypt(connection.secret_enc);
    if (!token) return { ok: false, error: 'No Telegram bot token stored for this connection.' };
    const chat = connection.handle.replace(/^@/, '');
    const res = await postJson(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chat, text: `${payload.text}\n\n${payload.link || ''}`.trim(), disable_web_page_preview: false,
    });
    return res.ok
      ? { ok: true, simulated: false, platform, status: res.status, note: 'Sent through the Telegram Bot API.' }
      : { ok: false, simulated: false, platform, status: res.status, error: `Telegram failed (${res.status}): ${res.text}` };
  }
  return {
    ok: false, simulated: false, platform,
    error: `${PLATFORM_LABEL[platform] || platform} needs this workspace's own OAuth app credentials before it can post live. The content was generated and saved.`,
  };
}

export async function executeAutomation(db, automation, { trigger = 'schedule', at = new Date() } = {}) {
  const started = nowIso();
  const info = db.prepare('INSERT INTO runs (automation_id,user_id,status,trigger,started_at) VALUES (?,?,?,?,?)')
    .run(automation.id, automation.user_id, 'running', trigger, started);
  const runId = Number(info.lastInsertRowid);

  try {
    const content = generate(automation.kind === 'post' ? 'caption' : automation.kind, {
      topic: automation.topic, tone: automation.tone, platform: automation.kind,
      seed: String(automation.id) + started.slice(0, 10),
    });
    const connection = automation.connection_id
      ? db.prepare('SELECT * FROM connections WHERE id = ?').get(automation.connection_id)
      : null;
    const delivery = await deliver(db, automation, connection, content);

    if (automation.kind === 'article' || automation.language === '__article__') {
      db.prepare(`INSERT INTO articles (user_id,automation_id,title,slug,body_html,meta_description,keywords,status,created_at)
                  VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(automation.user_id, automation.id, content.title || automation.topic,
          String(content.slug || 'article') + '-' + runId, content.markdown || '',
          content.metaDescription || '', content.keywords || '', 'draft', started);
    }

    const output = {
      title: content.title || null,
      preview: summaryLine(content),
      caption: content.text || content.caption || null,
      hashtags: content.hashtags || [],
      platform: connection?.platform || 'none',
      simulated: Boolean(delivery.simulated),
      delivery,
      kind: content.kind,
    };
    db.prepare('UPDATE runs SET status = ?, finished_at = ?, output = ?, error = ? WHERE id = ?')
      .run(delivery.ok ? 'success' : 'failed', nowIso(), JSON.stringify(output), delivery.ok ? null : delivery.error, runId);
    db.prepare(`UPDATE automations SET last_run_at = ?, next_run_at = ?,
                sent = sent + ?, failed = failed + ?, status = CASE WHEN ? = 0 THEN 'needs_attention' ELSE status END
                WHERE id = ?`)
      .run(started, nextRunFor(automation.interval_minutes, at), delivery.ok ? 1 : 0, delivery.ok ? 0 : 1, delivery.ok ? 1 : 0, automation.id);
    if (delivery.ok) {
      db.prepare('INSERT INTO activity (user_id,kind,detail,created_at) VALUES (?,?,?,?)')
        .run(automation.user_id, 'post_sent', automation.name, started);
    }
    return { id: runId, ok: delivery.ok, output };
  } catch (err) {
    db.prepare('UPDATE runs SET status = ?, finished_at = ?, error = ? WHERE id = ?')
      .run('failed', nowIso(), String(err.message || err), runId);
    db.prepare('UPDATE automations SET failed = failed + 1, last_run_at = ?, next_run_at = ? WHERE id = ?')
      .run(started, nextRunFor(automation.interval_minutes, at), automation.id);
    return { id: runId, ok: false, error: String(err.message || err) };
  }
}

export async function runDue(db, at = new Date()) {
  const due = db.prepare(`SELECT * FROM automations WHERE status = 'active' AND next_run_at <= ? ORDER BY next_run_at LIMIT 25`)
    .all(at.toISOString());
  const results = [];
  for (const automation of due) {
    results.push(await executeAutomation(db, automation, { trigger: 'schedule', at }));
  }
  return results;
}

export async function pollFeed(db, feed) {
  try {
    const parsed = await fetchFeed(feed.url);
    let added = 0;
    for (const item of parsed.items) {
      const exists = db.prepare('SELECT id FROM feed_items WHERE feed_id = ? AND guid = ?').get(feed.id, item.guid);
      if (exists) continue;
      const info = db.prepare('INSERT INTO feed_items (feed_id,guid,title,link,published_at,queued_at) VALUES (?,?,?,?,?,?)')
        .run(feed.id, item.guid, item.title, item.link, item.publishedAt, nowIso());
      added++;
      const content = generate('caption', { topic: item.title, platform: 'instagram' });
      db.prepare('INSERT INTO runs (automation_id,user_id,status,trigger,started_at,finished_at,output) VALUES (NULL,?,?,?,?,?,?)')
        .run(feed.user_id, 'success', 'feed', nowIso(), nowIso(), JSON.stringify({
          title: item.title, link: item.link, preview: content.text.split('\n').slice(0, 3).join(' '),
          platform: 'webhook', simulated: true, feed_id: feed.id, item_id: Number(info.lastInsertRowid),
        }));
    }
    db.prepare("UPDATE feeds SET last_checked_at = ?, last_error = NULL, title = COALESCE(NULLIF(title, ''), ?) WHERE id = ?")
      .run(nowIso(), parsed.title, feed.id);
    if (added) db.prepare('INSERT INTO activity (user_id,kind,detail,created_at) VALUES (?,?,?,?)').run(feed.user_id, 'post_sent', `feed:${feed.id}`, nowIso());
    return { feed: feed.id, added };
  } catch (err) {
    db.prepare('UPDATE feeds SET last_checked_at = ?, last_error = ? WHERE id = ?').run(nowIso(), String(err.message || err), feed.id);
    return { feed: feed.id, error: String(err.message || err) };
  }
}

export async function pollFeeds(db, at = new Date()) {
  const due = db.prepare('SELECT * FROM feeds WHERE active = 1 AND (last_checked_at IS NULL OR last_checked_at <= ?) LIMIT 10')
    .all(new Date(at.getTime() - 60 * 60000).toISOString());
  const out = [];
  for (const feed of due) out.push(await pollFeed(db, feed));
  return out;
}

export function startWorker(db, { intervalMs = 60000, feedsEvery = 10 } = {}) {
  let tick = 0;
  const timer = setInterval(async () => {
    try {
      await runDue(db);
      if (tick++ % feedsEvery === 0) await pollFeeds(db);
    } catch (err) {
      console.error('[worker]', err.message);
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
