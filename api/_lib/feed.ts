import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { XMLParser } from 'fast-xml-parser'

export interface FeedNewsItem {
  title: string
  url: string
  source: string
}

export interface FeedItem {
  id: string
  title: string
  link: string
  summary: string
  image?: string
  published?: string
  traffic?: string
  news: FeedNewsItem[]
}

export interface FeedResult {
  source: string
  title: string
  kind: 'rss' | 'atom' | 'sitemap'
  fetchedAt: string
  items: FeedItem[]
}

interface ReadOptions {
  allowPrivate?: boolean
  depth?: number
}

const MAX_BYTES = 4 * 1024 * 1024
const MAX_ITEMS = 50
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
})

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function text(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (Array.isArray(value)) return value.length ? text(value[0]) : ''
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return text(record['#text'] ?? record.text ?? record['@_href'] ?? record['@_url'] ?? record['@_loc'] ?? '')
  }
  return ''
}

function decodeEntities(value: string) {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? match
    const hex = entity[1]?.toLowerCase() === 'x'
    const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : match
  })
}

function plainText(value: unknown, max = 700) {
  return decodeEntities(text(value).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, max)
}

function isPrivateAddress(address: string) {
  const ip = address.toLowerCase().split('%')[0]
  if (ip === '::' || ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true
  const ipv4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ipv4)) return false
  const parts = ipv4.split('.').map(Number)
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
}

async function assertSafeUrl(value: string, allowPrivate: boolean) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.')
  if (url.username || url.password) throw new Error('URLs containing credentials are not supported.')
  if (allowPrivate) return url
  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Private network URLs are not allowed.')
  }
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error('Private network URLs are not allowed.')
    return url
  }
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true })
    if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error('Private network URLs are not allowed.')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Private network')) throw error
    throw new Error('The website address could not be resolved.')
  }
  return url
}

async function fetchText(source: string, allowPrivate: boolean): Promise<{ text: string; url: string; contentType: string }> {
  let current = source
  for (let redirect = 0; redirect < 5; redirect += 1) {
    const url = await assertSafeUrl(current, allowPrivate)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'LionPostFeedReader/1.0 (+https://alphapost-preview.vercel.app)',
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.5',
        },
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) throw new Error('The website returned an invalid redirect.')
        current = new URL(location, url).toString()
        continue
      }
      if (!response.ok) throw new Error(`The website returned HTTP ${response.status}.`)
      if (!response.body) throw new Error('The website returned an empty response.')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ''
      let bytes = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > MAX_BYTES) {
          await reader.cancel()
          throw new Error('The feed is too large to read safely.')
        }
        result += decoder.decode(value, { stream: true })
      }
      result += decoder.decode()
      return { text: result, url: url.toString(), contentType: response.headers.get('content-type') || '' }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('The website took too long to respond.')
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
  throw new Error('Too many redirects while reading the website.')
}

function itemLink(item: Record<string, unknown>) {
  const links = asArray(item.link)
  const alternate = links.find((link) => typeof link === 'object' && (!text((link as Record<string, unknown>)['@_rel']) || text((link as Record<string, unknown>)['@_rel']) === 'alternate'))
  return text(alternate ?? links[0])
}

function itemImage(item: Record<string, unknown>) {
  const candidates = [item['media:content'], item['media:thumbnail'], item.enclosure, item['ht:picture'], item['image:url']]
  for (const candidate of candidates) {
    for (const entry of asArray(candidate)) {
      const value = text(entry)
      if (value && /^https?:\/\//i.test(value)) return value
      if (entry && typeof entry === 'object') {
        const url = text((entry as Record<string, unknown>)['@_url'])
        if (url && /^https?:\/\//i.test(url)) return url
      }
    }
  }
  const html = text(item['content:encoded'] || item.content || item.description || item.summary)
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || ''
}

function normalizeItem(item: Record<string, unknown>, baseUrl: string): FeedItem {
  const link = itemLink(item)
  const absoluteLink = link ? new URL(link, baseUrl).toString() : ''
  const title = plainText(item.title, 300) || (absoluteLink ? decodeURIComponent(new URL(absoluteLink).pathname.split('/').filter(Boolean).pop() || absoluteLink).replace(/[-_]+/g, ' ') : 'Untitled')
  const fallbackId = absoluteLink ? (absoluteLink === baseUrl ? `${absoluteLink}#${title}` : absoluteLink) : title
  const id = text(item.guid || item.id || item['dc:identifier']) || fallbackId
  const news = asArray(item['ht:news_item']).map((entry) => {
    const newsItem = entry as Record<string, unknown>
    return { title: plainText(newsItem['ht:news_item_title'], 300), url: text(newsItem['ht:news_item_url']), source: plainText(newsItem['ht:news_item_source'], 120) }
  }).filter((entry) => entry.title && entry.url)
  return {
    id,
    title,
    link: absoluteLink,
    summary: plainText(item['content:encoded'] ?? item.description ?? item.summary ?? item.content, 700),
    image: itemImage(item) || undefined,
    published: text(item.pubDate || item.published || item.updated || item['dc:date']) || undefined,
    traffic: text(item['ht:approx_traffic']) || undefined,
    news,
  }
}

function metaContent(html: string, name: string) {
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = match[0]
    const property = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]
    if (property?.toLowerCase() !== name.toLowerCase()) continue
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1]
    if (content) return decodeEntities(content)
  }
  return ''
}

