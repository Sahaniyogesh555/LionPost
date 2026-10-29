import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import type { PublishResult } from '../../src/types.js'

const GRAPH_API_VERSION = 'v26.0'
const MEDIA_BUCKET = 'post-media'
const MEDIA_URL_SECONDS = 2 * 60 * 60

interface InstagramToken { access_token?: string }
interface InstagramAccount { id?: string; username?: string }
interface InstagramState { userId: string; nonce: string; expiresAt: number }
interface GraphId { id?: string; config_issue?: string }
interface ContainerStatus { id?: string; status_code?: string; status?: string }

function record(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function appUrl() {
  const configured = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')
  return configured.replace(/\/$/, '')
}

function instagramConfig() {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  const configId = process.env.META_INSTAGRAM_CONFIG_ID
  if (!clientId || !clientSecret || !configId) throw new ApiError(503, 'Instagram OAuth is not configured on this server yet. Add the Meta app credentials and Instagram configuration ID first.')
  return { clientId, clientSecret, configId, redirectUri: `${appUrl()}/api/instagram/callback` }
}

function graphVersion() {
  const configured = process.env.META_GRAPH_API_VERSION || GRAPH_API_VERSION
  return /^v\d+\.\d+$/.test(configured) ? configured : GRAPH_API_VERSION
}

function stateSignature(payload: string) {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new ApiError(503, 'OAuth state protection is not configured.')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function createState(userId: string) {
  const value: InstagramState = { userId, nonce: randomUUID(), expiresAt: Date.now() + 10 * 60 * 1000 }
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${payload}.${stateSignature(payload)}`
}

function readState(state: string) {
  try {
    const [payload, signature] = state.split('.')
    if (!payload || !signature) throw new ApiError(400, 'The Instagram sign-in state is invalid.')
    const actualBytes = Buffer.from(signature)
    const expectedBytes = Buffer.from(stateSignature(payload))
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new ApiError(400, 'The Instagram sign-in state could not be verified.')
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<InstagramState>
    if (!value.userId || !value.nonce || !value.expiresAt || value.expiresAt < Date.now()) throw new ApiError(400, 'The Instagram sign-in expired. Start again from LionPost.')
    return { userId: value.userId }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'The Instagram sign-in state is invalid. Start again from LionPost.')
  }
}

function providerError(body: unknown, status: number) {
  const value = record(body)
  const error = record(value.error)
  const detail = error.message || error.error_user_msg || value.error_description || value.message
  return typeof detail === 'string' && detail ? detail.slice(0, 500) : `HTTP ${status}`
}

async function metaRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* Meta errors can also be plain text. */ }
    if (!response.ok) {
      const message = body ? providerError(body, response.status) : text.slice(0, 300) || `HTTP ${response.status}`
      const error = record(record(body).error)
      if (response.status === 401 || Number(error.code) === 190) throw new ApiError(400, `Instagram access has expired or been revoked. Reconnect Instagram. ${message}`)
      throw new ApiError(400, `Instagram could not complete the request: ${message}`)
    }
    if (!body) throw new ApiError(502, 'Instagram returned an empty response.')
    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError(504, 'Instagram took too long to respond.')
    throw new ApiError(502, 'Instagram could not be reached. Please try again.')
  } finally {
    clearTimeout(timeout)
  }
}

function graphUrl(path: string, parameters: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path.replace(/^\//, '')}`)
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value))
  return url.toString()
}

