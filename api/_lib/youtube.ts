import { randomUUID } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import { accountIds, bestEffortMediaCleanup, createOAuthState, disconnectProvider, mediaTitle, one, ownedAccounts, providerFetch, providerRequest, readOAuthState, readTemporaryMedia, record, redirectUri, validateMediaPath } from './provider-utils.js'
import type { PublishResult } from '../../src/types.js'

const UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload'
const READ_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'

interface GoogleToken { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string }
interface YouTubeCredential { accessToken: string; refreshToken: string; expiresAt: number }
interface YouTubeChannel { id?: string; snippet?: { title?: string; customUrl?: string } }

function youtubeConfig() {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new ApiError(503, 'YouTube OAuth is not configured yet. Add a dedicated YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first. Blogger credentials are intentionally separate.')
  return { clientId, clientSecret, redirectUri: redirectUri('youtube') }
}

function tokenRequest(parameters: Record<string, string>) {
  const config = youtubeConfig()
  return providerRequest<GoogleToken>('YouTube', 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
  })
}

function credential(token: GoogleToken, previousRefreshToken = ''): YouTubeCredential {
  if (!token.access_token) throw new ApiError(400, 'YouTube did not return an access token.')
  const refreshToken = token.refresh_token || previousRefreshToken
  if (!refreshToken) throw new ApiError(400, 'YouTube did not return a refresh token. Reconnect and approve offline access.')
  return { accessToken: token.access_token, refreshToken, expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 3600) * 1000 }
}

function readCredential(value: string): YouTubeCredential {
  try {
    const parsed = JSON.parse(decryptToken(value)) as Partial<YouTubeCredential>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) throw new Error('Incomplete credential')
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: Number(parsed.expiresAt) }
  } catch {
    throw new ApiError(400, 'The YouTube credential could not be read. Reconnect this channel.')
  }
}

