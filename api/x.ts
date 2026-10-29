import { respond, type ApiRequest, type ApiResponse } from './_lib/server.js'
import { beginX, completeX, disconnectX, publishX } from './_lib/x.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const action = Array.isArray(request.query.action) ? request.query.action[0] : request.query.action
  if (action === 'callback') {
    if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
    const location = await completeX(request)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Location', location)
    return response.status(302).json({})
  }

  const operations = { connect: beginX, disconnect: disconnectX, publish: publishX }
  const operation = action ? operations[action as keyof typeof operations] : undefined
  if (request.method !== 'POST' || !operation) return response.status(405).json({ error: 'Method not allowed.' })
  return respond(request, response, () => operation(request))
}
