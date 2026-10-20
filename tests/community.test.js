import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';

beforeEach(() => resetLimits());

test('community index and categories render seeded threads', async () => {
  await withServer(async ({ client }) => {
    const page = await client.get('/community');
    assert.equal(page.status, 200);
    assert.match(page.text, /The Lounge/);
    assert.match(page.text, /I stopped scheduling posts by hand/);
    const cat = await client.get('/community/category/automation');
    assert.equal(cat.status, 200);
    assert.match(cat.text, /Automation/);
  });
});

test('creating a thread writes a unique slug and redirects to it', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const first = await client.post('/community/new', { title: 'A test thread about queues', body: 'This is a body with enough words to pass validation.', category_id: '2' });
    assert.equal(first.status, 303);
    assert.match(first.location, /^\/community\/a-test-thread-about-queues/);
    await client.get(first.location);
    const second = await client.post('/community/new', { title: 'A test thread about queues', body: 'A second body with enough words to pass validation.', category_id: '2' });
    assert.equal(second.status, 303);
    assert.notEqual(second.location, first.location);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM posts WHERE slug LIKE ?').get('a-test-thread-about-queues%').n, 2);
  });
});

test('comments, replies and likes work and notify the author', async () => {
  await withServer(async ({ client, db }) => {
    await client.login('aria@lionpost.local', 'lionpost123');
    const post = db.prepare('SELECT id, slug, user_id FROM posts ORDER BY id LIMIT 1').get();
    const comment = await client.post(`/community/${post.slug}/comment`, { body: 'A useful reply from another member.' });
    assert.equal(comment.status, 303);
    const row = db.prepare('SELECT COUNT(*) AS n FROM comments WHERE post_id = ?').get(post.id);
    assert.ok(row.n >= 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?').get(post.user_id).n >= 1, true);

    const before = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE post_id = ? AND user_id = 2').get(post.id).n;
    await client.post(`/community/${post.slug}/like`, {});
    const after = db.prepare('SELECT COUNT(*) AS n FROM likes WHERE post_id = ? AND user_id = 2').get(post.id).n;
    assert.notEqual(before, after);
  });
});

test('permissions: only the author or an admin can pin, lock or delete', async () => {
  await withServer(async ({ client, db }) => {
    await client.login('diego@lionpost.local', 'lionpost123');
    const mine = db.prepare("SELECT p.* FROM posts p JOIN users u ON u.id = p.user_id WHERE u.handle = 'aria' LIMIT 1").get();
    const forbid = await client.post(`/community/${mine.slug}/delete`, {});
    assert.equal(forbid.status, 403);
    const pin = await client.post(`/community/${mine.slug}/pin`, {});
    assert.equal(pin.status, 403);

    await client.post('/logout', {});
    await client.login();
    const ok = await client.post(`/community/${mine.slug}/delete`, {});
    assert.equal(ok.status, 303);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM posts WHERE id = ?').get(mine.id).n, 0);
  });
});

test('locked threads refuse new replies', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const post = db.prepare('SELECT * FROM posts ORDER BY id LIMIT 1').get();
    await client.post(`/community/${post.slug}/lock`, {});
    const res = await client.post(`/community/${post.slug}/comment`, { body: 'Trying to reply to a locked thread.' });
    assert.equal(res.status, 403);
  });
});

test('search matches titles and bodies', async () => {
  await withServer(async ({ client }) => {
    const hit = await client.get('/community?q=carousel');
    assert.equal(hit.status, 200);
    assert.match(hit.text, /Carousel teardown/);
    const miss = await client.get('/community?q=zzzznothing');
    assert.match(miss.text, /Nothing here yet/);
  });
});

test('user HTML in a thread is escaped, not executed', async () => {
  await withServer(async ({ client }) => {
    await client.login();
    const created = await client.post('/community/new', {
      title: 'XSS <script>alert(1)</script> check',
      body: 'Body with <script>alert(2)</script> and <img src=x onerror=alert(3)> inside it.',
      category_id: '1',
    });
    assert.equal(created.status, 303);
    const page = await client.get(created.location);
    assert.equal(page.status, 200);
    assert.ok(!page.text.includes('<script>alert(2)</script>'), 'raw script tag must not appear');
    assert.match(page.text, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  });
});

test('profile pages list threads and 404 on unknown handles', async () => {
  await withServer(async ({ client }) => {
    const profile = await client.get('/u/aria');
    assert.equal(profile.status, 200);
    assert.match(profile.text, /Aria Bennett/);
    assert.match(profile.text, /threads/);
    const missing = await client.get('/u/nobody-here');
    assert.equal(missing.status, 404);
  });
});
