// LionPost content engine. Deterministic, offline, no API key required.
// If a Gemini key is configured the caller can upgrade the draft; this module
// always works and never invents quotes, statistics or links.

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const clean = (s) => String(s || '').trim().replace(/^about\s+/i, '').replace(/[.?!]+$/, '');

export const TONES = ['practical', 'friendly', 'bold', 'direct'];
export const LANGUAGES = ['English', 'Spanish', 'Hindi', 'Urdu', 'Bengali', 'French', 'Portuguese', 'German'];
export const PLATFORMS = ['instagram', 'facebook', 'x', 'telegram', 'pinterest', 'tiktok', 'youtube', 'dailymotion', 'blog', 'webhook'];
export const KINDS = ['caption', 'thread', 'article', 'carousel', 'pin', 'video'];

const HOOKS = [
  (t) => `Most advice about ${t} starts with a tool. It should start with the decision behind it.`,
  (t) => `Nobody talks about the boring half of ${t}.`,
  (t) => `I overcomplicated ${t} for a year. The short version works better.`,
  (t) => `The fastest win in ${t} takes ten minutes, not a new subscription.`,
  (t) => `${cap(t)} is not a tools problem. It is a decision problem.`,
  (t) => `If ${t} takes more than an hour a week, something upstream is broken.`,
  (t) => `Three things changed how I handle ${t}. None of them were new software.`,
  (t) => `You do not need a system for ${t}. You need three sentences and a queue.`,
];

const INSIGHTS = [
  'Write the rule down once, then let the queue follow it. Rules scale, willpower does not.',
  'Pick one channel to be native on. Adapt everywhere else. Four native voices is not a solo job.',
  'Batch the thinking, not just the posting. An hour of planning buys back a week of hesitating.',
  'Keep one source of truth. Two calendars is the same as no calendar.',
  'Measure the week, not the hour. Daily numbers are noise with a timestamp.',
  'If a step cannot survive a bad week, it is not a habit yet.',
  'The first draft exists to be cut. The second one exists to be published.',
  'Automate the delivery, never the judgement. The opinion is the part people came for.',
  'A queue you trust is worth more than a calendar you admire.',
  'The best format is the one you can finish on a Tuesday when nothing is going right.',
];

const PROOFS = [
  'Do it for four weeks before you judge it.',
  'Write down what you expected. Compare on Friday.',
  'Keep the version that survives a busy week.',
  'Test it on one channel first.',
  'Give it a name, or it will quietly stop existing.',
];

const CTAS = [
  'What would you add?',
  'Tell me where this breaks for you.',
  'Save this for the next planning session.',
  'Reply with the one step you would cut.',
  'Steal the template. It gets better when it is yours.',
  'If you try this, report back. I read every reply.',
];

const EVERGREEN_TAGS = ['contentstrategy', 'creators', 'solopreneur', 'publishing', 'automation', 'buildinpublic'];
const QUESTION_STARTS = ['How do you', 'What is the best way to', 'Why does', 'Should you', 'What actually works for'];

function topicWords(topic) {
  return clean(topic).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3).slice(0, 4);
}

export function hashtagsFor(topic, n = 8) {
  const words = topicWords(topic);
  const base = words.map((w) => w.replace(/[^a-z0-9]/g, ''));
  const joined = base.join('');
  const tags = [
    ...base,
    joined,
    `${joined}tips`,
    ...EVERGREEN_TAGS,
  ].filter((t) => t && t.length > 3 && t.length < 30);
  return [...new Set(tags)].slice(0, n).map((t) => '#' + t);
}

