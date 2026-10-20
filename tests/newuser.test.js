import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';

beforeEach(() => resetLimits());

/* Everything above runs as the seeded demo member, who owns content. A new
 * account owns nothing, and that is where empty states break. This walks the
 * whole product as a cold user and checks the strings that mean "we rendered
 * undefined". */
const CRUFT = /undefined|NaN|\[object Object\]|TODO|Lorem ipsum/i;

test('a brand-new account can walk every screen', async () => {
  await withServer(async ({ client }) => {
    await client.register('Cold Start', 'cold@example.com');
    const pages = ['/app', '/app/studio', '/app/automations', '/app/automations/new', '/app/connections',
      '/app/connections/new?platform=webhook', '/app/feeds', '/app/keywords', '/app/aeo', '/app/videos',
      '/app/carousel', '/app/shorts', '/app/settings', '/app/notifications', '/community', '/community/new'];
    for (const path of pages) {
      const res = await client.get(path);
      assert.equal(res.status, 200, path);
      const bad = res.text.match(CRUFT);
      assert.equal(bad, null, `${path} renders "${bad && bad[0]}"`);
    }
  });
});

test('a cold account can create, run and read back the whole loop', async () => {
  await withServer(async ({ base, client, db }) => {
    await client.register('Cold Start', 'cold@example.com', 'coldpass1');

    // 1. a webhook connection
    const conn = await client.post('/app/connections', {
      platform: 'webhook', label: 'My endpoint', handle: base + '/api/echo', publish_mode: 'live',
    });
    assert.equal(conn.status, 303);
    const connId = db.prepare("SELECT id FROM connections WHERE platform = 'webhook' AND user_id = (SELECT id FROM users WHERE email = 'cold@example.com')").get().id;
    const tested = await client.post(`/app/connections/${connId}/test`, {});
    assert.equal(tested.status, 303);

    // 2. an automation that posts to it
    const auto = await client.post('/app/automations', {
      name: 'Cold start loop', topic: 'why a queue beats a burst', kind: 'post',
      connection_id: connId, interval_minutes: '1440', tone: 'direct', publish_mode: 'live',
    });
    assert.equal(auto.status, 303);
    const autoId = Number(auto.location.split('/').pop());

    // 3. run it for real
    const run = await client.post(`/app/automations/${autoId}/run`, { mode: 'live' });
    assert.equal(run.status, 303);
    const detail = await client.get(`/app/automations/${autoId}`);
    assert.equal(detail.status, 200);
    assert.match(detail.text, /Delivered\.|Delivered/);
    assert.match(detail.text, /run-status success/);
    assert.doesNotMatch(detail.text, /run-status failed/);

    // 4. publish to the community
    const cat = await client.get('/community/new');
    assert.equal(cat.status, 200);
    const posted = await client.post('/community/new', {
      category_id: 1, title: 'Cold start thread', body: 'First post from a brand-new account.',
    });
    assert.equal(posted.status, 303);
    const thread = await client.get(posted.location);
    assert.equal(thread.status, 200);
    assert.match(thread.text, /Cold start thread/);
  });
});

test('a cold account is told what to do on every empty screen', async () => {
  await withServer(async ({ client }) => {
    await client.register('Cold Start', 'cold@example.com');
    const expectations = [
      ['/app/feeds', /feed|Feed/],
      ['/app/automations', /automation|Automation/],
      ['/app/connections', /connection|Connection/],
      ['/app/notifications', /notification|Notification|all caught up/i],
      ['/app/keywords', /keyword|Keyword/],
      ['/app/aeo', /check|Check|score/],
    ];
    for (const [path, re] of expectations) {
      const res = await client.get(path);
      assert.match(res.text, re, path);
    }
  });
});
