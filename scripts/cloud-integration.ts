import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { connectTelegram, disconnectTelegram, publishTelegram } from '../api/_lib/telegram.ts'
import { deleteAccount } from '../api/_lib/account.ts'
import { decryptToken } from '../api/_lib/server.ts'
import { beginBlogger, completeBlogger, disconnectBlogger, publishBlogger } from '../api/_lib/blogger.ts'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !serviceKey || !publishableKey || !process.env.TOKEN_ENCRYPTION_KEY) throw new Error('Integration environment is incomplete.')
process.env.GOOGLE_CLIENT_ID ||= 'integration-google-client'
process.env.GOOGLE_CLIENT_SECRET ||= 'integration-google-secret'
process.env.APP_URL ||= 'http://localhost:5173'

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const userIds: string[] = []
const originalFetch = globalThis.fetch

async function makeUser(label: string) {
  const email = `lionpost-${label}-${Date.now()}-${crypto.randomUUID()}@example.com`
  const password = `Integration-${crypto.randomUUID()}-Pass!`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: label } })
  if (error) throw error
  userIds.push(data.user.id)
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: login, error: loginError } = await client.auth.signInWithPassword({ email, password })
  if (loginError) throw loginError
  return { id: data.user.id, email, password, client, token: login.session.access_token }
}