function imageSpec(rng, topic) {
  const motifs = ['sun', 'grid', 'arc', 'bars', 'orbit'];
  const palettes = [
    ['#F5B942', '#0B0D12', '#FFD97A'],
    ['#6EE7B7', '#07110D', '#A7F3D0'],
    ['#93C5FD', '#080E18', '#BFDBFE'],
    ['#FCA5A5', '#140909', '#FECACA'],
    ['#C4B5FD', '#0C0917', '#DDD6FE'],
  ];
  return {
    kicker: pick(rng, ['FIELD NOTE', 'THE SHORT VERSION', 'ONE IDEA', 'FROM THE QUEUE', 'NOTE TO SELF']),
    headline: pick(rng, [
      cap(clean(topic)),
      `The boring half of ${clean(topic)}`,
      `Do this before you post about ${clean(topic)}`,
      `${cap(clean(topic))}, without the busywork`,
    ]),
    footnote: 'LionPost',
    palette: pick(rng, palettes),
    motif: pick(rng, motifs),
  };
}

export function generateCaption({ topic, tone = 'practical', platform = 'instagram', seed = '' } = {}) {
  const rng = mulberry32(hashString(`${topic}|${tone}|${platform}|${seed}|caption`));
  const t = clean(topic) || 'publishing consistently';
  const hook = pick(rng, HOOKS)(t);
  const chosen = [];
  while (chosen.length < 3) {
    const c = pick(rng, INSIGHTS);
    if (!chosen.includes(c)) chosen.push(c);
  }
  const closing = tone === 'bold' ? pick(rng, CTAS).toUpperCase() : pick(rng, CTAS);
  const lines = [hook, '', ...chosen.map((c, i) => `${i + 1}. ${c}`), '', `${pick(rng, PROOFS)}`, '', closing];
  const tags = hashtagsFor(topic, platform === 'x' ? 3 : 8);
  return {
    kind: 'caption', platform,
    text: lines.join('\n') + (platform === 'instagram' ? '\n\n' + tags.join(' ') : ''),
    body: lines.join('\n'),
    hashtags: tags,
    image: imageSpec(rng, t),
    altText: `Text card: ${imageSpec(rng, t).headline}`,
  };
}

export function generateThread({ topic, tone = 'practical', seed = '' } = {}) {
  const rng = mulberry32(hashString(`${topic}|${tone}|${seed}|thread`));
  const t = clean(topic) || 'publishing consistently';
  const posts = [];
  posts.push(`${pick(rng, HOOKS)(t)}\n\nA short thread on what actually helped:`);
  const pool = [...INSIGHTS].sort(() => rng() - 0.5).slice(0, 5);
  pool.forEach((line, i) => posts.push(`${i + 1}. ${line}`));
  posts.push(`The test: can you keep it going on your worst week?\n\nIf not, cut a step until you can.\n\n${pick(rng, CTAS)}`);
  return { kind: 'thread', platform: 'x', posts, text: posts.join('\n\n---\n\n'), hashtags: hashtagsFor(topic, 3), image: imageSpec(rng, t) };
}

