import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../lib/useIsMobile'
import { localDateStr } from '../lib/dateUtils'

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function getMonthRange(date) {
  const y = date.getFullYear(), m = date.getMonth()
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  return {
    from: localDateStr(first),
    to: localDateStr(last),
    daysInMonth: last.getDate(),
    firstDayOfWeek: (first.getDay() + 6) % 7, // lunes = 0
  }
}

export default function CalendarioView({ user }) {
  const isMobile = useIsMobile()
  const [month, setMonth] = useState(new Date())
  const [habits, setHabits] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [events, setEvents] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  const { from, to, daysInMonth, firstDayOfWeek } = getMonthRange(month)
  const todayStr = localDateStr()

  useEffect(() => {
    const uid = user.id
    Promise.all([
      supabase.from('habits').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', uid).gte('date', from).lte('date', to),
      supabase.from('events').select('*').eq('user_id', uid).gte('date', from).lte('date', to).order('start_time'),
      supabase.from('tasks').select('*').eq('user_id', uid).eq('completed', true)
        .gte('completed_at', from + 'T00:00:00').lte('completed_at', to + 'T23:59:59'),
    ]).then(([h, hl, ev, ct]) => {
      setHabits(h.data || [])
      setHabitLogs(hl.data || [])
      setEvents(ev.data || [])
      setCompletedTasks(ct.data || [])
    })
  }, [user.id, from, to])

  const getDayData = (dateStr) => ({
    habitsDone: habits.filter(h => habitLogs.some(l => l.habit_id === h.id && l.date === dateStr)),
    events: events.filter(e => e.date === dateStr),
    tasks: completedTasks.filter(t => t.completed_at?.startsWith(dateStr)),
  })

  // Build cells array
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month.getMonth() + 1).padStart(2, '0')
    const day = String(d).padStart(2, '0')
    cells.push(`${month.getFullYear()}-${m}-${day}`)
  }

  const selData = selectedDay ? getDayData(selectedDay) : null

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '20px' }

  return (
    <div>
      {/* Month nav */}
      <div style={{ ...card, marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            style={{ background: 'var(--inner-bg)', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '16px', fontWeight: '700' }}>‹</button>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-1)', textTransform: 'capitalize' }}>
            {month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            style={{ background: 'var(--inner-bg)', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '16px', fontWeight: '700' }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '6px' }}>
          {WEEK_DAYS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', paddingBottom: '4px' }}>{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((dateStr, idx) => {
            if (!dateStr) return <div key={idx} />
            const { habitsDone, events: devs, tasks } = getDayData(dateStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const dayNum = parseInt(dateStr.split('-')[2])
            const allHabitsDone = habits.length > 0 && habitsDone.length === habits.length
            const partialHabits = habitsDone.length > 0 && !allHabitsDone

            return (
              <div key={dateStr} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                style={{
                  minHeight: isMobile ? '52px' : '62px',
                  borderRadius: '10px',
                  padding: '5px 4px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-soft)' : isToday ? 'var(--inner-bg)' : 'transparent',
                  border: `1.5px solid ${isSelected ? 'var(--accent)' : isToday ? 'var(--accent)' : 'transparent'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  transition: 'all 0.12s',
                }}>
                {/* Day number */}
                <span style={{
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: isToday ? '800' : '500',
                  color: isToday ? 'var(--accent)' : 'var(--text-1)',
                  lineHeight: 1,
                }}>{dayNum}</span>

                {/* Habit dots */}
                {habitsDone.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center', maxWidth: '28px' }}>
                    {habitsDone.slice(0, 4).map(h => (
                      <div key={h.id} style={{ width: '5px', height: '5px', borderRadius: '50%', background: h.color || 'var(--accent)', flexShrink: 0 }} />
                    ))}
                  </div>
                )}

                {/* Event + task dots */}
                {(devs.length > 0 || tasks.length > 0) && (
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    {devs.length > 0 && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#818cf8' }} />}
                    {tasks.length > 0 && <div style={{ width: '5px', height: '5px', borderRadius: '2px', background: '#34d399' }} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: '14px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { shape: 'circle', color: 'var(--accent)', label: 'Hábitos' },
            { shape: 'circle', color: '#818cf8', label: 'Eventos' },
            { shape: 'square', color: '#34d399', label: 'Tareas hechas' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: l.shape === 'circle' ? '50%' : '2px', background: l.color, flexShrink: 0 }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && selData && (
        <div style={{ ...card }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '16px', textTransform: 'capitalize' }}>
            {new Date(selectedDay + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>

          {/* Hábitos */}
          {habits.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Hábitos · {selData.habitsDone.length}/{habits.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {habits.map(h => {
                  const done = selData.habitsDone.some(d => d.id === h.id)
                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: done ? h.color : 'var(--border)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: done ? 'var(--text-1)' : 'var(--text-muted)' }}>
                        {h.icon} {h.name}
                      </span>
                      {done && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#10b981', fontWeight: '700' }}>✓</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Eventos */}
          {selData.events.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Eventos · {selData.events.length}
              </div>
              {selData.events.map(ev => (
                <div key={ev.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '7px' }}>
                  <div style={{ width: '3px', height: '18px', borderRadius: '2px', background: ev.color || '#818cf8', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: '500' }}>{ev.title}</div>
                    {ev.start_time && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.start_time.slice(0,5)}{ev.end_time ? ` – ${ev.end_time.slice(0,5)}` : ''}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tareas completadas */}
          {selData.tasks.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Tareas completadas · {selData.tasks.length}
              </div>
              {selData.tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', textDecoration: 'line-through' }}>{t.title}</span>
                </div>
              ))}
            </div>
          )}

          {selData.habitsDone.length === 0 && selData.events.length === 0 && selData.tasks.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin actividad registrada este día</p>
          )}
        </div>
      )}
    </div>
  )
}
