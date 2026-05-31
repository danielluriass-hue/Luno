import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import GymSection from './GymSection'
import TroteSection from './TroteSection'
import { useIsMobile } from '../lib/useIsMobile'
import { localDateStr } from '../lib/dateUtils'

const FIELDS = [
  { key: 'weight',       label: 'Peso',           unit: 'lbs', step: '0.1', goodDown: true,  color: '#7b79f7' },
  { key: 'body_fat',     label: 'Grasa corporal', unit: '%',   step: '0.1', goodDown: true,  color: '#f87171' },
  { key: 'visceral_fat', label: 'Grasa visceral', unit: 'pts', step: '1',   goodDown: true,  color: '#fb923c' },
  { key: 'waist_cm',     label: 'Cintura',        unit: 'cm',  step: '0.5', goodDown: true,  color: '#fbbf24' },
  { key: 'chest_cm',     label: 'Pecho',          unit: 'cm',  step: '0.5', goodDown: false, color: '#34d399' },
  { key: 'glutes_cm',    label: 'Glúteo',         unit: 'cm',  step: '0.5', goodDown: false, color: '#f472b6' },
  { key: 'arm_cm',       label: 'Brazo',          unit: 'cm',  step: '0.5', goodDown: false, color: '#38bdf8' },
  { key: 'leg_cm',       label: 'Muslo',          unit: 'cm',  step: '0.5', goodDown: false, color: '#a78bfa' },
]

const emptyForm = () => ({ date: localDateStr(), ...Object.fromEntries(FIELDS.map(f => [f.key, ''])) })

