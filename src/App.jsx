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

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('HOY')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

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
    HOY: <HoyPage user={user} />,
    AGENDA: <AgendaPage user={user} />,
    TAREAS: <TareasPage user={user} />,
    HABITOS: <HabitosPage user={user} />,
    NOTAS: <NotasPage user={user} />,
    METAS: <MetasPage user={user} />,
    RUTINAS: <RutinasPage user={user} />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} setPage={setPage} user={user} />
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto', maxHeight: '100vh' }}>
        {pages[page]}
      </main>
    </div>
  )
}
