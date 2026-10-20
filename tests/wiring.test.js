import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withServer } from './helpers.js';

/* The client scripts are the one part of the app a headless test cannot click
 * through: canvas rendering, MediaRecorder capture, and drag-free file export
 * all need a real browser. What it can do is prove the wiring — every id,
 * attribute and script the client code reaches for is actually in the markup
 * the server sends. That is the failure mode that ships a dead button. */

const root = path.resolve(import.meta.dirname, '..');
const clientDir = path.join(root, 'public/js');

function clientSource(file) {
  return fs.readFileSync(path.join(clientDir, file), 'utf8');
}

function idsIn(source) {
  const ids = new Set();
  for (const m of source.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) ids.add(m[1]);
  for (const m of source.matchAll(/querySelector(?:All)?\(\s*['"]#([A-Za-z0-9_-]+)['"]\s*\)/g)) ids.add(m[1]);
  return [...ids];
}

function hasId(html, id) {
  return new RegExp(`id=["']${id}["']`).test(html);
}

function scriptsOn(html) {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
}

test('every script a page loads exists and is served', async () => {
  await withServer(async ({ base, client }) => {
    await client.login();
    const pages = ['/', '/tools', '/community', '/blog', '/app', '/app/studio', '/app/carousel', '/app/videos', '/app/shorts', '/app/keywords', '/app/aeo', '/app/automations', '/app/connections', '/app/feeds'];
    for (const page of pages) {
      const res = await client.get(page);
      assert.equal(res.status, 200, page);
      const scripts = scriptsOn(res.text);
      assert.ok(scripts.length > 0, `${page} loads no scripts`);
      for (const src of scripts) {
        const url = src.startsWith('http') ? src : base + (src.startsWith('/') ? src : '/' + src);
        if (!url.startsWith(base)) continue;
        const asset = await fetch(url);
        assert.equal(asset.status, 200, `${page} -> ${src}`);
        assert.match(asset.headers.get('content-type') || '', /javascript/, src);
      }
    }
  });
});

test('the ids the studio scripts look for are in the markup', async () => {
  const pairs = [
    ['/app/studio', ['studio.js']],
    ['/app/carousel', ['carousel.js']],
    ['/app/videos', ['video.js']],
    ['/app/shorts', ['shorts.js']],
  ];
  await withServer(async ({ client }) => {
    await client.login();
    for (const [page, files] of pairs) {
      const res = await client.get(page);
      assert.equal(res.status, 200, page);
      for (const file of files) {
        for (const id of idsIn(clientSource(file))) {
          assert.ok(hasId(res.text, id), `${page}: ${file} wants #${id}, markup has no such id`);
        }
      }
    }
  });
});

test('the carousel and video pages embed parseable JSON payloads', async () => {
  await withServer(async ({ client }) => {
    await client.login();
    const carousel = await client.get('/app/carousel');
    const deck = carousel.text.match(/<script type="application\/json" data-deck>([\s\S]*?)<\/script>/);
    assert.ok(deck, 'no data-deck payload');
    const parsed = JSON.parse(deck[1].replace(/\\u003c/g, '<'));
    assert.ok(Array.isArray(parsed.slides) && parsed.slides.length > 0);

    const videos = await client.get('/app/videos');
    const video = videos.text.match(/<script type="application\/json" data-video-data>([\s\S]*?)<\/script>/);
    assert.ok(video, 'no data-video-data payload');
    const scenes = JSON.parse(video[1].replace(/\\u003c/g, '<'));
    assert.ok(Array.isArray(scenes.scenes));
  });
});

test('demo endpoints are wired to the markup that calls them', async () => {
  await withServer(async ({ client }) => {
    for (const [page, slug, api] of [
      ['/tools/keyword-research', 'keyword-research', '/api/demo/keywords'],
      ['/tools/aeo-checker', 'aeo-checker', '/api/demo/aeo'],
    ]) {
      const res = await client.get(page);
      assert.equal(res.status, 200, page);
      assert.match(res.text, new RegExp(`data-demo-form="${slug}"`), page);
      assert.match(res.text, new RegExp(`data-demo="${slug}"`), page);
      assert.match(res.text, /data-demo-out/, page);
      assert.match(res.text, /data-demo-form/, page);
      const js = clientSource('tools.js');
      assert.ok(js.includes(api), `tools.js never calls ${api}`);
    }
    // The demo really answers: no account, just the page's own CSRF cookie.
    const demo = await client.json('/api/demo/keywords', { seed: 'design systems' });
    assert.equal(demo.status, 200);
    const body = JSON.parse(demo.text);
    assert.ok(body.result.keywords.length >= 3);
    assert.ok(body.result.keywords.every((k) => k.keyword && k.volume > 0));
  });
});

test('each page script finds the element it guards on', async () => {
  const guard = (file) => {
    const m = clientSource(file).match(/document\.querySelector\(\s*['"]([^'"]+)['"]/);
    return m && m[1];
  };
  const dataAttr = (sel) => sel && sel.startsWith('[data-') && sel.endsWith(']') ? sel.slice(6, -1) : null;
  await withServer(async ({ client, db }) => {
    await client.login();
    const thread = db.prepare('SELECT slug FROM posts LIMIT 1').get();
    const pairs = [
      ['/app/studio', 'studio.js'],
      ['/app/carousel', 'carousel.js'],
      ['/app/videos', 'video.js'],
      ['/app/shorts', 'shorts.js'],
      [`/community/${thread.slug}`, 'community.js'],
    ];
    for (const [page, file] of pairs) {
      const res = await client.get(page);
      assert.equal(res.status, 200, page);
      const attr = dataAttr(guard(file));
      assert.ok(attr, `${file}: could not read a data-attribute guard`);
      assert.ok(res.text.includes(attr), `${page}: ${file} guards on ${attr}, not in the markup`);
    }
  });
});
