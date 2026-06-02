import { useState, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'

// ─── IndexedDB: almacena archivos originales para descarga ───────────────────

const IDB_NAME  = 'contabilidad_files'
const IDB_STORE = 'archivos'

function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE)
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}

async function idbSave(key, value) {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
    tx.oncomplete = res
    tx.onerror = e => rej(e.target.error)
  })
}

async function idbLoad(key) {
  const db = await openIDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = e => res(e.target.result ?? null)
    req.onerror   = e => rej(e.target.error)
  })
}

const idbKey = (year, month, tipo) => `${year}_${month}_${tipo}`

async function downloadFromIDB(year, month, tipo, fallbackName) {
  try {
    const stored = await idbLoad(idbKey(year, month, tipo))
    if (!stored?.buffer) { alert('Archivo no encontrado. Vuelve a cargarlo.'); return }
    const mime = stored.name?.endsWith('.xlsx')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel'
    const blob = new Blob([stored.buffer], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = stored.name || fallbackName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  } catch (e) { alert('Error al descargar: ' + e.message) }
}

// ─── helpers ────────────────────────────────────────────────────────────────

const Q = (n) =>
  n === 0 ? '–' : `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const Qn = (n) =>
  `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function colMap(headers) {
  const m = {}
  headers.forEach((h, i) => { if (h) m[String(h).trim()] = i })
  return m
}

function fmtFecha(raw) {
  if (!raw) return ''
  try {
    const d = new Date(raw)
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return String(raw) }
}

// ─── parsers ────────────────────────────────────────────────────────────────

function parseVentas(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return { rows: [], meta: {} }
  const COL = colMap(rows[0])
  const NCR_TIPOS = ['NCRE', 'NAB', 'NCR']
  const data = rows.slice(1).map((r, i) => {
    const anulado = String(r[COL['Marca de anulado']] || '').toLowerCase() === 'si'
    const tipoDTE = r[COL['Tipo de DTE (nombre)']] || ''
    const esNCR   = NCR_TIPOS.includes(tipoDTE)
    const total   = parseFloat(r[COL['Gran Total (Moneda Original)']]) || 0
    const iva     = parseFloat(r[COL['IVA (monto de este impuesto)']]) || 0
    const neto    = total - iva
    return {
      no: i + 1,
      fecha:    fmtFecha(r[COL['Fecha de emisión']]),
      tipoDTE,
      esNCR,
      serie:    r[COL['Serie']] || '',
      numero:   r[COL['Número del DTE']] || '',
      nit:      r[COL['ID del receptor']] || '',
      cliente:  r[COL['Nombre completo del receptor']] || '',
      estado:   anulado ? 'Anulado' : 'Vigente',
      servicios: neto,
      bienes:   0,
      exportacion: 0,
      iva,
      ventasExentas: 0,
      total,
    }
  })
  const meta = {
    nit:    rows[1]?.[COL['NIT del emisor']] || '',
    nombre: rows[1]?.[COL['Nombre completo del emisor']] || '',
  }
  return { rows: data, meta }
}

function parseCompras(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) return { rows: [], meta: {} }
  const COL = colMap(rows[0])
  const data = rows.slice(1).map((r, i) => {
    const anulado      = String(r[COL['Marca de anulado']] || '').toLowerCase() === 'si'
    const total        = parseFloat(r[COL['Gran Total (Moneda Original)']]) || 0
    const iva          = parseFloat(r[COL['IVA (monto de este impuesto)']]) || 0
    const idp          = parseFloat(r[COL['Petróleo (monto de este impuesto)']]) || 0
    const tasaMunicipal= parseFloat(r[COL['Tasa Municipal (monto de este impuesto)']]) || 0
    const esCombustible= idp > 0
    const neto         = esCombustible ? total - idp - iva : total - iva
    return {
      no: i + 1,
      fecha:    fmtFecha(r[COL['Fecha de emisión']]),
      tipoDTE:  r[COL['Tipo de DTE (nombre)']] || '',
      serie:    r[COL['Serie']] || '',
      numero:   r[COL['Número del DTE']] || '',
      nit:      r[COL['NIT del emisor']] || '',
      proveedor:r[COL['Nombre completo del emisor']] || '',
      estado:   anulado ? 'Anulado' : 'Vigente',
      combustibles:       esCombustible ? neto : 0,
      compras:           !esCombustible ? neto : 0,
      servicios: 0,
      importaciones: 0,
      pequenoContrib: 0,
      idp,
      tasaMunicipal,
      iva,
      total,
    }
  })
  const meta = {
    nit:    rows[1]?.[COL['ID del receptor']] || '',
    nombre: rows[1]?.[COL['Nombre completo del receptor']] || '',
  }
  return { rows: data, meta }
}

