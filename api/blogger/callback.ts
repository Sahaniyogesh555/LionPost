import type { ApiRequest, ApiResponse } from '../_lib/server.js'
import { completeBlogger } from '../_lib/blogger.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  const location = await completeBlogger(request)
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Location', location)
  return response.status(302).json({})
}
