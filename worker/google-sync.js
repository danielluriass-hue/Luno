import { getStoredConnection, ensureFreshToken, buildGoogleEventBody } from './google-lib.js'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// POST /api/google/sync { userId, action: 'upsert'|'delete', event, googleEventId }
export async function handleSync(request, env) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const { userId, action, event, googleEventId } = payload
  if (!userId || !action) return json({ error: 'missing_params' }, 400)

  const conn = await getStoredConnection(env, userId)
  if (!conn) return json({ skipped: true, reason: 'not_connected' })

  const accessToken = await ensureFreshToken(env, conn)
  if (!accessToken) return json({ error: 'refresh_failed' }, 502)

  const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  if (action === 'delete') {
    if (!googleEventId) return json({ ok: true })
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error('Google delete failed', res.status, await res.text())
      return json({ error: 'delete_failed' }, 502)
    }
    return json({ ok: true })
  }

  if (action === 'upsert') {
    if (!event) return json({ error: 'missing_event' }, 400)
    const body = JSON.stringify(buildGoogleEventBody(event))

    const url = googleEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`
      : 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const method = googleEventId ? 'PUT' : 'POST'

    const res = await fetch(url, { method, headers: authHeaders, body })
    if (!res.ok) {
      console.error('Google upsert failed', res.status, await res.text())
      return json({ error: 'upsert_failed' }, 502)
    }
    const data = await res.json()
    return json({ googleEventId: data.id })
  }

  return json({ error: 'unknown_action' }, 400)
}