function graphRequest<T>(path: string, accessToken: string, options: { method?: 'GET' | 'POST'; parameters?: Record<string, string>; body?: Record<string, string> } = {}) {
  return metaRequest<T>(graphUrl(path, options.parameters), {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

async function accessTokenFor(userId: string, accountId: string) {
  const client = serviceClient()
  const { data: connection, error } = await client.from('social_connections').select('encrypted_token').eq('user_id', userId).eq('account_id', accountId).maybeSingle()
  if (error) throw new ApiError(400, error.message)
  if (!connection?.encrypted_token) throw new ApiError(400, 'The Instagram credential is missing. Reconnect this account.')
  try {
    const token = decryptToken(String(connection.encrypted_token))
    if (!token) throw new Error('Empty token')
    return token
  } catch {
    throw new ApiError(400, 'The Instagram credential could not be read. Reconnect this account.')
  }
}

export async function beginInstagram(request: ApiRequest) {
  const { user } = await requireUser(request)
  const config = instagramConfig()
  const parameters = new URLSearchParams({
    client_id: config.clientId,
    config_id: config.configId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    override_default_response_type: 'true',
    display: 'popup',
    prompt: 'login',
    state: createState(user.id),
  })
  return { url: `https://www.facebook.com/dialog/oauth?${parameters}`, redirectUri: config.redirectUri }
}

export async function completeInstagram(request: ApiRequest) {
  try {
    const oauthError = one(request.query.error)
    if (oauthError) throw new ApiError(400, oauthError === 'access_denied' ? 'Instagram permission was cancelled.' : 'Instagram could not connect the account.')
    const code = one(request.query.code)
    const state = one(request.query.state)
    if (!code || !state) throw new ApiError(400, 'Instagram returned an incomplete connection response.')
    const { userId } = readState(state)
    const config = instagramConfig()
    const parameters = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code })
    const token = await metaRequest<InstagramToken>(`https://graph.facebook.com/${graphVersion()}/oauth/access_token?${parameters}`)
    if (!token.access_token) throw new ApiError(400, 'Instagram did not return an access token.')

    const [business, assigned] = await Promise.all([
      graphRequest<{ client_business_id?: string }>('me', token.access_token, { parameters: { fields: 'client_business_id' } }),
      graphRequest<{ data?: InstagramAccount[] }>('me/assigned_instagram_accounts', token.access_token, { parameters: { fields: 'id,username', limit: '100' } }),
    ])
    if (!business.client_business_id) throw new ApiError(400, 'Meta did not return the business portfolio for this connection.')
    const instagramAccounts = (assigned.data || []).filter((account): account is { id: string; username: string } => Boolean(account.id && account.username)).slice(0, 100)
    if (!instagramAccounts.length) throw new ApiError(400, 'Meta did not share an Instagram professional account. Reconnect and select an Instagram Business or Creator account.')

    const client = serviceClient()
    const { data: existingRows, error: lookupError } = await client.from('social_accounts').select('id,external_id').eq('user_id', userId).eq('platform', 'Instagram').eq('connection_type', 'instagram')
    if (lookupError) throw new ApiError(400, lookupError.message)
    const existingIds = new Map((existingRows || []).map((row) => [String(row.external_id), String(row.id)]))
    const accountRows = instagramAccounts.map((account) => ({
      user_id: userId,
      id: existingIds.get(account.id) || randomUUID(),
      platform: 'Instagram',
      name: account.username,
      handle: `@${account.username}`,
      status: 'working',
      connection_type: 'instagram',
      external_id: account.id,
      bot_username: null,
    }))
    const { error: accountError } = await client.from('social_accounts').upsert(accountRows, { onConflict: 'user_id,id' })
    if (accountError) throw new ApiError(400, accountError.message)
    const encryptedToken = encryptToken(token.access_token)
    const { error: connectionError } = await client.from('social_connections').upsert(accountRows.map((account) => ({
      user_id: userId,
      account_id: account.id,
      encrypted_token: encryptedToken,
      metadata: {
        provider: 'instagram_unified_login',
        config_id: config.configId,
        client_business_id: business.client_business_id,
        instagram_account_id: account.external_id,
        username: account.handle.slice(1),
      },
      updated_at: new Date().toISOString(),
    })), { onConflict: 'user_id,account_id' })
    if (connectionError) {
      const newIds = accountRows.filter((account) => !existingIds.has(String(account.external_id))).map((account) => account.id)
      if (newIds.length) await client.from('social_accounts').delete().eq('user_id', userId).in('id', newIds)
      throw new ApiError(400, connectionError.message)
    }
    return `/app/accounts?instagram_connected=${accountRows.length}`
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Instagram could not be connected. Please try again.'
    return `/app/accounts?instagram_error=${encodeURIComponent(message)}`
  }
}

function validateMediaPath(userId: string, value: unknown, mediaType: string) {
  const path = String(value || '')
  const match = path.match(new RegExp(`^${userId}/([a-f0-9-]{36})\\.(jpg|mp4|mov)$`, 'i'))
  if (!match) throw new ApiError(400, 'The Instagram media upload is invalid. Choose the file and try again.')
  const extension = match[2].toLowerCase()
  if ((mediaType === 'image' && extension !== 'jpg') || (mediaType === 'video' && !['mp4', 'mov'].includes(extension))) throw new ApiError(400, 'The Instagram media type does not match the uploaded file.')
  return path
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForContainer(containerId: string, accessToken: string) {
  const deadline = Date.now() + 4 * 60 * 1000
  while (Date.now() < deadline) {
    const result = await graphRequest<ContainerStatus>(containerId, accessToken, { parameters: { fields: 'status_code,status' } })
    if (result.status_code === 'FINISHED') return
    if (result.status_code === 'ERROR' || result.status_code === 'EXPIRED' || result.status_code === 'PUBLISHED') throw new ApiError(400, `Instagram could not prepare the media (${result.status_code}${result.status ? `: ${result.status}` : ''}).`)
    if (result.status_code !== 'IN_PROGRESS') throw new ApiError(400, 'Instagram returned an unknown media processing status.')
    await sleep(3000)
  }
  throw new ApiError(400, 'Instagram is still processing this media. Nothing was published; try a smaller video or try again later.')
}

async function publishToAccount(userId: string, account: Record<string, unknown>, caption: string, mediaType: 'image' | 'video', mediaUrl: string): Promise<PublishResult> {
  const accountId = String(account.id)
  try {
    const externalId = String(account.external_id || '')
    if (!externalId) throw new ApiError(400, 'The Instagram account ID is missing. Reconnect this account.')
    const accessToken = await accessTokenFor(userId, accountId)
    const body: Record<string, string> = mediaType === 'image'
      ? { image_url: mediaUrl, caption }
      : { media_type: 'REELS', video_url: mediaUrl, caption }
    const container = await graphRequest<GraphId>(`${externalId}/media`, accessToken, { method: 'POST', body })
    if (!container.id) throw new ApiError(400, 'Instagram did not return a media container ID.')
    await waitForContainer(container.id, accessToken)
    const published = await graphRequest<GraphId>(`${externalId}/media_publish`, accessToken, { method: 'POST', body: { creation_id: container.id } })
    if (!published.id) throw new ApiError(400, 'Instagram did not return a published media ID.')

    let url: string | undefined
    try {
      const media = await graphRequest<{ permalink?: string }>(published.id, accessToken, { parameters: { fields: 'permalink' } })
      url = media.permalink
    } catch { /* The post is already published; a missing permalink must not turn success into failure. */ }
    return {
      accountId,
      platform: 'Instagram',
      status: 'sent',
      externalId: published.id,
      url,
      publishedAt: new Date().toISOString(),
      warning: published.config_issue === 'CAPTION_NOT_ATTACHED' ? 'Published, but Instagram did not attach the caption.' : undefined,
    }
  } catch (error) {
    return { accountId, platform: 'Instagram', status: 'failed', error: error instanceof Error ? error.message : 'Instagram publishing failed.' }
  }
}

export async function publishInstagram(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const accountIds = Array.isArray(input.accountIds) ? [...new Set(input.accountIds.map(String))].slice(0, 3) : []
  const caption = String(input.text || '').trim()
  const mediaType = String(input.mediaType || '')
  if (!accountIds.length) throw new ApiError(400, 'Choose at least one connected Instagram account.')
  if (mediaType !== 'image' && mediaType !== 'video') throw new ApiError(400, 'Instagram publishing requires a photo or video.')
  if (Array.from(caption).length > 2200) throw new ApiError(400, 'Instagram captions can contain at most 2,200 characters.')
  const mediaPath = validateMediaPath(user.id, input.mediaPath, mediaType)

  const { data: accounts, error: accountError } = await client.from('social_accounts').select('*').eq('user_id', user.id).eq('platform', 'Instagram').eq('connection_type', 'instagram').in('id', accountIds)
  if (accountError) throw new ApiError(400, accountError.message)
  if ((accounts || []).length !== accountIds.length) throw new ApiError(400, 'One or more Instagram connections were not found. Reconnect them and try again.')

  const server = serviceClient()
  const { data: signed, error: signedError } = await server.storage.from(MEDIA_BUCKET).createSignedUrl(mediaPath, MEDIA_URL_SECONDS)
  if (signedError || !signed?.signedUrl) throw new ApiError(400, `The media could not be prepared for Instagram. ${signedError?.message || 'Upload it again.'}`)

  try {
    const results = await Promise.all((accounts || []).map((account) => publishToAccount(user.id, account, caption, mediaType, signed.signedUrl)))
    return { results }
  } finally {
    // Meta has fetched or rejected the media by this point. Do not leave
    // temporary publishing uploads in storage after the attempt finishes.
    // Cleanup must never turn an already-published result into a failed request.
    try { await server.storage.from(MEDIA_BUCKET).remove([mediaPath]) } catch { /* Best-effort temporary media cleanup. */ }
  }
}

export async function disconnectInstagram(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const accountId = String(record(request.body).accountId || '')
  if (!accountId) throw new ApiError(400, 'Choose an Instagram connection to remove.')
  const { error } = await client.from('social_accounts').delete().eq('user_id', user.id).eq('id', accountId).eq('platform', 'Instagram').eq('connection_type', 'instagram')
  if (error) throw new ApiError(400, error.message)
  return { disconnected: true }
}
