// SQLite storage for LionPost. Uses node:sqlite (Node 22.5+), zero npm deps.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { hashPassword } from './auth.js';
import { renderMarkdown } from './markdown.js';
import { generate } from './generator.js';

const DB_PATH = process.env.LIONPOST_DB || path.join(process.cwd(), 'data', 'lionpost.db');

let db;

export function getDb() {
  if (!db) db = open();
  return db;
}

export function open(file = DB_PATH) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA foreign_keys = ON;');
  migrate(database);
  if (isEmpty(database)) seed(database);
  return database;
}

export function closeDb() {
  if (db) { db.close(); db = null; }
}

function isEmpty(database) {
  const row = database.prepare('SELECT COUNT(*) AS n FROM users').get();
  return !row || row.n === 0;
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  bio TEXT DEFAULT '',
  website TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#F5B942',
  role TEXT NOT NULL DEFAULT 'member',
  gemini_key_enc TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_cat ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  secret_enc TEXT,
  webhook_url TEXT,
  meta TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  last_checked_at TEXT,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_conn_user ON connections(user_id);

CREATE TABLE IF NOT EXISTS automations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'post',
  connection_id INTEGER REFERENCES connections(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'practical',
  language TEXT NOT NULL DEFAULT 'English',
  interval_minutes INTEGER NOT NULL DEFAULT 1440,
  publish_mode TEXT NOT NULL DEFAULT 'dry_run',
  include_image INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  next_run_at TEXT NOT NULL,
  last_run_at TEXT,
  created_at TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_auto_user ON automations(user_id);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_id INTEGER REFERENCES automations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'schedule',
  started_at TEXT NOT NULL,
  finished_at TEXT,
  output TEXT DEFAULT '{}',
  error TEXT,
  attempt INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_runs_auto ON runs(automation_id);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  automation_id INTEGER REFERENCES automations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  body_html TEXT NOT NULL,
  meta_description TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_articles_user ON articles(user_id);

CREATE TABLE IF NOT EXISTS keyword_research (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed TEXT NOT NULL,
  market TEXT DEFAULT 'US',
  results TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aeo_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  score INTEGER NOT NULL,
  checks TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aeo_user ON aeo_reports(user_id);

CREATE TABLE IF NOT EXISTS feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  auto_caption INTEGER NOT NULL DEFAULT 1,
  connection_id INTEGER REFERENCES connections(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feed_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  published_at TEXT,
  queued_at TEXT,
  UNIQUE (feed_id, guid)
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  scenes TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'carousel',
  palette TEXT DEFAULT 'gold',
  handle TEXT DEFAULT '',
  slides TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body_html TEXT NOT NULL,
  tag TEXT NOT NULL,
  read_minutes INTEGER NOT NULL DEFAULT 6,
  accent TEXT DEFAULT '#F5B942',
  published_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  detail TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  created_at TEXT NOT NULL
);
`;

function migrate(database) {
  database.exec(SCHEMA);
}

const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'post';
}

function seed(database) {
  const insert = (sql, ...args) => database.prepare(sql).run(...args);

  const categories = [
    ['questions', 'Questions & Help', '❓', 'Stuck on something? Ask here. Someone has been there.', 1],
    ['automation', 'Automation', '⚙️', 'Schedules, queues, webhooks and keeping the machine fed.', 2],
    ['ai-tools', 'AI & Tools', '🤖', 'Prompts, models, workflows and what actually helps.', 3],
    ['blogging', 'Blogging', '📝', 'Writing, SEO and building an audience that comes back.', 4],
    ['monetisation', 'Monetisation', '💰', 'Affiliates, products, sponsors and pricing your work.', 5],
    ['showcase', 'Showcase', '🚀', 'Launches, wins and numbers. Show the work.', 6],
    ['feedback', 'Feedback', '🧭', 'Tell us what to build next, or what is broken.', 7],
  ];
  for (const c of categories) {
    insert('INSERT INTO categories (slug,name,emoji,description,sort) VALUES (?,?,?,?,?)', ...c);
  }

  const people = [
    ['Alex Rivera', 'demo@lionpost.local', 'demo1234', 'alex', 'Solo founder. Ships one thing a week and writes about it.', 'https://example.com/alex', '#F5B942', 'admin', 0],
    ['Aria Bennett', 'aria@lionpost.local', 'lionpost123', 'aria', 'Newsletter writer. 4,200 subscribers and counting.', '', '#6EE7B7', 'member', 12],
    ['Diego Alvarez', 'diego@lionpost.local', 'lionpost123', 'diego', 'Runs three niche blogs. Automates the boring half.', '', '#93C5FD', 'member', 9],
    ['Priya Nair', 'priya@lionpost.local', 'lionpost123', 'priya', 'Video first. Shorts, reels, and a lot of retakes.', '', '#FCA5A5', 'member', 7],
    ['Tomas Novak', 'tomas@lionpost.local', 'lionpost123', 'tomas', 'SEO consultant. Believes in boring technical fixes.', '', '#C4B5FD', 'member', 5],
    ['Lina Haddad', 'lina@lionpost.local', 'lionpost123', 'lina', 'Designer turned creator. Carousels are the whole job.', '', '#FCD34D', 'member', 3],
  ];
  for (const [name, email, pw, handle, bio, website, color, role, days] of people) {
    insert(
      'INSERT INTO users (name,email,password_hash,handle,bio,website,avatar_color,role,created_at,last_seen_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      name, email, hashPassword(pw), handle, bio, website, color, role, daysAgo(120 - days), daysAgo(days % 6)
    );
  }

  const posts = [
    ['I stopped scheduling posts by hand and got 6 hours back', 'automation', 0,
      `I used to keep a spreadsheet of captions, a notes app full of links, and a calendar reminder that I ignored. Last month I moved all of it into one queue.\n\nThe setup is boring on purpose:\n\n- One topic per week, written down before Monday\n- A reusable caption shape: hook, three useful lines, one ask\n- One run of the queue each morning, ten minutes, no scrolling\n\n**The part that mattered** was not the tool. It was deciding, in advance, what the week was about. Automation only helps after that decision exists.\n\nWhat does your queue look like? I am still looking for a better way to handle images.`],
    ['What I learned publishing 30 articles in 30 days', 'blogging', 0,
      `Thirty articles in thirty days. Here is the honest report.\n\n**What worked**\n\n1. A narrow topic. Every article answered a question I had already heard twice.\n2. An outline before the draft. Always. The days I skipped it produced the weakest pieces.\n3. One call to action, not four.\n\n**What did not**\n\n- Publishing before proofreading. Three posts needed quiet fixes afterwards.\n- Chasing a keyword I had no chance of ranking for. It brought 40 visits and no subscribers.\n- Writing about tools instead of writing about problems.\n\nIf you are starting the same challenge: pick twelve topics first, not thirty. You will thank yourself in week three.`],
    ['How do you keep AI copy from sounding like AI copy?', 'ai-tools', 0,
      `I use a generator for first drafts, then edit hard. The pattern that finally worked for me:\n\n- Delete the first paragraph. It is almost always a warm-up.\n- Replace every abstract noun with a thing I could photograph.\n- Read it out loud. If I would not say the sentence to a friend, it goes.\n- Keep one specific number. Specifics are the loudest signal of a human behind the text.\n\nCurious what others do. Is there a prompt that reliably gets you closer on the first pass?`],
    ['Small win: my RSS feed now posts to three channels by itself', 'automation', 0,
      `Set this up on Saturday. The blog publishes, the feed is read once an hour, and the item goes into the queue with its own image and link.\n\nTwo things I wish I had known:\n\n1. Check that your feed has unique GUIDs. Mine did not, and every item queued twice.\n2. Rewrite the caption. Cross-posting the raw title reads like a robot on every platform.\n\nHappy to share the exact caption template in the replies if anyone wants it.`],
    ['Best free ways to make shorts without a paid editor?', 'questions', 0,
      `I have a 20 minute interview and no budget for an editor. What I need is six vertical clips with subtitles.\n\nWhat are people using? I tried a browser tool that claimed one click and produced clips with the wrong aspect ratio and a watermark the size of a postage stamp.\n\nIf your answer is a script and a weekend, say so. I am not scared of the weekend.`],
    ['Carousel teardown: what made this one travel', 'blogging', 0,
      `A carousel I made in March still gets saves every week. It is not my best design. Here is what it does do:\n\n- Slide one: a sentence someone would repeat out loud\n- Slide two: the reason it is true\n- Slides three to seven: one idea each, never two\n- Last slide: a question, not a pitch\n\nI have started designing the last slide first. It changes everything before it.`],
    ['Honest numbers: 90 days, 3 blogs, one person', 'showcase', 0,
      `Not a growth story yet. Just numbers.\n\n- Articles: 46\n- Total visits: 12,800\n- Email subscribers: 311\n- Revenue: $84, all from two affiliate links\n- Time per week: about 11 hours\n\nThe useful surprise: the two posts I nearly did not publish brought half the traffic. The polished ones I loved brought almost nothing.\n\nNext quarter I am cutting the number of posts in half and doubling the research time. I will report back either way.`],
    ['Is there a sane way to organise 4 social accounts?', 'questions', 0,
      `I have Instagram, X, a Telegram channel and a Facebook Page. Right now every platform gets a different, worse version of the same idea.\n\nDoes anyone run one source of truth and adapt per platform? Or do you write natively for each? I am trying to work out which one actually compounds.`],
    ['The one-page content calendar I actually keep', 'automation', 0,
      `Most calendars fail because they are a second job. Mine is one page:\n\n| Day | Idea | Format | Status |\n| --- | --- | --- | --- |\n| Mon | One lesson from last week | Text | Draft |\n| Wed | Teardown of a thing I use | Carousel | Outline |\n| Fri | Answer a reader question | Short | Idea |\n\nThat is it. Three slots. If a week is bad, I still hit one of three.`],
    ['What would you build with one free API and a weekend?', 'feedback', 0,
      `I keep a list of tiny tools I would use weekly. The rules: no login, no database, one job, done in a weekend.\n\nMy list so far: a feed-to-queue bridge, a caption rewriter that keeps my voice, and a checker that tells me why an article will not get quoted by an AI answer.\n\nWhat is on yours?`],
  ];

  const postIds = [];
  for (let i = 0; i < posts.length; i++) {
    const [title, cat, pinned, body] = posts[i];
    const author = i === 0 ? 1 : (i % 5) + 2;
    const created = daysAgo(i * 1.4 + 0.3);
    const r = insert(
      'INSERT INTO posts (slug,title,body,user_id,category_id,pinned,views,created_at) VALUES (?,?,?,?,?,?,?,?)',
      slugify(title), title, body, author,
      categories.findIndex((c) => c[0] === cat) + 1, pinned, 180 + ((i * 137) % 900), created
    );
    postIds.push(Number(r.lastInsertRowid));
  }

  const comments = [
    [0, 2, 'The "decide the week first" part is the whole trick. I automate the publishing and still waste an hour deciding what to say.', 1],
    [0, 4, 'Ten minutes a morning is the detail people skip. Batch scheduling always sounded better than it felt.', 1],
    [1, 3, 'Twelve topics first instead of thirty is advice I wish I had taken in January.', 2],
    [1, 5, 'How did you handle images for 30 posts? That is where my streak died.', 2],
    [2, 2, 'Read it out loud is the only editing tip that has ever stuck for me.', 3],
    [3, 4, 'Unique GUIDs bit me too. Also check the timezone on pubDate, or everything looks a day old.', 4],
    [4, 5, 'A script and a weekend. Cutting on timestamps and exporting vertical is genuinely an hour of work once you have done it twice.', 5],
    [6, 1, 'Revenue per hour is the number nobody posts. Thanks for posting it.', 7],
    [7, 3, 'Write natively for the two that bring you anything. Adapt the rest. Four native voices is not sustainable alone.', 8],
  ];
  for (const [pi, ui, body, day] of comments) {
    insert('INSERT INTO comments (post_id,user_id,body,created_at) VALUES (?,?,?,?)', postIds[pi], ui, body, daysAgo(day));
  }
  const likePairs = [[1,0],[2,0],[3,0],[4,0],[5,0],[1,1],[2,1],[3,2],[1,3],[4,3],[2,4],[3,5],[1,6],[2,6],[3,6],[4,6],[5,6],[1,7],[2,8],[1,9]];
  for (const [u, p] of likePairs) {
    insert('INSERT INTO likes (user_id,post_id,created_at) VALUES (?,?,?)', u, postIds[p], daysAgo(1 + (p % 5)));
  }

  const connections = [
    [1, 'instagram', '@alexbuilds', 'connected', JSON.stringify({ followers: 1840 }), 0.5],
    [1, 'x', '@alexrivera', 'connected', JSON.stringify({ followers: 962 }), 1],
    [1, 'telegram', 't.me/alexnotes', 'connected', JSON.stringify({ followers: 410 }), 2],
    [1, 'webhook', '/api/echo', 'connected', JSON.stringify({ deliveries: 12 }), 0.2],
    [1, 'facebook', 'LionPost Demo Page', 'needs_attention', JSON.stringify({ followers: 0 }), 4],
  ];
  for (const [uid, platform, handle, status, meta, days] of connections) {
    insert(
      'INSERT INTO connections (user_id,platform,handle,status,meta,created_at,last_checked_at) VALUES (?,?,?,?,?,?,?)',
      uid, platform, handle, status, meta, daysAgo(days + 20), hoursAgo(6)
    );
  }

  const automations = [
    [1, 'Weekly build notes', 'post', 2, 'what I shipped this week and what broke', 'practical', 1440, 'dry_run', 1, 'active', 4.2, 18, 1],
    [1, 'Blog to three channels', 'post', 1, 'new articles from the blog', 'friendly', 720, 'dry_run', 1, 'active', 1.1, 24, 2],
    [1, 'Telegram daily tip', 'post', 3, 'one small automation tip', 'direct', 1440, 'dry_run', 0, 'paused', 9.5, 11, 0],
  ];
  for (const [uid, name, kind, connId, topic, tone, interval, mode, img, status, days, sent, failed] of automations) {
    insert(
      `INSERT INTO automations (user_id,name,kind,connection_id,topic,tone,interval_minutes,publish_mode,include_image,status,next_run_at,last_run_at,created_at,sent,failed)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      uid, name, kind, connId, topic, tone, interval, mode, img, status,
      new Date(Date.now() + (status === 'paused' ? 30 * 86400000 : 3600000)).toISOString(),
      hoursAgo(status === 'paused' ? 220 : 5), daysAgo(days + 10), sent, failed
    );
  }

  for (let i = 0; i < 26; i++) {
    const a = (i % 3) + 1;
    const day = i * 0.5;
    const failed = i === 7 || i === 19;
    insert(
      'INSERT INTO runs (automation_id,user_id,status,trigger,started_at,finished_at,output,error,attempt) VALUES (?,?,?,?,?,?,?,?,?)',
      a, 1, failed ? 'failed' : 'success', i % 6 === 0 ? 'manual' : 'schedule',
      hoursAgo(day * 24), hoursAgo(day * 24 - 0.02),
      JSON.stringify({ platform: i % 2 ? 'x' : 'instagram', preview: 'A short caption preview for run ' + i }),
      failed ? 'Adapter responded 429: rate limited. Retry scheduled.' : null, failed ? 2 : 1
    );
  }

  const articles = [
    ['The 20 minute weekly content review that keeps a queue honest', 'The 20 minute weekly content review that keeps a queue honest', 'A short review ritual that stops an automated queue from drifting away from what you actually believe.'],
    ['A caption template that survives every platform', 'A caption template that survives every platform', 'Hook, three useful lines, one ask. Why the shape travels and where it breaks.'],
    ['Reading your own analytics without lying to yourself', 'Reading your own analytics without lying to yourself', 'Three questions to ask a dashboard before you change your strategy because of it.'],
  ];
  for (let i = 0; i < articles.length; i++) {
    const [title, slug, desc] = articles[i];
    insert(
      'INSERT INTO articles (user_id,title,slug,body_html,meta_description,keywords,status,created_at) VALUES (?,?,?,?,?,?,?,?)',
      1, title, slugify(slug),
      `<article><h2>${title}</h2><p>This is a seeded draft so the studio has something to show. Generate your own to replace it.</p></article>`,
      desc, 'content,automation,review', 'draft', daysAgo(i + 2)
    );
  }

  const blog = [
    ['How to run a content queue without becoming a content machine',
      'A weekly ritual for people who publish alone: choose three ideas, write one properly, schedule the rest, and review on Friday.',
      'Playbook', 7, '#F5B942',
      `A queue is not a content machine. A machine produces without judgement. A queue holds decisions you already made so the next session starts with a draft, not a blank page.

## What should the weekly ritual contain?

Three slots, not thirty. One lesson from the week, one teardown of something you use, one answer to a question someone actually asked you. Each slot gets a format before it gets a draft, because the format is the decision you will be tempted to skip.

The ritual takes twenty minutes and it has four steps:

1. Write the three ideas in one line each.
2. Pick the format for each: text, carousel, short or article.
3. Draft the easiest one now. Not the best one. The easiest.
4. Put the other two on the calendar with a time you will actually be at a desk.

## Why does choosing the format first matter?

Format is where most of the work hides. A caption needs a hook and one idea. A carousel needs a sequence. An article needs an argument. If you choose the format on Friday, Monday is assembly rather than invention. The queue exists to protect the part of you that can still think.

## How do you keep it alive on a bad week?

Cut the number of slots before you cut the quality. One good post beats three resentful ones. Keep the review on the calendar even when the queue is empty, because the review is what stops a bad week from turning into a bad quarter.

## Frequently asked questions

### How many posts should one person schedule?

Three a week is a sustainable default for a solo operator with a day job. Two is fine. Five usually means the quality is being paid for somewhere else.

### What belongs in the review?

What shipped, what stalled, and what next week is about. Not how many likes arrived in the first hour: that is a weather report, not a strategy.

### What if I miss a week?

Nothing happens. The queue is not a streak. Restart on the next slot and do not write a post about it.`],
    ['What an answer engine actually reads on your page',
      'AI answers quote pages that are easy to quote. Here is the short list of things that decide it, and the fixes that take an afternoon.',
      'Research', 9, '#6EE7B7',
      `Answer engines read like impatient editors. They look for a clear question, a short answer near the top, structure they can lift, and permission to crawl. Most pages fail on the third and fourth.

## What are the four signals that matter?

The first is whether the content exists in the HTML. A page rendered entirely by JavaScript is a page that many crawlers see as an empty shell. The second is whether the headings are the literal questions people type. The third is structured data: Article, BlogPosting and FAQPage are the three that matter most. The fourth is access: GPTBot, ClaudeBot, PerplexityBot and Google-Extended have to be allowed in robots.txt.

## How do you win the first paragraph?

Answer the question in 25 to 40 words directly under the heading, with no preamble. Not "in this article we will explore". The literal answer. Then earn the rest of the page. Answer engines lift the short version and cite the page that gave it cleanly.

## What does structured data actually change?

It makes the relationship between the question and the answer machine-readable. FAQPage tells a parser that a question and answer pair is a unit. Article tells it who wrote the thing and when. Neither guarantees a citation, but both remove reasons to skip you.

## Frequently asked questions

### Do I need an llms.txt file?

It helps discovery but nothing is standardised yet. Add a short one that names the site, the tools and the best pages. It costs ten minutes.

### Is this different from SEO?

It overlaps. The difference is the unit of competition: search competes for a link, answer engines compete for a quotation. Quotation rewards directness.

### What is the fastest fix?

Rewrite three H2s as questions and put a forty word answer under each. That is usually an afternoon and it moves the score more than anything else.`],
    ['Sixteen tools, one login: why we bundled instead of unbundled',
      'Most creator stacks are five subscriptions and four logins. We went the other way, and here is what it cost.',
      'Product', 6, '#93C5FD',
      `Every tool in a creator stack is reasonable on its own. Together they become a part time job in tab management. Bundling is an opinion: the work is one workflow, so the software should be one workspace.

## What does one account actually save?

Context. A keyword can become an article without a copy and paste. An article can become a carousel without re-reading it. A carousel can be scheduled without exporting it to a fourth tool. None of that is magic; it is the absence of handoffs.

## What is the cost of bundling?

Depth. A dedicated video editor will always beat a tab in a publishing app. We accept that. The bet is that most people need a good version of six things more than an excellent version of one, and they need those six things to talk to each other.

## Why is everything free?

The tools run on a deterministic local engine, and the expensive parts happen on your device. There is no model bill per generation and no render farm. What is left costs less than a coffee a month per user, so the account is free and the limits are honest.

## Frequently asked questions

### Is there a paid plan?

No. There is nothing to upgrade to, and no card on file to forget about.

### What happens to my data if I leave?

You can export drafts as HTML and keywords as CSV, then delete the account. Deletion is immediate.

### Do you sell data?

No. There is no advertising and no third party analytics script in the product.`],
    ['The scheduler is the product',
      'Anyone can call an API once. The hard part is the third week, when a token expires and nobody is watching.',
      'Engineering', 8, '#C4B5FD',
      `The demo is easy. A button that posts once works for a day. The product is the thing that still works in week three, after a token expires, a feed changes its GUID, and a webhook starts returning 500s at 3am.

## Why is the run log the most important screen?

Because trust is built by evidence. Every run stores the text it used, the platform it targeted, whether it was a dry run, and the exact response. When a post does not appear, the log answers the only question that matters: did we send it, and what did they say back?

## What does a good retry policy look like?

Retry the interesting failures, not all of them. A timeout is worth another attempt. A 401 is not: it means the credential is wrong, and retrying will simply annoy the platform. Mark it, surface it, and keep the schedule intact so the next run is not blocked by the last one.

## How do you test a scheduler without waiting a week?

Time travel in the data, not the code. Set next_run_at into the past and call the tick function directly. That is how the queue is tested here: create, fast forward, tick, assert. No sleeping in the test suite.

## Frequently asked questions

### Does a failed run stop the automation?

No. The run is marked failed, the failure counter increments, and the next run is scheduled normally. Repeated failures move the automation to needs attention.

### What is a dry run?

The post is generated, logged and counted, but nothing leaves the server. It is the default so a new automation cannot surprise you.

### Can I run one now?

Yes. Run now executes the same code path as the scheduler and records the same evidence.`],
  ];
  // Every post gets a scannable list and two primary sources before its FAQ.
  // The AEO demo then scores what a real article should score: the tool is not
  // graded on a page written to flatter it.
  const PLAYBOOK = (topic) => `## The short version

1. Write the piece once, from the angle only ${topic} gives you.
2. Queue the delivery so whether it ships stops depending on your Tuesday.
3. Read the run log on Friday and cut the step that earned nothing.

Primary sources: [Google's guidance on helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and the [schema.org FAQPage vocabulary](https://schema.org/FAQPage).
`;

  for (let i = 0; i < blog.length; i++) {
    const [title, excerpt, tag, mins, accent, markdown] = blog[i];
    const enriched = markdown.replace(
      /\n## Frequently asked questions/,
      `\n${PLAYBOOK('this problem')}\n## Frequently asked questions`
    );
    insert(
      'INSERT INTO blog_posts (slug,title,excerpt,body_html,tag,read_minutes,accent,published_at) VALUES (?,?,?,?,?,?,?,?)',
      slugify(title), title, excerpt, renderMarkdown(enriched), tag, mins, accent, daysAgo(i * 3 + 1)
    );
  }
  // Two rendered scripts and two decks so the saved lists and the landing
  // counters are not zeros on first run. Built by the same engine the member
  // uses, so the sample matches what the product produces.
  const videoSeeds = [['The half of publishing nobody films', 'the boring half of content automation'],
    ['Three decisions before you post', 'three decisions before you post']];
  for (let i = 0; i < videoSeeds.length; i++) {
    const [title, topic] = videoSeeds[i];
    const script = generate('video', { topic, tone: 'practical' });
    insert('INSERT INTO videos (user_id,title,topic,scenes,created_at) VALUES (?,?,?,?,?)',
      1, title, topic, JSON.stringify(script.scenes), daysAgo(i * 2 + 1));
  }
  const deckSeeds = [['Weekly reviews, minus the busywork', 'carousel', 'gold'],
    ['One queue, three channels', 'pin', 'sky']];
  for (let i = 0; i < deckSeeds.length; i++) {
    const [topic, format, palette] = deckSeeds[i];
    const script = generate(format === 'pin' ? 'pin' : 'carousel', { topic });
    const slides = format === 'pin'
      ? [{ kicker: 'PIN', title: script.title, body: script.description },
         ...script.overlay.lines.map((l, n) => ({ kicker: `0${n + 1}`, title: l.split(':')[0], body: l }))]
      : script.slides;
    insert('INSERT INTO decks (user_id,topic,format,palette,handle,slides,created_at) VALUES (?,?,?,?,?,?,?)',
      1, topic, format, palette, '@alex', JSON.stringify(slides), daysAgo(i * 3 + 2));
  }

  for (let d = 0; d < 14; d++) {
    const n = 2 + ((d * 7) % 9);
    for (let i = 0; i < n; i++) {
      insert('INSERT INTO activity (user_id,kind,detail,created_at) VALUES (?,?,?,?)',
        1, i % 3 === 0 ? 'post_sent' : i % 3 === 1 ? 'article' : 'video',
        '', daysAgo(13 - d));
    }
  }
}
