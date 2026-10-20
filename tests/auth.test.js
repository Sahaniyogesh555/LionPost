import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';

beforeEach(() => resetLimits());

test('register, session, logout flow', async () => {
  await withServer(async ({ client }) => {
    const page = await client.get('/register');
    assert.equal(page.status, 200);
    assert.match(page.text, /Create my account/);

    const created = await client.register('Nina Park', 'nina@example.com');
    assert.equal(created.status, 303);
    assert.equal(created.location, '/app');
    assert.ok(client.session(), 'session cookie set');

    const app = await client.get('/app');
    assert.equal(app.status, 200);
    assert.match(app.text, /Nina Park/);

    const out = await client.post('/logout', {});
    assert.equal(out.status, 303);
    const after = await client.get('/app');
    assert.equal(after.status, 303);
    assert.match(after.location, /^\/login/);
  });
});

test('register rejects bad input without creating a user', async () => {
  await withServer(async ({ client, db }) => {
    await client.get('/register');
    const short = await client.post('/register', { name: 'Al', email: 'al@example.com', password: 'short', terms: '1' });
    assert.equal(short.status, 422);
    assert.match(short.text, /at least eight characters/);

    const noTerms = await client.post('/register', { name: 'Al Smith', email: 'al2@example.com', password: 'password123' });
    assert.equal(noTerms.status, 422);

    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users WHERE email LIKE ?').get('al%@example.com').n, 0);
  });
});

test('duplicate email is refused and the password is hashed', async () => {
  await withServer(async ({ client, db }) => {
    await client.get('/register');
    const dup = await client.post('/register', { name: 'Copy Cat', email: 'demo@lionpost.local', password: 'password123', terms: '1' });
    assert.equal(dup.status, 422);
    assert.match(dup.text, /already exists/);
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('demo@lionpost.local');
    assert.match(row.password_hash, /^scrypt:/);
    assert.ok(!row.password_hash.includes('demo1234'));
  });
});

test('login rejects a wrong password and accepts the right one', async () => {
  await withServer(async ({ client }) => {
    await client.get('/login');
    const bad = await client.post('/login', { email: 'demo@lionpost.local', password: 'wrong-password' });
    assert.equal(bad.status, 401);
    assert.match(bad.text, /Email or password is wrong/);

    const good = await client.post('/login', { email: 'demo@lionpost.local', password: 'demo1234' });
    assert.equal(good.status, 303);
    assert.equal(good.location, '/app');
  });
});

test('POST without a CSRF token is refused', async () => {
  await withServer(async ({ base }) => {
    const res = await fetch(base + '/login', {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=demo@lionpost.local&password=demo1234',
    });
    assert.equal(res.status, 419);
  });
});

test('JSON API requires a session', async () => {
  await withServer(async ({ client }) => {
    await client.get('/');
    const res = await client.json('/api/studio/generate', { kind: 'caption', topic: 'test' });
    assert.equal(res.status, 401);
  });
});