async function enrichSitemapItems(items: FeedItem[], allowPrivate: boolean): Promise<FeedItem[]> {
  const firstItems = items.slice(0, 6)
  const enriched = await Promise.all(firstItems.map(async (item): Promise<FeedItem> => {
    if (!item.link) return item
    try {
      const page = await fetchText(item.link, allowPrivate)
      const title = metaContent(page.text, 'og:title') || page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || item.title
      const image = metaContent(page.text, 'og:image')
      return {
        ...item,
        title: plainText(title, 300) || item.title,
        summary: metaContent(page.text, 'description') || metaContent(page.text, 'og:description') || item.summary,
        image: image ? new URL(image, page.url).toString() : item.image,
        published: metaContent(page.text, 'article:published_time') || item.published,
      }
    } catch {
      return item
    }
  }))
  return [...enriched, ...items.slice(6)]
}

export async function readFeed(source: string, options: ReadOptions = {}): Promise<FeedResult> {
  const allowPrivate = options.allowPrivate === true
  const depth = options.depth ?? 0
  if (depth > 3) throw new Error('Too many feed discovery steps were required.')
  const parsedSource = new URL(source)
  const response = await fetchText(parsedSource.toString(), allowPrivate)
  const body = response.text.trim()
  if (!body) throw new Error('The website returned an empty document.')
  const looksLikeHtml = /^\s*(?:<!doctype\s+html|<html[\s>])/i.test(body) || response.contentType.includes('text/html')

  if (looksLikeHtml) {
    for (const match of body.matchAll(/<link\s+[^>]*>/gi)) {
      const tag = match[0]
      const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1] || ''
      const type = tag.match(/type=["']([^"']+)["']/i)?.[1] || ''
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
      if (href && rel.toLowerCase().includes('alternate') && /(?:rss|atom)\+xml/i.test(type)) {
        return readFeed(new URL(decodeEntities(href), response.url).toString(), { allowPrivate, depth: depth + 1 })
      }
    }
    const sitemapUrl = new URL('/sitemap.xml', response.url).toString()
    try {
      return await readFeed(sitemapUrl, { allowPrivate, depth: depth + 1 })
    } catch {
      throw new Error('No RSS, Atom, or sitemap feed was found on this website.')
    }
  }

  let document: Record<string, unknown>
  try {
    document = parser.parse(body) as Record<string, unknown>
  } catch {
    throw new Error('The feed is not valid XML.')
  }

  const sitemapIndex = document.sitemapindex as Record<string, unknown> | undefined
  if (sitemapIndex) {
    const firstSitemap = asArray(sitemapIndex.sitemap)[0] as Record<string, unknown> | undefined
    const location = text(firstSitemap?.loc)
    if (!location) throw new Error('The sitemap index does not contain a sitemap URL.')
    return readFeed(new URL(location, response.url).toString(), { allowPrivate, depth: depth + 1 })
  }

  const urlset = document.urlset as Record<string, unknown> | undefined
  if (urlset) {
    let items = asArray(urlset.url).map((entry): FeedItem => {
      const location = text((entry as Record<string, unknown>).loc)
      const link = new URL(location, response.url).toString()
      const slug = decodeURIComponent(new URL(link).pathname.split('/').filter(Boolean).pop() || new URL(link).hostname)
      return { id: link, title: slug.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '), link, summary: '', published: text((entry as Record<string, unknown>).lastmod) || undefined, news: [] }
    }).filter((item) => item.link).slice(0, MAX_ITEMS)
    if (!items.length) throw new Error('The sitemap does not contain any pages.')
    items = await enrichSitemapItems(items, allowPrivate)
    return { source: response.url, title: new URL(response.url).hostname, kind: 'sitemap', fetchedAt: new Date().toISOString(), items }
  }

  const feed = document.feed as Record<string, unknown> | undefined
  const rss = document.rss as Record<string, unknown> | undefined
  const rdf = document['rdf:RDF'] as Record<string, unknown> | undefined
  const channel = (rss?.channel || rdf?.channel) as Record<string, unknown> | undefined
  const rawItems = feed ? asArray(feed.entry) : asArray(channel?.item || rdf?.item)
  if (!feed && !channel && !rdf) throw new Error('This XML document is not an RSS, Atom, or sitemap feed.')
  const items = rawItems.map((item) => normalizeItem(item as Record<string, unknown>, response.url)).filter((item) => item.title).slice(0, MAX_ITEMS)
  if (!items.length) throw new Error('The feed does not contain any articles.')
  return {
    source: response.url,
    title: plainText(feed?.title || channel?.title, 200) || new URL(response.url).hostname,
    kind: feed ? 'atom' : 'rss',
    fetchedAt: new Date().toISOString(),
    items,
  }
}
