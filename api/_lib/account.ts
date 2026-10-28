import { createClient } from '@supabase/supabase-js'
import { ApiError, requireUser, type ApiRequest } from './server.js'

export async function deleteAccount(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = request.body && typeof request.body === 'object' ? request.body as Record<string, unknown> : {}
  const password = String(input.password || '')
  if (!password) throw new ApiError(400, 'Enter your current password to confirm deletion.')
  if (!user.email) throw new ApiError(400, 'This account does not have an email address.')
  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) throw new ApiError(503, 'The authentication server is not configured.')
  const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: verificationError } = await auth.auth.signInWithPassword({ email: user.email, password })
  if (verificationError) throw new ApiError(401, 'The current password is incorrect.')
  const { error } = await client.auth.admin.deleteUser(user.id)
  if (error) throw new ApiError(400, error.message)
  return { deleted: true }
}
