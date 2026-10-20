import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withServer } from './helpers.js';
import { resetLimits } from '../lib/auth.js';
import { research } from '../lib/keywords.js';
import { analyze } from '../lib/aeo.js';

beforeEach(() => resetLimits());

test('keyword research is deterministic and weights the head term hardest', () => {
  const a = research('content automation');
  const b = research('content automation');
  assert.deepEqual(a.keywords.map((k) => k.keyword), b.keywords.map((k) => k.keyword));
  assert.equal(a.keywords.length, 22);
  const head = a.keywords.find((k) => k.keyword === 'content automation');
  const tail = a.keywords.find((k) => k.keyword.includes('tips'));
  assert.ok(head.difficulty > tail.difficulty, 'head term should be harder than a long tail');
  assert.ok(a.summary.totalVolume > 0);
  assert.equal(a.summary.estimated, true);
  const sorted = [...a.keywords].sort((x, y) => y.opportunity - x.opportunity);
  assert.deepEqual(a.keywords.map((k) => k.opportunity), sorted.map((k) => k.opportunity));
});

test('keyword research rejects bad seeds', () => {
  assert.throws(() => research(''), /at least two characters/);
  assert.throws(() => research('x'.repeat(80)), /under 60/);
});

test('AEO analysis returns 18 weighted checks and detects schema and blocks', () => {
  const html = `<!doctype html><html lang="en"><head>
    <title>How to keep a content queue alive for a solo creator</title>
    <meta name="description" content="A short weekly review that keeps a solo content queue honest, with three questions and a checklist for the week.">
    <meta property="og:title" content="Queue review"><link rel="canonical" href="https://example.com/queue">
    <script type="application/ld+json">{"@graph":[{"@type":"BlogPosting"},{"@type":"FAQPage"}]}</script></head>
    <body><h1>How to keep a content queue alive</h1>
    <p>Run one twenty minute review every Friday. Open three numbers, decide one change, and close the tab.</p>
    <h2>What should the review cover?</h2><ul><li>What shipped</li><li>What stalled</li></ul>
    <h2>Frequently asked questions</h2><h3>How long?</h3><p>Twenty minutes.</p>
    <a href="/blog/a">Internal one</a><a href="/blog/b">Internal two</a><a href="/blog/c">Internal three</a>
    <a href="https://source.example/study">Source</a>${'<p>Word filler for length.</p>'.repeat(30)}</body></html>`;
  const report = analyze({ html, url: 'https://example.com/queue', robots: 'User-agent: *\nAllow: /', llms: '# llms' });
  assert.equal(report.checks.length, 18);
  assert.ok(report.score >= 70, `expected a strong score, got ${report.score}`);
  assert.equal(report.stats.hasFaqSchema, true);
  assert.equal(report.stats.llmsTxt, true);
  assert.equal(report.checks.find((c) => c.id === 'answer-early').status, 'pass');
  assert.equal(report.checks.find((c) => c.id === 'crawler-access').status, 'pass');
});

test('AEO flags blocked crawlers and a thin page', () => {
  const report = analyze({
    html: '<html><head><title>Thin</title></head><body><p>Short.</p></body></html>',
    url: 'http://example.com/thin',
    robots: 'User-agent: GPTBot\nDisallow: /\n',
    llms: null,
  });
  assert.ok(report.score < 40);
  assert.deepEqual(report.stats.blockedBots, ['GPTBot']);
  assert.equal(report.checks.find((c) => c.id === 'https').status, 'fail');
  assert.equal(report.checks.find((c) => c.id === 'h1').status, 'fail');
});

test('AEO refuses empty HTML', () => {
  assert.throws(() => analyze({ html: '   ' }), /no HTML/);
});

test('AEO can fetch one of our own pages end to end', async () => {
  await withServer(async ({ client, base, db }) => {
    await client.login();
    const slug = db.prepare('SELECT slug FROM blog_posts LIMIT 1').get().slug;
    const res = await client.json('/api/aeo', { url: `${base}/blog/${slug}` });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.text);
    assert.equal(body.report.checks.length, 18);
    assert.ok(body.report.score >= 50, `expected a decent score, got ${body.report.score}`);
    assert.equal(body.report.stats.llmsTxt, true, 'our own /llms.txt should be found');
  });
});

test('public keyword demo returns five rows and saves nothing', async () => {
  await withServer(async ({ client, db }) => {
    await client.get('/tools/keyword-research');
    const before = db.prepare('SELECT COUNT(*) AS n FROM keyword_research').get().n;
    const res = await client.json('/api/demo/keywords', { seed: 'vertical video' });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.text);
    assert.equal(body.result.keywords.length, 5);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM keyword_research').get().n, before);
  });
});

test('public AEO demo scores pasted HTML', async () => {
  await withServer(async ({ client }) => {
    await client.get('/tools/aeo-checker');
    const res = await client.json('/api/demo/aeo', { target: '<h1>Hi</h1><p>A short answer to the question that people actually search for.</p>' });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.text);
    assert.equal(typeof body.report.score, 'number');
    assert.equal(body.report.checks.length, 6);
  });
});

test('authenticated key generation is saved', async () => {
  await withServer(async ({ client, db }) => {
    await client.login();
    const res = await client.json('/api/keywords', { seed: 'newsletter growth' });
    assert.equal(res.status, 200);
    const body = JSON.parse(res.text);
    assert.ok(body.result.id > 0);
    const saved = db.prepare('SELECT * FROM keyword_research WHERE id = ?').get(body.result.id);
    assert.equal(saved.seed, 'newsletter growth');
  });
});
