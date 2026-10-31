import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import { accountIds, appUrl, bestEffortMediaCleanup, createOAuthState, disconnectProvider, mediaTitle, one, ownedAccounts, providerFetch, providerRequest, readOAuthState, readTemporaryMedia, record, redirectUri, sleep, validateMediaPath } from './provider-utils.js'
import type { PublishResult } from '../../src/types.js'

const API = 'https://open.tiktokapis.com'
const MAX_CHUNK_BYTES = 64 * 1024 * 1024
const LARGE_FILE_CHUNK_BYTES = 10 * 1024 * 1024
const MAX_INBOX_VIDEO_SECONDS = 10 * 60

interface TikTokToken {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  refresh_expires_in?: number
  scope?: string
  open_id?: string
}
interface TikTokCredential { accessToken: string; refreshToken: string; expiresAt: number }
interface TikTokEnvelope<T> { data?: T; error?: { code?: string; message?: string } }
interface TikTokCreatorInfo {
  creator_avatar_url?: string
  creator_username?: string
  creator_nickname?: string
  privacy_level_options?: string[]
  comment_disabled?: boolean
  duet_disabled?: boolean
  stitch_disabled?: boolean
  max_video_post_duration_sec?: number
}
interface MediaGrant { userId: string; path: string; expiresAt: number }

function tiktokConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (!clientKey || !clientSecret) throw new ApiError(503, 'TikTok OAuth is not configured yet. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET first.')
  return { clientKey, clientSecret, redirectUri: redirectUri('tiktok') }
}

async function tiktokRequest<T>(url: string, init: RequestInit = {}, timeoutMs?: number) {
  const body = await providerRequest<TikTokEnvelope<T>>('TikTok', url, init, { timeoutMs })
  if (body.error?.code && body.error.code !== 'ok') {
    if (body.error.code === 'unaudited_client_can_only_post_to_private_accounts') throw new ApiError(400, 'TikTok requires the creator account itself to be private for unaudited Direct Post. In the TikTok app, enable Profile → Menu → Settings and privacy → Privacy → Private account, then retry with Only me. Reconnecting is not necessary.')
    if (body.error.code === 'spam_risk_too_many_pending_share') throw new ApiError(400, 'TikTok already has too many unfinished inbox drafts. Open TikTok and complete the pending drafts before uploading another one.')
    if (['spam_risk_too_many_posts', 'reached_active_user_cap'].includes(body.error.code)) throw new ApiError(400, 'TikTok says this creator cannot make more posts right now. Try again later.')
    if (body.error.code === 'spam_risk_user_banned_from_posting') throw new ApiError(400, 'TikTok says this creator is currently banned from making new posts.')
    throw new ApiError(400, `TikTok could not complete the request [${body.error.code}]: ${body.error.message || 'No provider detail was returned.'}`)
  }
  if (!body.data) throw new ApiError(400, 'TikTok returned incomplete data.')
  return body.data
}

