import { Router } from '../lib/http.js';

export function metaRoutes() {
  const r = new Router();

  r.get('/robots.txt', (ctx) => {
    const host = `https://${ctx.req.headers.host || 'lionpost.local'}`;
    ctx.text(`# LionPost\nUser-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${host}/sitemap.xml\n`, 200);
  });

  r.get('/llms.txt', (ctx) => {
    const posts = ctx.db.prepare('SELECT slug,title,excerpt FROM blog_posts ORDER BY published_at DESC LIMIT 10').all();
    ctx.text(`# LionPost\n\n> One account for social automation, AI content tools and a creator community. Sixteen tools, free, no card.\n\n## Tools\n\n- [All tools](https://${ctx.req.headers.host || 'lionpost.local'}/tools): the full catalogue with one page per tool\n- [Keyword research](https://${ctx.req.headers.host || 'lionpost.local'}/tools/keyword-research): volume, difficulty, intent and trend estimates\n- [AEO checker](https://${ctx.req.headers.host || 'lionpost.local'}/tools/aeo-checker): 18 checks for answer engine visibility\n\n## Writing\n\n${posts.map((p) => `- [${p.title}](https://${ctx.req.headers.host || 'lionpost.local'}/blog/${p.slug}): ${p.excerpt}`).join('\n')}\n`, 200);
  });

  r.get('/sitemap.xml', (ctx) => {
    const host = `https://${ctx.req.headers.host || 'lionpost.local'}`;
    const urls = ['/', '/tools', '/community', '/blog', '/about', '/terms', '/privacy', '/login', '/register']
      .concat(['community', 'ai-video-maker', 'blogger-auto-post', 'facebook-auto-post', 'instagram-auto-post', 'shorts-maker', 'video-translator', 'pinterest-auto-pin', 'keyword-research', 'aeo-checker', 'instagram-carousel', 'website-to-social', 'x-twitter-auto-post', 'telegram-auto-post', 'tiktok-auto-post', 'youtube-dailymotion'].map((s) => `/tools/${s}`))
      .concat(ctx.db.prepare('SELECT slug FROM blog_posts').all().map((p) => `/blog/${p.slug}`))
      .concat(['/videos'])
      .concat(ctx.db.prepare('SELECT slug FROM showcase_videos').all().map((v) => `/videos/${v.slug}`))
      .concat(ctx.db.prepare('SELECT DISTINCT tag FROM blog_posts').all().map((t) => `/blog/tag/${encodeURIComponent(t.tag)}`))
      .concat(ctx.db.prepare('SELECT slug FROM posts').all().map((p) => `/community/${p.slug}`));
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].map((u) => `  <url><loc>${host}${u}</loc></url>`).join('\n')}\n</urlset>`;
    ctx.res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    ctx.res.end(body);
  });

  r.get('/feed.xml', (ctx) => {
    const host = `https://${ctx.req.headers.host || 'lionpost.local'}`;
    const posts = ctx.db.prepare('SELECT * FROM blog_posts ORDER BY published_at DESC').all();
    const items = posts.map((p) => `  <item>\n    <title><![CDATA[${p.title}]]></title>\n    <link>${host}/blog/${p.slug}</link>\n    <guid isPermaLink="true">${host}/blog/${p.slug}</guid>\n    <description><![CDATA[${p.excerpt}]]></description>\n    <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>\n  </item>`).join('\n');
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n  <title>LionPost blog</title>\n  <link>${host}/blog</link>\n  <description>Notes on publishing alone.</description>\n${items}\n</channel></rss>`;
    ctx.res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
    ctx.res.end(body);
  });

  return r;
}
