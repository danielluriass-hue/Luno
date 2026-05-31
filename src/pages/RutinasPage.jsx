import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateStr } from '../lib/dateUtils'

const today = () => localDateStr()
const TYPES = [{ key: 'manana', label: '🌅 Mañana' }, { key: 'noche', label: '🌙 Noche' }, { key: 'personalizada', label: '⚙️ Personalizada' }]

export default function RutinasPage({ user }) {
  const [routines, setRoutines] = useState([])
  const [logs, setLogs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'manana', items: [] })
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    supabase.from('routines').select('*').eq('user_id', user.id).order('created_at').then(({ data }) => setRoutines(data || []))
    supabase.from('routine_logs').select('*').eq('user_id', user.id).eq('date', today()).then(({ data }) => setLogs(data || []))
  }, [user.id])

  const toggleItem = async (routine, itemIdx) => {
    const d = today()
    const log = logs.find(l => l.routine_id === routine.id)
    const completedItems = log ? [...(log.completed_items || [])] : []
    const already = completedItems.includes(itemIdx)
    const updated = already ? completedItems.filter(i => i !== itemIdx) : [...completedItems, itemIdx]

    if (log) {
      const { data } = await supabase.from('routine_logs').update({ completed_items: updated }).eq('id', log.id).select().single()
      if (data) setLogs(prev => prev.map(l => l.id === data.id ? data : l))
    } else {
      const { data } = await supabase.from('routine_logs').insert({ user_id: user.id, routine_id: routine.id, date: d, completed_items: updated }).select().single()
      if (data) setLogs(prev => [...prev, data])
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (editing) {
      const { data } = await supabase.from('routines').update(form).eq('id', editing).select().single()
      if (data) setRoutines(prev => prev.map(r => r.id === editing ? data : r))
    } else {
      const { data } = await supabase.from('routines').insert({ ...form, user_id: user.id }).select().single()
      if (data) setRoutines(prev => [...prev, data])
    }
    setForm({ name: '', type: 'manana', items: [] }); setShowForm(false); setEditing(null)
  }

  const del = async (id) => {
    await supabase.from('routines').delete().eq('id', id)
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  const addItem = () => {
    if (!newItem.trim()) return
    setForm(p => ({ ...p, items: [...(p.items || []), newItem.trim()] }))
    setNewItem('')
  }

  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px 22px', marginBottom: '12px' }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em' }}>Rutinas</h1>
        <button onClick={() => { setForm({ name: '', type: 'manana', items: [] }); setEditing(null); setShowForm(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '600', fontSize: '13px' }}>
          + Nueva rutina
        </button>
      </div>

      {routines.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>🌅</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Crea tu primera rutina de mañana o noche</p>
        </div>
      )}

      {routines.map(r => {
        const items = r.items || []
        const log = logs.find(l => l.routine_id === r.id)
        const completed = log?.completed_items || []
        const pct = items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0
        const typeLabel = TYPES.find(t => t.key === r.type)?.label || r.type

        return (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-1)' }}>{r.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{typeLabel} · {pct}% completado hoy</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => { setForm({ name: r.name, type: r.type, items: r.items || [] }); setEditing(r.id); setShowForm(true) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>✏️</button>
                <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>🗑️</button>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: '4px', background: 'var(--inner-bg)', borderRadius: '2px', marginBottom: '14px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : 'var(--accent)', transition: 'width 0.3s' }} />
            </div>

            {items.map((item, idx) => {
              const done = completed.includes(idx)
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <button onClick={() => toggleItem(r, idx)}
                    style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`, background: done ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px' }}>
                    {done ? '✓' : ''}
                  </button>
                  <span style={{ fontSize: '13px', color: done ? 'var(--text-muted)' : 'var(--text-1)', textDecoration: done ? 'line-through' : 'none' }}>{item}</span>
                </div>
              )
            })}
            {items.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin pasos aún — edita la rutina para agregar</p>}
          </div>
        )
      })}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '28px', width: '440px', border: '1px solid var(--border-card)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: '700' }}>{editing ? 'Editar rutina' : 'Nueva rutina'}</h3>
            <form onSubmit={save}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Nombre *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Tipo</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {TYPES.map(t => (
                    <button key={t.key} type="button" onClick={() => setForm(p => ({ ...p, type: t.key }))}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: '10px', border: `2px solid ${form.type === t.key ? 'var(--accent)' : 'var(--border)'}`, background: form.type === t.key ? 'var(--accent-soft)' : 'transparent', color: form.type === t.key ? 'var(--accent)' : 'var(--text-muted)', fontWeight: '600', fontSize: '12px' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Pasos</label>
                {(form.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-1)', flex: 1 }}>{idx + 1}. {item}</span>
                    <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px' }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())} placeholder="Agregar paso..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
                  <button type="button" onClick={addItem}
                    style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: '700' }}>+</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: '700' }}>
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
