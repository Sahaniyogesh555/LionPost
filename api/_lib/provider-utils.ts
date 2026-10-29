import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { ApiError, requireUser, serviceClient, type ApiRequest } from './server.js'

export const MEDIA_BUCKET = 'post-media'
export const MAX_MEDIA_BYTES = 100 * 1024 * 1024

export type OAuthProvider = 'facebook' | 'tiktok' | 'youtube' | 'pinterest'

interface OAuthState {
  provider: OAuthProvider
  userId: string
  nonce: string
  expiresAt: number
}

export interface TemporaryMedia {
  buffer: Buffer
  contentType: string
  extension: 'jpg' | 'mp4' | 'mov'
}

export function record(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function appUrl() {
  const configured = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')
  return configured.replace(/\/$/, '')
}

export function redirectUri(provider: OAuthProvider) {
  return `${appUrl()}/api/${provider}/callback`
}

function signature(payload: string) {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new ApiError(503, 'OAuth state protection is not configured.')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createOAuthState(provider: OAuthProvider, userId: string) {
  const value: OAuthState = { provider, userId, nonce: randomUUID(), expiresAt: Date.now() + 10 * 60 * 1000 }
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${payload}.${signature(payload)}`
}

export function readOAuthState(provider: OAuthProvider, state: string) {
  try {
    const [payload, supplied] = state.split('.')
    if (!payload || !supplied) throw new Error('Incomplete state')
    const actual = Buffer.from(supplied)
    const expected = Buffer.from(signature(payload))
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid signature')
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<OAuthState>
    if (value.provider !== provider || !value.userId || !value.nonce || !value.expiresAt || value.expiresAt < Date.now()) throw new Error('Expired state')
    return { userId: value.userId }
  } catch {
    throw new ApiError(400, `The ${provider} sign-in state is invalid or expired. Start again from LionPost.`)
  }
}

function providerError(body: unknown, status: number) {
  const value = record(body)
  const error = record(value.error)
  const nested = Array.isArray(error.errors) ? record(error.errors[0]) : {}
  const detail = error.message || error.error_user_msg || value.error_description || value.detail || value.message || nested.message || nested.reason || (typeof value.error === 'string' ? value.error : '') || value.title
  return typeof detail === 'string' && detail ? detail.slice(0, 500) : `HTTP ${status}`
}

export async function providerFetch(provider: string, url: string, init: RequestInit = {}, timeoutMs = 30_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      const text = await response.text()
      let body: unknown = null
      try { body = text ? JSON.parse(text) : null } catch { /* Some providers return plain-text errors. */ }
      const message = body ? providerError(body, response.status) : text.slice(0, 500) || `HTTP ${response.status}`
      if (response.status === 401) throw new ApiError(400, `${provider} access has expired or been revoked. Reconnect the account. ${message}`)
      throw new ApiError(400, `${provider} could not complete the request: ${message}`)
    }
    return response
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError(504, `${provider} took too long to respond.`)
    throw new ApiError(502, `${provider} could not be reached. Please try again.`)
  } finally {
    clearTimeout(timeout)
  }
}

export async function providerRequest<T>(provider: string, url: string, init: RequestInit = {}, options: { timeoutMs?: number; allowEmpty?: boolean } = {}): Promise<T> {
  const response = await providerFetch(provider, url, init, options.timeoutMs)
  const text = await response.text()
  if (!text) {
    if (options.allowEmpty) return null as T
    throw new ApiError(502, `${provider} returned an empty response.`)
  }
  try { return JSON.parse(text) as T } catch { throw new ApiError(502, `${provider} returned an unreadable response.`) }
}

export function accountIds(input: Record<string, unknown>, maximum = 10) {
  return Array.isArray(input.accountIds) ? [...new Set(input.accountIds.map(String).filter(Boolean))].slice(0, maximum) : []
}

export function validateMediaPath(userId: string, value: unknown, mediaType?: string) {
  const path = String(value || '')
  const match = path.match(new RegExp(`^${userId}/([a-f0-9-]{36})\\.(jpg|mp4|mov)$`, 'i'))
  if (!match) throw new ApiError(400, 'The media upload is invalid. Choose the file and try again.')
  const extension = match[2].toLowerCase() as TemporaryMedia['extension']
  if ((mediaType === 'image' && extension !== 'jpg') || (mediaType === 'video' && !['mp4', 'mov'].includes(extension))) throw new ApiError(400, 'The media type does not match the uploaded file.')
  return { path, extension }
}

export async function signedMediaUrl(path: string, seconds = 2 * 60 * 60) {
  const { data, error } = await serviceClient().storage.from(MEDIA_BUCKET).createSignedUrl(path, seconds)
  if (error || !data?.signedUrl) throw new ApiError(400, `The media could not be prepared. ${error?.message || 'Upload it again.'}`)
  return data.signedUrl
}

export async function readTemporaryMedia(userId: string, value: unknown, mediaType: 'image' | 'video'): Promise<TemporaryMedia> {
  const { path, extension } = validateMediaPath(userId, value, mediaType)
  const url = await signedMediaUrl(path, 5 * 60)
  const response = await providerFetch('Media storage', url, {}, 120_000)
  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > MAX_MEDIA_BYTES) throw new ApiError(400, 'The media file is larger than 100 MB.')
  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length) throw new ApiError(400, 'The media file is empty. Upload it again.')
  if (buffer.length > MAX_MEDIA_BYTES) throw new ApiError(400, 'The media file is larger than 100 MB.')
  return { buffer, contentType: extension === 'jpg' ? 'image/jpeg' : extension === 'mov' ? 'video/quicktime' : 'video/mp4', extension }
}

export async function removeTemporaryMedia(userId: string, value: unknown) {
  const { path } = validateMediaPath(userId, value)
  const { error } = await serviceClient().storage.from(MEDIA_BUCKET).remove([path])
  if (error) throw new ApiError(400, `The temporary media could not be removed. ${error.message}`)
  return { removed: true }
}

export async function bestEffortMediaCleanup(userId: string, value: unknown) {
  try { await removeTemporaryMedia(userId, value) } catch { /* Cleanup must not change an already-published result. */ }
}

export function mediaTitle(text: string, fallback: string, maximum = 100) {
  const firstLine = text.split('\n').map((line) => line.trim()).find(Boolean) || fallback
  return Array.from(firstLine).slice(0, maximum).join('')
}

export function firstLink(text: string) {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)?.[0]
  if (!match) return undefined
  try {
    const url = new URL(match)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined
  } catch { return undefined }
}

export function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export async function ownedAccounts(userId: string, client: ReturnType<typeof serviceClient>, platform: string, connectionType: string, ids: string[]) {
  const { data, error } = await client.from('social_accounts').select('*').eq('user_id', userId).eq('platform', platform).eq('connection_type', connectionType).in('id', ids)
  if (error) throw new ApiError(400, error.message)
  if ((data || []).length !== ids.length) throw new ApiError(400, `One or more ${platform} connections were not found. Reconnect them and try again.`)
  return data || []
}

export async function disconnectProvider(request: ApiRequest, platform: string, connectionType: string) {
  const { user, client } = await requireUser(request)
  const accountId = String(record(request.body).accountId || '')
  if (!accountId) throw new ApiError(400, `Choose a ${platform} connection to remove.`)
  const { error } = await client.from('social_accounts').delete().eq('user_id', user.id).eq('id', accountId).eq('platform', platform).eq('connection_type', connectionType)
  if (error) throw new ApiError(400, error.message)
  return { disconnected: true }
}
