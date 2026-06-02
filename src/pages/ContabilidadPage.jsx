import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'

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
    const anulado  = String(r[COL['Marca de anulado']] || '').toLowerCase() === 'si'
    const tipoDTE  = r[COL['Tipo de DTE (nombre)']] || ''
    const esNCR    = NCR_TIPOS.includes(tipoDTE)
    const total    = parseFloat(r[COL['Gran Total (Moneda Original)']]) || 0
    const iva      = parseFloat(r[COL['IVA (monto de este impuesto)']]) || 0
    const neto     = total - iva
    // NCR tiene signo negativo: reduce el IVA débito fiscal
    const sign     = esNCR ? -1 : 1
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
      servicios: sign * neto,
      bienes:   0,
      exportacion: 0,
      iva:      sign * iva,
      ventasExentas: 0,
      total:    sign * total,
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

function UploadZone({ label, fileName, onFile }) {
  const onDrop = useCallback(e => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <label
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '6px', padding: '14px 10px',
        borderRadius: '12px', cursor: 'pointer', flex: 1, minWidth: '130px',
        border: `1.5px dashed ${fileName ? 'var(--accent)' : 'var(--border-card)'}`,
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
  )
}

// ─── Resumen Fiscal ──────────────────────────────────────────────────────────

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

  const factVig   = ventas.filter(v => v.estado === 'Vigente' && !v.esNCR)
  const ncrVig    = ventas.filter(v => v.estado === 'Vigente' && v.esNCR)
  const anuladas  = ventas.filter(v => v.estado === 'Anulado')

  const totalFact = factVig.reduce((s, v) => s + v.total, 0)
  const totalNCR  = ncrVig.reduce((s, v) => s + Math.abs(v.total), 0)   // valor positivo para mostrar
  const totalAnul = anuladas.filter(v => !v.esNCR).reduce((s, v) => s + v.total, 0)

  const netoFact  = totalFact - totalNCR - totalAnul
  // IVA: facturas cobradas menos lo que devuelve el NCR
  const ivaFact   = factVig.reduce((s, v) => s + v.iva, 0)
  const ivaNCR    = ncrVig.reduce((s, v) => s + Math.abs(v.iva), 0)
  const ivaTotal  = ivaFact - ivaNCR
  const factSinIVA= netoFact - ivaTotal
  const ivaRet    = retenciones.reduce((s, r) => s + r.totalRetencion, 0)
  const ivaAPagar = ivaTotal - ivaRet

  const cVig  = compras.filter(c => c.estado === 'Vigente')
  const ivaComb = cVig.filter(c => c.combustibles > 0).reduce((s, c) => s + c.iva, 0)
  const ivaComp = cVig.filter(c => c.compras > 0).reduce((s, c) => s + c.iva, 0)
  const ivaSvc  = cVig.filter(c => c.servicios > 0).reduce((s, c) => s + c.iva, 0)
  const totalGastos = ivaComb + ivaComp + ivaSvc
  const totalAPagar = ivaAPagar - totalGastos

  const FilaSimple = ({ label, valor, bold, indent, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `6px ${indent ? '28px' : '16px'}` }}>
      <span style={{ fontSize: '13px', color: color || (bold ? 'var(--text-1)' : 'var(--text-2)'), fontWeight: bold ? '600' : '400' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: bold ? '700' : '400', color: color || 'var(--text-1)', fontFamily: 'monospace' }}>{Qn(valor)}</span>
    </div>
  )

  const FilaDestacada = ({ label, valor, colorVal }) => (
    <div style={{ margin: '4px 8px', padding: '10px 14px', background: 'rgba(255, 193, 7, 0.12)', borderRadius: '10px', border: '1.5px solid rgba(255,193,7,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-1)' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: '700', color: colorVal || 'var(--text-1)', fontFamily: 'monospace' }}>{Qn(valor)}</span>
    </div>
  )

  const Divider = () => <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--inner-bg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cálculo de IVA</span>
        </div>

        <div style={{ padding: '8px 0' }}>
          <FilaSimple label="TOTAL FACTURADO" valor={totalFact} bold />

          {totalNCR > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px 6px 28px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>(-) Notas de Crédito</span>
              <span style={{ fontSize: '13px', color: 'var(--red)', fontFamily: 'monospace' }}>{Qn(totalNCR)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px 6px 28px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>(-) FACT ANULADAS</span>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--red)', fontFamily: 'monospace' }}>{Qn(totalAnul)}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)', fontFamily: 'monospace' }}>{Qn(netoFact)}</span>
            </div>
          </div>

          <FilaSimple label="FACT S/IVA" valor={factSinIVA} indent />
          {ivaNCR > 0 && <FilaSimple label="(-) IVA NCR" valor={ivaNCR} indent color="var(--red)" />}
          <FilaDestacada label="IVA A TOTAL" valor={ivaTotal} />

          <Divider />

          <FilaSimple label="(-) IVA RETENIDO" valor={ivaRet} indent color="var(--text-2)" />
          <FilaSimple label="IVA A PAGAR" valor={ivaAPagar} bold />

          <Divider />

          <FilaSimple label="(-) Combustibles" valor={ivaComb} indent />
          <FilaSimple label="(-) Compras" valor={ivaComp} indent />
          <FilaSimple label="(-) Servicios" valor={ivaSvc} indent />
          <FilaSimple label="TOTAL GASTOS" valor={totalGastos} bold />

          <FilaDestacada
            label="TOTAL A PAGAR"
            valor={totalAPagar}
            colorVal={totalAPagar > 0 ? 'var(--red)' : 'var(--green)'}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Tabla genérica con scroll horizontal ───────────────────────────────────

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
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-card)', background: 'var(--card-bg)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '860px' }}>
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
              <tr key={i} style={{ background: r.esNCR ? 'rgba(255,149,0,0.04)' : r.estado === 'Anulado' ? 'rgba(255,59,48,0.04)' : i % 2 === 0 ? 'transparent' : 'var(--inner-bg)' }}>
                <TD muted small>{r.no}</TD>
                <TD>{r.fecha}</TD>
                <TD><TipoBadge tipo={r.tipoDTE} /></TD>
                <TD mono small muted>{r.serie}</TD>
                <TD mono small>{r.numero}</TD>
                <TD mono small>{r.nit}</TD>
                <TD wrap>{r.cliente}</TD>
                <TD><EstadoBadge estado={r.estado} /></TD>
                <TD right mono red={r.esNCR}>{r.estado === 'Anulado' ? '–' : Q(Math.abs(r.servicios))}</TD>
                <TD right mono red={r.esNCR}>{r.estado === 'Anulado' ? '–' : (r.esNCR ? `(${Q(Math.abs(r.iva))})` : Q(r.iva))}</TD>
                <TD right mono bold red={r.esNCR}>{r.esNCR ? `(${Q(Math.abs(r.total))})` : Q(r.total)}</TD>
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
      </div>
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
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-card)', background: 'var(--card-bg)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1100px' }}>
            <thead>
              <tr>
                <TH w="36px">No.</TH>
                <TH w="84px">Fecha</TH>
                <TH w="58px">Tipo</TH>
                <TH w="78px">Serie</TH>
                <TH w="98px">Número</TH>
                <TH w="78px">NIT</TH>
                <TH w="175px">Proveedor</TH>
                <TH right w="90px">Combustibles</TH>
                <TH right w="90px">Compras</TH>
                <TH right w="72px">Servicios</TH>
                <TH right w="72px">IDP</TH>
                <TH right w="78px">Tasa Mun.</TH>
                <TH right w="80px">IVA</TH>
                <TH right w="90px">Total</TH>
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
        </div>
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
    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-card)', background: 'var(--card-bg)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
        <thead>
          <tr>
            <TH w="40px">No.</TH>
            <TH w="100px">NIT Retenedor</TH>
            <TH w="250px">Nombre Retenedor</TH>
            <TH w="80px">Estado</TH>
            <TH w="120px">Constancia</TH>
            <TH w="100px">Fecha Emisión</TH>
            <TH right w="110px">Total Factura</TH>
            <TH right w="100px">Importe Neto</TH>
            <TH right w="110px">Afecto Retención</TH>
            <TH right w="110px">Total Retención</TH>
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
    </div>
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

