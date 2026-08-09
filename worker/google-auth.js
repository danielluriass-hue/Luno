import { signState } from './google-lib.js'

// GET /api/google/auth?token=<supabase_access_token>
export async function handleAuth(request, env) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return new Response('Falta token', { status: 400 })

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return new Response('Sesión inválida', { status: 401 })
  const { id: userId } = await userRes.json()

  const state = await signState(userId, env.GOOGLE_STATE_SECRET)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events')
  authUrl.searchParams.set('state', state)

  return Response.redirect(authUrl.toString(), 302)
}
