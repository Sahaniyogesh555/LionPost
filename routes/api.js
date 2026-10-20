import { Router } from '../lib/http.js';
import { HttpError } from '../lib/errors.js';
import { hitLimit } from '../lib/auth.js';
import { generate, geminiDraft } from '../lib/generator.js';
import { research } from '../lib/keywords.js';
import { analyze, fetchPage } from '../lib/aeo.js';
import { decrypt } from '../lib/crypto.js';
import { executeAutomation } from '../lib/scheduler.js';
import { pollFeed } from '../lib/scheduler.js';

function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, 'Sign in first');
  return ctx.user;
}
const body = (ctx) => ctx.jsonBody || {};

export function apiRoutes() {
  const r = new Router();

  r.get('/api/health', (ctx) => ctx.json({ ok: true, app: 'lionpost', time: new Date().toISOString() }));

  // A real endpoint to point a webhook connection at, to prove delivery.
  r.post('/api/echo', (ctx) => ctx.json({
    ok: true, received: true, at: new Date().toISOString(),
    event: ctx.req.headers['x-lionpost-event'] || null, body: ctx.jsonBody,
  }));

  r.post('/api/studio/generate', (ctx) => {
    const user = requireUser(ctx);
    if (hitLimit(`gen:${user.id}`, 60, 60000)) throw new HttpError(429, 'Slow down: 60 generations a minute');
    const { kind = 'caption', topic = '', tone = 'practical', platform = 'instagram' } = body(ctx);
    if (String(topic).trim().length < 2) throw new HttpError(422, 'Give me a topic first');
    const result = generate(String(kind), { topic: String(topic).slice(0, 160), tone: String(tone), platform: String(platform) });
    ctx.json({ ok: true, result });
  });

  r.post('/api/keywords', (ctx) => {
    const user = requireUser(ctx);
    if (hitLimit(`kw:${user.id}`, 30, 60000)) throw new HttpError(429, 'Slow down a little');
    const { seed = '', market = 'US' } = body(ctx);
    let result;
    try { result = research(String(seed), { market: String(market) }); } catch (err) { throw new HttpError(422, err.message); }
    const info = ctx.db.prepare('INSERT INTO keyword_research (user_id,seed,market,results,created_at) VALUES (?,?,?,?,?)')
      .run(user.id, seed, market, JSON.stringify({ keywords: result.keywords, summary: result.summary }), new Date().toISOString());
    ctx.json({ ok: true, result: { ...result, id: Number(info.lastInsertRowid) } });
  });

  r.post('/api/aeo', async (ctx) => {
    const user = requireUser(ctx);
    if (hitLimit(`aeo:${user.id}`, 20, 60000)) throw new HttpError(429, 'That is a lot of checks. Wait a minute.');
    const { url = '', html = '' } = body(ctx);
    let analysis, finalUrl = url, status = 200;
    try {
      if (html) analysis = analyze({ html, url: '' });
      else {
        const page = await fetchPage(String(url));
        finalUrl = page.url; status = page.status;
        analysis = analyze({ html: page.html, url: page.url, robots: page.robots, llms: page.llms, status: page.status });
      }
    } catch (err) {
      throw new HttpError(422, `Could not read that page: ${err.message}`);
    }
    const info = ctx.db.prepare('INSERT INTO aeo_reports (user_id,url,score,checks,created_at) VALUES (?,?,?,?,?)')
      .run(user.id, finalUrl || 'Pasted HTML', analysis.score, JSON.stringify({ ...analysis, status }), new Date().toISOString());
    ctx.json({ ok: true, report: { ...analysis, url: finalUrl || 'Pasted HTML', id: Number(info.lastInsertRowid) } });
  });

  r.post('/api/automations/:id/run', async (ctx) => {
    const user = requireUser(ctx);
    const automation = ctx.db.prepare('SELECT * FROM automations WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!automation) throw new HttpError(404, 'Automation not found');
    const result = await executeAutomation(ctx.db, automation, { trigger: 'manual' });
    ctx.json({ ok: result.ok, run: { id: result.id, error: result.error || null, output: result.output || null } });
  });

  r.post('/api/feeds/:id/check', async (ctx) => {
    const user = requireUser(ctx);
    const feed = ctx.db.prepare('SELECT * FROM feeds WHERE id = ? AND user_id = ?').get(Number(ctx.params.id), user.id);
    if (!feed) throw new HttpError(404, 'Feed not found');
    ctx.json({ ok: true, result: await pollFeed(ctx.db, feed) });
  });

  r.post('/api/translate', async (ctx) => {
    const user = requireUser(ctx);
    const { srt = '', language = 'Spanish', shift = 0 } = body(ctx);
    const text = String(srt).slice(0, 40000);
    if (!text.trim()) throw new HttpError(422, 'Paste an SRT first');
    const key = decrypt(user.gemini_key_enc);
    if (!key) {
      ctx.json({
        ok: false,
        needsKey: true,
        error: 'Translation needs a Gemini key in settings. Timing tools still work offline.',
      });
      return;
    }
    const prompt = `Translate these subtitles to ${language}. Keep the SRT numbering and timestamps exactly as they are, and only translate the text lines. Return only the SRT.\n\n${text}`;
    const draft = await geminiDraft({ apiKey: key, prompt });
    if (!draft.ok) throw new HttpError(502, draft.error);
    ctx.json({ ok: true, srt: draft.text, language, shift: Number(shift) || 0 });
  });

  // Public demos: no account, small output, rate limited by IP.
  r.post('/api/demo/keywords', (ctx) => {
    if (hitLimit(`demo-kw:${ctx.ip}`, 12, 10 * 60000)) throw new HttpError(429, 'Demo limit reached. Make a free account to keep going.');
    const seed = String(body(ctx).seed || '');
    let result;
    try { result = research(seed); } catch (err) { throw new HttpError(422, err.message); }
    ctx.json({ ok: true, result: { seed: result.seed, keywords: result.keywords.slice(0, 5), summary: result.summary } });
  });

  r.post('/api/demo/aeo', async (ctx) => {
    if (hitLimit(`demo-aeo:${ctx.ip}`, 8, 10 * 60000)) throw new HttpError(429, 'Demo limit reached. Make a free account to keep going.');
    const { target = '' } = body(ctx);
    const value = String(target || '').trim();
    if (!value) throw new HttpError(422, 'Paste a URL or some HTML');
    let analysis;
    try {
      if (/^https?:\/\//i.test(value)) {
        const page = await fetchPage(value);
        analysis = analyze({ html: page.html, url: page.url, robots: page.robots, llms: page.llms, status: page.status });
      } else {
        analysis = analyze({ html: value, url: '' });
      }
    } catch (err) {
      throw new HttpError(422, `Could not read that page: ${err.message}`);
    }
    ctx.json({ ok: true, report: { score: analysis.score, checks: analysis.checks.slice(0, 6), stats: analysis.stats } });
  });

  return r;
}
