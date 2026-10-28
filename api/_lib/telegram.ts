import { randomUUID } from 'node:crypto'
import { ApiError, decryptToken, encryptToken, requireUser, type ApiRequest } from './server.js'
import type { PublishResult, SocialAccount } from '../../src/types.js'

interface TelegramResponse<T> {
  ok: boolean
  result?: T
  description?: string
}

interface TelegramUser { id: number; first_name: string; username?: string }
interface TelegramChat { id: number; title?: string; username?: string; type: string }
interface TelegramMember { status: string; can_post_messages?: boolean; can_send_messages?: boolean }
interface TelegramMessage { message_id: number }

async function telegramCall<T>(token: string, method: string, body: Record<string, unknown> | FormData): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const isForm = body instanceof FormData
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: isForm ? undefined : { 'Content-Type': 'application/json' },
      body: isForm ? body : JSON.stringify(body),
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null) as TelegramResponse<T> | null
    if (!response.ok || !result?.ok || result.result === undefined) {
      throw new ApiError(400, `Telegram could not complete ${method}: ${result?.description || `HTTP ${response.status}`}`)
    }
    return result.result
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError(504, 'Telegram took too long to respond.')
    throw new ApiError(502, 'Telegram could not be reached. Please try again.')
  } finally {
    clearTimeout(timeout)
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function safeAccount(row: Record<string, unknown>): SocialAccount {
  return {
    id: String(row.id),
    platform: 'Telegram',
    name: String(row.name || ''),
    handle: String(row.handle || ''),
    status: row.status === 'paused' ? 'paused' : 'working',
    connectionType: 'telegram',
    externalId: row.external_id ? String(row.external_id) : undefined,
    botUsername: row.bot_username ? String(row.bot_username) : undefined,
  }
}

export async function connectTelegram(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const botToken = String(input.botToken || '').trim()
  const chatId = String(input.chatId || '').trim()
  const displayName = String(input.displayName || '').trim()
  if (!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(botToken)) throw new ApiError(400, 'Enter the complete bot token from BotFather.')
  if (!chatId || chatId.length > 120) throw new ApiError(400, 'Enter a channel or group chat ID, or a public @channel username.')

  const bot = await telegramCall<TelegramUser>(botToken, 'getMe', {})
  const chat = await telegramCall<TelegramChat>(botToken, 'getChat', { chat_id: chatId })
  if (chat.type === 'private') throw new ApiError(400, 'Add the bot to your channel or group and use that chat ID.')
  const member = await telegramCall<TelegramMember>(botToken, 'getChatMember', { chat_id: chatId, user_id: bot.id })
  if (['left', 'kicked'].includes(member.status)) throw new ApiError(400, 'The bot is not a member of this chat.')
  if (chat.type === 'channel' && !(member.status === 'administrator' || member.status === 'creator') && !member.can_post_messages) {
    throw new ApiError(400, 'Make the bot a channel administrator with permission to post messages.')
  }
  if (member.status === 'restricted' && member.can_send_messages === false) throw new ApiError(400, 'The bot is not allowed to post in this group.')

  const externalId = String(chat.id)
  const { data: existing, error: lookupError } = await client.from('social_accounts').select('id').eq('user_id', user.id).eq('platform', 'Telegram').eq('connection_type', 'telegram').eq('external_id', externalId).limit(1).maybeSingle()
  if (lookupError) throw new ApiError(400, lookupError.message)
  const accountId = String(existing?.id || randomUUID())
  const row = {
    user_id: user.id,
    id: accountId,
    platform: 'Telegram',
    name: displayName || chat.title || bot.first_name,
    handle: chat.username ? `@${chat.username}` : externalId,
    status: 'working',
    connection_type: 'telegram',
    external_id: externalId,
    bot_username: bot.username || null,
  }
  const { error: accountError } = await client.from('social_accounts').upsert(row, { onConflict: 'user_id,id' })
  if (accountError) throw new ApiError(400, accountError.message)
  const { error: connectionError } = await client.from('social_connections').upsert({
    user_id: user.id,
    account_id: accountId,
    encrypted_token: encryptToken(botToken),
    metadata: { botId: bot.id, botUsername: bot.username || null, chatType: chat.type },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,account_id' })
  if (connectionError) {
    if (!existing) await client.from('social_accounts').delete().eq('user_id', user.id).eq('id', accountId)
    throw new ApiError(400, connectionError.message)
  }
  return { account: safeAccount(row) }
}

export async function disconnectTelegram(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const accountId = String(record(request.body).accountId || '')
  if (!accountId) throw new ApiError(400, 'Choose a Telegram connection to remove.')
  const { error } = await client.from('social_accounts').delete().eq('user_id', user.id).eq('id', accountId).eq('platform', 'Telegram').eq('connection_type', 'telegram')
  if (error) throw new ApiError(400, error.message)
  return { disconnected: true }
}

function imageAttachment(value: unknown) {
  if (!value) return null
  const match = String(value).match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new ApiError(400, 'Telegram publishing currently supports uploaded PNG, JPEG, WebP, or GIF images.')
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new ApiError(400, 'Choose an image smaller than 8 MB for Telegram.')
  return { bytes, mime: match[1] }
}

export async function publishTelegram(request: ApiRequest) {
  const { user, client } = await requireUser(request)
  const input = record(request.body)
  const accountIds = Array.isArray(input.accountIds) ? [...new Set(input.accountIds.map(String))].slice(0, 10) : []
  const text = String(input.text || '').trim()
  if (!accountIds.length) throw new ApiError(400, 'Choose at least one connected Telegram account.')
  if (!text && !input.image) throw new ApiError(400, 'Write a message or add an image first.')
  if (text.length > 4096) throw new ApiError(400, 'Telegram messages can contain at most 4096 characters.')
  const image = imageAttachment(input.image)
  if (image && text.length > 1024) throw new ApiError(400, 'Telegram photo captions can contain at most 1024 characters. Shorten the caption or publish without the image.')

  const { data: accountRows, error: accountError } = await client.from('social_accounts').select('*').eq('user_id', user.id).eq('platform', 'Telegram').eq('connection_type', 'telegram').in('id', accountIds)
  if (accountError) throw new ApiError(400, accountError.message)
  if ((accountRows || []).length !== accountIds.length) throw new ApiError(400, 'One or more Telegram connections were not found. Reconnect them and try again.')
  const { data: connections, error: connectionError } = await client.from('social_connections').select('account_id, encrypted_token').eq('user_id', user.id).in('account_id', accountIds)
  if (connectionError) throw new ApiError(400, connectionError.message)

  const results: PublishResult[] = []
  for (const account of accountRows || []) {
    const accountId = String(account.id)
    try {
      const encrypted = (connections || []).find((item) => item.account_id === accountId)?.encrypted_token
      if (!encrypted) throw new ApiError(400, 'The bot credential is missing. Reconnect this Telegram account.')
      const token = decryptToken(String(encrypted))
      let message: TelegramMessage
      if (image) {
        const form = new FormData()
        form.set('chat_id', String(account.external_id))
        if (text) form.set('caption', text)
        form.set('photo', new Blob([image.bytes], { type: image.mime }), `post.${image.mime === 'image/jpeg' ? 'jpg' : image.mime.split('/')[1]}`)
        message = await telegramCall<TelegramMessage>(token, 'sendPhoto', form)
      } else {
        message = await telegramCall<TelegramMessage>(token, 'sendMessage', { chat_id: String(account.external_id), text })
      }
      results.push({ accountId, platform: 'Telegram', status: 'sent', messageId: message.message_id, publishedAt: new Date().toISOString() })
    } catch (error) {
      results.push({ accountId, platform: 'Telegram', status: 'failed', error: error instanceof Error ? error.message : 'Telegram publishing failed.' })
    }
  }
  return { results }
}
