import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import type { PublishResult } from '../../src/types.js'

interface XToken {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

interface XUser { id: string; name?: string; username?: string }
interface XPost { data?: { id?: string } }
interface XCredential { accessToken: string; refreshToken: string; expiresAt: number }
interface XState { userId: string; verifier: string; nonce: string; expiresAt: number }

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

function xConfig() {
  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new ApiError(503, 'X OAuth is not configured on this server yet. Add the X OAuth 2.0 client credentials first.')
  return { clientId, clientSecret, redirectUri: `${appUrl()}/api/x/callback` }
}

function stateSignature(payload: string) {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new ApiError(503, 'OAuth state protection is not configured.')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function createState(userId: string, verifier: string) {
  const value: XState = { userId, verifier: encryptToken(verifier), nonce: randomUUID(), expiresAt: Date.now() + 10 * 60 * 1000 }
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${payload}.${stateSignature(payload)}`
}

function readState(state: string) {
  const [payload, signature] = state.split('.')
  if (!payload || !signature) throw new ApiError(400, 'The X sign-in state is invalid.')
  const actualBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(stateSignature(payload))
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new ApiError(400, 'The X sign-in state could not be verified.')
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<XState>
  if (!value.userId || !value.verifier || !value.expiresAt || value.expiresAt < Date.now()) throw new ApiError(400, 'The X sign-in expired. Start again from LionPost.')
  return { userId: value.userId, verifier: decryptToken(value.verifier) }
}

function errorMessage(body: unknown, status: number) {
  const value = record(body)
  const error = record(value.error)
  const detail = value.detail || value.error_description || error.message || (typeof value.error === 'string' ? value.error : '') || value.title
  return typeof detail === 'string' && detail ? detail : `HTTP ${status}`
}

async function xRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* X errors can also be plain text. */ }
    if (!response.ok) {
      const message = body ? errorMessage(body, response.status) : text.slice(0, 300) || `HTTP ${response.status}`
      if (response.status === 401 || (body && record(body).error === 'invalid_grant')) throw new ApiError(401, `X access has expired or been revoked. Reconnect X. ${message}`)
      throw new ApiError(400, `X could not complete the request: ${message}`)
    }
    if (!body) throw new ApiError(502, 'X returned an empty response.')
    return body as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError(504, 'X took too long to respond.')
    throw new ApiError(502, 'X could not be reached. Please try again.')
  } finally {
    clearTimeout(timeout)
  }
}

function tokenRequest(parameters: Record<string, string>) {
  const config = xConfig()
  return xRequest<XToken>('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(parameters).toString(),
  })
}

function credential(token: XToken, previousRefreshToken = ''): XCredential {
  if (!token.access_token) throw new ApiError(400, 'X did not return an access token.')
  const refreshToken = token.refresh_token || previousRefreshToken
  if (!refreshToken) throw new ApiError(400, 'X did not provide offline access. Reconnect X and grant the requested permissions.')
  return {
    accessToken: token.access_token,
    refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 7200) * 1000,
  }
}

function readCredential(value: string): XCredential {
  try {
    const parsed = JSON.parse(decryptToken(value)) as Partial<XCredential>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) throw new Error('Incomplete credential')
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: Number(parsed.expiresAt) }
  } catch {
    throw new ApiError(400, 'The X credential could not be read. Reconnect this account.')
  }
}

async function accessTokenFor(userId: string, accountId: string) {
  const client = serviceClient()
  const { data: connection, error } = await client.from('social_connections').select('encrypted_token').eq('user_id', userId).eq('account_id', accountId).maybeSingle()
  if (error) throw new ApiError(400, error.message)
  if (!connection?.encrypted_token) throw new ApiError(400, 'The X credential is missing. Reconnect this account.')
  const stored = readCredential(String(connection.encrypted_token))
  if (stored.expiresAt > Date.now() + 60_000) return stored.accessToken

  const token = await tokenRequest({ grant_type: 'refresh_token', refresh_token: stored.refreshToken })
  const next = credential(token, stored.refreshToken)
  const { error: updateError } = await client.from('social_connections').update({
    encrypted_token: encryptToken(JSON.stringify(next)),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('account_id', accountId)
  if (updateError) throw new ApiError(400, updateError.message)
  return next.accessToken
}

export async function beginX(request: ApiRequest) {
  const { user } = await requireUser(request)
  const config = xConfig()
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const parameters = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'tweet.read tweet.write users.read offline.access',
    state: createState(user.id, verifier),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  return { url: `https://x.com/i/oauth2/authorize?${parameters}`, redirectUri: config.redirectUri }
}

export async function completeX(request: ApiRequest) {
  try {
    const oauthError = one(request.query.error)
    if (oauthError) throw new ApiError(400, oauthError === 'access_denied' ? 'X permission was cancelled.' : 'X could not connect the account.')
    const code = one(request.query.code)
    const state = one(request.query.state)
    if (!code || !state) throw new ApiError(400, 'X returned an incomplete connection response.')
    const { userId, verifier } = readState(state)
    const config = xConfig()
    const token = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: verifier })
    const scopes = new Set((token.scope || '').split(/\s+/).filter(Boolean))
    if (!scopes.has('tweet.read') || !scopes.has('tweet.write') || !scopes.has('users.read')) throw new ApiError(400, 'X did not grant the required posting and profile permissions. Reconnect and approve all requested permissions.')
    if (!token.access_token) throw new ApiError(400, 'X did not return an access token.')
    const response = await xRequest<{ data?: XUser }>('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' } })
    if (!response.data?.id || !response.data.username) throw new ApiError(400, 'X returned an incomplete account profile.')

    const client = serviceClient()
    const externalId = String(response.data.id)
    const { data: existing, error: lookupError } = await client.from('social_accounts').select('id').eq('user_id', userId).eq('platform', 'X').eq('connection_type', 'x').eq('external_id', externalId).limit(1).maybeSingle()
    if (lookupError) throw new ApiError(400, lookupError.message)
    const accountId = String(existing?.id || randomUUID())
    const row = {
      user_id: userId,
      id: accountId,
      platform: 'X',
      name: response.data.name || response.data.username,
      handle: `@${response.data.username}`,
      status: 'working',
      connection_type: 'x',
      external_id: externalId,
      bot_username: null,
    }
    const { error: accountError } = await client.from('social_accounts').upsert(row, { onConflict: 'user_id,id' })
    if (accountError) throw new ApiError(400, accountError.message)
    const { error: connectionError } = await client.from('social_connections').upsert({
      user_id: userId,
      account_id: accountId,
      encrypted_token: encryptToken(JSON.stringify(credential(token))),
      metadata: { provider: 'x', username: response.data.username, scopes: [...scopes] },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,account_id' })
    if (connectionError) {
      if (!existing) await client.from('social_accounts').delete().eq('user_id', userId).eq('id', accountId)
      throw new ApiError(400, connectionError.message)
    }
    return `/app/accounts?x_connected=1`
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'X could not be connected. Please try again.'
    return `/app/accounts?x_error=${encodeURIComponent(message)}`
  }
}

