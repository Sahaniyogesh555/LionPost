import { respond, type ApiRequest, type ApiResponse } from '../_lib/server.js'
import { publishBlogger } from '../_lib/blogger.js'

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }

export default function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  return respond(request, response, () => publishBlogger(request))
}
