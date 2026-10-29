import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

interface ApiRequest {
  method?: string
  query: Record<string, string | string[] | undefined>
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}
interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > 12 * 1024 * 1024) throw new Error('The request is too large.')
    chunks.push(bytes)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function nodeResponse(response: ServerResponse): ApiResponse {
  const adapter: ApiResponse = {
    status(code) {
      response.statusCode = code
      return adapter
    },
    json(body) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify(body))
    },
    setHeader(name, value) {
      response.setHeader(name, value)
    },
  }
  return adapter
}

function localApi(): Plugin {
  return {
    name: 'lionpost-local-api',
    configureServer(server) {
      server.middlewares.use('/api/feed', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        try {
          const url = new URL(request.url || '/', 'http://localhost')
          const source = url.searchParams.get('url')
          if (!source) throw new Error('Add a website or feed URL.')
          const { readFeed } = await server.ssrLoadModule('/api/_lib/feed.ts')
          const result = await readFeed(source, { allowPrivate: true })
          response.statusCode = 200
          response.end(JSON.stringify(result))
        } catch (error) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'The website feed could not be read.' }))
        }
      })

      server.middlewares.use('/api/telegram', async (request, response) => {
        const action = (request.url || '').split('?')[0].replace(/^\/+|\/+$/g, '')
        const methods: Record<string, string> = { connect: 'connectTelegram', disconnect: 'disconnectTelegram', publish: 'publishTelegram' }
        if (request.method !== 'POST' || !methods[action]) {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        const { respond } = await server.ssrLoadModule('/api/_lib/server.ts')
        const telegram = await server.ssrLoadModule('/api/_lib/telegram.ts')
        const apiRequest: ApiRequest = { method: request.method, query: {}, headers: request.headers, body: await readJson(request) }
        await respond(apiRequest, nodeResponse(response), () => telegram[methods[action]](apiRequest))
      })

      server.middlewares.use('/api/blogger', async (request, response) => {
        const url = new URL(request.url || '/', 'http://localhost')
        const action = url.pathname.replace(/^\/+|\/+$/g, '')
        const blogger = await server.ssrLoadModule('/api/_lib/blogger.ts')
        const apiRequest: ApiRequest = { method: request.method, query: Object.fromEntries(url.searchParams), headers: request.headers }
        if (action === 'callback') {
          if (request.method !== 'GET') {
            response.statusCode = 405
            response.end(JSON.stringify({ error: 'Method not allowed.' }))
            return
          }
          const location = await blogger.completeBlogger(apiRequest)
          response.setHeader('Cache-Control', 'no-store')
          response.setHeader('Location', location)
          response.statusCode = 302
          response.end(JSON.stringify({}))
          return
        }
        const methods: Record<string, string> = { connect: 'beginBlogger', disconnect: 'disconnectBlogger', publish: 'publishBlogger' }
        if (request.method !== 'POST' || !methods[action]) {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        const { respond } = await server.ssrLoadModule('/api/_lib/server.ts')
        apiRequest.body = await readJson(request)
        await respond(apiRequest, nodeResponse(response), () => blogger[methods[action]](apiRequest))
      })

      server.middlewares.use('/api/x', async (request, response) => {
        const url = new URL(request.url || '/', 'http://localhost')
        const action = url.pathname.replace(/^\/+|\/+$/g, '')
        const x = await server.ssrLoadModule('/api/_lib/x.ts')
        const apiRequest: ApiRequest = { method: request.method, query: Object.fromEntries(url.searchParams), headers: request.headers }
        if (action === 'callback') {
          if (request.method !== 'GET') {
            response.statusCode = 405
            response.end(JSON.stringify({ error: 'Method not allowed.' }))
            return
          }
          const location = await x.completeX(apiRequest)
          response.setHeader('Cache-Control', 'no-store')
          response.setHeader('Location', location)
          response.statusCode = 302
          response.end(JSON.stringify({}))
          return
        }
        const methods: Record<string, string> = { connect: 'beginX', disconnect: 'disconnectX', publish: 'publishX' }
        if (request.method !== 'POST' || !methods[action]) {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        const { respond } = await server.ssrLoadModule('/api/_lib/server.ts')
        apiRequest.body = await readJson(request)
        await respond(apiRequest, nodeResponse(response), () => x[methods[action]](apiRequest))
      })

      server.middlewares.use('/api/account/delete', async (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }
        const { respond } = await server.ssrLoadModule('/api/_lib/server.ts')
        const { deleteAccount } = await server.ssrLoadModule('/api/_lib/account.ts')
        const apiRequest: ApiRequest = { method: request.method, query: {}, headers: request.headers, body: await readJson(request) }
        await respond(apiRequest, nodeResponse(response), () => deleteAccount(apiRequest))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.entries(env).forEach(([key, value]) => {
    if (process.env[key] === undefined) process.env[key] = value
  })
  return {
    plugins: [react(), localApi()],
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
  }
})
