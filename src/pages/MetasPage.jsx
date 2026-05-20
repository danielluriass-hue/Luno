import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { title: '', description: '', period: 'mensual', progress: 0, due_date: '' }
const PERIODS = [{ key: 'semanal', label: 'Semanal' }, { key: 'mensual', label: 'Mensual' }, { key: 'anual', label: 'Anual' }]

export default function MetasPage({ user }) {
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('todas')

  useEffect(() => {
    supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setGoals(data || []))
  }, [user.id])

  const save = async (e) => {
    e.preventDefault()
    if (editing) {
      const { data } = await supabase.from('goals').update(form).eq('id', editing).select().single()
      if (data) setGoals(prev => prev.map(g => g.id === editing ? data : g))
    } else {
      const { data } = await supabase.from('goals').insert({ ...form, user_id: user.id }).select().single()
      if (data) setGoals(prev => [data, ...prev])
    }
    setForm(emptyForm); setShowForm(false); setEditing(null)
  }

  const updateProgress = async (goal, val) => {
    const progress = Math.min(100, Math.max(0, val))
    const completed = progress === 100
    const { data } = await supabase.from('goals').update({ progress, completed }).eq('id', goal.id).select().single()
    if (data) setGoals(prev => prev.map(g => g.id === data.id ? data : g))
  }

  const del = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const filtered = goals.filter(g => {
    if (filter === 'completadas') return g.completed
    if (filter === 'activas') return !g.completed
    return true
  })

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px 22px', marginBottom: '12px' }

  const periodColor = (p) => p === 'semanal' ? '#38bdf8' : p === 'mensual' ? 'var(--accent)' : '#fbbf24'

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em' }}>Metas</h1>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '600', fontSize: '13px' }}>
          + Nueva meta
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: goals.length, color: 'var(--text-1)' },
          { label: 'Activas', value: goals.filter(g => !g.completed).length, color: 'var(--accent)' },
          { label: 'Completadas', value: goals.filter(g => g.completed).length, color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border-card)', padding: '16px 18px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--card-bg)', borderRadius: '14px', padding: '4px', border: '1px solid var(--border-card)', marginBottom: '16px', width: 'fit-content' }}>
        {['todas', 'activas', 'completadas'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: '10px', border: 'none', background: filter === f ? 'var(--accent-soft)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--text-muted)', fontWeight: filter === f ? '700' : '400', fontSize: '13px' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sin metas aún. ¡Agrega tu primera!</p>
        </div>
      )}

      {filtered.map(g => (
        <div key={g.id} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: periodColor(g.period), background: `${periodColor(g.period)}18`, padding: '2px 8px', borderRadius: '6px' }}>
                  {g.period}
                </span>
                {g.completed && <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>✓ Completada</span>}
                {g.due_date && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📅 {g.due_date}</span>}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '2px' }}>{g.title}</div>
              {g.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{g.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => { setForm({ title: g.title, description: g.description || '', period: g.period, progress: g.progress, due_date: g.due_date || '' }); setEditing(g.id); setShowForm(true) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>✏️</button>
              <button onClick={() => del(g.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>🗑️</button>
            </div>
          </div>
          {/* Progress */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Progreso</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: g.completed ? '#10b981' : 'var(--accent)' }}>{g.progress}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--inner-bg)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${g.progress}%`, background: g.completed ? '#10b981' : 'var(--accent)', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 25, 50, 75, 100].map(v => (
              <button key={v} onClick={() => updateProgress(g, v)}
                style={{ flex: 1, padding: '5px', borderRadius: '8px', border: `1px solid ${g.progress === v ? 'var(--accent)' : 'var(--border)'}`, background: g.progress === v ? 'var(--accent-soft)' : 'transparent', color: g.progress === v ? 'var(--accent)' : 'var(--text-muted)', fontSize: '11px', fontWeight: '600' }}>
                {v}%
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '28px', width: '420px', border: '1px solid var(--border-card)' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: '700' }}>{editing ? 'Editar meta' : 'Nueva meta'}</h3>
            <form onSubmit={save}>
              {[['Título *', 'title', 'text', true], ['Descripción', 'description', 'text', false], ['Fecha límite', 'due_date', 'date', false]].map(([lbl, key, type, req]) => (
                <div key={key} style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>{lbl}</label>
                  <input type={type} required={req} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Período</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PERIODS.map(p => (
                    <button key={p.key} type="button" onClick={() => setForm(prev => ({ ...prev, period: p.key }))}
                      style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `2px solid ${form.period === p.key ? 'var(--accent)' : 'var(--border)'}`, background: form.period === p.key ? 'var(--accent-soft)' : 'transparent', color: form.period === p.key ? 'var(--accent)' : 'var(--text-muted)', fontWeight: '600', fontSize: '12px' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Progreso inicial: {form.progress}%</label>
                <input type="range" min="0" max="100" step="5" value={form.progress} onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))} style={{ width: '100%' }} />
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
