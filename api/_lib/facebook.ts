import { randomUUID } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import { accountIds, bestEffortMediaCleanup, createOAuthState, disconnectProvider, mediaTitle, one, ownedAccounts, providerRequest, readOAuthState, readTemporaryMedia, record, redirectUri, signedMediaUrl, validateMediaPath, type TemporaryMedia } from './provider-utils.js'
import type { PublishResult } from '../../src/types.js'

const DEFAULT_SCOPES = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,pages_read_user_engagement,publish_video'
const GRAPH_VERSION = 'v26.0'

interface MetaToken { access_token?: string; expires_in?: number }
interface FacebookPage { id?: string; name?: string; access_token?: string; tasks?: string[]; permitted_tasks?: string[] }
interface FacebookCredential { userAccessToken: string; pageAccessToken: string; expiresAt: number }

function graphVersion() {
  const configured = process.env.META_GRAPH_API_VERSION || GRAPH_VERSION
  return /^v\d+\.\d+$/.test(configured) ? configured : GRAPH_VERSION
}

function facebookConfig() {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  const configId = process.env.META_FACEBOOK_CONFIG_ID
  if (!clientId || !clientSecret || !configId) throw new ApiError(503, 'Facebook Page OAuth is not configured yet. Add META_APP_ID, META_APP_SECRET, and META_FACEBOOK_CONFIG_ID first.')
  return { clientId, clientSecret, configId, redirectUri: redirectUri('facebook') }
}

function graphUrl(path: string, parameters: Record<string, string> = {}, video = false) {
  const url = new URL(`https://${video ? 'graph-video' : 'graph'}.facebook.com/${graphVersion()}/${path.replace(/^\//, '')}`)
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value))
  return url.toString()
}

function graphRequest<T>(path: string, accessToken: string, options: { method?: 'GET' | 'POST'; parameters?: Record<string, string>; body?: BodyInit; contentType?: string; video?: boolean; timeoutMs?: number } = {}) {
  return providerRequest<T>('Facebook', graphUrl(path, options.parameters, options.video), {
    method: options.method || 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(options.contentType ? { 'Content-Type': options.contentType } : {}) },
    body: options.body,
  }, { timeoutMs: options.timeoutMs })
}

function tokenRequest(parameters: Record<string, string>) {
  return providerRequest<MetaToken>('Facebook', graphUrl('oauth/access_token', parameters))
}

function readCredential(value: string): FacebookCredential {
  try {
    const parsed = JSON.parse(decryptToken(value)) as Partial<FacebookCredential>
    if (!parsed.userAccessToken || !parsed.pageAccessToken) throw new Error('Incomplete credential')
    return { userAccessToken: parsed.userAccessToken, pageAccessToken: parsed.pageAccessToken, expiresAt: Number(parsed.expiresAt || 0) }
  } catch {
    throw new ApiError(400, 'The Facebook credential could not be read. Reconnect this Page.')
  }
}

async function credentialFor(userId: string, accountId: string) {
  const { data, error } = await serviceClient().from('social_connections').select('encrypted_token').eq('user_id', userId).eq('account_id', accountId).maybeSingle()
  if (error) throw new ApiError(400, error.message)
  if (!data?.encrypted_token) throw new ApiError(400, 'The Facebook credential is missing. Reconnect this Page.')
  const credential = readCredential(String(data.encrypted_token))
  if (credential.expiresAt && credential.expiresAt < Date.now() + 60_000) throw new ApiError(400, 'Facebook access has expired. Reconnect this Page to renew it.')
  return credential
}

export async function beginFacebook(request: ApiRequest) {
  const { user } = await requireUser(request)
  const config = facebookConfig()
  const parameters = new URLSearchParams({
    client_id: config.clientId,
    config_id: config.configId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    override_default_response_type: 'true',
    scope: process.env.FACEBOOK_SCOPES || DEFAULT_SCOPES,
    state: createOAuthState('facebook', user.id),
  })
  return { url: `https://www.facebook.com/dialog/oauth?${parameters}`, redirectUri: config.redirectUri }
}

async function discoverPages(accessToken: string) {
  const fields = 'id,name,access_token,tasks,permitted_tasks'
  let pages: FacebookPage[] = []
  let accountsError = ''
  try {
    const response = await graphRequest<{ data?: FacebookPage[] }>('me/accounts', accessToken, { parameters: { fields, limit: '100' } })
    pages = response.data || []
  } catch (error) {
    accountsError = error instanceof Error ? error.message : ''
  }
  if (!pages.length) {
    try {
      const assigned = await graphRequest<{ data?: FacebookPage[] }>('me/assigned_pages', accessToken, { parameters: { fields: 'id,name,tasks,permitted_tasks', limit: '100' } })
      const merged = new Map(pages.map((page) => [page.id, page]))
      ;(assigned.data || []).forEach((page) => merged.set(page.id, { ...merged.get(page.id), ...page }))
      pages = [...merged.values()]
    } catch (error) {
      if (accountsError) throw new ApiError(400, `Facebook could not list manageable Pages. ${accountsError}`)
      throw error
    }
  }
  return pages.filter((page): page is FacebookPage & { id: string; name: string } => Boolean(page.id && page.name)).slice(0, 100)
}

