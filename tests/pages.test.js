import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';
import { TOOLS } from '../lib/tools.js';

beforeEach(() => resetLimits());

test('the landing page carries the hero, stats and all sixteen tools', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /Publish everywhere/);
    assert.match(res.text, /Sixteen tools/);
    for (const tool of TOOLS) assert.ok(res.text.includes(tool.name), `missing ${tool.name}`);
    assert.match(res.text, /The Lounge/);
  });
});

test('the tools index and every tool page render', async () => {
  await withServer(async ({ client }) => {
    const index = await client.get('/tools');
    assert.equal(index.status, 200);
    for (const tool of TOOLS) {
      const page = await client.get(`/tools/${tool.slug}`);
      assert.equal(page.status, 200, tool.slug);
      assert.ok(page.text.includes(tool.name));
    }
    const missing = await client.get('/tools/not-a-real-tool');
    assert.equal(missing.status, 404);
  });
});

test('blog index and article carry canonical and JSON-LD', async () => {
  await withServer(async ({ client, db }) => {
    const list = await client.get('/blog');
    assert.equal(list.status, 200);
    const post = db.prepare('SELECT slug, title FROM blog_posts LIMIT 1').get();
    const article = await client.get('/blog/' + post.slug);
    assert.equal(article.status, 200);
    assert.match(article.text, /application\/ld\+json/);
    assert.match(article.text, /"FAQPage"/);
    assert.match(article.text, /rel="canonical"/);
    assert.match(article.text, /<h3>How many posts should one person schedule\?<\/h3>|<h3>/);
  });
});

test('machine-readable endpoints exist and describe the site', async () => {
  await withServer(async ({ client }) => {
    const robots = await client.get('/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.text, /GPTBot/);
    assert.match(robots.text, /Sitemap:/);

    const sitemap = await client.get('/sitemap.xml');
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.text, /<urlset/);
    assert.match(sitemap.text, /\/blog\//);

    const feed = await client.get('/feed.xml');
    assert.equal(feed.status, 200);
    assert.match(feed.text, /<rss/);
    assert.match(feed.text, /<item>/);

    const llms = await client.get('/llms.txt');
    assert.equal(llms.status, 200);
    assert.match(llms.text, /^# LionPost/);
  });
});

test('unknown pages return a branded 404', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/nothing/here');
    assert.equal(res.status, 404);
    assert.match(res.text, /Page not found/);
    assert.match(res.text, /LionPost/);
  });
});

test('every app screen renders for a signed-in member', async () => {
  await withServer(async ({ client }) => {
    await client.login();
    const pages = ['/app', '/app/studio', '/app/automations', '/app/automations/new', '/app/automations/1',
      '/app/connections', '/app/connections/new?platform=webhook', '/app/feeds', '/app/keywords', '/app/aeo',
      '/app/videos', '/app/carousel', '/app/shorts', '/app/settings', '/app/notifications'];
    for (const path of pages) {
      const res = await client.get(path);
      assert.equal(res.status, 200, path);
    }
  });
});

test('generating in the studio renders a draft, and saving stores an article', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const gen = await client.post('/app/studio', { kind: 'article', topic: 'a weekly review', tone: 'direct', platform: 'blog' });
    assert.equal(gen.status, 200);
    assert.match(gen.text, /data-output-text/);
    assert.match(gen.text, /Image brief/);

    const saved = await client.post('/app/studio/save', { title: 'Saved draft', body: '# Hello\n\nA body.', meta: 'm', keywords: 'k' });
    assert.equal(saved.status, 303);
    const id = Number(saved.location.split('/').pop());
    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    assert.equal(row.title, 'Saved draft');
    const page = await client.get(`/app/articles/${id}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Hello/);
  });
});

test('health endpoint answers without a session', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.text).app, 'lionpost');
  });
});
