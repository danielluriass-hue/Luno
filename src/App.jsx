import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Sidebar from './components/Sidebar'
import HoyPage from './pages/HoyPage'
import AgendaPage from './pages/AgendaPage'
import TareasPage from './pages/TareasPage'
import HabitosPage from './pages/HabitosPage'
import NotasPage from './pages/NotasPage'
import MetasPage from './pages/MetasPage'
import RutinasPage from './pages/RutinasPage'
import MejorasPage from './pages/MejorasPage'
import ConfigPage from './pages/ConfigPage'
import ContabilidadPage from './pages/ContabilidadPage'

const PAGE_LABELS = {
  HOY: 'Hoy', AGENDA: 'Agenda', TAREAS: 'Tareas', HABITOS: 'Hábitos',
  NOTAS: 'Notas', METAS: 'Metas', RUTINAS: 'Rutinas', MEJORAS: 'Mejoras',
  CONTABILIDADES: 'Contabilidades', CONFIG: 'Configuración',
}

const BOTTOM_NAV = [
  { key: 'HOY', label: 'Hoy', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> },
  { key: 'HABITOS', label: 'Hábitos', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
  { key: 'TAREAS', label: 'Tareas', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { key: 'MEJORAS', label: 'Mejoras', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState(() => localStorage.getItem('luno_page') || 'HOY')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { localStorage.setItem('luno_page', page) }, [page])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setDrawerOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navigateTo = (key) => { setPage(key); setDrawerOpen(false) }

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!session) return <AuthPage />

  const user = session.user
  const pages = {
    HOY:     <HoyPage user={user} />,
    AGENDA:  <AgendaPage user={user} />,
    TAREAS:  <TareasPage user={user} />,
    HABITOS: <HabitosPage user={user} />,
    NOTAS:   <NotasPage user={user} />,
    METAS:   <MetasPage user={user} />,
    RUTINAS: <RutinasPage user={user} />,
    MEJORAS:        <MejorasPage user={user} />,
    CONTABILIDADES: <ContabilidadPage />,
    CONFIG:         <ConfigPage user={user} />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Sidebar — desktop siempre visible, móvil como drawer */}
      {(!isMobile || drawerOpen) && (
        <>
          {isMobile && (
            <div onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} />
          )}
          <div style={isMobile ? {
            position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          } : {}}>
            <Sidebar
              page={page} setPage={navigateTo} user={user}
              darkMode={darkMode} toggleDark={() => setDarkMode(d => !d)}
              isMobile={isMobile} onClose={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <main style={{
        flex: 1,
        padding: isMobile ? '60px 16px 84px' : '36px 40px',
        overflowY: 'auto', maxHeight: '100vh',
      }}>
        {/* Mobile top header */}
        {isMobile && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: '52px', zIndex: 100,
            background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
          }}>
            <button onClick={() => setDrawerOpen(true)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>{PAGE_LABELS[page]}</span>
            </div>
          </div>
        )}

        {pages[page]}
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '64px', background: 'var(--sidebar-bg)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {BOTTOM_NAV.map(({ key, label, icon }) => {
            const active = page === key
            return (
              <button key={key} onClick={() => navigateTo(key)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                padding: '6px 10px', borderRadius: '10px', minWidth: '56px',
              }}>
                {icon}
                <span style={{ fontSize: '10px', fontWeight: active ? '700' : '500' }}>{label}</span>
              </button>
            )
          })}
          <button onClick={() => setDrawerOpen(true)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '6px 10px', borderRadius: '10px', minWidth: '56px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            <span style={{ fontSize: '10px', fontWeight: '500' }}>Menú</span>
          </button>
        </nav>
      )}
    </div>
  )
}
