// Answer-engine (AEO) checker: 18 checks, no API keys, no external service.
// Reads a page the way an AI answer engine would: is the answer in the HTML,
// is it structured, is it quotable, and are AI crawlers allowed in.

const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider'];

const decode = (s) => String(s)
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
  .replace(/&#x27;/gi, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

const stripTags = (s) => decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

export function analyze({ html, url = '', robots = null, llms = null, status = 200 } = {}) {
  const page = String(html || '');
  if (!page.trim()) throw new Error('The page returned no HTML');

  const jsonLdRaw = [...page.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const jsonLd = [];
  for (const block of jsonLdRaw) {
    try {
      const parsed = JSON.parse(block.trim());
      const stack = [parsed];
      while (stack.length) {
        const node = stack.pop();
        if (!node) continue;
        if (Array.isArray(node)) { stack.push(...node); continue; }
        if (typeof node === 'object') {
          if (node['@type']) jsonLd.push(node);
          if (node['@graph']) stack.push(...node['@graph']);
        }
      }
    } catch { /* invalid JSON-LD is itself a problem; counted as absent */ }
  }
  const types = new Set();
  for (const node of jsonLd) {
    for (const t of [].concat(node['@type'] || [])) types.add(String(t));
  }
  const hasFaqSchema = types.has('FAQPage') || /itemtype=["'][^"']*FAQPage/i.test(page);
  const hasArticleSchema = ['Article', 'BlogPosting', 'NewsArticle', 'Report'].some((t) => types.has(t));

  const title = (page.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const meta = (name) => {
    const m = page.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))
      || page.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'));
    return m ? decode(m[1]).trim() : '';
  };
  const linkRel = (rel) => {
    const m = page.match(new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*href=["']([^"']+)["']`, 'i'));
    return m ? m[1] : '';
  };

  const headings = [...page.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ level: +m[1], text: stripTags(m[2]) }))
    .filter((h) => h.text);
  const h1s = headings.filter((h) => h.level === 1);
  const h2h3 = headings.filter((h) => h.level === 2 || h.level === 3);

  const cleanHtml = page
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  const text = stripTags(cleanHtml);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const imgs = [...page.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgsWithAlt = imgs.filter((tag) => /\balt=["'][^"']+["']/i.test(tag));

  const base = (() => { try { return new URL(url); } catch { return null; } })();
  const anchors = [...page.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  let internal = 0, external = 0;
  for (const href of anchors) {
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const u = new URL(href, base || 'https://example.invalid');
      if (!base || u.host === base.host) internal++;
      else external++;
    } catch { /* ignore */ }
  }

  const faqHeading = headings.some((h) => /faq|frequently asked|questions/i.test(h.text));
  const details = /<details[\s>]/i.test(page);
  const questionHeadings = h2h3.filter((h) => /\?\s*$/.test(h.text) || /^(how|what|why|when|where|which|who|is|are|can|do|does|should)\b/i.test(h.text)).length;

  // "Direct answer early": a short, declarative paragraph near the top, after the h1.
  const firstH1 = cleanHtml.search(/<h1[^>]*>/i);
  const bodyAfterH1 = firstH1 >= 0 ? cleanHtml.slice(firstH1) : cleanHtml;
  const firstParagraphs = [...bodyAfterH1.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].slice(0, 4).map((m) => stripTags(m[1])).filter(Boolean);
  const firstPara = firstParagraphs.find((p) => p.split(/\s+/).length > 12) || '';
  const firstParaWords = firstPara ? firstPara.split(/\s+/).length : 0;
  const sentences = firstPara.split(/(?<=[.!?])\s+/).filter((s) => s.split(/\s+/).length > 4);
  const shortSentence = sentences.find((s) => s.split(/\s+/).length <= 32) || '';
  const filler = /in this (article|post|guide)[, ]|we will (discuss|explore)|let'?s dive/i.test(firstPara);

  const hasLists = /<(ul|ol)[\s>]/i.test(cleanHtml);
  const hasFaqSection = faqHeading || details;
  const lang = (page.match(/<html[^>]*\blang=["']([^"']+)["']/i) || [])[1] || '';
  const canonical = linkRel('canonical');
  const ogTitle = meta('og:title');
  const metaDescription = meta('description');
  const h1Count = h1s.length;
  const headingOrderOk = (() => {
    let prev = 0;
    for (const h of headings) { if (prev && h.level > prev + 1) return false; prev = h.level; }
    return true;
  })();

  let robotText = robots;
  if (robotText == null) { try { robotText = null; } catch { robotText = null; } }
  const blockedBots = [];
  if (typeof robotText === 'string') {
    for (const bot of AI_BOTS) {
      const block = new RegExp(`user-agent:\\s*${bot}[\\s\\S]*?(?=user-agent:|$)`, 'i').exec(robotText);
      if (block && /disallow:\s*\/\s*($|\n)/i.test(block[0])) blockedBots.push(bot);
    }
  }

  const checks = [];
  const add = (id, label, weight, status, detail, fix) => checks.push({ id, label, weight, status, detail, fix });

  add('https', 'Served over HTTPS', 4, url ? (url.startsWith('https://') ? 'pass' : 'fail') : 'skip',
    url ? (url.startsWith('https://') ? 'Encrypted in transit' : 'Plain HTTP') : 'URL not supplied',
    'Move the site behind TLS. Answer engines rarely cite plain HTTP.');

  add('title', 'Title tag is specific and the right length', 6,
    !title ? 'fail' : (title.trim().length >= 20 && title.trim().length <= 70 ? 'pass' : 'partial'),
    title ? `${title.trim().length} characters` : 'No title tag',
    'Write a 20 to 70 character title that names the topic, not the brand alone.');

  add('meta', 'Meta description reads like an answer', 6,
    !metaDescription ? 'fail' : (metaDescription.length >= 50 && metaDescription.length <= 165 ? 'pass' : 'partial'),
    metaDescription ? `${metaDescription.length} characters` : 'No meta description',
    'Write 50 to 160 characters that answer the page question in one sentence.');

  add('h1', 'Exactly one H1', 6, h1Count === 1 ? 'pass' : h1Count === 0 ? 'fail' : 'partial',
    `${h1Count} H1 heading${h1Count === 1 ? '' : 's'}${h1s[0] ? `: "${h1s[0].text.slice(0, 60)}"` : ''}`,
    'Use one H1 that matches the search question. Demote the rest to H2.');

  add('heading-order', 'Heading levels are in order', 4, headings.length ? (headingOrderOk ? 'pass' : 'partial') : 'fail',
    `${headings.length} headings, no skipped levels: ${headingOrderOk ? 'yes' : 'no'}`,
    'Do not jump from H1 to H3. Structure is how a parser finds your sections.');

  add('question-headings', 'Headings are phrased as questions', 7,
    questionHeadings >= 3 ? 'pass' : questionHeadings >= 1 ? 'partial' : 'fail',
    `${questionHeadings} question-style H2/H3`,
    'Rewrite two or three H2s as the literal question people type.');

  add('answer-early', 'A direct answer appears near the top', 8,
    shortSentence && !filler ? 'pass' : shortSentence ? 'partial' : 'fail',
    shortSentence ? `First paragraph: ${firstParaWords} words, shortest sentence ${shortSentence.split(/\s+/).length} words${filler ? ', starts with filler' : ''}` : 'No early paragraph found',
    'Put a 25 to 40 word answer directly under the H1, before any background.');

  add('depth', 'Enough substance to be worth quoting', 6,
    wordCount >= 700 ? 'pass' : wordCount >= 350 ? 'partial' : 'fail',
    `${wordCount} words in the HTML`,
    'Aim for 700+ words of real text in the markup, not behind JavaScript.');

  add('faq-section', 'An FAQ section exists', 5, hasFaqSection ? 'pass' : 'fail',
    hasFaqSection ? (faqHeading ? 'FAQ heading found' : 'Details/summary blocks found') : 'No FAQ heading or details blocks',
    'Add an FAQ with the three questions you hear most, phrased exactly as asked.');

  add('faq-schema', 'FAQPage structured data', 7, hasFaqSchema ? 'pass' : 'fail',
    hasFaqSchema ? 'FAQPage schema present' : 'No FAQPage JSON-LD',
    'Wrap the FAQ in FAQPage JSON-LD with Question and Answer objects.');

  add('article-schema', 'Article structured data', 5, hasArticleSchema ? 'pass' : 'fail',
    hasArticleSchema ? `${[...types].filter((t) => /Article|BlogPosting|NewsArticle/.test(t)).join(', ')} schema present` : 'No Article/BlogPosting JSON-LD',
    'Add Article or BlogPosting JSON-LD with headline, author and datePublished.');

  add('lists', 'Lists break the answer into steps', 4, hasLists ? 'pass' : 'fail',
    hasLists ? 'List markup found' : 'No ul/ol in the HTML',
    'Turn the steps into an ordered list. Answer engines lift lists verbatim.');

  add('image-alt', 'Images carry descriptive alt text', 5,
    imgs.length === 0 ? 'skip' : (imgsWithAlt.length === imgs.length ? 'pass' : imgsWithAlt.length / imgs.length >= 0.6 ? 'partial' : 'fail'),
    imgs.length ? `${imgsWithAlt.length} of ${imgs.length} images have alt text` : 'No images',
    'Describe what the image shows in alt text, not its filename.');

  add('internal-links', 'Internal links give the crawler context', 4,
    internal >= 3 ? 'pass' : internal >= 1 ? 'partial' : 'fail',
    `${internal} internal, ${external} external links`,
    'Link to two or three related pages with descriptive anchor text.');

  add('citations', 'External citations back the claims', 4,
    external >= 1 ? 'pass' : 'fail', `${external} external links`,
    'Cite a primary source. Quotable pages show their work.');

  add('canonical', 'Canonical URL is declared', 4, canonical ? 'pass' : 'fail',
    canonical ? canonical.slice(0, 70) : 'No canonical link',
    'Add <link rel="canonical"> so syndicated copies point at the original.');

  add('social-lang', 'Language and social tags are set', 4,
    lang && (ogTitle || meta('og:description')) ? 'pass' : lang || ogTitle ? 'partial' : 'fail',
    `lang="${lang || 'missing'}", og:title ${ogTitle ? 'set' : 'missing'}`,
    'Set the html lang attribute and an og:title. Parsers read both.');

  add('crawler-access', 'AI crawlers are allowed in', 8,
    typeof robotText !== 'string' ? 'skip' : (blockedBots.length === 0 ? (llms ? 'pass' : 'partial') : 'fail'),
    typeof robotText !== 'string'
      ? 'robots.txt not read'
      : blockedBots.length ? `Blocked: ${blockedBots.join(', ')}` : `No AI crawler blocked${llms ? ', llms.txt present' : ', no llms.txt'}`,
    'Do not disallow GPTBot, OAI-SearchBot, ClaudeBot or PerplexityBot. Add /llms.txt describing your site.');

  const applicable = checks.filter((c) => c.status !== 'skip');
  const totalWeight = applicable.reduce((n, c) => n + c.weight, 0) || 1;
  const earned = applicable.reduce((n, c) => n + c.weight * (c.status === 'pass' ? 1 : c.status === 'partial' ? 0.5 : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);

  return {
    score, checks, url, status,
    stats: {
      wordCount, headings: headings.length, h1: h1Count, images: imgs.length,
      internal, external, questionHeadings, types: [...types], hasFaqSchema,
      blockedBots, llmsTxt: Boolean(llms), httpStatus: status,
    },
  };
}

export async function fetchPage(rawUrl, { timeout = 9000 } = {}) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('That is not a valid URL. Include https://'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only http and https URLs can be checked');
  const get = async (u) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(u, {
        signal: controller.signal, redirect: 'follow',
        headers: { 'user-agent': 'LionPostAEO/1.0 (+https://lionpost.local/aeo)', accept: 'text/html,application/xhtml+xml' },
      });
      const text = await res.text();
      return { res, text };
    } finally { clearTimeout(timer); }
  };
  const { res, text } = await get(url.href);
  let robots = null, llms = null;
  try { robots = (await get(new URL('/robots.txt', url).href)).text.slice(0, 20000); } catch { robots = null; }
  try {
    const probe = await get(new URL('/llms.txt', url).href);
    llms = probe.res.ok ? probe.text.slice(0, 20000) : null;
  } catch { llms = null; }
  return { ok: res.ok, status: res.status, html: text, url: url.href, robots, llms };
}
