import { useState, useEffect, useCallback, Fragment, useRef } from 'react'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// UID se pasa como prop desde App → ContabilidadPage → ContabilidadCompleta

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const Q = (n) => {
  if (n === undefined || n === null || n === '') return '–'
  return `Q ${Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const Qp = (n) => `Q ${Number(n||0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const initPDF = (titulo, subtitulo = '') => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(titulo, 105, 18, { align: 'center' })
  if (subtitulo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(subtitulo, 105, 26, { align: 'center' })
  }
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text(`Generado el ${new Date().toLocaleDateString('es-GT', { day:'2-digit', month:'2-digit', year:'numeric' })}`, 105, 32, { align: 'center' })
  doc.setTextColor(0)
  return doc
}

const CATALOGO_BASE = [
  // 11XX — Activo Corriente
  { codigo:'1100', nombre:'Caja y Bancos',                                    tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1101', nombre:'Caja General',                                     tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1102', nombre:'Banco Industrial',                                 tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1103', nombre:'Banrural',                                         tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1104', nombre:'G&T Continental',                                  tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1120', nombre:'Clientes',                                         tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1121', nombre:'Clientes Nacionales',                              tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1122', nombre:'Clientes Relacionados',                            tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1130', nombre:'IVA Crédito Fiscal',                               tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1140', nombre:'Retenciones IVA por Acreditar',                    tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1150', nombre:'ISR Retenido por Acreditar',                       tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1160', nombre:'Anticipos a Proveedores',                          tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  { codigo:'1170', nombre:'Otras Cuentas por Cobrar',                         tipo:'ACTIVO',  subtipo:'Activo Corriente' },
  // 12XX — Activo No Corriente
  { codigo:'1200', nombre:'Vehículos de Transporte',                          tipo:'ACTIVO',  subtipo:'Activo No Corriente' },
  { codigo:'1210', nombre:'Depreciación Acumulada Vehículos',                 tipo:'ACTIVO',  subtipo:'Activo No Corriente' },
  { codigo:'1220', nombre:'Herramientas y Equipo',                            tipo:'ACTIVO',  subtipo:'Activo No Corriente' },
  { codigo:'1230', nombre:'Equipo de Computación',                            tipo:'ACTIVO',  subtipo:'Activo No Corriente' },
  { codigo:'1240', nombre:'Mobiliario y Equipo',                              tipo:'ACTIVO',  subtipo:'Activo No Corriente' },
  { codigo:'1250', nombre:'Depreciación Acumulada Mobiliario y Equipo',       tipo:'ACTIVO',  subtipo:'Activo No Corriente' },
  // 21XX — Pasivo Corriente
  { codigo:'2100', nombre:'Proveedores',                                      tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2110', nombre:'IVA Débito Fiscal',                                tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2120', nombre:'IVA por Pagar',                                    tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2130', nombre:'Retenciones por Pagar',                            tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2131', nombre:'ISR Empleados por Pagar',                          tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2132', nombre:'ISR Proveedores por Pagar',                        tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2133', nombre:'IVA Retenido por Pagar',                           tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2140', nombre:'Préstamos Bancarios Corto Plazo',                  tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2150', nombre:'IGSS por Pagar',                                   tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2160', nombre:'Cuotas Laborales por Pagar',                       tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2170', nombre:'Aguinaldo por Pagar',                              tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2180', nombre:'Bono 14 por Pagar',                                tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  { codigo:'2190', nombre:'Vacaciones por Pagar',                             tipo:'PASIVO',  subtipo:'Pasivo Corriente' },
  // 22XX — Pasivo Largo Plazo
  { codigo:'2200', nombre:'Préstamos Bancarios Largo Plazo',                  tipo:'PASIVO',  subtipo:'Pasivo No Corriente' },
  { codigo:'2210', nombre:'Obligaciones Financieras Largo Plazo',             tipo:'PASIVO',  subtipo:'Pasivo No Corriente' },
  // 3XXX — Capital
  { codigo:'3100', nombre:'Capital Social',                                   tipo:'CAPITAL', subtipo:'' },
  { codigo:'3200', nombre:'Utilidades Retenidas',                             tipo:'CAPITAL', subtipo:'' },
  { codigo:'3300', nombre:'Utilidad del Ejercicio',                           tipo:'CAPITAL', subtipo:'' },
  // 41XX — Ingresos Operación Principal
  { codigo:'4100', nombre:'Ingresos por Servicios de Transporte',             tipo:'INGRESO', subtipo:'' },
  { codigo:'4101', nombre:'Transporte de Personal',                           tipo:'INGRESO', subtipo:'' },
  { codigo:'4102', nombre:'Transporte Empresarial',                           tipo:'INGRESO', subtipo:'' },
  { codigo:'4103', nombre:'Transporte Especial',                              tipo:'INGRESO', subtipo:'' },
  { codigo:'4104', nombre:'Transporte Eventual',                              tipo:'INGRESO', subtipo:'' },
  // 42XX — Otros Ingresos
  { codigo:'4200', nombre:'Otros Ingresos',                                   tipo:'INGRESO', subtipo:'' },
  { codigo:'4201', nombre:'Venta de Activos',                                 tipo:'INGRESO', subtipo:'' },
  { codigo:'4202', nombre:'Ingresos Financieros',                             tipo:'INGRESO', subtipo:'' },
  { codigo:'4203', nombre:'Otros Ingresos Varios',                            tipo:'INGRESO', subtipo:'' },
  // 51XX — Costos Operación de Transporte
  { codigo:'5100', nombre:'Combustible',                                      tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5110', nombre:'Lubricantes',                                      tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5120', nombre:'Mantenimiento de Vehículos',                       tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5130', nombre:'Repuestos y Accesorios',                           tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5140', nombre:'Peajes',                                           tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5150', nombre:'Parqueos',                                         tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5160', nombre:'Lavado y Limpieza de Vehículos',                   tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5170', nombre:'Seguros de Vehículos',                             tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5171', nombre:'GPS Vehículos',                                    tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5172', nombre:'Rastreo Satelital',                                tipo:'GASTO',   subtipo:'Operación de Transporte' },
  { codigo:'5180', nombre:'Impuesto a la Distribución del Petróleo (IDP)',    tipo:'GASTO',   subtipo:'Operación de Transporte' },
  // 52XX — Personal
  { codigo:'5200', nombre:'Sueldos y Salarios',                               tipo:'GASTO',   subtipo:'Personal' },
  { codigo:'5210', nombre:'Bonificación Incentivo',                           tipo:'GASTO',   subtipo:'Personal' },
  { codigo:'5220', nombre:'Aguinaldo',                                        tipo:'GASTO',   subtipo:'Personal' },
  { codigo:'5230', nombre:'Bono 14',                                          tipo:'GASTO',   subtipo:'Personal' },
  { codigo:'5240', nombre:'Vacaciones',                                       tipo:'GASTO',   subtipo:'Personal' },
  { codigo:'5250', nombre:'IGSS Patronal',                                    tipo:'GASTO',   subtipo:'Personal' },
  { codigo:'5260', nombre:'Indemnizaciones',                                  tipo:'GASTO',   subtipo:'Personal' },
  { codigo:'5270', nombre:'Capacitación',                                     tipo:'GASTO',   subtipo:'Personal' },
  // 53XX — Administración
  { codigo:'5300', nombre:'Servicios Profesionales',                          tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5310', nombre:'Honorarios Contables',                             tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5320', nombre:'Telefonía e Internet',                             tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5330', nombre:'Energía Eléctrica',                                tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5340', nombre:'Agua',                                             tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5350', nombre:'Papelería y Útiles',                               tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5360', nombre:'Arrendamientos',                                   tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5370', nombre:'Gastos Bancarios',                                 tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5380', nombre:'Gastos Generales',                                 tipo:'GASTO',   subtipo:'Administración' },
  { codigo:'5390', nombre:'Gastos de Representación',                         tipo:'GASTO',   subtipo:'Administración' },
  // 54XX — Depreciaciones
  { codigo:'5400', nombre:'Depreciación Vehículos',                           tipo:'GASTO',   subtipo:'Depreciaciones' },
  { codigo:'5410', nombre:'Depreciación Equipo de Computación',               tipo:'GASTO',   subtipo:'Depreciaciones' },
  { codigo:'5420', nombre:'Depreciación Mobiliario y Equipo',                 tipo:'GASTO',   subtipo:'Depreciaciones' },
  // 55XX — Impuestos
  { codigo:'5500', nombre:'ISR Trimestral',                                   tipo:'GASTO',   subtipo:'Impuestos' },
  { codigo:'5510', nombre:'Impuesto Único Sobre Inmuebles',                   tipo:'GASTO',   subtipo:'Impuestos' },
  { codigo:'5520', nombre:'Multas y Recargos No Deducibles',                  tipo:'GASTO',   subtipo:'Impuestos' },
]

// ── UI HELPERS ───────────────────────────────────────────────────────────────

const inp = () => ({
  padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border)',
  background:'var(--inner-bg)', color:'var(--text-1)', fontSize:'13px',
  outline:'none', width:'100%', boxSizing:'border-box',
})
const btn = (v = 'primary') => ({
  padding:'8px 16px', borderRadius:'9px', border:'none', fontSize:'13px',
  fontWeight:'600', cursor:'pointer', transition:'opacity 0.12s',
  background: v === 'primary' ? 'var(--accent)' : v === 'danger' ? '#ef4444' : 'var(--inner-bg)',
  color: v === 'secondary' ? 'var(--text-1)' : '#fff',
})
const btnSm = (v) => ({
  padding:'4px 10px', borderRadius:'7px', border:'none', fontSize:'11px',
  fontWeight:'500', cursor:'pointer',
  background: v === 'danger' ? '#fee2e2' : v === 'warn' ? '#fef9c3' : 'var(--inner-bg)',
  color: v === 'danger' ? '#dc2626' : v === 'warn' ? '#ca8a04' : 'var(--text-1)',
})
const th = () => ({ padding:'7px 10px', textAlign:'left', fontSize:'11px', color:'var(--text-muted)', fontWeight:'600' })

function Modal({ title, children, onClose, wide }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:400,
        display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'var(--card-bg)', borderRadius:'16px', padding:'24px',
        width:'100%', maxWidth: wide ? '740px' : '480px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <span style={{ fontSize:'16px', fontWeight:'700', color:'var(--text-1)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'22px', lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
      <label style={{ fontSize:'12px', fontWeight:'500', color:'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function TipoBadge({ tipo, estado }) {
  if (estado === 'ANULADO') return <span style={{ fontSize:'10px', fontWeight:'600', padding:'2px 7px', borderRadius:'20px', background:'#fee2e220', color:'#dc2626' }}>Anulado</span>
  const map = { VENTA:['#dcfce720','#16a34a'], COMPRA:['#dbeafe20','#2563eb'], GENERAL:['var(--inner-bg)','var(--text-muted)'] }
  const [bg, color] = map[tipo] || map.GENERAL
  return <span style={{ fontSize:'10px', fontWeight:'600', padding:'2px 7px', borderRadius:'20px', background:bg, color }}>{tipo}</span>
}

// ── MÓDULO 1: CATÁLOGO ───────────────────────────────────────────────────────

const TIPO_RANGO = {
  ACTIVO:  { min: 1000, max: 1999 },
  PASIVO:  { min: 2000, max: 2999 },
  CAPITAL: { min: 3000, max: 3999 },
  INGRESO: { min: 4000, max: 4999 },
  GASTO:   { min: 5000, max: 5999 },
}
const SUBTIPO_OPCIONES = {
  ACTIVO:  ['Activo Corriente', 'Activo No Corriente'],
  PASIVO:  ['Pasivo Corriente', 'Pasivo No Corriente'],
  CAPITAL: ['Capital', 'Reservas', 'Resultados Acumulados'],
  INGRESO: ['Ingresos Operacionales', 'Otros Ingresos'],
  GASTO:   ['Gastos Operacionales', 'Otros Gastos'],
}
// Checkbox custom acorde al tema
function CkBox({ checked, indeterminate, onChange, onClick }) {
  return (
    <div
      onClick={onClick || onChange}
      style={{
        width:'17px', height:'17px', borderRadius:'5px', flexShrink:0,
        border: checked || indeterminate ? 'none' : '1.5px solid var(--border-card)',
        background: checked ? 'var(--accent)' : indeterminate ? 'var(--accent)' : 'var(--inner-bg)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', transition:'all 0.15s', userSelect:'none',
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {indeterminate && !checked && (
        <div style={{ width:'8px', height:'2px', background:'#fff', borderRadius:'1px' }} />
      )}
    </div>
  )
}

function sugerirCodigo(tipo, cuentas) {
  const { min, max } = TIPO_RANGO[tipo]
  const nums = cuentas
    .filter(c => c.tipo === tipo)
    .map(c => parseInt(c.codigo))
    .filter(n => !isNaN(n) && n >= min && n <= max)
    .sort((a, b) => a - b)
  if (nums.length === 0) return String(min + 100)
  const siguiente = nums[nums.length - 1] + 10
  return String(siguiente <= max ? siguiente : min + 100)
}

function CatalogTab({ cuentas, onReload, userId, empresaId }) {
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState({ codigo:'', nombre:'', tipo:'ACTIVO', subtipo:'' })
  const [saving, setSaving]         = useState(false)
  const [seleccionados, setSelec]   = useState(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)

  const openNew  = () => {
    const tipo = 'ACTIVO'
    setForm({ codigo: '', nombre:'', tipo, subtipo:'' })
    setModal({ mode:'new' })
  }
  const openEdit = (c) => { setForm({ codigo:c.codigo, nombre:c.nombre, tipo:c.tipo, subtipo:c.subtipo||'' }); setModal({ mode:'edit', cuenta:c }) }

  const handleTipoChange = (nuevoTipo) => {
    setForm(f => ({ ...f, tipo: nuevoTipo, codigo: '', subtipo: '' }))
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (modal.mode === 'new') await supabase.from('conta_cuentas').insert({ ...form, user_id:userId, empresa_id:empresaId })
      else await supabase.from('conta_cuentas').update(form).eq('id', modal.cuenta.id)
      setModal(null); onReload()
    } finally { setSaving(false) }
  }

  const handleToggle = async (c) => { await supabase.from('conta_cuentas').update({ activa:!c.activa }).eq('id',c.id); onReload() }
  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar "${c.codigo} - ${c.nombre}"?`)) return
    await supabase.from('conta_cuentas').delete().eq('id',c.id); onReload()
  }
  const handleCargarBase = async () => {
    if (!confirm('¿Agregar las cuentas del catálogo base que no existan?')) return
    const { data: existing } = await supabase.from('conta_cuentas').select('codigo').eq('empresa_id', empresaId)
    const existentes = new Set((existing||[]).map(c => c.codigo))
    const nuevas = CATALOGO_BASE.filter(c => !existentes.has(c.codigo)).map(c => ({ ...c, user_id:userId, empresa_id:empresaId }))
    if (nuevas.length > 0) await supabase.from('conta_cuentas').insert(nuevas)
    onReload()
  }

  // ── Selección múltiple ──
  const toggleSelec = (id) => setSelec(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const todosIds    = cuentas.map(c => c.id)
  const todosMarcados = todosIds.length > 0 && todosIds.every(id => seleccionados.has(id))
  const algunosMarcados = seleccionados.size > 0 && !todosMarcados
  const toggleTodos = () => setSelec(todosMarcados ? new Set() : new Set(todosIds))

  const handleBulkDelete = async () => {
    const ids = [...seleccionados]
    await supabase.from('conta_cuentas').delete().in('id', ids)
    setSelec(new Set()); setConfirmBulk(false); onReload()
  }

  const TIPO_COLORS = { ACTIVO:'#16a34a', PASIVO:'#dc2626', CAPITAL:'#7c3aed', INGRESO:'#0284c7', GASTO:'#ea580c' }
  const grupos = ['ACTIVO','PASIVO','CAPITAL','INGRESO','GASTO']
  const prefijos = { ACTIVO:'1xxx', PASIVO:'2xxx', CAPITAL:'3xxx', INGRESO:'4xxx', GASTO:'5xxx' }

  return (
    <div>
      {/* ── Barra de acciones ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {/* Checkbox "todos" custom */}
          <CkBox checked={todosMarcados} indeterminate={algunosMarcados} onChange={toggleTodos} />
          <span style={{ fontSize:'12px', color:'var(--text-muted)', userSelect:'none' }}>
            {seleccionados.size > 0 ? `${seleccionados.size} seleccionada${seleccionados.size > 1 ? 's' : ''}` : `${cuentas.length} cuentas`}
          </span>
          {seleccionados.size > 0 && (
            <button onClick={() => setConfirmBulk(true)}
              style={{ display:'flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'7px', border:'none', background:'rgba(239,68,68,0.12)', color:'#ef4444', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
              Eliminar {seleccionados.size}
            </button>
          )}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={handleCargarBase} style={btn('secondary')}>Catálogo base</button>
          <button onClick={openNew} style={btn()}>+ Nueva cuenta</button>
        </div>
      </div>

      {grupos.map(tipo => {
        const rows = cuentas.filter(c => c.tipo === tipo).sort((a,b) => a.codigo.localeCompare(b.codigo))
        if (!rows.length) return null
        const color = TIPO_COLORS[tipo]
        return (
          <div key={tipo} style={{ marginBottom:'28px' }}>
            <div style={{ fontSize:'11px', fontWeight:'700', color, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px', paddingBottom:'6px', borderBottom:`2px solid ${color}30` }}>
              {tipo}S — {prefijos[tipo].toUpperCase()}
            </div>
            {rows.map(c => {
              const marcado = seleccionados.has(c.id)
              return (
                <div key={c.id} onClick={() => toggleSelec(c.id)} style={{
                  display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap',
                  padding:'8px 6px', borderBottom:'1px solid var(--border)',
                  opacity: c.activa ? 1 : 0.5,
                  background: marcado ? 'rgba(88,86,214,0.08)' : 'transparent',
                  borderRadius:'6px', cursor:'pointer',
                  transition:'background 0.12s',
                }}>
                  <CkBox checked={marcado} onChange={() => toggleSelec(c.id)} onClick={e => e.stopPropagation()} />
                  <span style={{ fontWeight:'700', color:'var(--accent)', fontFamily:'monospace', fontSize:'13px', minWidth:'42px', flexShrink:0 }}>{c.codigo}</span>
                  <span style={{ flex:'1 1 140px', fontSize:'13px', color:'var(--text-1)', fontWeight:'500' }}>{c.nombre}</span>
                  {c.subtipo && <span style={{ fontSize:'11px', color:'var(--text-muted)', flex:'0 1 auto' }}>{c.subtipo}</span>}
                  <span style={{ fontSize:'11px', fontWeight:'600', padding:'2px 8px', borderRadius:'20px', flexShrink:0,
                    background: c.activa ? '#dcfce720':'var(--inner-bg)',
                    color: c.activa ? '#16a34a':'var(--text-muted)' }}>
                    {c.activa ? 'Activa' : 'Inactiva'}
                  </span>
                  <div onClick={e => e.stopPropagation()} style={{ display:'flex', gap:'5px', marginLeft:'auto', flexShrink:0 }}>
                    <button onClick={() => openEdit(c)} style={btnSm()}>Editar</button>
                    <button onClick={() => handleToggle(c)} style={btnSm()}>{c.activa ? 'Desactivar':'Activar'}</button>
                    <button onClick={() => handleDelete(c)} style={btnSm('danger')}>Eliminar</button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {confirmBulk && (
        <Modal title="Eliminar cuentas seleccionadas" onClose={() => setConfirmBulk(false)}>
          <p style={{ color:'var(--text-1)', fontSize:'14px', lineHeight:'1.5', marginBottom:'8px' }}>
            ¿Eliminar <strong>{seleccionados.size}</strong> cuenta{seleccionados.size > 1 ? 's' : ''} seleccionada{seleccionados.size > 1 ? 's' : ''}?
          </p>
          <p style={{ color:'var(--text-muted)', fontSize:'12px', marginBottom:'20px' }}>Esta acción no se puede deshacer.</p>
          <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
            <button type="button" onClick={() => setConfirmBulk(false)} style={btn('secondary')}>Cancelar</button>
            <button type="button" onClick={handleBulkDelete} style={btn('danger')}>Eliminar</button>
          </div>
        </Modal>
      )}

      {modal && (() => {
        const rango = TIPO_RANGO[form.tipo]
        const codigoNum = parseInt(form.codigo)
        const fueraRango = form.codigo && !isNaN(codigoNum) && (codigoNum < rango.min || codigoNum > rango.max)
        const subtiposDisp = SUBTIPO_OPCIONES[form.tipo] || []
        const codigoYaExiste = form.codigo && cuentas.some(c =>
          c.codigo === form.codigo.trim() && (modal.mode === 'new' || c.id !== modal.cuenta?.id)
        )
        const nombreYaExiste = form.nombre && cuentas.some(c =>
          c.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase() && (modal.mode === 'new' || c.id !== modal.cuenta?.id)
        )
        const cuentaConflicto = codigoYaExiste ? cuentas.find(c => c.codigo === form.codigo.trim()) : null
        const nombreConflicto = nombreYaExiste ? cuentas.find(c => c.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase()) : null
        const hayError = fueraRango || codigoYaExiste || nombreYaExiste
        return (
          <Modal title={modal.mode === 'new' ? 'Nueva cuenta' : 'Editar cuenta'} onClose={() => setModal(null)}>
            <form onSubmit={e => { if (hayError) { e.preventDefault(); return } handleSave(e) }} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <Field label="Tipo">
                <select value={form.tipo} onChange={e => modal.mode === 'new' ? handleTipoChange(e.target.value) : setForm(f=>({...f,tipo:e.target.value}))} style={inp()}>
                  {['ACTIVO','PASIVO','CAPITAL','INGRESO','GASTO'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={`Código (rango válido: ${rango.min}–${rango.max})`}>
                <input
                  value={form.codigo}
                  onChange={e => setForm(f=>({...f,codigo:e.target.value}))}
                  placeholder={`Ej: ${rango.min + 100}`}
                  list="codigos-existentes"
                  style={{ ...inp(), borderColor: hayError ? '#dc2626' : undefined }}
                  required
                />
                <datalist id="codigos-existentes">
                  {cuentas.filter(c => c.tipo === form.tipo).map(c => <option key={c.id} value={c.codigo}>{c.codigo} — {c.nombre}</option>)}
                </datalist>
                {fueraRango && !codigoYaExiste && (
                  <span style={{ fontSize:'11px', color:'#dc2626', marginTop:'2px', display:'block' }}>
                    ⚠ Código fuera del rango para {form.tipo} ({rango.min}–{rango.max})
                  </span>
                )}
                {codigoYaExiste && (
                  <span style={{ fontSize:'11px', color:'#dc2626', marginTop:'2px', display:'block' }}>
                    ✕ Este código ya existe: {cuentaConflicto?.codigo} — {cuentaConflicto?.nombre}
                  </span>
                )}
              </Field>
              <Field label="Nombre">
                <input
                  value={form.nombre}
                  onChange={e => setForm(f=>({...f,nombre:e.target.value}))}
                  placeholder="Nombre de la cuenta"
                  list="nombres-existentes"
                  style={{ ...inp(), borderColor: nombreYaExiste ? '#dc2626' : undefined }}
                  required
                />
                <datalist id="nombres-existentes">
                  {cuentas.filter(c => c.tipo === form.tipo).map(c => <option key={c.id} value={c.nombre}>{c.codigo} — {c.nombre}</option>)}
                </datalist>
                {nombreYaExiste && (
                  <span style={{ fontSize:'11px', color:'#dc2626', marginTop:'2px', display:'block' }}>
                    ✕ Este nombre ya existe: {nombreConflicto?.codigo} — {nombreConflicto?.nombre}
                  </span>
                )}
              </Field>
              <Field label="Subtipo (opcional)">
                <input
                  value={form.subtipo}
                  onChange={e => setForm(f=>({...f,subtipo:e.target.value}))}
                  placeholder={subtiposDisp[0] || 'Ej: Activo Corriente'}
                  list={`subtipo-opts-${form.tipo}`}
                  style={inp()}
                />
                <datalist id={`subtipo-opts-${form.tipo}`}>
                  {subtiposDisp.map(s => <option key={s} value={s} />)}
                </datalist>
              </Field>
              <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'6px' }}>
                <button type="button" onClick={() => setModal(null)} style={btn('secondary')}>Cancelar</button>
                <button type="submit" disabled={saving || hayError} style={btn()}>{saving ? 'Guardando…':'Guardar'}</button>
              </div>
            </form>
          </Modal>
        )
      })()}
    </div>
  )
}

// ── MÓDULO 2: LIBRO DIARIO ───────────────────────────────────────────────────

function DiarioTab({ cuentas, asientos, onReload, userId, empresaId }) {
  const now = new Date()
  const [mes, setMes]   = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [modal, setModal]     = useState(null)
  const [confirmBox, setConfirmBox] = useState(null)
  const [expanded, setExpanded]     = useState(null)

  const filtered = asientos
    .filter(a => { const d = new Date(a.fecha+'T00:00:00'); return d.getFullYear()===year && d.getMonth()===mes })
    .sort((a,b) => a.fecha.localeCompare(b.fecha))

  const handleAnular = async (a) => {
    await supabase.from('conta_auditoria').insert({ user_id:userId, empresa_id:empresaId, asiento_id:a.id, asiento_descripcion:a.descripcion, accion:'ANULADO', datos_antes:a, datos_despues:{...a, estado:'ANULADO'} })
    await supabase.from('conta_asientos').update({ estado:'ANULADO' }).eq('id',a.id)
    setConfirmBox(null); onReload()
  }
  const handleDelete = async (a) => {
    await supabase.from('conta_auditoria').insert({ user_id:userId, empresa_id:empresaId, asiento_id:a.id, asiento_descripcion:a.descripcion, accion:'ELIMINADO', datos_antes:{ ...a, lineas:a.conta_lineas } })
    await supabase.from('conta_asientos').delete().eq('id',a.id)
    setConfirmBox(null); onReload()
  }

  const handleRegularizarIVA = async () => {
    const activos = asientos.filter(a => a.estado === 'ACTIVO')
    const sMap = {}
    activos.forEach(a => {
      (a.conta_lineas||[]).forEach(l => {
        if (!sMap[l.cuenta_id]) sMap[l.cuenta_id] = { deb:0, cre:0 }
        sMap[l.cuenta_id].deb += parseFloat(l.debito)||0
        sMap[l.cuenta_id].cre += parseFloat(l.credito)||0
      })
    })
    const cCF  = cuentas.find(c => c.codigo === '1130') // IVA Crédito Fiscal
    const cDF  = cuentas.find(c => c.codigo === '2110') // IVA Débito Fiscal
    if (!cCF || !cDF) { alert('No se encontraron las cuentas de IVA en el catálogo.'); return }

    const sCF = Math.max(0, (sMap[cCF.id]?.deb||0) - (sMap[cCF.id]?.cre||0)) // saldo activo
    const sDF = Math.max(0, (sMap[cDF.id]?.cre||0) - (sMap[cDF.id]?.deb||0)) // saldo pasivo
    if (sCF < 0.01 && sDF < 0.01) { alert('No hay saldos de IVA para regularizar.'); return }

    // Determinar cuenta "IVA por Pagar" si hace falta
    let cPagar = cuentas.find(c => c.codigo === '2120')
    if (!cPagar && sDF > sCF + 0.01) {
      const { data: ins } = await supabase.from('conta_cuentas')
        .insert({ user_id:userId, empresa_id:empresaId, codigo:'2120', nombre:'IVA por Pagar', tipo:'PASIVO', subtipo:'Pasivo Corriente', activa:true })
        .select().single()
      cPagar = ins
      onReload()
    }

    // Construir lineas del asiento de regularización
    const lineas = []
    // Debe: cancela IVA Débito Fiscal (pasivo → debe para cerrarlo)
    if (sDF > 0.01) lineas.push({ cuenta_id: cDF.id, debito: +sDF.toFixed(2), credito: 0, orden: 0 })
    // Haber: cancela IVA Crédito Fiscal (activo → haber para cerrarlo)
    const creditoCF = Math.min(sCF, sDF) // solo cancela lo que alcanza
    if (creditoCF > 0.01) lineas.push({ cuenta_id: cCF.id, debito: 0, credito: +creditoCF.toFixed(2), orden: 1 })
    // Si Débito > Crédito: diferencia va a IVA por Pagar
    const diff = +(sDF - sCF).toFixed(2)
    if (diff > 0.01 && cPagar) lineas.push({ cuenta_id: cPagar.id, debito: 0, credito: diff, orden: 2 })
    // Si Crédito > Débito: el remanente queda en 1130 (no se toca)

    const mesActual = new Date().toLocaleString('es-GT', { month:'long', year:'numeric' })
    setModal({
      mode: 'new',
      prefill: {
        descripcion: `Regularización IVA — ${mesActual}`,
        tipo: 'GENERAL',
        lineas,
      }
    })
  }

  return (
    <div>
      <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap' }}>
        <select value={mes}  onChange={e=>setMes(+e.target.value)}  style={{...inp(), width:'auto'}}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
        <select value={year} onChange={e=>setYear(+e.target.value)} style={{...inp(), width:'auto'}}>{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
        <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>{filtered.length} asientos</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
          <button onClick={() => {
            const doc = initPDF(`Libro Diario — ${MESES[mes]} ${year}`, `${filtered.length} asientos`)
            const body = []
            filtered.forEach((a, i) => {
              const rowBg = i % 2 === 0 ? [255,255,255] : [250,250,252]
              body.push([
                { content: i+1, styles: { fontStyle:'bold', fillColor:rowBg } },
                { content: a.fecha, styles: { fontStyle:'bold', fillColor:rowBg } },
                { content: a.tipo, styles: { fontStyle:'bold', fillColor:rowBg } },
                { content: a.descripcion, styles: { fontStyle:'bold', fillColor:rowBg } },
                { content: a.no_factura||'–', styles: { fontStyle:'bold', fillColor:rowBg } },
                { content: a.nit||'–', styles: { fontStyle:'bold', fillColor:rowBg } },
                { content: a.total ? Qp(a.total):'–', styles: { fontStyle:'bold', halign:'right', fillColor:rowBg } },
              ])
              const lineas = (a.conta_lineas||[]).sort((x,y)=>x.orden-y.orden)
              lineas.forEach(l => {
                const nombre = l.conta_cuentas ? `${l.conta_cuentas.codigo} — ${l.conta_cuentas.nombre}` : '–'
                body.push([
                  { content:'', styles:{ fillColor:[245,245,250] } },
                  { content: nombre, colSpan:4, styles:{ fillColor:[245,245,250], fontSize:7, textColor:[90,90,110], fontStyle:'italic' } },
                  { content: l.debito>0 ? Qp(l.debito):'–', styles:{ fillColor:[245,245,250], fontSize:7, halign:'right', textColor: l.debito>0 ? [22,163,74]:[180,180,180] } },
                  { content: l.credito>0 ? Qp(l.credito):'–', styles:{ fillColor:[245,245,250], fontSize:7, halign:'right', textColor: l.credito>0 ? [220,38,38]:[180,180,180] } },
                ])
              })
            })
            autoTable(doc, {
              startY: 36,
              head: [['#','Fecha','Tipo','Descripción','Factura','NIT/Debe','Total/Haber']],
              body,
              headStyles: { fillColor:[88,86,214], fontSize:8 },
              bodyStyles: { fontSize:8 },
              columnStyles: { 5:{halign:'right'}, 6:{halign:'right'} },
            })
            doc.save(`libro-diario-${MESES[mes].toLowerCase()}-${year}.pdf`)
          }} style={{ padding:'7px 14px', borderRadius:'8px', border:'1.5px solid var(--accent)', background:'transparent', color:'var(--accent)', fontWeight:'600', fontSize:'12px', cursor:'pointer' }}>Descargar PDF</button>
          <button onClick={handleRegularizarIVA} style={{ padding:'7px 14px', borderRadius:'8px', border:'1.5px solid #16a34a', background:'transparent', color:'#16a34a', fontWeight:'600', fontSize:'12px', cursor:'pointer' }}>Regularizar IVA</button>
          <button onClick={() => setModal({ mode:'new' })} style={btn()}>+ Nuevo asiento</button>
        </div>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {['Fecha','Tipo','Descripción','Factura','NIT','Total',''].map(h=><th key={h} style={th()}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} style={{ padding:'36px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>Sin asientos en este período</td></tr>
          )}
          {filtered.map(a => (
            <Fragment key={a.id}>
              <tr style={{ borderBottom:'1px solid var(--border)', opacity: a.estado==='ANULADO' ? 0.5 : 1 }}>
                <td style={{ padding:'9px 10px', fontSize:'12px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{a.fecha}</td>
                <td style={{ padding:'9px 10px' }}><TipoBadge tipo={a.tipo} estado={a.estado} /></td>
                <td style={{ padding:'9px 10px', fontSize:'13px', color:'var(--text-1)', maxWidth:'200px' }}>
                  <button onClick={() => setExpanded(expanded===a.id ? null : a.id)}
                    style={{ background:'none', border:'none', color:'var(--text-1)', fontSize:'13px', cursor:'pointer', textAlign:'left', padding:0, textDecoration: expanded===a.id ? 'underline':'none' }}>
                    {a.descripcion}
                  </button>
                </td>
                <td style={{ padding:'9px 10px', fontSize:'12px', color:'var(--text-muted)' }}>{a.no_factura||'–'}</td>
                <td style={{ padding:'9px 10px', fontSize:'12px', color:'var(--text-muted)' }}>{a.nit||'–'}</td>
                <td style={{ padding:'9px 10px', fontSize:'13px', fontVariantNumeric:'tabular-nums' }}>{a.total ? Q(a.total) : '–'}</td>
                <td style={{ padding:'9px 10px' }}>
                  {a.estado==='ACTIVO' && (
                    <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                      <button onClick={() => setModal({ mode:'edit', asiento:a })} style={btnSm()}>Editar</button>
                      <button onClick={() => setConfirmBox({ action:'anular', asiento:a })} style={btnSm('warn')}>Anular</button>
                      <button onClick={() => setConfirmBox({ action:'delete', asiento:a })} style={btnSm('danger')}>Eliminar</button>
                    </div>
                  )}
                </td>
              </tr>
              {expanded===a.id && (
                <tr style={{ background:'var(--inner-bg)', borderBottom:'1px solid var(--border)' }}>
                  <td colSpan={7} style={{ padding:'12px 20px' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead><tr>{['Cuenta','Debe','Haber'].map(h=><th key={h} style={{...th(), padding:'4px 8px'}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(a.conta_lineas||[]).sort((x,y)=>x.orden-y.orden).map(l=>(
                          <tr key={l.id} style={{ borderBottom:'1px solid var(--border)' }}>
                            <td style={{ padding:'5px 8px', fontSize:'12px' }}>{l.conta_cuentas ? `${l.conta_cuentas.codigo} — ${l.conta_cuentas.nombre}` : '–'}</td>
                            <td style={{ padding:'5px 8px', fontSize:'12px', color:'#16a34a' }}>{l.debito>0 ? Q(l.debito) : '–'}</td>
                            <td style={{ padding:'5px 8px', fontSize:'12px', color:'#dc2626' }}>{l.credito>0 ? Q(l.credito) : '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {modal && <AsientoModal mode={modal.mode} asiento={modal.asiento} prefill={modal.prefill} cuentas={cuentas} onClose={()=>setModal(null)} onSaved={onReload} userId={userId} empresaId={empresaId} />}

      {confirmBox && (
        <Modal title={confirmBox.action==='delete' ? 'Eliminar asiento' : 'Anular asiento'} onClose={()=>setConfirmBox(null)}>
          <p style={{ color:'var(--text-1)', fontSize:'14px', marginBottom:'20px', lineHeight:'1.5' }}>
            {confirmBox.action==='delete'
              ? `¿Eliminar permanentemente "${confirmBox.asiento.descripcion}"? La acción quedará en la bitácora.`
              : `¿Anular "${confirmBox.asiento.descripcion}"? Quedará registrado pero no afectará los libros.`}
          </p>
          <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
            <button onClick={()=>setConfirmBox(null)} style={btn('secondary')}>Cancelar</button>
            <button onClick={()=>confirmBox.action==='delete' ? handleDelete(confirmBox.asiento) : handleAnular(confirmBox.asiento)} style={btn('danger')}>
              {confirmBox.action==='delete' ? 'Eliminar' : 'Anular'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── MINI MODAL: NUEVA CUENTA DESDE ASIENTO ───────────────────────────────────

function NuevaCuentaMiniModal({ userId, empresaId, cuentas, queryInicial, onClose, onCreada }) {
  const [form, setForm] = useState(() => {
    const tipo = 'ACTIVO'
    return { tipo, codigo: '', nombre: queryInicial || '', subtipo: '' }
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setForm(f => ({ ...f, codigo: '' }))
  }, [form.tipo])

  const rango = TIPO_RANGO[form.tipo]
  const codigoNum = parseInt(form.codigo)
  const codigoFueraRango = form.codigo && !isNaN(codigoNum) && (codigoNum < rango.min || codigoNum > rango.max)
  const codigoYaExiste = cuentas.some(c => c.codigo === form.codigo)
  const nombreYaExiste = form.nombre.trim() && cuentas.some(c => c.nombre.toLowerCase() === form.nombre.trim().toLowerCase())
  const hayError = codigoYaExiste || nombreYaExiste

  const handleSave = async () => {
    if (hayError || !form.codigo || !form.nombre.trim()) return
    setSaving(true)
    setErrorMsg('')
    try {
      const { data, error } = await supabase.from('conta_cuentas').insert({
        user_id: userId, empresa_id: empresaId,
        codigo: form.codigo.trim(), nombre: form.nombre.trim(),
        tipo: form.tipo, subtipo: form.subtipo, activa: true,
      }).select().single()
      if (error) { setErrorMsg(error.message); return }
      onCreada(data)
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: '16px',
        padding: '24px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div>
            <h3 style={{ margin:'0 0 2px', fontSize:'15px', fontWeight:'700', color:'var(--text-1)' }}>Nueva cuenta al catálogo</h3>
            <p style={{ margin:0, fontSize:'11px', color:'var(--text-muted)' }}>La cuenta se agregará y quedará seleccionada automáticamente.</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'20px', lineHeight:1, padding:'0 0 0 8px' }}>×</button>
        </div>

        <Field label="Tipo">
          <select value={form.tipo} onChange={e => setForm(f=>({...f,tipo:e.target.value}))} style={inp()}>
            {Object.keys(TIPO_RANGO).map(t=><option key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>)}
          </select>
        </Field>

        <div style={{ marginTop:'10px' }}>
          <Field label={`Código (${rango.min}–${rango.max})`}>
            <input value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))}
              placeholder={`Ej: ${rango.min+100}`}
              list="mini-codigos-existentes"
              style={{ ...inp(), borderColor: codigoYaExiste ? '#dc2626' : codigoFueraRango ? '#f59e0b' : undefined }}
            />
            <datalist id="mini-codigos-existentes">
              {cuentas.filter(c=>c.tipo===form.tipo).map(c=><option key={c.id} value={c.codigo}>{c.codigo} — {c.nombre}</option>)}
            </datalist>
            {codigoYaExiste && <span style={{ fontSize:'11px', color:'#dc2626', marginTop:'2px', display:'block' }}>✕ Código ya existe en el catálogo</span>}
            {codigoFueraRango && !codigoYaExiste && <span style={{ fontSize:'11px', color:'#f59e0b', marginTop:'2px', display:'block' }}>⚠ Fuera del rango {rango.min}–{rango.max}</span>}
          </Field>
        </div>

        <div style={{ marginTop:'10px' }}>
          <Field label="Nombre de la cuenta">
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}
              placeholder="Ej: Caja general"
              list="mini-nombres-existentes"
              style={{ ...inp(), borderColor: nombreYaExiste ? '#dc2626' : undefined }}
              autoFocus
            />
            <datalist id="mini-nombres-existentes">
              {cuentas.filter(c=>c.tipo===form.tipo).map(c=><option key={c.id} value={c.nombre}>{c.codigo} — {c.nombre}</option>)}
            </datalist>
            {nombreYaExiste && <span style={{ fontSize:'11px', color:'#dc2626', marginTop:'2px', display:'block' }}>✕ Nombre ya existe en el catálogo</span>}
          </Field>
        </div>

        <div style={{ marginTop:'10px', marginBottom:'4px' }}>
          <Field label="Subtipo (opcional)">
            <select value={form.subtipo} onChange={e=>setForm(f=>({...f,subtipo:e.target.value}))} style={inp()}>
              <option value="">— Sin subtipo —</option>
              {(SUBTIPO_OPCIONES[form.tipo]||[]).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {errorMsg && <div style={{ fontSize:'12px', color:'#dc2626', marginTop:'8px' }}>{errorMsg}</div>}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'18px' }}>
          <button type="button" onClick={onClose} style={btn('secondary')}>Cancelar</button>
          <button type="button" onClick={handleSave}
            disabled={hayError || !form.codigo || !form.nombre.trim() || saving}
            style={{ ...btn(), opacity:(hayError||!form.codigo||!form.nombre.trim()||saving)?0.5:1 }}>
            {saving ? 'Guardando…' : 'Crear y seleccionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MODAL CREAR / EDITAR ASIENTO ─────────────────────────────────────────────

function AsientoModal({ mode, asiento, prefill, cuentas, onClose, onSaved, userId, empresaId }) {
  const hoy = new Date()
  const todayStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`

  const [form, setForm] = useState({
    fecha:       asiento?.fecha || todayStr,
    descripcion: prefill?.descripcion || asiento?.descripcion || '',
    tipo:        prefill?.tipo || asiento?.tipo || 'GENERAL',
    no_factura:  asiento?.no_factura || '',
    nit:         asiento?.nit || '',
    total:       asiento?.total || '',
  })
  const [lineas, setLineas] = useState(() =>
    prefill?.lineas?.length
      ? prefill.lineas
      : asiento?.conta_lineas?.length
        ? asiento.conta_lineas.map(l=>({ cuenta_id:l.cuenta_id, debito:l.debito||0, credito:l.credito||0, orden:l.orden||0 }))
        : [{ cuenta_id:'', debito:0, credito:0, orden:0 }, { cuenta_id:'', debito:0, credito:0, orden:1 }]
  )
  const [totalesRef, setTotalesRef] = useState(() => {
    const n = prefill?.lineas?.length || asiento?.conta_lineas?.length || 2
    return Array(n).fill('')
  })
  const [saving, setSaving] = useState(false)
  const [cuentasAdicionales, setCuentasAdicionales] = useState([])
  const [miniModal, setMiniModal] = useState(null) // { lineaIdx, query }

  const calcIVA = (t) => { const base = (parseFloat(t)||0)/1.12; return { base:+base.toFixed(2), iva:+((parseFloat(t)||0)-base).toFixed(2) } }

  const totalDeb  = lineas.reduce((s,l)=>s+(parseFloat(l.debito)||0), 0)
  const totalCre  = lineas.reduce((s,l)=>s+(parseFloat(l.credito)||0), 0)
  const cuadra    = Math.abs(totalDeb-totalCre) < 0.01 && totalDeb > 0
  const totalBase = totalesRef.reduce((s,t)=>s+(t ? calcIVA(t).base : 0), 0)
  const totalIVA  = totalesRef.reduce((s,t)=>s+(t ? calcIVA(t).iva  : 0), 0)
  const hayTotRef = totalesRef.some(t => !!t)
  const esFactura = ['VENTA','COMPRA'].includes(form.tipo)

  const setLinea = (i, field, val) => setLineas(ls => ls.map((l,idx) => idx===i ? {...l,[field]:val} : l))
  const setTotalRef = (i, val) => setTotalesRef(ts => ts.map((t,idx) => idx===i ? val : t))
  const addLinea = () => { setLineas(ls => [...ls, { cuenta_id:'', debito:0, credito:0, orden:ls.length }]); setTotalesRef(ts => [...ts, '']) }
  const remLinea = (i) => { if (lineas.length>2) { setLineas(ls=>ls.filter((_,idx)=>idx!==i)); setTotalesRef(ts=>ts.filter((_,idx)=>idx!==i)) } }

  const handleAddNueva = (lineaIdx, query) => setMiniModal({ lineaIdx, query })
  const handleCuentaCreada = (nuevaCuenta) => {
    setCuentasAdicionales(prev => [...prev, nuevaCuenta])
    if (miniModal !== null) setLinea(miniModal.lineaIdx, 'cuenta_id', nuevaCuenta.id)
    setMiniModal(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!cuadra) return
    setSaving(true)
    try {
      const { base, iva } = esFactura ? calcIVA(form.total) : { base:null, iva:null }
      const payload = {
        user_id:userId, empresa_id:empresaId, fecha:form.fecha, descripcion:form.descripcion, tipo:form.tipo,
        no_factura: form.no_factura||null, nit:form.nit||null,
        total: form.total ? parseFloat(form.total) : null,
        base_imponible:base, iva, estado:'ACTIVO',
      }
      const lineasPayload = (i, aid) => lineas.filter(l=>l.cuenta_id).map((l,idx)=>({
        asiento_id:aid, user_id:userId, empresa_id:empresaId, cuenta_id:l.cuenta_id,
        debito:parseFloat(l.debito)||0, credito:parseFloat(l.credito)||0, orden:idx,
      }))

      if (mode==='new') {
        const { data:newA } = await supabase.from('conta_asientos').insert(payload).select().single()
        await supabase.from('conta_lineas').insert(lineasPayload(0, newA.id))
      } else {
        await supabase.from('conta_auditoria').insert({
          user_id:userId, empresa_id:empresaId, asiento_id:asiento.id, asiento_descripcion:asiento.descripcion,
          accion:'EDITADO',
          datos_antes:{ ...asiento, lineas:asiento.conta_lineas },
          datos_despues:{ ...payload, lineas },
        })
        await supabase.from('conta_asientos').update({ ...payload, updated_at:new Date().toISOString() }).eq('id',asiento.id)
        await supabase.from('conta_lineas').delete().eq('asiento_id',asiento.id)
        await supabase.from('conta_lineas').insert(lineasPayload(0, asiento.id))
      }
      onSaved(); onClose()
    } finally { setSaving(false) }
  }

  const cActivas = [...cuentas, ...cuentasAdicionales].filter(c=>c.activa).sort((a,b)=>a.codigo.localeCompare(b.codigo))
  const { base: prevBase, iva: prevIva } = esFactura && form.total ? calcIVA(form.total) : {}

  return (
    <>
    <Modal title={mode==='new' ? 'Nuevo asiento' : 'Editar asiento'} onClose={onClose} wide>
      <form onSubmit={handleSave}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <Field label="Fecha"><input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={inp()} required /></Field>
          <Field label="Tipo">
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp()}>
              <option value="GENERAL">General</option>
              <option value="VENTA">Venta</option>
              <option value="COMPRA">Compra</option>
            </select>
          </Field>
        </div>

        {esFactura && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'12px', padding:'12px', background:'var(--inner-bg)', borderRadius:'10px' }}>
            <Field label="No. Factura"><input value={form.no_factura} onChange={e=>setForm(f=>({...f,no_factura:e.target.value}))} placeholder="001-0001" style={inp()} /></Field>
            <Field label="NIT"><input value={form.nit} onChange={e=>setForm(f=>({...f,nit:e.target.value}))} placeholder="1234567-8" style={inp()} /></Field>
            <Field label="Total (con IVA)"><input type="number" step="0.01" value={form.total} onChange={e=>setForm(f=>({...f,total:e.target.value}))} placeholder="0.00" style={inp()} /></Field>
            {prevBase !== undefined && (
              <div style={{ gridColumn:'1/-1', display:'flex', gap:'20px', fontSize:'12px', color:'var(--text-muted)' }}>
                <span>Base imponible: <strong style={{ color:'var(--text-1)' }}>{Q(prevBase)}</strong></span>
                <span>IVA 12%: <strong style={{ color:'var(--text-1)' }}>{Q(prevIva)}</strong></span>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom:'12px' }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Partidas</div>
          <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
            <colgroup>
              <col style={{ width:'auto' }} />
              <col style={{ width:'88px' }} />
              <col style={{ width:'82px' }} />
              <col style={{ width:'72px' }} />
              <col style={{ width:'90px' }} />
              <col style={{ width:'90px' }} />
              <col style={{ width:'26px' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                <th style={th()}>Cuenta</th>
                <th style={{ ...th(), textAlign:'right', color:'#7c6ef0', fontSize:'11px', borderLeft:'1px solid rgba(88,86,214,0.2)' }}>Total c/IVA</th>
                <th style={{ ...th(), textAlign:'right', color:'var(--text-muted)', fontSize:'11px' }}>Base</th>
                <th style={{ ...th(), textAlign:'right', color:'var(--text-muted)', fontSize:'11px', borderRight:'1px solid rgba(88,86,214,0.2)' }}>IVA 12%</th>
                <th style={{ ...th(), textAlign:'right' }}>Debe (Q)</th>
                <th style={{ ...th(), textAlign:'right' }}>Haber (Q)</th>
                <th style={{ width:'26px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'5px 6px' }}>
                    <CuentaSearch
                      cuentas={cActivas}
                      value={l.cuenta_id}
                      onChange={v => setLinea(i, 'cuenta_id', v)}
                      style={{...inp(), fontSize:'12px', width:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
                      onAddNueva={(q) => handleAddNueva(i, q)}
                    />
                  </td>
                  <td style={{ padding:'5px 4px', background:'rgba(88,86,214,0.05)', borderLeft:'1px solid rgba(88,86,214,0.2)' }}>
                    <input type="number" step="0.01" min="0" value={totalesRef[i]||''} placeholder="0.00" onChange={e=>setTotalRef(i,e.target.value)} style={{...inp(), textAlign:'right', width:'100%', borderColor:'rgba(88,86,214,0.35)', fontSize:'12px'}} />
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'right', fontSize:'12px', color: totalesRef[i] ? 'var(--text-1)' : 'var(--text-muted)', background:'rgba(88,86,214,0.05)', whiteSpace:'nowrap' }}>
                    {totalesRef[i] ? Q(calcIVA(totalesRef[i]).base) : '–'}
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'right', fontSize:'12px', color: totalesRef[i] ? '#7c6ef0' : 'var(--text-muted)', background:'rgba(88,86,214,0.05)', whiteSpace:'nowrap', borderRight:'1px solid rgba(88,86,214,0.2)' }}>
                    {totalesRef[i] ? Q(calcIVA(totalesRef[i]).iva) : '–'}
                  </td>
                  <td style={{ padding:'5px 4px' }}>
                    <input type="number" step="0.01" min="0" value={l.debito||''} placeholder="0.00" onChange={e=>setLinea(i,'debito',e.target.value)} style={{...inp(), textAlign:'right', width:'100%', fontSize:'12px'}} />
                  </td>
                  <td style={{ padding:'5px 4px' }}>
                    <input type="number" step="0.01" min="0" value={l.credito||''} placeholder="0.00" onChange={e=>setLinea(i,'credito',e.target.value)} style={{...inp(), textAlign:'right', width:'100%', fontSize:'12px'}} />
                  </td>
                  <td style={{ padding:'5px 2px', textAlign:'center' }}>
                    {lineas.length>2 && <button type="button" onClick={()=>remLinea(i)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:'18px', lineHeight:1 }}>×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'2px solid var(--border)' }}>
                <td style={{ padding:'8px 6px' }}><button type="button" onClick={addLinea} style={btnSm()}>+ Línea</button></td>
                <td style={{ background:'rgba(88,86,214,0.05)', borderLeft:'1px solid rgba(88,86,214,0.2)' }}></td>
                <td style={{ padding:'6px 6px', textAlign:'right', fontSize:'12px', fontWeight:'600', color:'var(--text-muted)', background:'rgba(88,86,214,0.05)' }}>{hayTotRef ? Q(totalBase) : ''}</td>
                <td style={{ padding:'6px 6px', textAlign:'right', fontSize:'12px', fontWeight:'600', color:'#7c6ef0', background:'rgba(88,86,214,0.05)', borderRight:'1px solid rgba(88,86,214,0.2)' }}>{hayTotRef ? Q(totalIVA) : ''}</td>
                <td style={{ padding:'8px 6px', textAlign:'right', fontSize:'13px', fontWeight:'600' }}>{Q(totalDeb)}</td>
                <td style={{ padding:'8px 6px', textAlign:'right', fontSize:'13px', fontWeight:'600' }}>{Q(totalCre)}</td>
                <td style={{ padding:'8px 6px', textAlign:'center', fontSize:'16px' }}>
                  {totalDeb>0 && <span style={{ color: cuadra ? '#16a34a':'#dc2626' }}>{cuadra ? '✓':'✗'}</span>}
                </td>
              </tr>
            </tfoot>
          </table>
          {!cuadra && totalDeb>0 && <div style={{ fontSize:'11px', color:'#dc2626', marginTop:'4px' }}>Diferencia: {Q(Math.abs(totalDeb-totalCre))}</div>}
        </div>

        <div style={{ marginBottom:'12px' }}>
          <Field label="Descripción"><input value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Descripción del asiento" style={inp()} required /></Field>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px' }}>
          <button type="button" onClick={onClose} style={btn('secondary')}>Cancelar</button>
          <button type="submit" disabled={!cuadra||saving} style={{ ...btn(), opacity:(!cuadra||saving)?0.5:1 }}>
            {saving ? 'Guardando…' : mode==='new' ? 'Registrar asiento' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
    {miniModal !== null && (
      <NuevaCuentaMiniModal
        userId={userId}
        empresaId={empresaId}
        cuentas={[...cuentas, ...cuentasAdicionales]}
        queryInicial={miniModal.query}
        onClose={() => setMiniModal(null)}
        onCreada={handleCuentaCreada}
      />
    )}
    </>
  )
}

// ── MÓDULOS 3 Y 4: LIBRO DE VENTAS / COMPRAS ────────────────────────────────

function LibroTab({ tipo, asientos }) {
  const now = new Date()
  const [mes,  setMes]  = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const rows = asientos
    .filter(a => a.tipo===tipo && a.estado==='ACTIVO' && (()=>{ const d=new Date(a.fecha+'T00:00:00'); return d.getFullYear()===year && d.getMonth()===mes })())
    .sort((a,b)=>a.fecha.localeCompare(b.fecha))

  const totBase  = rows.reduce((s,a)=>s+(a.base_imponible||0),0)
  const totIva   = rows.reduce((s,a)=>s+(a.iva||0),0)
  const totTotal = rows.reduce((s,a)=>s+(a.total||0),0)

  return (
    <div>
      <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap' }}>
        <select value={mes}  onChange={e=>setMes(+e.target.value)}  style={{...inp(), width:'auto'}}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
        <select value={year} onChange={e=>setYear(+e.target.value)} style={{...inp(), width:'auto'}}>{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
        <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>{rows.length} registros</span>
        <div style={{ marginLeft:'auto' }}>
          <button onClick={() => {
            const titulo = tipo==='VENTA' ? 'Libro de Ventas' : 'Libro de Compras'
            const doc = initPDF(`${titulo} — ${MESES[mes]} ${year}`, `${rows.length} registros`)
            autoTable(doc, {
              startY: 36,
              head: [['#','Fecha','Descripción','No. Factura','NIT','Base Imponible','IVA 12%','Total']],
              body: [
                ...rows.map((a,i) => [i+1, a.fecha, a.descripcion, a.no_factura||'–', a.nit||'–', Qp(a.base_imponible), Qp(a.iva), Qp(a.total)]),
                ['','','','','TOTALES', Qp(totBase), Qp(totIva), Qp(totTotal)],
              ],
              headStyles: { fillColor:[88,86,214], fontSize:8 },
              bodyStyles: { fontSize:8 },
              columnStyles: { 5:{halign:'right'}, 6:{halign:'right'}, 7:{halign:'right'} },
            })
            doc.save(`${tipo.toLowerCase()}-${MESES[mes].toLowerCase()}-${year}.pdf`)
          }} style={{ padding:'7px 14px', borderRadius:'8px', border:'1.5px solid var(--accent)', background:'transparent', color:'var(--accent)', fontWeight:'600', fontSize:'12px', cursor:'pointer' }}>Descargar PDF</button>
        </div>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {['#','Fecha','Descripción','No. Factura','NIT','Base Imponible','IVA 12%','Total'].map(h=><th key={h} style={th()}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length===0 && <tr><td colSpan={8} style={{ padding:'36px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>Sin registros en este período</td></tr>}
          {rows.map((a,i)=>(
            <tr key={a.id} style={{ borderBottom:'1px solid var(--border)' }}>
              <td style={{ padding:'8px 10px', fontSize:'12px', color:'var(--text-muted)' }}>{i+1}</td>
              <td style={{ padding:'8px 10px', fontSize:'12px', whiteSpace:'nowrap' }}>{a.fecha}</td>
              <td style={{ padding:'8px 10px', fontSize:'13px' }}>{a.descripcion}</td>
              <td style={{ padding:'8px 10px', fontSize:'12px', color:'var(--text-muted)' }}>{a.no_factura||'–'}</td>
              <td style={{ padding:'8px 10px', fontSize:'12px', color:'var(--text-muted)' }}>{a.nit||'–'}</td>
              <td style={{ padding:'8px 10px', fontSize:'13px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{Q(a.base_imponible)}</td>
              <td style={{ padding:'8px 10px', fontSize:'13px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{Q(a.iva)}</td>
              <td style={{ padding:'8px 10px', fontSize:'13px', fontWeight:'600', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{Q(a.total)}</td>
            </tr>
          ))}
        </tbody>
        {rows.length>0 && (
          <tfoot>
            <tr style={{ borderTop:'2px solid var(--border)', background:'var(--inner-bg)' }}>
              <td colSpan={5} style={{ padding:'8px 10px', fontSize:'12px', fontWeight:'700', color:'var(--text-muted)' }}>TOTALES</td>
              <td style={{ padding:'8px 10px', fontSize:'13px', fontWeight:'700', textAlign:'right' }}>{Q(totBase)}</td>
              <td style={{ padding:'8px 10px', fontSize:'13px', fontWeight:'700', textAlign:'right' }}>{Q(totIva)}</td>
              <td style={{ padding:'8px 10px', fontSize:'13px', fontWeight:'700', textAlign:'right' }}>{Q(totTotal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ── MÓDULO 5: LIBRO MAYOR ────────────────────────────────────────────────────

function MayorTab({ cuentas, asientos }) {
  const [expanded, setExpanded] = useState(null)
  const activos = asientos.filter(a=>a.estado==='ACTIVO')

  const map = {}
  cuentas.forEach(c => { map[c.id] = { cuenta:c, deb:0, cre:0, movs:[] } })
  activos.forEach(a => {
    (a.conta_lineas||[]).forEach(l => {
      if (map[l.cuenta_id]) {
        map[l.cuenta_id].deb += parseFloat(l.debito)||0
        map[l.cuenta_id].cre += parseFloat(l.credito)||0
        map[l.cuenta_id].movs.push({ fecha:a.fecha, desc:a.descripcion, deb:parseFloat(l.debito)||0, cre:parseFloat(l.credito)||0 })
      }
    })
  })

  // Regularización IVA automática (visual, sin asiento extra)
  const ivaCF = cuentas.find(c => c.codigo === '1130')
  const ivaDF = cuentas.find(c => c.codigo === '2110')
  if (ivaCF && ivaDF && map[ivaCF.id] && map[ivaDF.id]) {
    const m1 = map[ivaCF.id], m2 = map[ivaDF.id]
    const sCF = m1.deb - m1.cre
    const sDF = m2.cre - m2.deb
    const comp = +Math.min(Math.max(sCF, 0), Math.max(sDF, 0)).toFixed(2)
    if (comp > 0.01) {
      m1.movs.push({ fecha:'', desc:'Regularización IVA', deb:0, cre:comp, virtual:true })
      m1.cre += comp
      m2.movs.push({ fecha:'', desc:'Regularización IVA', deb:comp, cre:0, virtual:true })
      m2.deb += comp
    }
  }

  const rows = Object.values(map).filter(r=>r.deb>0||r.cre>0).sort((a,b)=>a.cuenta.codigo.localeCompare(b.cuenta.codigo))
  const getSaldo = (r) => ['ACTIVO','GASTO'].includes(r.cuenta.tipo) ? r.deb-r.cre : r.cre-r.deb

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div style={{ fontSize:'13px', color:'var(--text-muted)' }}>Saldos acumulados — solo asientos activos. Haz clic en una cuenta para ver movimientos.</div>
        <button onClick={() => {
          const doc = initPDF('Libro Mayor', 'Acumulado — todos los períodos')
          let y = 36
          rows.forEach((r, idx) => {
            if (idx > 0 && y > 230) { doc.addPage(); y = 14 }
            doc.setFontSize(9); doc.setFont('helvetica','bold')
            doc.setTextColor(88,86,214)
            doc.text(`${r.cuenta.codigo} — ${r.cuenta.nombre} (${r.cuenta.tipo})`, 14, y)
            doc.setTextColor(0)
            y += 3
            const movRows = r.movs.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(m=>[m.fecha, m.desc, m.deb>0?Qp(m.deb):'–', m.cre>0?Qp(m.cre):'–'])
            autoTable(doc, {
              startY: y,
              head: [['Fecha','Descripción','Debe','Haber']],
              body: movRows,
              foot: [['','Saldo acumulado', Qp(r.deb), Qp(r.cre)]],
              headStyles: { fillColor:[88,86,214], fontSize:7 },
              bodyStyles: { fontSize:7 },
              footStyles: { fillColor:[235,233,255], textColor:0, fontStyle:'bold', fontSize:7 },
              columnStyles: { 2:{halign:'right'}, 3:{halign:'right'} },
              margin: { left:14, right:14 },
            })
            y = doc.lastAutoTable.finalY + 8
          })
          doc.save('libro-mayor.pdf')
        }} style={{ padding:'7px 14px', borderRadius:'8px', border:'1.5px solid var(--accent)', background:'transparent', color:'var(--accent)', fontWeight:'600', fontSize:'12px', cursor:'pointer' }}>Descargar PDF</button>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {['Código','Cuenta','Tipo','Total Debe','Total Haber','Saldo'].map(h=><th key={h} style={th()}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length===0 && <tr><td colSpan={6} style={{ padding:'36px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>Sin movimientos registrados</td></tr>}
          {rows.map(r => {
            const saldo = getSaldo(r)
            return (
              <Fragment key={r.cuenta.id}>
                <tr style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={()=>setExpanded(expanded===r.cuenta.id ? null : r.cuenta.id)}>
                  <td style={{ padding:'9px 10px', fontSize:'13px', fontWeight:'600', color:'var(--accent)', fontFamily:'monospace' }}>{r.cuenta.codigo}</td>
                  <td style={{ padding:'9px 10px', fontSize:'13px' }}>{r.cuenta.nombre}</td>
                  <td style={{ padding:'9px 10px' }}><span style={{ fontSize:'10px', fontWeight:'600', padding:'2px 7px', borderRadius:'20px', background:'var(--accent-soft)', color:'var(--accent)' }}>{r.cuenta.tipo}</span></td>
                  <td style={{ padding:'9px 10px', fontSize:'13px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{Q(r.deb)}</td>
                  <td style={{ padding:'9px 10px', fontSize:'13px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{Q(r.cre)}</td>
                  <td style={{ padding:'9px 10px', fontSize:'13px', fontWeight:'700', textAlign:'right', fontVariantNumeric:'tabular-nums', color: saldo>=0 ? '#16a34a':'#dc2626' }}>
                    {Q(Math.abs(saldo))}{saldo<0 ? ' (CR)':''}
                  </td>
                </tr>
                {expanded===r.cuenta.id && (
                  <tr style={{ background:'var(--inner-bg)', borderBottom:'1px solid var(--border)' }}>
                    <td colSpan={6} style={{ padding:'10px 20px' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead><tr>{['Fecha','Descripción','Debe','Haber'].map(h=><th key={h} style={{...th(),padding:'4px 8px'}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {r.movs.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map((m,i)=>(
                            <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: m.virtual ? 'var(--accent-soft)' : 'transparent' }}>
                              <td style={{ padding:'4px 8px', fontSize:'12px', color:'var(--text-muted)', fontStyle: m.virtual ? 'italic':'' }}>{m.fecha}</td>
                              <td style={{ padding:'4px 8px', fontSize:'12px', color: m.virtual ? 'var(--accent)':'var(--text-1)', fontStyle: m.virtual ? 'italic':'', fontWeight: m.virtual ? '600':'' }}>{m.desc}</td>
                              <td style={{ padding:'4px 8px', fontSize:'12px', textAlign:'right', color:'#16a34a' }}>{m.deb>0 ? Q(m.deb):'–'}</td>
                              <td style={{ padding:'4px 8px', fontSize:'12px', textAlign:'right', color:'#dc2626' }}>{m.cre>0 ? Q(m.cre):'–'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── MÓDULO 6: ESTADO DE RESULTADOS ───────────────────────────────────────────

function ResultadosTab({ cuentas, asientos }) {
  const activos = asientos.filter(a=>a.estado==='ACTIVO')
  const saldoMap = {}
  activos.forEach(a => {
    (a.conta_lineas||[]).forEach(l => {
      if (!saldoMap[l.cuenta_id]) saldoMap[l.cuenta_id] = { deb:0, cre:0 }
      saldoMap[l.cuenta_id].deb += parseFloat(l.debito)||0
      saldoMap[l.cuenta_id].cre += parseFloat(l.credito)||0
    })
  })
  const getSaldo = (c) => { const s=saldoMap[c.id]||{deb:0,cre:0}; return ['ACTIVO','GASTO'].includes(c.tipo) ? s.deb-s.cre : s.cre-s.deb }

  const ingresos = cuentas.filter(c=>c.tipo==='INGRESO').sort((a,b)=>a.codigo.localeCompare(b.codigo))
  const gastos   = cuentas.filter(c=>c.tipo==='GASTO').sort((a,b)=>a.codigo.localeCompare(b.codigo))
  const totIng   = ingresos.reduce((s,c)=>s+getSaldo(c),0)
  const totGas   = gastos.reduce((s,c)=>s+getSaldo(c),0)
  const utilidad = totIng - totGas

  // Agrupar gastos por subtipo, ordenando grupos por el primer código de cuenta
  const gruposMap = {}
  gastos.forEach(c => {
    const g = c.subtipo || 'Otros'
    if (!gruposMap[g]) gruposMap[g] = { cuentas:[], minCodigo: c.codigo }
    gruposMap[g].cuentas.push(c)
    if (c.codigo < gruposMap[g].minCodigo) gruposMap[g].minCodigo = c.codigo
  })
  const gruposGastos = Object.entries(gruposMap)
    .sort((a,b) => a[1].minCodigo.localeCompare(b[1].minCodigo))
    .map(([label, { cuentas }]) => ({ label, cuentas }))

  const Fila = ({ c }) => { const saldo=getSaldo(c); if (!saldo) return null; return (
    <tr style={{ borderBottom:'1px solid var(--border)' }}>
      <td style={{ padding:'6px 12px', fontSize:'12px', color:'var(--text-muted)', fontFamily:'monospace' }}>{c.codigo}</td>
      <td style={{ padding:'6px 12px', fontSize:'13px' }}>{c.nombre}</td>
      <td style={{ padding:'6px 12px', fontSize:'13px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{Q(saldo)}</td>
    </tr>
  )}

  const descargarPDF = () => {
    const doc = initPDF('Estado de Resultados', 'Acumulado — todos los períodos')
    // Ingresos
    autoTable(doc, {
      startY: 36,
      head: [['INGRESOS','','']],
      body: ingresos.filter(c=>getSaldo(c)!==0).map(c=>[c.codigo, c.nombre, Qp(getSaldo(c))]),
      foot: [['','Total Ingresos', Qp(totIng)]],
      headStyles: { fillColor:[22,163,74], fontSize:9 },
      bodyStyles: { fontSize:8 },
      footStyles: { fillColor:[220,252,231], textColor:0, fontStyle:'bold', fontSize:9 },
      columnStyles: { 2:{halign:'right'} },
    })
    // Encabezado GASTOS
    let y = doc.lastAutoTable.finalY + 8
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setFillColor(234,88,12); doc.setTextColor(255,255,255)
    doc.rect(14, y, 182, 6, 'F')
    doc.text('GASTOS', 16, y+4.2)
    doc.setTextColor(0); y += 8
    // Un bloque por grupo
    gruposGastos.forEach(({ label, cuentas: gc }) => {
      const filas = gc.filter(c=>getSaldo(c)!==0)
      if (!filas.length) return
      const subTotal = gc.reduce((s,c)=>s+getSaldo(c),0)
      autoTable(doc, {
        startY: y,
        head: [[{ content: label, colSpan:3, styles:{ fillColor:[60,60,60], textColor:220, fontSize:8, fontStyle:'bold' } }]],
        body: filas.map(c=>[c.codigo, c.nombre, Qp(getSaldo(c))]),
        foot: [['','Subtotal '+label, Qp(subTotal)]],
        headStyles: { fontSize:8 },
        bodyStyles: { fontSize:8 },
        footStyles: { fillColor:[245,245,245], textColor:80, fontStyle:'bold', fontSize:8 },
        columnStyles: { 2:{halign:'right'} },
        margin: { left:14, right:14 },
      })
      y = doc.lastAutoTable.finalY + 4
    })
    // Total Gastos
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setFillColor(254,226,226); doc.setTextColor(0)
    doc.rect(14, y, 182, 6, 'F')
    doc.text('Total Gastos', 16, y+4.2)
    doc.text(Qp(totGas), 196, y+4.2, { align:'right' })
    y += 12
    // Utilidad
    doc.setFontSize(11); doc.setFont('helvetica','bold')
    doc.setTextColor(utilidad>=0 ? 22:220, utilidad>=0 ? 163:38, utilidad>=0 ? 74:38)
    doc.text(utilidad>=0 ? 'UTILIDAD DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO', 14, y)
    doc.text(Qp(Math.abs(utilidad)), 196, y, { align:'right' })
    doc.save('estado-resultados.pdf')
  }

  return (
    <div style={{ maxWidth:'580px' }}>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
        <button onClick={descargarPDF} style={{ padding:'7px 14px', borderRadius:'8px', border:'1.5px solid var(--accent)', background:'transparent', color:'var(--accent)', fontWeight:'600', fontSize:'12px', cursor:'pointer' }}>Descargar PDF</button>
      </div>
      <div style={{ textAlign:'center', marginBottom:'24px' }}>
        <div style={{ fontSize:'15px', fontWeight:'700', color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Estado de Resultados</div>
        <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Acumulado — todos los períodos</div>
      </div>

      {/* INGRESOS — lista plana */}
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:'#16a34a', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px', padding:'0 12px' }}>Ingresos</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <tbody>{ingresos.map(c=><Fila key={c.id} c={c} />)}</tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid var(--border)', background:'var(--inner-bg)' }}>
              <td colSpan={2} style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700' }}>Total Ingresos</td>
              <td style={{ padding:'8px 12px', fontSize:'14px', fontWeight:'700', textAlign:'right', color:'#16a34a' }}>{Q(totIng)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* GASTOS — agrupados por subtipo */}
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:'#ea580c', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px', padding:'0 12px' }}>Gastos</div>
        {gruposGastos.map(({ label, cuentas: gc }) => {
          const subTotal = gc.reduce((s,c)=>s+getSaldo(c),0)
          const filas = gc.filter(c=>getSaldo(c)!==0)
          if (!filas.length) return null
          return (
            <div key={label} style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:'600', color:'var(--text-muted)', padding:'5px 12px', background:'var(--inner-bg)', borderRadius:'6px', marginBottom:'2px' }}>{label}</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <tbody>{gc.map(c=><Fila key={c.id} c={c} />)}</tbody>
                <tfoot>
                  <tr style={{ borderTop:'1px solid var(--border)' }}>
                    <td colSpan={2} style={{ padding:'6px 12px', fontSize:'12px', color:'var(--text-muted)' }}>Subtotal {label}</td>
                    <td style={{ padding:'6px 12px', fontSize:'12px', fontWeight:'600', textAlign:'right', color:'var(--text-muted)', fontVariantNumeric:'tabular-nums' }}>{Q(subTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        })}
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <tfoot>
            <tr style={{ borderTop:'2px solid var(--border)', background:'var(--inner-bg)' }}>
              <td colSpan={2} style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700' }}>Total Gastos</td>
              <td style={{ padding:'8px 12px', fontSize:'14px', fontWeight:'700', textAlign:'right', color:'#ea580c' }}>{Q(totGas)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ padding:'18px', borderRadius:'12px', background: utilidad>=0 ? '#dcfce720':'#fee2e220', border:`1.5px solid ${utilidad>=0 ? '#16a34a40':'#dc262640'}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'15px', fontWeight:'700' }}>{utilidad>=0 ? 'UTILIDAD DEL EJERCICIO':'PÉRDIDA DEL EJERCICIO'}</span>
          <span style={{ fontSize:'20px', fontWeight:'700', color: utilidad>=0 ? '#16a34a':'#dc2626' }}>{Q(Math.abs(utilidad))}</span>
        </div>
      </div>
    </div>
  )
}

// ── MÓDULO 7: BALANCE GENERAL ─────────────────────────────────────────────────

function BalanceTab({ cuentas, asientos }) {
  const activos = asientos.filter(a=>a.estado==='ACTIVO')
  const saldoMap = {}
  activos.forEach(a => {
    (a.conta_lineas||[]).forEach(l => {
      if (!saldoMap[l.cuenta_id]) saldoMap[l.cuenta_id] = { deb:0, cre:0 }
      saldoMap[l.cuenta_id].deb += parseFloat(l.debito)||0
      saldoMap[l.cuenta_id].cre += parseFloat(l.credito)||0
    })
  })
  // Regularización IVA automática (visual)
  const ivaCF_b = cuentas.find(c => c.codigo === '1130')
  const ivaDF_b = cuentas.find(c => c.codigo === '2110')
  if (ivaCF_b && ivaDF_b) {
    const s1 = saldoMap[ivaCF_b.id] || { deb:0, cre:0 }
    const s2 = saldoMap[ivaDF_b.id] || { deb:0, cre:0 }
    const sCF = s1.deb - s1.cre
    const sDF = s2.cre - s2.deb
    const comp = +Math.min(Math.max(sCF, 0), Math.max(sDF, 0)).toFixed(2)
    if (comp > 0.01) {
      saldoMap[ivaCF_b.id] = { deb: s1.deb, cre: s1.cre + comp }
      saldoMap[ivaDF_b.id] = { deb: s2.deb + comp, cre: s2.cre }
    }
  }

  const getSaldo = (c) => { const s=saldoMap[c.id]||{deb:0,cre:0}; return ['ACTIVO','GASTO'].includes(c.tipo) ? s.deb-s.cre : s.cre-s.deb }

  const cActivos  = cuentas.filter(c=>c.tipo==='ACTIVO').sort((a,b)=>a.codigo.localeCompare(b.codigo))
  const cPasivos  = cuentas.filter(c=>c.tipo==='PASIVO').sort((a,b)=>a.codigo.localeCompare(b.codigo))
  const cCapital  = cuentas.filter(c=>c.tipo==='CAPITAL').sort((a,b)=>a.codigo.localeCompare(b.codigo))
  const cIngresos = cuentas.filter(c=>c.tipo==='INGRESO')
  const cGastos   = cuentas.filter(c=>c.tipo==='GASTO')

  const totAct = cActivos.reduce((s,c)=>s+getSaldo(c),0)
  const totPas = cPasivos.reduce((s,c)=>s+getSaldo(c),0)
  const totCap = cCapital.reduce((s,c)=>s+getSaldo(c),0)
  const utilidad = cIngresos.reduce((s,c)=>s+getSaldo(c),0) - cGastos.reduce((s,c)=>s+getSaldo(c),0)
  const totPasCap = totPas + totCap + utilidad
  const cuadra = Math.abs(totAct - totPasCap) < 0.01

  const Fila = ({ c }) => { const s=getSaldo(c); if (!s) return null; return (
    <tr style={{ borderBottom:'1px solid var(--border)' }}>
      <td style={{ padding:'7px 12px', fontSize:'12px', color:'var(--text-muted)', fontFamily:'monospace' }}>{c.codigo}</td>
      <td style={{ padding:'7px 12px', fontSize:'13px' }}>{c.nombre}</td>
      <td style={{ padding:'7px 12px', fontSize:'13px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{Q(s)}</td>
    </tr>
  )}

  const Seccion = ({ titulo, rows, tot, color, borderColor, extra }) => (
    <div style={{ marginBottom:'20px' }}>
      <div style={{ fontSize:'11px', fontWeight:'700', color, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px', padding:'0 12px' }}>{titulo}</div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <tbody>
          {rows.map(c=><Fila key={c.id} c={c} />)}
          {extra}
        </tbody>
        <tfoot>
          <tr style={{ borderTop:`2px solid ${borderColor}`, background:'var(--inner-bg)' }}>
            <td colSpan={2} style={{ padding:'8px 12px', fontSize:'13px', fontWeight:'700' }}>Total {titulo}</td>
            <td style={{ padding:'8px 12px', fontSize:'14px', fontWeight:'700', textAlign:'right', color }}>{Q(tot)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )

  return (
    <div style={{ maxWidth:'580px' }}>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
        <button onClick={() => {
          const doc = initPDF('Balance General', 'Acumulado — todos los períodos')
          autoTable(doc, {
            startY: 36,
            head: [['ACTIVOS','','']],
            body: cActivos.filter(c=>getSaldo(c)!==0).map(c=>[c.codigo, c.nombre, Qp(getSaldo(c))]),
            foot: [['','Total Activos', Qp(totAct)]],
            headStyles: { fillColor:[22,163,74], fontSize:9 },
            bodyStyles: { fontSize:8 },
            footStyles: { fillColor:[220,252,231], textColor:0, fontStyle:'bold', fontSize:9 },
            columnStyles: { 2:{halign:'right'} },
          })
          autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            head: [['PASIVOS','','']],
            body: cPasivos.filter(c=>getSaldo(c)!==0).map(c=>[c.codigo, c.nombre, Qp(getSaldo(c))]),
            foot: [['','Total Pasivos', Qp(totPas)]],
            headStyles: { fillColor:[220,38,38], fontSize:9 },
            bodyStyles: { fontSize:8 },
            footStyles: { fillColor:[254,226,226], textColor:0, fontStyle:'bold', fontSize:9 },
            columnStyles: { 2:{halign:'right'} },
          })
          autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            head: [['CAPITAL','','']],
            body: [
              ...cCapital.filter(c=>getSaldo(c)!==0).map(c=>[c.codigo, c.nombre, Qp(getSaldo(c))]),
              ['—', utilidad>=0 ? 'Utilidad del ejercicio':'Pérdida del ejercicio', Qp(utilidad)],
            ],
            foot: [['','Total Capital', Qp(totCap+utilidad)]],
            headStyles: { fillColor:[124,58,237], fontSize:9 },
            bodyStyles: { fontSize:8 },
            footStyles: { fillColor:[237,233,254], textColor:0, fontStyle:'bold', fontSize:9 },
            columnStyles: { 2:{halign:'right'} },
          })
          const y2 = doc.lastAutoTable.finalY + 10
          doc.setFontSize(9); doc.setFont('helvetica','bold')
          doc.setTextColor(cuadra ? 22:220, cuadra ? 163:38, cuadra ? 74:38)
          doc.text(`Activos = Pasivos + Capital: ${cuadra ? 'CUADRA ✓':'NO CUADRA ✗'}`, 14, y2)
          doc.save('balance-general.pdf')
        }} style={{ padding:'7px 14px', borderRadius:'8px', border:'1.5px solid var(--accent)', background:'transparent', color:'var(--accent)', fontWeight:'600', fontSize:'12px', cursor:'pointer' }}>Descargar PDF</button>
      </div>
      <div style={{ textAlign:'center', marginBottom:'24px' }}>
        <div style={{ fontSize:'15px', fontWeight:'700', color:'var(--text-1)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Balance General</div>
        <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Acumulado — todos los períodos</div>
      </div>

      <Seccion titulo="Activos"  rows={cActivos} tot={totAct} color="#16a34a" borderColor="#16a34a40" />
      <Seccion titulo="Pasivos"  rows={cPasivos} tot={totPas} color="#dc2626" borderColor="#dc262640" />
      <Seccion titulo="Capital"  rows={cCapital} tot={totCap+utilidad} color="#7c3aed" borderColor="#7c3aed40"
        extra={
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            <td style={{ padding:'7px 12px', fontSize:'12px', color:'var(--text-muted)', fontFamily:'monospace' }}>—</td>
            <td style={{ padding:'7px 12px', fontSize:'13px', fontStyle:'italic' }}>{utilidad>=0 ? 'Utilidad del ejercicio':'Pérdida del ejercicio'}</td>
            <td style={{ padding:'7px 12px', fontSize:'13px', textAlign:'right', color: utilidad>=0 ? '#16a34a':'#dc2626' }}>{Q(utilidad)}</td>
          </tr>
        }
      />

      <div style={{ padding:'16px', borderRadius:'12px', background: cuadra ? '#dcfce720':'#fee2e220', border:`1.5px solid ${cuadra ? '#16a34a40':'#dc262640'}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
          <span style={{ fontSize:'14px', fontWeight:'700' }}>Activos = Pasivos + Capital</span>
          <span style={{ fontSize:'18px', color: cuadra ? '#16a34a':'#dc2626' }}>{cuadra ? '✓':'✗'}</span>
        </div>
        <div style={{ display:'flex', gap:'24px', fontSize:'12px', color:'var(--text-muted)' }}>
          <span>Total Activos: <strong style={{ color:'var(--text-1)' }}>{Q(totAct)}</strong></span>
          <span>Pas + Cap: <strong style={{ color:'var(--text-1)' }}>{Q(totPasCap)}</strong></span>
          {!cuadra && <span style={{ color:'#dc2626' }}>Dif: {Q(Math.abs(totAct-totPasCap))}</span>}
        </div>
      </div>
    </div>
  )
}

// ── MÓDULO 8: BITÁCORA ───────────────────────────────────────────────────────

const CAMPO_LABELS = {
  fecha:'Fecha', tipo:'Tipo', descripcion:'Descripción',
  no_factura:'No. Factura', nit:'NIT', total:'Total',
  base_imponible:'Base imponible', iva:'IVA', estado:'Estado',
}

const TIPO_LABELS = { GENERAL:'General', VENTA:'Venta', COMPRA:'Compra' }

function BitacoraDetalle({ r, cuentas }) {
  const antes   = r.datos_antes  || {}
  const despues = r.datos_despues || {}

  const norm = v => (v === null || v === undefined) ? '' : String(v)
  const fmtQ = v => v > 0 ? `Q ${Number(v).toLocaleString('es-GT',{minimumFractionDigits:2})}` : '—'
  const fmtCampo = (k, v) => {
    if (norm(v) === '') return '—'
    if (['total','base_imponible','iva'].includes(k)) return `Q ${Number(v).toLocaleString('es-GT',{minimumFractionDigits:2})}`
    if (k === 'tipo') return TIPO_LABELS[v] || v
    return norm(v)
  }
  const cuentaNombre = id => {
    if (!id) return '—'
    const c = cuentas.find(c => c.id === id)
    return c ? `${c.codigo} — ${c.nombre}` : '—'
  }
  const lineaNombre = l => l.conta_cuentas
    ? `${l.conta_cuentas.codigo} — ${l.conta_cuentas.nombre}`
    : cuentaNombre(l.cuenta_id)

  const muted = { fontSize:'11px', color:'var(--text-muted)', fontWeight:'600' }
  const sep   = { borderBottom:'1px solid var(--border)' }

  // ── ANULADO ──
  if (r.accion === 'ANULADO') {
    return (
      <div style={{ fontSize:'13px', color:'var(--text-muted)' }}>
        El asiento fue marcado como <strong style={{ color:'#ca8a04' }}>ANULADO</strong>.
      </div>
    )
  }

  // ── ELIMINADO ──
  if (r.accion === 'ELIMINADO') {
    const lineas = antes.lineas || antes.conta_lineas || []
    return (
      <div>
        <div style={{ fontSize:'11px', fontWeight:'700', color:'#dc2626', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Asiento eliminado
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'130px 1fr', gap:'6px 12px', marginBottom:'14px' }}>
          {Object.entries(CAMPO_LABELS).filter(([k]) => norm(antes[k]) !== '').map(([k, lbl]) => (
            <Fragment key={k}>
              <span style={muted}>{lbl}</span>
              <span style={{ fontSize:'12px', color:'var(--text-1)' }}>{fmtCampo(k, antes[k])}</span>
            </Fragment>
          ))}
        </div>
        {lineas.length > 0 && (
          <>
            <div style={{ ...muted, marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Partidas</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', gap:'4px', marginBottom:'4px' }}>
              <span style={muted}>Cuenta</span>
              <span style={{ ...muted, textAlign:'right' }}>Debe</span>
              <span style={{ ...muted, textAlign:'right' }}>Haber</span>
            </div>
            {lineas.map((l, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px', gap:'4px', padding:'5px 0', ...sep, fontSize:'12px' }}>
                <span style={{ color:'var(--text-1)' }}>{lineaNombre(l)}</span>
                <span style={{ textAlign:'right', color: l.debito > 0 ? 'var(--text-1)' : 'var(--text-muted)' }}>{fmtQ(l.debito)}</span>
                <span style={{ textAlign:'right', color: l.credito > 0 ? 'var(--text-1)' : 'var(--text-muted)' }}>{fmtQ(l.credito)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  // ── EDITADO ──
  const camposEditados = Object.keys(CAMPO_LABELS).filter(k => norm(antes[k]) !== norm(despues[k]))
  const lineasA = antes.lineas || antes.conta_lineas || []
  const lineasD = despues.lineas || []
  const maxLen  = Math.max(lineasA.length, lineasD.length)

  const lineasCambiadas = Array(maxLen).fill(null).map((_, i) => {
    const la = lineasA[i], ld = lineasD[i]
    const igual = la && ld &&
      norm(la.cuenta_id) === norm(ld.cuenta_id) &&
      Number(la.debito)  === Number(ld.debito)  &&
      Number(la.credito) === Number(ld.credito)
    return { la, ld, igual, isNew: !la && !!ld, isRemoved: !!la && !ld, changed: la && ld && !igual }
  }).filter(x => !x.igual)

  if (camposEditados.length === 0 && lineasCambiadas.length === 0) {
    return <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Sin cambios detectados.</div>
  }

  return (
    <div>
      {camposEditados.length > 0 && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr', gap:'4px', marginBottom:'4px' }}>
            <span />
            <span style={{ ...muted, textTransform:'uppercase', letterSpacing:'0.05em' }}>Antes</span>
            <span style={{ ...muted, textTransform:'uppercase', letterSpacing:'0.05em' }}>Después</span>
          </div>
          {camposEditados.map(k => (
            <div key={k} style={{ display:'grid', gridTemplateColumns:'130px 1fr 1fr', gap:'4px 12px', padding:'5px 0', ...sep, alignItems:'center' }}>
              <span style={muted}>{CAMPO_LABELS[k]}</span>
              <span style={{ fontSize:'12px', color:'#dc2626', textDecoration:'line-through' }}>{fmtCampo(k, antes[k])}</span>
              <span style={{ fontSize:'12px', color:'#16a34a', fontWeight:'600' }}>{fmtCampo(k, despues[k])}</span>
            </div>
          ))}
        </>
      )}

      {lineasCambiadas.length > 0 && (
        <div style={{ marginTop: camposEditados.length > 0 ? '14px' : '0' }}>
          <div style={{ ...muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>Partidas modificadas</div>
          <div style={{ display:'grid', gridTemplateColumns:'16px 1fr 80px 80px', gap:'4px', marginBottom:'4px' }}>
            <span /><span style={muted}>Cuenta</span>
            <span style={{ ...muted, textAlign:'right' }}>Debe</span>
            <span style={{ ...muted, textAlign:'right' }}>Haber</span>
          </div>
          {lineasCambiadas.map(({ la, ld, isNew, isRemoved, changed }, i) => (
            <Fragment key={i}>
              {la && (
                <div style={{ display:'grid', gridTemplateColumns:'16px 1fr 80px 80px', gap:'4px', padding:'4px 0', ...sep, fontSize:'12px' }}>
                  <span style={{ color:'#dc2626', fontWeight:'700' }}>−</span>
                  <span style={{ color:'#dc2626', textDecoration: isRemoved ? 'line-through' : 'none' }}>{lineaNombre(la)}</span>
                  <span style={{ textAlign:'right', color:'#dc2626' }}>{la.debito > 0 ? fmtQ(la.debito) : '—'}</span>
                  <span style={{ textAlign:'right', color:'#dc2626' }}>{la.credito > 0 ? fmtQ(la.credito) : '—'}</span>
                </div>
              )}
              {ld && (isNew || changed) && (
                <div style={{ display:'grid', gridTemplateColumns:'16px 1fr 80px 80px', gap:'4px', padding:'4px 0', ...sep, fontSize:'12px' }}>
                  <span style={{ color:'#16a34a', fontWeight:'700' }}>+</span>
                  <span style={{ color:'#16a34a' }}>{cuentaNombre(ld.cuenta_id)}</span>
                  <span style={{ textAlign:'right', color:'#16a34a' }}>{ld.debito > 0 ? fmtQ(ld.debito) : '—'}</span>
                  <span style={{ textAlign:'right', color:'#16a34a' }}>{ld.credito > 0 ? fmtQ(ld.credito) : '—'}</span>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

function BitacoraTab({ auditoria, cuentas }) {
  const [expanded, setExpanded] = useState(null)
  const accionStyle = { EDITADO:['#dbeafe20','#2563eb'], ELIMINADO:['#fee2e220','#dc2626'], ANULADO:['#fef9c320','#ca8a04'] }

  return (
    <div>
      <div style={{ fontSize:'13px', color:'var(--text-muted)', marginBottom:'20px' }}>
        {auditoria.length} registros — del más reciente al más antiguo
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {['Fecha y hora','Acción','Asiento',''].map(h=><th key={h} style={th()}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {auditoria.length===0 && <tr><td colSpan={4} style={{ padding:'36px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>La bitácora está vacía</td></tr>}
          {auditoria.map(r => {
            const [bg, color] = accionStyle[r.accion] || accionStyle.EDITADO
            const d = new Date(r.fecha)
            const fechaStr = d.toLocaleDateString('es-GT', { day:'2-digit', month:'2-digit', year:'numeric' })
            const horaStr  = d.toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' })
            return (
              <Fragment key={r.id}>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'9px 10px', fontSize:'12px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fechaStr} {horaStr}</td>
                  <td style={{ padding:'9px 10px' }}>
                    <span style={{ fontSize:'11px', fontWeight:'600', padding:'3px 8px', borderRadius:'20px', background:bg, color }}>{r.accion}</span>
                  </td>
                  <td style={{ padding:'9px 10px', fontSize:'13px' }}>{r.asiento_descripcion||'–'}</td>
                  <td style={{ padding:'9px 10px' }}>
                    {(r.datos_antes||r.datos_despues) && (
                      <button onClick={()=>setExpanded(expanded===r.id ? null : r.id)} style={btnSm()}>
                        {expanded===r.id ? 'Ocultar':'Ver detalle'}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded===r.id && (
                  <tr style={{ background:'var(--inner-bg)', borderBottom:'1px solid var(--border)' }}>
                    <td colSpan={4} style={{ padding:'14px 20px' }}>
                      <BitacoraDetalle r={r} cuentas={cuentas} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const TABS_LIST = [
  { key:'CATALOGO',   label:'Catálogo' },
  { key:'DIARIO',     label:'Libro Diario' },
  { key:'VENTAS',     label:'L. Ventas' },
  { key:'COMPRAS',    label:'L. Compras' },
  { key:'MAYOR',      label:'Libro Mayor' },
  { key:'RESULTADOS', label:'Est. Resultados' },
  { key:'BALANCE',    label:'Balance Gral.' },
  { key:'BITACORA',   label:'Bitácora' },
]

function CuentaSearch({ cuentas, value, onChange, style, onAddNueva }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [cursor, setCursor] = useState(-1)
  const wrapRef = useRef(null)

  const selected = cuentas.find(c => c.id === value)

  const filtered = query.length === 0
    ? []
    : cuentas.filter(c => {
        const q = query.toLowerCase()
        return c.codigo.startsWith(q) || c.nombre.toLowerCase().includes(q)
      }).slice(0, 12)

  const mostrarDropdown = open && (filtered.length > 0 || (query.length > 0 && onAddNueva))

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (c) => {
    onChange(c.id)
    setQuery('')
    setOpen(false)
    setCursor(-1)
  }

  const handleKey = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(p => Math.min(p + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(p => Math.max(p - 1, 0)) }
    if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); select(filtered[cursor]) }
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input
        value={open ? query : (selected ? `${selected.codigo} — ${selected.nombre}` : '')}
        onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1) }}
        onFocus={() => { setOpen(true); setQuery('') }}
        onKeyDown={handleKey}
        placeholder="— Buscar cuenta —"
        style={{ ...style, cursor: 'text' }}
      />
      {mostrarDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: '10px', marginTop: '2px', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          {filtered.length === 0 && query.length > 0 && (
            <div style={{ padding:'8px 12px', fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic' }}>
              Sin resultados para "{query}"
            </div>
          )}
          {filtered.map((c, i) => (
            <div key={c.id} onMouseDown={() => select(c)}
              style={{
                padding: '7px 12px', fontSize: '12px', cursor: 'pointer',
                background: i === cursor ? 'var(--accent)' : 'transparent',
                color: i === cursor ? '#fff' : 'var(--text-1)',
                display: 'flex', gap: '8px', alignItems: 'center',
              }}>
              <span style={{ fontWeight: '700', minWidth: '38px', color: i === cursor ? '#fff' : 'var(--accent)', fontFamily: 'monospace' }}>{c.codigo}</span>
              <span>{c.nombre}</span>
            </div>
          ))}
          {onAddNueva && (
            <div onMouseDown={() => { setOpen(false); onAddNueva(query) }}
              style={{
                padding:'8px 12px', fontSize:'12px', cursor:'pointer',
                borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none',
                color:'var(--accent)', fontWeight:'600',
                display:'flex', alignItems:'center', gap:'6px',
                background:'transparent',
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agregar nueva cuenta al catálogo
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ContabilidadCompleta({ userId, empresaId }) {
  const [tab,       setTab]       = useState(() => localStorage.getItem('cc_tab') || 'DIARIO')
  const [cuentas,   setCuentas]   = useState([])
  const [asientos,  setAsientos]  = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [{ data:c, error:ec }, { data:a, error:ea }, { data:aud }] = await Promise.all([
        supabase.from('conta_cuentas').select('*').eq('empresa_id', empresaId).order('codigo'),
        supabase.from('conta_asientos').select('*, conta_lineas(*, conta_cuentas(id,codigo,nombre,tipo))').eq('empresa_id', empresaId).order('fecha', { ascending:false }),
        supabase.from('conta_auditoria').select('*').eq('empresa_id', empresaId).order('fecha', { ascending:false }),
      ])
      if (ec) { setLoadError('Error al cargar cuentas: ' + ec.message); setLoading(false); return }
      if (ea) { setLoadError('Error al cargar asientos: ' + ea.message); setLoading(false); return }
      let cuentasFinal = c || []
      setCuentas(cuentasFinal)
      setAsientos(a||[])
      setAuditoria(aud||[])
    } catch(e) {
      setLoadError('Error inesperado: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const changeTab = (k) => { setTab(k); localStorage.setItem('cc_tab', k) }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'60px', color:'var(--text-muted)', fontSize:'14px' }}>Cargando…</div>
  )

  return (
    <div>
      {loadError && (
        <div style={{ marginBottom:'16px', padding:'12px 16px', background:'#fee2e2', borderRadius:'10px', border:'1px solid #fca5a5', fontSize:'13px', color:'#dc2626' }}>
          {loadError}
        </div>
      )}
      {/* Tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'28px', overflowX:'auto', paddingBottom:'4px', flexWrap:'nowrap' }}>
        {TABS_LIST.map(t => (
          <button key={t.key} onClick={() => changeTab(t.key)} style={{
            padding:'7px 14px', borderRadius:'8px', border:'none', fontSize:'13px', whiteSpace:'nowrap',
            fontWeight: tab===t.key ? '600':'400',
            background: tab===t.key ? 'var(--accent)' : 'var(--inner-bg)',
            color: tab===t.key ? '#fff' : 'var(--text-muted)',
            transition:'all 0.15s', cursor:'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='CATALOGO'   && <CatalogTab  cuentas={cuentas}  onReload={load} userId={userId} empresaId={empresaId} />}
      {tab==='DIARIO'     && <DiarioTab   cuentas={cuentas}  asientos={asientos} onReload={load} userId={userId} empresaId={empresaId} />}
      {tab==='VENTAS'     && <LibroTab    tipo="VENTA"  asientos={asientos} />}
      {tab==='COMPRAS'    && <LibroTab    tipo="COMPRA" asientos={asientos} />}
      {tab==='MAYOR'      && <MayorTab    cuentas={cuentas}  asientos={asientos} />}
      {tab==='RESULTADOS' && <ResultadosTab cuentas={cuentas} asientos={asientos} />}
      {tab==='BALANCE'    && <BalanceTab   cuentas={cuentas} asientos={asientos} />}
      {tab==='BITACORA'   && <BitacoraTab  auditoria={auditoria} cuentas={cuentas} />}
    </div>
  )
}
