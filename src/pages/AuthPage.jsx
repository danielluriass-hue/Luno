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

  const inp = {
    width: '100%', padding: '10px 13px', borderRadius: '10px',
    background: 'var(--inner-bg)', border: '1px solid var(--border)',
    color: 'var(--text-1)', fontSize: '14px', marginBottom: '12px',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '36px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'var(--accent)', boxShadow: '0 4px 14px -4px var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>miagendaus</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '500', color: 'var(--text-1)', letterSpacing: '-0.01em', marginBottom: '4px' }}>
          {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Empieza a organizar tu día'}
        </p>

        {error && <div style={{ background: 'color-mix(in srgb, var(--red) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)', borderRadius: '10px', padding: '10px 13px', fontSize: '13px', color: 'var(--red)', marginBottom: '16px' }}>{error}</div>}
        {success && <div style={{ background: 'var(--green-soft)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)', borderRadius: '10px', padding: '10px 13px', fontSize: '13px', color: 'var(--green)', marginBottom: '16px' }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Nombre</label>
              <input style={inp} type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required />
            </>
          )}
          <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Correo electrónico</label>
          <input style={inp} type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Contraseña</label>
          <input style={{ ...inp, marginBottom: mode === 'login' ? '6px' : '20px' }} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button type="button" onClick={handleReset} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>¿Olvidaste tu contraseña?</button>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontWeight: '600', fontSize: '14px',
            opacity: loading ? 0.6 : 1, letterSpacing: '-0.01em', boxShadow: '0 4px 14px -4px var(--accent-glow)',
          }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontWeight: '500', fontSize: '13px' }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
