import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function NotasPage({ user }) {
  const [notes, setNotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('notes').select('*').eq('user_id', user.id).order('pinned', { ascending: false }).order('updated_at', { ascending: false })
      .then(({ data }) => { setNotes(data || []); if (data?.length) setSelected(data[0]) })
  }, [user.id])

  const save = async () => {
    if (!form.content.trim()) return
    if (selected && editing) {
      const { data } = await supabase.from('notes').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id).select().single()
      if (data) { setNotes(prev => prev.map(n => n.id === data.id ? data : n)); setSelected(data) }
    } else {
      const { data } = await supabase.from('notes').insert({ ...form, user_id: user.id }).select().single()
      if (data) { setNotes(prev => [data, ...prev]); setSelected(data) }
    }
    setEditing(false)
  }

  const del = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    setSelected(remaining[0] || null)
    setEditing(false)
  }

  const pin = async (note) => {
    const { data } = await supabase.from('notes').update({ pinned: !note.pinned }).eq('id', note.id).select().single()
    if (data) { setNotes(prev => prev.map(n => n.id === data.id ? data : n).sort((a, b) => b.pinned - a.pinned)); if (selected?.id === data.id) setSelected(data) }
  }

  const newNote = () => { setForm({ title: '', content: '' }); setSelected(null); setEditing(true) }

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 80px)', maxWidth: '900px' }}>
      {/* Lista */}
      <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <button onClick={newNote}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px', fontWeight: '700', fontSize: '13px', width: '100%', boxShadow: '0 4px 14px -4px var(--accent-glow)' }}>
          + Nueva nota
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
          style={{ padding: '9px 12px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px', width: '100%' }} />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(n => (
            <button key={n.id} onClick={() => { setSelected(n); setEditing(false) }}
              style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', border: `1px solid ${selected?.id === n.id ? 'var(--accent-bright)' : 'var(--border-card)'}`, background: selected?.id === n.id ? 'var(--accent-soft)' : 'var(--card-bg)', cursor: 'pointer', width: '100%' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '500', color: 'var(--text-1)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {n.pinned && <span style={{ fontSize: '10px' }}>📌</span>}
                {n.title || 'Sin título'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {new Date(n.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Sin notas</p>}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        {(editing || selected) ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              {editing
                ? <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título de la nota"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '500', background: 'transparent', border: 'none', color: 'var(--text-1)', flex: 1 }} />
                : <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '500', flex: 1 }}>{selected?.title || 'Sin título'}</h2>
              }
              <div style={{ display: 'flex', gap: '8px' }}>
                {!editing && selected && <button onClick={() => pin(selected)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px' }}>{selected.pinned ? '📌' : '📍'}</button>}
                {!editing && selected && <button onClick={() => { setForm({ title: selected.title || '', content: selected.content }); setEditing(true) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px' }}>✏️</button>}
                {!editing && selected && <button onClick={() => del(selected.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px' }}>🗑️</button>}
                {editing && <button onClick={save} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 14px -4px var(--accent-glow)' }}>Guardar</button>}
                {editing && <button onClick={() => setEditing(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>Cancelar</button>}
              </div>
            </div>
            {editing
              ? <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value })) } placeholder="Escribe tu nota aquí..."
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: '14px', lineHeight: '1.7', resize: 'none', outline: 'none' }} />
              : <div style={{ flex: 1, fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.7', whiteSpace: 'pre-wrap', overflowY: 'auto' }}>{selected?.content}</div>
            }
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '32px' }}>📝</p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Selecciona una nota o crea una nueva</p>
          </div>
        )}
      </div>
    </div>
  )
}
