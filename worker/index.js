import { handleAuth } from './google-auth.js'
import { handleCallback } from './google-callback.js'
import { handleSync } from './google-sync.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/google/auth' && request.method === 'GET') return handleAuth(request, env)
    if (url.pathname === '/api/google/callback' && request.method === 'GET') return handleCallback(request, env)
    if (url.pathname === '/api/google/sync' && request.method === 'POST') return handleSync(request, env)

    return env.ASSETS.fetch(request)
  },
}
