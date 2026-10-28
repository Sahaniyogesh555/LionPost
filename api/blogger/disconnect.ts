import { respond, type ApiRequest, type ApiResponse } from '../_lib/server.js'
import { disconnectBlogger } from '../_lib/blogger.js'

export default function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  return respond(request, response, () => disconnectBlogger(request))
}
