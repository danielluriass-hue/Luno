import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FIELDS = [
  { key: 'weight',       label: 'Peso',           unit: 'kg',  step: '0.1', goodDown: true  },
  { key: 'body_fat',     label: 'Grasa corporal', unit: '%',   step: '0.1', goodDown: true  },
  { key: 'visceral_fat', label: 'Grasa visceral', unit: 'pts', step: '1',   goodDown: true  },
  { key: 'waist_cm',     label: 'Cintura',        unit: 'cm',  step: '0.5', goodDown: true  },
  { key: 'chest_cm',     label: 'Pecho',          unit: 'cm',  step: '0.5', goodDown: false },
  { key: 'glutes_cm',    label: 'Glúteo',         unit: 'cm',  step: '0.5', goodDown: false },
  { key: 'arm_cm',       label: 'Brazo',          unit: 'cm',  step: '0.5', goodDown: false },
  { key: 'leg_cm',       label: 'Muslo',          unit: 'cm',  step: '0.5', goodDown: false },
]

const emptyForm = { date: new Date().toISOString().split('T')[0], ...Object.fromEntries(FIELDS.map(f => [f.key, ''])) }

export default function MejorasPage({ user }) {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => setEntries(data || []))
  }, [user.id])

  const save = async (e) => {
    e.preventDefault()
    const payload = { ...form, user_id: user.id }
    FIELDS.forEach(f => { if (payload[f.key] === '' || payload[f.key] === null) payload[f.key] = null; else payload[f.key] = parseFloat(payload[f.key]) })
    if (editing) {
      const { data } = await supabase.from('body_measurements').update(payload).eq('id', editing).select().single()
      if (data) setEntries(prev => prev.map(e => e.id === editing ? data : e))
    } else {
      const { data } = await supabase.from('body_measurements').insert(payload).select().single()
      if (data) setEntries(prev => [data, ...prev])
    }
    setForm(emptyForm); setShowForm(false); setEditing(null)
  }

  const del = async (id) => {
    await supabase.from('body_measurements').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const diff = (curr, prev) => {
    if (curr == null || prev == null) return null
    return parseFloat((curr - prev).toFixed(1))
  }

  const latest = entries[0]
  const previous = entries[1]
  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px 22px' }

  return (
    <div style={{ maxWidth: '820px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em' }}>Mejoras</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>Mediciones corporales semanales</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '600', fontSize: '13px' }}>
          + Nueva medición
        </button>
      </div>

      {/* Comparación última vs anterior */}
      {latest && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Última medición
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(latest.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              {previous && <span> · vs {new Date(previous.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
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
                    {c != null ? c : '—'}{c != null ? <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)' }}>{f.unit}</span> : ''}
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

      {/* Historial */}
      {entries.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Historial</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: '500', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Fecha</th>
                  {FIELDS.map(f => (
                    <th key={f.key} style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: '500', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {f.label}
                    </th>
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
                      const p = entries[idx + 1]?.[f.key]
                      const d = diff(c, p)
                      const improved = d != null && d !== 0 && (f.goodDown ? d < 0 : d > 0)
                      const worsened = d != null && d !== 0 && (f.goodDown ? d > 0 : d < 0)
                      return (
                        <td key={f.key} style={{ padding: '9px 8px', textAlign: 'right', borderBottom: '1px solid var(--border)', color: c != null ? (improved ? '#10b981' : worsened ? '#f87171' : 'var(--text-1)') : 'var(--text-muted)' }}>
                          {c != null ? `${c}` : '—'}
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
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Registra tu primera medición y comienza a ver tu progreso semana a semana</p>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '28px', width: '500px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-card)' }}>
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
                    <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>{f.label} <span style={{ color: 'var(--text-muted)' }}>({f.unit})</span></label>
                    <input type="number" step={f.step} min="0" value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder="—"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: '600', fontSize: '14px' }}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: '700', fontSize: '14px' }}>
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
