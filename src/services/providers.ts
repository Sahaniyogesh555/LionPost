import type { PublishResult, RemoteProvider, SocialAccount } from '../types'

export type OAuthRemoteProvider = Exclude<RemoteProvider, 'dailymotion'>

export interface ProviderPublishInput {
  accountIds: string[]
  text: string
  mediaPath?: string
  mediaType?: 'image' | 'video'
  cleanupMedia?: boolean
  privacyLevel?: string
  tiktokAllowComment?: boolean
  tiktokAllowDuet?: boolean
  tiktokAllowStitch?: boolean
  tiktokCommercial?: boolean
  tiktokYourBrand?: boolean
  tiktokBrandedContent?: boolean
  boardId?: string
  videoPrivacy?: 'private' | 'unlisted' | 'public'
  dailymotionVisibility?: 'private' | 'public'
  madeForKids?: boolean
}

export interface TikTokOptions {
  creatorNickname: string
  creatorUsername: string
  privacyLevelOptions: string[]
  publicPosting: boolean
  commentDisabled: boolean
  duetDisabled: boolean
  stitchDisabled: boolean
  maxVideoPostDurationSec?: number
}

export interface PinterestBoardOption { id: string; name: string; privacy: string }

const providerNames: Record<RemoteProvider, string> = { facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', pinterest: 'Pinterest', dailymotion: 'Dailymotion' }

async function request<T>(provider: RemoteProvider | 'media', action: string, accessToken: string, body?: unknown): Promise<T> {
  const path = provider === 'media' ? `/api/providers/media/${action}` : `/api/${provider}/${action}`
  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const result = await response.json().catch(() => ({ error: 'The server returned an unreadable response.' })) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || `The ${provider === 'media' ? 'media' : providerNames[provider]} request could not be completed.`)
  return result
}

export function beginProviderConnection(provider: OAuthRemoteProvider, accessToken: string) {
  return request<{ url: string; redirectUri: string }>(provider, 'connect', accessToken)
}

export function publishToProvider(provider: RemoteProvider, accessToken: string, input: ProviderPublishInput) {
  return request<{ results: PublishResult[] }>(provider, 'publish', accessToken, input).then((response) => response.results)
}

export function disconnectProviderAccount(provider: RemoteProvider, accessToken: string, accountId: string) {
  return request<{ disconnected: boolean }>(provider, 'disconnect', accessToken, { accountId })
}

export function getTikTokOptions(accessToken: string, accountId: string) {
  return request<TikTokOptions>('tiktok', 'options', accessToken, { accountId })
}

export function getPinterestBoards(accessToken: string, accountId: string) {
  return request<{ boards: PinterestBoardOption[] }>('pinterest', 'options', accessToken, { accountId }).then((response) => response.boards)
}

export function connectDailymotionProfile(accessToken: string, clientId: string, clientSecret: string) {
  return request<{ accounts: SocialAccount[] }>('dailymotion', 'connect', accessToken, { clientId, clientSecret }).then((response) => response.accounts)
}

export function cleanupPostMedia(accessToken: string, mediaPath: string) {
  return request<{ removed: boolean }>('media', 'cleanup', accessToken, { mediaPath })
}