function parseRetenciones(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  let hi = -1
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || '').includes('NIT RETENEDOR')) { hi = i; break }
  }
  if (hi === -1) return []
  const COL = colMap(rows[hi])
  return rows.slice(hi + 1)
    .filter(r => r[0] && String(r[0]).trim())
    .map((r, i) => ({
      no: i + 1,
      nitRetenedor:    r[COL['NIT RETENEDOR']] || '',
      retenedor:       r[COL['NOMBRE RETENEDOR']] || '',
      estado:          r[COL['ESTADO CONSTANCIA']] || '',
      constancia:      r[COL['CONSTANCIA']] || '',
      fecha:           r[COL['FECHA EMISION']] || '',
      totalFactura:    parseFloat(r[COL['TOTAL FACTURA']]) || 0,
      importeNeto:     parseFloat(r[COL['IMPORTE NETO']]) || 0,
      afectoRetencion: parseFloat(r[COL['AFECTO RETENCIÓN']]) || 0,
      totalRetencion:  parseFloat(r[COL['TOTAL RETENCIÓN']]) || 0,
    }))
}

// ─── UploadZone ─────────────────────────────────────────────────────────────

function UploadZone({ label, fileName, onFile, onDownload }) {
  const onDrop = useCallback(e => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <div style={{ flex: 1, minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '0' }}>
      <label
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '6px', padding: '14px 10px',
          borderRadius: fileName ? '12px 12px 0 0' : '12px', cursor: 'pointer',
          border: `1.5px dashed ${fileName ? 'var(--accent)' : 'var(--border-card)'}`,
          borderBottom: fileName ? 'none' : undefined,
          background: fileName ? 'var(--accent-soft)' : 'var(--inner-bg)',
          transition: 'all 0.15s',
        }}
      >
        <input type="file" accept=".xls,.xlsx" onChange={e => e.target.files[0] && onFile(e.target.files[0])} style={{ display: 'none' }} />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={fileName ? 'var(--accent)' : 'var(--text-muted)'}
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span style={{ fontSize: '11px', fontWeight: '600', color: fileName ? 'var(--accent)' : 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName || 'Arrastra o haz clic'}
        </span>
      </label>

      {/* Botón de descarga — solo aparece si hay archivo guardado */}
      {fileName && onDownload && (
        <button onClick={onDownload} style={{
          width: '100%', padding: '5px 8px', border: '1.5px dashed var(--accent)',
          borderTop: '1px solid var(--accent-soft)', borderRadius: '0 0 12px 12px',
          background: 'var(--accent-soft)', color: 'var(--accent)',
          fontSize: '10px', fontWeight: '600', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar
        </button>
      )}
    </div>
  )
}

// ─── Resumen Fiscal (Formulario IVA) ─────────────────────────────────────────

function ResumenFiscal({ ventas, compras, retenciones }) {
  if (!ventas.length && !compras.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.4 }}>
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <p style={{ fontSize: '14px' }}>Carga los archivos SAT para ver el resumen</p>
        </div>
      </div>
    )
  }

  const NCR_TIPOS = new Set(['NCRE', 'NAB', 'NCR'])
  const vigentes    = ventas.filter(v => v.estado === 'Vigente')
  const factVig     = vigentes.filter(v => !NCR_TIPOS.has(v.tipoDTE))
  const ncrVig      = vigentes.filter(v =>  NCR_TIPOS.has(v.tipoDTE))

  // Ventas Brutas = TODOS los DTEs (vigentes + anulados)
  const ventasBrutas  = ventas.reduce((s, v) => s + v.total, 0)
  const totalAnuladas = ventas.filter(v => v.estado === 'Anulado').reduce((s, v) => s + v.total, 0)
  const totalNCR      = ncrVig.reduce((s, v) => s + v.total, 0)   // NCRE vigentes reducen ventas
  const totalDeducciones = totalAnuladas + totalNCR
  const ventasNetas   = ventasBrutas - totalDeducciones

  // IVA débito = solo las FACTURAS vigentes (las NCR reducen el débito)
  const ivaDebito  = factVig.reduce((s, v) => s + v.iva, 0)
  const ivaRet     = retenciones.reduce((s, r) => s + r.totalRetencion, 0)
  const ivaAPagar  = ivaDebito - ivaRet

  const cVig          = compras.filter(c => c.estado === 'Vigente')
  const combRows      = cVig.filter(c => c.combustibles > 0)
  const compRows      = cVig.filter(c => c.compras > 0)
  const svcRows       = cVig.filter(c => c.servicios > 0)

  // "Total Fac" = precio neto SIN IVA (ni IDP para combustibles)
  const totalFacComb  = combRows.reduce((s, c) => s + c.combustibles, 0)
  const totalFacComp  = compRows.reduce((s, c) => s + c.compras, 0)
  const totalFacSvc   = svcRows.reduce((s, c) => s + c.servicios, 0)
  const totalFacGastos= totalFacComb + totalFacComp + totalFacSvc

  const ivaComb       = combRows.reduce((s, c) => s + c.iva, 0)
  const ivaComp       = compRows.reduce((s, c) => s + c.iva, 0)
  const ivaSvc        = svcRows.reduce((s, c) => s + c.iva, 0)
  const ivaGastos     = ivaComb + ivaComp + ivaSvc

  const totalAPagar   = ivaAPagar - ivaGastos

  // Detectar mes del período desde ventas
  const mesLabel = (() => {
    const row = ventas.find(v => v.fecha)
    if (!row) return ''
    const parts = row.fecha.split('/')
    if (parts.length < 3) return ''
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0])
    return d.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
  })()

  const C  = 'var(--text-1)'
  const CM = 'var(--text-muted)'
  const CR = 'var(--red)'

  const s = {
    card:   { background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', overflow: 'hidden', maxWidth: '600px' },
    title:  { textAlign: 'center', padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--inner-bg)' },
    body:   { padding: '20px 28px' },
    row:    { display: 'grid', alignItems: 'center', marginBottom: '4px' },
    sep:    { height: '1px', background: 'var(--border)', margin: '10px 0' },
    yellow: { background: 'rgba(255,193,7,0.15)', border: '1.5px solid rgba(255,193,7,0.45)', borderRadius: '8px', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' },
    box:    { border: '1.5px solid var(--border-card)', borderRadius: '6px', padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' },
  }

  const Lbl  = ({ t, bold, indent, color }) => <span style={{ fontSize: '13px', fontWeight: bold ? '700' : '400', color: color || (bold ? C : CM), paddingLeft: indent ? '16px' : 0 }}>{t}</span>
  const Val  = ({ v, bold, color }) => <span style={{ fontSize: '13px', fontWeight: bold ? '700' : '400', color: color || C, fontFamily: 'monospace', textAlign: 'right' }}>{v === 0 ? 'Q  –' : Qn(v)}</span>
  const Div  = () => <div style={s.sep} />

  return (
    <div style={s.card}>
      {/* Título */}
      <div style={s.title}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: C, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Formulario IVA</div>
        {mesLabel && <div style={{ fontSize: '12px', color: CM, marginTop: '3px', fontStyle: 'italic' }}>Operación del mes: {mesLabel}</div>}
      </div>

      <div style={s.body}>

        {/* ── Ventas ── */}
        {/* Tabla de deducciones: 3 columnas fijas para alineación perfecta */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
          <colgroup>
            <col style={{ width: '24px' }} />
            <col />
            <col style={{ width: '130px' }} />
          </colgroup>
          <tbody>
            <tr>
              <td />
              <td style={{ padding: '4px 0', fontSize: '13px', fontWeight: '700', color: C }}>Ventas Brutas</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: C }}>{Qn(ventasBrutas)}</td>
            </tr>
            <tr>
              <td style={{ fontSize: '13px', fontWeight: '700', color: CR, paddingRight: '4px' }}>(-)</td>
              <td style={{ padding: '3px 0', fontSize: '13px', color: CM, paddingLeft: '8px' }}>Facturas Anuladas</td>
              <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: CR }}>{Qn(totalAnuladas)}</td>
            </tr>
            <tr>
              <td style={{ fontSize: '13px', fontWeight: '700', color: CR, paddingRight: '4px' }}>(-)</td>
              <td style={{ padding: '3px 0 6px', fontSize: '13px', color: totalNCR > 0 ? CR : CM, paddingLeft: '8px' }}>Notas de Crédito</td>
              <td style={{ padding: '3px 0 6px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: totalNCR > 0 ? CR : CM, borderBottom: '1px solid var(--border)' }}>
                {totalNCR === 0 ? '–' : Qn(totalNCR)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Ventas Netas */}
        <div style={s.box}>
          <Lbl t="Ventas Netas" bold />
          <Val v={ventasNetas} bold />
        </div>

        {/* IVA Débito */}
        <div style={s.yellow}>
          <span style={{ fontSize: '14px', fontWeight: '800', color: C }}>IVA DÉBITO</span>
          <span style={{ fontSize: '15px', fontWeight: '800', color: C, fontFamily: 'monospace' }}>{Qn(ivaDebito)}</span>
        </div>

        <Div />

        {/* Retenciones */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0 8px', alignItems: 'center', marginBottom: '2px' }}>
          <Lbl t="(-)" color={CR} />
          <Lbl t="RETENCIONES IVA" indent />
          <Val v={ivaRet} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', padding: '2px 0' }}>
          <Lbl t="IVA A PAGAR" bold />
          <Val v={ivaAPagar} bold />
        </div>

        <Div />

        {/* Gastos — tabla con columnas bien definidas */}
        <div style={{ borderRadius: '10px', border: '1px solid var(--border-card)', overflow: 'hidden', marginBottom: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--inner-bg)' }}>
                <th style={{ padding: '7px 12px', fontSize: '10px', fontWeight: '700', color: CM, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', width: '40%' }} />
                <th style={{ padding: '7px 12px', fontSize: '10px', fontWeight: '700', color: CM, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', borderLeft: '1px solid var(--border)' }}>Total Fac</th>
                <th style={{ padding: '7px 12px', fontSize: '10px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', borderLeft: '1px solid var(--border)', background: 'var(--accent-soft)' }}>IVA</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Combustibles', fac: totalFacComb, iva: ivaComb },
                { label: 'Compras',      fac: totalFacComp, iva: ivaComp },
                { label: 'Servicios',    fac: totalFacSvc,  iva: ivaSvc  },
              ].map(({ label, fac, iva }, i) => (
                <tr key={label} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                  <td style={{ padding: '7px 12px', fontSize: '13px', color: CM }}>
                    <span style={{ color: CR, fontWeight: '700', marginRight: '6px' }}>(-)</span>
                    {label}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: '13px', fontFamily: 'monospace', textAlign: 'right', color: C, borderLeft: '1px solid var(--border)' }}>
                    {fac === 0 ? '–' : Qn(fac)}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: '13px', fontFamily: 'monospace', textAlign: 'right', fontWeight: '600', color: C, borderLeft: '1px solid var(--border)', background: 'var(--accent-soft)' }}>
                    {iva === 0 ? '–' : Qn(iva)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--inner-bg)' }}>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', color: C }}>TOTAL GASTOS</td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace', textAlign: 'right', fontWeight: '700', color: C, borderLeft: '1px solid var(--border)' }}>
                  {Qn(totalFacGastos)}
                </td>
                <td style={{ padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace', textAlign: 'right', fontWeight: '700', color: 'var(--accent)', borderLeft: '1px solid var(--border)', background: 'var(--accent-soft)' }}>
                  {Qn(ivaGastos)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <Div />

        {/* Total a pagar */}
        <div style={{ ...s.yellow, marginTop: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '800', color: C }}>TOTAL A PAGAR</span>
          <span style={{ fontSize: '15px', fontWeight: '800', color: totalAPagar > 0 ? CR : 'var(--green)', fontFamily: 'monospace' }}>{Qn(totalAPagar)}</span>
        </div>

      </div>
    </div>
  )
}

// ─── Tabla genérica con scroll horizontal ───────────────────────────────────

// Wrapper con scroll horizontal garantizado
const ScrollTable = ({ children, minW }) => (
  <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
    <div style={{ borderRadius: '12px', border: '1px solid var(--border-card)', overflow: 'hidden', minWidth: minW || 'auto' }}>
      {children}
    </div>
  </div>
)

const TH = ({ children, right, mono, w }) => (
  <th style={{
    padding: '8px 10px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap',
    textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)',
    textAlign: right ? 'right' : 'center', background: 'var(--inner-bg)',
    borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1,
    minWidth: w || 'auto',
  }}>{children}</th>
)

const TD = ({ children, right, mono, muted, red, green, bold, small, wrap }) => (
  <td style={{
    padding: '7px 10px', fontSize: small ? '10px' : '12px',
    whiteSpace: wrap ? 'normal' : 'nowrap',
    maxWidth: wrap ? '180px' : undefined,
    overflow: wrap ? 'hidden' : undefined,
    textOverflow: wrap ? 'ellipsis' : undefined,
    textAlign: right ? 'right' : 'left',
    fontFamily: mono ? 'monospace' : 'inherit',
    color: red ? 'var(--red)' : green ? 'var(--green)' : muted ? 'var(--text-muted)' : 'var(--text-1)',
    fontWeight: bold ? '600' : '400',
    borderBottom: '1px solid var(--border)',
  }}>{children}</td>
)

// ─── Libro de Ventas ─────────────────────────────────────────────────────────

function LibroVentas({ rows, meta }) {
  if (!rows.length) {
    return <EmptyState label="Carga el archivo de Ventas SAT" />
  }
  const vigentes = rows.filter(r => r.estado === 'Vigente')
  // NCR ya tiene signo negativo en el parse, la suma neta es correcta
  const totServ  = vigentes.reduce((s, r) => s + r.servicios, 0)
  const totIVA   = vigentes.reduce((s, r) => s + r.iva, 0)
  const totTotal = vigentes.reduce((s, r) => s + r.total, 0)

  return (
    <div>
      <MetaLibro titulo="Libro de Ventas y Servicios Prestados" meta={meta} filas={rows} />
      <ScrollTable minW="860px">
        <table style={{ borderCollapse: 'collapse', width: '100%', background: 'var(--card-bg)' }}>
          <thead>
            <tr>
              <TH w="36px">No.</TH>
              <TH w="84px">Fecha</TH>
              <TH w="60px">Tipo</TH>
              <TH w="80px">Serie</TH>
              <TH w="100px">Número</TH>
              <TH w="80px">NIT</TH>
              <TH w="160px">Cliente</TH>
              <TH w="64px">Estado</TH>
              <TH right w="105px">P. Neto Serv.</TH>
              <TH right w="105px">IVA Débito</TH>
              <TH right w="110px">Total c/IVA</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: r.estado === 'Anulado' ? 'rgba(255,59,48,0.04)' : i % 2 === 0 ? 'transparent' : 'var(--inner-bg)' }}>
                <TD muted small>{r.no}</TD>
                <TD>{r.fecha}</TD>
                <TD><TipoBadge tipo={r.tipoDTE} /></TD>
                <TD mono small muted>{r.serie}</TD>
                <TD mono small>{r.numero}</TD>
                <TD mono small>{r.nit}</TD>
                <TD wrap>{r.cliente}</TD>
                <TD><EstadoBadge estado={r.estado} /></TD>
                <TD right mono>{r.estado === 'Anulado' ? '–' : Q(r.servicios)}</TD>
                <TD right mono>{r.estado === 'Anulado' ? '–' : Q(r.iva)}</TD>
                <TD right mono bold>{r.estado === 'Anulado' ? '–' : Q(r.total)}</TD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--inner-bg)' }}>
              <td colSpan={8} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', borderTop: '2px solid var(--border)' }}>TOTALES</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: 'var(--text-1)', borderTop: '2px solid var(--border)' }}>{Qn(totServ)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: 'var(--text-1)', borderTop: '2px solid var(--border)' }}>{Qn(totIVA)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: 'var(--text-1)', borderTop: '2px solid var(--border)' }}>{Qn(totTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </ScrollTable>
      <LeyendaVentas />
    </div>
  )
}

// ─── Libro de Compras ────────────────────────────────────────────────────────

function LibroCompras({ rows, meta }) {
  if (!rows.length) {
    return <EmptyState label="Carga el archivo de Compras SAT" />
  }
  const vigentes = rows.filter(r => r.estado === 'Vigente')
  const totComb  = vigentes.reduce((s, r) => s + r.combustibles, 0)
  const totComp  = vigentes.reduce((s, r) => s + r.compras, 0)
  const totIdp   = vigentes.reduce((s, r) => s + r.idp, 0)
  const totTM    = vigentes.reduce((s, r) => s + r.tasaMunicipal, 0)
  const totIVA   = vigentes.reduce((s, r) => s + r.iva, 0)
  const totTotal = vigentes.reduce((s, r) => s + r.total, 0)

  const ivaComb  = vigentes.filter(r => r.combustibles > 0).reduce((s, r) => s + r.iva, 0)
  const ivaComp  = vigentes.filter(r => r.compras > 0).reduce((s, r) => s + r.iva, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <MetaLibro titulo="Libro de Compras y Servicios Adquiridos" meta={meta} filas={rows} />
        <ScrollTable minW="980px">
          <table style={{ borderCollapse: 'collapse', width: '100%', background: 'var(--card-bg)' }}>
            <thead>
              <tr>
                <TH w="32px">No.</TH>
                <TH w="80px">Fecha</TH>
                <TH w="52px">Tipo</TH>
                <TH w="64px">Serie</TH>
                <TH w="82px">Número</TH>
                <TH w="62px">NIT</TH>
                <TH w="138px">Proveedor</TH>
                <TH right w="82px">Combustibles</TH>
                <TH right w="82px">Compras</TH>
                <TH right w="60px">Servicios</TH>
                <TH right w="58px">IDP</TH>
                <TH right w="66px">Tasa Mun.</TH>
                <TH right w="70px">IVA</TH>
                <TH right w="78px">Total</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: r.estado === 'Anulado' ? 'rgba(255,59,48,0.04)' : i % 2 === 0 ? 'transparent' : 'var(--inner-bg)' }}>
                  <TD muted small>{r.no}</TD>
                  <TD>{r.fecha}</TD>
                  <TD><TipoBadge tipo={r.tipoDTE} /></TD>
                  <TD mono small muted>{r.serie}</TD>
                  <TD mono small>{r.numero}</TD>
                  <TD mono small>{r.nit}</TD>
                  <TD wrap>{r.proveedor}</TD>
                  <TD right mono>{r.estado === 'Anulado' ? '–' : Q(r.combustibles)}</TD>
                  <TD right mono>{r.estado === 'Anulado' ? '–' : Q(r.compras)}</TD>
                  <TD right mono>{r.estado === 'Anulado' ? '–' : Q(r.servicios)}</TD>
                  <TD right mono>{Q(r.idp)}</TD>
                  <TD right mono>{Q(r.tasaMunicipal)}</TD>
                  <TD right mono>{r.estado === 'Anulado' ? '–' : Q(r.iva)}</TD>
                  <TD right mono bold>{Q(r.total)}</TD>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--inner-bg)' }}>
                <td colSpan={7} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', borderTop: '2px solid var(--border)' }}>TOTALES</td>
                {[totComb, totComp, 0, totIdp, totTM, totIVA, totTotal].map((v, i) => (
                  <td key={i} style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: 'var(--text-1)', borderTop: '2px solid var(--border)' }}>
                    {v === 0 ? '–' : Qn(v)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </ScrollTable>
        <LeyendaCompras />
      </div>

      {/* Resumen de compras */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border-card)', overflow: 'hidden', maxWidth: '480px' }}>
        <div style={{ padding: '12px 16px', background: 'var(--inner-bg)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resumen</span>
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {[
              { label: 'Combustible', base: totComb, iva: ivaComb },
              { label: 'Compras', base: totComp, iva: ivaComp },
              { label: 'Servicios', base: 0, iva: 0 },
              { label: 'Importaciones', base: 0, iva: 0 },
            ].map(({ label, base, iva }) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--text-1)', width: '40%' }}>{label}:</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-2)' }}>{Qn(base)}</td>
                <td style={{ padding: '8px 6px', fontSize: '11px', color: 'var(--text-muted)' }}>IVA:</td>
                <td style={{ padding: '8px 16px 8px 4px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-1)', fontWeight: '600' }}>{Qn(iva)}</td>
              </tr>
            ))}
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-2)' }}>IDP:</td>
              <td colSpan={3} style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-1)', fontWeight: '600' }}>{Qn(totIdp)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-2)' }}>Tasa Municipal:</td>
              <td colSpan={3} style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-1)' }}>{Qn(totTM)}</td>
            </tr>
            <tr style={{ background: 'var(--inner-bg)' }}>
              <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '700', color: 'var(--text-1)' }}>Total Documental:</td>
              <td colSpan={3} style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px', fontWeight: '700', color: 'var(--accent)' }}>{Qn(totTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Libro de Retenciones ────────────────────────────────────────────────────

