import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateStr } from '../lib/dateUtils'

const icons = {
  HOY:           <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  CONTABILIDADES:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="6" y1="8" x2="6" y2="13"/><line x1="10" y1="10" x2="10" y2="13"/><line x1="14" y1="7" x2="14" y2="13"/><line x1="18" y1="9" x2="18" y2="13"/></svg>,
  AGENDA:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  TAREAS:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  HABITOS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  NOTAS:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  METAS:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  RUTINAS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-8.33L23 10"/></svg>,
  MEJORAS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  PRESUPUESTO: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="16" y2="15"/></svg>,
}

const NAV_BASE = [
  { key: 'HOY',     label: 'Hoy'     },
  { key: 'AGENDA',  label: 'Agenda'  },
  { key: 'TAREAS',  label: 'Tareas'  },
  { key: 'HABITOS', label: 'Hábitos' },
  { key: 'NOTAS',   label: 'Notas'   },
  { key: 'METAS',   label: 'Metas'   },
  { key: 'RUTINAS', label: 'Rutinas' },
  { key: 'MEJORAS',      label: 'Mejoras'     },
  { key: 'PRESUPUESTO', label: 'Presupuesto' },
]

const CONTA_ALLOWED = 'daniell.uriass@gmail.com'

function useTodayStats(userId, refreshKey) {
  const [stats, setStats] = useState({ agenda: null, habitos: null, tareas: null })

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const today = localDateStr()

    const load = async () => {
      const [{ data: events }, { data: habits }, { data: habitLogs }, { data: pendingTasks }, { data: doneToday }] = await Promise.all([
        supabase.from('events').select('start_time,end_time').eq('user_id', userId).eq('date', today),
        supabase.from('habits').select('id').eq('user_id', userId),
        supabase.from('habit_logs').select('habit_id').eq('user_id', userId).eq('date', today),
        supabase.from('tasks').select('id').eq('user_id', userId).eq('completed', false),
        supabase.from('tasks').select('id').eq('user_id', userId).eq('completed', true).gte('completed_at', today + 'T00:00:00').lte('completed_at', today + 'T23:59:59'),
      ])
      if (cancelled) return

      let agenda = null
      if (events && events.length > 0) {
        const now = new Date()
        const nowMin = now.getHours() * 60 + now.getMinutes()
        const past = events.filter(ev => {
          const t = ev.end_time || ev.start_time
          if (!t) return false
          const [h, m] = t.split(':').map(Number)
          return (h * 60 + m) <= nowMin
        }).length
        agenda = Math.round((past / events.length) * 100)
      }

      const habitos = habits && habits.length > 0
        ? Math.round(((habitLogs?.length || 0) / habits.length) * 100)
        : null

      const totalTareas = (pendingTasks?.length || 0) + (doneToday?.length || 0)
      const tareas = totalTareas > 0
        ? Math.round(((doneToday?.length || 0) / totalTareas) * 100)
        : null

      setStats({ agenda, habitos, tareas })
    }

    load()
    const interval = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [userId, refreshKey])

  return stats
}

function ProgressRing({ label, value, color }) {
  const r = 17, c = 2 * Math.PI * r
  const pct = value ?? 0
  const off = c - (Math.min(pct, 100) / 100) * c
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
      <svg width="42" height="42" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="21" cy="21" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          transform="rotate(-90 21 21)"
          style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(.4,0,.2,1)' }}
        />
        <text x="21" y="25" textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '10px', fontWeight: '600', fill: 'var(--text-1)' }}>
          {value === null ? '–' : pct}
        </text>
      </svg>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

export default function Sidebar({ page, setPage, user, darkMode, toggleDark, isMobile, onClose }) {
  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const NAV = user?.email === CONTA_ALLOWED
    ? [...NAV_BASE, { key: 'CONTABILIDADES', label: 'Contabilidades' }]
    : NAV_BASE
  const stats = useTodayStats(user?.id, page)

  return (
    <div style={{
      width: '210px', minWidth: '210px', height: '100vh', position: 'sticky', top: 0,
      background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '32px 16px 24px',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </div>
        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-1)', letterSpacing: '-0.02em', flex: 1 }}>miagendaus</span>
        {isMobile && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(item => {
          const active = page === item.key
          return (
            <button key={item.key} onClick={() => setPage(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: '9px', position: 'relative',
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              background: active ? 'var(--accent-soft)' : 'transparent',
              color: active ? 'var(--accent-bright)' : 'var(--text-muted)',
              fontWeight: active ? '600' : '400',
              fontSize: '13.5px', textAlign: 'left', transition: 'all 0.12s', width: '100%',
            }}>
              {active && (
                <span style={{
                  position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%)',
                  width: '3px', height: '16px', borderRadius: '3px',
                  background: 'var(--accent-bright)', boxShadow: '0 0 8px 1px var(--accent-glow)',
                }} />
              )}
              <span style={{ flexShrink: 0 }}>{icons[item.key]}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Progreso de hoy */}
      <div style={{ padding: '14px 6px 4px', marginBottom: '4px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', padding: '0 4px' }}>
          Progreso de hoy
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <ProgressRing label="Agenda" value={stats.agenda} color="var(--accent-bright)" />
          <ProgressRing label="Hábitos" value={stats.habitos} color="var(--green)" />
          <ProgressRing label="Tareas" value={stats.tareas} color="var(--yellow)" />
        </div>
      </div>

      {/* Dark mode toggle */}
      <button onClick={toggleDark} style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '8px 10px', borderRadius: '8px', border: 'none',
        background: 'transparent', color: 'var(--text-muted)',
        fontSize: '13px', width: '100%', marginBottom: '8px', cursor: 'pointer',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {darkMode
            ? <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>
            : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          }
        </svg>
        {darkMode ? 'Modo claro' : 'Modo oscuro'}
      </button>

      {/* User */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setPage('CONFIG')} style={{
          display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
          padding: '8px 8px', borderRadius: '10px', border: 'none',
          background: page === 'CONFIG' ? 'var(--accent-soft)' : 'transparent',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontWeight: '600', fontSize: '11px', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configuración</div>
          </div>
        </button>
      </div>
    </div>
  )
}
