import { randomUUID } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import { accountIds, bestEffortMediaCleanup, disconnectProvider, mediaTitle, ownedAccounts, providerRequest, readTemporaryMedia, record, validateMediaPath } from './provider-utils.js'
import type { PublishResult, SocialAccount } from '../../src/types.js'

const API = 'https://api.dailymotion.com/v2'
const SCOPES = 'account.read profile.read video.manage'

interface DailymotionCredential { clientId: string; clientSecret: string }
interface DailymotionToken { access_token?: string; expires_in?: number; scope?: string }
interface DailymotionProfile { profile_id?: string; id?: string; name?: string; username?: string }

function tokenRequest(credential: DailymotionCredential) {
  return providerRequest<DailymotionToken>('Dailymotion', 'https://oauth2.dailymotion.com/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: credential.clientId, client_secret: credential.clientSecret, scope: SCOPES }),
  })
}

async function accessToken(credential: DailymotionCredential) {
  const token = await tokenRequest(credential)
  if (!token.access_token) throw new ApiError(400, 'Dailymotion did not return an access token. Check the private API key, secret, and permissions.')
  return token.access_token
}

function readCredential(value: string): DailymotionCredential {
  try {
    const parsed = JSON.parse(decryptToken(value)) as Partial<DailymotionCredential>
    if (!parsed.clientId || !parsed.clientSecret) throw new Error('Incomplete credential')
    return { clientId: parsed.clientId, clientSecret: parsed.clientSecret }
  } catch {
    throw new ApiError(400, 'The Dailymotion credential could not be read. Reconnect this profile with its private API key and secret.')
  }
}

async function credentialFor(userId: string, accountId: string) {
  const { data, error } = await serviceClient().from('social_connections').select('encrypted_token').eq('user_id', userId).eq('account_id', accountId).maybeSingle()
  if (error) throw new ApiError(400, error.message)
  if (!data?.encrypted_token) throw new ApiError(400, 'The Dailymotion credential is missing. Reconnect this profile.')
  return readCredential(String(data.encrypted_token))
}

function dailymotionRequest<T>(path: string, token: string, options: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}) {
  return providerRequest<T>('Dailymotion', `${API}${path}`, {
    method: options.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }, { timeoutMs: options.timeoutMs })
}

function profilesFrom(value: Record<string, unknown>): DailymotionProfile[] {
  if (Array.isArray(value.profiles)) return value.profiles as DailymotionProfile[]
  const nested = record(value.profiles)
  if (Array.isArray(nested.data)) return nested.data as DailymotionProfile[]
  if (Array.isArray(nested.items)) return nested.items as DailymotionProfile[]
  if (Array.isArray(value.data)) return value.data as DailymotionProfile[]
  return []
}

export async function connectDailymotion(request: ApiRequest) {
  const { user } = await requireUser(request)
  const input = record(request.body)
  const credential = { clientId: String(input.clientId || '').trim(), clientSecret: String(input.clientSecret || '').trim() }
  if (!credential.clientId || !credential.clientSecret) throw new ApiError(400, 'Enter both the Dailymotion private API key and secret.')
  if (credential.clientId.length > 500 || credential.clientSecret.length > 1000) throw new ApiError(400, 'The Dailymotion API credentials are invalid.')
  const token = await accessToken(credential)
  const me = await dailymotionRequest<Record<string, unknown>>('/me?fields=profiles%2Cuser_id%2Cusername', token)
  const profiles = profilesFrom(me).map((profile) => ({ ...profile, profile_id: profile.profile_id || profile.id })).filter((profile): profile is DailymotionProfile & { profile_id: string } => Boolean(profile.profile_id)).slice(0, 100)
  if (!profiles.length) throw new ApiError(400, 'Dailymotion did not return a manageable profile. Check that this private key applies to the intended channel and has account/profile read access.')

  const client = serviceClient()
  const { data: existingRows, error: lookupError } = await client.from('social_accounts').select('id,external_id').eq('user_id', user.id).eq('platform', 'Dailymotion').eq('connection_type', 'dailymotion')
  if (lookupError) throw new ApiError(400, lookupError.message)
  const existingIds = new Map((existingRows || []).map((row) => [String(row.external_id), String(row.id)]))
  const encryptedToken = encryptToken(JSON.stringify(credential))
  const accountRows = profiles.map((profile) => {
    const name = profile.name || profile.username || 'Dailymotion profile'
    return { user_id: user.id, id: existingIds.get(profile.profile_id) || randomUUID(), platform: 'Dailymotion', name, handle: profile.username ? `@${profile.username.replace(/^@/, '')}` : name, status: 'working', connection_type: 'dailymotion', external_id: profile.profile_id, bot_username: null }
  })
  const { error: accountError } = await client.from('social_accounts').upsert(accountRows, { onConflict: 'user_id,id' })
  if (accountError) throw new ApiError(400, accountError.message)
  const { error: connectionError } = await client.from('social_connections').upsert(accountRows.map((account, index) => ({
    user_id: user.id,
    account_id: account.id,
    encrypted_token: encryptedToken,
    metadata: { provider: 'dailymotion_api_v2', profile_id: profiles[index].profile_id, scopes: SCOPES.split(' ') },
    updated_at: new Date().toISOString(),
  })), { onConflict: 'user_id,account_id' })
  if (connectionError) {
    const newIds = accountRows.filter((row) => !existingIds.has(String(row.external_id))).map((row) => row.id)
    if (newIds.length) await client.from('social_accounts').delete().eq('user_id', user.id).in('id', newIds)
    throw new ApiError(400, connectionError.message)
  }
  const accounts: SocialAccount[] = accountRows.map((row) => ({ id: row.id, platform: 'Dailymotion', name: row.name, handle: row.handle, status: 'working', connectionType: 'dailymotion', externalId: row.external_id }))
  return { accounts }
}

