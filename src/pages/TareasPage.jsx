import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { title: '', description: '', priority: 'media', category: '', due_date: '' }
const PRIORITIES = [{ key: 'alta', label: 'Alta', color: '#f87171' }, { key: 'media', label: 'Media', color: '#fbbf24' }, { key: 'baja', label: 'Baja', color: '#10b981' }]

export default function TareasPage({ user }) {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('pendientes')

  useEffect(() => {
    supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setTasks(data || []))
  }, [user.id])

  const save = async (e) => {
    e.preventDefault()
    if (editing) {
      const { data } = await supabase.from('tasks').update(form).eq('id', editing).select().single()
      if (data) setTasks(prev => prev.map(t => t.id === editing ? data : t))
    } else {
      const { data } = await supabase.from('tasks').insert({ ...form, user_id: user.id }).select().single()
      if (data) setTasks(prev => [data, ...prev])
    }
    setForm(emptyForm); setShowForm(false); setEditing(null)
  }

  const toggle = async (task) => {
    const now = task.completed ? null : new Date().toISOString()
    const { data } = await supabase.from('tasks').update({ completed: !task.completed, completed_at: now }).eq('id', task.id).select().single()
    if (data) setTasks(prev => prev.map(t => t.id === task.id ? data : t))
  }

  const del = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t => filter === 'completadas' ? t.completed : !t.completed)
  const priorityColor = (p) => PRIORITIES.find(x => x.key === p)?.color || '#64748b'

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px 22px' }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: '500', letterSpacing: '-0.01em' }}>Tareas</h1>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '600', fontSize: '13px', boxShadow: '0 4px 14px -4px var(--accent-glow)' }}>
          + Nueva tarea
        </button>
      </div>

      {/* Filtro */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--card-bg)', borderRadius: '14px', padding: '4px', border: '1px solid var(--border-card)', marginBottom: '16px', width: 'fit-content' }}>
        {['pendientes', 'completadas'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: '10px', border: 'none', background: filter === f ? 'var(--accent-soft)' : 'transparent', color: filter === f ? 'var(--accent-bright)' : 'var(--text-muted)', fontWeight: filter === f ? '700' : '400', fontSize: '13px' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={card}>
        {filtered.length === 0
          ? <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              {filter === 'pendientes' ? 'Sin tareas pendientes 🎉' : 'Sin tareas completadas'}
            </p>
          : filtered.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '3px', flexShrink: 0, background: priorityColor(t.priority) }} />
              <button onClick={() => toggle(t)}
                style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${priorityColor(t.priority)}`, background: t.completed ? priorityColor(t.priority) : 'transparent', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px' }}>
                {t.completed ? '✓' : ''}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: t.completed ? 'var(--text-muted)' : 'var(--text-1)', textDecoration: t.completed ? 'line-through' : 'none', fontWeight: '500' }}>{t.title}</div>
                {t.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.description}</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                  {t.category && <span style={{ fontSize: '11px', background: 'var(--inner-bg)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '6px' }}>{t.category}</span>}
                  {t.due_date && <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: 'var(--text-muted)' }}>📅 {t.due_date}</span>}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', color: priorityColor(t.priority), fontWeight: '600' }}>{t.priority}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={() => { setForm({ title: t.title, description: t.description || '', priority: t.priority, category: t.category || '', due_date: t.due_date || '' }); setEditing(t.id); setShowForm(true) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>✏️</button>
                <button onClick={() => del(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>🗑️</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '28px', width: '420px', border: '1px solid var(--border-card)' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: '700' }}>{editing ? 'Editar tarea' : 'Nueva tarea'}</h3>
            <form onSubmit={save}>
              {[['Título *', 'title', 'text', true], ['Descripción', 'description', 'text', false], ['Categoría', 'category', 'text', false], ['Fecha límite', 'due_date', 'date', false]].map(([lbl, key, type, req]) => (
                <div key={key} style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>{lbl}</label>
                  <input type={type} required={req} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Prioridad</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PRIORITIES.map(p => (
                    <button key={p.key} type="button" onClick={() => setForm(prev => ({ ...prev, priority: p.key }))}
                      style={{ flex: 1, padding: '8px', borderRadius: '10px', border: `2px solid ${form.priority === p.key ? p.color : 'var(--border)'}`, background: form.priority === p.key ? `${p.color}20` : 'transparent', color: p.color, fontWeight: '600', fontSize: '13px' }}>
                      {p.label}
                    </button>
                  ))}
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