function LibroRetenciones({ rows }) {
  if (!rows.length) {
    return <EmptyState label="Carga el archivo de Retenciones SAT" />
  }
  const totalRet = rows.reduce((s, r) => s + r.totalRetencion, 0)
  return (
    <ScrollTable minW="989px">
      <table style={{ borderCollapse: 'collapse', width: '100%', background: 'var(--card-bg)' }}>
        <thead>
          <tr>
            <TH w="32px">No.</TH>
            <TH w="90px">NIT Retenedor</TH>
            <TH w="200px">Nombre Retenedor</TH>
            <TH w="72px">Estado</TH>
            <TH w="110px">Constancia</TH>
            <TH w="90px">Fecha Emisión</TH>
            <TH right w="100px">Total Factura</TH>
            <TH right w="95px">Importe Neto</TH>
            <TH right w="100px">Afecto Ret.</TH>
            <TH right w="100px">Total Ret.</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--inner-bg)' }}>
              <TD muted small>{r.no}</TD>
              <TD mono small>{r.nitRetenedor}</TD>
              <TD>{r.retenedor}</TD>
              <TD><EstadoBadge estado={r.estado} /></TD>
              <TD mono small>{r.constancia}</TD>
              <TD>{r.fecha}</TD>
              <TD right mono>{Qn(r.totalFactura)}</TD>
              <TD right mono>{Qn(r.importeNeto)}</TD>
              <TD right mono>{Qn(r.afectoRetencion)}</TD>
              <TD right mono bold green>{Qn(r.totalRetencion)}</TD>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--inner-bg)' }}>
            <td colSpan={9} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', borderTop: '2px solid var(--border)' }}>TOTAL RETENCIONES</td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: 'var(--green)', borderTop: '2px solid var(--border)' }}>{Qn(totalRet)}</td>
          </tr>
        </tfoot>
      </table>
    </ScrollTable>
  )
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function MetaLibro({ titulo, meta, filas }) {
  const fechas = filas.map(f => f.fecha).filter(Boolean)
  const mes = fechas.length
    ? new Date(filas.find(f => f.fecha)?.fecha?.split('/').reverse().join('-') || Date.now())
        .toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div style={{ marginBottom: '12px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{titulo}</h2>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {mes && <MetaItem label="Período" value={mes} />}
        {meta.nombre && <MetaItem label="Nombre / Razón Social" value={meta.nombre} />}
        {meta.nit && <MetaItem label="NIT" value={meta.nit} />}
      </div>
    </div>
  )
}

const MetaItem = ({ label, value }) => (
  <div>
    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}: </span>
    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-1)' }}>{value}</span>
  </div>
)

