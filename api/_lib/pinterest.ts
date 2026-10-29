import { randomUUID } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, serviceClient, type ApiRequest } from './server.js'
import { accountIds, bestEffortMediaCleanup, createOAuthState, disconnectProvider, firstLink, mediaTitle, one, ownedAccounts, providerRequest, readOAuthState, readTemporaryMedia, record, redirectUri, validateMediaPath } from './provider-utils.js'
import type { PublishResult } from '../../src/types.js'

const API = 'https://api.pinterest.com/v5'
const SCOPES = ['user_accounts:read', 'boards:read', 'boards:write', 'pins:read', 'pins:write']

interface PinterestToken { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; scope?: string }
interface PinterestCredential { accessToken: string; refreshToken: string; expiresAt: number }
interface PinterestBoard { id?: string; name?: string; privacy?: string }

function pinterestConfig() {
  const clientId = process.env.PINTEREST_CLIENT_ID
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new ApiError(503, 'Pinterest OAuth is not configured yet. Add PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET first.')
  return { clientId, clientSecret, redirectUri: redirectUri('pinterest') }
}

function tokenRequest(parameters: Record<string, string>) {
  const config = pinterestConfig()
  return providerRequest<PinterestToken>('Pinterest', `${API}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(parameters),
  })
}

function credential(token: PinterestToken, previousRefreshToken = ''): PinterestCredential {
  if (!token.access_token) throw new ApiError(400, 'Pinterest did not return an access token.')
  const refreshToken = token.refresh_token || previousRefreshToken
  if (!refreshToken) throw new ApiError(400, 'Pinterest did not return a refresh token. Reconnect and approve offline access.')
  return { accessToken: token.access_token, refreshToken, expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 2592000) * 1000 }
}

function readCredential(value: string): PinterestCredential {
  try {
    const parsed = JSON.parse(decryptToken(value)) as Partial<PinterestCredential>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) throw new Error('Incomplete credential')
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: Number(parsed.expiresAt) }
  } catch {
    throw new ApiError(400, 'The Pinterest credential could not be read. Reconnect this account.')
  }
}

async function accessTokenFor(userId: string, accountId: string) {
  const client = serviceClient()
  const { data, error } = await client.from('social_connections').select('encrypted_token').eq('user_id', userId).eq('account_id', accountId).maybeSingle()
  if (error) throw new ApiError(400, error.message)
  if (!data?.encrypted_token) throw new ApiError(400, 'The Pinterest credential is missing. Reconnect this account.')
  const stored = readCredential(String(data.encrypted_token))
  if (stored.expiresAt > Date.now() + 60_000) return stored.accessToken
  const token = await tokenRequest({ grant_type: 'refresh_token', refresh_token: stored.refreshToken })
  const next = credential(token, stored.refreshToken)
  const { error: updateError } = await client.from('social_connections').update({ encrypted_token: encryptToken(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq('user_id', userId).eq('account_id', accountId)
  if (updateError) throw new ApiError(400, updateError.message)
  return next.accessToken
}

function pinterestRequest<T>(path: string, accessToken: string, options: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}) {
  return providerRequest<T>('Pinterest', `${API}${path}`, {
    method: options.method || 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }, { timeoutMs: options.timeoutMs })
}

export async function beginPinterest(request: ApiRequest) {
  const { user } = await requireUser(request)
  const config = pinterestConfig()
  const parameters = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: SCOPES.join(','), state: createOAuthState('pinterest', user.id) })
  return { url: `https://www.pinterest.com/oauth/?${parameters}`, redirectUri: config.redirectUri }
}

export async function completePinterest(request: ApiRequest) {
  try {
    const oauthError = one(request.query.error)
    if (oauthError) throw new ApiError(400, oauthError === 'access_denied' ? 'Pinterest permission was cancelled.' : 'Pinterest could not connect the account.')
    const code = one(request.query.code)
    const state = one(request.query.state)
    if (!code || !state) throw new ApiError(400, 'Pinterest returned an incomplete connection response.')
    const { userId } = readOAuthState('pinterest', state)
    const config = pinterestConfig()
    const token = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri })
    const granted = new Set((token.scope || '').split(/[\s,]+/).filter(Boolean))
    const missing = SCOPES.filter((scope) => !granted.has(scope))
    if (missing.length) throw new ApiError(400, `Pinterest did not grant the required permissions: ${missing.join(', ')}. Reconnect and approve all requested permissions.`)
    if (!token.access_token) throw new ApiError(400, 'Pinterest did not return an access token.')
    const profile = await pinterestRequest<{ id?: string; username?: string; business_name?: string }>('/user_account', token.access_token)
    if (!profile.id || !profile.username) throw new ApiError(400, 'Pinterest returned an incomplete account profile.')

    const client = serviceClient()
    const { data: existing, error: lookupError } = await client.from('social_accounts').select('id').eq('user_id', userId).eq('platform', 'Pinterest').eq('connection_type', 'pinterest').eq('external_id', profile.id).maybeSingle()
    if (lookupError) throw new ApiError(400, lookupError.message)
    const accountId = String(existing?.id || randomUUID())
    const { error: accountError } = await client.from('social_accounts').upsert({ user_id: userId, id: accountId, platform: 'Pinterest', name: profile.business_name || profile.username, handle: `@${profile.username}`, status: 'working', connection_type: 'pinterest', external_id: profile.id, bot_username: null }, { onConflict: 'user_id,id' })
    if (accountError) throw new ApiError(400, accountError.message)
    const { error: connectionError } = await client.from('social_connections').upsert({
      user_id: userId,
      account_id: accountId,
      encrypted_token: encryptToken(JSON.stringify(credential(token))),
      metadata: { provider: 'pinterest_api_v5', pinterest_user_id: profile.id, username: profile.username, scopes: [...granted] },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,account_id' })
    if (connectionError) {
      if (!existing) await client.from('social_accounts').delete().eq('user_id', userId).eq('id', accountId)
      throw new ApiError(400, connectionError.message)
    }
    return '/app/accounts?pinterest_connected=1'
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'Pinterest could not be connected. Please try again.'
    return `/app/accounts?pinterest_error=${encodeURIComponent(message)}`
  }
}

async function listBoards(accessToken: string) {
  const boards: PinterestBoard[] = []
  let bookmark = ''
  for (let page = 0; page < 5; page += 1) {
    const query = new URLSearchParams({ page_size: '100', ...(bookmark ? { bookmark } : {}) })
    const response = await pinterestRequest<{ items?: PinterestBoard[]; bookmark?: string }>(`/boards?${query}`, accessToken)
    boards.push(...(response.items || []))
    bookmark = response.bookmark || ''
    if (!bookmark || boards.length >= 100) break
  }
  return boards.filter((board): board is PinterestBoard & { id: string; name: string } => Boolean(board.id && board.name)).slice(0, 100)
}

export async function pinterestOptions(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const accountId = String(record(request.body).accountId || '')
  if (!accountId) throw new ApiError(400, 'Choose a Pinterest account first.')
  await ownedAccounts(user.id, client, 'Pinterest', 'pinterest', [accountId])
  const accessToken = await accessTokenFor(user.id, accountId)
  const boards = await listBoards(accessToken)
  return { boards: boards.map((board) => ({ id: board.id, name: board.name, privacy: board.privacy || '' })) }
}

export async function publishPinterest(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const ids = accountIds(input, 1)
  const text = String(input.text || '').trim()
  const boardId = String(input.boardId || '')
  if (ids.length !== 1) throw new ApiError(400, 'Publish to one Pinterest account at a time.')
  if (String(input.mediaType || '') !== 'image') throw new ApiError(400, 'This Pinterest integration creates image Pins. Choose a photo; video Pins are not enabled.')
  if (!/^\d+$/.test(boardId)) throw new ApiError(400, 'Choose a current Pinterest board before publishing.')
  if (Array.from(text).length > 800) throw new ApiError(400, 'Pinterest Pin descriptions can contain at most 800 characters.')
  validateMediaPath(user.id, input.mediaPath, 'image')
  const [account] = await ownedAccounts(user.id, client, 'Pinterest', 'pinterest', ids)
  const accountId = String(account.id)

  try {
    const accessToken = await accessTokenFor(user.id, accountId)
    const boards = await listBoards(accessToken)
    if (!boards.some((board) => board.id === boardId)) throw new ApiError(400, 'That Pinterest board was not returned for this account. Refresh the board list and choose again.')
    const media = await readTemporaryMedia(user.id, input.mediaPath, 'image')
    const pin = await pinterestRequest<{ id?: string }>('/pins', accessToken, {
      method: 'POST',
      timeoutMs: 120_000,
      body: {
        board_id: boardId,
        title: mediaTitle(text, 'LionPost Pin', 100),
        description: text,
        ...(firstLink(text) ? { link: firstLink(text) } : {}),
        media_source: { source_type: 'image_base64', content_type: 'image/jpeg', data: media.buffer.toString('base64') },
      },
    })
    if (!pin.id) throw new ApiError(400, 'Pinterest did not return a Pin ID.')
    const result: PublishResult = { accountId, platform: 'Pinterest', status: 'sent', externalId: pin.id, url: `https://www.pinterest.com/pin/${encodeURIComponent(pin.id)}/`, publishedAt: new Date().toISOString() }
    return { results: [result] }
  } catch (error) {
    const result: PublishResult = { accountId, platform: 'Pinterest', status: 'failed', error: error instanceof Error ? error.message : 'Pinterest publishing failed.' }
    return { results: [result] }
  } finally {
    if (input.cleanupMedia !== false) await bestEffortMediaCleanup(user.id, input.mediaPath)
  }
}

export function disconnectPinterest(request: ApiRequest) {
  return disconnectProvider(request, 'Pinterest', 'pinterest')
}
