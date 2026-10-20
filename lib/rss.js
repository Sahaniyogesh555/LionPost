// Minimal RSS 2.0 / Atom / sitemap parser. No dependencies, no network calls
// inside parseFeed; fetchFeed does one guarded GET.

const decode = (s) => String(s ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .trim();

const pickTag = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decode(m[1]) : '';
};
const pickAttr = (block, tag, attr) => {
  const m = block.match(new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, 'i'));
  return m ? decode(m[1]) : '';
};

export function parseFeed(xml) {
  const text = String(xml || '');
  if (!text.trim()) throw new Error('The feed was empty');
  const channelTitle = pickTag(text, 'title');
  const isAtom = /<feed[\s>]/i.test(text);
  const blocks = isAtom
    ? [...text.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0])
    : [...text.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);

  const items = blocks.map((b, i) => {
    const link = isAtom ? (pickAttr(b, 'link', 'href') || pickTag(b, 'id')) : pickTag(b, 'link');
    const guid = isAtom ? pickTag(b, 'id') : (pickTag(b, 'guid') || link || `item-${i}`);
    const dateRaw = pickTag(b, 'pubDate') || pickTag(b, 'published') || pickTag(b, 'updated');
    const parsedDate = dateRaw ? new Date(dateRaw) : null;
    return {
      guid: guid || `item-${i}`,
      title: pickTag(b, 'title') || 'Untitled',
      link: link || '',
      summary: (pickTag(b, 'description') || pickTag(b, 'summary') || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400),
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    };
  }).filter((it) => it.link);

  if (!items.length) {
    // Sitemap fallback
    const locs = [...text.matchAll(/<url[\s>][\s\S]*?<loc>([\s\S]*?)<\/loc>[\s\S]*?<\/url>/gi)].map((m) => decode(m[1]));
    const fallback = locs.slice(0, 25).map((loc, i) => ({
      guid: loc, title: decodeURIComponent(loc.split('/').filter(Boolean).pop() || 'Page').replace(/[-_]/g, ' '),
      link: loc, summary: '', publishedAt: null, index: i,
    }));
    if (!fallback.length) throw new Error('No RSS items, Atom entries or sitemap URLs found');
    return { title: channelTitle || 'Sitemap', kind: 'sitemap', items: fallback };
  }
  return { title: channelTitle || 'Feed', kind: isAtom ? 'atom' : 'rss', items: items.slice(0, 40) };
}

export async function fetchFeed(url, { timeout = 10000 } = {}) {
  let target;
  try { target = new URL(url); } catch { throw new Error('Enter a full feed URL, including https://'); }
  if (!/^https?:$/.test(target.protocol)) throw new Error('Only http and https feeds are supported');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(target.href, {
      signal: controller.signal, redirect: 'follow',
      headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*', 'user-agent': 'LionPostFeed/1.0' },
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Feed responded ${res.status}`);
    return { ...parseFeed(body), fetchedAt: new Date().toISOString(), url: target.href };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('The feed timed out');
    throw err;
  } finally { clearTimeout(timer); }
}
