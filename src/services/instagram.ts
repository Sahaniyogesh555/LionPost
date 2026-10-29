import type { PublishResult } from '../types'

async function request<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const result = await response.json().catch(() => ({ error: 'The server returned an unreadable response.' })) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'The Instagram request could not be completed.')
  return result
}

export function beginInstagramConnection(accessToken: string) {
  return request<{ url: string; redirectUri: string }>('/api/instagram/connect', accessToken)
}

export function publishToInstagram(accessToken: string, input: { accountIds: string[]; text: string; mediaPath: string; mediaType: 'image' | 'video' }) {
  return request<{ results: PublishResult[] }>('/api/instagram/publish', accessToken, input).then((response) => response.results)
}

export function disconnectInstagramAccount(accessToken: string, accountId: string) {
  return request<{ disconnected: boolean }>('/api/instagram/disconnect', accessToken, { accountId })
}