const TipoBadge = ({ tipo }) => (
  <span style={{
    display: 'inline-block', padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '700',
    background: tipo === 'FACT' ? 'var(--accent-soft)' : 'rgba(255,149,0,0.1)',
    color: tipo === 'FACT' ? 'var(--accent)' : 'var(--yellow)',
  }}>{tipo}</span>
)

const EstadoBadge = ({ estado }) => (
  <span style={{
    display: 'inline-block', padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '600',
    background: estado === 'Vigente' || estado === 'PAGADA' ? 'var(--green-soft)' : 'rgba(255,59,48,0.08)',
    color: estado === 'Vigente' || estado === 'PAGADA' ? 'var(--green)' : 'var(--red)',
  }}>{estado}</span>
)

const EmptyState = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px' }}>
    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px', opacity: 0.4 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p style={{ fontSize: '13px' }}>{label}</p>
    </div>
  </div>
)

const LeyendaVentas = () => (
  <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    {['FACT = Factura', 'NCRE = Nota de crédito', 'NAB = Nota de abono', 'FCAM = Factura cambiaria'].map(l => (
      <span key={l} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l}</span>
    ))}
  </div>
)

const LeyendaCompras = () => (
  <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    {['FACT = Factura', 'FES = Factura Especial', 'NCR = Nota de crédito', 'FPC = Factura Pequeño Contribuyente', 'IMP = Importación', 'FCAM = Factura cambiaria'].map(l => (
      <span key={l} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l}</span>
    ))}
  </div>
)

