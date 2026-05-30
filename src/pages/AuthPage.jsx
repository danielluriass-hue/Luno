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
    width: '100%', padding: '10px 13px', borderRadius: '8px',
    background: '#f5f5f3', border: '1px solid rgba(0,0,0,0.1)',
    color: '#111', fontSize: '14px', marginBottom: '12px',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f3', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '36px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: '#5856d6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#111', letterSpacing: '-0.02em' }}>miagendaus</span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#111', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
        </h1>
        <p style={{ fontSize: '14px', color: '#999', marginBottom: '28px' }}>
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Empieza a organizar tu día'}
        </p>

        {error && <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: '8px', padding: '10px 13px', fontSize: '13px', color: '#cc0000', marginBottom: '16px' }}>{error}</div>}
        {success && <div style={{ background: '#f0fff4', border: '1px solid #c3f0d0', borderRadius: '8px', padding: '10px 13px', fontSize: '13px', color: '#007a33', marginBottom: '16px' }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px' }}>Nombre</label>
              <input style={inp} type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required />
            </>
          )}
          <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px' }}>Correo electrónico</label>
          <input style={inp} type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <label style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '5px' }}>Contraseña</label>
          <input style={{ ...inp, marginBottom: mode === 'login' ? '6px' : '20px' }} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button type="button" onClick={handleReset} style={{ background: 'none', border: 'none', color: '#999', fontSize: '12px' }}>¿Olvidaste tu contraseña?</button>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
            background: '#5856d6', color: '#fff', fontWeight: '600', fontSize: '14px',
            opacity: loading ? 0.6 : 1, letterSpacing: '-0.01em',
          }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#999' }}>
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
            style={{ background: 'none', border: 'none', color: '#555', fontWeight: '500', fontSize: '13px' }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
