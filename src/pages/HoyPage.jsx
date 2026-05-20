import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const today = () => new Date().toISOString().split('T')[0]

const dayName = () => new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export default function HoyPage({ user }) {
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [routines, setRoutines] = useState([])
  const [routineLogs, setRoutineLogs] = useState([])

  useEffect(() => {
    const uid = user.id
    const d = today()
    Promise.all([
      supabase.from('tasks').select('*').eq('user_id', uid).eq('completed', false),
      supabase.from('events').select('*').eq('user_id', uid).eq('date', d).order('start_time'),
      supabase.from('habits').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', uid).eq('date', d),
      supabase.from('routines').select('*').eq('user_id', uid),
      supabase.from('routine_logs').select('*').eq('user_id', uid).eq('date', d),
    ]).then(([t, e, h, hl, r, rl]) => {
      setTasks(t.data || [])
      setEvents(e.data || [])
      setHabits(h.data || [])
      setHabitLogs(hl.data || [])
      setRoutines(r.data || [])
      setRoutineLogs(rl.data || [])
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
    const now = new Date().toISOString()
    await supabase.from('tasks').update({ completed: true, completed_at: now }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const totalHabits = habits.length
  const doneHabits = habitLogs.length
  const pendingTasks = tasks.filter(t => !t.due_date || t.due_date <= today())

  const card = {
    background: 'var(--card-bg)', borderRadius: '16px',
    border: '1px solid var(--border-card)', padding: '20px 22px',
  }

  const priorityColor = (p) => p === 'alta' ? '#f87171' : p === 'media' ? '#fbbf24' : '#10b981'

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
          {dayName()}
        </p>
        <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
          Buen día, {user?.user_metadata?.full_name?.split(' ')[0] || 'hola'} 👋
        </h1>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Eventos hoy', value: events.length, color: 'var(--accent)' },
          { label: 'Tareas pendientes', value: pendingTasks.length, color: '#fbbf24' },
          { label: `Hábitos ${doneHabits}/${totalHabits}`, value: totalHabits > 0 ? `${Math.round((doneHabits/totalHabits)*100)}%` : '—', color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Eventos del día */}
        <div style={card}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '14px' }}>📅 Agenda de hoy</div>
          {events.length === 0
            ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin eventos hoy</p>
            : events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ width: '3px', borderRadius: '2px', background: ev.color || 'var(--accent)', alignSelf: 'stretch', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)' }}>{ev.title}</div>
                  {ev.start_time && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.start_time.slice(0,5)}{ev.end_time ? ` – ${ev.end_time.slice(0,5)}` : ''}</div>}
                </div>
              </div>
            ))
          }
        </div>

        {/* Hábitos */}
        <div style={card}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '14px' }}>🔥 Hábitos de hoy</div>
          {habits.length === 0
            ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Agrega hábitos en la sección Hábitos</p>
            : habits.map(h => {
              const done = habitLogs.some(l => l.habit_id === h.id)
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <button
                    onClick={() => toggleHabit(h)}
                    style={{
                      width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${done ? h.color || '#10b981' : 'var(--border)'}`,
                      background: done ? (h.color || '#10b981') : 'transparent', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px',
                    }}
                  >
                    {done ? '✓' : ''}
                  </button>
                  <span style={{ fontSize: '13px', color: done ? 'var(--text-muted)' : 'var(--text-1)', textDecoration: done ? 'line-through' : 'none' }}>
                    {h.icon} {h.name}
                  </span>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Tareas pendientes */}
      <div style={card}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '14px' }}>✅ Tareas pendientes</div>
        {pendingTasks.length === 0
          ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin tareas pendientes 🎉</p>
          : pendingTasks.slice(0, 8).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => toggleTask(t)}
                style={{
                  width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${priorityColor(t.priority)}`,
                  background: 'transparent', flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text-1)' }}>{t.title}</div>
                {t.category && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.category}</div>}
              </div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: priorityColor(t.priority), flexShrink: 0 }} />
            </div>
          ))
        }
      </div>
    </div>
  )
}
