import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { connectTelegram, disconnectTelegram, publishTelegram } from '../api/_lib/telegram.ts'
import { deleteAccount } from '../api/_lib/account.ts'
import { decryptToken } from '../api/_lib/server.ts'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !serviceKey || !publishableKey || !process.env.TOKEN_ENCRYPTION_KEY) throw new Error('Integration environment is incomplete.')

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const userIds: string[] = []
const originalFetch = globalThis.fetch

async function makeUser(label: string) {
  const email = `alphapost-${label}-${Date.now()}-${crypto.randomUUID()}@example.com`
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

  let telegramCalls: string[] = []
  globalThis.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url
    if (!requestUrl.startsWith('https://api.telegram.org/')) return originalFetch(input, init)
    const method = requestUrl.split('/').pop() || ''
    telegramCalls.push(method)
    const body = init?.body
    const payload = body && typeof body === 'string' ? JSON.parse(body) : body instanceof FormData ? Object.fromEntries(body.entries()) : {}
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
    if (method === 'getMe') return json({ ok: true, result: { id: 999001, first_name: 'Integration Bot', username: 'alphapost_integration_bot' } })
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
  console.log('AlphaPost cloud integration checks passed.')
} finally {
  globalThis.fetch = originalFetch
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => undefined)
}