// ─── Constantes y helpers de persistencia ────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const SUBTABS = [
  { key: 'RESUMEN',     label: 'Resumen Fiscal' },
  { key: 'VENTAS',      label: 'Libro de Ventas' },
  { key: 'COMPRAS',     label: 'Libro de Compras' },
  { key: 'RETENCIONES', label: 'Retenciones' },
]

const EMPTY_MONTH = () => ({
  ventas: { rows: [], meta: {} },
  compras: { rows: [], meta: {} },
  retenciones: [],
  files: { ventas: '', compras: '', retenciones: '' },
})

const LS_KEY   = (y, m) => `conta_${y}_${m}`
const LS_YEARS = 'conta_years'

function loadMonth(year, month) {
  try {
    const raw = localStorage.getItem(LS_KEY(year, month))
    return raw ? JSON.parse(raw) : EMPTY_MONTH()
  } catch { return EMPTY_MONTH() }
}

function saveMonth(year, month, data) {
  try { localStorage.setItem(LS_KEY(year, month), JSON.stringify(data)) }
  catch { /* localStorage lleno */ }
}

function monthHasData(year, month) {
  try {
    const raw = localStorage.getItem(LS_KEY(year, month))
    if (!raw) return false
    const d = JSON.parse(raw)
    return !!(d.ventas?.rows?.length || d.compras?.rows?.length || d.retenciones?.length)
  } catch { return false }
}

