import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits, hashPassword, verifyPassword, sha256 } from '../lib/auth.js';
import { encrypt, decrypt, maskSecret } from '../lib/crypto.js';
import { renderMarkdown } from '../lib/markdown.js';

beforeEach(() => resetLimits());

test('passwords hash with scrypt and verify in constant time', () => {
  const hash = hashPassword('correct horse battery');
  assert.match(hash, /^scrypt:16384:8:1:[0-9a-f]{32}:[0-9a-f]{64}$/);
  assert.equal(verifyPassword('correct horse battery', hash), true);
  assert.equal(verifyPassword('correct horse batteru', hash), false);
  assert.equal(verifyPassword('anything', 'garbage'), false);
  assert.throws(() => hashPassword('short'), /at least 8/);
});

test('the vault round-trips and rejects tampering', () => {
  const secret = 'bot-token:123456:AAH';
  const enc = encrypt(secret);
  assert.ok(enc.startsWith('v1:'));
  assert.ok(!enc.includes(secret));
  assert.equal(decrypt(enc), secret);
  const parts = enc.split(':');
  const tampered = [parts[0], parts[1], parts[2], Buffer.from('evil').toString('base64')].join(':');
  assert.equal(decrypt(tampered), null);
  assert.equal(maskSecret(secret).includes('123456'), false);
});

test('session tokens are stored hashed, never raw', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const raw = client.session();
    assert.ok(raw && raw.length >= 48);
    const row = db.prepare('SELECT token_hash FROM sessions ORDER BY id DESC LIMIT 1').get();
    assert.equal(row.token_hash, sha256(raw));
    assert.notEqual(row.token_hash, raw);
  });
});

test('the session cookie is HTTP-only and the CSRF cookie is not', async () => {
  await withServer(async ({ base, client }) => {
    await client.get('/login');
    const res = await fetch(base + '/login', {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: `lion_csrf=${client.csrf()}` },
      body: 'email=demo@lionpost.local&password=demo1234&_csrf=' + encodeURIComponent(client.csrf()),
    });
    const cookies = res.headers.getSetCookie().join('\n');
    assert.match(cookies, /lion_session=[^;]+;.*HttpOnly/i);
    assert.match(cookies, /lion_csrf=.*SameSite/i);
  });
});

test('markdown escapes HTML and refuses javascript: links', () => {
  const html = renderMarkdown('# Hi\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![i](javascript:alert(2))');
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('href="javascript:'));
});

test('changing the password requires the current one', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const wrong = await client.post('/app/settings/password', { current: 'nope', password: 'newpassword1' });
    assert.equal(wrong.status, 403);
    const ok = await client.post('/app/settings/password', { current: 'demo1234', password: 'newpassword1' });
    assert.equal(ok.status, 303);
    const row = db.prepare("SELECT password_hash FROM users WHERE email = 'demo@lionpost.local'").get();
    assert.equal(verifyPassword('newpassword1', row.password_hash), true);
    assert.equal(verifyPassword('demo1234', row.password_hash), false);
  });
});

test('deleting an account cascades and ends the session', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const res = await client.post('/app/settings/delete', {});
    assert.equal(res.status, 303);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'demo@lionpost.local'").get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM automations WHERE user_id = 1').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = 1').get().n, 0);
    const app = await client.get('/app');
    assert.equal(app.status, 303);
  });
});

test('responses carry baseline security headers', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/');
    assert.equal(res.res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.res.headers.get('referrer-policy'), /strict-origin/);
  });
});
