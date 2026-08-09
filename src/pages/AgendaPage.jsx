import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateStr } from '../lib/dateUtils'

const COLORS = ['#818cf8', '#10b981', '#f87171', '#fbbf24', '#f472b6', '#38bdf8']

const emptyForm = { title: '', description: '', date: '', start_time: '', end_time: '', color: '#818cf8', reminder_email: false }

export default function AgendaPage({ user }) {
  const [events, setEvents] = useState([])
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(() => localDateStr())
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.from('events').select('*').eq('user_id', user.id).order('date').then(({ data }) => setEvents(data || []))
  }, [user.id])

  const save = async (e) => {
    e.preventDefault()
    if (editing) {
      const { data } = await supabase.from('events').update(form).eq('id', editing).select().single()
      if (data) setEvents(prev => prev.map(ev => ev.id === editing ? data : ev))
    } else {
      const { data } = await supabase.from('events').insert({ ...form, user_id: user.id }).select().single()
      if (data) setEvents(prev => [...prev, data])
    }
    setForm(emptyForm); setShowForm(false); setEditing(null)
  }

  const del = async (id) => {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(ev => ev.id !== id))
  }

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
  const firstDay = (y, m) => new Date(y, m, 1).getDay()

  const { y, m } = month
  const totalDays = daysInMonth(y, m)
  const startDay = firstDay(y, m)
  const today = localDateStr()

  const dayEvents = events.filter(ev => ev.date === selected).sort((a, b) => (a.start_time || '') > (b.start_time || '') ? 1 : -1)

  const pad = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px' }
  const dowNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const eventsOn = (dateStr) => events.filter(ev => ev.date === dateStr)
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: '500', letterSpacing: '-0.01em' }}>Agenda</h1>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '600', fontSize: '13px', boxShadow: '0 4px 14px -4px var(--accent-glow)' }}>
          + Nuevo evento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Calendario */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <button onClick={() => setMonth(p => { const d = new Date(p.y, p.m - 1); return { y: d.getFullYear(), m: d.getMonth() } })}
              style={{ background: 'var(--inner-bg)', border: '1px solid var(--border)', borderRadius: '8px', width: '30px', height: '30px', color: 'var(--text-2)', fontSize: '16px', cursor: 'pointer' }}>‹</button>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: '500', fontSize: '20px', color: 'var(--text-1)' }}>
              {cap(new Date(y, m).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}
            </span>
            <button onClick={() => setMonth(p => { const d = new Date(p.y, p.m + 1); return { y: d.getFullYear(), m: d.getMonth() } })}
              style={{ background: 'var(--inner-bg)', border: '1px solid var(--border)', borderRadius: '8px', width: '30px', height: '30px', color: 'var(--text-2)', fontSize: '16px', cursor: 'pointer' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
            {dowNames.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-2)', fontWeight: '700', padding: '8px 0', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--inner-bg)' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {Array(startDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(totalDays).fill(null).map((_, i) => {
              const d = i + 1
              const dateStr = pad(d)
              const dayEvs = eventsOn(dateStr)
              const isToday = dateStr === today
              const isSel = dateStr === selected
              const visible = dayEvs.slice(0, 2)
              const extra = dayEvs.length - visible.length
              return (
                <button key={d} onClick={() => setSelected(dateStr)}
                  style={{
                    borderRadius: '12px', padding: '8px', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '82px',
                    background: isSel ? 'var(--accent-soft)' : 'var(--inner-bg)',
                    border: isSel ? '2px solid var(--accent-bright)' : isToday ? '1px solid var(--accent-bright)' : '1px solid var(--border)',
                  }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '13px',
                    fontWeight: isSel || isToday ? '700' : '600',
                    color: isSel || isToday ? 'var(--accent-bright)' : 'var(--text-1)',
                  }}>{d}</span>
                  {visible.map(ev => (
                    <span key={ev.id} style={{
                      fontSize: '10px', fontWeight: '600', padding: '1px 5px', borderRadius: '5px',
                      background: ev.color + '26', color: ev.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{ev.title}</span>
                  ))}
                  {extra > 0 && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>+{extra} más</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Eventos del día seleccionado */}
        <div style={card}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '14px' }}>
            {cap(new Date(selected + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}
          </div>
          {dayEvents.length === 0
            ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin eventos este día</p>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {dayEvents.map(ev => (
                <div key={ev.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--inner-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px' }}>
                  <div style={{ width: '3px', borderRadius: '2px', background: ev.color, alignSelf: 'stretch', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)' }}>{ev.title}</div>
                    {ev.start_time && <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: 'var(--text-muted)' }}>{ev.start_time.slice(0,5)}{ev.end_time ? ` – ${ev.end_time.slice(0,5)}` : ''}</div>}
                    {ev.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ev.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setForm({ title: ev.title, description: ev.description || '', date: ev.date, start_time: ev.start_time || '', end_time: ev.end_time || '', color: ev.color, reminder_email: ev.reminder_email }); setEditing(ev.id); setShowForm(true) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>✏️</button>
                    <button onClick={() => del(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '28px', width: '420px', border: '1px solid var(--border-card)' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: '700' }}>{editing ? 'Editar evento' : 'Nuevo evento'}</h3>
            <form onSubmit={save}>
              {[['Título *', 'title', 'text', true], ['Descripción', 'description', 'text', false], ['Fecha *', 'date', 'date', true], ['Hora inicio', 'start_time', 'time', false], ['Hora fin', 'end_time', 'time', false]].map(([lbl, key, type, req]) => (
                <div key={key} style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>{lbl}</label>
                  <input type={type} required={req} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input type="checkbox" id="reminder" checked={form.reminder_email} onChange={e => setForm(p => ({ ...p, reminder_email: e.target.checked }))} />
                <label htmlFor="reminder" style={{ fontSize: '13px', color: 'var(--text-2)' }}>Recordatorio por email</label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: '600' }}>
                  Cancelar
                </button>
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
