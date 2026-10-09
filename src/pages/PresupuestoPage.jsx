import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateStr } from '../lib/dateUtils'
import { useIsMobile } from '../lib/useIsMobile'

const MESES          = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA    = ['L','M','X','J','V','S','D']
const CATS_FIJOS     = ['Vivienda','Servicios','Transporte','Suscripciones','Salud','Educación','Otro']
const CATS_VAR       = ['Alimentación','Transporte','Salud','Entretenimiento','Ropa','Otro']
const TIPOS_DEUDA    = ['Préstamo','Extrafinanciamiento','Visacuotas']
const TIPO_COLOR     = { 'Préstamo':'var(--text-muted)', 'Extrafinanciamiento':'#a78bfa', 'Visacuotas':'var(--yellow)' }
const MEDIOS_PAGO    = ['Efectivo','Tarjeta de Crédito','Tarjeta de Débito']
const TARJETAS_CRED  = ['Cory BANRURAL','Juan BAC','Rosy BANRURAL','Rosy ECOSABA','Melvin INDUSTRIAL','Joss INDUSTRIAL','Chali Promerica']
const TARJETAS_DEB   = ['Joss BANRURAL','Joss INDUSTRIAL','Joss BAC','Melvin Industrial','Dany NEXA','Dany RAPIXCHANGE']
const DIAS_MES       = Array.from({length:31},(_,i)=>i+1)

const TABS = [
  {key:'ingresos',label:'Ingresos'},
  {key:'gastos',  label:'Gastos'},
  {key:'ahorros', label:'Ahorros'},
  {key:'deudas',  label:'Deudas'},
  {key:'resumen', label:'Resumen'},
]

const now     = new Date()
const thisMes = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
const today   = localDateStr()

const fmtMes = (mes) => { const [y,m]=mes.split('-'); return `${MESES[parseInt(m)-1]} ${y}` }
const q = (n) => `Q ${parseFloat(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2})}`

const card  = {background:'var(--card-bg)',borderRadius:'16px',border:'1px solid var(--border-card)',padding:'20px 22px'}
const inp   = {width:'100%',padding:'9px 12px',borderRadius:'10px',background:'var(--inner-bg)',border:'1px solid var(--border)',color:'var(--text-1)',fontSize:'13px',boxSizing:'border-box'}
const bEdit = {background:'var(--inner-bg)',border:'none',color:'var(--text-2)',cursor:'pointer',padding:'5px 7px',borderRadius:'7px',display:'flex',alignItems:'center'}
const bDel  = {background:'rgba(255,59,48,0.10)',border:'none',color:'var(--red)',cursor:'pointer',padding:'5px 7px',borderRadius:'7px',display:'flex',alignItems:'center'}

const IcoEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoDel = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>

// Anillo de progreso SVG con contenido centrado
function Ring({ pct, size=56, stroke=6, color='var(--green)', children }) {
  const r=(size-stroke)/2, c=2*Math.PI*r, p=Math.max(0,Math.min(pct,100))
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c*(1-p/100)} style={{transition:'stroke-dashoffset 0.5s'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{children}</div>
    </div>
  )
}

