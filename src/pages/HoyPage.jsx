import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const today = () => new Date().toISOString().split('T')[0]
const dayName = () => new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

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

  const priorityColor = (p) => p === 'alta' ? '#ff3b30' : p === 'media' ? '#ff9500' : '#34c759'

  const card = {
    background: '#fff', borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.07)', padding: '20px 22px',
  }

  const label = {
    fontSize: '11px', fontWeight: '500', color: '#999',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px',
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
          {dayName()}
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.03em', color: '#111' }}>
          Buen día, {user?.user_metadata?.full_name?.split(' ')[0] || 'hola'}
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Eventos hoy', value: events.length, color: '#5856d6' },
          { label: 'Tareas pendientes', value: tasks.length, color: '#ff9500' },
          { label: 'Hábitos', value: `${habitLogs.length}/${habits.length}`, color: '#34c759' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.07)', padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Eventos */}
        <div style={card}>
          <div style={label}>Agenda de hoy</div>
          {events.length === 0
            ? <p style={{ fontSize: '13px', color: '#bbb' }}>Sin eventos hoy</p>
            : events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '2px', background: ev.color || '#5856d6', borderRadius: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{ev.title}</div>
                  {ev.start_time && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{ev.start_time.slice(0,5)}{ev.end_time ? ` – ${ev.end_time.slice(0,5)}` : ''}</div>}
                </div>
              </div>
            ))
          }
        </div>

        {/* Hábitos */}
        <div style={card}>
          <div style={label}>Hábitos de hoy</div>
          {habits.length === 0
            ? <p style={{ fontSize: '13px', color: '#bbb' }}>Agrega hábitos en la sección Hábitos</p>
            : habits.map(h => {
              const done = habitLogs.some(l => l.habit_id === h.id)
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <button onClick={() => toggleHabit(h)} style={{
                    width: '17px', height: '17px', borderRadius: '4px', flexShrink: 0,
                    border: `1.5px solid ${done ? (h.color || '#5856d6') : '#ddd'}`,
                    background: done ? (h.color || '#5856d6') : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                  <span style={{ fontSize: '13px', color: done ? '#bbb' : '#333', textDecoration: done ? 'line-through' : 'none' }}>{h.name}</span>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Tareas */}
      <div style={card}>
        <div style={label}>Tareas pendientes</div>
        {tasks.length === 0
          ? <p style={{ fontSize: '13px', color: '#bbb' }}>Sin tareas pendientes</p>
          : tasks.slice(0, 8).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <button onClick={() => toggleTask(t)} style={{
                width: '15px', height: '15px', borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${priorityColor(t.priority)}`, background: 'transparent',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#222' }}>{t.title}</div>
                {t.category && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>{t.category}</div>}
              </div>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor(t.priority) }} />
            </div>
          ))
        }
      </div>
    </div>
  )
}
