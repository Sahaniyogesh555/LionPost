import { respond, type ApiRequest, type ApiResponse } from '../_lib/server.js'
import { publishTelegram } from '../_lib/telegram.js'

export const config = { api: { bodyParser: { sizeLimit: '12mb' } } }

export default function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  return respond(request, response, () => publishTelegram(request))
}
