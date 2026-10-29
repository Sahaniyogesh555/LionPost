import { ApiError, requireUser, respond, type ApiRequest, type ApiResponse } from './_lib/server.js'
import { readTemporaryMedia, record, removeTemporaryMedia } from './_lib/provider-utils.js'
import { beginFacebook, completeFacebook, disconnectFacebook, publishFacebook } from './_lib/facebook.js'
import { beginTikTok, completeTikTok, disconnectTikTok, publishTikTok, readTikTokMediaGrant, tiktokOptions } from './_lib/tiktok.js'
import { beginYouTube, completeYouTube, disconnectYouTube, publishYouTube } from './_lib/youtube.js'
import { beginPinterest, completePinterest, disconnectPinterest, pinterestOptions, publishPinterest } from './_lib/pinterest.js'
import { connectDailymotion, disconnectDailymotion, publishDailymotion } from './_lib/dailymotion.js'

export const config = { maxDuration: 300, api: { bodyParser: { sizeLimit: '1mb' } } }

const callbacks: Record<string, (request: ApiRequest) => Promise<string>> = {
  facebook: completeFacebook,
  tiktok: completeTikTok,
  youtube: completeYouTube,
  pinterest: completePinterest,
}

const operations: Record<string, Record<string, (request: ApiRequest) => Promise<unknown>>> = {
  facebook: { connect: beginFacebook, publish: publishFacebook, disconnect: disconnectFacebook },
  tiktok: { connect: beginTikTok, publish: publishTikTok, options: tiktokOptions, disconnect: disconnectTikTok },
  youtube: { connect: beginYouTube, publish: publishYouTube, disconnect: disconnectYouTube },
  pinterest: { connect: beginPinterest, publish: publishPinterest, options: pinterestOptions, disconnect: disconnectPinterest },
  dailymotion: { connect: connectDailymotion, publish: publishDailymotion, disconnect: disconnectDailymotion },
}

async function cleanupMedia(request: ApiRequest) {
  const { user } = await requireUser(request)
  return removeTemporaryMedia(user.id, record(request.body).mediaPath)
}

async function serveTikTokMedia(request: ApiRequest, response: ApiResponse) {
  try {
    const token = Array.isArray(request.query.token) ? request.query.token[0] : request.query.token
    if (!token) throw new ApiError(400, 'The temporary media token is missing.')
    const grant = readTikTokMediaGrant(token)
    const media = await readTemporaryMedia(grant.userId, grant.path, 'image')
    response.setHeader('Cache-Control', 'private, no-store')
    response.setHeader('Content-Type', media.contentType)
    response.setHeader('Content-Length', String(media.buffer.length))
    response.setHeader('X-Content-Type-Options', 'nosniff')
    return response.status(200).end(media.buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The temporary media could not be read.'
    const status = error instanceof ApiError ? error.status : 500
    return response.status(status).json({ error: message })
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const provider = Array.isArray(request.query.provider) ? request.query.provider[0] : request.query.provider
  const action = Array.isArray(request.query.action) ? request.query.action[0] : request.query.action
  if (provider === 'tiktok' && action === 'media') {
    if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
    return serveTikTokMedia(request, response)
  }
  if (provider === 'media' && action === 'cleanup') {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
    return respond(request, response, () => cleanupMedia(request))
  }
  if (action === 'callback' && provider && callbacks[provider]) {
    if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
    const location = await callbacks[provider](request)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Location', location)
    return response.status(302).json({})
  }
  const operation = provider && action ? operations[provider]?.[action] : undefined
  if (request.method !== 'POST' || !operation) return response.status(405).json({ error: 'Method not allowed.' })
  return respond(request, response, () => operation(request))
}