export async function completeFacebook(request: ApiRequest) {
  try {
    const oauthError = one(request.query.error)
    if (oauthError) throw new ApiError(400, oauthError === 'access_denied' ? 'Facebook permission was cancelled.' : 'Facebook could not connect the Page.')
    const code = one(request.query.code)
    const state = one(request.query.state)
    if (!code || !state) throw new ApiError(400, 'Facebook returned an incomplete connection response.')
    const { userId } = readOAuthState('facebook', state)
    const config = facebookConfig()
    const shortLived = await tokenRequest({ client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, code })
    if (!shortLived.access_token) throw new ApiError(400, 'Facebook did not return an access token.')
    const token = await tokenRequest({ grant_type: 'fb_exchange_token', client_id: config.clientId, client_secret: config.clientSecret, fb_exchange_token: shortLived.access_token })
    if (!token.access_token) throw new ApiError(400, 'Facebook did not return a long-lived access token.')

    const [business, pages] = await Promise.all([
      graphRequest<{ client_business_id?: string }>('me', token.access_token, { parameters: { fields: 'client_business_id' } }),
      discoverPages(token.access_token),
    ])
    if (!pages.length) throw new ApiError(400, 'Facebook did not share a manageable Page. Add the Page to the selected business portfolio and grant all requested Page permissions, then reconnect.')

    const pagesWithTokens: (FacebookPage & { id: string; name: string; access_token: string })[] = []
    for (const page of pages) {
      let pageToken = page.access_token
      if (!pageToken) {
        const result = await graphRequest<{ access_token?: string }>(page.id, token.access_token, { parameters: { fields: 'access_token' } })
        pageToken = result.access_token
      }
      if (pageToken) pagesWithTokens.push({ ...page, access_token: pageToken })
    }
    if (!pagesWithTokens.length) throw new ApiError(400, 'Facebook did not return Page access tokens. Reconnect and approve Page content access.')

    const client = serviceClient()
    const { data: existingRows, error: lookupError } = await client.from('social_accounts').select('id,external_id').eq('user_id', userId).eq('platform', 'Facebook').eq('connection_type', 'facebook')
    if (lookupError) throw new ApiError(400, lookupError.message)
    const existingIds = new Map((existingRows || []).map((row) => [String(row.external_id), String(row.id)]))
    const expiresAt = Date.now() + Math.max(3600, Number(token.expires_in) || 60 * 24 * 3600) * 1000
    const accountRows = pagesWithTokens.map((page) => ({
      user_id: userId,
      id: existingIds.get(page.id) || randomUUID(),
      platform: 'Facebook',
      name: page.name,
      handle: page.name,
      status: 'working',
      connection_type: 'facebook',
      external_id: page.id,
      bot_username: null,
    }))
    const { error: accountError } = await client.from('social_accounts').upsert(accountRows, { onConflict: 'user_id,id' })
    if (accountError) throw new ApiError(400, accountError.message)
    const { error: connectionError } = await client.from('social_connections').upsert(pagesWithTokens.map((page, index) => ({
      user_id: userId,
      account_id: accountRows[index].id,
      encrypted_token: encryptToken(JSON.stringify({ userAccessToken: token.access_token, pageAccessToken: page.access_token, expiresAt } satisfies FacebookCredential)),
      metadata: { provider: 'facebook_login_for_business', config_id: config.configId, client_business_id: business.client_business_id || null, page_id: page.id, tasks: page.tasks || [] },
      updated_at: new Date().toISOString(),
    })), { onConflict: 'user_id,account_id' })
    if (connectionError) {
      const newIds = accountRows.filter((row) => !existingIds.has(String(row.external_id))).map((row) => row.id)
      if (newIds.length) await client.from('social_accounts').delete().eq('user_id', userId).in('id', newIds)
      throw new ApiError(400, connectionError.message)
    }
    return `/app/accounts?facebook_connected=${accountRows.length}`
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Facebook could not be connected. Please try again.'
    return `/app/accounts?facebook_error=${encodeURIComponent(message)}`
  }
}

