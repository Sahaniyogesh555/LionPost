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

export const trendRegions = [
  { label: 'United States', code: 'US' },
  { label: 'Nepal', code: 'NP' },
  { label: 'India', code: 'IN' },
  { label: 'United Kingdom', code: 'GB' },
  { label: 'Canada', code: 'CA' },
  { label: 'Australia', code: 'AU' },
] as const

export type TrendRegion = typeof trendRegions[number]['label']

export async function readWebsiteFeed(source: string): Promise<FeedResult> {
  const response = await fetch(`/api/feed?url=${encodeURIComponent(source)}`, { headers: { Accept: 'application/json' } })
  const result = await response.json().catch(() => ({ error: 'The feed service returned an unreadable response. Please try again.' })) as FeedResult & { error?: string }
  if (!response.ok) throw new Error(result.error || 'The website feed could not be read.')
  return result
}

export function readLiveTrends(region: TrendRegion): Promise<FeedResult> {
  const code = trendRegions.find((item) => item.label === region)?.code || 'US'
  return readWebsiteFeed(`https://trends.google.com/trending/rss?geo=${code}`)
}
