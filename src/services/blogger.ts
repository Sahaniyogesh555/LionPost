import type { PublishResult } from '../types'

async function request<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const result = await response.json().catch(() => ({ error: 'The server returned an unreadable response.' })) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'The Blogger request could not be completed.')
  return result
}

export function beginBloggerConnection(accessToken: string) {
  return request<{ url: string; redirectUri: string }>('/api/blogger/connect', accessToken)
}

export function publishBloggerArticle(accessToken: string, input: { accountId: string; title: string; content: string; labels: string[] }) {
  return request<{ result: PublishResult }>('/api/blogger/publish', accessToken, input).then((response) => response.result)
}

export function disconnectBloggerAccount(accessToken: string, accountId: string) {
  return request<{ disconnected: boolean }>('/api/blogger/disconnect', accessToken, { accountId })
}
