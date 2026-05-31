import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../lib/useIsMobile'

function ElipticaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="16" rx="7" ry="4" stroke="currentColor" strokeWidth="2"/>
      <line x1="6" y1="12" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/>
      <line x1="18" y1="12" x2="19" y2="5" stroke="currentColor" strokeWidth="2"/>
      <line x1="5" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function GradasIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,20 2,14 8,14 8,9 14,9 14,4 20,4" stroke="currentColor" strokeWidth="2.2"/>
    </svg>
  )
}

function ActivityIcon({ actKey, size = 22 }) {
  if (actKey === 'eliptica') return <ElipticaIcon />
  if (actKey === 'gradas_gym') return <GradasIcon />
  const emojis = { caminar: '🚶', trotar: '🏃', correr: '⚡', bicicleta_gym: '🚴' }
  return <span style={{ fontSize: size + 'px', lineHeight: 1 }}>{emojis[actKey] || '🏃'}</span>
}

const ACTIVITIES = [
  { key: 'caminar',       label: 'Caminar'       },
  { key: 'trotar',        label: 'Trotar'        },
  { key: 'correr',        label: 'Correr'        },
  { key: 'bicicleta_gym', label: 'Bicicleta Gym' },
  { key: 'eliptica',      label: 'Elíptica'      },
  { key: 'gradas_gym',    label: 'Gradas Gym'    },
]

const FATIGUE = [
  { key: 'tranquilo', label: 'Tranquilo', icon: '😌', color: '#10b981' },
  { key: 'normal',    label: 'Normal',    icon: '😤', color: '#fbbf24' },
  { key: 'fatigado',  label: 'Fatigado',  icon: '🥵', color: '#f87171' },
]

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  activity_type: '',
  duration_minutes: '',
  distance_km: '',
  fatigue_level: '',
  notes: '',
}

function CardioModal({ onClose, onSave, initial }) {
  const isMobile = useIsMobile()
  const [form, setForm] = useState(initial || emptyForm)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.activity_type) return
    onSave(form)
  }

  const inp = {
    padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)',
    border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px', width: '100%',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: isMobile ? '20px 16px' : '28px', width: '480px', maxWidth: 'calc(100vw - 24px)', maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--border-card)' }}>
        <h3 style={{ marginBottom: '20px', fontWeight: '700', color: 'var(--text-1)', fontSize: '16px' }}>
          {initial ? 'Editar sesión' : 'Nueva sesión'}
        </h3>
        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Fecha *</label>
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)}
              style={{ ...inp, width: '60%' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>¿Qué hiciste? *</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ACTIVITIES.map(a => {
                const active = form.activity_type === a.key
                return (
                  <button key={a.key} type="button" onClick={() => set('activity_type', a.key)} style={{
                    flex: isMobile ? '1 1 calc(33% - 8px)' : '1',
                    minWidth: isMobile ? '80px' : undefined,
                    padding: isMobile ? '10px 4px' : '12px 8px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-soft)' : 'var(--inner-bg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    transition: 'all 0.12s',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    <ActivityIcon actKey={a.key} size={isMobile ? 20 : 22} />
                    <span style={{ fontSize: '11px', fontWeight: active ? '700' : '500', textAlign: 'center' }}>{a.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Duración <span style={{ color: 'var(--text-muted)' }}>(min)</span></label>
              <input type="number" min="0" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} placeholder="30" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Distancia <span style={{ color: 'var(--text-muted)' }}>(km)</span></label>
              <input type="number" min="0" step="0.01" value={form.distance_km} onChange={e => set('distance_km', e.target.value)} placeholder="3.5" style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>¿Cómo terminaste?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {FATIGUE.map(f => {
                const active = form.fatigue_level === f.key
                return (
                  <button key={f.key} type="button" onClick={() => set('fatigue_level', active ? '' : f.key)} style={{
                    flex: 1, padding: '10px 6px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${active ? f.color : 'var(--border)'}`,
                    background: active ? `${f.color}18` : 'var(--inner-bg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    transition: 'all 0.12s',
                  }}>
                    <span style={{ fontSize: '20px' }}>{f.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: active ? '700' : '400', color: active ? f.color : 'var(--text-muted)' }}>{f.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="¿Cómo estuvo la sesión? Ruta, clima..." style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: '600', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
              {initial ? 'Guardar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TroteSection({ user }) {
  const [sessions, setSessions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.from('cardio_sessions').select('*').eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => setSessions(data || []))
  }, [user.id])

  const handleSave = async (form) => {
    const payload = {
      ...form, user_id: user.id,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      fatigue_level: form.fatigue_level || null,
      notes: form.notes || null,
    }
    if (editing) {
      const { data } = await supabase.from('cardio_sessions').update(payload).eq('id', editing.id).select().single()
      if (data) setSessions(prev => prev.map(s => s.id === editing.id ? data : s))
    } else {
      const { data } = await supabase.from('cardio_sessions').insert(payload).select().single()
      if (data) setSessions(prev => [data, ...prev])
    }
    setShowModal(false); setEditing(null)
  }

  const handleDelete = async (id) => {
    await supabase.from('cardio_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const totalKm = sessions.reduce((t, s) => t + (s.distance_km || 0), 0).toFixed(1)
  const totalMin = sessions.reduce((t, s) => t + (s.duration_minutes || 0), 0)
  const actInfo = (key) => ACTIVITIES.find(a => a.key === key)
  const fatInfo = (key) => FATIGUE.find(f => f.key === key)
  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Registro de cardio</p>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
          + Nueva sesión
        </button>
      </div>

      {sessions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Sesiones totales', value: sessions.length, color: 'var(--accent)' },
            { label: 'Kilómetros totales', value: `${totalKm} km`, color: '#10b981' },
            { label: 'Tiempo total', value: totalMin >= 60 ? `${Math.floor(totalMin/60)}h ${totalMin%60}m` : `${totalMin} min`, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '36px', marginBottom: '10px' }}>🏃</p>
          <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-1)', marginBottom: '4px' }}>Sin sesiones aún</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Registra tu primera sesión de cardio</p>
        </div>
      )}

      {sessions.map(s => {
        const act = actInfo(s.activity_type)
        const fat = fatInfo(s.fatigue_level)
        return (
          <div key={s.id} style={{ ...card, padding: '16px 20px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
              background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <ActivityIcon actKey={s.activity_type} size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>{act?.label || s.activity_type}</span>
                {fat && (
                  <span style={{
                    fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px',
                    background: `${fat.color}18`, color: fat.color, border: `1px solid ${fat.color}30`,
                  }}>{fat.icon} {fat.label}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span>{new Date(s.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                {s.duration_minutes && <span>⏱ {s.duration_minutes} min</span>}
                {s.distance_km && <span>📍 {s.distance_km} km</span>}
                {s.duration_minutes && s.distance_km && (
                  <span>🔥 {(s.distance_km / s.duration_minutes * 60).toFixed(1)} km/h</span>
                )}
              </div>
              {s.notes && <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '4px', fontStyle: 'italic' }}>"{s.notes}"</div>}
            </div>

            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => { setEditing(s); setShowModal(true) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px 6px' }}>✏️</button>
              <button onClick={() => handleDelete(s.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '4px 6px' }}>🗑️</button>
            </div>
          </div>
        )
      })}

      {showModal && (
        <CardioModal
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          initial={editing}
        />
      )}
    </div>
  )
}