export function generateArticle({ topic, tone = 'practical', seed = '' } = {}) {
  const rng = mulberry32(hashString(`${topic}|${tone}|${seed}|article`));
  const t = clean(topic) || 'publishing consistently';
  const title = pick(rng, [
    `A calmer way to handle ${t}`,
    `${cap(t)}: the version that survives a busy week`,
    `What I would do first with ${t}`,
    `The honest guide to ${t} for one person`,
    `${cap(t)} without the theatre`,
  ]);
  const angle = pick(rng, HOOKS)(t);
  const sections = [...INSIGHTS].sort(() => rng() - 0.5).slice(0, 3);
  const faq = [
    [`What is the smallest useful version of ${t}?`, `One decision written down, one place to keep the queue, and a ten minute review each week. Everything else is optional until that works.`],
    [`How long before it pays off?`, `Give it four weeks. The first week is setup, the second is awkward, and the third is where it starts to feel normal.`],
    [`What should I stop doing?`, `Anything you cannot explain in one sentence. If a step needs a tutorial to justify it, it is not earning its place yet.`],
  ];
  const intro = `${angle}\n\nThis is the version I would hand to someone starting from zero. No stack shopping, no thirty day challenge. Three decisions and a review.`;
  const bodyParts = [
    `## Start with the decision\n\nBefore the calendar, the tool or the template, answer one question: what is ${t} for? Traffic, trust, customers, or simply the habit of finishing things. Write the answer in one sentence. Everything downstream gets easier to cut when that sentence exists.\n\n${sections[0]}`,
    `## Build the smallest system\n\nYou need three things: a place for ideas, a place for drafts, and a place that sends. That is the whole architecture. If your setup has more moving parts than that, you have built a hobby.\n\n- A note with every idea, one line each\n- A draft that gets finished before it gets scheduled\n- A queue that sends whether or not you feel inspired\n\n${sections[1]}`,
    `## Review weekly, not hourly\n\nTen minutes on Friday. What shipped, what stalled, what is next. Do not open the analytics more than once a week; you will make decisions you cannot defend.\n\n${sections[2]}\n\n${pick(rng, PROOFS)}`,
    `## The part nobody posts about\n\nSome weeks the queue is empty and the numbers are flat. That is not a signal to rebuild everything. It is a signal to ship the next thing and keep the review on the calendar.\n\n${pick(rng, CTAS)}`,
    `## Questions people ask\n\n${faq.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')}`,
  ];
  const markdown = `# ${title}\n\n${intro}\n\n${bodyParts.join('\n\n')}`;
  const keywords = [...new Set([...topicWords(t), 'content', 'automation', 'weekly review'])].slice(0, 6).join(', ');
  return {
    kind: 'article',
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    metaDescription: `${cap(t)} in one sitting: the decision, the smallest system, and a weekly review that keeps it honest.`,
    keywords,
    markdown,
    body: markdown,
    wordCount: markdown.split(/\s+/).length,
    hashtags: hashtagsFor(topic, 5),
    image: imageSpec(rng, t),
  };
}

export function generateCarousel({ topic, tone = 'practical', seed = '' } = {}) {
  const rng = mulberry32(hashString(`${topic}|${tone}|${seed}|carousel`));
  const t = clean(topic) || 'publishing consistently';
  const slides = [];
  slides.push({ kicker: 'SWIPE', title: pick(rng, [`The honest guide to ${t}`, `${cap(t)}, minus the busywork`, `What I would do first with ${t}`]), body: 'Six slides. No funnel at the end.' });
  const pool = [...INSIGHTS].sort(() => rng() - 0.5).slice(0, 5);
  pool.forEach((line, i) => {
    const [head, ...rest] = line.replace(/\.$/, '').split(':');
    slides.push({ kicker: `0${i + 1}`, title: rest.length ? head : line.split(' ').slice(0, 5).join(' '), body: rest.length ? rest.join(':') + '.' : line, full: line });
  });
  slides.push({ kicker: 'KEEP', title: 'The test', body: 'Can you keep it going on your worst week? If not, cut a step.' });
  slides.push({ kicker: 'NEXT', title: pick(rng, CTAS), body: 'Save this for the next planning session.', cta: true });
  return {
    kind: 'carousel', platform: 'instagram', slides: slides.slice(0, 8),
    caption: `${pick(rng, HOOKS)(t)}\n\n${slides.slice(1, -1).map((s) => '• ' + s.title).join('\n')}\n\n${pick(rng, CTAS)}\n\n${hashtagsFor(topic, 8).join(' ')}`,
    hashtags: hashtagsFor(topic, 8),
    image: imageSpec(rng, t),
  };
}

