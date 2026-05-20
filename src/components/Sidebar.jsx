import { supabase } from '../lib/supabase'

const NAV = [
  { key: 'HOY',     label: 'Hoy',      icon: '☀️' },
  { key: 'AGENDA',  label: 'Agenda',   icon: '📅' },
  { key: 'TAREAS',  label: 'Tareas',   icon: '✅' },
  { key: 'HABITOS', label: 'Hábitos',  icon: '🔥' },
  { key: 'NOTAS',   label: 'Notas',    icon: '📝' },
  { key: 'METAS',   label: 'Metas',    icon: '🎯' },
  { key: 'RUTINAS', label: 'Rutinas',  icon: '🌅' },
]

export default function Sidebar({ page, setPage, user }) {
  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div style={{
      width: '220px', minWidth: '220px', height: '100vh', position: 'sticky', top: 0,
      background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '24px 12px',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px', marginBottom: '32px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)', letterSpacing: '-0.04em' }}>
          🌙 Luno
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Tu día, organizado</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(item => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '12px', border: 'none',
              background: page === item.key ? 'var(--accent-soft)' : 'transparent',
              color: page === item.key ? 'var(--accent)' : 'var(--text-2)',
              fontWeight: page === item.key ? '600' : '400',
              fontSize: '14px', textAlign: 'left', transition: 'all 0.15s',
              width: '100%',
            }}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div style={{
        marginTop: '16px', padding: '12px', borderRadius: '14px',
        background: 'var(--inner-bg)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: 'var(--accent-soft)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', fontWeight: '700', fontSize: '13px', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', padding: 0, cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
