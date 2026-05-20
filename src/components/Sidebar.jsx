import { supabase } from '../lib/supabase'

const icons = {
  HOY: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  AGENDA: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  TAREAS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  HABITOS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  NOTAS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  METAS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  RUTINAS: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-8.33L23 10"/></svg>,
}

const NAV = [
  { key: 'HOY',     label: 'Hoy'      },
  { key: 'AGENDA',  label: 'Agenda'   },
  { key: 'TAREAS',  label: 'Tareas'   },
  { key: 'HABITOS', label: 'Hábitos'  },
  { key: 'NOTAS',   label: 'Notas'    },
  { key: 'METAS',   label: 'Metas'    },
  { key: 'RUTINAS', label: 'Rutinas'  },
]

export default function Sidebar({ page, setPage, user }) {
  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div style={{
      width: '210px', minWidth: '210px', height: '100vh', position: 'sticky', top: 0,
      background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '32px 16px 24px',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </div>
        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Luno</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(item => {
          const active = page === item.key
          return (
            <button key={item.key} onClick={() => setPage(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              background: active ? 'var(--accent-soft)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: active ? '500' : '400',
              fontSize: '13.5px', textAlign: 'left', transition: 'all 0.12s', width: '100%',
            }}>
              <span style={{ flexShrink: 0 }}>{icons[item.key]}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setPage('CONFIG')} style={{
          display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
          padding: '8px 8px', borderRadius: '10px', border: 'none',
          background: page === 'CONFIG' ? 'var(--accent-soft)' : 'transparent',
          marginBottom: '10px',
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