function tokenRequest(parameters: Record<string, string>) {
  const config = tiktokConfig()
  return providerRequest<TikTokToken>('TikTok', `${API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_key: config.clientKey, client_secret: config.clientSecret, ...parameters }),
  })
}

function credential(token: TikTokToken, previousRefreshToken = ''): TikTokCredential {
  if (!token.access_token) throw new ApiError(400, 'TikTok did not return an access token.')
  const refreshToken = token.refresh_token || previousRefreshToken
  if (!refreshToken) throw new ApiError(400, 'TikTok did not return a refresh token. Reconnect and approve offline access.')
  return { accessToken: token.access_token, refreshToken, expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 86400) * 1000 }
}

function readCredential(value: string): TikTokCredential {
  try {
    const parsed = JSON.parse(decryptToken(value)) as Partial<TikTokCredential>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) throw new Error('Incomplete credential')
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: Number(parsed.expiresAt) }
  } catch {
    throw new ApiError(400, 'The TikTok credential could not be read. Reconnect this account.')
  }
}

async function accessTokenFor(userId: string, accountId: string) {
  const client = serviceClient()
  const { data, error } = await client.from('social_connections').select('encrypted_token').eq('user_id', userId).eq('account_id', accountId).maybeSingle()
  if (error) throw new ApiError(400, error.message)
  if (!data?.encrypted_token) throw new ApiError(400, 'The TikTok credential is missing. Reconnect this account.')
  const stored = readCredential(String(data.encrypted_token))
  if (stored.expiresAt > Date.now() + 60_000) return stored.accessToken
  const token = await tokenRequest({ grant_type: 'refresh_token', refresh_token: stored.refreshToken })
  const next = credential(token, stored.refreshToken)
  const { error: updateError } = await client.from('social_connections').update({ encrypted_token: encryptToken(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq('user_id', userId).eq('account_id', accountId)
  if (updateError) throw new ApiError(400, updateError.message)
  return next.accessToken
}

function bearerRequest<T>(path: string, accessToken: string, body?: unknown, method?: 'GET' | 'POST', timeoutMs?: number) {
  return tiktokRequest<T>(`${API}${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json; charset=UTF-8' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, timeoutMs)
}

export async function beginTikTok(request: ApiRequest) {
  const { user } = await requireUser(request)
  const config = tiktokConfig()
  const parameters = new URLSearchParams({
    client_key: config.clientKey,
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: config.redirectUri,
    state: createOAuthState('tiktok', user.id),
  })
  return { url: `https://www.tiktok.com/v2/auth/authorize/?${parameters}`, redirectUri: config.redirectUri }
}

export async function completeTikTok(request: ApiRequest) {
  try {
    const oauthError = one(request.query.error)
    if (oauthError) throw new ApiError(400, oauthError === 'access_denied' ? 'TikTok permission was cancelled.' : 'TikTok could not connect the account.')
    const code = one(request.query.code)
    const state = one(request.query.state)
    if (!code || !state) throw new ApiError(400, 'TikTok returned an incomplete connection response.')
    const { userId } = readOAuthState('tiktok', state)
    const config = tiktokConfig()
    const token = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri })
    const scopes = new Set((token.scope || '').split(/[\s,]+/).filter(Boolean))
    if (!scopes.has('user.info.basic') || !scopes.has('video.publish') || !scopes.has('video.upload')) throw new ApiError(400, 'TikTok did not grant profile, Direct Post, and inbox-draft permissions. Reconnect and approve all requested permissions.')
    const profile = await bearerRequest<{ open_id?: string; display_name?: string; avatar_url?: string }>('/v2/user/info/?fields=open_id,display_name,avatar_url', String(token.access_token || ''))
    const externalId = String(profile.open_id || token.open_id || '')
    const displayName = String(profile.display_name || 'TikTok creator')
    if (!externalId) throw new ApiError(400, 'TikTok returned an incomplete account profile.')

    const client = serviceClient()
    const { data: existing, error: lookupError } = await client.from('social_accounts').select('id').eq('user_id', userId).eq('platform', 'TikTok').eq('connection_type', 'tiktok').eq('external_id', externalId).maybeSingle()
    if (lookupError) throw new ApiError(400, lookupError.message)
    const accountId = String(existing?.id || randomUUID())
    const handle = `@${displayName.replace(/^@/, '').replace(/\s+/g, '_')}`
    const { error: accountError } = await client.from('social_accounts').upsert({ user_id: userId, id: accountId, platform: 'TikTok', name: displayName, handle, status: 'working', connection_type: 'tiktok', external_id: externalId, bot_username: null }, { onConflict: 'user_id,id' })
    if (accountError) throw new ApiError(400, accountError.message)
    const { error: connectionError } = await client.from('social_connections').upsert({
      user_id: userId,
      account_id: accountId,
      encrypted_token: encryptToken(JSON.stringify(credential(token))),
      metadata: { provider: 'tiktok_login_kit', open_id: externalId, scopes: [...scopes] },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,account_id' })
    if (connectionError) {
      if (!existing) await client.from('social_accounts').delete().eq('user_id', userId).eq('id', accountId)
      throw new ApiError(400, connectionError.message)
    }
    return '/app/accounts?tiktok_connected=1'
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'TikTok could not be connected. Please try again.'
    return `/app/accounts?tiktok_error=${encodeURIComponent(message)}`
  }
}

async function creatorInfo(userId: string, accountId: string) {
  const accessToken = await accessTokenFor(userId, accountId)
  const info = await bearerRequest<TikTokCreatorInfo>('/v2/post/publish/creator_info/query/', accessToken, {})
  return { accessToken, info }
}

function publicPostingEnabled() {
  return process.env.TIKTOK_PUBLIC_POSTING === 'true'
}

export async function tiktokOptions(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const accountId = String(record(request.body).accountId || '')
  if (!accountId) throw new ApiError(400, 'Choose a TikTok account first.')
  await ownedAccounts(user.id, client, 'TikTok', 'tiktok', [accountId])
  const { info } = await creatorInfo(user.id, accountId)
  const available = Array.isArray(info.privacy_level_options) ? info.privacy_level_options : []
  const privacyLevelOptions = publicPostingEnabled() ? available : available.filter((option) => option === 'SELF_ONLY')
  return {
    creatorNickname: String(info.creator_nickname || ''),
    creatorUsername: String(info.creator_username || ''),
    privacyLevelOptions,
    publicPosting: publicPostingEnabled(),
    commentDisabled: Boolean(info.comment_disabled),
    duetDisabled: Boolean(info.duet_disabled),
    stitchDisabled: Boolean(info.stitch_disabled),
    maxVideoPostDurationSec: Number(info.max_video_post_duration_sec || 0) || undefined,
  }
}

function mediaSignature(payload: string) {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new ApiError(503, 'Temporary media signing is not configured.')
  return createHmac('sha256', secret).update(`tiktok-media:${payload}`).digest('base64url')
}

export function createTikTokMediaUrl(userId: string, path: string) {
  const value: MediaGrant = { userId, path, expiresAt: Date.now() + 2 * 60 * 60 * 1000 }
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = `${payload}.${mediaSignature(payload)}`
  return `${appUrl()}/api/tiktok/media?token=${encodeURIComponent(token)}`
}

export function readTikTokMediaGrant(token: string) {
  try {
    const [payload, supplied] = token.split('.')
    if (!payload || !supplied) throw new Error('Incomplete media grant')
    const actual = Buffer.from(supplied)
    const expected = Buffer.from(mediaSignature(payload))
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid signature')
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<MediaGrant>
    if (!value.userId || !value.path || !value.expiresAt || value.expiresAt < Date.now()) throw new Error('Expired media grant')
    validateMediaPath(value.userId, value.path, 'image')
    return { userId: value.userId, path: value.path }
  } catch {
    throw new ApiError(400, 'This temporary TikTok media URL is invalid or expired.')
  }
}

function findDirectAtom(buffer: Buffer, type: string, start = 0, end = buffer.length) {
  let offset = start
  while (offset + 8 <= end) {
    const declaredSize = buffer.readUInt32BE(offset)
    let headerSize = 8
    let atomSize = declaredSize
    if (declaredSize === 1) {
      if (offset + 16 > end) return null
      atomSize = Number(buffer.readBigUInt64BE(offset + 8))
      headerSize = 16
    } else if (declaredSize === 0) {
      atomSize = end - offset
    }
    if (!Number.isSafeInteger(atomSize) || atomSize < headerSize || offset + atomSize > end) return null
    if (buffer.toString('ascii', offset + 4, offset + 8) === type) return { start: offset + headerSize, end: offset + atomSize }
    offset += atomSize
  }
  return null
}

// ISO-BMFF (MP4/MOV) stores the authoritative movie duration in moov/mvhd.
// Reading it here prevents a client from bypassing the creator-specific limit.
export function readMp4DurationSeconds(buffer: Buffer) {
  const moov = findDirectAtom(buffer, 'moov')
  if (!moov) return 0
  const mvhd = findDirectAtom(buffer, 'mvhd', moov.start, moov.end)
  if (!mvhd || mvhd.start + 20 > mvhd.end) return 0
  const version = buffer.readUInt8(mvhd.start)
  let timescale = 0
  let duration = 0
  if (version === 0) {
    timescale = buffer.readUInt32BE(mvhd.start + 12)
    duration = buffer.readUInt32BE(mvhd.start + 16)
  } else if (version === 1 && mvhd.start + 32 <= mvhd.end) {
    timescale = buffer.readUInt32BE(mvhd.start + 20)
    duration = Number(buffer.readBigUInt64BE(mvhd.start + 24))
  }
  const seconds = timescale > 0 ? duration / timescale : 0
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0
}

export function tiktokVideoUploadLayout(videoSize: number) {
  if (!Number.isSafeInteger(videoSize) || videoSize <= 0) throw new ApiError(400, 'The TikTok video is empty or has an invalid size.')
  if (videoSize <= MAX_CHUNK_BYTES) return { chunkSize: videoSize, totalChunkCount: 1 }
  // TikTok's chunk count is floor(video_size / chunk_size). The final chunk
  // contains the remaining bytes and may therefore be larger than chunk_size.
  return { chunkSize: LARGE_FILE_CHUNK_BYTES, totalChunkCount: Math.floor(videoSize / LARGE_FILE_CHUNK_BYTES) }
}

async function uploadVideo(uploadUrl: string, buffer: Buffer, contentType: string, layout: { chunkSize: number; totalChunkCount: number }) {
  for (let index = 0; index < layout.totalChunkCount; index += 1) {
    const offset = index * layout.chunkSize
    const end = index === layout.totalChunkCount - 1 ? buffer.length : offset + layout.chunkSize
    const chunk = buffer.subarray(offset, end)
    const response = await providerFetch('TikTok upload', uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'Content-Length': String(chunk.length), 'Content-Range': `bytes ${offset}-${end - 1}/${buffer.length}` },
      body: new Uint8Array(chunk),
    }, 180_000)
    await response.arrayBuffer()
  }
}