async function publishVideo(accountId: string, pageId: string, credential: FacebookCredential, text: string, media: TemporaryMedia) {
  const appId = process.env.META_APP_ID
  if (!appId) throw new ApiError(503, 'META_APP_ID is required for Facebook video uploads.')
  if (media.extension !== 'mp4') throw new ApiError(400, 'Facebook Page video publishing accepts MP4 through this integration. Convert the MOV file to MP4 and try again.')
  const session = await graphRequest<{ id?: string }>(`${appId}/uploads`, credential.userAccessToken, {
    method: 'POST',
    parameters: { file_name: `lionpost-${Date.now()}.mp4`, file_length: String(media.buffer.length), file_type: 'video/mp4' },
  })
  if (!session.id) throw new ApiError(400, 'Facebook did not return a video upload session.')
  const upload = await providerRequest<{ h?: string }>('Facebook', graphUrl(session.id), {
    method: 'POST',
    headers: { Authorization: `OAuth ${credential.userAccessToken}`, file_offset: '0', 'Content-Type': 'application/octet-stream', Accept: 'application/json' },
    body: new Uint8Array(media.buffer),
  }, { timeoutMs: 180_000 })
  if (!upload.h) throw new ApiError(400, 'Facebook did not return an uploaded video handle.')
  const form = new URLSearchParams({ title: mediaTitle(text, 'LionPost video'), description: text, fbuploader_video_file_chunk: upload.h })
  const published = await graphRequest<{ id?: string }>(`${pageId}/videos`, credential.pageAccessToken, { method: 'POST', body: form, contentType: 'application/x-www-form-urlencoded', video: true, timeoutMs: 60_000 })
  if (!published.id) throw new ApiError(400, 'Facebook did not return a video ID.')
  return { accountId, platform: 'Facebook' as const, status: 'sent' as const, externalId: published.id, url: `https://www.facebook.com/${published.id}`, publishedAt: new Date().toISOString() }
}

export async function publishFacebook(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const ids = accountIds(input, 5)
  const text = String(input.text || '').trim()
  const mediaType = String(input.mediaType || '')
  const hasMedia = Boolean(input.mediaPath)
  if (!ids.length) throw new ApiError(400, 'Choose at least one connected Facebook Page.')
  if (!text && !hasMedia) throw new ApiError(400, 'Write a post or add media first.')
  if (hasMedia && !['image', 'video'].includes(mediaType)) throw new ApiError(400, 'Facebook media must be a photo or video.')
  if (hasMedia) validateMediaPath(user.id, input.mediaPath, mediaType)
  const accounts = await ownedAccounts(user.id, client, 'Facebook', 'facebook', ids)

  let mediaUrl = ''
  let media: TemporaryMedia | undefined
  if (hasMedia && mediaType === 'image') mediaUrl = await signedMediaUrl(validateMediaPath(user.id, input.mediaPath, mediaType).path)
  if (hasMedia && mediaType === 'video') media = await readTemporaryMedia(user.id, input.mediaPath, 'video')

  try {
    const results: PublishResult[] = []
    for (const account of accounts) {
      const accountId = String(account.id)
      try {
        const pageId = String(account.external_id || '')
        if (!pageId) throw new ApiError(400, 'The Facebook Page ID is missing. Reconnect this Page.')
        const credential = await credentialFor(user.id, accountId)
        if (!hasMedia) {
          const post = await graphRequest<{ id?: string }>(`${pageId}/feed`, credential.pageAccessToken, { method: 'POST', body: JSON.stringify({ message: text, published: true }), contentType: 'application/json' })
          if (!post.id) throw new ApiError(400, 'Facebook did not return a post ID.')
          results.push({ accountId, platform: 'Facebook', status: 'sent', externalId: post.id, url: `https://www.facebook.com/${post.id}`, publishedAt: new Date().toISOString() })
        } else if (mediaType === 'image') {
          const photo = await graphRequest<{ id?: string; post_id?: string }>(`${pageId}/photos`, credential.pageAccessToken, { method: 'POST', body: JSON.stringify({ url: mediaUrl, caption: text, published: true }), contentType: 'application/json' })
          const externalId = photo.post_id || photo.id
          if (!externalId) throw new ApiError(400, 'Facebook did not return a photo post ID.')
          results.push({ accountId, platform: 'Facebook', status: 'sent', externalId, url: `https://www.facebook.com/${externalId}`, publishedAt: new Date().toISOString() })
        } else {
          if (!media) throw new ApiError(400, 'The Facebook video could not be read.')
          results.push(await publishVideo(accountId, pageId, credential, text, media))
        }
      } catch (error) {
        results.push({ accountId, platform: 'Facebook', status: 'failed', error: error instanceof Error ? error.message : 'Facebook publishing failed.' })
      }
    }
    return { results }
  } finally {
    if (hasMedia && input.cleanupMedia !== false) await bestEffortMediaCleanup(user.id, input.mediaPath)
  }
}

export function disconnectFacebook(request: ApiRequest) {
  return disconnectProvider(request, 'Facebook', 'facebook')
}
