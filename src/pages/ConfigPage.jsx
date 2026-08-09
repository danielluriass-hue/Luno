import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ConfigPage({ user, googleNotice, onClearGoogleNotice }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [gcalConn, setGcalConn] = useState(null)
  const [gcalLoading, setGcalLoading] = useState(true)

  const clear = () => { setSuccess(''); setError('') }

  useEffect(() => {
    supabase.from('google_calendar_tokens').select('id, created_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setGcalConn(data || null); setGcalLoading(false) })
  }, [user.id])

  useEffect(() => {
    if (!googleNotice) return
    if (googleNotice === 'success') setSuccess('Google Calendar conectado correctamente.')
    else setError('No se pudo conectar Google Calendar. Intenta de nuevo.')
    onClearGoogleNotice?.()
  }, [googleNotice])

  const connectGoogle = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    window.location.href = `/api/google/auth?token=${encodeURIComponent(session.access_token)}`
  }

  const disconnectGoogle = async () => {
    await supabase.from('google_calendar_tokens').delete().eq('user_id', user.id)
    setGcalConn(null)
  }

  const updateProfile = async (e) => {
    e.preventDefault()
    clear(); setLoading(true)
    const updates = {}
    if (name !== user?.user_metadata?.full_name) updates.data = { full_name: name }
    if (email !== user?.email) updates.email = email

    if (Object.keys(updates).length === 0) {
      setLoading(false)
      setSuccess('Sin cambios que guardar.')
      return
    }

    const { error } = await supabase.auth.updateUser(updates)
    setLoading(false)
    if (error) setError(error.message)
    else {
      if (updates.email) setSuccess('Revisa tu nuevo correo para confirmar el cambio.')
      else setSuccess('Perfil actualizado.')
    }
  }

  const updatePassword = async (e) => {
    e.preventDefault()
    clear()
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else { setSuccess('Contraseña actualizada.'); setPassword(''); setConfirmPassword('') }
  }

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
    background: 'var(--inner-bg)', border: '1px solid var(--border)',
    color: 'var(--text-1)', fontSize: '13px',
  }

  const card = {
    background: 'var(--card-bg)', borderRadius: '16px',
    border: '1px solid var(--border-card)', padding: '24px 26px', marginBottom: '14px',
  }

  const label = { fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ maxWidth: '520px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: '500', letterSpacing: '-0.01em', marginBottom: '28px' }}>Configuración</h1>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fff4', border: '1px solid #c3f0d0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#007a33', marginBottom: '16px' }}>
          {success}
        </div>
      )}

      {/* Perfil */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', marginBottom: '18px' }}>Información de cuenta</div>
        <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label}>Nombre</label>
            <input style={inp} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <label style={label}>Correo electrónico</label>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
            {email !== user?.email && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                Se enviará un enlace de confirmación al nuevo correo.
              </p>
            )}
          </div>
          <button type="submit" disabled={loading} style={{
            padding: '10px', borderRadius: '10px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontWeight: '600', fontSize: '13px',
            opacity: loading ? 0.6 : 1, alignSelf: 'flex-start', minWidth: '120px',
            boxShadow: '0 4px 14px -4px var(--accent-glow)',
          }}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Contraseña */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', marginBottom: '18px' }}>Cambiar contraseña</div>
        <form onSubmit={updatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label}>Nueva contraseña</label>
            <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <div>
            <label style={label}>Confirmar contraseña</label>
            <input style={inp} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} style={{
            padding: '10px', borderRadius: '10px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontWeight: '600', fontSize: '13px',
            opacity: loading ? 0.6 : 1, alignSelf: 'flex-start', minWidth: '120px',
            boxShadow: '0 4px 14px -4px var(--accent-glow)',
          }}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      {/* Google Calendar */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', marginBottom: '8px' }}>Google Calendar</div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Sincroniza tus eventos de Agenda con tu Google Calendar principal para recibir notificaciones en tu celular.
        </p>
        {gcalLoading ? null : gcalConn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--green)', background: 'rgba(52,199,89,0.12)', padding: '5px 10px', borderRadius: '20px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} />
              Conectado
            </span>
            <button onClick={disconnectGoogle} style={{
              padding: '9px 18px', borderRadius: '10px', border: '1px solid rgba(255,59,48,0.3)',
              background: 'transparent', color: 'var(--red)', fontWeight: '600', fontSize: '13px',
            }}>
              Desconectar
            </button>
          </div>
        ) : (
          <button onClick={connectGoogle} style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontWeight: '600', fontSize: '13px',
            boxShadow: '0 4px 14px -4px var(--accent-glow)',
          }}>
            Conectar con Google
          </button>
        )}
      </div>

      {/* Peligro */}
      <div style={{ ...card, border: '1px solid rgba(255,59,48,0.2)' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', marginBottom: '8px' }}>Sesión</div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Cerrar sesión en este dispositivo.</p>
        <button onClick={() => supabase.auth.signOut()} style={{
          padding: '9px 18px', borderRadius: '10px', border: '1px solid rgba(255,59,48,0.3)',
          background: 'transparent', color: 'var(--red)', fontWeight: '600', fontSize: '13px',
        }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