// ─── Panel de navegación año / mes ───────────────────────────────────────────

function NavPanel({ years, expanded, sel, onSelect, onToggleYear, onAddYear }) {
  return (
    <div style={{
      width: '174px', minWidth: '174px', flexShrink: 0,
      background: 'var(--card-bg)', borderRadius: '14px',
      border: '1px solid var(--border-card)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', alignSelf: 'flex-start',
    }}>
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Períodos</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {[...years].sort((a, b) => b - a).map(year => (
          <div key={year}>
            {/* Año */}
            <button onClick={() => onToggleYear(year)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 14px', border: 'none', background: 'transparent',
              color: 'var(--text-1)', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}>
              <span>{year}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded[year] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Meses */}
            {expanded[year] && (
              <div style={{ paddingBottom: '4px' }}>
                {MESES.map((mes, i) => {
                  const active  = sel.year === year && sel.month === i
                  const hasData = monthHasData(year, i)
                  return (
                    <button key={i} onClick={() => onSelect(year, i)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '5px 14px 5px 22px', border: 'none', cursor: 'pointer',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: '12.5px', fontWeight: active ? '600' : '400',
                      transition: 'all 0.1s',
                    }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                        background: hasData ? 'var(--green)' : 'var(--border-card)',
                        border: hasData ? 'none' : '1.5px solid var(--text-muted)',
                      }} />
                      {mes}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Agregar año */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        <button onClick={onAddYear} style={{
          width: '100%', padding: '7px', borderRadius: '8px', border: '1.5px dashed var(--border-card)',
          background: 'transparent', color: 'var(--text-muted)', fontSize: '12px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo año
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ContabilidadPage() {
  const now   = new Date()
  const curY  = now.getFullYear()
  const curM  = now.getMonth()

  const [years, setYears] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_YEARS)) || [curY] }
    catch { return [curY] }
  })
  const initSel = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('conta_sel'))
      if (s?.year && s?.month !== undefined) return s
    } catch {}
    return { year: curY, month: curM }
  })()

  const [expanded, setExpanded] = useState({ [initSel.year]: true })
  const [sel, setSel]           = useState(initSel)
  const [sub, setSub]           = useState('RESUMEN')
  const [data, setData]         = useState(() => loadMonth(initSel.year, initSel.month))

  // Al iniciar, intenta re-parsear desde IndexedDB si localStorage está vacío
  useEffect(() => {
    const saved = loadMonth(initSel.year, initSel.month)
    if (saved.ventas?.rows?.length || saved.compras?.rows?.length) return
    const tipos = ['ventas', 'compras', 'retenciones']
    Promise.all(tipos.map(t => idbLoad(idbKey(initSel.year, initSel.month, t)).catch(() => null)))
      .then(([v, c, r]) => {
        let d = { ...saved }
        if (v) { const wb = XLSX.read(v.buffer, { type: 'array' }); d = { ...d, ventas: parseVentas(wb), files: { ...d.files, ventas: v.name } } }
        if (c) { const wb = XLSX.read(c.buffer, { type: 'array' }); d = { ...d, compras: parseCompras(wb), files: { ...d.files, compras: c.name } } }
        if (r) { const wb = XLSX.read(r.buffer, { type: 'array' }); d = { ...d, retenciones: parseRetenciones(wb), files: { ...d.files, retenciones: r.name } } }
        if (v || c || r) setData(d)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectMonth = (year, month) => {
    const newSel = { year, month }
    setSel(newSel)
    localStorage.setItem('conta_sel', JSON.stringify(newSel))
    setSub('RESUMEN')
    // Carga datos parseados desde localStorage
    const saved = loadMonth(year, month)
    // Si faltan datos, intenta re-parsear desde IndexedDB
    const tipos = ['ventas', 'compras', 'retenciones']
    Promise.all(tipos.map(t => idbLoad(idbKey(year, month, t)).catch(() => null)))
      .then(([v, c, r]) => {
        let d = { ...saved }
        if (v && !saved.ventas?.rows?.length) {
          const wb = XLSX.read(v.buffer, { type: 'array' })
          d = { ...d, ventas: parseVentas(wb), files: { ...d.files, ventas: v.name } }
        }
        if (c && !saved.compras?.rows?.length) {
          const wb = XLSX.read(c.buffer, { type: 'array' })
          d = { ...d, compras: parseCompras(wb), files: { ...d.files, compras: c.name } }
        }
        if (r && !saved.retenciones?.length) {
          const wb = XLSX.read(r.buffer, { type: 'array' })
          d = { ...d, retenciones: parseRetenciones(wb), files: { ...d.files, retenciones: r.name } }
        }
        setData(d)
      })
  }

  const toggleYear = (year) =>
    setExpanded(e => ({ ...e, [year]: !e[year] }))

  const addYear = () => {
    const input = prompt('Ingresa el año a agregar:')
    const y = parseInt(input)
    if (!y || isNaN(y) || years.includes(y)) return
    const next = [...years, y]
    setYears(next)
    localStorage.setItem(LS_YEARS, JSON.stringify(next))
    setExpanded(e => ({ ...e, [y]: true }))
  }

  const handleFile = (tipo) => async (file) => {
    const buf    = await file.arrayBuffer()
    const bufCopy= buf.slice(0)               // copia antes de que XLSX lo procese
    const wb     = XLSX.read(buf, { type: 'array' })
    // Guarda el archivo original en IndexedDB para descarga futura
    idbSave(idbKey(sel.year, sel.month, tipo), { name: file.name, buffer: bufCopy }).catch(() => {})
    setData(prev => {
      const next = {
        ...prev,
        files: { ...prev.files, [tipo]: file.name },
        ...(tipo === 'ventas'      ? { ventas:      parseVentas(wb)      } : {}),
        ...(tipo === 'compras'     ? { compras:     parseCompras(wb)     } : {}),
        ...(tipo === 'retenciones' ? { retenciones: parseRetenciones(wb) } : {}),
      }
      saveMonth(sel.year, sel.month, next)
      return next
    })
  }

  const handleDownload = (tipo) => () =>
    downloadFromIDB(sel.year, sel.month, tipo, `${tipo}_${MESES[sel.month]}_${sel.year}.xls`)

  const { ventas, compras, retenciones, files } = data

  return (
    <div style={{ maxWidth: '1300px' }}>
      {/* Título */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Contabilidades</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Selecciona el período y carga los archivos SAT</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* ── Navegación ── */}
        <NavPanel
          years={years} expanded={expanded} sel={sel}
          onSelect={selectMonth} onToggleYear={toggleYear} onAddYear={addYear}
        />

        {/* ── Contenido ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Cabecera del mes */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-1)', textTransform: 'capitalize' }}>
              {MESES[sel.month]}
            </h2>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>{sel.year}</span>
          </div>

          {/* Upload zone */}
          <div style={{ background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border-card)', padding: '14px', marginBottom: '18px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Archivos SAT</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <UploadZone label="Ventas"      fileName={files.ventas}      onFile={handleFile('ventas')}      onDownload={handleDownload('ventas')} />
              <UploadZone label="Compras"     fileName={files.compras}     onFile={handleFile('compras')}     onDownload={handleDownload('compras')} />
              <UploadZone label="Retenciones" fileName={files.retenciones} onFile={handleFile('retenciones')} onDownload={handleDownload('retenciones')} />
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', background: 'var(--inner-bg)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
            {SUBTABS.map(t => (
              <button key={t.key} onClick={() => setSub(t.key)} style={{
                padding: '7px 14px', borderRadius: '9px', border: 'none', fontSize: '13px',
                fontWeight: sub === t.key ? '600' : '400',
                background: sub === t.key ? 'var(--card-bg)' : 'transparent',
                color: sub === t.key ? 'var(--text-1)' : 'var(--text-muted)',
                boxShadow: sub === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s', cursor: 'pointer',
              }}>
                {t.label}
                {t.key === 'VENTAS'      && ventas.rows.length      > 0 && <CountBadge n={ventas.rows.length} />}
                {t.key === 'COMPRAS'     && compras.rows.length     > 0 && <CountBadge n={compras.rows.length} />}
                {t.key === 'RETENCIONES' && retenciones.length      > 0 && <CountBadge n={retenciones.length} />}
              </button>
            ))}
          </div>

          {/* Contenido */}
          {sub === 'RESUMEN'     && <ResumenFiscal ventas={ventas.rows} compras={compras.rows} retenciones={retenciones} />}
          {sub === 'VENTAS'      && <LibroVentas rows={ventas.rows} meta={ventas.meta} />}
          {sub === 'COMPRAS'     && <LibroCompras rows={compras.rows} meta={compras.meta} />}
          {sub === 'RETENCIONES' && <LibroRetenciones rows={retenciones} />}

        </div>{/* fin contenido */}
      </div>{/* fin flex */}
    </div>
  )
}

const CountBadge = ({ n }) => (
  <span style={{
    marginLeft: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--accent)', color: '#fff', borderRadius: '20px',
    fontSize: '9px', fontWeight: '700', padding: '1px 5px', minWidth: '16px',
  }}>{n}</span>
)
