import { readFeed } from './_lib/feed'

interface ApiRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' })
  const value = request.query.url
  const source = Array.isArray(value) ? value[0] : value
  if (!source) return response.status(400).json({ error: 'Add a website or feed URL.' })
  try {
    const result = await readFeed(source)
    response.setHeader('Cache-Control', 'no-store')
    return response.status(200).json(result)
  } catch (error) {
    return response.status(400).json({ error: error instanceof Error ? error.message : 'The website feed could not be read.' })
  }
}
