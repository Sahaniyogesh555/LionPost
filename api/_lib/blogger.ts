import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import type { PublishResult } from '../../src/types.js'

interface GoogleToken {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

interface BloggerBlog { id: string; name: string; url: string }
interface BloggerPost { id: string; url: string; published?: string; updated?: string }

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

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new ApiError(503, 'Blogger OAuth is not configured on this server yet. Add the Google Web OAuth credentials first.')
  return { clientId, clientSecret, redirectUri: `${appUrl()}/api/blogger/callback` }
}

function stateSignature(payload: string) {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new ApiError(503, 'OAuth state protection is not configured.')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function createState(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, nonce: randomUUID(), expiresAt: Date.now() + 10 * 60 * 1000 })).toString('base64url')
  return `${payload}.${stateSignature(payload)}`
}

function readState(state: string) {
  const [payload, signature] = state.split('.')
  if (!payload || !signature) throw new ApiError(400, 'The Google sign-in state is invalid.')
  const expected = stateSignature(payload)
  const actualBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new ApiError(400, 'The Google sign-in state could not be verified.')
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId?: string; expiresAt?: number }
  if (!value.userId || !value.expiresAt || value.expiresAt < Date.now()) throw new ApiError(400, 'The Google sign-in expired. Start again from AlphaPost.')
  return value.userId
}

async function googleRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const body = await response.json().catch(() => null) as T & { error?: { message?: string } | string; error_description?: string } | null
    if (!response.ok) {
      const code = typeof body?.error === 'string' ? body.error : ''
      if (code === 'invalid_grant') throw new ApiError(401, 'Google access has expired or been revoked. Reconnect Blogger.')
      const message = typeof body?.error === 'object' ? body.error.message : body?.error_description || code
      throw new ApiError(400, `Google could not complete the Blogger request${message ? `: ${message}` : ` (HTTP ${response.status})`}.`)
    }
    if (!body) throw new ApiError(502, 'Google returned an empty Blogger response.')
    return body
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError(504, 'Google took too long to respond.')
    throw new ApiError(502, 'Google could not be reached. Please try again.')
  } finally {
    clearTimeout(timeout)
  }
}

function tokenRequest(parameters: Record<string, string>) {
  const config = googleConfig()
  return googleRequest<GoogleToken>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
  })
}

async function refreshedAccessToken(refreshToken: string) {
  const token = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken })
  if (!token.access_token) throw new ApiError(401, 'Google did not return an access token. Reconnect Blogger.')
  return token.access_token
}

