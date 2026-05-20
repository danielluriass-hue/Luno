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
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
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

  const s = {
    page: {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '24px',
    },
    card: {
      width: '100%', maxWidth: '400px',
      background: 'var(--card-bg)', borderRadius: '24px',
      border: '1px solid var(--border-card)', padding: '40px 36px',
    },
    logo: {
      fontSize: '28px', fontWeight: '800', color: 'var(--accent)',
      letterSpacing: '-0.04em', marginBottom: '8px', textAlign: 'center',
    },
    subtitle: {
      fontSize: '13px', color: 'var(--text-muted)',
      textAlign: 'center', marginBottom: '32px',
    },
    label: { fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', display: 'block' },
    input: {
      width: '100%', padding: '11px 14px', borderRadius: '12px',
      background: 'var(--inner-bg)', border: '1px solid var(--border)',
      color: 'var(--text-1)', fontSize: '14px', marginBottom: '16px',
      transition: 'border 0.15s',
    },
    btn: {
      width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
      background: 'var(--accent)', color: '#fff', fontWeight: '700',
      fontSize: '14px', marginTop: '4px', transition: 'opacity 0.15s',
      opacity: loading ? 0.6 : 1,
    },
    toggle: {
      textAlign: 'center', marginTop: '20px',
      fontSize: '13px', color: 'var(--text-muted)',
    },
    link: { color: 'var(--accent)', background: 'none', border: 'none', fontWeight: '600', fontSize: '13px' },
    error: {
      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
      color: '#f87171', marginBottom: '16px',
    },
    success: {
      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
      color: '#10b981', marginBottom: '16px',
    },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🌙 Luno</div>
        <p style={s.subtitle}>
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
        </p>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label style={s.label}>Nombre</label>
              <input
                style={s.input} type="text" placeholder="Tu nombre"
                value={name} onChange={e => setName(e.target.value)} required
              />
            </>
          )}
          <label style={s.label}>Correo</label>
          <input
            style={s.input} type="email" placeholder="correo@ejemplo.com"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <label style={s.label}>Contraseña</label>
          <input
            style={s.input} type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '16px' }}>
              <button type="button" style={s.link} onClick={handleReset}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div style={s.toggle}>
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button style={s.link} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
