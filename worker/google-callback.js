import { verifyState, supabaseHeaders } from './google-lib.js'

// GET /api/google/callback?code=&state=
export async function handleCallback(request, env) {
  const url = new URL(request.url)
  const appBase = url.origin
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) return Response.redirect(`${appBase}/?google=error&reason=missing_params`, 302)

  const userId = await verifyState(state, env.GOOGLE_STATE_SECRET)
  if (!userId) return Response.redirect(`${appBase}/?google=error&reason=invalid_state`, 302)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Google token exchange failed', await tokenRes.text())
    return Response.redirect(`${appBase}/?google=error&reason=token_exchange`, 302)
  }

  const tokenData = await tokenRes.json()
  if (!tokenData.refresh_token) {
    console.error('Google did not return a refresh_token despite prompt=consent')
    return Response.redirect(`${appBase}/?google=error&reason=no_refresh_token`, 302)
  }

  const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()

  const sbRes = await fetch(`${env.SUPABASE_URL}/rest/v1/google_calendar_tokens?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...supabaseHeaders(env), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenExpiresAt,
    }),
  })

  if (!sbRes.ok) {
    console.error('Supabase upsert failed', await sbRes.text())
    return Response.redirect(`${appBase}/?google=error&reason=storage`, 302)
  }

  return Response.redirect(`${appBase}/?google=success`, 302)
}