export async function beginBlogger(request: ApiRequest) {
  const { user } = await requireUser(request)
  const config = googleConfig()
  const parameters = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email https://www.googleapis.com/auth/blogger',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: createState(user.id),
  })
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${parameters}`, redirectUri: config.redirectUri }
}

export async function completeBlogger(request: ApiRequest) {
  try {
    const oauthError = one(request.query.error)
    if (oauthError) throw new ApiError(400, oauthError === 'access_denied' ? 'Google permission was cancelled.' : 'Google could not connect Blogger.')
    const code = one(request.query.code)
    const state = one(request.query.state)
    if (!code || !state) throw new ApiError(400, 'Google returned an incomplete connection response.')
    const userId = readState(state)
    const config = googleConfig()
    const token = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri })
    if (!token.access_token) throw new ApiError(400, 'Google did not return an access token.')
    const blogs = await googleRequest<{ items?: BloggerBlog[] }>('https://www.googleapis.com/blogger/v3/users/self/blogs?maxResults=50', {
      headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' },
    })
    if (!blogs.items?.length) throw new ApiError(400, 'This Google account has no Blogger blogs available to manage.')

    const client = serviceClient()
    const { data: existingAccounts, error: existingError } = await client.from('social_accounts').select('id, external_id').eq('user_id', userId).eq('platform', 'Blogger').eq('connection_type', 'blogger')
    if (existingError) throw new ApiError(400, existingError.message)
    let refreshToken = token.refresh_token || ''
    if (!refreshToken && existingAccounts?.length) {
      const { data: previous } = await client.from('social_connections').select('encrypted_token').eq('user_id', userId).in('account_id', existingAccounts.map((item) => item.id)).limit(1).maybeSingle()
      if (previous?.encrypted_token) refreshToken = decryptToken(previous.encrypted_token)
    }
    if (!refreshToken) throw new ApiError(400, 'Google did not provide offline access. Remove AlphaPost from your Google permissions and connect again.')

    let email = ''
    try {
      const info = await googleRequest<{ email?: string }>('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })
      email = info.email || ''
    } catch {
      // Blog access is already verified; an unavailable profile email is optional.
    }

    for (const blog of blogs.items.slice(0, 50)) {
      const existing = existingAccounts?.find((item) => String(item.external_id) === String(blog.id))
      const accountId = String(existing?.id || randomUUID())
      const row = {
        user_id: userId,
        id: accountId,
        platform: 'Blogger',
        name: blog.name,
        handle: blog.url,
        status: 'working',
        connection_type: 'blogger',
        external_id: String(blog.id),
        bot_username: null,
      }
      const { error: accountError } = await client.from('social_accounts').upsert(row, { onConflict: 'user_id,id' })
      if (accountError) throw new ApiError(400, accountError.message)
      const { error: connectionError } = await client.from('social_connections').upsert({
        user_id: userId,
        account_id: accountId,
        encrypted_token: encryptToken(refreshToken),
        metadata: { provider: 'google', email, blogUrl: blog.url },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,account_id' })
      if (connectionError) {
        if (!existing) await client.from('social_accounts').delete().eq('user_id', userId).eq('id', accountId)
        throw new ApiError(400, connectionError.message)
      }
    }
    return `/app/blogger?connected=${blogs.items.length}`
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Blogger could not be connected. Please try again.'
    return `/app/blogger?error=${encodeURIComponent(message)}`
  }
}

export async function publishBlogger(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const accountId = String(input.accountId || '')
  const title = String(input.title || '').trim()
  const content = String(input.content || '').trim()
  const labels = Array.isArray(input.labels) ? input.labels.map((label) => String(label).trim()).filter(Boolean).slice(0, 10) : []
  if (!accountId) throw new ApiError(400, 'Choose a connected Blogger blog.')
  if (!title || title.length > 300) throw new ApiError(400, 'Enter an article title of up to 300 characters.')
  if (!content || content.length > 200_000) throw new ApiError(400, 'Write the article content first (up to 200,000 characters).')

  const { data: account, error: accountError } = await client.from('social_accounts').select('*').eq('user_id', user.id).eq('id', accountId).eq('platform', 'Blogger').eq('connection_type', 'blogger').maybeSingle()
  if (accountError) throw new ApiError(400, accountError.message)
  if (!account) throw new ApiError(404, 'That Blogger connection was not found. Reconnect the blog.')
  const { data: connection, error: connectionError } = await client.from('social_connections').select('encrypted_token').eq('user_id', user.id).eq('account_id', accountId).maybeSingle()
  if (connectionError) throw new ApiError(400, connectionError.message)
  if (!connection?.encrypted_token) throw new ApiError(400, 'The Google credential is missing. Reconnect Blogger.')
  const accessToken = await refreshedAccessToken(decryptToken(connection.encrypted_token))
  const post = await googleRequest<BloggerPost>(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(account.external_id)}/posts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title, content, labels }),
  })
  const result: PublishResult = { accountId, platform: 'Blogger', status: 'sent', externalId: post.id, url: post.url, publishedAt: post.published || post.updated || new Date().toISOString() }
  return { result }
}

export async function disconnectBlogger(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const accountId = String(record(request.body).accountId || '')
  if (!accountId) throw new ApiError(400, 'Choose a Blogger connection to remove.')
  const { error } = await client.from('social_accounts').delete().eq('user_id', user.id).eq('id', accountId).eq('platform', 'Blogger').eq('connection_type', 'blogger')
  if (error) throw new ApiError(400, error.message)
  return { disconnected: true }
}
