import { useEffect, useState } from 'react'

// Confirmación de borrado en dos pasos (mismo flujo que Anular/Eliminar en Contabilidad).
// Uso: {item && <DoubleConfirm what="la sesión" label="Pecho y tríceps" onConfirm={...} onCancel={...} />}
export default function DoubleConfirm({ what, label, onConfirm, onCancel }) {
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const confirm = async () => {
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  const btn = (danger) => ({
    padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer',
    border: danger ? 'none' : '1px solid var(--border)',
    background: danger ? 'var(--red)' : 'transparent',
    color: danger ? '#fff' : 'var(--text-2)',
    opacity: busy ? 0.6 : 1,
  })

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
    >
      <div style={{ width: '100%', maxWidth: 'min(400px, calc(100vw - 24px))', background: 'var(--card-bg)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '22px' }}>
        {step === 1 ? (
          <>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '14px' }}>Eliminar {what}</div>
            <p style={{ color: 'var(--text-1)', fontSize: '14px', marginBottom: '6px', lineHeight: '1.5' }}>
              ¿Deseas eliminar {what} <b>"{label}"</b>?
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>
              Se borrará de forma permanente.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={btn(false)}>Cancelar</button>
              <button onClick={() => setStep(2)} style={btn(true)}>Sí, eliminar</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '6px' }}>¿Estás completamente seguro?</div>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
              <p style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Esta acción eliminará definitivamente {what}:
              </p>
              <p style={{ color: 'var(--accent-bright)', fontSize: '13px', marginBottom: '8px', fontStyle: 'italic' }}>"{label}"</p>
              <p style={{ color: 'var(--red)', fontSize: '12px', fontWeight: '600' }}>No se puede recuperar después de eliminar.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={btn(false)}>Cancelar</button>
              <button onClick={confirm} disabled={busy} style={btn(true)}>Eliminar definitivamente</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
