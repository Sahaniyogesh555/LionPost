import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function feedApi(): Plugin {
  return {
    name: 'alphapost-feed-api',
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
    },
  }
}

export default defineConfig({
  plugins: [react(), feedApi()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
