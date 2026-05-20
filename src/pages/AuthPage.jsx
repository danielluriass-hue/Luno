import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) setError(error.message)
      else setSuccess('Revisa tu correo para confirmar tu cuenta.')
    }
    setLoading(false)
  }

  const handleReset = async () => {
    if (!email) { setError('Ingresa tu correo primero.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setSuccess('Te enviamos un enlace para restablecer tu contraseña.')
    setLoading(false)
  }

  const input = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    background: 'var(--card-bg)', border: '1px solid var(--border-card)',
    color: 'var(--text-1)', fontSize: '14px', marginBottom: '12px',
    transition: 'border 0.15s',
  }

  const label = {
    fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px',
    display: 'block', letterSpacing: '0.02em',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Panel izquierdo decorativo */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '1px solid var(--border)', padding: '48px',
        flexDirection: 'column', gap: '32px',
      }}>
        <div style={{ maxWidth: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-1)', letterSpacing: '-0.03em' }}>Luno</span>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', letterSpacing: '-0.03em', marginBottom: '12px', lineHeight: '1.3' }}>
            Tu día,<br />organizado.
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
            Agenda, tareas, hábitos, notas y metas — todo en un solo lugar, solo para ti.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ width: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
          </p>
          <h3 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '28px', letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Inicia sesión' : 'Regístrate gratis'}
          </h3>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#34d399', marginBottom: '16px' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <label style={label}>Nombre</label>
                <input style={input} type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required />
              </>
            )}
            <label style={label}>Correo electrónico</label>
            <input style={input} type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <label style={label}>Contraseña</label>
            <input style={input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '16px' }}>
                <button type="button" onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: '600', fontSize: '14px',
              marginTop: '4px', opacity: loading ? 0.6 : 1, letterSpacing: '-0.01em',
            }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontWeight: '500', fontSize: '13px', cursor: 'pointer' }}>
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
