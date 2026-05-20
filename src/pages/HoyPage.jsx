import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const today = () => new Date().toISOString().split('T')[0]

const dayName = () => new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()

export default function HoyPage({ user }) {
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])

  useEffect(() => {
    const uid = user.id
    const d = today()
    Promise.all([
      supabase.from('tasks').select('*').eq('user_id', uid).eq('completed', false),
      supabase.from('events').select('*').eq('user_id', uid).eq('date', d).order('start_time'),
      supabase.from('habits').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', uid).eq('date', d),
    ]).then(([t, e, h, hl]) => {
      setTasks(t.data || [])
      setEvents(e.data || [])
      setHabits(h.data || [])
      setHabitLogs(hl.data || [])
    })
  }, [user.id])

  const toggleHabit = async (habit) => {
    const d = today()
    const existing = habitLogs.find(l => l.habit_id === habit.id)
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      setHabitLogs(prev => prev.filter(l => l.id !== existing.id))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ user_id: user.id, habit_id: habit.id, date: d }).select().single()
      if (data) setHabitLogs(prev => [...prev, data])
    }
  }

  const toggleTask = async (task) => {
    await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const doneHabits = habitLogs.length
  const priorityColor = (p) => p === 'alta' ? 'var(--red)' : p === 'media' ? 'var(--yellow)' : 'var(--green)'

  const card = {
    background: 'var(--card-bg)', borderRadius: '14px',
    border: '1px solid var(--border-card)', padding: '20px 22px',
  }

  const sectionLabel = {
    fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px',
  }

  return (
    <div style={{ maxWidth: '820px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: '8px' }}>
          {dayName()}
        </p>
        <h1 style={{ fontSize: '30px', fontWeight: '700', letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
          Buen día, {user?.user_metadata?.full_name?.split(' ')[0] || 'hola'}
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Eventos hoy', value: events.length, color: 'var(--accent)' },
          { label: 'Tareas pendientes', value: tasks.length, color: 'var(--yellow)' },
          { label: 'Hábitos completados', value: `${doneHabits}/${habits.length}`, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ ...card }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Eventos */}
        <div style={card}>
          <div style={sectionLabel}>Agenda de hoy</div>
          {events.length === 0
            ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin eventos hoy</p>
            : events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ width: '2px', borderRadius: '2px', background: ev.color || 'var(--accent)', alignSelf: 'stretch', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-1)' }}>{ev.title}</div>
                  {ev.start_time && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{ev.start_time.slice(0,5)}{ev.end_time ? ` – ${ev.end_time.slice(0,5)}` : ''}</div>}
                </div>
              </div>
            ))
          }
        </div>

        {/* Hábitos */}
        <div style={card}>
          <div style={sectionLabel}>Hábitos de hoy</div>
          {habits.length === 0
            ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Agrega hábitos en la sección Hábitos</p>
            : habits.map(h => {
              const done = habitLogs.some(l => l.habit_id === h.id)
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <button onClick={() => toggleHabit(h)} style={{
                    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                    border: `1.5px solid ${done ? h.color || 'var(--accent)' : 'var(--border-card)'}`,
                    background: done ? (h.color || 'var(--accent)') : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                  <span style={{ fontSize: '13px', color: done ? 'var(--text-muted)' : 'var(--text-2)', textDecoration: done ? 'line-through' : 'none' }}>
                    {h.name}
                  </span>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Tareas */}
      <div style={card}>
        <div style={sectionLabel}>Tareas pendientes</div>
        {tasks.length === 0
          ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin tareas pendientes</p>
          : tasks.slice(0, 8).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => toggleTask(t)} style={{
                width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${priorityColor(t.priority)}`, background: 'transparent',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: '400' }}>{t.title}</div>
                {t.category && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{t.category}</div>}
              </div>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor(t.priority), flexShrink: 0 }} />
            </div>
          ))
        }
      </div>
    </div>
  )
}
