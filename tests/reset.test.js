import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits, verifyPassword } from '../lib/auth.js';
import { outboxItems, clearOutbox } from '../lib/mailer.js';

beforeEach(() => { resetLimits(); clearOutbox(); });

test('the forgot screen renders without a session', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/forgot');
    assert.equal(res.status, 200);
    assert.match(res.text, /Forgot the password\?/);
    assert.match(res.text, /Send the reset link/);
  });
});

test('an unknown address gets the same confirmation and no mail', async () => {
  await withServer(async ({ client }) => {
    await client.get('/forgot');
    const res = await client.post('/forgot', { email: 'nobody@example.com' });
    assert.equal(res.status, 200);
    assert.match(res.text, /Link sent/);
    assert.doesNotMatch(res.text, /reset\?token=/);
    assert.equal(outboxItems().length, 0);
  });
});

test('a known address mails a one-hour link and the reset changes the password', async () => {
  await withServer(async ({ base, client, db }) => {
    await client.get('/forgot');
    const asked = await client.post('/forgot', { email: 'demo@lionpost.local' });
    assert.equal(asked.status, 200);
    assert.equal(outboxItems().length, 1);
    const mail = outboxItems()[0];
    assert.equal(mail.to, 'demo@lionpost.local');
    const token = new URL(mail.link).searchParams.get('token');
    assert.ok(token && token.length === 64);

    const form = await client.get('/reset?token=' + token);
    assert.equal(form.status, 200);
    assert.match(form.text, /Save and sign in/);

    const weak = await client.post('/reset', { token, password: 'short', confirm: 'short' });
    assert.equal(weak.status, 422);
    const mismatch = await client.post('/reset', { token, password: 'testpass123', confirm: 'testpass124' });
    assert.equal(mismatch.status, 422);

    const ok = await client.post('/reset', { token, password: 'testpass123', confirm: 'testpass123' });
    assert.equal(ok.status, 303);
    assert.equal(ok.location, '/login');
    const row = db.prepare("SELECT password_hash FROM users WHERE email = 'demo@lionpost.local'").get();
    assert.equal(verifyPassword('testpass123', row.password_hash), true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = 1').get().n, 0);

    const again = await client.post('/reset', { token, password: 'another123', confirm: 'another123' });
    assert.equal(again.status, 410);
  });
});

test('a used or invented token shows the expired screen', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/reset?token=deadbeef');
    assert.equal(res.status, 200);
    assert.match(res.text, /Start again/);
    assert.match(res.text, /Request a fresh link/);
  });
});

test('signing in with the new password works and the old one does not', async () => {
  await withServer(async ({ client }) => {
    await client.get('/forgot');
    await client.post('/forgot', { email: 'demo@lionpost.local' });
    const token = new URL(outboxItems()[0].link).searchParams.get('token');
    await client.post('/reset', { token, password: 'freshpass1', confirm: 'freshpass1' });

    const oldLogin = await client.post('/login', { email: 'demo@lionpost.local', password: 'demo1234' });
    assert.equal(oldLogin.status, 401);
    const newLogin = await client.post('/login', { email: 'demo@lionpost.local', password: 'freshpass1' });
    assert.equal(newLogin.status, 303);
    assert.equal(newLogin.location, '/app');
  });
});

test('the login page links to the reset screen', async () => {
  await withServer(async ({ client }) => {
    const res = await client.get('/login');
    assert.match(res.text, /href="\/forgot"/);
  });
});