function LineChart({ data, field, color, unit }) {
  if (!data || data.length < 2) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', color: 'var(--text-muted)', fontSize: '12px' }}>
      Necesitas al menos 2 mediciones
    </div>
  )
  const filtered = data.filter(d => d[field] != null)
  if (filtered.length < 2) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', color: 'var(--text-muted)', fontSize: '12px' }}>
      Sin datos suficientes
    </div>
  )
  const W = 260, H = 150, PX = 24, PY = 24, PB = 28
  const innerW = W - PX * 2
  const innerH = H - PY - PB
  const values = filtered.map(d => parseFloat(d[field]))
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const pad = range * 0.15
  const lo = minV - pad, hi = maxV + pad
  const xFn = (i) => PX + (i / (filtered.length - 1)) * innerW
  const yFn = (v) => PY + innerH - ((v - lo) / (hi - lo)) * innerH
  const pts = filtered.map((d, i) => ({ x: xFn(i), y: yFn(parseFloat(d[field])), v: parseFloat(d[field]), date: d.date }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length-1].x},${PY+innerH} L${pts[0].x},${PY+innerH}Z`
  const gradId = `g-${field}`
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(t => (
        <line key={t} x1={PX} y1={PY + innerH * t} x2={W-PX} y2={PY + innerH * t}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3" />
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="var(--card-bg)" strokeWidth="2" />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fill={color} fontSize="9.5" fontWeight="700">{p.v}{unit}</text>
          <text x={p.x} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5">
            {new Date(p.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function MejorasPage({ user }) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('mediciones')
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(() => emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [chartField, setChartField] = useState('weight')

  useEffect(() => {
    supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .order('date', { ascending: true })
      .then(({ data }) => setEntries(data || []))
  }, [user.id])

  const save = async (e) => {
    e.preventDefault()
    const payload = { ...form, user_id: user.id }
    FIELDS.forEach(f => {
      if (payload[f.key] === '' || payload[f.key] === null) payload[f.key] = null
      else payload[f.key] = parseFloat(payload[f.key])
    })
    if (editing) {
      const { data } = await supabase.from('body_measurements').update(payload).eq('id', editing).select().single()
      if (data) setEntries(prev => prev.map(e => e.id === editing ? data : e).sort((a,b) => a.date.localeCompare(b.date)))
    } else {
      const { data } = await supabase.from('body_measurements').insert(payload).select().single()
      if (data) setEntries(prev => [...prev, data].sort((a,b) => a.date.localeCompare(b.date)))
    }
    setForm(emptyForm()); setShowForm(false); setEditing(null)
  }

  const del = async (id) => {
    await supabase.from('body_measurements').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const diff = (curr, prev) => {
    if (curr == null || prev == null) return null
    return parseFloat((curr - prev).toFixed(1))
  }

  // entries are ascending — latest = last, previous = second to last
  const latest = entries[entries.length - 1]
  const previous = entries[entries.length - 2]
  const selectedField = FIELDS.find(f => f.key === chartField)
  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px 22px' }

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header + Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '16px' }}>Mejoras</h1>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--inner-bg)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
          {[{ key: 'mediciones', label: 'Mediciones' }, { key: 'gym', label: '🏋️ Gym' }, { key: 'trote', label: '🏃 Cardio' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 20px', borderRadius: '9px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              background: tab === t.key ? 'var(--card-bg)' : 'transparent',
              color: tab === t.key ? 'var(--text-1)' : 'var(--text-muted)',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.12s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'gym' && <GymSection user={user} />}
      {tab === 'trote' && <TroteSection user={user} />}

      {tab === 'mediciones' && <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'flex-start' }}>

      {/* LEFT — main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mediciones corporales semanales</p>
          </div>
          <button onClick={() => { setForm(emptyForm()); setEditing(null); setShowForm(true) }}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
            + Nueva medición
          </button>
        </div>

        {/* Comparación última vs anterior */}
        {latest && (
          <div style={{ ...card, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Última medición</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {new Date(latest.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                {previous && <span> · vs {new Date(previous.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
              {FIELDS.map(f => {
                const c = latest[f.key]
                const p = previous?.[f.key]
                const d = diff(c, p)
                const improved = d != null && d !== 0 && (f.goodDown ? d < 0 : d > 0)
                const worsened = d != null && d !== 0 && (f.goodDown ? d > 0 : d < 0)
                return (
                  <div key={f.key} style={{ background: 'var(--inner-bg)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{f.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                      {c != null ? c : '—'}{c != null && <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)' }}>{f.unit}</span>}
                    </div>
                    {d != null && d !== 0 && (
                      <div style={{ fontSize: '11px', marginTop: '4px', color: improved ? '#10b981' : worsened ? '#f87171' : 'var(--text-muted)', fontWeight: '600' }}>
                        {d > 0 ? '↑' : '↓'} {Math.abs(d)}{f.unit}
                      </div>
                    )}
                    {d === 0 && <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>= sin cambio</div>}
                    {d == null && c != null && <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>primera</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Historial — ordenado por fecha ascendente */}
        {entries.length > 0 && (
          <div style={{ ...card }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Historial</div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: '500', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Fecha</th>
                    {FIELDS.map(f => (
                      <th key={f.key} style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: '500', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{f.label}</th>
                    ))}
                    <th style={{ borderBottom: '1px solid var(--border)', width: '60px' }} />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{ padding: '9px 8px', color: 'var(--text-2)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)', fontWeight: '500' }}>
                        {new Date(entry.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      {FIELDS.map(f => {
                        const c = entry[f.key]
                        const prev = idx > 0 ? entries[idx - 1][f.key] : null
                        const d = diff(c, prev)
                        const improved = d != null && d !== 0 && (f.goodDown ? d < 0 : d > 0)
                        const worsened = d != null && d !== 0 && (f.goodDown ? d > 0 : d < 0)
                        return (
                          <td key={f.key} style={{ padding: '9px 8px', textAlign: 'right', borderBottom: '1px solid var(--border)', color: c != null ? (improved ? '#10b981' : worsened ? '#f87171' : 'var(--text-1)') : 'var(--text-muted)' }}>
                            {c != null ? c : '—'}
                          </td>
                        )
                      })}
                      <td style={{ padding: '9px 4px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button onClick={() => { setForm({ date: entry.date, ...Object.fromEntries(FIELDS.map(f => [f.key, entry[f.key] ?? ''])) }); setEditing(entry.id); setShowForm(true) }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: '2px 4px' }}>✏️</button>
                          <button onClick={() => del(entry.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: '2px 4px' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📏</p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-1)', marginBottom: '4px' }}>Sin mediciones aún</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Registra tu primera medición y comienza a ver tu progreso</p>
          </div>
        )}
      </div>

      {/* RIGHT — gráfico */}
      {entries.length >= 2 && (
        <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
          <div style={{ ...card, position: 'sticky', top: '24px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Tendencia</div>

            {/* Selector de métrica */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {FIELDS.map(f => (
                <button key={f.key} onClick={() => setChartField(f.key)} style={{
                  padding: '4px 10px', borderRadius: '20px', border: `1.5px solid ${chartField === f.key ? f.color : 'var(--border)'}`,
                  background: chartField === f.key ? `${f.color}20` : 'transparent',
                  color: chartField === f.key ? f.color : 'var(--text-muted)',
                  fontSize: '11px', fontWeight: chartField === f.key ? '700' : '400', cursor: 'pointer',
                }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Gráfico */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <LineChart data={entries} field={chartField} color={selectedField.color} unit={selectedField.unit} />
            </div>

            {/* Resumen rápido */}
            {entries.length >= 2 && (() => {
              const first = entries[0][chartField]
              const last = entries[entries.length - 1][chartField]
              if (first == null || last == null) return null
              const total = parseFloat((last - first).toFixed(1))
              const improved = selectedField.goodDown ? total < 0 : total > 0
              const worsened = selectedField.goodDown ? total > 0 : total < 0
              return (
                <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '12px', background: 'var(--inner-bg)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Cambio total ({entries.length} mediciones)</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: improved ? '#10b981' : worsened ? '#f87171' : 'var(--text-1)' }}>
                    {total > 0 ? '+' : ''}{total}{selectedField.unit}
                  </div>
                  <div style={{ fontSize: '11px', color: improved ? '#10b981' : worsened ? '#f87171' : 'var(--text-muted)', marginTop: '2px' }}>
                    {improved ? '↓ Mejorando' : worsened ? '↑ Pendiente de mejorar' : '= Sin cambio'}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      </div>}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: isMobile ? '20px 16px' : '28px', width: '500px', maxWidth: 'calc(100vw - 24px)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-card)' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: '700', color: 'var(--text-1)' }}>{editing ? 'Editar medición' : 'Nueva medición'}</h3>
            <form onSubmit={save}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Fecha *</label>
                <input type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>
                      {f.label} <span style={{ color: 'var(--text-muted)' }}>({f.unit})</span>
                    </label>
                    <input type="number" step={f.step} min="0" value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder="—"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  {editing ? 'Guardar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