function SubHead({ label, total, onAdd }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <div style={{width:'3px',height:'14px',background:'var(--accent)',borderRadius:'2px',flexShrink:0}}/>
        <div>
          <div style={{fontSize:'12px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
          {total!==undefined && <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'1px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(total)}</div>}
        </div>
      </div>
      {onAdd && <button onClick={onAdd} style={{background:'var(--accent-soft)',color:'var(--accent)',border:'none',borderRadius:'8px',padding:'5px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ Agregar</button>}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
      <div style={{background:'var(--card-bg)',borderRadius:'20px',padding:'28px',width:'min(440px,calc(100vw - 24px))',border:'1px solid var(--border-card)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <h3 style={{fontWeight:'700',fontSize:'16px',color:'var(--text-1)',margin:0}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',padding:'4px',display:'flex'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ConfirmModal({ msg, onConfirm, onCancel, title='¿Eliminar este registro?', btn='Eliminar' }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div style={{background:'var(--card-bg)',borderRadius:'20px',padding:'28px',width:'min(360px,calc(100vw - 24px))',border:'1px solid var(--border-card)',textAlign:'center'}}>
        <div style={{width:'46px',height:'46px',borderRadius:'50%',background:'rgba(255,59,48,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <div style={{fontSize:'15px',fontWeight:'700',color:'var(--text-1)',marginBottom:'8px'}}>{title}</div>
        <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px',lineHeight:'1.5'}}>{msg}</div>
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={onCancel}  style={{flex:1,padding:'10px',borderRadius:'10px',border:'1px solid var(--border)',background:'transparent',color:'var(--text-2)',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
          <button onClick={onConfirm} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',background:'var(--red)',color:'#fff',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>{btn}</button>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{marginBottom:'14px'}}>
      <label style={{fontSize:'12px',color:'var(--text-2)',display:'block',marginBottom:'5px',fontWeight:'500'}}>{label}</label>
      {children}
    </div>
  )
}

function ModalBtns({ onClose }) {
  return (
    <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
      <button type="button" onClick={onClose} style={{flex:1,padding:'9px',borderRadius:'10px',border:'1px solid var(--border)',background:'transparent',color:'var(--text-2)',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
      <button type="submit" style={{flex:1,padding:'9px',borderRadius:'10px',border:'none',background:'var(--accent)',color:'#fff',fontWeight:'700',fontSize:'13px',cursor:'pointer',boxShadow:'0 4px 14px -4px var(--accent-glow)'}}>Guardar</button>
    </div>
  )
}

const SHARED_BUDGET_OWNER = 'ca354bf9-9e8b-43d9-b10d-d1e6b0db792b'

export default function PresupuestoPage({ user }) {
  const isMobile = useIsMobile()
  // Solo Joselin usa el ID de Daniel. Todos los demás (incluyendo Daniel) usan su propio ID.
  const budgetUid = user.email === 'suleciojh@gmail.com' ? SHARED_BUDGET_OWNER : user.id

  const [tab,        setTab]        = useState(()=>{const t=localStorage.getItem('presupuesto_tab');return TABS.some(x=>x.key===t)?t:'ingresos'})
  // Recordar el mes visto solo durante el mes en curso; al cambiar de mes real, abrir en el mes actual
  const [mes,        setMes]        = useState(()=>localStorage.getItem('presupuesto_mes_visto')===thisMes&&localStorage.getItem('presupuesto_mes')||thisMes)
  const [loading,    setLoading]    = useState(true)
  const [selectedDay,setSelectedDay]= useState(null)
  const [calSelDay,     setCalSelDay]     = useState(null)
  const [calGastosSel,  setCalGastosSel]  = useState(null)
  const [ingSelDay,     setIngSelDay]     = useState(null)
  const [verPagados, setVerPagados] = useState(false)

  const [ingresos,    setIngresos]    = useState([])
  const [gastosFijos, setGastosFijos] = useState([])
  const [gastosVar,   setGastosVar]   = useState([])
  const [prestamos,   setPrestamos]   = useState([])
  const [ahorros,     setAhorros]     = useState([])
  const [compromisos, setCompromisos] = useState([])
  const [pagos,       setPagos]       = useState([])
  const [limites,     setLimites]     = useState([])     // límite mensual por categoría de gasto variable
  const [modalLim,    setModalLim]    = useState(false)
  const [modalCopy,   setModalCopy]   = useState(null)   // {tipo:'ingresos'|'ahorros', items:[...]}
  const [verSug,      setVerSug]      = useState(false)  // dropdown de sugerencias en descripción de gasto
  const [fLim,        setFLim]        = useState({})
  const [pagoBusy,    setPagoBusy]    = useState(null)
  const [modalPago,   setModalPago]   = useState(null)   // item de deuda a registrar
  const [fPago,       setFPago]       = useState({monto:'',restar:'',restarEditado:false})
  const [histDeuda,   setHistDeuda]   = useState(null)   // id de deuda con historial abierto

  const [modalIng,   setModalIng]   = useState(null)
  const [modalFij,   setModalFij]   = useState(null)
  const [modalVar,   setModalVar]   = useState(null)
  const [modalPrest, setModalPrest] = useState(null)
  const [modalAho,   setModalAho]   = useState(null)
  const [modalComp,  setModalComp]  = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const [fIng,   setFIng]   = useState({nombre:'',tipo:'fijo',monto:'',dia:'',fecha:''})
  const [fFij,   setFFij]   = useState({nombre:'',categoria:'Vivienda',monto:'',activo:true,dia_pago:''})
  const [fVar,   setFVar]   = useState({nombre:'',categoria:'Alimentación',monto:'',fecha:today,medio_pago:'Efectivo',tarjeta:'',fecha_pago:''})
  const [fPrest, setFPrest] = useState({nombre:'',tipo:'Préstamo',monto_original:'',saldo_actual:'',cuota_mensual:'',meses_restantes:'',dia_pago:''})
  const [fAho,   setFAho]   = useState({nombre:'',meta_total:'',aportado_mes:''})
  const [fComp,  setFComp]  = useState({persona:'',descripcion:'',monto:'',fecha_aprox:'',notas:''})

  useEffect(()=>{localStorage.setItem('presupuesto_tab',tab)},[tab])
  useEffect(()=>{localStorage.setItem('presupuesto_mes',mes);localStorage.setItem('presupuesto_mes_visto',thisMes);setSelectedDay(null);setCalSelDay(null);setIngSelDay(null)},[mes])

  useEffect(()=>{
    const uid=budgetUid; setLoading(true)
    Promise.all([
      supabase.from('budget_ingresos').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_gastos_fijos').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_gastos_variables').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_prestamos').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_ahorros').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_compromisos').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_pagos').select('*').eq('user_id',uid),
      supabase.from('budget_limites').select('*').eq('user_id',uid),
    ]).then(([ing,fij,varG,prest,aho,comp,pag,lim])=>{
      setLimites(lim.data||[])
      setIngresos(ing.data||[]);setGastosFijos(fij.data||[]);setGastosVar(varG.data||[])
      setPrestamos(prest.data||[]);setAhorros(aho.data||[]);setCompromisos(comp.data||[])
      setPagos(pag.data||[])
      setLoading(false)
    })
  },[user.id])

  const ingMes = ingresos.filter(i=>i.mes===mes)
  const varMes = gastosVar.filter(g=>g.mes===mes)
  const ahoMes = ahorros.filter(a=>a.mes===mes)

  const totalIngresos  = ingMes.reduce((s,i)=>s+parseFloat(i.monto||0),0)
  const totalFijos     = gastosFijos.filter(g=>g.activo).reduce((s,g)=>s+parseFloat(g.monto||0),0)
  // Deudas con saldo 0 ya están pagadas: no cuentan en totales ni calendario
  const prestActivos   = prestamos.filter(p=>parseFloat(p.saldo_actual||0)>0)
  const prestPagados   = prestamos.filter(p=>parseFloat(p.saldo_actual||0)<=0)
  const totalPrestamos = prestActivos.reduce((s,p)=>s+parseFloat(p.cuota_mensual||0),0)
  const totalVariables = varMes.reduce((s,g)=>s+parseFloat(g.monto||0),0)
  const totalAhorros   = ahoMes.reduce((s,a)=>s+parseFloat(a.aportado_mes||0),0)
  const totalGastosAll = totalFijos+totalPrestamos+totalVariables+totalAhorros
  const disponible     = totalIngresos-totalGastosAll

  const compActivos = compromisos.filter(c=>!c.pagado)
  const compPagados = compromisos.filter(c=> c.pagado)
  const totalComp   = compActivos.reduce((s,c)=>s+parseFloat(c.monto||0),0)

  const resumenDeudas = TIPOS_DEUDA.map(tipo=>{
    const items=prestActivos.filter(p=>(p.tipo||'Préstamo')===tipo)
    if(!items.length) return null
    return {tipo,count:items.length,
      totalOriginal:items.reduce((s,p)=>s+parseFloat(p.monto_original||0),0),
      totalSaldo:items.reduce((s,p)=>s+parseFloat(p.saldo_actual||0),0),
      totalCuota:items.reduce((s,p)=>s+parseFloat(p.cuota_mensual||0),0)}
  }).filter(Boolean)

  // ── Calendar helpers ──
  const [mesY,mesM]    = mes.split('-').map(Number)
  const daysInMonth    = new Date(mesY,mesM,0).getDate()
  const firstDayOfWeek = (new Date(mesY,mesM-1,1).getDay()+6)%7
  // Normalizar fecha a YYYY-MM-DD
  const normFecha = (f) => f ? String(f).slice(0,10) : null
  const gastosByDate = {}
  varMes.forEach(g=>{
    const f=normFecha(g.fecha)
    // Solo agregar al calendario si la fecha pertenece al mes actual
    if(f && f.startsWith(mes)){(gastosByDate[f]=gastosByDate[f]||[]).push(g)}
  })
  // Gastos fijos por día de pago en el mes actual
  const fixosByDate = {}
  gastosFijos.filter(g=>g.activo&&g.dia_pago).forEach(g=>{
    const d=Math.min(g.dia_pago,daysInMonth)
    const key=`${mes}-${String(d).padStart(2,'0')}`
    ;(fixosByDate[key]=fixosByDate[key]||[]).push(g)
  })

  // Sin fecha = fecha nula O fecha que no es de este mes
  const varSinFecha = varMes.filter(g=>{
    const f=normFecha(g.fecha)
    return !f || !f.startsWith(mes)
  })
  // Calendario derecho: agrupa por fecha_pago (tarjeta) o fecha (efectivo), de todos los gastos
  const gastosByPago = {}
  gastosVar.forEach(g=>{
    const fp = normFecha(g.fecha_pago || g.fecha)
    if(fp && fp.startsWith(mes))(gastosByPago[fp]=gastosByPago[fp]||[]).push(g)
  })
  const totalPagosVar = Object.values(gastosByPago).flat().reduce((s,g)=>s+parseFloat(g.monto||0),0)
  const calCells       = [...Array(firstDayOfWeek).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)]
  const selectedDayGastos = selectedDay?(gastosByDate[selectedDay]||[]):[]

  // ── Payment calendar events ──
  const calEvents = {}
  const addCalEv = (key,ev) => { if(key&&key.length===10){(calEvents[key]=calEvents[key]||[]).push(ev)} }
  gastosFijos.filter(g=>g.activo&&g.dia_pago).forEach(g=>{
    const d=Math.min(g.dia_pago,daysInMonth)
    addCalEv(`${mes}-${String(d).padStart(2,'0')}`,{label:g.nombre,amount:g.monto,color:'var(--accent)',tipo:'Gasto Fijo'})
  })
  prestActivos.filter(p=>p.dia_pago).forEach(p=>{
    const d=Math.min(p.dia_pago,daysInMonth)
    addCalEv(`${mes}-${String(d).padStart(2,'0')}`,{label:p.nombre,amount:p.cuota_mensual,color:'#ff9500',tipo:'Deuda'})
  })
  compActivos.filter(c=>c.fecha_aprox?.startsWith(mes)).forEach(c=>{
    addCalEv(c.fecha_aprox,{label:c.persona,amount:c.monto,color:isVencido(c.fecha_aprox)?'var(--red)':isPróximo(c.fecha_aprox)?'var(--yellow)':'#a78bfa',tipo:'Compromiso'})
  })
  ingMes.forEach(i=>{
    if(i.tipo==='fijo'&&i.dia){ const d=Math.min(i.dia,daysInMonth); addCalEv(`${mes}-${String(d).padStart(2,'0')}`,{label:i.nombre,amount:i.monto,color:'var(--green)',tipo:'Ingreso'}) }
    else if(i.tipo!=='fijo'&&i.fecha&&i.fecha.startsWith(mes)) addCalEv(i.fecha.slice(0,10),{label:i.nombre,amount:i.monto,color:'var(--green)',tipo:'Ingreso'})
  })
  const calSelEvents = calSelDay?(calEvents[calSelDay]||[]):[]

  // ── Income calendar events ──
  const ingCalEvents = {}
  ingMes.forEach(i=>{
    let key=null
    if(i.tipo==='fijo'&&i.dia) { const d=Math.min(i.dia,daysInMonth); key=`${mes}-${String(d).padStart(2,'0')}` }
    else if(i.tipo!=='fijo'&&i.fecha&&i.fecha.startsWith(mes)) key=i.fecha.slice(0,10)
    if(key)(ingCalEvents[key]=ingCalEvents[key]||[]).push({label:i.nombre,amount:i.monto,tipo:i.tipo==='fijo'?'Fijo':'Variable'})
  })
  const ingSelEvents = ingSelDay?(ingCalEvents[ingSelDay]||[]):[]

  // ── Límites por categoría (gastos variables del mes) ──
  const limiteDe   = (cat)=>{const l=limites.find(x=>x.categoria===cat);return l?parseFloat(l.limite||0):null}
  const gastadoCat = (cat)=>varMes.filter(g=>(g.categoria||'Otro')===cat).reduce((s,g)=>s+parseFloat(g.monto||0),0)
  const catsLimite = [...CATS_VAR,...new Set(varMes.map(g=>g.categoria||'Otro').filter(c=>!CATS_VAR.includes(c)))]
  const colorLimite= (pct)=>pct>100?'var(--red)':pct>=80?'var(--yellow)':'var(--green)'

  // ── Pagos de cuotas de deudas en el mes seleccionado ──
  const pagosMes = pagos.filter(p=>p.mes===mes)
  const pagoDe   = (origen,id)=>pagosMes.find(p=>p.origen===origen&&p.ref_id===id)
  const hoyDia   = parseInt(today.slice(8,10))
  // Cuota sin pagar cuyo día ya pasó en el mes seleccionado
  const cuotaVencida = (p)=>{
    if(pagoDe('deuda',p.id)||!p.dia_pago) return false
    if(mes<thisMes) return true
    return mes===thisMes&&Math.min(p.dia_pago,daysInMonth)<hoyDia
  }
  // Meses restantes ≈ saldo ÷ cuota (aprox.: en préstamos la cuota incluye intereses)
  const mesesRestantes = (p)=>{
    const saldo=parseFloat(p.saldo_actual||0),cuota=parseFloat(p.cuota_mensual||0)
    return cuota>0&&saldo>0?Math.ceil(saldo/cuota-0.001):null
  }

  // ── Nav ──
  const prevMes=()=>{const[y,m]=mes.split('-').map(Number);const d=new Date(y,m-2);setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}
  const nextMes=()=>{const[y,m]=mes.split('-').map(Number);const d=new Date(y,m);  setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}

  // ── CRUD ──
  const askDel=(msg,fn)=>setConfirmDel({msg,onConfirm:fn})
  const upsert=async(table,payload,id,setState)=>{
    console.log('[upsert]', table, 'id=', id, payload)
    if(id){const{data,error}=await supabase.from(table).update(payload).eq('id',id).select().single();console.log('[upsert result]',{data,error});if(error)console.error('upsert update error:',error);else if(data)setState(p=>p.map(x=>x.id===data.id?data:x))}
    else  {const{data,error}=await supabase.from(table).insert({...payload,user_id:budgetUid}).select().single();console.log('[upsert result]',{data,error});if(error)console.error('upsert insert error:',error);else if(data)setState(p=>[...p,data])}
  }
  const del=async(table,id,setState)=>{await supabase.from(table).delete().eq('id',id);setState(p=>p.filter(x=>x.id!==id))}

  const saveIngreso=async(e)=>{
    e.preventDefault()
    const esFijo=fIng.tipo==='fijo'
    await upsert('budget_ingresos',{
      nombre:fIng.nombre,tipo:fIng.tipo,monto:parseFloat(fIng.monto),mes,
      dia:esFijo&&fIng.dia?parseInt(fIng.dia):null,
      fecha:!esFijo?fIng.fecha||null:null,
    },modalIng?.id,setIngresos)
    setModalIng(null)
  }
  const saveFijo   =async(e)=>{e.preventDefault();await upsert('budget_gastos_fijos',{...fFij,monto:parseFloat(fFij.monto),dia_pago:fFij.dia_pago?parseInt(fFij.dia_pago):null},modalFij?.id,setGastosFijos);setModalFij(null)}
  const saveVar    =async(e)=>{
    e.preventDefault()
    const usaT=fVar.medio_pago!=='Efectivo'
    const mesFinal = fVar.fecha ? fVar.fecha.slice(0,7) : mes
    console.log('[saveVar]', {fecha:fVar.fecha, mesFinal, id:modalVar?.id})
    await upsert('budget_gastos_variables',{
      nombre:fVar.nombre,categoria:fVar.categoria,monto:parseFloat(fVar.monto),mes:mesFinal,
      fecha:fVar.fecha||null,medio_pago:fVar.medio_pago,
      tarjeta:usaT?fVar.tarjeta||null:null,
      fecha_pago: fVar.medio_pago==='Tarjeta de Crédito' ? (fVar.fecha_pago||null) : (fVar.fecha||null),
    },modalVar?.id,setGastosVar)
    setModalVar(null)
  }
  const savePrest=async(e)=>{
    e.preventDefault()
    await upsert('budget_prestamos',{
      nombre:fPrest.nombre,tipo:fPrest.tipo,
      monto_original:parseFloat(fPrest.monto_original),
      saldo_actual:parseFloat(fPrest.saldo_actual),
      cuota_mensual:parseFloat(fPrest.cuota_mensual),
      meses_restantes:fPrest.meses_restantes!==''?parseInt(fPrest.meses_restantes):null,
      dia_pago:fPrest.dia_pago?parseInt(fPrest.dia_pago):null,
    },modalPrest?.id,setPrestamos)
    setModalPrest(null)
  }
  const saveAhorro=async(e)=>{e.preventDefault();await upsert('budget_ahorros',{nombre:fAho.nombre,meta_total:parseFloat(fAho.meta_total||0),aportado_mes:parseFloat(fAho.aportado_mes),mes},modalAho?.id,setAhorros);setModalAho(null)}
  const saveComp  =async(e)=>{e.preventDefault();await upsert('budget_compromisos',{persona:fComp.persona,descripcion:fComp.descripcion,monto:parseFloat(fComp.monto),fecha_aprox:fComp.fecha_aprox||null,notas:fComp.notas||null},modalComp?.id,setCompromisos);setModalComp(null)}

  const toggleFijo  =async(g)=>{const{data}=await supabase.from('budget_gastos_fijos').update({activo:!g.activo}).eq('id',g.id).select().single();if(data)setGastosFijos(p=>p.map(x=>x.id===data.id?data:x))}
  const togglePagado=async(c)=>{const{data}=await supabase.from('budget_compromisos').update({pagado:!c.pagado}).eq('id',c.id).select().single();if(data)setCompromisos(p=>p.map(x=>x.id===data.id?data:x))}
  const setSaldoLocal=(data)=>setPrestamos(p=>p.map(x=>x.id===data.id?data:x))
  // Abrir modal para registrar la cuota del mes seleccionado (monto pagado + cuánto restar del saldo)
  const abrirPagoDesdeDeuda=(p)=>{
    const cuota=parseFloat(p.cuota_mensual||0)
    setFPago({monto:String(cuota),restar:String(cuota),restarEditado:false})
    setModalPago({origen:'deuda',id:p.id,nombre:p.nombre,monto:cuota})
  }
  // Quitar el pago del mes y devolver al saldo lo que se le había restado
  const deshacerPago=async(p,pago)=>{
    if(pagoBusy) return
    setPagoBusy('deuda'+p.id)
    const{error}=await supabase.from('budget_pagos').delete().eq('id',pago.id)
    if(error){alert('No se pudo deshacer el pago: '+error.message);setPagoBusy(null);return}
    setPagos(x=>x.filter(y=>y.id!==pago.id))
    const devolver=parseFloat(pago.saldo_aplicado||0)
    if(devolver>0){
      const nuevo=Math.round((parseFloat(p.saldo_actual||0)+devolver)*100)/100
      const{data}=await supabase.from('budget_prestamos').update({saldo_actual:nuevo}).eq('id',p.id).select().single()
      if(data) setSaldoLocal(data)
    }
    setPagoBusy(null)
  }
  const askDeshacer=(p,pago)=>setConfirmDel({
    title:'¿Deshacer este pago?',btn:'Deshacer pago',
    msg:`Se quitará el pago de ${fmtMes(mes)} de "${p.nombre}"${parseFloat(pago.saldo_aplicado||0)>0?` y se devolverán ${q(pago.saldo_aplicado)} al saldo`:''}.`,
    onConfirm:()=>deshacerPago(p,pago),
  })
  const registrarPagoDeuda=async(e)=>{
    e.preventDefault()
    const it=modalPago, prest=prestamos.find(x=>x.id===it.id)
    if(!prest||pagoBusy) return
    setPagoBusy(it.origen+it.id)
    const saldo=parseFloat(prest.saldo_actual||0)
    const restar=Math.min(Math.max(parseFloat(fPago.restar||0),0),saldo)
    const nuevo=Math.round((saldo-restar)*100)/100
    const{data:pago,error}=await supabase.from('budget_pagos').insert({
      user_id:budgetUid,mes,origen:'deuda',ref_id:prest.id,
      monto:parseFloat(fPago.monto||0),saldo_aplicado:Math.round(restar*100)/100,fecha_pago:today,
    }).select().single()
    if(error){alert('No se pudo registrar el pago: '+error.message);setPagoBusy(null);return}
    const{data:upd,error:e2}=await supabase.from('budget_prestamos').update({saldo_actual:nuevo}).eq('id',prest.id).select().single()
    if(e2){
      // Revertir el pago para no dejar datos a medias
      await supabase.from('budget_pagos').delete().eq('id',pago.id)
      alert('No se pudo actualizar el saldo: '+e2.message)
    }else{
      setPagos(p=>[...p,pago]); if(upd) setSaldoLocal(upd)
      setModalPago(null)
    }
    setPagoBusy(null)
  }
  const abrirLimites=()=>{
    const f={};CATS_VAR.forEach(c=>{const l=limiteDe(c);f[c]=l!=null?String(l):''})
    setFLim(f);setModalLim(true)
  }
  const saveLimites=async(e)=>{
    e.preventDefault()
    const upserts=[],borrar=[]
    Object.entries(fLim).forEach(([categoria,v])=>{
      const n=parseFloat(v)
      if(v!==''&&n>0) upserts.push({user_id:budgetUid,categoria,limite:n})
      else if(limiteDe(categoria)!=null) borrar.push(categoria)
    })
    if(upserts.length){
      const{error}=await supabase.from('budget_limites').upsert(upserts,{onConflict:'user_id,categoria'})
      if(error){alert('No se pudieron guardar los límites: '+error.message);return}
    }
    if(borrar.length) await supabase.from('budget_limites').delete().eq('user_id',budgetUid).in('categoria',borrar)
    const{data}=await supabase.from('budget_limites').select('*').eq('user_id',budgetUid)
    setLimites(data||[]);setModalLim(false)
  }
  // Nuevo gasto: fecha de hoy y el medio de pago/tarjeta del último gasto registrado
  const openAddVar  =(dateStr)=>{
    const ult=gastosVar[gastosVar.length-1]
    const medio=ult?.medio_pago||'Efectivo'
    setFVar({nombre:'',categoria:'Alimentación',monto:'',fecha:dateStr||today,medio_pago:medio,tarjeta:medio!=='Efectivo'?(ult?.tarjeta||''):'',fecha_pago:''})
    setVerSug(false);setModalVar({})
  }
  // Sugerencias de descripción a partir de gastos anteriores (más frecuentes primero)
  const sugerenciasGasto=(txt)=>{
    const t=txt.trim().toLowerCase()
    if(t.length<2) return []
    const por={}
    gastosVar.forEach(g=>{
      const n=(g.nombre||'').trim(); if(!n||!n.toLowerCase().includes(t)) return
      const k=n.toLowerCase()
      por[k]={g,count:(por[k]?.count||0)+1}   // gastosVar viene ordenado por fecha de creación → queda el más reciente
    })
    return Object.values(por).sort((a,b)=>b.count-a.count).slice(0,5).map(x=>x.g)
  }
  const usarSugerencia=(g)=>{
    const medio=g.medio_pago||'Efectivo'
    setFVar(p=>({...p,nombre:g.nombre,categoria:CATS_VAR.includes(g.categoria)?g.categoria:p.categoria,medio_pago:medio,tarjeta:medio!=='Efectivo'?(g.tarjeta||''):'',fecha_pago:''}))
    setVerSug(false)
  }

  // ── Copiar ingresos/ahorros del mes anterior ──
  const mesAnterior=(()=>{const[y,m]=mes.split('-').map(Number);const d=new Date(y,m-2);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`})()
  const abrirCopiar=(tipo)=>{
    const prev=(tipo==='ingresos'?ingresos:ahorros).filter(x=>x.mes===mesAnterior)
    const actuales=new Set((tipo==='ingresos'?ingMes:ahoMes).map(x=>(x.nombre||'').trim().toLowerCase()))
    setModalCopy({tipo,items:prev.map(x=>{const existe=actuales.has((x.nombre||'').trim().toLowerCase());return{...x,existe,sel:!existe}})})
  }
  const copiarSeleccion=async()=>{
    const{tipo,items}=modalCopy
    const sel=items.filter(x=>x.sel); if(!sel.length){setModalCopy(null);return}
    const rows=sel.map(x=>{
      if(tipo==='ahorros') return {user_id:budgetUid,nombre:x.nombre,meta_total:x.meta_total,aportado_mes:x.aportado_mes,mes}
      // Ingreso variable con fecha: mismo día en el mes actual
      let fecha=null
      if(x.tipo!=='fijo'&&x.fecha){const d=Math.min(parseInt(String(x.fecha).slice(8,10)),daysInMonth);fecha=`${mes}-${String(d).padStart(2,'0')}`}
      return {user_id:budgetUid,nombre:x.nombre,tipo:x.tipo,monto:x.monto,mes,dia:x.tipo==='fijo'?x.dia:null,fecha}
    })
    const table=tipo==='ingresos'?'budget_ingresos':'budget_ahorros'
    const{data,error}=await supabase.from(table).insert(rows).select()
    if(error){alert('No se pudo copiar: '+error.message);return}
    ;(tipo==='ingresos'?setIngresos:setAhorros)(p=>[...p,...(data||[])])
    setModalCopy(null)
  }

  function isPróximo(f){if(!f)return false;const diff=(new Date(f+'T00:00:00')-new Date())/86400000;return diff>=0&&diff<=30}
  function isVencido(f){if(!f)return false;return new Date(f+'T00:00:00')<new Date()}

  // Chip de tarjeta para mostrar en listas
  const TarjetaChip=({g})=>{
    if(!g.medio_pago||g.medio_pago==='Efectivo') return <span style={{fontSize:'10px',color:'var(--text-muted)',background:'var(--inner-bg)',padding:'1px 6px',borderRadius:'5px'}}>Efectivo</span>
    const isC=g.medio_pago==='Tarjeta de Crédito'
    return (
      <span style={{fontSize:'10px',fontWeight:'600',color:isC?'#a78bfa':'var(--green)',background:isC?'rgba(167,139,250,0.12)':'rgba(52,199,89,0.1)',padding:'1px 6px',borderRadius:'5px',whiteSpace:'nowrap'}}>
        {isC?'💳':'🏦'} {g.tarjeta||g.medio_pago}
      </span>
    )
  }

  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'200px'}}>
      <div style={{width:'28px',height:'28px',border:'3px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // Tarjeta de total destacado al inicio de cada pestaña
  const heroTotal=({label,value,color,glow,sub,stats=[]})=>{
    const mono={fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}
    return(
      <div className="glow-tile" style={{...card,padding:'22px 24px','--tile-glow':glow}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'18px 28px',flexWrap:'wrap',position:'relative'}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label} · {fmtMes(mes)}</div>
            <div style={{fontSize:isMobile?'30px':'36px',fontWeight:'800',letterSpacing:'-0.03em',color,marginTop:'4px',...mono}}>{q(value)}</div>
            {sub&&<div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px',...mono}}>{sub}</div>}
          </div>
          {stats.length>0&&(
            <div style={{display:'flex',gap:'26px',flexWrap:'wrap'}}>
              {stats.map(([l,v,c,s])=>(
                <div key={l} style={{minWidth:0}}>
                  <div style={{fontSize:'10.5px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'4px'}}>{l}</div>
                  <div style={{fontSize:'17px',fontWeight:'800',color:c,letterSpacing:'-0.02em',...mono}}>{v}</div>
                  {s&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px',...mono}}>{s}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  // Diferencia contra el mes anterior, en texto
  const vsAnterior=(actual,anterior)=>{
    if(!anterior) return null
    const d=actual-anterior
    return `${d>=0?'+':'−'}${q(Math.abs(d))} vs ${MESES[parseInt(mesAnterior.slice(5))-1].toLowerCase()}`
  }

  // Botón "Copiar de <mes anterior>" — solo si el mes anterior tiene registros
  const btnCopiar=(tipo)=>{
    const n=(tipo==='ingresos'?ingresos:ahorros).filter(x=>x.mes===mesAnterior).length
    if(!n) return null
    return(
      <button onClick={()=>abrirCopiar(tipo)} style={{display:'flex',alignItems:'center',gap:'6px',width:'100%',justifyContent:'center',padding:'8px',marginBottom:'14px',borderRadius:'9px',border:'1px dashed var(--border-card)',background:'transparent',color:'var(--text-2)',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar de {fmtMes(mesAnterior)} ({n})
      </button>
    )
  }

  const navBtn={background:'var(--inner-bg)',border:'1px solid var(--border)',borderRadius:'8px',padding:'6px 10px',cursor:'pointer',color:'var(--text-2)',display:'flex',alignItems:'center'}

  // ── Compact gastos calendar renderer ──
  const GastosCalendar=()=>{
    const selEvts = calGastosSel ? (gastosByPago[calGastosSel]||[]) : []
    return (
      <div style={{...card,alignSelf:'start'}}>
        <div style={{fontSize:'12px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'14px'}}>Gastos del Mes</div>

        {totalPagosVar>0&&(
          <div style={{marginBottom:'12px',padding:'10px 12px',background:'rgba(255,59,48,0.08)',borderRadius:'10px',border:'1px solid rgba(255,59,48,0.2)'}}>
            <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'3px'}}>Total pagado</div>
            <div style={{fontSize:'15px',fontWeight:'800',color:'var(--red)'}}>{q(totalPagosVar)}</div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'3px'}}>
          {DIAS_SEMANA.map(d=><div key={d} style={{textAlign:'center',fontSize:'10px',fontWeight:'600',color:'var(--text-muted)',padding:'3px 0'}}>{d}</div>)}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px'}}>
          {calCells.map((day,idx)=>{
            if(!day) return <div key={`ge-${idx}`}/>
            const dateStr  =`${mes}-${String(day).padStart(2,'0')}`
            const dayG     =gastosByPago[dateStr]||[]
            const dayTotal =dayG.reduce((s,g)=>s+parseFloat(g.monto||0),0)
            const isToday  =dateStr===today
            const isSel    =dateStr===calGastosSel
            return(
              <button key={`g${dateStr}`} onClick={()=>setCalGastosSel(isSel?null:dateStr)} style={{
                padding:'5px 2px 4px',borderRadius:'8px',cursor:dayG.length?'pointer':'default',
                border:isSel?'2px solid var(--red)':isToday?'1px solid var(--accent)':'1px solid transparent',
                background:isSel?'rgba(255,59,48,0.10)':dayG.length?'var(--inner-bg)':'transparent',
                display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',transition:'all 0.1s',
              }}>
                <span style={{fontSize:'11px',fontWeight:isToday||isSel?'700':'400',color:isSel?'var(--red)':isToday?'var(--accent)':'var(--text-1)'}}>{day}</span>
                {dayG.length>0&&(
                  <span style={{fontSize:'9px',fontWeight:'700',color:isSel?'var(--red)':'var(--red)',opacity:isSel?1:0.85,lineHeight:1}}>
                    Q{Math.round(dayTotal).toLocaleString('es-GT')}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {calGastosSel&&(
          <div style={{marginTop:'12px',padding:'12px',background:'var(--inner-bg)',borderRadius:'10px',border:'1px solid var(--border)'}}>
            <div style={{fontSize:'12px',fontWeight:'600',color:'var(--text-1)',marginBottom:'8px'}}>
              {(()=>{const[,,d]=calGastosSel.split('-');return`${parseInt(d)} de ${fmtMes(mes)}`})()}
            </div>
            {selEvts.length===0
              ?<p style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'8px 0'}}>Sin gastos este día</p>
              :selEvts.map((g,i)=>(
                <div key={g.id||i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 0',borderBottom:i<selEvts.length-1?'1px solid var(--border)':'none'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'var(--red)',flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:'500',color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.nombre}</div>
                    <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}{g.tarjeta?` · ${g.tarjeta}`:''}</div>
                  </div>
                  <div style={{fontSize:'12px',fontWeight:'700',color:'var(--red)',whiteSpace:'nowrap'}}>{q(g.monto)}</div>
                </div>
              ))
            }
            {selEvts.length>0&&(
              <div style={{display:'flex',justifyContent:'flex-end',paddingTop:'8px'}}>
                <span style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)'}}>Total: {q(selEvts.reduce((s,g)=>s+parseFloat(g.monto||0),0))}</span>
              </div>
            )}
          </div>
        )}

        <div style={{display:'flex',gap:'10px',marginTop:'12px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'var(--red)'}}/>
            <span style={{fontSize:'10px',color:'var(--text-muted)'}}>Gasto realizado</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Compact payment calendar renderer ──
  const PayCalendar=()=>(
    <div style={{...card,alignSelf:'start'}}>
      <div style={{fontSize:'12px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'14px'}}>Calendario de Pagos</div>

      {/* Totales del mes */}
      {Object.values(calEvents).flat().length>0 && (
        <div style={{marginBottom:'12px',padding:'10px 12px',background:'rgba(255,149,0,0.08)',borderRadius:'10px',border:'1px solid rgba(255,149,0,0.2)'}}>
          <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'3px'}}>Total compromisos del mes</div>
          <div style={{fontSize:'15px',fontWeight:'800',color:'#ff9500'}}>{q(Object.values(calEvents).flat().reduce((s,e)=>s+parseFloat(e.amount||0),0))}</div>
        </div>
      )}

      {/* Header días */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'3px'}}>
        {DIAS_SEMANA.map(d=><div key={d} style={{textAlign:'center',fontSize:'10px',fontWeight:'600',color:'var(--text-muted)',padding:'3px 0'}}>{d}</div>)}
      </div>

      {/* Días */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px'}}>
        {calCells.map((day,idx)=>{
          if(!day) return <div key={`e-${idx}`}/>
          const dateStr    =`${mes}-${String(day).padStart(2,'0')}`
          const evts       =calEvents[dateStr]||[]
          const isToday    =dateStr===today
          const isSel      =dateStr===calSelDay
          return(
            <button key={dateStr} onClick={()=>setCalSelDay(isSel?null:dateStr)} style={{
              padding:'5px 2px 4px',borderRadius:'8px',cursor:evts.length?'pointer':'default',
              border:isSel?'2px solid var(--accent)':isToday?'1px solid var(--accent)':'1px solid transparent',
              background:isSel?'var(--accent-soft)':evts.length?'var(--inner-bg)':'transparent',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',transition:'all 0.1s',
            }}>
              <span style={{fontSize:'11px',fontWeight:isToday||isSel?'700':'400',color:isSel||isToday?'var(--accent)':'var(--text-1)'}}>{day}</span>
              {evts.length>0&&(
                <div style={{display:'flex',gap:'2px',flexWrap:'wrap',justifyContent:'center'}}>
                  {evts.slice(0,3).map((e,i)=><div key={i} style={{width:'5px',height:'5px',borderRadius:'50%',background:e.color}}/>)}
                  {evts.length>3&&<div style={{fontSize:'8px',color:'var(--text-muted)',lineHeight:1}}>+{evts.length-3}</div>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel día seleccionado */}
      {calSelDay&&(
        <div style={{marginTop:'12px',padding:'12px',background:'var(--inner-bg)',borderRadius:'10px',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'12px',fontWeight:'600',color:'var(--text-1)',marginBottom:'8px'}}>
            {(()=>{const[,,d]=calSelDay.split('-');return`${parseInt(d)} de ${fmtMes(mes)}`})()}
          </div>
          {calSelEvents.length===0
            ?<p style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'8px 0'}}>Sin pagos este día</p>
            :calSelEvents.map((e,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 0',borderBottom:i<calSelEvents.length-1?'1px solid var(--border)':'none'}}>
                <div style={{width:'7px',height:'7px',borderRadius:'50%',background:e.color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'12px',fontWeight:'500',color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.label}</div>
                  <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{e.tipo}</div>
                </div>
                <div style={{fontSize:'12px',fontWeight:'700',color:e.color,whiteSpace:'nowrap'}}>{q(e.amount)}</div>
              </div>
            ))
          }
          {calSelEvents.length>0&&(
            <div style={{display:'flex',justifyContent:'flex-end',paddingTop:'8px'}}>
              <span style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)'}}>Total: {q(calSelEvents.reduce((s,e)=>s+parseFloat(e.amount||0),0))}</span>
            </div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'12px'}}>
        {[['var(--accent)','Gasto Fijo'],['#ff9500','Deuda'],['#a78bfa','Compromiso'],['var(--red)','Vencido']].map(([c,l])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:c}}/>
            <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return(
    <div style={{maxWidth:'900px'}}>

      {/* ── Header ── */}
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:'28px',fontWeight:'500',letterSpacing:'-0.03em',color:'var(--text-1)',margin:'0 0 16px'}}>Presupuesto</h1>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <button onClick={prevMes} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div style={{fontSize:'14px',fontWeight:'600',color:'var(--text-1)',minWidth:'140px',textAlign:'center',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{fmtMes(mes)}</div>
          <button onClick={nextMes} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg></button>
          <button onClick={()=>openAddVar(today.startsWith(mes)?today:`${mes}-01`)} style={{marginLeft:'auto',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'10px',padding:'8px 16px',fontSize:'13px',fontWeight:'700',cursor:'pointer',boxShadow:'0 4px 14px -4px var(--accent-glow)',whiteSpace:'nowrap'}}>+ Gasto</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:'4px',marginBottom:'24px',background:'var(--inner-bg)',padding:'4px',borderRadius:'12px',overflowX:'auto'}}>
        {TABS.map(({key,label})=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            padding:'7px 18px',borderRadius:'9px',border:'none',fontSize:'13px',fontWeight:'500',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
            background:tab===key?'var(--card-bg)':'transparent',
            color:tab===key?'var(--text-1)':'var(--text-muted)',
            boxShadow:tab===key?'0 1px 3px rgba(0,0,0,0.08)':'none',
          }}>{label}</button>
        ))}
      </div>

      {/* ══ TAB: RESUMEN ══ */}
      {tab==='resumen'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

          {/* ── Calendario operativo full-width ── */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Calendario Operativo</div>
                <div style={{fontSize:'20px',fontWeight:'800',letterSpacing:'-0.02em',color:'var(--text-1)',marginTop:'4px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{fmtMes(mes)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'2px'}}>Total compromisos del mes</div>
                <div style={{fontSize:'16px',fontWeight:'800',color:'#ff9500',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(Object.values(calEvents).flat().reduce((s,e)=>s+parseFloat(e.amount||0),0))}</div>
              </div>
            </div>

            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <div style={{minWidth:'560px'}}>
                {/* Header días */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr) 80px',gap:'4px',marginBottom:'6px'}}>
                  {DIAS_SEMANA.map(d=>(
                    <div key={d} style={{textAlign:'center',fontSize:'11px',fontWeight:'600',color:'var(--text-muted)',padding:'4px 0'}}>{d}</div>
                  ))}
                  <div style={{textAlign:'center',fontSize:'11px',fontWeight:'600',color:'var(--text-muted)',padding:'4px 0'}}>Semana</div>
                </div>

                {/* Filas por semana */}
                {(()=>{
                  const weeks=[]
                  for(let i=0;i<calCells.length;i+=7) weeks.push(calCells.slice(i,i+7))
                  return weeks.map((week,wi)=>{
                    const weekDays=week.filter(Boolean)
                    const weekTotal=weekDays.reduce((s,day)=>{
                      const ds=`${mes}-${String(day).padStart(2,'0')}`
                      return s+(calEvents[ds]||[]).reduce((ss,e)=>ss+parseFloat(e.amount||0),0)
                    },0)
                    return(
                      <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr) 80px',gap:'4px',marginBottom:'4px'}}>
                        {week.map((day,di)=>{
                          if(!day) return <div key={`e-${wi}-${di}`} style={{minHeight:'72px',borderRadius:'10px',background:'var(--inner-bg)',opacity:0.2}}/>
                          const dateStr=`${mes}-${String(day).padStart(2,'0')}`
                          const evts=calEvents[dateStr]||[]
                          const ingEvts=evts.filter(e=>e.tipo==='Ingreso')
                          const gasEvts=evts.filter(e=>e.tipo!=='Ingreso')
                          const ingTotal=ingEvts.reduce((s,e)=>s+parseFloat(e.amount||0),0)
                          const gasTotal=gasEvts.reduce((s,e)=>s+parseFloat(e.amount||0),0)
                          const isToday=dateStr===today
                          const isSel=dateStr===calSelDay
                          const hasIng=ingTotal>0,hasGas=gasTotal>0
                          const fillBg=hasIng&&hasGas?'linear-gradient(135deg, var(--green) 50%, var(--red) 50%)':hasIng?'var(--green)':hasGas?'var(--red)':null
                          return(
                            <button key={dateStr} onClick={()=>setCalSelDay(isSel?null:dateStr)} style={{
                              minHeight:'72px',borderRadius:'10px',padding:'8px 8px 6px',
                              cursor:evts.length?'pointer':'default',
                              border:fillBg&&isSel?'2px solid #fff':isSel?'2px solid var(--accent-bright)':isToday?'1px solid var(--accent-bright)':'1px solid var(--border)',
                              background:fillBg||(isSel?'var(--accent-soft)':isToday?'rgba(88,86,214,0.06)':'transparent'),
                              display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'2px',
                              transition:'all 0.12s',textAlign:'left',
                            }}>
                              <span style={{fontSize:'13px',fontWeight:isToday||fillBg?'700':'500',color:fillBg?'#fff':isToday?'var(--accent-bright)':isSel?'var(--accent-bright)':'var(--text-1)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textShadow:fillBg?'0 1px 2px rgba(0,0,0,0.3)':'none'}}>{day}</span>
                              {ingTotal>0&&<span style={{fontSize:'10px',fontWeight:'700',color:fillBg?'#fff':'var(--green)',lineHeight:1,fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textShadow:fillBg?'0 1px 2px rgba(0,0,0,0.3)':'none'}}>+{q(ingTotal)}</span>}
                              {gasTotal>0&&<span style={{fontSize:'10px',fontWeight:'700',color:fillBg?'#fff':'var(--red)',lineHeight:1,fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textShadow:fillBg?'0 1px 2px rgba(0,0,0,0.3)':'none'}}>{q(gasTotal)}</span>}
                              {evts.length>0&&(
                                <div style={{display:'flex',gap:'3px',flexWrap:'wrap',marginTop:'auto'}}>
                                  {evts.slice(0,4).map((e,i)=><div key={i} style={{width:'5px',height:'5px',borderRadius:'50%',background:e.color,border:fillBg?'1px solid rgba(255,255,255,0.6)':'none'}}/>)}
                                  {evts.length>4&&<span style={{fontSize:'8px',color:fillBg?'rgba(255,255,255,0.85)':'var(--text-muted)'}}>+{evts.length-4}</span>}
                                </div>
                              )}
                            </button>
                          )
                        })}
                        {/* Columna semana */}
                        <div style={{
                          minHeight:'72px',borderRadius:'10px',padding:'8px 6px',
                          background:'var(--inner-bg)',border:'1px solid var(--border)',
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',
                        }}>
                          <div style={{fontSize:'9px',fontWeight:'600',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Total</div>
                          <div style={{fontSize:'13px',fontWeight:'800',color:weekTotal>0?'var(--red)':'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{weekTotal>0?q(weekTotal):'—'}</div>
                          {weekDays.length>0&&(
                            <div style={{fontSize:'9px',color:'var(--text-muted)',textAlign:'center',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>
                              {weekDays[0]}–{weekDays[weekDays.length-1]}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Panel día seleccionado */}
            {calSelDay&&(
              <div style={{marginTop:'14px',padding:'14px',background:'var(--inner-bg)',borderRadius:'12px',border:'1px solid var(--border)'}}>
                <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)',marginBottom:'10px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>
                  {(()=>{const[,,d]=calSelDay.split('-');return`${parseInt(d)} de ${fmtMes(mes)}`})()}
                </div>
                {calSelEvents.length===0
                  ?<p style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'8px 0'}}>Sin pagos este día</p>
                  :calSelEvents.map((e,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:i<calSelEvents.length-1?'1px solid var(--border)':'none'}}>
                      <div style={{width:'8px',height:'8px',borderRadius:'50%',background:e.color,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{e.label}</div>
                        <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{e.tipo}</div>
                      </div>
                      <div style={{fontSize:'13px',fontWeight:'700',color:e.color,fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(e.amount)}</div>
                    </div>
                  ))
                }
                {calSelEvents.length>0&&(
                  <div style={{display:'flex',justifyContent:'flex-end',paddingTop:'8px'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Total: {q(calSelEvents.reduce((s,e)=>s+parseFloat(e.amount||0),0))}</span>
                  </div>
                )}
              </div>
            )}

            {/* Pie: leyenda + mes total */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'16px',paddingTop:'14px',borderTop:'1px solid var(--border)',flexWrap:'wrap',gap:'10px'}}>
              <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
                {[['var(--green)','Ingreso'],['var(--accent)','Gasto Fijo'],['#ff9500','Deuda'],['#a78bfa','Compromiso'],['var(--red)','Vencido']].map(([c,l])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                    <div style={{width:'7px',height:'7px',borderRadius:'50%',background:c}}/>
                    <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{l}</span>
                  </div>
                ))}
              </div>
              <div style={{fontSize:'12px',fontWeight:'800',color:'var(--text-1)',letterSpacing:'0.03em'}}>
                MES TOTAL <span style={{color:'var(--red)',marginLeft:'6px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>
                  {q(Object.values(calEvents).flat().reduce((s,e)=>s+parseFloat(e.amount||0),0))}
                </span>
              </div>
            </div>
          </div>

          {/* ── Disponible ── */}
          <div className="glow-tile" style={{...card,background:disponible>=0?'rgba(52,199,89,0.08)':'rgba(255,59,48,0.08)',border:`1px solid ${disponible>=0?'rgba(52,199,89,0.25)':'rgba(255,59,48,0.25)'}`,'--tile-glow':disponible>=0?'var(--green-glow)':'var(--accent-glow)'}}>
            <div style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px',position:'relative',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Disponible · {fmtMes(mes)}</div>
            <div style={{fontSize:'36px',fontWeight:'800',letterSpacing:'-0.03em',color:disponible>=0?'var(--green)':'var(--red)',position:'relative',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(disponible)}</div>
            <div style={{display:'flex',gap:'12px',marginTop:'10px',flexWrap:'wrap',position:'relative'}}>
              <span style={{fontSize:'12px',color:'var(--green)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>↑ {q(totalIngresos)} ingresos</span>
              <span style={{fontSize:'12px',color:'var(--red)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>↓ {q(totalGastosAll)} gastos</span>
            </div>
          </div>

          {/* ── 4 mini-cards ── */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:'10px'}}>
            {[
              {label:'Ingresos',amount:totalIngresos,color:'var(--green)',bg:'rgba(52,199,89,0.08)',glow:'var(--green-glow)',action:()=>setTab('ingresos')},
              {label:'Deudas',amount:totalPrestamos,color:'#ff9500',bg:'rgba(255,149,0,0.08)',glow:'var(--yellow-glow)',action:()=>setTab('deudas')},
              {label:'Gastos',amount:totalFijos+totalVariables,color:'#ff6b6b',bg:'rgba(255,107,107,0.08)',glow:'var(--accent-glow)',action:()=>setTab('gastos')},
              {label:'Ahorros',amount:totalAhorros,color:'var(--accent)',bg:'var(--accent-soft)',glow:'var(--accent-glow)',action:()=>setTab('ahorros')},
            ].map(({label,amount,color,bg,glow,action})=>(
              <button key={label} className="glow-tile" onClick={action} style={{background:bg,borderRadius:'12px',padding:'14px 16px',borderLeft:`3px solid ${color}`,border:'none',cursor:'pointer',textAlign:'left','--tile-glow':glow}}>
                <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'4px',position:'relative'}}>{label}</div>
                <div style={{fontSize:'15px',fontWeight:'700',color,position:'relative',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(amount)}</div>
              </button>
            ))}
          </div>

          {/* ── Desglose + Distribución ── */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'14px'}}>
            <div style={card}>
              <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)',marginBottom:'14px'}}>Desglose</div>
              {[
                {label:'Ingresos',        amount:totalIngresos,  color:'var(--green)', sign:'+'},
                {label:'Gastos Fijos',    amount:totalFijos,     color:'var(--red)',   sign:'−'},
                {label:'Cuotas Deudas',   amount:totalPrestamos, color:'var(--red)',   sign:'−'},
                {label:'Gastos Variables',amount:totalVariables, color:'var(--red)',   sign:'−'},
                {label:'Ahorros',         amount:totalAhorros,   color:'var(--yellow)',sign:'−'},
              ].map(({label,amount,color,sign})=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:color}}/>
                    <span style={{fontSize:'13px',color:'var(--text-1)'}}>{label}</span>
                  </div>
                  <span style={{fontSize:'13px',fontWeight:'600',color,fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{sign} {q(amount)}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'14px'}}>
                <span style={{fontSize:'14px',fontWeight:'700',color:'var(--text-1)'}}>Disponible</span>
                <span style={{fontSize:'16px',fontWeight:'800',color:disponible>=0?'var(--green)':'var(--red)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>= {q(disponible)}</span>
              </div>
            </div>

            {totalGastosAll>0?(
              <div style={card}>
                <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)',marginBottom:'16px'}}>Distribución de gastos</div>
                {[
                  {label:'Gastos Fijos',    amount:totalFijos,     color:'#ff6b6b'},
                  {label:'Deudas',          amount:totalPrestamos, color:'#ff9500'},
                  {label:'Gastos Variables',amount:totalVariables, color:'var(--accent)'},
                  {label:'Ahorros',         amount:totalAhorros,   color:'var(--green)'},
                ].filter(x=>x.amount>0).map(({label,amount,color})=>{
                  const pct=(amount/totalGastosAll)*100
                  return(
                    <div key={label} style={{marginBottom:'12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                        <span style={{fontSize:'12px',color:'var(--text-2)'}}>{label}</span>
                        <span style={{fontSize:'12px',color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{pct.toFixed(1)}% · {q(amount)}</span>
                      </div>
                      <div style={{height:'6px',background:'var(--inner-bg)',borderRadius:'3px'}}>
                        <div style={{height:'6px',background:color,borderRadius:'3px',width:`${pct}%`}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            ):<div/>}
          </div>

        </div>
      )}

      {/* ══ TAB: INGRESOS ══ */}
      {tab==='ingresos'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          {(()=>{
            const fijos=ingMes.filter(i=>i.tipo==='fijo').reduce((s,i)=>s+parseFloat(i.monto||0),0)
            const ant=ingresos.filter(i=>i.mes===mesAnterior).reduce((s,i)=>s+parseFloat(i.monto||0),0)
            return heroTotal({label:'Ingresos',value:totalIngresos,color:'var(--green)',glow:'var(--green-glow)',
              sub:vsAnterior(totalIngresos,ant),
              stats:[['Fijos',q(fijos),'var(--text-1)'],['Variables',q(totalIngresos-fijos),'var(--text-1)'],['Registros',ingMes.length,'var(--text-2)']]})
          })()}

          {/* Calendario de ingresos */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Calendario de Ingresos</div>
                <div style={{fontSize:'20px',fontWeight:'800',letterSpacing:'-0.02em',color:'var(--text-1)',marginTop:'4px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{fmtMes(mes)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'2px'}}>Total del mes</div>
                <div style={{fontSize:'16px',fontWeight:'800',color:'var(--green)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(totalIngresos)}</div>
              </div>
            </div>

            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <div style={{minWidth:'560px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr) 80px',gap:'4px',marginBottom:'6px'}}>
                  {DIAS_SEMANA.map(d=>(
                    <div key={d} style={{textAlign:'center',fontSize:'11px',fontWeight:'600',color:'var(--text-muted)',padding:'4px 0'}}>{d}</div>
                  ))}
                  <div style={{textAlign:'center',fontSize:'11px',fontWeight:'600',color:'var(--text-muted)',padding:'4px 0'}}>Semana</div>
                </div>

                {(()=>{
                  const weeks=[]
                  for(let i=0;i<calCells.length;i+=7) weeks.push(calCells.slice(i,i+7))
                  return weeks.map((week,wi)=>{
                    const weekDays=week.filter(Boolean)
                    const weekTotal=weekDays.reduce((s,day)=>{
                      const ds=`${mes}-${String(day).padStart(2,'0')}`
                      return s+(ingCalEvents[ds]||[]).reduce((ss,e)=>ss+parseFloat(e.amount||0),0)
                    },0)
                    return(
                      <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr) 80px',gap:'4px',marginBottom:'4px'}}>
                        {week.map((day,di)=>{
                          if(!day) return <div key={`ie-${wi}-${di}`} style={{minHeight:'72px',borderRadius:'10px',background:'var(--inner-bg)',opacity:0.2}}/>
                          const dateStr=`${mes}-${String(day).padStart(2,'0')}`
                          const evts=ingCalEvents[dateStr]||[]
                          const dayTotal=evts.reduce((s,e)=>s+parseFloat(e.amount||0),0)
                          const isToday=dateStr===today
                          const isSel=dateStr===ingSelDay
                          const filled=dayTotal>0
                          return(
                            <button key={`i${dateStr}`} onClick={()=>setIngSelDay(isSel?null:dateStr)} style={{
                              minHeight:'72px',borderRadius:'10px',padding:'8px 8px 6px',
                              cursor:evts.length?'pointer':'default',
                              border:filled&&isSel?'2px solid #fff':isSel?'2px solid var(--green)':isToday?'1px solid var(--accent-bright)':'1px solid var(--border)',
                              background:filled?'var(--green)':(isSel?'rgba(52,199,89,0.1)':isToday?'rgba(88,86,214,0.06)':'transparent'),
                              display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'4px',
                              transition:'all 0.12s',textAlign:'left',
                            }}>
                              <span style={{fontSize:'13px',fontWeight:isToday||filled?'700':'500',color:filled?'#fff':isToday?'var(--accent-bright)':isSel?'var(--green)':'var(--text-1)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textShadow:filled?'0 1px 2px rgba(0,0,0,0.3)':'none'}}>{day}</span>
                              {dayTotal>0&&(
                                <span style={{fontSize:'11px',fontWeight:'700',color:filled?'#fff':'var(--green)',lineHeight:1,fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textShadow:filled?'0 1px 2px rgba(0,0,0,0.3)':'none'}}>+{q(dayTotal)}</span>
                              )}
                              {evts.length>0&&(
                                <div style={{display:'flex',gap:'3px',marginTop:'auto'}}>
                                  {evts.slice(0,3).map((_,i)=><div key={i} style={{width:'5px',height:'5px',borderRadius:'50%',background:filled?'rgba(255,255,255,0.85)':'var(--green)'}}/>)}
                                  {evts.length>3&&<span style={{fontSize:'8px',color:filled?'rgba(255,255,255,0.85)':'var(--text-muted)'}}>+{evts.length-3}</span>}
                                </div>
                              )}
                            </button>
                          )
                        })}
                        <div style={{
                          minHeight:'72px',borderRadius:'10px',padding:'8px 6px',
                          background:'var(--inner-bg)',border:'1px solid var(--border)',
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',
                        }}>
                          <div style={{fontSize:'9px',fontWeight:'600',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Total</div>
                          <div style={{fontSize:'13px',fontWeight:'800',color:weekTotal>0?'var(--green)':'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{weekTotal>0?`+${q(weekTotal)}`:'—'}</div>
                          {weekDays.length>0&&(
                            <div style={{fontSize:'9px',color:'var(--text-muted)',textAlign:'center',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{weekDays[0]}–{weekDays[weekDays.length-1]}</div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {ingSelDay&&(
              <div style={{marginTop:'14px',padding:'14px',background:'var(--inner-bg)',borderRadius:'12px',border:'1px solid var(--border)'}}>
                <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)',marginBottom:'10px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>
                  {(()=>{const[,,d]=ingSelDay.split('-');return`${parseInt(d)} de ${fmtMes(mes)}`})()}
                </div>
                {ingSelEvents.length===0
                  ?<p style={{fontSize:'12px',color:'var(--text-muted)',textAlign:'center',padding:'8px 0'}}>Sin ingresos este día</p>
                  :ingSelEvents.map((e,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:i<ingSelEvents.length-1?'1px solid var(--border)':'none'}}>
                      <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--green)',flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{e.label}</div>
                        <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{e.tipo}</div>
                      </div>
                      <div style={{fontSize:'13px',fontWeight:'700',color:'var(--green)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>+{q(e.amount)}</div>
                    </div>
                  ))
                }
                {ingSelEvents.length>0&&(
                  <div style={{display:'flex',justifyContent:'flex-end',paddingTop:'8px'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Total: +{q(ingSelEvents.reduce((s,e)=>s+parseFloat(e.amount||0),0))}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',marginTop:'16px',paddingTop:'14px',borderTop:'1px solid var(--border)'}}>
              <div style={{fontSize:'12px',fontWeight:'800',color:'var(--text-1)',letterSpacing:'0.03em'}}>
                MES TOTAL <span style={{color:'var(--green)',marginLeft:'6px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(totalIngresos)}</span>
              </div>
            </div>
          </div>

          {/* Lista de ingresos */}
          <div style={card}>
            <SubHead label="Ingresos del mes" total={totalIngresos} onAdd={()=>{setFIng({nombre:'',tipo:'fijo',monto:'',dia:''});setModalIng({})}}/>
            {btnCopiar('ingresos')}
            {ingMes.length===0
              ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Sin ingresos registrados</p>
              :ingMes.map(i=>(
                <div key={i.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13.5px',fontWeight:'500',color:'var(--text-1)'}}>{i.nombre}</div>
                    <div style={{display:'flex',gap:'8px',marginTop:'2px'}}>
                      <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{i.tipo==='fijo'?'Fijo':'Variable'}</span>
                      {i.tipo==='fijo'&&i.dia&&<span style={{fontSize:'11px',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>día {i.dia}</span>}
                      {i.tipo!=='fijo'&&i.fecha&&<span style={{fontSize:'11px',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{new Date(i.fecha+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}</span>}
                    </div>
                  </div>
                  <div style={{fontWeight:'600',fontSize:'14px',color:'var(--green)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(i.monto)}</div>
                  <div style={{display:'flex',gap:'4px'}}>
                    <button onClick={()=>{setFIng({nombre:i.nombre,tipo:i.tipo,monto:String(i.monto),dia:i.dia!=null?String(i.dia):'',fecha:i.fecha||''});setModalIng(i)}} style={bEdit}><IcoEdit/></button>
                    <button onClick={()=>askDel(`"${i.nombre}" se eliminará.`,()=>del('budget_ingresos',i.id,setIngresos))} style={bDel}><IcoDel/></button>
                  </div>
                </div>
              ))
            }
            {ingMes.length>0&&<div style={{display:'flex',justifyContent:'flex-end',paddingTop:'14px'}}><span style={{fontSize:'14px',fontWeight:'700',color:'var(--green)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Total: {q(totalIngresos)}</span></div>}
          </div>

        </div>
      )}

      {/* ══ TAB: DEUDAS ══ */}
      {tab==='deudas'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

          {/* ── Resumen de deudas ── */}
          {(()=>{
            const mono={fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}
            const totOrig=prestActivos.reduce((s,p)=>s+parseFloat(p.monto_original||0),0)
            const totSaldo=prestActivos.reduce((s,p)=>s+parseFloat(p.saldo_actual||0),0)
            const pctGlobal=totOrig>0?(totOrig-totSaldo)/totOrig*100:0
            const pagadasMes=prestActivos.filter(p=>pagoDe('deuda',p.id)).length+prestPagados.filter(p=>pagoDe('deuda',p.id)).length
            const cuotasMes=prestActivos.length+prestPagados.filter(p=>pagoDe('deuda',p.id)).length
            const pagadoMes=pagosMes.filter(x=>x.origen==='deuda').reduce((s,x)=>s+parseFloat(x.monto||0),0)
            const vencidas=prestActivos.filter(cuotaVencida).length
            const stat=(label,value,color,sub)=>(
              <div style={{minWidth:0}}>
                <div style={{fontSize:'10.5px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'4px'}}>{label}</div>
                <div style={{fontSize:'18px',fontWeight:'800',color,letterSpacing:'-0.02em',...mono}}>{value}</div>
                {sub&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px',...mono}}>{sub}</div>}
              </div>
            )
            return(
              <div className="glow-tile" style={{...card,padding:'22px 24px','--tile-glow':'var(--yellow-glow)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'22px',flexWrap:'wrap',position:'relative'}}>
                  <Ring pct={pctGlobal} size={isMobile?84:104} stroke={9} color="var(--green)">
                    <div style={{textAlign:'center',lineHeight:1.1}}>
                      <div style={{fontSize:isMobile?'18px':'22px',fontWeight:'800',color:'var(--text-1)'}}>{pctGlobal.toFixed(0)}%</div>
                      <div style={{fontSize:'9px',color:'var(--text-muted)',fontFamily:'inherit'}}>pagado</div>
                    </div>
                  </Ring>
                  <div style={{flex:'1 1 200px',minWidth:0}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Saldo total de deudas</div>
                    <div style={{fontSize:isMobile?'28px':'34px',fontWeight:'800',letterSpacing:'-0.03em',color:'var(--text-1)',marginTop:'4px',...mono}}>{q(totSaldo)}</div>
                    <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px',...mono}}>de {q(totOrig)} originales · {prestActivos.length} activa{prestActivos.length!==1?'s':''}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,auto)',gap:'8px 26px',flex:isMobile?'1 1 100%':'0 0 auto'}}>
                    {stat('Cuotas / mes',q(totalPrestamos),'#ff9500')}
                    {stat('Pagado mes',q(pagadoMes),'var(--green)',`${pagadasMes} de ${cuotasMes} cuotas`)}
                    {stat('Vencidas',vencidas,vencidas?'var(--red)':'var(--text-muted)',vencidas?'sin pagar':'al día')}
                  </div>
                </div>
                {resumenDeudas.length>0&&(
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'18px',paddingTop:'16px',borderTop:'1px solid var(--border)',position:'relative'}}>
                    {resumenDeudas.map(({tipo,count,totalSaldo,totalCuota})=>(
                      <div key={tipo} style={{flex:'1 1 160px',padding:'10px 12px',borderRadius:'10px',background:'var(--inner-bg)',borderLeft:`3px solid ${TIPO_COLOR[tipo]}`}}>
                        <div style={{fontSize:'11.5px',fontWeight:'700',color:TIPO_COLOR[tipo]}}>{tipo} <span style={{color:'var(--text-muted)',fontWeight:'500'}}>· {count}</span></div>
                        <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text-1)',marginTop:'3px',...mono}}>{q(totalSaldo)}</div>
                        <div style={{fontSize:'10.5px',color:'var(--text-muted)',...mono}}>{q(totalCuota)} / mes</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Tarjetas de deudas activas ── */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{fontSize:'12px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Deudas activas ({prestActivos.length})</div>
              <button onClick={()=>{setFPrest({nombre:'',tipo:'Préstamo',monto_original:'',saldo_actual:'',cuota_mensual:'',meses_restantes:'',dia_pago:''});setModalPrest({})}} style={{background:'var(--accent-soft)',color:'var(--accent-bright)',border:'none',borderRadius:'8px',padding:'6px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ Agregar deuda</button>
            </div>
            {prestActivos.length===0
              ?<div style={{...card,textAlign:'center',fontSize:'13px',color:'var(--text-muted)'}}>{prestamos.length?'Todas las deudas están pagadas':'Sin deudas registradas'}</div>
              :<div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(2,minmax(0,1fr))',gap:'12px'}}>
                {[...prestActivos].sort((a,b)=>{
                  const pa=pagoDe('deuda',a.id)?1:0,pb=pagoDe('deuda',b.id)?1:0
                  return pa-pb||(a.dia_pago||99)-(b.dia_pago||99)
                }).map(p=>{
                  const tipo=p.tipo||'Préstamo'
                  const orig=parseFloat(p.monto_original||0),saldo=parseFloat(p.saldo_actual||0)
                  const pct=orig>0?Math.min((orig-saldo)/orig*100,100):0
                  const pagoEsteMes=pagoDe('deuda',p.id),vencida=cuotaVencida(p),meses=mesesRestantes(p)
                  const hist=pagos.filter(x=>x.origen==='deuda'&&x.ref_id===p.id).sort((a,b)=>b.mes.localeCompare(a.mes)||String(b.fecha_pago).localeCompare(String(a.fecha_pago)))
                  const histAbierto=histDeuda===p.id
                  const mono={fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}
                  const borde=vencida?'rgba(255,59,48,0.45)':pagoEsteMes?'rgba(52,199,89,0.35)':'var(--border-card)'
                  return(
                    <div key={p.id} style={{background:'var(--card-bg)',borderRadius:'16px',border:`1px solid ${borde}`,padding:'16px 18px',display:'flex',flexDirection:'column',gap:'14px'}}>
                      {/* Encabezado */}
                      <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                        <Ring pct={pct} size={58} stroke={6} color={pct>=75?'var(--green)':TIPO_COLOR[tipo]==='var(--text-muted)'?'var(--accent-bright)':TIPO_COLOR[tipo]}>
                          <span style={{fontSize:'13px',fontWeight:'800',color:'var(--text-1)'}}>{pct.toFixed(0)}%</span>
                        </Ring>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'14.5px',fontWeight:'700',color:'var(--text-1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={p.nombre}>{p.nombre}</div>
                          <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'4px',flexWrap:'wrap'}}>
                            <span style={{fontSize:'10.5px',fontWeight:'700',color:TIPO_COLOR[tipo],background:'var(--inner-bg)',padding:'2px 7px',borderRadius:'6px'}}>{tipo}</span>
                            <span style={{fontSize:'11px',color:vencida?'var(--red)':'var(--text-muted)',fontWeight:vencida?'700':'500',...mono}}>{p.dia_pago?`día ${p.dia_pago}`:'sin día'}</span>
                            {vencida&&<span style={{fontSize:'10px',fontWeight:'700',color:'var(--red)',background:'rgba(255,59,48,0.12)',padding:'1px 7px',borderRadius:'5px'}}>Vencida</span>}
                          </div>
                        </div>
                      </div>

                      {/* Saldo */}
                      <div>
                        <div style={{fontSize:'10.5px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Saldo</div>
                        <div style={{display:'flex',alignItems:'baseline',gap:'8px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'24px',fontWeight:'800',letterSpacing:'-0.02em',color:'var(--text-1)',...mono}}>{q(saldo)}</span>
                          <span style={{fontSize:'11.5px',color:'var(--text-muted)',...mono}}>de {q(orig)}</span>
                        </div>
                      </div>

                      {/* Mini datos */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',padding:'10px 12px',borderRadius:'10px',background:'var(--inner-bg)'}}>
                        {[['Cuota',q(p.cuota_mensual),'#ff9500'],['Meses',meses!=null?`≈ ${meses}`:'—','var(--text-1)'],['Pagado',q(orig-saldo),'var(--green)']].map(([l,v,c])=>(
                          <div key={l} style={{minWidth:0}}>
                            <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{l}</div>
                            <div style={{fontSize:'12.5px',fontWeight:'700',color:c,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',...mono}}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Acciones */}
                      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                        {pagoEsteMes
                          ?<button onClick={()=>askDeshacer(p,pagoEsteMes)} title="Clic para deshacer el pago" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',fontSize:'12.5px',fontWeight:'700',color:'var(--green)',background:'rgba(52,199,89,0.12)',border:'none',cursor:'pointer',padding:'9px',borderRadius:'10px'}}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Pagado en {MESES[parseInt(mes.slice(5))-1].toLowerCase()}
                          </button>
                          :<button onClick={()=>abrirPagoDesdeDeuda(p)} style={{flex:1,background:'var(--green)',border:'none',color:'#fff',cursor:'pointer',padding:'9px',borderRadius:'10px',fontSize:'12.5px',fontWeight:'700',boxShadow:'0 4px 14px -6px var(--green-glow)'}}>Pagar {q(p.cuota_mensual)}</button>}
                        {hist.length>0&&(
                          <button onClick={()=>setHistDeuda(histAbierto?null:p.id)} title="Historial de pagos" style={{...bEdit,padding:'8px 9px',color:histAbierto?'var(--accent-bright)':'var(--text-2)'}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                          </button>
                        )}
                        <button onClick={()=>{setFPrest({nombre:p.nombre,tipo,monto_original:String(p.monto_original),saldo_actual:String(p.saldo_actual),cuota_mensual:String(p.cuota_mensual),meses_restantes:p.meses_restantes!=null?String(p.meses_restantes):'',dia_pago:p.dia_pago!=null?String(p.dia_pago):''});setModalPrest(p)}} style={{...bEdit,padding:'8px 9px'}}><IcoEdit/></button>
                        <button onClick={()=>askDel(`"${p.nombre}" se eliminará.`,()=>del('budget_prestamos',p.id,setPrestamos))} style={{...bDel,padding:'8px 9px'}}><IcoDel/></button>
                      </div>

                      {/* Historial */}
                      {histAbierto&&(
                        <div style={{background:'var(--inner-bg)',borderRadius:'10px',padding:'10px 12px',marginTop:'-4px'}}>
                          <div style={{fontSize:'10.5px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>Historial de pagos</div>
                          {hist.map(h=>(
                            <div key={h.id} style={{display:'flex',justifyContent:'space-between',gap:'10px',padding:'6px 0',borderTop:'1px solid var(--border)',fontSize:'11.5px',...mono}}>
                              <span style={{color:'var(--text-2)'}}>{fmtMes(h.mes)}<span style={{color:'var(--text-muted)'}}>{' · '}{new Date(h.fecha_pago+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}</span></span>
                              <span><span style={{color:'var(--text-1)',fontWeight:'600'}}>{q(h.monto)}</span>{parseFloat(h.saldo_aplicado||0)>0&&<span style={{color:'var(--green)',marginLeft:'8px'}}>−{q(h.saldo_aplicado)}</span>}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            }
          </div>

          <div style={card}>
            <SubHead label="Compromisos" total={totalComp} onAdd={()=>{setFComp({persona:'',descripcion:'',monto:'',fecha_aprox:'',notas:''});setModalComp({})}}/>
            <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'14px',marginTop:'-8px'}}>Deudas a amigos o familiares — sin cuota fija</div>
            {compActivos.length===0
              ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'16px 0'}}>Sin compromisos pendientes</p>
              :compActivos.map(c=>{
                const prox=isPróximo(c.fecha_aprox),venc=isVencido(c.fecha_aprox)
                const alertColor=venc?'var(--red)':prox?'var(--yellow)':null
                return(
                  <div key={c.id} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                    <button onClick={()=>togglePagado(c)} style={{background:'none',border:'2px solid var(--border)',borderRadius:'50%',width:'20px',height:'20px',flexShrink:0,cursor:'pointer',marginTop:'2px'}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'7px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'13.5px',fontWeight:'600',color:'var(--text-1)'}}>{c.persona}</span>
                        {alertColor&&<span style={{fontSize:'10px',fontWeight:'700',color:alertColor,background:venc?'rgba(255,59,48,0.1)':'rgba(255,149,0,0.12)',padding:'1px 7px',borderRadius:'5px'}}>{venc?'Vencido':'Próximo'}</span>}
                      </div>
                      <div style={{fontSize:'12px',color:'var(--text-2)',marginTop:'2px'}}>{c.descripcion}</div>
                      {c.fecha_aprox&&<div style={{fontSize:'11px',color:alertColor||'var(--text-muted)',marginTop:'2px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Aprox. {new Date(c.fecha_aprox+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'long',year:'numeric'})}</div>}
                      {c.notas&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px',fontStyle:'italic'}}>{c.notas}</div>}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(c.monto)}</div>
                      <div style={{display:'flex',gap:'4px',marginTop:'6px',justifyContent:'flex-end'}}>
                        <button onClick={()=>{setFComp({persona:c.persona,descripcion:c.descripcion,monto:String(c.monto),fecha_aprox:c.fecha_aprox||'',notas:c.notas||''});setModalComp(c)}} style={bEdit}><IcoEdit/></button>
                        <button onClick={()=>askDel(`Compromiso con "${c.persona}" se eliminará.`,()=>del('budget_compromisos',c.id,setCompromisos))} style={bDel}><IcoDel/></button>
                      </div>
                    </div>
                  </div>
                )
              })
            }
            {compPagados.length>0&&(
              <div style={{marginTop:'12px'}}>
                <button onClick={()=>setVerPagados(v=>!v)} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer',padding:'4px 0',display:'flex',alignItems:'center',gap:'5px'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">{verPagados?<polyline points="18 15 12 9 6 15"/>:<polyline points="6 9 12 15 18 9"/>}</svg>
                  {verPagados?'Ocultar':`Ver ${compPagados.length} pagado${compPagados.length>1?'s':''}`}
                </button>
                {verPagados&&compPagados.map(c=>(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid var(--border)',opacity:0.5}}>
                    <button onClick={()=>togglePagado(c)} style={{background:'var(--green)',border:'none',borderRadius:'50%',width:'20px',height:'20px',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)',textDecoration:'line-through'}}>{c.persona}</div><div style={{fontSize:'11px',color:'var(--text-muted)'}}>{c.descripcion}</div></div>
                    <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-muted)',textDecoration:'line-through',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(c.monto)}</div>
                    <button onClick={()=>askDel(`Compromiso con "${c.persona}" se eliminará.`,()=>del('budget_compromisos',c.id,setCompromisos))} style={bDel}><IcoDel/></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {prestPagados.length>0&&(
            <div style={card}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                <span style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--text-2)'}}>Deudas pagadas</span>
                <span style={{fontSize:'10px',fontWeight:'700',color:'var(--green)',background:'var(--green-glow)',padding:'1px 7px',borderRadius:'5px'}}>{prestPagados.length}</span>
              </div>
              <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'14px'}}>Saldo en 0 — ya no cuentan en cuotas ni en el calendario</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                  <thead><tr style={{color:'var(--text-muted)',fontSize:'11px'}}>
                    {['Nombre','Tipo','Original','Cuota',''].map(h=>(
                      <th key={h} style={{padding:'4px 8px 10px',fontWeight:'500',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {prestPagados.map(p=>{
                      const tipo=p.tipo||'Préstamo'
                      const pagoEsteMes=pagoDe('deuda',p.id)
                      return(
                        <tr key={p.id} style={{borderTop:'1px solid var(--border)'}}>
                          <td style={{padding:'10px 8px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <span style={{background:'var(--green)',borderRadius:'50%',width:'16px',height:'16px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </span>
                              <span style={{fontWeight:'500',color:'var(--text-2)'}}>{p.nombre}</span>
                            </div>
                          </td>
                          <td style={{padding:'10px 8px',whiteSpace:'nowrap'}}>
                            <span style={{fontSize:'11px',fontWeight:'600',color:TIPO_COLOR[tipo],background:'var(--inner-bg)',padding:'2px 7px',borderRadius:'6px',opacity:0.7}}>{tipo}</span>
                          </td>
                          <td style={{padding:'10px 8px',color:'var(--text-muted)',whiteSpace:'nowrap',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(p.monto_original)}</td>
                          <td style={{padding:'10px 8px',color:'var(--text-muted)',whiteSpace:'nowrap',textDecoration:'line-through',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(p.cuota_mensual)}</td>
                          <td style={{padding:'10px 0 10px 4px'}}>
                            <div style={{display:'flex',gap:'4px',justifyContent:'flex-end'}}>
                              {pagoEsteMes&&(
                                <button onClick={()=>askDeshacer(p,pagoEsteMes)} title={`Saldada con el pago de ${fmtMes(mes)} — clic para deshacer`} style={{fontSize:'11px',fontWeight:'600',color:'var(--text-2)',background:'var(--inner-bg)',border:'none',cursor:'pointer',padding:'5px 8px',borderRadius:'7px',whiteSpace:'nowrap'}}>Deshacer pago</button>
                              )}
                              <button onClick={()=>{setFPrest({nombre:p.nombre,tipo,monto_original:String(p.monto_original),saldo_actual:String(p.saldo_actual),cuota_mensual:String(p.cuota_mensual),meses_restantes:p.meses_restantes!=null?String(p.meses_restantes):'',dia_pago:p.dia_pago!=null?String(p.dia_pago):''});setModalPrest(p)}} style={bEdit}><IcoEdit/></button>
                              <button onClick={()=>askDel(`"${p.nombre}" se eliminará.`,()=>del('budget_prestamos',p.id,setPrestamos))} style={bDel}><IcoDel/></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: GASTOS ══ */}
      {tab==='gastos'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
          {(()=>{
            const ant=gastosVar.filter(g=>g.mes===mesAnterior).reduce((s,g)=>s+parseFloat(g.monto||0),0)
            const pctIng=totalIngresos>0?(totalFijos+totalVariables)/totalIngresos*100:null
            return heroTotal({label:'Gastos',value:totalFijos+totalVariables,color:'var(--red)',glow:'var(--accent-glow)',
              sub:pctIng!=null?`${pctIng.toFixed(0)}% de tus ingresos del mes`:null,
              stats:[['Variables',q(totalVariables),'var(--text-1)',vsAnterior(totalVariables,ant)],['Fijos',q(totalFijos),'var(--text-1)',`${gastosFijos.filter(g=>g.activo).length} activos`],['Movimientos',varMes.length,'var(--text-2)']]})
          })()}

          {/* Límites del mes por categoría */}
          {(()=>{
            const conLim=catsLimite.filter(c=>limiteDe(c)!=null)
            const sinLim=catsLimite.filter(c=>limiteDe(c)==null)
            const totLim=conLim.reduce((s,c)=>s+limiteDe(c),0)
            const totGas=conLim.reduce((s,c)=>s+gastadoCat(c),0)
            const mono={fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}
            return(
              <div style={card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:conLim.length?'18px':'8px',gap:'10px'}}>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Límites del mes</div>
                    {conLim.length>0&&<div style={{fontSize:'13px',color:'var(--text-2)',marginTop:'4px',...mono}}>
                      <span style={{fontWeight:'700',color:colorLimite(totLim>0?totGas/totLim*100:0)}}>{q(totGas)}</span>
                      <span style={{color:'var(--text-muted)'}}> de {q(totLim)}</span>
                    </div>}
                  </div>
                  <button onClick={abrirLimites} style={{background:'var(--accent-soft)',color:'var(--accent-bright)',border:'none',borderRadius:'8px',padding:'5px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer',whiteSpace:'nowrap'}}>{conLim.length?'Editar límites':'+ Definir límites'}</button>
                </div>
                {conLim.length===0
                  ?<p style={{fontSize:'12.5px',color:'var(--text-muted)',margin:0,lineHeight:1.5}}>Pon un tope mensual a cada categoría (Alimentación, Transporte…) y aquí verás cuánto llevas gastado y cuánto te queda.</p>
                  :<div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'16px 24px'}}>
                    {conLim.map(cat=>{
                      const lim=limiteDe(cat),gas=gastadoCat(cat),pct=lim>0?gas/lim*100:0,col=colorLimite(pct),resta=lim-gas
                      return(
                        <div key={cat}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'6px',gap:'8px'}}>
                            <span style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)'}}>{cat}</span>
                            <span style={{fontSize:'12px',...mono}}><span style={{fontWeight:'700',color:col}}>{q(gas)}</span><span style={{color:'var(--text-muted)'}}> / {q(lim)}</span></span>
                          </div>
                          <div style={{height:'7px',background:'var(--inner-bg)',borderRadius:'4px',overflow:'hidden'}}>
                            <div style={{height:'7px',width:`${Math.min(pct,100)}%`,background:col,borderRadius:'4px',transition:'width 0.3s'}}/>
                          </div>
                          <div style={{fontSize:'11px',marginTop:'5px',color:resta<0?'var(--red)':'var(--text-muted)',fontWeight:resta<0?'600':'400',...mono}}>
                            {resta<0?`Te pasaste por ${q(-resta)}`:`Te quedan ${q(resta)}`} · {pct.toFixed(0)}%
                          </div>
                        </div>
                      )
                    })}
                  </div>
                }
                {conLim.length>0&&sinLim.some(c=>gastadoCat(c)>0)&&(
                  <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'16px',paddingTop:'12px',borderTop:'1px solid var(--border)',...mono}}>
                    Sin límite: {sinLim.filter(c=>gastadoCat(c)>0).map(c=>`${c} ${q(gastadoCat(c))}`).join(' · ')}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Calendario grande Gastos Variables */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Gastos Variables</div>
                <div style={{fontSize:'20px',fontWeight:'800',letterSpacing:'-0.02em',color:'var(--text-1)',marginTop:'4px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{fmtMes(mes)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'2px'}}>Total del mes</div>
                <div style={{fontSize:'16px',fontWeight:'800',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(totalVariables)}</div>
              </div>
            </div>

            <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
              <div style={{minWidth:'560px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr) 80px',gap:'4px',marginBottom:'6px'}}>
                  {DIAS_SEMANA.map(d=>(
                    <div key={d} style={{textAlign:'center',fontSize:'11px',fontWeight:'600',color:'var(--text-muted)',padding:'4px 0'}}>{d}</div>
                  ))}
                  <div style={{textAlign:'center',fontSize:'11px',fontWeight:'600',color:'var(--text-muted)',padding:'4px 0'}}>Semana</div>
                </div>

                {(()=>{
                  const weeks=[]
                  for(let i=0;i<calCells.length;i+=7) weeks.push(calCells.slice(i,i+7))
                  return weeks.map((week,wi)=>{
                    const weekDays=week.filter(Boolean)
                    const weekTotal=weekDays.reduce((s,day)=>{
                      const ds=`${mes}-${String(day).padStart(2,'0')}`
                      return s+(gastosByDate[ds]||[]).reduce((ss,g)=>ss+parseFloat(g.monto||0),0)
                           +(fixosByDate[ds]||[]).reduce((ss,g)=>ss+parseFloat(g.monto||0),0)
                    },0)
                    return(
                      <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr) 80px',gap:'4px',marginBottom:'4px'}}>
                        {week.map((day,di)=>{
                          if(!day) return <div key={`ve-${wi}-${di}`} style={{minHeight:'72px',borderRadius:'10px',background:'var(--inner-bg)',opacity:0.2}}/>
                          const dateStr=`${mes}-${String(day).padStart(2,'0')}`
                          const dayVar=gastosByDate[dateStr]||[]
                          const dayFij=fixosByDate[dateStr]||[]
                          const dayT=dayVar.reduce((s,g)=>s+parseFloat(g.monto||0),0)+dayFij.reduce((s,g)=>s+parseFloat(g.monto||0),0)
                          const isToday=dateStr===today
                          const isSel=dateStr===selectedDay
                          const hasAny=dayVar.length>0||dayFij.length>0
                          const filled=dayT>0
                          return(
                            <button key={dateStr} onClick={()=>setSelectedDay(isSel?null:dateStr)} style={{
                              minHeight:'72px',borderRadius:'10px',padding:'8px 8px 6px',cursor:'pointer',
                              border:filled&&isSel?'2px solid #fff':isSel?'2px solid var(--accent-bright)':isToday?'1px solid var(--accent-bright)':'1px solid var(--border)',
                              background:filled?'var(--red)':(isSel?'var(--accent-soft)':isToday?'rgba(88,86,214,0.06)':'transparent'),
                              display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'4px',
                              transition:'all 0.12s',textAlign:'left',
                            }}>
                              <span style={{fontSize:'13px',fontWeight:isToday||filled?'700':'500',color:filled?'#fff':isToday?'var(--accent-bright)':isSel?'var(--accent-bright)':'var(--text-1)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textShadow:filled?'0 1px 2px rgba(0,0,0,0.3)':'none'}}>{day}</span>
                              {dayT>0&&<span style={{fontSize:'11px',fontWeight:'700',color:filled?'#fff':'#ff9500',lineHeight:1,fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',textShadow:filled?'0 1px 2px rgba(0,0,0,0.3)':'none'}}>{q(dayT)}</span>}
                              {hasAny&&(
                                <div style={{display:'flex',gap:'3px',marginTop:'auto',flexWrap:'wrap'}}>
                                  {dayFij.map((_,i)=><div key={`f${i}`} style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--accent)',border:filled?'1px solid rgba(255,255,255,0.6)':'none'}}/>)}
                                  {dayVar.slice(0,3).map((_,i)=><div key={`v${i}`} style={{width:'5px',height:'5px',borderRadius:'50%',background:'#ff9500',border:filled?'1px solid rgba(255,255,255,0.6)':'none'}}/>)}
                                  {dayVar.length>3&&<span style={{fontSize:'8px',color:filled?'rgba(255,255,255,0.85)':'var(--text-muted)'}}>+{dayVar.length-3}</span>}
                                </div>
                              )}
                            </button>
                          )
                        })}
                        <div style={{
                          minHeight:'72px',borderRadius:'10px',padding:'8px 6px',
                          background:'var(--inner-bg)',border:'1px solid var(--border)',
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',
                        }}>
                          <div style={{fontSize:'9px',fontWeight:'600',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Total</div>
                          <div style={{fontSize:'13px',fontWeight:'800',color:weekTotal>0?'#ff9500':'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{weekTotal>0?q(weekTotal):'—'}</div>
                          {weekDays.length>0&&<div style={{fontSize:'9px',color:'var(--text-muted)',textAlign:'center',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{weekDays[0]}–{weekDays[weekDays.length-1]}</div>}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Panel día seleccionado */}
            {selectedDay&&(()=>{
              const selFijos=fixosByDate[selectedDay]||[]
              const totalDia=(selectedDayGastos.reduce((s,g)=>s+parseFloat(g.monto||0),0))+(selFijos.reduce((s,g)=>s+parseFloat(g.monto||0),0))
              return(
                <div style={{marginTop:'14px',padding:'16px',background:'var(--inner-bg)',borderRadius:'12px',border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{(()=>{const[,,d]=selectedDay.split('-');return`${parseInt(d)} de ${fmtMes(mes)}`})()}</div>
                      {totalDia>0&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Total: {q(totalDia)}</div>}
                    </div>
                    <button onClick={()=>openAddVar(selectedDay)} style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:'8px',padding:'6px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 14px -4px var(--accent-glow)'}}>+ Variable</button>
                  </div>

                  {selFijos.length>0&&(
                    <>
                      <div style={{fontSize:'10px',fontWeight:'700',color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>Fijos</div>
                      {selFijos.map(g=>(
                        <div key={g.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'var(--accent)',flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{g.nombre}</div>
                            <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}</div>
                          </div>
                          <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(g.monto)}</div>
                        </div>
                      ))}
                    </>
                  )}

                  {selectedDayGastos.length>0&&(
                    <div style={{fontSize:'10px',fontWeight:'700',color:'#ff9500',textTransform:'uppercase',letterSpacing:'0.06em',margin:'10px 0 6px'}}>Variables</div>
                  )}
                  {selectedDayGastos.length===0&&selFijos.length===0&&(
                    <p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'12px 0'}}>Sin gastos este día — haz clic en "+ Variable"</p>
                  )}
                  {selectedDayGastos.map(g=>(
                    <div key={g.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                      <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#ff9500',flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{g.nombre}</div>
                        <div style={{display:'flex',gap:'6px',marginTop:'3px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}</span>
                          <TarjetaChip g={g}/>
                          {g.fecha_pago&&<span style={{fontSize:'10px',color:'var(--yellow)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Pago: {new Date(g.fecha_pago+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}</span>}
                        </div>
                      </div>
                      <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(g.monto)}</div>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button onClick={()=>{setFVar({nombre:g.nombre,categoria:g.categoria,monto:String(g.monto),fecha:g.fecha||selectedDay,medio_pago:g.medio_pago||'Efectivo',tarjeta:g.tarjeta||'',fecha_pago:g.fecha_pago||''});setModalVar(g)}} style={bEdit}><IcoEdit/></button>
                        <button onClick={()=>askDel(`"${g.nombre}" se eliminará.`,()=>del('budget_gastos_variables',g.id,setGastosVar))} style={bDel}><IcoDel/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Sin fecha */}
            {varSinFecha.length>0&&(
              <div style={{marginTop:'14px',padding:'12px 14px',background:'rgba(255,149,0,0.06)',borderRadius:'10px',border:'1px solid rgba(255,149,0,0.2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#ff9500',textTransform:'uppercase',letterSpacing:'0.05em',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Sin fecha — {varSinFecha.length} gasto{varSinFecha.length>1?'s':''} · {q(varSinFecha.reduce((s,g)=>s+parseFloat(g.monto||0),0))}</div>
                  <span style={{fontSize:'10px',color:'var(--text-muted)'}}>Edítalos para asignar fecha</span>
                </div>
                {varSinFecha.map(g=>(
                  <div key={g.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{g.nombre}</div>
                      <div style={{display:'flex',gap:'6px',marginTop:'3px'}}><span style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}</span><TarjetaChip g={g}/></div>
                    </div>
                    <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(g.monto)}</div>
                    <div style={{display:'flex',gap:'4px'}}>
                      <button onClick={()=>{setFVar({nombre:g.nombre,categoria:g.categoria,monto:String(g.monto),fecha:g.fecha||today,medio_pago:g.medio_pago||'Efectivo',tarjeta:g.tarjeta||'',fecha_pago:g.fecha_pago||''});setModalVar(g)}} style={bEdit}><IcoEdit/></button>
                      <button onClick={()=>askDel(`"${g.nombre}" se eliminará.`,()=>del('budget_gastos_variables',g.id,setGastosVar))} style={bDel}><IcoDel/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'16px',paddingTop:'14px',borderTop:'1px solid var(--border)',flexWrap:'wrap',gap:'8px'}}>
              <div style={{display:'flex',gap:'14px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'var(--accent)'}}/>
                  <span style={{fontSize:'10px',color:'var(--text-muted)'}}>Gasto fijo</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#ff9500'}}/>
                  <span style={{fontSize:'10px',color:'var(--text-muted)'}}>Gasto variable</span>
                </div>
              </div>
              <div style={{fontSize:'12px',fontWeight:'800',color:'var(--text-1)',letterSpacing:'0.03em'}}>
                MES TOTAL <span style={{color:'#ff9500',marginLeft:'6px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(totalFijos+totalVariables)}</span>
              </div>
            </div>
          </div>

          {/* Gastos Fijos */}
          <div style={card}>
            <SubHead label="Gastos Fijos" total={totalFijos} onAdd={()=>{setFFij({nombre:'',categoria:'Vivienda',monto:'',activo:true,dia_pago:''});setModalFij({})}}/>
            <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'12px',marginTop:'-8px'}}>Se aplican todos los meses. El "día de pago" aparece en el calendario de Resumen.</div>
            {gastosFijos.length===0
              ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'16px 0'}}>Sin gastos fijos</p>
              :gastosFijos.map(g=>(
                <div key={g.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 0',borderBottom:'1px solid var(--border)',opacity:g.activo?1:0.45}}>
                  <button onClick={()=>toggleFijo(g)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',flexShrink:0,color:g.activo?'var(--green)':'var(--text-muted)'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      {g.activo?<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>:<circle cx="12" cy="12" r="10"/>}
                    </svg>
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13.5px',fontWeight:'500',color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.nombre}</div>
                    <div style={{display:'flex',gap:'6px',marginTop:'2px'}}>
                      <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}</span>
                      {g.dia_pago&&<span style={{fontSize:'10px',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>día {g.dia_pago}</span>}
                    </div>
                  </div>
                  <div style={{fontSize:'13.5px',fontWeight:'600',color:'var(--accent)',whiteSpace:'nowrap',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(g.monto)}</div>
                  <div style={{display:'flex',gap:'3px'}}>
                    <button onClick={()=>{setFFij({nombre:g.nombre,categoria:g.categoria,monto:String(g.monto),activo:g.activo,dia_pago:g.dia_pago!=null?String(g.dia_pago):''});setModalFij(g)}} style={bEdit}><IcoEdit/></button>
                    <button onClick={()=>askDel(`"${g.nombre}" se eliminará.`,()=>del('budget_gastos_fijos',g.id,setGastosFijos))} style={bDel}><IcoDel/></button>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Lista gastos variables del mes */}
          <div style={card}>
            <SubHead label="Gastos Variables del mes" total={totalVariables} onAdd={()=>openAddVar(today.startsWith(mes)?today:`${mes}-01`)}/>
            {varMes.length===0
              ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Sin gastos variables registrados</p>
              :[...varMes].sort((a,b)=>{
                  const fa=normFecha(a.fecha)||'9999'
                  const fb=normFecha(b.fecha)||'9999'
                  return fa.localeCompare(fb)
                }).map(g=>(
                <div key={g.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{g.nombre}</div>
                    <div style={{display:'flex',gap:'6px',marginTop:'3px',flexWrap:'wrap',alignItems:'center'}}>
                      {g.fecha&&<span style={{fontSize:'10px',color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{new Date(g.fecha+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}</span>}
                      <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}</span>
                      <TarjetaChip g={g}/>
                    </div>
                  </div>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)',whiteSpace:'nowrap',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(g.monto)}</div>
                  <div style={{display:'flex',gap:'4px'}}>
                    <button onClick={()=>{setFVar({nombre:g.nombre,categoria:g.categoria,monto:String(g.monto),fecha:g.fecha||today,medio_pago:g.medio_pago||'Efectivo',tarjeta:g.tarjeta||'',fecha_pago:g.fecha_pago||''});setModalVar(g)}} style={bEdit}><IcoEdit/></button>
                    <button onClick={()=>askDel(`"${g.nombre}" se eliminará.`,()=>del('budget_gastos_variables',g.id,setGastosVar))} style={bDel}><IcoDel/></button>
                  </div>
                </div>
              ))
            }
            {varMes.length>0&&<div style={{display:'flex',justifyContent:'flex-end',paddingTop:'14px'}}><span style={{fontSize:'14px',fontWeight:'700',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Total: {q(totalVariables)}</span></div>}
          </div>

          {/* Análisis por categoría */}
          {(()=>{
            const cats={}
            varMes.forEach(g=>{const c=g.categoria||'Otro';cats[c]=(cats[c]||0)+parseFloat(g.monto||0)})
            const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1])
            const total=sorted.reduce((s,[,v])=>s+v,0)
            const CAT_COLORS={'Alimentación':'#f87171','Transporte':'#fb923c','Salud':'#34d399','Entretenimiento':'var(--accent)','Ropa':'#f472b6','Otro':'var(--text-muted)'}
            if(sorted.length===0) return null
            return(
              <div style={card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text-1)'}}>Análisis por categoría</div>
                  <div style={{fontSize:'11px',color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{fmtMes(mes)} · {varMes.length} transacción{varMes.length!==1?'es':''}</div>
                </div>
                {sorted.map(([cat,amt])=>{
                  const pct=(amt/total)*100
                  const color=CAT_COLORS[cat]||'var(--accent)'
                  const count=varMes.filter(g=>(g.categoria||'Otro')===cat).length
                  return(
                    <div key={cat} style={{marginBottom:'14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:color,flexShrink:0}}/>
                          <span style={{fontSize:'13px',color:'var(--text-1)',fontWeight:'500'}}>{cat}</span>
                          <span style={{fontSize:'10px',color:'var(--text-muted)',background:'var(--inner-bg)',padding:'1px 6px',borderRadius:'5px'}}>{count} tx</span>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <span style={{fontSize:'13px',fontWeight:'700',color,fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(amt)}</span>
                          <span style={{fontSize:'10px',color:'var(--text-muted)',marginLeft:'6px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div style={{height:'6px',background:'var(--inner-bg)',borderRadius:'3px'}}>
                        <div style={{height:'6px',background:color,borderRadius:'3px',width:`${pct}%`,transition:'width 0.3s'}}/>
                      </div>
                    </div>
                  )
                })}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'12px',borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:'12px',color:'var(--text-muted)'}}>Total variables</span>
                  <span style={{fontSize:'14px',fontWeight:'800',color:'var(--accent)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(total)}</span>
                </div>
              </div>
            )
          })()}

        </div>
      )}

      {/* ══ TAB: AHORROS ══ */}
      {tab==='ahorros'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
        {(()=>{
          const acumulado=ahorros.reduce((s,a)=>s+parseFloat(a.aportado_mes||0),0)
          const pctIng=totalIngresos>0?totalAhorros/totalIngresos*100:null
          return heroTotal({label:'Ahorrado',value:totalAhorros,color:'var(--accent-bright)',glow:'var(--accent-glow)',
            sub:pctIng!=null?`${pctIng.toFixed(0)}% de tus ingresos del mes`:null,
            stats:[['Acumulado total',q(acumulado),'var(--green)'],['Metas',new Set(ahorros.map(a=>a.nombre)).size,'var(--text-2)']]})
        })()}
        <div style={card}>
          <SubHead label="Ahorros" total={totalAhorros} onAdd={()=>{setFAho({nombre:'',meta_total:'',aportado_mes:''});setModalAho({})}}/>
          {btnCopiar('ahorros')}
          {ahoMes.length===0
            ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Sin aportes de ahorro este mes</p>
            :ahoMes.map(a=>{
              const ahoTotal=ahorros.filter(x=>x.nombre===a.nombre).reduce((s,x)=>s+parseFloat(x.aportado_mes||0),0)
              const pct=a.meta_total>0?Math.min((ahoTotal/a.meta_total)*100,100):0
              return(
                <div key={a.id} style={{padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    {a.meta_total>0&&(
                      <Ring pct={pct} size={44} stroke={5} color={pct>=100?'var(--green)':'var(--accent-bright)'}>
                        <span style={{fontSize:'10.5px',fontWeight:'800',color:'var(--text-1)'}}>{pct.toFixed(0)}%</span>
                      </Ring>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13.5px',fontWeight:'500',color:'var(--text-1)'}}>{a.nombre}</div>
                      {a.meta_total>0&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>Meta: {q(a.meta_total)} · Acumulado: {q(ahoTotal)} · {pct.toFixed(0)}%</div>}
                    </div>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'var(--green)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(a.aportado_mes)}</div>
                    <div style={{display:'flex',gap:'4px'}}>
                      <button onClick={()=>{setFAho({nombre:a.nombre,meta_total:String(a.meta_total),aportado_mes:String(a.aportado_mes)});setModalAho(a)}} style={bEdit}><IcoEdit/></button>
                      <button onClick={()=>askDel(`"${a.nombre}" se eliminará.`,()=>del('budget_ahorros',a.id,setAhorros))} style={bDel}><IcoDel/></button>
                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>
        </div>
      )}

      {/* ══ MODALES ══ */}
      {modalIng&&(
        <Modal title={modalIng.id?'Editar ingreso':'Nuevo ingreso'} onClose={()=>setModalIng(null)}>
          <form onSubmit={saveIngreso}>
            <FormField label="Fuente / Nombre *"><input required style={inp} value={fIng.nombre} onChange={e=>setFIng(p=>({...p,nombre:e.target.value}))} placeholder="ej. Salario, Freelance..."/></FormField>
            <FormField label="Tipo">
              <select style={inp} value={fIng.tipo} onChange={e=>setFIng(p=>({...p,tipo:e.target.value,dia:'',fecha:''}))}>
                <option value="fijo">Fijo</option>
                <option value="variable">Variable</option>
              </select>
            </FormField>
            <FormField label="Monto *"><input required type="number" step="0.01" min="0" style={inp} value={fIng.monto} onChange={e=>setFIng(p=>({...p,monto:e.target.value}))} placeholder="0.00"/></FormField>
            {fIng.tipo==='fijo'?(
              <FormField label="Día de cobro (opcional)">
                <select style={inp} value={fIng.dia} onChange={e=>setFIng(p=>({...p,dia:e.target.value}))}>
                  <option value="">Sin día específico</option>
                  {DIAS_MES.map(d=><option key={d} value={d}>Día {d}</option>)}
                </select>
              </FormField>
            ):(
              <FormField label="Fecha de ingreso (opcional)">
                <input type="date" style={inp} value={fIng.fecha} onChange={e=>setFIng(p=>({...p,fecha:e.target.value}))}/>
              </FormField>
            )}
            <ModalBtns onClose={()=>setModalIng(null)}/>
          </form>
        </Modal>
      )}

      {modalFij&&(
        <Modal title={modalFij.id?'Editar gasto fijo':'Nuevo gasto fijo'} onClose={()=>setModalFij(null)}>
          <form onSubmit={saveFijo}>
            <FormField label="Nombre *"><input required style={inp} value={fFij.nombre} onChange={e=>setFFij(p=>({...p,nombre:e.target.value}))} placeholder="ej. Renta, Internet..."/></FormField>
            <FormField label="Categoría"><select style={inp} value={fFij.categoria} onChange={e=>setFFij(p=>({...p,categoria:e.target.value}))}>{CATS_FIJOS.map(c=><option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="Monto mensual *"><input required type="number" step="0.01" min="0" style={inp} value={fFij.monto} onChange={e=>setFFij(p=>({...p,monto:e.target.value}))} placeholder="0.00"/></FormField>
            <FormField label="Día de pago (opcional)">
              <select style={inp} value={fFij.dia_pago} onChange={e=>setFFij(p=>({...p,dia_pago:e.target.value}))}>
                <option value="">Sin día específico</option>
                {DIAS_MES.map(d=><option key={d} value={d}>Día {d}</option>)}
              </select>
            </FormField>
            <ModalBtns onClose={()=>setModalFij(null)}/>
          </form>
        </Modal>
      )}

      {modalVar&&(
        <Modal title={modalVar.id?'Editar gasto variable':'Nuevo gasto variable'} onClose={()=>setModalVar(null)}>
          <form onSubmit={saveVar}>
            {/* Monto grande primero */}
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px',marginBottom:'14px',borderRadius:'12px',background:'var(--inner-bg)',border:'1px solid var(--border)'}}>
              <span style={{fontSize:'22px',fontWeight:'700',color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>Q</span>
              <input required autoFocus type="number" inputMode="decimal" step="0.01" min="0" value={fVar.monto} onChange={e=>setFVar(p=>({...p,monto:e.target.value}))} placeholder="0.00"
                style={{flex:1,minWidth:0,background:'transparent',border:'none',outline:'none',color:'var(--text-1)',fontSize:'28px',fontWeight:'800',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}/>
            </div>
            {/* Descripción con sugerencias de gastos anteriores */}
            <FormField label="Descripción *">
              <div style={{position:'relative'}}>
                <input required style={inp} value={fVar.nombre} autoComplete="off"
                  onChange={e=>{const v=e.target.value;setFVar(p=>({...p,nombre:v}));setVerSug(true)}}
                  onFocus={()=>setVerSug(true)} onBlur={()=>setTimeout(()=>setVerSug(false),150)}
                  placeholder="ej. Supermercado, Gasolina..."/>
                {verSug&&(()=>{
                  const sug=sugerenciasGasto(fVar.nombre)
                  if(!sug.length) return null
                  return(
                    <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:10,background:'var(--card-bg)',border:'1px solid var(--border-card)',borderRadius:'10px',boxShadow:'0 10px 30px -8px rgba(0,0,0,0.5)',overflow:'hidden'}}>
                      {sug.map(g=>(
                        <button type="button" key={g.id} onMouseDown={e=>e.preventDefault()} onClick={()=>usarSugerencia(g)}
                          style={{display:'flex',width:'100%',justifyContent:'space-between',alignItems:'center',gap:'8px',padding:'9px 12px',background:'transparent',border:'none',borderBottom:'1px solid var(--border)',cursor:'pointer',textAlign:'left'}}>
                          <span style={{minWidth:0}}>
                            <span style={{display:'block',fontSize:'13px',color:'var(--text-1)',fontWeight:'500'}}>{g.nombre}</span>
                            <span style={{fontSize:'10.5px',color:'var(--text-muted)'}}>{g.categoria}{g.tarjeta?` · ${g.tarjeta}`:g.medio_pago==='Efectivo'||!g.medio_pago?' · Efectivo':''}</span>
                          </span>
                          <span style={{fontSize:'11px',color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>últ. {q(g.monto)}</span>
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </FormField>
            {/* Categoría como botones */}
            <FormField label="Categoría">
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {CATS_VAR.map(c=>{
                  const on=fVar.categoria===c
                  return <button type="button" key={c} onClick={()=>setFVar(p=>({...p,categoria:c}))}
                    style={{padding:'6px 12px',borderRadius:'999px',fontSize:'12px',fontWeight:'600',cursor:'pointer',border:on?'1px solid var(--accent-bright)':'1px solid var(--border)',background:on?'var(--accent-soft)':'transparent',color:on?'var(--accent-bright)':'var(--text-2)'}}>{c}</button>
                })}
              </div>
            </FormField>
            {(()=>{
              const lim=limiteDe(fVar.categoria)
              if(lim==null) return null
              const mesG=fVar.fecha?fVar.fecha.slice(0,7):mes
              // Gastado en la categoría ese mes, sin contar el gasto que se está editando
              const llevas=gastosVar.filter(g=>g.mes===mesG&&(g.categoria||'Otro')===fVar.categoria&&g.id!==modalVar?.id).reduce((s,g)=>s+parseFloat(g.monto||0),0)
              const despues=llevas+(parseFloat(fVar.monto)||0)
              const quedan=lim-despues,col=colorLimite(despues/lim*100)
              return(
                <div style={{margin:'-6px 0 14px',padding:'9px 12px',borderRadius:'9px',background:'var(--inner-bg)',fontSize:'11.5px',color:'var(--text-2)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums',borderLeft:`3px solid ${col}`}}>
                  {fVar.categoria}: llevas {q(llevas)} de {q(lim)}
                  {parseFloat(fVar.monto)>0&&<> · {quedan<0?<b style={{color:'var(--red)'}}>te pasarías por {q(-quedan)}</b>:<>te quedarían <b style={{color:col}}>{q(quedan)}</b></>}</>}
                </div>
              )
            })()}
            <FormField label="Fecha del gasto *"><input required type="date" style={inp} value={fVar.fecha} onChange={e=>setFVar(p=>({...p,fecha:e.target.value}))}/></FormField>
            <FormField label="Medio de pago">
              <select style={inp} value={fVar.medio_pago} onChange={e=>setFVar(p=>({...p,medio_pago:e.target.value,tarjeta:'',fecha_pago:''}))}>
                {MEDIOS_PAGO.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            {fVar.medio_pago!=='Efectivo'&&(
              <>
                <FormField label={`Tarjeta — ${fVar.medio_pago==='Tarjeta de Crédito'?'Crédito':'Débito'}`}>
                  <select style={inp} value={fVar.tarjeta} onChange={e=>setFVar(p=>({...p,tarjeta:e.target.value}))}>
                    <option value="">Seleccionar tarjeta...</option>
                    {(fVar.medio_pago==='Tarjeta de Crédito'?TARJETAS_CRED:TARJETAS_DEB).map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                {fVar.medio_pago==='Tarjeta de Crédito'&&(
                  <FormField label="Fecha de pago de la tarjeta (opcional)">
                    <input type="date" style={inp} value={fVar.fecha_pago} onChange={e=>setFVar(p=>({...p,fecha_pago:e.target.value}))}/>
                  </FormField>
                )}
              </>
            )}
            <ModalBtns onClose={()=>setModalVar(null)}/>
          </form>
        </Modal>
      )}

      {modalPrest&&(
        <Modal title={modalPrest.id?'Editar deuda':'Nueva deuda'} onClose={()=>setModalPrest(null)}>
          <form onSubmit={savePrest}>
            <FormField label="Nombre *"><input required style={inp} value={fPrest.nombre} onChange={e=>setFPrest(p=>({...p,nombre:e.target.value}))} placeholder="ej. Banco Industrial..."/></FormField>
            <FormField label="Tipo *"><select style={inp} value={fPrest.tipo} onChange={e=>setFPrest(p=>({...p,tipo:e.target.value}))}>{TIPOS_DEUDA.map(t=><option key={t} value={t}>{t}</option>)}</select></FormField>
            <FormField label="Monto original *"><input required type="number" step="0.01" min="0" style={inp} value={fPrest.monto_original} onChange={e=>setFPrest(p=>({...p,monto_original:e.target.value}))} placeholder="0.00"/></FormField>
            <FormField label="Saldo actual *"><input required type="number" step="0.01" min="0" style={inp} value={fPrest.saldo_actual} onChange={e=>setFPrest(p=>({...p,saldo_actual:e.target.value}))} placeholder="0.00"/></FormField>
            <FormField label="Cuota mensual *"><input required type="number" step="0.01" min="0" style={inp} value={fPrest.cuota_mensual} onChange={e=>setFPrest(p=>({...p,cuota_mensual:e.target.value}))} placeholder="0.00"/></FormField>
            <FormField label="Día de pago (opcional)">
              <select style={inp} value={fPrest.dia_pago} onChange={e=>setFPrest(p=>({...p,dia_pago:e.target.value}))}>
                <option value="">Sin día específico</option>
                {DIAS_MES.map(d=><option key={d} value={d}>Día {d}</option>)}
              </select>
            </FormField>
            <ModalBtns onClose={()=>setModalPrest(null)}/>
          </form>
        </Modal>
      )}

      {modalAho&&(
        <Modal title={modalAho.id?'Editar ahorro':'Nuevo ahorro'} onClose={()=>setModalAho(null)}>
          <form onSubmit={saveAhorro}>
            <FormField label="Nombre / Meta *"><input required style={inp} value={fAho.nombre} onChange={e=>setFAho(p=>({...p,nombre:e.target.value}))} placeholder="ej. Fondo emergencia..."/></FormField>
            <FormField label="Meta total (opcional)"><input type="number" step="0.01" min="0" style={inp} value={fAho.meta_total} onChange={e=>setFAho(p=>({...p,meta_total:e.target.value}))} placeholder="0.00"/></FormField>
            <FormField label="Aportado este mes *"><input required type="number" step="0.01" min="0" style={inp} value={fAho.aportado_mes} onChange={e=>setFAho(p=>({...p,aportado_mes:e.target.value}))} placeholder="0.00"/></FormField>
            <ModalBtns onClose={()=>setModalAho(null)}/>
          </form>
        </Modal>
      )}

      {modalComp&&(
        <Modal title={modalComp.id?'Editar compromiso':'Nuevo compromiso'} onClose={()=>setModalComp(null)}>
          <form onSubmit={saveComp}>
            <FormField label="Persona *"><input required style={inp} value={fComp.persona} onChange={e=>setFComp(p=>({...p,persona:e.target.value}))} placeholder="ej. Juan, mamá, Carlos..."/></FormField>
            <FormField label="Descripción *"><input required style={inp} value={fComp.descripcion} onChange={e=>setFComp(p=>({...p,descripcion:e.target.value}))} placeholder="ej. Préstamo para carro..."/></FormField>
            <FormField label="Monto *"><input required type="number" step="0.01" min="0" style={inp} value={fComp.monto} onChange={e=>setFComp(p=>({...p,monto:e.target.value}))} placeholder="0.00"/></FormField>
            <FormField label="Fecha aproximada (opcional)"><input type="date" style={inp} value={fComp.fecha_aprox} onChange={e=>setFComp(p=>({...p,fecha_aprox:e.target.value}))}/></FormField>
            <FormField label="Notas (opcional)"><input type="text" style={inp} value={fComp.notas} onChange={e=>setFComp(p=>({...p,notas:e.target.value}))} placeholder="ej. Me dijo que en julio..."/></FormField>
            <ModalBtns onClose={()=>setModalComp(null)}/>
          </form>
        </Modal>
      )}

      {modalCopy&&(()=>{
        const{tipo,items}=modalCopy
        const sel=items.filter(x=>x.sel)
        const total=sel.reduce((s,x)=>s+parseFloat((tipo==='ingresos'?x.monto:x.aportado_mes)||0),0)
        const toggle=(id)=>setModalCopy(m=>({...m,items:m.items.map(x=>x.id===id?{...x,sel:!x.sel}:x)}))
        return(
          <Modal title={`Copiar ${tipo==='ingresos'?'ingresos':'ahorros'} de ${fmtMes(mesAnterior)}`} onClose={()=>setModalCopy(null)}>
            <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'14px'}}>Se agregarán a {fmtMes(mes)}. Desmarca lo que no se repite este mes.</div>
            {items.map(x=>(
              <div key={x.id} onClick={()=>toggle(x.id)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 2px',borderTop:'1px solid var(--border)',cursor:'pointer'}}>
                <span style={{width:'18px',height:'18px',borderRadius:'5px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:x.sel?'var(--accent)':'transparent',border:x.sel?'none':'2px solid var(--border-card)'}}>
                  {x.sel&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{x.nombre}</div>
                  <div style={{fontSize:'10.5px',color:x.existe?'var(--yellow)':'var(--text-muted)'}}>
                    {x.existe?'Ya existe en este mes':tipo==='ingresos'?(x.tipo==='fijo'?`Fijo${x.dia?` · día ${x.dia}`:''}`:'Variable'):(x.meta_total>0?`Meta ${q(x.meta_total)}`:'Sin meta')}
                  </div>
                </div>
                <span style={{fontSize:'13px',fontWeight:'700',color:'var(--green)',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(tipo==='ingresos'?x.monto:x.aportado_mes)}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'12px 2px 16px',borderTop:'1px solid var(--border)',fontSize:'13px',fontWeight:'700',color:'var(--text-1)'}}>
              <span>{sel.length} seleccionado{sel.length!==1?'s':''}</span>
              <span style={{fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}>{q(total)}</span>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button type="button" onClick={()=>setModalCopy(null)} style={{flex:1,padding:'9px',borderRadius:'10px',border:'1px solid var(--border)',background:'transparent',color:'var(--text-2)',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
              <button type="button" disabled={!sel.length} onClick={copiarSeleccion} style={{flex:1,padding:'9px',borderRadius:'10px',border:'none',background:'var(--accent)',color:'#fff',fontWeight:'700',fontSize:'13px',cursor:sel.length?'pointer':'default',opacity:sel.length?1:0.5}}>Copiar {sel.length||''}</button>
            </div>
          </Modal>
        )
      })()}

      {modalLim&&(
        <Modal title="Límites mensuales por categoría" onClose={()=>setModalLim(false)}>
          <form onSubmit={saveLimites}>
            <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'16px',lineHeight:1.5}}>Aplican a los gastos variables y se repiten cada mes. Deja vacío para no poner límite.</div>
            {CATS_VAR.map(c=>(
              <div key={c} style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
                <label style={{flex:1,fontSize:'13px',color:'var(--text-1)',fontWeight:'500'}}>{c}</label>
                <input type="number" step="0.01" min="0" placeholder="Sin límite" style={{...inp,width:'150px',fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}}
                  value={fLim[c]??''} onChange={e=>setFLim(p=>({...p,[c]:e.target.value}))}/>
              </div>
            ))}
            <div style={{height:'8px'}}/>
            <ModalBtns onClose={()=>setModalLim(false)}/>
          </form>
        </Modal>
      )}

      {modalPago&&(()=>{
        const prest=prestamos.find(x=>x.id===modalPago.id)
        const saldo=parseFloat(prest?.saldo_actual||0)
        const restar=Math.min(Math.max(parseFloat(fPago.restar||0),0),saldo)
        const nuevo=saldo-restar
        const mono={fontFamily:'var(--font-mono)',fontVariantNumeric:'tabular-nums'}
        return(
          <Modal title={`Registrar pago — ${modalPago.nombre}`} onClose={()=>setModalPago(null)}>
            <form onSubmit={registrarPagoDeuda}>
              <div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'16px'}}>{fmtMes(mes)} · cuota {q(modalPago.monto)}</div>
              <FormField label="Monto pagado *">
                <input required autoFocus type="number" step="0.01" min="0" style={inp} value={fPago.monto}
                  onChange={e=>{const v=e.target.value;setFPago(p=>({...p,monto:v,restar:p.restarEditado?p.restar:v}))}}/>
              </FormField>
              <FormField label="Restar del saldo">
                <input type="number" step="0.01" min="0" style={inp} value={fPago.restar}
                  onChange={e=>setFPago(p=>({...p,restar:e.target.value,restarEditado:true}))}/>
                <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'5px',lineHeight:1.4}}>Si la cuota incluye intereses, pon solo lo que fue a capital.</div>
              </FormField>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--inner-bg)',borderRadius:'10px',marginBottom:'16px'}}>
                <span style={{fontSize:'12px',color:'var(--text-muted)'}}>Saldo</span>
                <span style={{fontSize:'13px',...mono}}>
                  <span style={{color:'var(--text-muted)'}}>{q(saldo)}</span>
                  <span style={{color:'var(--text-muted)',margin:'0 8px'}}>→</span>
                  <span style={{fontWeight:'700',color:nuevo<=0?'var(--green)':'var(--text-1)'}}>{q(nuevo)}</span>
                </span>
              </div>
              {nuevo<=0&&<div style={{fontSize:'12px',color:'var(--green)',fontWeight:'600',marginBottom:'14px'}}>Con este pago la deuda queda saldada y pasa a "Deudas pagadas".</div>}
              <ModalBtns onClose={()=>setModalPago(null)}/>
            </form>
          </Modal>
        )
      })()}

      {confirmDel&&(
        <ConfirmModal
          msg={confirmDel.msg}
          title={confirmDel.title}
          btn={confirmDel.btn}
          onConfirm={()=>{confirmDel.onConfirm();setConfirmDel(null)}}
          onCancel={()=>setConfirmDel(null)}
        />
      )}
    </div>
  )
}
