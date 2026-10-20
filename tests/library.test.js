import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';

beforeEach(() => resetLimits());

test('the video shelf lists the seeded clips with duration and views', async () => {
  await withServer(async ({ client, db }) => {
    const res = await client.get('/videos');
    assert.equal(res.status, 200);
    const rows = db.prepare('SELECT * FROM showcase_videos').all();
    assert.ok(rows.length >= 4);
    for (const v of rows) {
      assert.ok(res.text.includes(v.title), v.title);
      const m = `${Math.floor(v.duration_seconds / 60)}:${String(v.duration_seconds % 60).padStart(2, '0')}`;
      assert.ok(res.text.includes(m), `${v.slug} shows ${m}`);
    }
    assert.match(res.text, /class="video-card"/);
  });
});

test('watching a video embeds a playable payload and counts the view', async () => {
  await withServer(async ({ base, client, db }) => {
    const before = db.prepare("SELECT views FROM showcase_videos WHERE slug = 'the-boring-half-of-publishing'").get().views;
    const res = await client.get('/videos/the-boring-half-of-publishing');
    assert.equal(res.status, 200);
    assert.match(res.text, /data-video-canvas/);
    const payload = res.text.match(/<script type="application\/json" data-video-data>([\s\S]*?)<\/script>/);
    assert.ok(payload, 'no video payload');
    const parsed = JSON.parse(payload[1].replace(/\\u003c/g, '<'));
    assert.ok(Array.isArray(parsed.scenes) && parsed.scenes.length >= 3);
    assert.equal(parsed.title, 'The boring half of publishing');
    assert.match(res.text, /"@type":"VideoObject"/);
    assert.match(res.text, new RegExp(`rel="canonical" href="${base}/videos/the-boring-half-of-publishing"`));
    const after = db.prepare("SELECT views FROM showcase_videos WHERE slug = 'the-boring-half-of-publishing'").get().views;
    assert.equal(after, before + 1);
    const missing = await client.get('/videos/not-a-clip');
    assert.equal(missing.status, 404);
  });
});

test('the blog filters by topic and lists the topics it has', async () => {
  await withServer(async ({ client, db }) => {
    const tags = db.prepare('SELECT DISTINCT tag FROM blog_posts').all().map((t) => t.tag);
    const list = await client.get('/blog');
    assert.equal(list.status, 200);
    for (const tag of tags) assert.ok(list.text.includes(tag), tag);

    const first = db.prepare('SELECT tag FROM blog_posts LIMIT 1').get().tag;
    const filtered = await client.get('/blog/tag/' + encodeURIComponent(first));
    assert.equal(filtered.status, 200);
    assert.ok(filtered.text.includes(`${first} posts.`));
    const total = db.prepare('SELECT COUNT(*) AS n FROM blog_posts').get().n;
    const shown = (filtered.text.match(/class="post-card"/g) || []).length;
    assert.ok(shown < total, 'filtered view should be smaller than the full list');

    const none = await client.get('/blog/tag/definitely-not-a-topic');
    assert.equal(none.status, 404);
  });
});

test('a post carries share controls and a working canonical', async () => {
  await withServer(async ({ base, client, db }) => {
    const post = db.prepare('SELECT slug, title FROM blog_posts LIMIT 1').get();
    const res = await client.get('/blog/' + post.slug);
    assert.equal(res.status, 200);
    assert.match(res.text, /class="share-row/);
    for (const host of ['x.com/intent', 'facebook.com/sharer', 'linkedin.com/sharing', 'reddit.com/submit']) {
      assert.ok(res.text.includes(host), host);
    }
    assert.match(res.text, /data-copy-url/);
    assert.match(res.text, new RegExp(`rel="canonical" href="${base}/blog/${post.slug}"`));
    assert.ok(res.text.includes(`mainEntityOfPage":"${base}/blog/${post.slug}`));
  });
});

test('icons, manifest and sitemap cover the new surfaces', async () => {
  await withServer(async ({ client }) => {
    for (const [path, type] of [
      ['/assets/manifest.webmanifest', /application\/manifest\+json/],
      ['/assets/icons/icon-192.png', /image\/png/],
      ['/assets/icons/icon-512.png', /image\/png/],
      ['/assets/icons/icon-maskable-512.png', /image\/png/],
      ['/assets/apple-touch-icon.png', /image\/png/],
    ]) {
      const res = await client.get(path);
      assert.equal(res.status, 200, path);
      assert.match(res.res.headers.get('content-type'), type, path);
    }
    const manifest = JSON.parse((await client.get('/assets/manifest.webmanifest')).text);
    assert.equal(manifest.short_name, 'LionPost');
    assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));

    const home = await client.get('/');
    assert.match(home.text, /rel="manifest"/);
    assert.match(home.text, /apple-touch-icon/);
    assert.match(home.text, /href="\/videos"/);

    const sitemap = await client.get('/sitemap.xml');
    assert.match(sitemap.text, /\/videos\//);
    assert.match(sitemap.text, /\/blog\/tag\//);
  });
});
