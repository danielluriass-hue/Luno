import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../lib/useIsMobile'

const ROUTINES = ['Pecho', 'Tríceps', 'Hombro', 'Espalda', 'Abdomen', 'Glúteo', 'Femoral', 'Cuádriceps', 'Cardio']

const emptySeries = (prev) => ({
  reps: '',
  weight_kg: prev?.weight_kg || '',
  rest_seconds: prev?.rest_seconds || '',
})
const emptyEx = () => ({ exercise_name: '', series: [emptySeries()] })

function mapExToState(exList) {
  return exList.map(ex => ({
    id: ex.id,
    exercise_name: ex.exercise_name || '',
    series: ex.series_data?.length
      ? ex.series_data.map(s => ({ reps: s.reps ?? '', weight_kg: s.weight_kg ?? '', rest_seconds: s.rest_seconds ?? '' }))
      : Array.from({ length: ex.sets || 1 }, () => ({ reps: ex.reps ?? '', weight_kg: ex.weight_kg ?? '', rest_seconds: ex.rest_seconds ?? '' }))
  }))
}

function SessionModal({ onClose, onSave, initial }) {
  const isMobile = useIsMobile()
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0])
  const [selected, setSelected] = useState(() => initial?.routine_name ? initial.routine_name.split(' · ') : [])
  const [notes, setNotes] = useState(initial?.notes || '')
  const [exercises, setExercises] = useState(() =>
    initial?.exercises?.length ? mapExToState(initial.exercises) : [emptyEx()]
  )

  const toggleRoutine = (r) => setSelected(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const setExName = (i, val) => setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, exercise_name: val } : ex))
  const addEx = () => setExercises(prev => [...prev, emptyEx()])
  const removeEx = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i))

  const addSeries = (exIdx) => setExercises(prev => prev.map((ex, i) => {
    if (i !== exIdx) return ex
    return { ...ex, series: [...ex.series, emptySeries(ex.series[ex.series.length - 1])] }
  }))
  const removeSeries = (exIdx, si) => setExercises(prev => prev.map((ex, i) =>
    i !== exIdx ? ex : { ...ex, series: ex.series.filter((_, idx) => idx !== si) }
  ))
  const setSeriesField = (exIdx, si, field, val) => setExercises(prev => prev.map((ex, i) =>
    i !== exIdx ? ex : { ...ex, series: ex.series.map((s, idx) => idx !== si ? s : { ...s, [field]: val }) }
  ))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selected.length === 0) return
    onSave({ date, routine_name: selected.join(' · '), notes, exercises })
  }

  const inp = { padding: '8px 10px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '12px', width: '100%' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '20px', padding: isMobile ? '20px 16px' : '28px', width: '560px', maxWidth: 'calc(100vw - 24px)', maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--border-card)' }}>
        <h3 style={{ marginBottom: '20px', fontWeight: '700', color: 'var(--text-1)', fontSize: '16px' }}>
          {initial ? 'Editar sesión' : 'Nueva sesión'}
        </h3>
        <form onSubmit={handleSubmit}>

          {/* Fecha */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Fecha *</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, width: '50%' }} />
          </div>

          {/* Grupos musculares */}
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

          {/* Ejercicios */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ejercicios</label>
              <button type="button" onClick={addEx} style={{
                fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-soft)',
                border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontWeight: '600',
              }}>+ Ejercicio</button>
            </div>

            {exercises.map((ex, i) => (
              <div key={i} style={{ background: 'var(--inner-bg)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                {/* Nombre del ejercicio */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                  <input
                    value={ex.exercise_name}
                    onChange={e => setExName(i, e.target.value)}
                    placeholder={`Ejercicio ${i + 1} (ej. Sentadilla)`}
                    style={{ ...inp, flex: 1, background: 'var(--card-bg)' }}
                  />
                  {exercises.length > 1 && (
                    <button type="button" onClick={() => removeEx(i)} style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: '18px', padding: '0', flexShrink: 0, lineHeight: 1,
                    }}>×</button>
                  )}
                </div>

                {/* Header columnas series */}
                <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 1fr 18px', gap: '4px', marginBottom: '4px' }}>
                  {['', 'REPS', 'CARGA (lbs)', 'DESC (min)', ''].map((h, idx) => (
                    <div key={idx} style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>{h}</div>
                  ))}
                </div>

                {/* Filas de series */}
                {ex.series.map((s, si) => (
                  <div key={si} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 1fr 18px', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: '700', textAlign: 'center' }}>S{si + 1}</div>
                    <input type="number" min="0" value={s.reps}
                      onChange={e => setSeriesField(i, si, 'reps', e.target.value)}
                      placeholder="12" style={{ ...inp, textAlign: 'center', padding: '7px 4px' }} />
                    <input type="number" min="0" step="0.5" value={s.weight_kg}
                      onChange={e => setSeriesField(i, si, 'weight_kg', e.target.value)}
                      placeholder="50" style={{ ...inp, textAlign: 'center', padding: '7px 4px' }} />
                    <input type="number" min="0" step="0.5" value={s.rest_seconds}
                      onChange={e => setSeriesField(i, si, 'rest_seconds', e.target.value)}
                      placeholder="2" style={{ ...inp, textAlign: 'center', padding: '7px 4px' }} />
                    <button type="button" onClick={() => removeSeries(i, si)} style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: '13px', padding: '0', opacity: ex.series.length === 1 ? 0.2 : 0.7,
                    }} disabled={ex.series.length === 1}>×</button>
                  </div>
                ))}

                {/* Botón agregar serie */}
                <button type="button" onClick={() => addSeries(i)} style={{
                  marginTop: '8px', fontSize: '11px', color: 'var(--accent)', background: 'transparent',
                  border: '1px dashed var(--accent)', borderRadius: '6px', padding: '5px', cursor: 'pointer',
                  width: '100%', fontWeight: '600',
                }}>+ Serie</button>
              </div>
            ))}
          </div>

          {/* Notas */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Cómo fue la sesión..."
              style={{ ...inp, resize: 'none', fontFamily: 'inherit', background: 'var(--inner-bg)' }} />
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

  const buildExRows = (exercises, sessionId) =>
    exercises.filter(e => e.exercise_name.trim()).map((e, i) => ({
      session_id: sessionId,
      user_id: user.id,
      exercise_name: e.exercise_name.trim(),
      sets: e.series.length,
      reps: null,
      weight_kg: null,
      rest_seconds: null,
      series_data: e.series.map(s => ({
        reps: s.reps !== '' ? parseInt(s.reps) : null,
        weight_kg: s.weight_kg !== '' ? parseFloat(s.weight_kg) : null,
        rest_seconds: s.rest_seconds !== '' ? parseFloat(s.rest_seconds) : null,
      })),
      sort_order: i,
    }))

  const handleSave = async ({ date, routine_name, notes, exercises }) => {
    if (editing) {
      await supabase.from('gym_sessions').update({ date, routine_name, notes }).eq('id', editing.id)
      await supabase.from('gym_exercises').delete().eq('session_id', editing.id)
      const exRows = buildExRows(exercises, editing.id)
      const { data: exData } = exRows.length ? await supabase.from('gym_exercises').insert(exRows).select() : { data: [] }
      setSessions(prev => prev.map(s => s.id === editing.id
        ? { ...s, date, routine_name, notes, gym_exercises: exData || [] }
        : s
      ))
    } else {
      const { data: session } = await supabase.from('gym_sessions')
        .insert({ user_id: user.id, date, routine_name, notes }).select().single()
      if (!session) return
      const exRows = buildExRows(exercises, session.id)
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

  const grouped = sessions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
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
            const totalSeries = exList.reduce((t, e) => t + (e.series_data?.length || e.sets || 0), 0)
            return (
              <div key={session.id} style={{ ...card, marginBottom: '8px', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : session.id)}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
                    background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>🏋️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-1)' }}>{session.routine_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {exList.length} ejercicio{exList.length !== 1 ? 's' : ''}
                      {totalSeries > 0 && ` · ${totalSeries} series`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); setEditing({ ...session, exercises: exList }); setShowModal(true) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' }}>✏️</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(session.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' }}>🗑️</button>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.15s', flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Ejercicios expandidos */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                    {session.notes && (
                      <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '14px', fontStyle: 'italic' }}>"{session.notes}"</p>
                    )}
                    {exList.length > 0 ? (
                      <div>
                        {exList.map((ex, exIdx) => {
                          const seriesData = ex.series_data?.length
                            ? ex.series_data
                            : Array.from({ length: ex.sets || 1 }, () => ({ reps: ex.reps, weight_kg: ex.weight_kg, rest_seconds: ex.rest_seconds }))
                          return (
                            <div key={ex.id || exIdx} style={{ marginBottom: exIdx < exList.length - 1 ? '14px' : 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '6px' }}>
                                {ex.exercise_name}
                                <span style={{ fontSize: '10px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                  {seriesData.length} {seriesData.length === 1 ? 'serie' : 'series'}
                                </span>
                              </div>
                              {seriesData.map((s, si) => (
                                <div key={si} style={{
                                  display: 'flex', gap: '12px', fontSize: '12px', padding: '5px 8px',
                                  borderRadius: '6px', background: si % 2 === 0 ? 'var(--inner-bg)' : 'transparent',
                                  alignItems: 'center', flexWrap: 'wrap',
                                }}>
                                  <span style={{ color: 'var(--accent)', fontSize: '10px', fontWeight: '700', width: '18px', flexShrink: 0 }}>S{si + 1}</span>
                                  {s.reps != null && <span style={{ color: 'var(--text-1)' }}><strong>{s.reps}</strong> reps</span>}
                                  {s.weight_kg != null && <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{s.weight_kg} lbs</span>}
                                  {s.rest_seconds != null && <span style={{ color: 'var(--text-muted)' }}>{s.rest_seconds} min desc.</span>}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
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