export function generatePin({ topic, seed = '' } = {}) {
  const rng = mulberry32(hashString(`${topic}|pin|${seed}`));
  const t = clean(topic) || 'publishing consistently';
  return {
    kind: 'pin', platform: 'pinterest',
    title: pick(rng, [`${cap(t)}: a calmer system`, `The ${t} checklist`, `${cap(t)} without the busywork`]).slice(0, 100),
    description: `${pick(rng, HOOKS)(t)} A short checklist you can run this week.`,
    overlay: { kicker: 'CHECKLIST', headline: cap(t), lines: [...INSIGHTS].sort(() => rng() - 0.5).slice(0, 3).map((s) => s.split(':')[0]) },
    link: 'https://example.com/your-article',
    hashtags: hashtagsFor(topic, 5),
    image: imageSpec(rng, t),
  };
}

export function generateVideo({ topic, tone = 'practical', seed = '' } = {}) {
  const rng = mulberry32(hashString(`${topic}|${tone}|${seed}|video`));
  const t = clean(topic) || 'publishing consistently';
  const hook = pick(rng, [
    `Stop treating ${t} like a full time job.`,
    `${cap(t)} does not need more tools.`,
    `Here is the version of ${t} that survives a bad week.`,
  ]);
  const lines = [...INSIGHTS].sort(() => rng() - 0.5).slice(0, 4);
  const scenes = [
    { text: hook, sub: 'The short version', seconds: 4, motif: 'sun' },
    { text: 'The problem', sub: 'Too many steps, no decision', seconds: 4, motif: 'grid' },
    ...lines.map((l, i) => ({ text: l.split(':')[0], sub: l, seconds: 5, motif: i % 2 ? 'arc' : 'bars' })),
    { text: 'The test', sub: 'Can you keep it going on your worst week?', seconds: 5, motif: 'orbit' },
    { text: pick(rng, CTAS), sub: 'Follow for the boring half of publishing', seconds: 4, motif: 'sun', cta: true },
  ];
  return {
    kind: 'video', title: hook, platform: 'instagram',
    scenes, hashtags: hashtagsFor(topic, 6),
    caption: `${hook}\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\n${pick(rng, CTAS)}\n\n${hashtagsFor(topic, 6).join(' ')}`,
    voiceover: scenes.map((s) => s.sub).join(' '),
    image: imageSpec(rng, t),
  };
}

export function generateIdeas({ topic, n = 8, seed = '' } = {}) {
  const rng = mulberry32(hashString(`${topic}|${seed}|ideas`));
  const t = clean(topic) || 'publishing consistently';
  const shapes = [
    (x) => `${pick(rng, QUESTION_STARTS)} ${x} without burning a week?`,
    (x) => `The three sentence system for ${x}`,
    (x) => `What I got wrong about ${x}`,
    (x) => `${cap(x)}: before and after`,
    (x) => `A ten minute weekly review for ${x}`,
    (x) => `The tool is not the problem: ${x}`,
    (x) => `One page, one queue: ${x} for solo creators`,
    (x) => `What survives a bad week in ${x}`,
    (x) => `Steal my ${x} checklist`,
    (x) => `Five boring wins in ${x}`,
  ];
  return [...new Set(shapes.sort(() => rng() - 0.5).map((f) => f(t)))].slice(0, n);
}

export function generate(kind, opts = {}) {
  switch (kind) {
    case 'thread': return generateThread(opts);
    case 'article': return generateArticle(opts);
    case 'carousel': return generateCarousel(opts);
    case 'pin': return generatePin(opts);
    case 'video': return generateVideo(opts);
    case 'ideas': return { kind: 'ideas', ideas: generateIdeas(opts) };
    default: return generateCaption(opts);
  }
}

// Optional upgrade path: if the user stores a Gemini key, ask Google for a
// draft. Never required, never called with a fake key.
export async function geminiDraft({ apiKey, prompt, model = 'gemini-2.0-flash' }) {
  if (!apiKey) return { ok: false, error: 'No Gemini key configured' };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.message || `Gemini responded ${res.status}` };
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Gemini timed out' : `Gemini unreachable: ${err.message}` };
  } finally { clearTimeout(timer); }
}
