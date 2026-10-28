import type { PublishResult, SocialAccount } from '../types'

async function request<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({ error: 'The server returned an unreadable response.' })) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.')
  return result
}

export function connectTelegramAccount(accessToken: string, botToken: string, chatId: string, displayName: string) {
  return request<{ account: SocialAccount }>('/api/telegram/connect', accessToken, { botToken, chatId, displayName }).then((result) => result.account)
}

export function disconnectTelegramAccount(accessToken: string, accountId: string) {
  return request<{ disconnected: boolean }>('/api/telegram/disconnect', accessToken, { accountId })
}

export function publishToTelegram(accessToken: string, input: { accountIds: string[]; text: string; image?: string }) {
  return request<{ results: PublishResult[] }>('/api/telegram/publish', accessToken, input).then((result) => result.results)
}