// ─── Página principal ────────────────────────────────────────────────────────

const SUBTABS = [
  { key: 'RESUMEN',     label: 'Resumen Fiscal' },
  { key: 'VENTAS',      label: 'Libro de Ventas' },
  { key: 'COMPRAS',     label: 'Libro de Compras' },
  { key: 'RETENCIONES', label: 'Retenciones' },
]

export default function ContabilidadPage() {
  const [sub, setSub]   = useState('RESUMEN')
  const [ventas,      setVentas]      = useState({ rows: [], meta: {} })
  const [compras,     setCompras]     = useState({ rows: [], meta: {} })
  const [retenciones, setRetenciones] = useState([])
  const [files,       setFiles]       = useState({ ventas: '', compras: '', retenciones: '' })

  const handleFile = (tipo) => async (file) => {
    setFiles(f => ({ ...f, [tipo]: file.name }))
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array' })
    if (tipo === 'ventas')      setVentas(parseVentas(wb))
    if (tipo === 'compras')     setCompras(parseCompras(wb))
    if (tipo === 'retenciones') setRetenciones(parseRetenciones(wb))
  }

  const hayDatos = ventas.rows.length || compras.rows.length || retenciones.length

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Contabilidades</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Carga los archivos descargados de la SAT para generar los libros</p>
      </div>

      {/* Upload zone */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-card)', padding: '16px', marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Archivos SAT</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <UploadZone label="Ventas"      fileName={files.ventas}      onFile={handleFile('ventas')} />
          <UploadZone label="Compras"     fileName={files.compras}     onFile={handleFile('compras')} />
          <UploadZone label="Retenciones" fileName={files.retenciones} onFile={handleFile('retenciones')} />
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--inner-bg)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
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
            {t.key === 'VENTAS' && ventas.rows.length > 0 && <CountBadge n={ventas.rows.length} />}
            {t.key === 'COMPRAS' && compras.rows.length > 0 && <CountBadge n={compras.rows.length} />}
            {t.key === 'RETENCIONES' && retenciones.length > 0 && <CountBadge n={retenciones.length} />}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {sub === 'RESUMEN'     && <ResumenFiscal ventas={ventas.rows} compras={compras.rows} retenciones={retenciones} />}
      {sub === 'VENTAS'      && <LibroVentas rows={ventas.rows} meta={ventas.meta} />}
      {sub === 'COMPRAS'     && <LibroCompras rows={compras.rows} meta={compras.meta} />}
      {sub === 'RETENCIONES' && <LibroRetenciones rows={retenciones} />}
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
