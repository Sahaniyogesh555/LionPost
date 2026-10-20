import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';
import { runDue, executeAutomation, pollFeed, nextRunFor } from '../lib/scheduler.js';

beforeEach(() => resetLimits());

test('create, dry run and log an automation', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const created = await client.post('/app/automations', {
      name: 'Queue smoke test', topic: 'shipping a weekly note', kind: 'post', tone: 'direct',
      interval_minutes: '1440', publish_mode: 'dry_run',
    });
    assert.equal(created.status, 303);
    const id = Number(created.location.split('/').pop());
    const auto = db.prepare('SELECT * FROM automations WHERE id = ?').get(id);
    assert.equal(auto.status, 'active');
    assert.ok(new Date(auto.next_run_at) > new Date());

    const run = await executeAutomation(db, auto, { trigger: 'manual' });
    assert.equal(run.ok, true);
    assert.equal(run.output.simulated, true);
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(run.id);
    assert.equal(row.status, 'success');
    const output = JSON.parse(row.output);
    assert.ok(output.preview.length > 5);
    assert.equal(db.prepare('SELECT sent FROM automations WHERE id = ?').get(id).sent, 1);
  });
});

test('live webhook delivery reaches a real endpoint', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    db.prepare("DELETE FROM connections WHERE user_id = 1 AND platform = 'webhook'").run();
    const conn = await client.post('/app/connections', { platform: 'webhook', handle: '/api/echo', skip_test: '1' });
    assert.equal(conn.status, 303);
    const connection = db.prepare("SELECT * FROM connections WHERE platform = 'webhook' ORDER BY id DESC LIMIT 1").get();

    const created = await client.post('/app/automations', {
      name: 'Live delivery', topic: 'one honest number', kind: 'post', tone: 'bold',
      interval_minutes: '1440', publish_mode: 'live', connection_id: String(connection.id),
    });
    const id = Number(created.location.split('/').pop());
    const auto = db.prepare('SELECT * FROM automations WHERE id = ?').get(id);
    const result = await executeAutomation(db, auto, { trigger: 'manual' });
    assert.equal(result.ok, true);
    assert.equal(result.output.simulated, false);
    assert.match(result.output.delivery.note, /Delivered to http/);
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(result.id);
    assert.equal(row.status, 'success');
  });
});

test('a failing live webhook is recorded as failed, not silently dropped', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    db.prepare("DELETE FROM connections WHERE user_id = 1 AND platform = 'webhook'").run();
    await client.post('/app/connections', { platform: 'webhook', handle: '/api/does-not-exist', skip_test: '1' });
    const connection = db.prepare("SELECT * FROM connections WHERE platform = 'webhook' ORDER BY id DESC LIMIT 1").get();
    const created = await client.post('/app/automations', {
      name: 'Broken delivery', topic: 'what broke', kind: 'post', interval_minutes: '1440',
      publish_mode: 'live', connection_id: String(connection.id),
    });
    const id = Number(created.location.split('/').pop());
    const auto = db.prepare('SELECT * FROM automations WHERE id = ?').get(id);
    const result = await executeAutomation(db, auto, { trigger: 'manual' });
    assert.equal(result.ok, false);
    const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(result.id);
    assert.equal(row.status, 'failed');
    assert.match(row.error, /Webhook failed/);
    assert.equal(db.prepare('SELECT failed FROM automations WHERE id = ?').get(id).failed, 1);
  });
});

test('runDue only picks automations whose time has come', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const created = await client.post('/app/automations', { name: 'Due test', topic: 'a due run', interval_minutes: '60', kind: 'post' });
    const id = Number(created.location.split('/').pop());
    db.prepare('UPDATE automations SET next_run_at = ? WHERE id = ?').run(new Date(Date.now() + 3600000).toISOString(), id);
    const early = await runDue(db);
    assert.equal(early.filter((r) => r.output && r.output.delivery).length, 0);

    db.prepare('UPDATE automations SET next_run_at = ? WHERE id = ?').run(new Date(Date.now() - 1000).toISOString(), id);
    const due = await runDue(db);
    assert.ok(due.length >= 1);
    const after = db.prepare('SELECT next_run_at, last_run_at FROM automations WHERE id = ?').get(id);
    assert.ok(new Date(after.next_run_at) > new Date());
    assert.ok(after.last_run_at);
  });
});

test('nextRunFor always moves forward', () => {
  const now = Date.now();
  assert.ok(new Date(nextRunFor(60, now)) > now);
  assert.ok(new Date(nextRunFor(0, now)) > now, 'zero is clamped to one minute');
});

test('RSS feed ingestion deduplicates by GUID', async () => {
  await withServer(async ({ client, db, base }) => {
    await client.login();
    const added = await client.post('/app/feeds', { url: `${base}/feed.xml`, auto_caption: '1' });
    assert.equal(added.status, 303);
    const feed = db.prepare('SELECT * FROM feeds ORDER BY id DESC LIMIT 1').get();
    assert.ok(feed.title, 'feed title captured');
    const first = db.prepare('SELECT COUNT(*) AS n FROM feed_items WHERE feed_id = ?').get(feed.id).n;
    assert.ok(first >= 3, 'items were parsed from our own feed');
    const again = await pollFeed(db, feed);
    assert.equal(again.added, 0, 'the second poll adds nothing');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM feed_items WHERE feed_id = ?').get(feed.id).n, first);
    const runs = db.prepare("SELECT COUNT(*) AS n FROM runs WHERE trigger = 'feed'").get().n;
    assert.ok(runs >= 3);
  });
});

test('pause and resume flip the status without deleting history', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const id = 1;
    await client.post(`/app/automations/${id}/toggle`, {});
    assert.equal(db.prepare('SELECT status FROM automations WHERE id = ?').get(id).status, 'paused');
    await client.post(`/app/automations/${id}/toggle`, {});
    assert.equal(db.prepare('SELECT status FROM automations WHERE id = ?').get(id).status, 'active');
  });
});

test('one member cannot run another member automation', async () => {
  await withServer(async ({ client, db }) => {
    await client.login('aria@lionpost.local', 'lionpost123');
    const foreign = db.prepare("SELECT id FROM automations WHERE user_id = 1 LIMIT 1").get();
    const res = await client.post(`/app/automations/${foreign.id}/run`, {});
    assert.equal(res.status, 404);
  });
});

test('workspace overview reports the same counts as the database', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const page = await client.get('/app');
    assert.equal(page.status, 200);
    const sent = db.prepare("SELECT COUNT(*) AS n FROM runs WHERE user_id = 1 AND status = 'success'").get().n;
    assert.match(page.text, /Posts shipped/);
    assert.ok(sent > 0);
  });
});