try {
  const a = await makeUser('integration-a')
  const b = await makeUser('integration-b')
  const authRequest = (token: string, body: unknown) => ({ query: {}, headers: { authorization: `Bearer ${token}` }, body })

  const { error: ownWriteError } = await a.client.from('posts').insert({ user_id: a.id, id: 'integration-private', text: 'Private integration draft', platforms: ['Telegram'], status: 'draft' })
  assert.equal(ownWriteError, null)
  const { data: visibleToB, error: readError } = await b.client.from('posts').select('id')
  assert.equal(readError, null)
  assert.equal(visibleToB.length, 0, 'RLS must hide user A posts from user B')
  const crossWrite = await b.client.from('posts').insert({ user_id: a.id, id: 'integration-forbidden', text: 'Forbidden', platforms: ['Telegram'], status: 'draft' })
  assert.ok(crossWrite.error, 'RLS must reject a cross-user write')
  const credentialRead = await a.client.from('social_connections').select('encrypted_token')
  assert.ok(credentialRead.error, 'Browser roles must not read encrypted credentials')
  console.log('✓ Real Supabase Auth, owner reads/writes, cross-user RLS, and credential revocation')

  const telegramCalls: string[] = []
  globalThis.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
    const body = init?.body
    if (requestUrl === 'https://oauth2.googleapis.com/token') {
      const parameters = new URLSearchParams(String(body))
      if (parameters.get('grant_type') === 'authorization_code') {
        assert.equal(parameters.get('code'), 'integration-code')
        return json({ access_token: 'google-access-token', refresh_token: 'integration-refresh-token', expires_in: 3600 })
      }
      assert.equal(parameters.get('grant_type'), 'refresh_token')
      assert.equal(parameters.get('refresh_token'), 'integration-refresh-token')
      return json({ access_token: 'refreshed-access-token', expires_in: 3600 })
    }
    if (requestUrl === 'https://openidconnect.googleapis.com/v1/userinfo') return json({ email: 'blogger-integration@example.com' })
    if (requestUrl.startsWith('https://www.googleapis.com/blogger/v3/users/self/blogs')) {
      assert.match(String(init?.headers && new Headers(init.headers).get('authorization')), /google-access-token/)
      return json({ items: [{ id: 'integration-blog', name: 'Integration Blog', url: 'https://integration-blog.example.com' }] })
    }
    if (requestUrl === 'https://www.googleapis.com/blogger/v3/blogs/integration-blog/posts') {
      assert.match(String(init?.headers && new Headers(init.headers).get('authorization')), /refreshed-access-token/)
      const article = JSON.parse(String(body))
      assert.equal(article.title, 'Integration article')
      assert.match(article.content, /<p>Real Blogger body<\/p>/)
      return json({ id: 'integration-post', url: 'https://integration-blog.example.com/integration-post', published: new Date().toISOString() })
    }
    if (!requestUrl.startsWith('https://api.telegram.org/')) return originalFetch(input, init)
    const method = requestUrl.split('/').pop() || ''
    telegramCalls.push(method)
    const payload = body && typeof body === 'string' ? JSON.parse(body) : body instanceof FormData ? Object.fromEntries(body.entries()) : {}
    if (method === 'getMe') return json({ ok: true, result: { id: 999001, first_name: 'Integration Bot', username: 'lionpost_integration_bot' } })
    if (method === 'getChat') {
      const second = payload.chat_id === '@second'
      return json({ ok: true, result: { id: second ? -1001002 : -1001001, title: second ? 'Integration Two' : 'Integration One', username: second ? 'second' : 'first', type: 'channel' } })
    }
    if (method === 'getChatMember') return json({ ok: true, result: { status: 'administrator', can_post_messages: true } })
    if (method === 'sendMessage') {
      if (String(payload.chat_id) === '-1001002') return json({ ok: false, description: 'Forbidden integration test' }, 403)
      return json({ ok: true, result: { message_id: 101 } })
    }
    if (method === 'sendPhoto') {
      assert.ok(body instanceof FormData)
      assert.ok(payload.photo instanceof Blob)
      return json({ ok: true, result: { message_id: 102 } })
    }
    return json({ ok: false, description: `Unexpected method ${method}` }, 400)
  }

  const fakeToken = `123456789:${'A'.repeat(35)}`
  const first = await connectTelegram(authRequest(a.token, { botToken: fakeToken, chatId: '@first', displayName: '' }))
  const second = await connectTelegram(authRequest(a.token, { botToken: fakeToken, chatId: '@second', displayName: '' }))
  assert.equal(first.account.connectionType, 'telegram')
  assert.equal(second.account.externalId, '-1001002')

  const { data: storedConnections, error: storedError } = await admin.from('social_connections').select('encrypted_token').eq('user_id', a.id)
  assert.equal(storedError, null)
  assert.equal(storedConnections.length, 2)
  assert.ok(storedConnections.every((row) => !row.encrypted_token.includes(fakeToken)))
  assert.equal(decryptToken(storedConnections[0].encrypted_token), fakeToken)
  console.log('✓ Telegram bot/chat validation, safe account mapping, AES-GCM storage, and token decryption')

  const published = await publishTelegram(authRequest(a.token, { accountIds: [first.account.id, second.account.id], text: 'Integration publish' }))
  const sent = published.results.find((result) => result.accountId === first.account.id)
  const failed = published.results.find((result) => result.accountId === second.account.id)
  assert.equal(sent?.status, 'sent')
  assert.equal(sent?.messageId, 101)
  assert.equal(failed?.status, 'failed')
  assert.match(failed?.error || '', /Forbidden integration test/)

  const photo = await publishTelegram(authRequest(a.token, { accountIds: [first.account.id], text: 'Photo integration', image: 'data:image/png;base64,iVBORw0KGgo=' }))
  assert.equal(photo.results[0].status, 'sent')
  assert.equal(photo.results[0].messageId, 102)
  assert.ok(telegramCalls.includes('sendPhoto'))
  console.log('✓ Real per-account publish results, partial failure, and multipart photo publishing')

  const oauth = await beginBlogger(authRequest(a.token, {}))
  const oauthUrl = new URL(oauth.url)
  const expectedBloggerCallback = `${process.env.APP_URL}/api/blogger/callback`
  assert.equal(oauth.redirectUri, expectedBloggerCallback)
  assert.equal(oauthUrl.searchParams.get('redirect_uri'), expectedBloggerCallback)
  assert.equal(oauthUrl.hostname, 'accounts.google.com')
  assert.equal(oauthUrl.searchParams.get('access_type'), 'offline')
  const state = oauthUrl.searchParams.get('state') || ''
  const callbackPath = await completeBlogger({ query: { code: 'integration-code', state }, headers: {} })
  assert.match(callbackPath, /^\/app\/blogger\?connected=1$/)
  const { data: bloggerAccounts } = await admin.from('social_accounts').select('*').eq('user_id', a.id).eq('platform', 'Blogger')
  assert.equal(bloggerAccounts?.length, 1)
  const bloggerAccount = bloggerAccounts![0]
  assert.equal(bloggerAccount.connection_type, 'blogger')
  const { data: bloggerConnection } = await admin.from('social_connections').select('encrypted_token').eq('user_id', a.id).eq('account_id', bloggerAccount.id).single()
  assert.ok(!bloggerConnection.encrypted_token.includes('integration-refresh-token'))
  assert.equal(decryptToken(bloggerConnection.encrypted_token), 'integration-refresh-token')
  const bloggerResult = await publishBlogger(authRequest(a.token, { accountId: bloggerAccount.id, title: 'Integration article', content: '<p>Real Blogger body</p>', labels: ['integration'] }))
  assert.equal(bloggerResult.result.status, 'sent')
  assert.equal(bloggerResult.result.externalId, 'integration-post')
  assert.match(bloggerResult.result.url || '', /integration-post/)
  await disconnectBlogger(authRequest(a.token, { accountId: bloggerAccount.id }))
  const { data: deletedBloggerCredential } = await admin.from('social_connections').select('account_id').eq('user_id', a.id).eq('account_id', bloggerAccount.id)
  assert.equal(deletedBloggerCredential?.length, 0)
  console.log('✓ Signed Google OAuth, blog discovery, encrypted offline token, token refresh, article publishing, and disconnect')

  await disconnectTelegram(authRequest(a.token, { accountId: first.account.id }))
  const { data: remainingConnections } = await admin.from('social_connections').select('account_id').eq('user_id', a.id)
  assert.equal(remainingConnections?.length, 1)
  await assert.rejects(() => deleteAccount(authRequest(a.token, { password: 'definitely-wrong' })), (error: unknown) => error instanceof Error && 'status' in error && error.status === 401)
  await deleteAccount(authRequest(a.token, { password: a.password }))
  const { data: deletedUser } = await admin.auth.admin.getUserById(a.id)
  assert.equal(deletedUser.user, null)
  const { data: remainingPosts } = await admin.from('posts').select('id').eq('user_id', a.id)
  assert.equal(remainingPosts?.length, 0)
  console.log('✓ Disconnect cascade, current-password verification, and full account deletion cascade')
  console.log('LionPost cloud integration checks passed.')
} finally {
  globalThis.fetch = originalFetch
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => undefined)
}