async function waitForPublish(publishId: string, accessToken: string, handle: string, mediaType: 'image' | 'video'): Promise<{ externalId: string; url?: string; warning?: string }> {
  const deadline = Date.now() + 180 * 1000
  while (Date.now() < deadline) {
    const status = await bearerRequest<{ status?: string; fail_reason?: string; publicaly_available_post_id?: (string | number)[] }>('/v2/post/publish/status/fetch/', accessToken, { publish_id: publishId })
    if (status.status === 'PUBLISH_COMPLETE') {
      const publicId = status.publicaly_available_post_id?.[0]
      return {
        externalId: publishId,
        url: publicId ? `https://www.tiktok.com/@${handle.replace(/^@/, '')}/${mediaType === 'image' ? 'photo' : 'video'}/${publicId}` : undefined,
        warning: publicId ? undefined : 'TikTok completed the post. Private or unmoderated posts do not return a public post URL.',
      }
    }
    if (status.status === 'FAILED') throw new ApiError(400, `TikTok publishing failed${status.fail_reason ? `: ${status.fail_reason}` : '.'}`)
    if (!['PROCESSING_UPLOAD', 'PROCESSING_DOWNLOAD'].includes(String(status.status))) throw new ApiError(400, `TikTok returned an unexpected publishing status: ${status.status || 'unknown'}`)
    await sleep(3000)
  }
  throw new ApiError(400, 'TikTok is still processing this post. Check TikTok before retrying so you do not create a duplicate.')
}