async function accessTokenFor(userId: string, accountId: string) {
  const client = serviceClient()
  const { data, error } = await client.from('social_connections').select('encrypted_token').eq('user_id', userId).eq('account_id', accountId).maybeSingle()
  if (error) throw new ApiError(400, error.message)
  if (!data?.encrypted_token) throw new ApiError(400, 'The YouTube credential is missing. Reconnect this channel.')
  const stored = readCredential(String(data.encrypted_token))
  if (stored.expiresAt > Date.now() + 60_000) return stored.accessToken
  const token = await tokenRequest({ grant_type: 'refresh_token', refresh_token: stored.refreshToken })
  const next = credential(token, stored.refreshToken)
  const { error: updateError } = await client.from('social_connections').update({ encrypted_token: encryptToken(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq('user_id', userId).eq('account_id', accountId)
  if (updateError) throw new ApiError(400, updateError.message)
  return next.accessToken
}

export async function beginYouTube(request: ApiRequest) {
  const { user } = await requireUser(request)
  const config = youtubeConfig()
  const parameters = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: `${UPLOAD_SCOPE} ${READ_SCOPE}`,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
    state: createOAuthState('youtube', user.id),
  })
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${parameters}`, redirectUri: config.redirectUri }
}

export async function completeYouTube(request: ApiRequest) {
  try {
    const oauthError = one(request.query.error)
    if (oauthError) throw new ApiError(400, oauthError === 'access_denied' ? 'YouTube permission was cancelled.' : 'YouTube could not connect the channel.')
    const code = one(request.query.code)
    const state = one(request.query.state)
    if (!code || !state) throw new ApiError(400, 'YouTube returned an incomplete connection response.')
    const { userId } = readOAuthState('youtube', state)
    const config = youtubeConfig()
    const token = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri })
    const scopes = new Set((token.scope || '').split(/\s+/).filter(Boolean))
    if (!scopes.has(UPLOAD_SCOPE) || !scopes.has(READ_SCOPE)) throw new ApiError(400, 'YouTube did not grant both channel-read and upload permissions. Reconnect and approve all requested permissions.')
    if (!token.access_token) throw new ApiError(400, 'YouTube did not return an access token.')
    const response = await providerRequest<{ items?: YouTubeChannel[] }>('YouTube', 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=50', { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' } })
    const channels = (response.items || []).filter((channel): channel is YouTubeChannel & { id: string } => Boolean(channel.id)).slice(0, 50)
    if (!channels.length) throw new ApiError(400, 'This Google account does not have a YouTube channel that LionPost can manage.')

    const client = serviceClient()
    const { data: existingRows, error: lookupError } = await client.from('social_accounts').select('id,external_id').eq('user_id', userId).eq('platform', 'YouTube').eq('connection_type', 'youtube')
    if (lookupError) throw new ApiError(400, lookupError.message)
    const existingIds = new Map((existingRows || []).map((row) => [String(row.external_id), String(row.id)]))
    const storedCredential = credential(token)
    const encryptedToken = encryptToken(JSON.stringify(storedCredential))
    const accountRows = channels.map((channel) => {
      const name = channel.snippet?.title || 'YouTube channel'
      return { user_id: userId, id: existingIds.get(channel.id) || randomUUID(), platform: 'YouTube', name, handle: channel.snippet?.customUrl || name, status: 'working', connection_type: 'youtube', external_id: channel.id, bot_username: null }
    })
    const { error: accountError } = await client.from('social_accounts').upsert(accountRows, { onConflict: 'user_id,id' })
    if (accountError) throw new ApiError(400, accountError.message)
    const { error: connectionError } = await client.from('social_connections').upsert(accountRows.map((account, index) => ({
      user_id: userId,
      account_id: account.id,
      encrypted_token: encryptedToken,
      metadata: { provider: 'youtube_data_api_v3', channel_id: channels[index].id, scopes: [...scopes] },
      updated_at: new Date().toISOString(),
    })), { onConflict: 'user_id,account_id' })
    if (connectionError) {
      const newIds = accountRows.filter((row) => !existingIds.has(String(row.external_id))).map((row) => row.id)
      if (newIds.length) await client.from('social_accounts').delete().eq('user_id', userId).in('id', newIds)
      throw new ApiError(400, connectionError.message)
    }
    return `/app/accounts?youtube_connected=${accountRows.length}`
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'YouTube could not be connected. Please try again.'
    return `/app/accounts?youtube_error=${encodeURIComponent(message)}`
  }
}

export async function publishYouTube(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const ids = accountIds(input, 1)
  const text = String(input.text || '').trim()
  const privacyStatus = String(input.videoPrivacy || 'private')
  if (ids.length !== 1) throw new ApiError(400, 'Publish to one YouTube channel at a time.')
  if (String(input.mediaType || '') !== 'video') throw new ApiError(400, 'YouTube publishing requires a video.')
  if (!['private', 'unlisted', 'public'].includes(privacyStatus)) throw new ApiError(400, 'Choose private, unlisted, or public YouTube visibility.')
  if (Array.from(text).length > 5000) throw new ApiError(400, 'YouTube descriptions can contain at most 5,000 characters.')
  validateMediaPath(user.id, input.mediaPath, 'video')
  const [account] = await ownedAccounts(user.id, client, 'YouTube', 'youtube', ids)
  const accountId = String(account.id)

  try {
    const accessToken = await accessTokenFor(user.id, accountId)
    const media = await readTemporaryMedia(user.id, input.mediaPath, 'video')
    const metadata = {
      snippet: { title: mediaTitle(text, 'LionPost video', 100), description: text },
      status: { privacyStatus, selfDeclaredMadeForKids: input.madeForKids === true },
    }
    const session = await providerFetch('YouTube', 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': media.contentType,
        'X-Upload-Content-Length': String(media.buffer.length),
      },
      body: JSON.stringify(metadata),
    })
    const uploadUrl = session.headers.get('location')
    await session.arrayBuffer()
    if (!uploadUrl) throw new ApiError(400, 'YouTube did not return a resumable upload URL.')
    const video = await providerRequest<{ id?: string }>('YouTube upload', uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': media.contentType, 'Content-Length': String(media.buffer.length) },
      body: new Uint8Array(media.buffer),
    }, { timeoutMs: 240_000 })
    if (!video.id) throw new ApiError(400, 'YouTube did not return a video ID.')
    const result: PublishResult = { accountId, platform: 'YouTube', status: 'sent', externalId: video.id, url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`, publishedAt: new Date().toISOString(), warning: 'YouTube accepted the upload; processing can continue after the video URL becomes available.' }
    return { results: [result] }
  } catch (error) {
    const result: PublishResult = { accountId, platform: 'YouTube', status: 'failed', error: error instanceof Error ? error.message : 'YouTube publishing failed.' }
    return { results: [result] }
  } finally {
    if (input.cleanupMedia !== false) await bestEffortMediaCleanup(user.id, input.mediaPath)
  }
}

export function disconnectYouTube(request: ApiRequest) {
  return disconnectProvider(request, 'YouTube', 'youtube')
}
