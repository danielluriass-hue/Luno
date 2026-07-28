import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CalendarioView from './CalendarioView'

import { localDateStr } from '../lib/dateUtils'
const todayStr = () => localDateStr()
const dayName = () => new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const getPeriodRange = (period) => {
  const now = new Date()
  const today = localDateStr(now)
  if (period === 'HOY') return { from: today, to: today }
  if (period === 'SEMANA') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { from: localDateStr(start), to: localDateStr(end) }
  }
  // MES
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: localDateStr(start), to: localDateStr(end) }
}

export default function HoyPage({ user }) {
  const [period, setPeriod] = useState('HOY')
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])

  useEffect(() => {
    const uid = user.id
    const { from, to } = getPeriodRange(period)

    Promise.all([
      supabase.from('tasks').select('*').eq('user_id', uid).eq('completed', false),
      supabase.from('events').select('*').eq('user_id', uid).gte('date', from).lte('date', to).order('date').order('start_time'),
      supabase.from('habits').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', uid).gte('date', from).lte('date', to),
      supabase.from('tasks').select('*').eq('user_id', uid).eq('completed', true).gte('completed_at', from + 'T00:00:00').lte('completed_at', to + 'T23:59:59'),
    ]).then(([t, e, h, hl, ct]) => {
      setTasks(t.data || [])
      setEvents(e.data || [])
      setHabits(h.data || [])
      setHabitLogs(hl.data || [])
      setCompletedTasks(ct.data || [])
    })
  }, [user.id, period])

  const toggleHabit = async (habit) => {
    const d = todayStr()
    const existing = habitLogs.find(l => l.habit_id === habit.id && l.date === d)
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

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px 22px' }
  const label = { fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }

  const todayLogs = habitLogs.filter(l => l.date === todayStr())
  const habitRate = habits.length > 0 ? Math.round((habitLogs.length / (habits.length * (period === 'HOY' ? 1 : period === 'SEMANA' ? 7 : 30))) * 100) : 0

  const PERIODS = [
    { key: 'HOY', label: 'Hoy' },
    { key: 'SEMANA', label: 'Semana' },
    { key: 'MES', label: 'Mes' },
    { key: 'CALENDARIO', label: '📅 Calendario' },
  ]

  return (
    <div style={{ maxWidth: '800px', position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{dayName()}</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '500', letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
            Buen día, <span style={{ fontStyle: 'italic', color: 'var(--accent-bright)' }}>{user?.user_metadata?.full_name?.split(' ')[0] || 'hola'}</span>
          </h1>
        </div>
        {/* Period tabs */}
        <div style={{ display: 'flex', background: 'var(--inner-bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '3px', gap: '2px' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '500',
              background: period === p.key ? 'var(--card-bg)' : 'transparent',
              color: period === p.key ? 'var(--text-1)' : 'var(--text-muted)',
              boxShadow: period === p.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer', transition: 'all 0.12s',
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'CALENDARIO' && <CalendarioView user={user} />}

      {period !== 'CALENDARIO' && <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: period === 'HOY' ? 'Eventos hoy' : period === 'SEMANA' ? 'Eventos semana' : 'Eventos mes', value: events.length, color: 'var(--accent-bright)', glow: 'var(--accent-glow)' },
          { label: period === 'HOY' ? 'Tareas pendientes' : 'Tareas completadas', value: period === 'HOY' ? tasks.length : completedTasks.length, color: 'var(--yellow)', glow: 'var(--yellow-glow)' },
          { label: 'Hábitos', value: period === 'HOY' ? `${todayLogs.length}/${habits.length}` : `${Math.min(habitRate, 100)}%`, color: 'var(--green)', glow: 'var(--green-glow)' },
        ].map(s => (
          <div key={s.label} className="glow-tile" style={{ ...card, '--tile-glow': s.glow }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '28px', fontWeight: '600', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Eventos */}
        <div style={card}>
          <div style={label}>{period === 'HOY' ? 'Agenda de hoy' : period === 'SEMANA' ? 'Agenda esta semana' : 'Agenda este mes'}</div>
          {events.length === 0
            ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin eventos</p>
            : events.slice(0, 6).map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '2px', background: ev.color || 'var(--accent)', borderRadius: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-1)' }}>{ev.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {period !== 'HOY' && <span>{ev.date} · </span>}
                    {ev.start_time && ev.start_time.slice(0,5)}{ev.end_time ? ` – ${ev.end_time.slice(0,5)}` : ''}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Hábitos */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={label}>Hábitos de hoy</div>
            {habits.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                {todayLogs.length}/{habits.length}
              </span>
            )}
          </div>
          {habits.length === 0
            ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Agrega hábitos en la sección Hábitos</p>
            : [...habits]
                .sort((a, b) => {
                  if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio)
                  if (a.hora_inicio) return -1
                  if (b.hora_inicio) return 1
                  return 0
                })
                .map(h => {
                  const done = todayLogs.some(l => l.habit_id === h.id)
                  const timeLabel = h.hora_inicio ? (h.hora_fin ? `${h.hora_inicio} - ${h.hora_fin}` : h.hora_inicio) : null
                  return (
                    <div key={h.id} onClick={() => toggleHabit(h)} style={{
                      display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 8px',
                      borderRadius: '10px', marginBottom: '4px', cursor: 'pointer',
                      background: done ? 'var(--inner-bg)' : 'transparent',
                      transition: 'background 0.12s',
                    }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                        border: `2px solid ${done ? (h.color || 'var(--accent)') : 'var(--border)'}`,
                        background: done ? (h.color || 'var(--accent)') : 'transparent',
                        boxShadow: done ? `0 0 8px 1px var(--accent-glow)` : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>{h.icon}</span>
                      <span style={{ fontSize: '12px', flex: 1, color: done ? 'var(--text-muted)' : 'var(--text-1)', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.name}
                      </span>
                      {timeLabel && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '10px', color: done ? 'var(--text-muted)' : 'var(--accent-bright)', fontWeight: '600', flexShrink: 0 }}>
                          {timeLabel}
                        </span>
                      )}
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
          ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin tareas pendientes</p>
          : tasks.slice(0, 8).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 2px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '3px', flexShrink: 0, background: priorityColor(t.priority) }} />
              <button onClick={() => toggleTask(t)} style={{
                width: '15px', height: '15px', borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${priorityColor(t.priority)}`, background: 'transparent', cursor: 'pointer',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text-1)' }}>{t.title}</div>
                {t.category && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{t.category}</div>}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: priorityColor(t.priority), flexShrink: 0 }}>
                {t.priority}
              </span>
            </div>
          ))
        }
      </div>
      </>}
    </div>
  )
}