export async function publishTikTok(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const ids = accountIds(input, 1)
  const text = String(input.text || '').trim()
  const mediaType = String(input.mediaType || '')
  const postMode = String(input.tiktokPostMode || 'DIRECT_POST')
  const privacyLevel = String(input.privacyLevel || '')
  const allowComment = input.tiktokAllowComment === true
  const allowDuet = input.tiktokAllowDuet === true
  const allowStitch = input.tiktokAllowStitch === true
  const commercial = input.tiktokCommercial === true
  const yourBrand = commercial && input.tiktokYourBrand === true
  const brandedContent = commercial && input.tiktokBrandedContent === true
  if (ids.length !== 1) throw new ApiError(400, 'Publish to one TikTok account at a time.')
  if (!['image', 'video'].includes(mediaType)) throw new ApiError(400, 'TikTok publishing requires a photo or video.')
  if (!['DIRECT_POST', 'MEDIA_UPLOAD'].includes(postMode)) throw new ApiError(400, 'Choose Direct Post or TikTok inbox draft.')
  if (postMode === 'DIRECT_POST') {
    if (!privacyLevel) throw new ApiError(400, 'Choose a TikTok privacy level from the current creator options.')
    if (mediaType === 'image' && (allowDuet || allowStitch)) throw new ApiError(400, 'TikTok photo posts support Allow Comment only; Duet and Stitch are unavailable.')
    if (!commercial && (input.tiktokYourBrand === true || input.tiktokBrandedContent === true)) throw new ApiError(400, 'Turn on TikTok commercial content disclosure before choosing a disclosure type.')
    if (commercial && !yourBrand && !brandedContent) throw new ApiError(400, 'You need to indicate if your content promotes yourself, a third party, or both.')
    if (brandedContent && privacyLevel === 'SELF_ONLY') throw new ApiError(400, 'Branded content visibility cannot be set to private.')
  }
  if (Array.from(text).length > 4000) throw new ApiError(400, 'TikTok descriptions can contain at most 4,000 characters.')
  const { path } = validateMediaPath(user.id, input.mediaPath, mediaType)
  const [account] = await ownedAccounts(user.id, client, 'TikTok', 'tiktok', ids)
  const accountId = String(account.id)

  try {
    if (postMode === 'MEDIA_UPLOAD') {
      const accessToken = await accessTokenFor(user.id, accountId)
      let publishId = ''
      if (mediaType === 'video') {
        const media = await readTemporaryMedia(user.id, path, 'video')
        const durationSeconds = readMp4DurationSeconds(media.buffer)
        if (!durationSeconds) throw new ApiError(400, 'TikTok video duration could not be verified. Re-encode the video as a standard MP4 or MOV file and try again.')
        if (durationSeconds > MAX_INBOX_VIDEO_SECONDS + 0.001) throw new ApiError(400, `TikTok inbox drafts accept videos up to ${MAX_INBOX_VIDEO_SECONDS} seconds. This video is ${durationSeconds.toFixed(1)} seconds long.`)
        const layout = tiktokVideoUploadLayout(media.buffer.length)
        const initialized = await bearerRequest<{ publish_id?: string; upload_url?: string }>('/v2/post/publish/inbox/video/init/', accessToken, {
          source_info: { source: 'FILE_UPLOAD', video_size: media.buffer.length, chunk_size: layout.chunkSize, total_chunk_count: layout.totalChunkCount },
        })
        if (!initialized.publish_id || !initialized.upload_url) throw new ApiError(400, 'TikTok did not return an inbox-draft upload session.')
        publishId = initialized.publish_id
        await uploadVideo(initialized.upload_url, media.buffer, media.contentType, layout)
      } else {
        const initialized = await bearerRequest<{ publish_id?: string }>('/v2/post/publish/content/init/', accessToken, {
          post_info: { title: mediaTitle(text, 'Photo', 90), description: text },
          source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [createTikTokMediaUrl(user.id, path)] },
          post_mode: 'MEDIA_UPLOAD',
          media_type: 'PHOTO',
        })
        if (!initialized.publish_id) throw new ApiError(400, 'TikTok did not return a photo draft ID. Verify the LionPost media URL/domain in TikTok URL properties and try again.')
        publishId = initialized.publish_id
      }
      // For inbox uploads, PUBLISH_COMPLETE means the creator later finished
      // posting inside TikTok. Do not misreport the initial upload as published.
      const result: PublishResult = {
        accountId,
        platform: 'TikTok',
        status: 'sent',
        delivery: 'provider_draft',
        externalId: publishId,
        warning: 'TikTok received the draft upload. Open its inbox notification when it arrives to review, edit, and publish; this step did not post to the profile.',
      }
      return { results: [result] }
    }

    const { accessToken, info } = await creatorInfo(user.id, accountId)
    const available = Array.isArray(info.privacy_level_options) ? info.privacy_level_options : []
    if (!available.includes(privacyLevel)) throw new ApiError(400, 'That TikTok privacy level is not currently available for this creator. Refresh the options and choose again.')
    if (!publicPostingEnabled() && privacyLevel !== 'SELF_ONLY') throw new ApiError(400, 'This LionPost server is restricted to private TikTok posts until the provider audit is completed and TIKTOK_PUBLIC_POSTING is enabled.')
    if (allowComment && info.comment_disabled) throw new ApiError(400, 'Allow Comment is disabled in this creator’s TikTok settings.')
    if (allowDuet && info.duet_disabled) throw new ApiError(400, 'Allow Duet is disabled in this creator’s TikTok settings.')
    if (allowStitch && info.stitch_disabled) throw new ApiError(400, 'Allow Stitch is disabled in this creator’s TikTok settings.')
    const disclosure = { brand_content_toggle: brandedContent, brand_organic_toggle: yourBrand }

    let publishId = ''
    if (mediaType === 'video') {
      const media = await readTemporaryMedia(user.id, path, 'video')
      const durationSeconds = readMp4DurationSeconds(media.buffer)
      if (!durationSeconds) throw new ApiError(400, 'TikTok video duration could not be verified. Re-encode the video as a standard MP4 or MOV file and try again.')
      const maximumDuration = Number(info.max_video_post_duration_sec || 0)
      if (!maximumDuration) throw new ApiError(400, 'TikTok did not return this creator’s maximum video duration. Refresh the creator options before publishing.')
      if (durationSeconds > maximumDuration + 0.001) throw new ApiError(400, `This video is ${durationSeconds.toFixed(1)} seconds long, but this TikTok creator allows at most ${maximumDuration} seconds. Shorten the video before publishing.`)
      const layout = tiktokVideoUploadLayout(media.buffer.length)
      const initialized = await bearerRequest<{ publish_id?: string; upload_url?: string }>('/v2/post/publish/video/init/', accessToken, {
        post_info: { title: text, privacy_level: privacyLevel, disable_duet: !allowDuet, disable_comment: !allowComment, disable_stitch: !allowStitch, video_cover_timestamp_ms: 1000, ...disclosure },
        source_info: { source: 'FILE_UPLOAD', video_size: media.buffer.length, chunk_size: layout.chunkSize, total_chunk_count: layout.totalChunkCount },
      })
      if (!initialized.publish_id || !initialized.upload_url) throw new ApiError(400, 'TikTok did not return a video upload session.')
      publishId = initialized.publish_id
      await uploadVideo(initialized.upload_url, media.buffer, media.contentType, layout)
    } else {
      // TikTok photos support PULL_FROM_URL only. The signed LionPost URL is
      // fetched by TikTok after initialization; no unverified Supabase URL is
      // sent to the provider.
      const initialized = await bearerRequest<{ publish_id?: string }>('/v2/post/publish/content/init/', accessToken, {
        post_info: { title: mediaTitle(text, 'Photo', 90), description: text, privacy_level: privacyLevel, disable_comment: !allowComment, ...disclosure },
        source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [createTikTokMediaUrl(user.id, path)] },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO',
      })
      if (!initialized.publish_id) throw new ApiError(400, 'TikTok did not return a photo publishing ID. Verify the LionPost media URL/domain in TikTok URL properties and try again.')
      publishId = initialized.publish_id
    }
    const published = await waitForPublish(publishId, accessToken, String(info.creator_username || account.handle || ''), mediaType as 'image' | 'video')
    const result: PublishResult = { accountId, platform: 'TikTok', status: 'sent', delivery: 'published', ...published, publishedAt: new Date().toISOString() }
    return { results: [result] }
  } catch (error) {
    const result: PublishResult = { accountId, platform: 'TikTok', status: 'failed', error: error instanceof Error ? error.message : 'TikTok publishing failed.' }
    return { results: [result] }
  } finally {
    if (input.cleanupMedia !== false) await bestEffortMediaCleanup(user.id, input.mediaPath)
  }
}

export function disconnectTikTok(request: ApiRequest) {
  return disconnectProvider(request, 'TikTok', 'tiktok')
}
