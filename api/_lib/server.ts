import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface ApiRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

let service: SupabaseClient | null = null

export function serviceClient() {
  if (service) return service
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new ApiError(503, 'The cloud server is not configured.')
  service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return service
}

export function bearerToken(request: ApiRequest) {
  const value = request.headers?.authorization
  const header = Array.isArray(value) ? value[0] : value
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new ApiError(401, 'Sign in again to continue.')
  return token
}

export async function requireUser(request: ApiRequest): Promise<{ user: User; client: SupabaseClient }> {
  const client = serviceClient()
  const { data, error } = await client.auth.getUser(bearerToken(request))
  if (error || !data.user) throw new ApiError(401, 'Your session has expired. Sign in again.')
  return { user: data.user, client }
}

export async function respond(request: ApiRequest, response: ApiResponse, operation: () => Promise<unknown>) {
  response.setHeader('Cache-Control', 'no-store')
  try {
    const result = await operation()
    return response.status(200).json(result)
  } catch (error) {
    if (error instanceof ApiError) return response.status(error.status).json({ error: error.message })
    console.error('LionPost API request failed', error instanceof Error ? error.message : 'Unknown error')
    return response.status(500).json({ error: 'The server could not complete the request. Please try again.' })
  }
}

function encryptionKey() {
  const value = process.env.TOKEN_ENCRYPTION_KEY
  if (!value) throw new ApiError(503, 'Credential encryption is not configured.')
  const key = Buffer.from(value, 'base64url')
  if (key.length !== 32) throw new ApiError(503, 'Credential encryption is not configured correctly.')
  return key
}

export function encryptToken(token: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptToken(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split('.')
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) throw new ApiError(500, 'A stored credential could not be read.')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8')
}