export async function publishX(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const accountIds = Array.isArray(input.accountIds) ? [...new Set(input.accountIds.map(String))].slice(0, 10) : []
  const text = String(input.text || '').trim()
  if (!accountIds.length) throw new ApiError(400, 'Choose at least one connected X account.')
  if (!text) throw new ApiError(400, 'Write a post first. X text publishing does not accept an empty post.')
  if (Array.from(text).length > 280) throw new ApiError(400, 'X posts can contain at most 280 characters. Shorten this post for X.')
  if (input.image || input.video) throw new ApiError(400, 'X publishing currently supports text posts only. Remove the media or save a draft.')

  const { data: accounts, error: accountError } = await client.from('social_accounts').select('*').eq('user_id', user.id).eq('platform', 'X').eq('connection_type', 'x').in('id', accountIds)
  if (accountError) throw new ApiError(400, accountError.message)
  if ((accounts || []).length !== accountIds.length) throw new ApiError(400, 'One or more X connections were not found. Reconnect them and try again.')

  const results: PublishResult[] = []
  for (const account of accounts || []) {
    const accountId = String(account.id)
    try {
      const accessToken = await accessTokenFor(user.id, accountId)
      const post = await xRequest<XPost>('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!post.data?.id) throw new ApiError(400, 'X did not return a post ID.')
      const username = String(account.handle || '').replace(/^@/, '')
      results.push({ accountId, platform: 'X', status: 'sent', externalId: post.data.id, url: `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(post.data.id)}`, publishedAt: new Date().toISOString() })
    } catch (error) {
      results.push({ accountId, platform: 'X', status: 'failed', error: error instanceof Error ? error.message : 'X publishing failed.' })
    }
  }
  return { results }
}

export async function disconnectX(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const accountId = String(record(request.body).accountId || '')
  if (!accountId) throw new ApiError(400, 'Choose an X connection to remove.')
  const { error } = await client.from('social_accounts').delete().eq('user_id', user.id).eq('id', accountId).eq('platform', 'X').eq('connection_type', 'x')
  if (error) throw new ApiError(400, error.message)
  return { disconnected: true }
}
