import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ROUTINES = ['Pecho', 'Tríceps', 'Hombro', 'Espalda', 'Abdomen', 'Glúteo', 'Femoral', 'Cuádriceps', 'Cardio']
const emptyEx = () => ({ exercise_name: '', sets: '', reps: '', weight_kg: '', rest_seconds: '' })

function SessionModal({ onClose, onSave, initial }) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0])
  const [selected, setSelected] = useState(() => initial?.routine_name ? initial.routine_name.split(' · ') : [])
  const [notes, setNotes] = useState(initial?.notes || '')
  const [exercises, setExercises] = useState(initial?.exercises?.length ? initial.exercises : [emptyEx()])

  const toggleRoutine = (r) => setSelected(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const setEx = (i, field, val) => setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  const addEx = () => setExercises(prev => [...prev, emptyEx()])
  const removeEx = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selected.length === 0) return
    onSave({ date, routine_name: selected.join(' · '), notes, exercises })
  }

  const inp = { padding: '8px 10px', borderRadius: '8px', background: 'var(--inner-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12px', width: '100%' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: '28px', width: '620px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--border-card)' }}>
        <h3 style={{ marginBottom: '20px', fontWeight: '700', color: 'var(--text-1)', fontSize: '16px' }}>
          {initial ? 'Editar sesión' : 'Nueva sesión'}
        </h3>
        <form onSubmit={handleSubmit}>
          {/* Date */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Fecha *</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, width: '50%' }} />
          </div>

          {/* Routine multi-select */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>
              Grupos musculares * <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(selección múltiple)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {ROUTINES.map(r => {
                const active = selected.includes(r)
                return (
                  <button key={r} type="button" onClick={() => toggleRoutine(r)} style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: active ? '700' : '400', transition: 'all 0.12s',
                  }}>{active ? '✓ ' : ''}{r}</button>
                )
              })}
            </div>
            {selected.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Seleccionado: <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{selected.join(' · ')}</span>
              </div>
            )}
          </div>

          {/* Exercises table */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ejercicios</label>
              <button type="button" onClick={addEx} style={{
                fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-soft)',
                border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontWeight: '600',
              }}>+ Agregar</button>
            </div>

            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 60px 60px 80px 80px 28px', gap: '6px', marginBottom: '6px' }}>
              {['Ejercicio', 'Series', 'Reps', 'Carga (lbs)', 'Descanso (min)', ''].map(h => (
                <div key={h} style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === '' ? 'center' : 'left' }}>{h}</div>
              ))}
            </div>

            {exercises.map((ex, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 60px 60px 80px 80px 28px', gap: '6px', marginBottom: '6px' }}>
                <input value={ex.exercise_name} onChange={e => setEx(i, 'exercise_name', e.target.value)} placeholder="Sentadilla" style={inp} />
                <input type="number" min="0" value={ex.sets} onChange={e => setEx(i, 'sets', e.target.value)} placeholder="4" style={{ ...inp, textAlign: 'center' }} />
                <input type="number" min="0" value={ex.reps} onChange={e => setEx(i, 'reps', e.target.value)} placeholder="12" style={{ ...inp, textAlign: 'center' }} />
                <input type="number" min="0" step="0.5" value={ex.weight_kg} onChange={e => setEx(i, 'weight_kg', e.target.value)} placeholder="60" style={{ ...inp, textAlign: 'center' }} />
                <input type="number" min="0" value={ex.rest_seconds} onChange={e => setEx(i, 'rest_seconds', e.target.value)} placeholder="90" style={{ ...inp, textAlign: 'center' }} />
                <button type="button" onClick={() => removeEx(i)} style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '0',
                  opacity: exercises.length === 1 ? 0.3 : 1,
                }} disabled={exercises.length === 1}>×</button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Cómo fue la sesión..."
              style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: '600', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
              {initial ? 'Guardar' : 'Registrar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GymSection({ user }) {
  const [sessions, setSessions] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.from('gym_sessions').select('*, gym_exercises(*)').eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => setSessions(data || []))
  }, [user.id])

  const handleSave = async ({ date, routine_name, notes, exercises }) => {
    if (editing) {
      // Update session
      await supabase.from('gym_sessions').update({ date, routine_name, notes }).eq('id', editing.id)
      // Delete old exercises and re-insert
      await supabase.from('gym_exercises').delete().eq('session_id', editing.id)
      const exRows = exercises.filter(e => e.exercise_name.trim()).map((e, i) => ({
        session_id: editing.id, user_id: user.id,
        exercise_name: e.exercise_name.trim(),
        sets: e.sets ? parseInt(e.sets) : null,
        reps: e.reps ? parseInt(e.reps) : null,
        weight_kg: e.weight_kg ? parseFloat(e.weight_kg) : null,
        rest_seconds: e.rest_seconds ? parseInt(e.rest_seconds) : null,
        sort_order: i,
      }))
      const { data: exData } = exRows.length ? await supabase.from('gym_exercises').insert(exRows).select() : { data: [] }
      setSessions(prev => prev.map(s => s.id === editing.id
        ? { ...s, date, routine_name, notes, gym_exercises: exData || [] }
        : s
      ))
    } else {
      const { data: session } = await supabase.from('gym_sessions')
        .insert({ user_id: user.id, date, routine_name, notes }).select().single()
      if (!session) return
      const exRows = exercises.filter(e => e.exercise_name.trim()).map((e, i) => ({
        session_id: session.id, user_id: user.id,
        exercise_name: e.exercise_name.trim(),
        sets: e.sets ? parseInt(e.sets) : null,
        reps: e.reps ? parseInt(e.reps) : null,
        weight_kg: e.weight_kg ? parseFloat(e.weight_kg) : null,
        rest_seconds: e.rest_seconds ? parseInt(e.rest_seconds) : null,
        sort_order: i,
      }))
      const { data: exData } = exRows.length ? await supabase.from('gym_exercises').insert(exRows).select() : { data: [] }
      setSessions(prev => [{ ...session, gym_exercises: exData || [] }, ...prev])
      setExpanded(session.id)
    }
    setShowModal(false); setEditing(null)
  }

  const handleDelete = async (id) => {
    await supabase.from('gym_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (expanded === id) setExpanded(null)
  }

  const card = { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)' }

  // Group by date
  const grouped = sessions.reduce((acc, s) => {
    const d = s.date
    if (!acc[d]) acc[d] = []
    acc[d].push(s)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Registro de entrenamientos</p>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
          + Nueva sesión
        </button>
      </div>

      {sortedDates.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '36px', marginBottom: '10px' }}>🏋️</p>
          <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-1)', marginBottom: '4px' }}>Sin sesiones aún</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Registra tu primer entrenamiento</p>
        </div>
      )}

      {sortedDates.map(date => (
        <div key={date} style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '4px' }}>
            {new Date(date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          {grouped[date].map(session => {
            const isOpen = expanded === session.id
            const exList = (session.gym_exercises || []).sort((a, b) => a.sort_order - b.sort_order)
            return (
              <div key={session.id} style={{ ...card, marginBottom: '8px', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : session.id)}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
                    background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                  }}>🏋️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>{session.routine_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {exList.length} ejercicio{exList.length !== 1 ? 's' : ''}
                      {exList.length > 0 && ` · ${exList.reduce((t, e) => t + (e.sets || 0), 0)} series totales`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditing({ ...session, exercises: exList }); setShowModal(true) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' }}>✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(session.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' }}>🗑️</button>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.15s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Exercises */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                    {session.notes && (
                      <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '14px', fontStyle: 'italic' }}>"{session.notes}"</p>
                    )}
                    {exList.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr>
                            {['Ejercicio', 'Series', 'Reps', 'Carga (lbs)', 'Descanso (min)'].map(h => (
                              <th key={h} style={{ textAlign: h === 'Ejercicio' ? 'left' : 'center', padding: '5px 8px', color: 'var(--text-muted)', fontWeight: '500', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {exList.map((ex, i) => (
                            <tr key={ex.id || i}>
                              <td style={{ padding: '9px 8px', color: 'var(--text-1)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>{ex.exercise_name}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>{ex.sets ?? '—'}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>{ex.reps ?? '—'}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--accent)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>
                                {ex.weight_kg != null ? `${ex.weight_kg} lbs` : '—'}
                              </td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                {ex.rest_seconds != null ? `${ex.rest_seconds} min` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin ejercicios registrados</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {showModal && (
        <SessionModal
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          initial={editing}
        />
      )}
    </div>
  )
}
