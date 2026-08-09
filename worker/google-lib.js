// Helpers compartidos por las rutas /api/google/*

function base64url(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(b64url.length + (4 - (b64url.length % 4 || 4)), '=')
  const str = atob(b64)
  return Uint8Array.from(str, c => c.charCodeAt(0))
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

// state = base64url(payload) + '.' + base64url(hmac(payload))
export async function signState(userId, secret) {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + 10 * 60 * 1000 })
  const payloadBytes = new TextEncoder().encode(payload)
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, payloadBytes)
  return `${base64url(payloadBytes)}.${base64url(new Uint8Array(sig))}`
}

export async function verifyState(state, secret) {
  const [payloadPart, sigPart] = (state || '').split('.')
  if (!payloadPart || !sigPart) return null
  const payloadBytes = base64urlToBytes(payloadPart)
  const key = await hmacKey(secret)
  const valid = await crypto.subtle.verify('HMAC', key, base64urlToBytes(sigPart), payloadBytes)
  if (!valid) return null
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes))
  if (!payload.uid || !payload.exp || payload.exp < Date.now()) return null
  return payload.uid
}

export function supabaseHeaders(env) {
  return {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  }
}

export async function getStoredConnection(env, userId) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/google_calendar_tokens?user_id=eq.${userId}&select=*`, {
    headers: supabaseHeaders(env),
  })
  if (!res.ok) return null
  const rows = await res.json()
  return rows[0] || null
}

export async function deleteStoredConnection(env, connId) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/google_calendar_tokens?id=eq.${connId}`, {
    method: 'DELETE',
    headers: supabaseHeaders(env),
  })
}

// Refresca el access_token si está por expirar (buffer de 5 min). Devuelve el access_token vigente,
// o null si el refresh falló porque el usuario revocó el acceso (y ya se borró la conexión guardada).
export async function ensureFreshToken(env, conn) {
  const expiresSoon = new Date(conn.token_expires_at).getTime() < Date.now() + 5 * 60 * 1000
  if (!expiresSoon) return conn.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error('Google refresh failed', res.status, errBody)
    if (res.status === 400 && errBody.includes('invalid_grant')) {
      await deleteStoredConnection(env, conn.id)
    }
    return null
  }

  const data = await res.json()
  const tokenExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
  await fetch(`${env.SUPABASE_URL}/rest/v1/google_calendar_tokens?id=eq.${conn.id}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env),
    body: JSON.stringify({ access_token: data.access_token, token_expires_at: tokenExpiresAt }),
  })
  return data.access_token
}

function addDaysToDateStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function addHourToTimeStr(t) {
  const [h, m, s] = t.split(':').map(Number)
  const total = h * 60 + m + 60
  const hh = Math.min(23, Math.floor(total / 60))
  return `${String(hh).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`
}

// Guatemala es UTC-6 fijo (sin horario de verano) — offset explícito, nunca se usa
// la hora local del Worker (corre en UTC, no en la hora del usuario).
export function buildGoogleEventBody(ev) {
  const body = {
    summary: ev.title || '(sin título)',
    description: ev.description || undefined,
    reminders: { useDefault: false },
  }

  if (ev.start_time) {
    const endTime = ev.end_time || addHourToTimeStr(ev.start_time)
    body.start = { dateTime: `${ev.date}T${ev.start_time}-06:00`, timeZone: 'America/Guatemala' }
    body.end = { dateTime: `${ev.date}T${endTime}-06:00`, timeZone: 'America/Guatemala' }
  } else {
    body.start = { date: ev.date }
    body.end = { date: addDaysToDateStr(ev.date, 1) }
  }
  return body
}