export async function publishDailymotion(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const ids = accountIds(input, 1)
  const text = String(input.text || '').trim()
  const visibility = String(input.dailymotionVisibility || 'private')
  const category = String(process.env.DAILYMOTION_CATEGORY || 'entertainment').toLowerCase()
  if (ids.length !== 1) throw new ApiError(400, 'Publish to one Dailymotion profile at a time.')
  if (String(input.mediaType || '') !== 'video') throw new ApiError(400, 'Dailymotion publishing requires a video.')
  if (!['private', 'public'].includes(visibility)) throw new ApiError(400, 'Choose private or public Dailymotion visibility.')
  if (!/^[a-z][a-z0-9_-]{1,40}$/.test(category)) throw new ApiError(503, 'DAILYMOTION_CATEGORY is not a valid category slug.')
  validateMediaPath(user.id, input.mediaPath, 'video')
  const [account] = await ownedAccounts(user.id, client, 'Dailymotion', 'dailymotion', ids)
  const accountId = String(account.id)

  try {
    const credential = await credentialFor(user.id, accountId)
    const token = await accessToken(credential)
    const profileId = String(account.external_id || '')
    if (!profileId) throw new ApiError(400, 'The Dailymotion profile ID is missing. Reconnect this profile.')
    const media = await readTemporaryMedia(user.id, input.mediaPath, 'video')
    const session = await dailymotionRequest<{ upload_url?: string }>('/files/upload_sessions', token, { method: 'POST' })
    if (!session.upload_url) throw new ApiError(400, 'Dailymotion did not return an upload URL.')
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(media.buffer)], { type: media.contentType }), `lionpost-${Date.now()}.${media.extension}`)
    const uploaded = await providerRequest<{ url?: string; file_url?: string }>('Dailymotion upload', session.upload_url, { method: 'POST', body: form }, { timeoutMs: 240_000 })
    const fileUrl = uploaded.url || uploaded.file_url
    if (!fileUrl) throw new ApiError(400, 'Dailymotion did not return the uploaded source URL.')
    const video = await dailymotionRequest<{ video_id?: string; id?: string; video_url?: string; url?: string }>(`/profiles/${encodeURIComponent(profileId)}/videos`, token, {
      method: 'POST',
      timeoutMs: 60_000,
      body: { title: mediaTitle(text, 'LionPost video', 255), description: text, category, visibility, is_for_kids: input.madeForKids === true, source: { file_url: fileUrl } },
    })
    const externalId = video.video_id || video.id
    if (!externalId) throw new ApiError(400, 'Dailymotion did not return a video ID.')
    const result: PublishResult = { accountId, platform: 'Dailymotion', status: 'sent', externalId, url: video.video_url || video.url || `https://www.dailymotion.com/video/${encodeURIComponent(externalId)}`, publishedAt: new Date().toISOString(), warning: 'Dailymotion accepted the video; encoding can continue after the video record is created.' }
    return { results: [result] }
  } catch (error) {
    const result: PublishResult = { accountId, platform: 'Dailymotion', status: 'failed', error: error instanceof Error ? error.message : 'Dailymotion publishing failed.' }
    return { results: [result] }
  } finally {
    if (input.cleanupMedia !== false) await bestEffortMediaCleanup(user.id, input.mediaPath)
  }
}

export function disconnectDailymotion(request: ApiRequest) {
  return disconnectProvider(request, 'Dailymotion', 'dailymotion')
}
