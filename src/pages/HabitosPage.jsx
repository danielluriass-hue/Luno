import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../lib/useIsMobile'
import { localDateStr } from '../lib/dateUtils'

const today = () => localDateStr()
const ICONS = ['💧','🏃','📚','🧘','🥗','😴','💊','🏋️','✍️','🎯','🧹','🎵']
const COLORS = ['#10b981','#818cf8','#f87171','#fbbf24','#f472b6','#38bdf8']
const emptyForm = { name: '', icon: '⭐', color: '#10b981', frequency: 'diario', description: '', hora_inicio: '', hora_fin: '' }

export default function HabitosPage({ user }) {
  const isMobile = useIsMobile()
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.from('habits').select('*').eq('user_id', user.id).order('created_at').then(({ data }) => setHabits(data || []))
    supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('date', getWeekStart()).then(({ data }) => setLogs(data || []))
  }, [user.id])

  const getWeekStart = () => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return localDateStr(d)
  }

  const getLast7 = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return localDateStr(d)
    })
  }

  const toggle = async (habit) => {
    const d = today()
    const existing = logs.find(l => l.habit_id === habit.id && l.date === d)
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      setLogs(prev => prev.filter(l => l.id !== existing.id))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ user_id: user.id, habit_id: habit.id, date: d }).select().single()
      if (data) setLogs(prev => [...prev, data])
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (editing) {
      const { data } = await supabase.from('habits').update(form).eq('id', editing).select().single()
      if (data) setHabits(prev => prev.map(h => h.id === editing ? data : h))
    } else {
      const { data } = await supabase.from('habits').insert({ ...form, user_id: user.id }).select().single()
      if (data) setHabits(prev => [...prev, data])
    }
    setForm(emptyForm); setShowForm(false); setEditing(null)
  }

  const del = async (id) => {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setLogs(prev => prev.filter(l => l.habit_id !== id))
  }

  const last7 = getLast7()
  const todayStr = today()

  const getStreak = (habit) => {
    let streak = 0
    const d = new Date()
    while (true) {
      const dateStr = localDateStr(d)
      if (logs.some(l => l.habit_id === habit.id && l.date === dateStr)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak
  }

  const timeRange = (h) => {
    if (!h.hora_inicio) return null
    return h.hora_fin ? `${h.hora_inicio} - ${h.hora_fin}` : h.hora_inicio
  }

  const sortedHabits = [...habits].sort((a, b) => {
    if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio)
    if (a.hora_inicio) return -1
    if (b.hora_inicio) return 1
    return 0
  })

  const withTime = sortedHabits.filter(h => h.hora_inicio)
  const withoutTime = sortedHabits.filter(h => !h.hora_inicio)

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px 22px' }
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13px', boxSizing: 'border-box' }

  const renderGridRows = (list, showSeparator) => list.map((h, idx) => (
    <>
      {showSeparator && idx === 0 && (
        <div key={`sep-label`} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0 2px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sin horario</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
      )}
      <div key={`n${h.id}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: isMobile ? '12px' : '13px', color: 'var(--text-1)' }}>
          <span style={{ flexShrink: 0 }}>{h.icon}</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
        </div>
        {timeRange(h) && (
          <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: '600', marginTop: '1px', paddingLeft: '20px' }}>{timeRange(h)}</div>
        )}
      </div>
      {last7.map(d => {
        const done = logs.some(l => l.habit_id === h.id && l.date === d)
        const isToday = d === todayStr
        return (
          <button key={`${h.id}${d}`} onClick={isToday ? () => toggle(h) : undefined}
            style={{ width: isMobile ? '30px' : '28px', height: isMobile ? '30px' : '28px', borderRadius: '8px', margin: '0 auto', display: 'block', border: `2px solid ${done ? h.color : 'var(--border)'}`, background: done ? h.color : 'transparent', cursor: isToday ? 'pointer' : 'default', color: '#fff', fontSize: '12px' }}>
            {done ? '✓' : ''}
          </button>
        )
      })}
    </>
  ))

  const renderHabitCard = (h) => {
    const doneToday = logs.some(l => l.habit_id === h.id && l.date === todayStr)
    const streak = getStreak(h)
    const weekDone = last7.filter(d => logs.some(l => l.habit_id === h.id && l.date === d)).length
    return (
      <div key={h.id} style={{ ...card, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => toggle(h)}
          style={{ width: '44px', height: '44px', borderRadius: '14px', border: `2px solid ${doneToday ? h.color : 'var(--border)'}`, background: doneToday ? h.color : 'transparent', fontSize: '20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {h.icon}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-1)' }}>{h.name}</div>
          {h.description && (
            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '1px' }}>{h.description}</div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>🔥 {streak} días · {weekDone}/7 esta semana</span>
            {timeRange(h) && <span style={{ color: 'var(--accent)', fontWeight: '600' }}>⏰ {timeRange(h)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => { setForm({ name: h.name, icon: h.icon, color: h.color, frequency: h.frequency, description: h.description || '', hora_inicio: h.hora_inicio || '', hora_fin: h.hora_fin || '' }); setEditing(h.id); setShowForm(true) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>✏️</button>
          <button onClick={() => del(h.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>🗑️</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em' }}>Hábitos</h1>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
          + Nuevo hábito
        </button>
      </div>

      {/* Grid últimos 7 días */}
      <div style={{ ...card, marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Últimos 7 días</div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `${isMobile ? '120px' : '180px'} repeat(7, ${isMobile ? '36px' : '1fr'})`, gap: '6px', alignItems: 'center', minWidth: isMobile ? '400px' : 'auto' }}>
            <div />
            {last7.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: d === todayStr ? 'var(--accent)' : 'var(--text-muted)', fontWeight: d === todayStr ? '700' : '400' }}>
                {new Date(d + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2).toUpperCase()}
                <br />
                <span style={{ fontSize: '11px' }}>{new Date(d + 'T12:00').getDate()}</span>
              </div>
            ))}
            {renderGridRows(withTime, false)}
            {renderGridRows(withoutTime, withTime.length > 0)}
          </div>
        </div>
      </div>

      {/* Lista de hábitos */}
      {withTime.map(h => renderHabitCard(h))}

      {withoutTime.length > 0 && withTime.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0 10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sin horario</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
      )}

      {withoutTime.map(h => renderHabitCard(h))}

      {habits.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Agrega tu primer hábito y comienza tu racha</p>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '12px' }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-card)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: '700' }}>{editing ? 'Editar hábito' : 'Nuevo hábito'}</h3>
            <form onSubmit={save}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Nombre *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Descripción</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="¿En qué consiste este hábito?" rows={2}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>
                  Horario <span style={{ color: 'var(--text-muted)' }}>(opcional)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))}
                    style={{ ...inputStyle, flex: 1, width: 'auto' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', flexShrink: 0 }}>→</span>
                  <input type="time" value={form.hora_fin} onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))}
                    style={{ ...inputStyle, flex: 1, width: 'auto' }} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Ícono</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setForm(p => ({ ...p, icon: ic }))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: `2px solid ${form.icon === ic ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--inner-bg)', fontSize: '18px', cursor: 'pointer' }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
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
