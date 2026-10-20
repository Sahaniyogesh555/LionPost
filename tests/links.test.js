import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';

/* A replica is only finished if you can walk it. This crawls every page a
 * signed-in member can reach, follows each internal href once, and fails on any
 * 404 or 500. External links are skipped — the sandbox has no internet. */

const SKIP = /^(\/logout|\/reset|#|mailto:|tel:|javascript:)/i;

function internalLinks(html, pagePath) {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    let href = m[1].replaceAll('&amp;', '&');
    if (!href || SKIP.test(href) || href.startsWith('//')) continue;
    if (/^https?:/i.test(href)) {
      try {
        const u = new URL(href);
        if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') continue;
        href = u.pathname + u.search;
      } catch { continue; }
    }
    if (!href.startsWith('/')) continue;
    const base = href.split('#')[0];
    if (!base || base === pagePath) continue;
    out.add(base);
  }
  return [...out];
}

test('every internal link on every page resolves', async () => {
  await withServer(async ({ client }) => {
    await client.login();
    const seeds = ['/', '/tools', '/community', '/blog', '/about', '/terms', '/privacy',
      '/app', '/app/studio', '/app/automations', '/app/connections', '/app/feeds',
      '/app/keywords', '/app/aeo', '/app/videos', '/app/carousel', '/app/shorts', '/app/settings'];
    const seen = new Set();
    const broken = [];
    const queue = [...seeds];
    while (queue.length) {
      const path = queue.shift();
      if (seen.has(path)) continue;
      seen.add(path);
      const res = await client.get(path);
      if (res.status >= 400) { broken.push(`${path} -> ${res.status}`); continue; }
      const type = res.res.headers.get('content-type') || '';
      if (!/text\/html/.test(type)) continue;
      for (const link of internalLinks(res.text, path)) {
        if (!seen.has(link) && seen.size + queue.length < 220) queue.push(link);
      }
    }
    assert.deepEqual(broken, [], `broken links:\n${broken.join('\n')}`);
    assert.ok(seen.size >= 40, `only crawled ${seen.size} pages`);
  });
});

test('the public site is walkable without an account', async () => {
  await withServer(async ({ base }) => {
    const { makeClient } = await import('./helpers.js');
    const client = makeClient(base);
    for (const path of ['/', '/tools', '/community', '/blog', '/about', '/terms', '/privacy', '/login', '/register', '/forgot']) {
      const res = await client.get(path);
      assert.equal(res.status, 200, path);
      for (const link of internalLinks(res.text, path)) {
        if (link.startsWith('/app')) continue; // guarded, redirects to login by design
        const next = await client.get(link);
        assert.ok(next.status < 400, `${path} -> ${link} -> ${next.status}`);
      }
    }
  });
});
