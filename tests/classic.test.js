import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';

beforeEach(() => resetLimits());

/* The classic theme is a second front end over the same data. These tests
 * hold it to the same bar as the main one: it renders, its links resolve,
 * and it does not drift away from the posts it is supposed to list. */

test('the classic landing page renders every section in order', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/classic');
    assert.equal(res.status, 200);
    const order = ['c-hero', 'c-strip', 'c-features', 'c-split', 'c-band', 'c-stats', 'c-footer'];
    const positions = order.map((cls) => res.text.indexOf(cls));
    positions.forEach((pos, i) => assert.ok(pos > -1, `missing ${order[i]}`));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'sections out of order');
    assert.match(res.text, /calm way to publish everywhere/);
    assert.match(res.text, /Get it now/);
    assert.equal((res.text.match(/class="c-feature"/g) || []).length, 4);
    assert.match(res.text, /\/assets\/css\/classic\.css/);
    assert.match(res.text, /\/assets\/js\/classic\.js/);
    assert.match(res.text, /href="\/register"/);
  });
});

test('the classic blog groups posts by year and lists every post', async () => {
  await withServer(async ({ client, db }) => {
    const res = await client.get('/classic/blog');
    assert.equal(res.status, 200);
    const posts = db.prepare('SELECT slug, title, published_at FROM blog_posts ORDER BY published_at DESC').all();
    for (const p of posts) assert.ok(res.text.includes(`/classic/blog/${p.slug}`), p.slug);
    const years = [...new Set(posts.map((p) => String(p.published_at).slice(0, 4)))];
    for (const y of years) assert.match(res.text, new RegExp(`id="${y}-ref"`), y);
    assert.match(res.text, /c-side-card/);
  });
});

test('classic topics filter and unknown ones 404', async () => {
  await withServer(async ({ client, db }) => {
    const tag = db.prepare('SELECT tag FROM blog_posts LIMIT 1').get().tag;
    const res = await client.get('/classic/blog/tag/' + encodeURIComponent(tag));
    assert.equal(res.status, 200);
    assert.ok(res.text.includes(`Filed under ${tag}`));
    const none = await client.get('/classic/blog/tag/not-a-topic');
    assert.equal(none.status, 404);
  });
});

test('a classic article renders body, canonical and share links', async () => {
  await withServer(async ({ base, client, db }) => {
    const post = db.prepare('SELECT slug, title FROM blog_posts LIMIT 1').get();
    const res = await client.get('/classic/blog/' + post.slug);
    assert.equal(res.status, 200);
    assert.ok(res.text.includes(post.title));
    assert.match(res.text, /class="md"/);
    assert.match(res.text, new RegExp(`rel="canonical" href="${base}/classic/blog/${post.slug}"`));
    assert.match(res.text, /x\.com\/intent/);
    assert.match(res.text, /linkedin\.com\/sharing/);
    const missing = await client.get('/classic/blog/nope');
    assert.equal(missing.status, 404);
  });
});

test('the classic assets are served and the stylesheet is self-contained', async () => {
  await withServer(async ({ client }) => {
    const css = await client.get('/assets/css/classic.css');
    assert.equal(css.status, 200);
    assert.match(css.res.headers.get('content-type'), /text\/css/);
    assert.ok(css.text.length > 8000);
    const rules = css.text.replace(/\/\*[\s\S]*?\*\//g, ''); // ignore comments, judge the rules
    assert.doesNotMatch(rules, /bootstrap|cdn\.|@import|fonts\.googleapis/i);
    const js = await client.get('/assets/js/classic.js');
    assert.equal(js.status, 200);
    assert.match(js.res.headers.get('content-type'), /javascript/);
  });
});

test('the main site links to the classic theme', async () => {
  await withServer(async ({ client }) => {
    const home = await client.get('/');
    assert.match(home.text, /href="\/classic"/);
    const about = await client.get('/about');
    assert.match(about.text, /href="\/classic"/);
  });
});

test('LIONPOST_THEME=classic serves the old layout at the canonical paths', async () => {
  const previous = process.env.LIONPOST_THEME;
  process.env.LIONPOST_THEME = 'classic';
  try {
    await withServer(async ({ client, db }) => {
      const home = await client.get('/');
      assert.equal(home.status, 200);
      assert.match(home.text, /class="classic"/);
      assert.match(home.text, /c-phone/);

      const blog = await client.get('/blog');
      assert.match(blog.text, /c-blog-head/);
      assert.match(blog.text, /c-year/);

      const post = db.prepare('SELECT slug FROM blog_posts LIMIT 1').get();
      const article = await client.get('/blog/' + post.slug);
      assert.equal(article.status, 200);
      assert.match(article.text, /c-article/);

      // With the theme on, the classic layout is the front door: no link
      // should tell the reader to go and see the design they are looking at.
      assert.doesNotMatch(home.text, /Switch to the new look/);
      assert.doesNotMatch(home.text, /see the current design/);
      assert.match(home.text, /The original layout, rebuilt/);
      // ...and its own links stay at the root, not back under /classic.
      assert.match(home.text, /href="\/blog\//);
      assert.doesNotMatch(home.text, /href="\/classic\/blog/);

      const tagPage = await client.get('/blog/tag/Engineering');
      assert.equal(tagPage.status, 200);
      assert.match(tagPage.text, /class="classic"/);
      assert.match(tagPage.text, /c-year/);
      assert.match(tagPage.text, /href="\/blog\/tag\/Engineering"/);

      // The app is untouched by the theme switch.
      const login = await client.get('/login');
      assert.match(login.text, /auth-wrap/);
    });
  } finally {
    if (previous === undefined) delete process.env.LIONPOST_THEME;
    else process.env.LIONPOST_THEME = previous;
  }
});
