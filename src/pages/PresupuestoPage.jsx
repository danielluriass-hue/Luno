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

function SubHead({ label, total, onAdd }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <div style={{width:'3px',height:'14px',background:'var(--accent)',borderRadius:'2px',flexShrink:0}}/>
        <div>
          <div style={{fontSize:'12px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div>
          {total!==undefined && <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'1px'}}>{q(total)}</div>}
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

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
      <div style={{background:'var(--card-bg)',borderRadius:'20px',padding:'28px',width:'min(360px,calc(100vw - 24px))',border:'1px solid var(--border-card)',textAlign:'center'}}>
        <div style={{width:'46px',height:'46px',borderRadius:'50%',background:'rgba(255,59,48,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <div style={{fontSize:'15px',fontWeight:'700',color:'var(--text-1)',marginBottom:'8px'}}>¿Eliminar este registro?</div>
        <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'24px',lineHeight:'1.5'}}>{msg}</div>
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={onCancel}  style={{flex:1,padding:'10px',borderRadius:'10px',border:'1px solid var(--border)',background:'transparent',color:'var(--text-2)',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
          <button onClick={onConfirm} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',background:'var(--red)',color:'#fff',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>Eliminar</button>
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
      <button type="submit" style={{flex:1,padding:'9px',borderRadius:'10px',border:'none',background:'var(--accent)',color:'#fff',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>Guardar</button>
    </div>
  )
}

export default function PresupuestoPage({ user }) {
  const isMobile = useIsMobile()

  const [tab,        setTab]        = useState(()=>localStorage.getItem('presupuesto_tab')||'ingresos')
  const [mes,        setMes]        = useState(()=>localStorage.getItem('presupuesto_mes')||thisMes)
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
  useEffect(()=>{localStorage.setItem('presupuesto_mes',mes);setSelectedDay(null);setCalSelDay(null);setIngSelDay(null)},[mes])

  useEffect(()=>{
    const uid=user.id; setLoading(true)
    Promise.all([
      supabase.from('budget_ingresos').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_gastos_fijos').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_gastos_variables').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_prestamos').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_ahorros').select('*').eq('user_id',uid).order('created_at'),
      supabase.from('budget_compromisos').select('*').eq('user_id',uid).order('created_at'),
    ]).then(([ing,fij,varG,prest,aho,comp])=>{
      setIngresos(ing.data||[]);setGastosFijos(fij.data||[]);setGastosVar(varG.data||[])
      setPrestamos(prest.data||[]);setAhorros(aho.data||[]);setCompromisos(comp.data||[])
      setLoading(false)
    })
  },[user.id])

  const ingMes = ingresos.filter(i=>i.mes===mes)
  const varMes = gastosVar.filter(g=>g.mes===mes)
  const ahoMes = ahorros.filter(a=>a.mes===mes)

  const totalIngresos  = ingMes.reduce((s,i)=>s+parseFloat(i.monto||0),0)
  const totalFijos     = gastosFijos.filter(g=>g.activo).reduce((s,g)=>s+parseFloat(g.monto||0),0)
  const totalPrestamos = prestamos.reduce((s,p)=>s+parseFloat(p.cuota_mensual||0),0)
  const totalVariables = varMes.reduce((s,g)=>s+parseFloat(g.monto||0),0)
  const totalAhorros   = ahoMes.reduce((s,a)=>s+parseFloat(a.aportado_mes||0),0)
  const totalGastosAll = totalFijos+totalPrestamos+totalVariables+totalAhorros
  const disponible     = totalIngresos-totalGastosAll

  const compActivos = compromisos.filter(c=>!c.pagado)
  const compPagados = compromisos.filter(c=> c.pagado)
  const totalComp   = compActivos.reduce((s,c)=>s+parseFloat(c.monto||0),0)

  const resumenDeudas = TIPOS_DEUDA.map(tipo=>{
    const items=prestamos.filter(p=>(p.tipo||'Préstamo')===tipo)
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
  prestamos.filter(p=>p.dia_pago).forEach(p=>{
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

  // ── Nav ──
  const prevMes=()=>{const[y,m]=mes.split('-').map(Number);const d=new Date(y,m-2);setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}
  const nextMes=()=>{const[y,m]=mes.split('-').map(Number);const d=new Date(y,m);  setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}

  // ── CRUD ──
  const askDel=(msg,fn)=>setConfirmDel({msg,onConfirm:fn})
  const upsert=async(table,payload,id,setState)=>{
    console.log('[upsert]', table, 'id=', id, payload)
    if(id){const{data,error}=await supabase.from(table).update(payload).eq('id',id).select().single();console.log('[upsert result]',{data,error});if(error)console.error('upsert update error:',error);else if(data)setState(p=>p.map(x=>x.id===data.id?data:x))}
    else  {const{data,error}=await supabase.from(table).insert({...payload,user_id:user.id}).select().single();console.log('[upsert result]',{data,error});if(error)console.error('upsert insert error:',error);else if(data)setState(p=>[...p,data])}
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
  const openAddVar  =(dateStr)=>{setFVar({nombre:'',categoria:'Alimentación',monto:'',fecha:dateStr||today,medio_pago:'Efectivo',tarjeta:'',fecha_pago:''});setModalVar({})}

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
        <h1 style={{fontSize:'28px',fontWeight:'800',letterSpacing:'-0.03em',color:'var(--text-1)',margin:'0 0 16px'}}>Presupuesto</h1>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <button onClick={prevMes} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
          <div style={{fontSize:'14px',fontWeight:'600',color:'var(--text-1)',minWidth:'140px',textAlign:'center'}}>{fmtMes(mes)}</div>
          <button onClick={nextMes} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg></button>
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
                <div style={{fontSize:'20px',fontWeight:'800',letterSpacing:'-0.02em',color:'var(--text-1)',marginTop:'4px'}}>{fmtMes(mes)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'2px'}}>Total compromisos del mes</div>
                <div style={{fontSize:'16px',fontWeight:'800',color:'#ff9500'}}>{q(Object.values(calEvents).flat().reduce((s,e)=>s+parseFloat(e.amount||0),0))}</div>
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
                          return(
                            <button key={dateStr} onClick={()=>setCalSelDay(isSel?null:dateStr)} style={{
                              minHeight:'72px',borderRadius:'10px',padding:'8px 8px 6px',
                              cursor:evts.length?'pointer':'default',
                              border:isSel?'2px solid var(--accent)':isToday?'1px solid var(--accent)':'1px solid var(--border)',
                              background:isSel?'var(--accent-soft)':isToday?'rgba(88,86,214,0.06)':'transparent',
                              display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'2px',
                              transition:'all 0.12s',textAlign:'left',
                            }}>
                              <span style={{fontSize:'13px',fontWeight:isToday?'700':'500',color:isToday?'var(--accent)':isSel?'var(--accent)':'var(--text-1)'}}>{day}</span>
                              {ingTotal>0&&<span style={{fontSize:'10px',fontWeight:'700',color:'var(--green)',lineHeight:1}}>+{q(ingTotal)}</span>}
                              {gasTotal>0&&<span style={{fontSize:'10px',fontWeight:'700',color:'var(--red)',lineHeight:1}}>{q(gasTotal)}</span>}
                              {evts.length>0&&(
                                <div style={{display:'flex',gap:'3px',flexWrap:'wrap',marginTop:'auto'}}>
                                  {evts.slice(0,4).map((e,i)=><div key={i} style={{width:'5px',height:'5px',borderRadius:'50%',background:e.color}}/>)}
                                  {evts.length>4&&<span style={{fontSize:'8px',color:'var(--text-muted)'}}>+{evts.length-4}</span>}
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
                          <div style={{fontSize:'13px',fontWeight:'800',color:weekTotal>0?'var(--red)':'var(--text-muted)'}}>{weekTotal>0?q(weekTotal):'—'}</div>
                          {weekDays.length>0&&(
                            <div style={{fontSize:'9px',color:'var(--text-muted)',textAlign:'center'}}>
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
                <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)',marginBottom:'10px'}}>
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
                      <div style={{fontSize:'13px',fontWeight:'700',color:e.color}}>{q(e.amount)}</div>
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
                MES TOTAL <span style={{color:'var(--red)',marginLeft:'6px'}}>
                  {q(Object.values(calEvents).flat().reduce((s,e)=>s+parseFloat(e.amount||0),0))}
                </span>
              </div>
            </div>
          </div>

          {/* ── Disponible ── */}
          <div style={{...card,background:disponible>=0?'rgba(52,199,89,0.08)':'rgba(255,59,48,0.08)',border:`1px solid ${disponible>=0?'rgba(52,199,89,0.25)':'rgba(255,59,48,0.25)'}`}}>
            <div style={{fontSize:'11px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>Disponible · {fmtMes(mes)}</div>
            <div style={{fontSize:'36px',fontWeight:'800',letterSpacing:'-0.03em',color:disponible>=0?'var(--green)':'var(--red)'}}>{q(disponible)}</div>
            <div style={{display:'flex',gap:'12px',marginTop:'10px',flexWrap:'wrap'}}>
              <span style={{fontSize:'12px',color:'var(--green)'}}>↑ {q(totalIngresos)} ingresos</span>
              <span style={{fontSize:'12px',color:'var(--red)'}}>↓ {q(totalGastosAll)} gastos</span>
            </div>
          </div>

          {/* ── 4 mini-cards ── */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:'10px'}}>
            {[
              {label:'Ingresos',amount:totalIngresos,color:'var(--green)',bg:'rgba(52,199,89,0.08)',action:()=>setTab('ingresos')},
              {label:'Deudas',amount:totalPrestamos,color:'#ff9500',bg:'rgba(255,149,0,0.08)',action:()=>setTab('deudas')},
              {label:'Gastos',amount:totalFijos+totalVariables,color:'#ff6b6b',bg:'rgba(255,107,107,0.08)',action:()=>setTab('gastos')},
              {label:'Ahorros',amount:totalAhorros,color:'var(--accent)',bg:'var(--accent-soft)',action:()=>setTab('ahorros')},
            ].map(({label,amount,color,bg,action})=>(
              <button key={label} onClick={action} style={{background:bg,borderRadius:'12px',padding:'14px 16px',borderLeft:`3px solid ${color}`,border:'none',cursor:'pointer',textAlign:'left'}}>
                <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'4px'}}>{label}</div>
                <div style={{fontSize:'15px',fontWeight:'700',color}}>{q(amount)}</div>
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
                  <span style={{fontSize:'13px',fontWeight:'600',color}}>{sign} {q(amount)}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'14px'}}>
                <span style={{fontSize:'14px',fontWeight:'700',color:'var(--text-1)'}}>Disponible</span>
                <span style={{fontSize:'16px',fontWeight:'800',color:disponible>=0?'var(--green)':'var(--red)'}}>= {q(disponible)}</span>
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
                        <span style={{fontSize:'12px',color:'var(--text-muted)'}}>{pct.toFixed(1)}% · {q(amount)}</span>
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

          {/* Calendario de ingresos */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Calendario de Ingresos</div>
                <div style={{fontSize:'20px',fontWeight:'800',letterSpacing:'-0.02em',color:'var(--text-1)',marginTop:'4px'}}>{fmtMes(mes)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'2px'}}>Total del mes</div>
                <div style={{fontSize:'16px',fontWeight:'800',color:'var(--green)'}}>{q(totalIngresos)}</div>
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
                          return(
                            <button key={`i${dateStr}`} onClick={()=>setIngSelDay(isSel?null:dateStr)} style={{
                              minHeight:'72px',borderRadius:'10px',padding:'8px 8px 6px',
                              cursor:evts.length?'pointer':'default',
                              border:isSel?'2px solid var(--green)':isToday?'1px solid var(--accent)':'1px solid var(--border)',
                              background:isSel?'rgba(52,199,89,0.1)':isToday?'rgba(88,86,214,0.06)':'transparent',
                              display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'4px',
                              transition:'all 0.12s',textAlign:'left',
                            }}>
                              <span style={{fontSize:'13px',fontWeight:isToday?'700':'500',color:isToday?'var(--accent)':isSel?'var(--green)':'var(--text-1)'}}>{day}</span>
                              {dayTotal>0&&(
                                <span style={{fontSize:'11px',fontWeight:'700',color:'var(--green)',lineHeight:1}}>+{q(dayTotal)}</span>
                              )}
                              {evts.length>0&&(
                                <div style={{display:'flex',gap:'3px',marginTop:'auto'}}>
                                  {evts.slice(0,3).map((_,i)=><div key={i} style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--green)'}}/>)}
                                  {evts.length>3&&<span style={{fontSize:'8px',color:'var(--text-muted)'}}>+{evts.length-3}</span>}
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
                          <div style={{fontSize:'13px',fontWeight:'800',color:weekTotal>0?'var(--green)':'var(--text-muted)'}}>{weekTotal>0?`+${q(weekTotal)}`:'—'}</div>
                          {weekDays.length>0&&(
                            <div style={{fontSize:'9px',color:'var(--text-muted)',textAlign:'center'}}>{weekDays[0]}–{weekDays[weekDays.length-1]}</div>
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
                <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)',marginBottom:'10px'}}>
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
                      <div style={{fontSize:'13px',fontWeight:'700',color:'var(--green)'}}>+{q(e.amount)}</div>
                    </div>
                  ))
                }
                {ingSelEvents.length>0&&(
                  <div style={{display:'flex',justifyContent:'flex-end',paddingTop:'8px'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)'}}>Total: +{q(ingSelEvents.reduce((s,e)=>s+parseFloat(e.amount||0),0))}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',marginTop:'16px',paddingTop:'14px',borderTop:'1px solid var(--border)'}}>
              <div style={{fontSize:'12px',fontWeight:'800',color:'var(--text-1)',letterSpacing:'0.03em'}}>
                MES TOTAL <span style={{color:'var(--green)',marginLeft:'6px'}}>{q(totalIngresos)}</span>
              </div>
            </div>
          </div>

          {/* Lista de ingresos */}
          <div style={card}>
            <SubHead label="Ingresos del mes" total={totalIngresos} onAdd={()=>{setFIng({nombre:'',tipo:'fijo',monto:'',dia:''});setModalIng({})}}/>
            {ingMes.length===0
              ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Sin ingresos registrados</p>
              :ingMes.map(i=>(
                <div key={i.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13.5px',fontWeight:'500',color:'var(--text-1)'}}>{i.nombre}</div>
                    <div style={{display:'flex',gap:'8px',marginTop:'2px'}}>
                      <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{i.tipo==='fijo'?'Fijo':'Variable'}</span>
                      {i.tipo==='fijo'&&i.dia&&<span style={{fontSize:'11px',color:'var(--accent)'}}>día {i.dia}</span>}
                      {i.tipo!=='fijo'&&i.fecha&&<span style={{fontSize:'11px',color:'var(--accent)'}}>{new Date(i.fecha+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}</span>}
                    </div>
                  </div>
                  <div style={{fontWeight:'600',fontSize:'14px',color:'var(--green)'}}>{q(i.monto)}</div>
                  <div style={{display:'flex',gap:'4px'}}>
                    <button onClick={()=>{setFIng({nombre:i.nombre,tipo:i.tipo,monto:String(i.monto),dia:i.dia!=null?String(i.dia):'',fecha:i.fecha||''});setModalIng(i)}} style={bEdit}><IcoEdit/></button>
                    <button onClick={()=>askDel(`"${i.nombre}" se eliminará.`,()=>del('budget_ingresos',i.id,setIngresos))} style={bDel}><IcoDel/></button>
                  </div>
                </div>
              ))
            }
            {ingMes.length>0&&<div style={{display:'flex',justifyContent:'flex-end',paddingTop:'14px'}}><span style={{fontSize:'14px',fontWeight:'700',color:'var(--green)'}}>Total: {q(totalIngresos)}</span></div>}
          </div>

        </div>
      )}

      {/* ══ TAB: DEUDAS ══ */}
      {tab==='deudas'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

          <div style={card}>
            <SubHead label="Deudas Formales" total={totalPrestamos} onAdd={()=>{setFPrest({nombre:'',tipo:'Préstamo',monto_original:'',saldo_actual:'',cuota_mensual:'',meses_restantes:'',dia_pago:''});setModalPrest({})}}/>
            {resumenDeudas.length>0&&(
              <div style={{marginBottom:'16px',padding:'12px 14px',background:'var(--inner-bg)',borderRadius:'10px',overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12.5px'}}>
                  <thead><tr style={{color:'var(--text-muted)',fontSize:'11px'}}>
                    <th style={{padding:'0 10px 8px 0',fontWeight:'500',textAlign:'left'}}>Tipo</th>
                    <th style={{padding:'0 10px 8px',fontWeight:'500',textAlign:'right',whiteSpace:'nowrap'}}>Original</th>
                    <th style={{padding:'0 10px 8px',fontWeight:'500',textAlign:'right',whiteSpace:'nowrap'}}>Saldo</th>
                    <th style={{padding:'0 0 8px 10px',fontWeight:'500',textAlign:'right',whiteSpace:'nowrap'}}>Cuota/mes</th>
                  </tr></thead>
                  <tbody>
                    {resumenDeudas.map(({tipo,count,totalOriginal,totalSaldo,totalCuota})=>(
                      <tr key={tipo} style={{borderTop:'1px solid var(--border)'}}>
                        <td style={{padding:'8px 10px 8px 0'}}>
                          <span style={{fontSize:'11px',fontWeight:'600',color:TIPO_COLOR[tipo],background:'var(--card-bg)',padding:'2px 7px',borderRadius:'6px'}}>{tipo}</span>
                          <span style={{fontSize:'10px',color:'var(--text-muted)',marginLeft:'6px'}}>{count}</span>
                        </td>
                        <td style={{padding:'8px 10px',textAlign:'right',color:'var(--text-2)',whiteSpace:'nowrap'}}>{q(totalOriginal)}</td>
                        <td style={{padding:'8px 10px',textAlign:'right',color:'var(--text-1)',fontWeight:'500',whiteSpace:'nowrap'}}>{q(totalSaldo)}</td>
                        <td style={{padding:'8px 0 8px 10px',textAlign:'right',color:'var(--accent)',fontWeight:'700',whiteSpace:'nowrap'}}>{q(totalCuota)}</td>
                      </tr>
                    ))}
                    <tr style={{borderTop:'2px solid var(--border-card)'}}>
                      <td style={{padding:'8px 10px 8px 0',fontWeight:'700',color:'var(--text-1)',fontSize:'12px'}}>Total</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:'600',color:'var(--text-2)',whiteSpace:'nowrap'}}>{q(resumenDeudas.reduce((s,r)=>s+r.totalOriginal,0))}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:'600',color:'var(--text-1)',whiteSpace:'nowrap'}}>{q(resumenDeudas.reduce((s,r)=>s+r.totalSaldo,0))}</td>
                      <td style={{padding:'8px 0 8px 10px',textAlign:'right',fontWeight:'800',color:'var(--red)',whiteSpace:'nowrap'}}>{q(totalPrestamos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {prestamos.length===0
              ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'16px 0'}}>Sin deudas registradas</p>
              :<div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                  <thead><tr style={{color:'var(--text-muted)',fontSize:'11px'}}>
                    {['Nombre','Tipo','Original','Saldo','Cuota','Día','Meses',''].map(h=>(
                      <th key={h} style={{padding:'4px 8px 10px',fontWeight:'500',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {prestamos.map(p=>{
                      const tipo=p.tipo||'Préstamo'
                      const pct=p.monto_original>0?Math.min(((p.monto_original-p.saldo_actual)/p.monto_original)*100,100):0
                      return(
                        <tr key={p.id} style={{borderTop:'1px solid var(--border)'}}>
                          <td style={{padding:'11px 8px'}}>
                            <div style={{fontWeight:'500',color:'var(--text-1)'}}>{p.nombre}</div>
                            <div style={{marginTop:'5px',height:'3px',background:'var(--inner-bg)',borderRadius:'2px',width:'70px'}}>
                              <div style={{height:'3px',background:'var(--green)',borderRadius:'2px',width:`${pct}%`}}/>
                            </div>
                          </td>
                          <td style={{padding:'11px 8px',whiteSpace:'nowrap'}}>
                            <span style={{fontSize:'11px',fontWeight:'600',color:TIPO_COLOR[tipo],background:'var(--inner-bg)',padding:'2px 7px',borderRadius:'6px'}}>{tipo}</span>
                          </td>
                          <td style={{padding:'11px 8px',color:'var(--text-2)',whiteSpace:'nowrap'}}>{q(p.monto_original)}</td>
                          <td style={{padding:'11px 8px',color:'var(--text-1)',fontWeight:'500',whiteSpace:'nowrap'}}>{q(p.saldo_actual)}</td>
                          <td style={{padding:'11px 8px',color:'var(--accent)',fontWeight:'700',whiteSpace:'nowrap'}}>{q(p.cuota_mensual)}</td>
                          <td style={{padding:'11px 8px',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{p.dia_pago?`día ${p.dia_pago}`:'—'}</td>
                          <td style={{padding:'11px 8px',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{p.meses_restantes??'—'}</td>
                          <td style={{padding:'11px 0 11px 4px'}}>
                            <div style={{display:'flex',gap:'4px'}}>
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
                      {c.fecha_aprox&&<div style={{fontSize:'11px',color:alertColor||'var(--text-muted)',marginTop:'2px'}}>Aprox. {new Date(c.fecha_aprox+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'long',year:'numeric'})}</div>}
                      {c.notas&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px',fontStyle:'italic'}}>{c.notas}</div>}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--accent)'}}>{q(c.monto)}</div>
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
                    <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-muted)',textDecoration:'line-through'}}>{q(c.monto)}</div>
                    <button onClick={()=>askDel(`Compromiso con "${c.persona}" se eliminará.`,()=>del('budget_compromisos',c.id,setCompromisos))} style={bDel}><IcoDel/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: GASTOS ══ */}
      {tab==='gastos'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>

          {/* Calendario grande Gastos Variables */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Gastos Variables</div>
                <div style={{fontSize:'20px',fontWeight:'800',letterSpacing:'-0.02em',color:'var(--text-1)',marginTop:'4px'}}>{fmtMes(mes)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'2px'}}>Total del mes</div>
                <div style={{fontSize:'16px',fontWeight:'800',color:'var(--accent)'}}>{q(totalVariables)}</div>
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
                          return(
                            <button key={dateStr} onClick={()=>setSelectedDay(isSel?null:dateStr)} style={{
                              minHeight:'72px',borderRadius:'10px',padding:'8px 8px 6px',cursor:'pointer',
                              border:isSel?'2px solid var(--accent)':isToday?'1px solid var(--accent)':'1px solid var(--border)',
                              background:isSel?'var(--accent-soft)':isToday?'rgba(88,86,214,0.06)':'transparent',
                              display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'4px',
                              transition:'all 0.12s',textAlign:'left',
                            }}>
                              <span style={{fontSize:'13px',fontWeight:isToday?'700':'500',color:isToday?'var(--accent)':isSel?'var(--accent)':'var(--text-1)'}}>{day}</span>
                              {dayT>0&&<span style={{fontSize:'11px',fontWeight:'700',color:'#ff9500',lineHeight:1}}>{q(dayT)}</span>}
                              {hasAny&&(
                                <div style={{display:'flex',gap:'3px',marginTop:'auto',flexWrap:'wrap'}}>
                                  {dayFij.map((_,i)=><div key={`f${i}`} style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--accent)'}}/>)}
                                  {dayVar.slice(0,3).map((_,i)=><div key={`v${i}`} style={{width:'5px',height:'5px',borderRadius:'50%',background:'#ff9500'}}/>)}
                                  {dayVar.length>3&&<span style={{fontSize:'8px',color:'var(--text-muted)'}}>+{dayVar.length-3}</span>}
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
                          <div style={{fontSize:'13px',fontWeight:'800',color:weekTotal>0?'#ff9500':'var(--text-muted)'}}>{weekTotal>0?q(weekTotal):'—'}</div>
                          {weekDays.length>0&&<div style={{fontSize:'9px',color:'var(--text-muted)',textAlign:'center'}}>{weekDays[0]}–{weekDays[weekDays.length-1]}</div>}
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
                      <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-1)'}}>{(()=>{const[,,d]=selectedDay.split('-');return`${parseInt(d)} de ${fmtMes(mes)}`})()}</div>
                      {totalDia>0&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>Total: {q(totalDia)}</div>}
                    </div>
                    <button onClick={()=>openAddVar(selectedDay)} style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:'8px',padding:'6px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>+ Variable</button>
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
                          <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)'}}>{q(g.monto)}</div>
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
                          {g.fecha_pago&&<span style={{fontSize:'10px',color:'var(--yellow)'}}>Pago: {new Date(g.fecha_pago+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}</span>}
                        </div>
                      </div>
                      <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)'}}>{q(g.monto)}</div>
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
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#ff9500',textTransform:'uppercase',letterSpacing:'0.05em'}}>Sin fecha — {varSinFecha.length} gasto{varSinFecha.length>1?'s':''} · {q(varSinFecha.reduce((s,g)=>s+parseFloat(g.monto||0),0))}</div>
                  <span style={{fontSize:'10px',color:'var(--text-muted)'}}>Edítalos para asignar fecha</span>
                </div>
                {varSinFecha.map(g=>(
                  <div key={g.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'13px',fontWeight:'500',color:'var(--text-1)'}}>{g.nombre}</div>
                      <div style={{display:'flex',gap:'6px',marginTop:'3px'}}><span style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}</span><TarjetaChip g={g}/></div>
                    </div>
                    <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)'}}>{q(g.monto)}</div>
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
                MES TOTAL <span style={{color:'#ff9500',marginLeft:'6px'}}>{q(totalFijos+totalVariables)}</span>
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
                      {g.dia_pago&&<span style={{fontSize:'10px',color:'var(--accent)'}}>día {g.dia_pago}</span>}
                    </div>
                  </div>
                  <div style={{fontSize:'13.5px',fontWeight:'600',color:'var(--accent)',whiteSpace:'nowrap'}}>{q(g.monto)}</div>
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
                      {g.fecha&&<span style={{fontSize:'10px',color:'var(--text-muted)'}}>{new Date(g.fecha+'T00:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'})}</span>}
                      <span style={{fontSize:'10px',color:'var(--text-muted)'}}>{g.categoria}</span>
                      <TarjetaChip g={g}/>
                    </div>
                  </div>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'var(--accent)',whiteSpace:'nowrap'}}>{q(g.monto)}</div>
                  <div style={{display:'flex',gap:'4px'}}>
                    <button onClick={()=>{setFVar({nombre:g.nombre,categoria:g.categoria,monto:String(g.monto),fecha:g.fecha||today,medio_pago:g.medio_pago||'Efectivo',tarjeta:g.tarjeta||'',fecha_pago:g.fecha_pago||''});setModalVar(g)}} style={bEdit}><IcoEdit/></button>
                    <button onClick={()=>askDel(`"${g.nombre}" se eliminará.`,()=>del('budget_gastos_variables',g.id,setGastosVar))} style={bDel}><IcoDel/></button>
                  </div>
                </div>
              ))
            }
            {varMes.length>0&&<div style={{display:'flex',justifyContent:'flex-end',paddingTop:'14px'}}><span style={{fontSize:'14px',fontWeight:'700',color:'var(--accent)'}}>Total: {q(totalVariables)}</span></div>}
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
                  <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{fmtMes(mes)} · {varMes.length} transacción{varMes.length!==1?'es':''}</div>
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
                          <span style={{fontSize:'13px',fontWeight:'700',color}}>{q(amt)}</span>
                          <span style={{fontSize:'10px',color:'var(--text-muted)',marginLeft:'6px'}}>{pct.toFixed(1)}%</span>
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
                  <span style={{fontSize:'14px',fontWeight:'800',color:'var(--accent)'}}>{q(total)}</span>
                </div>
              </div>
            )
          })()}

        </div>
      )}

      {/* ══ TAB: AHORROS ══ */}
      {tab==='ahorros'&&(
        <div style={card}>
          <SubHead label="Ahorros" total={totalAhorros} onAdd={()=>{setFAho({nombre:'',meta_total:'',aportado_mes:''});setModalAho({})}}/>
          {ahoMes.length===0
            ?<p style={{fontSize:'13px',color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Sin aportes de ahorro este mes</p>
            :ahoMes.map(a=>{
              const ahoTotal=ahorros.filter(x=>x.nombre===a.nombre).reduce((s,x)=>s+parseFloat(x.aportado_mes||0),0)
              const pct=a.meta_total>0?Math.min((ahoTotal/a.meta_total)*100,100):0
              return(
                <div key={a.id} style={{padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13.5px',fontWeight:'500',color:'var(--text-1)'}}>{a.nombre}</div>
                      {a.meta_total>0&&<div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>Meta: {q(a.meta_total)} · Acumulado: {q(ahoTotal)} · {pct.toFixed(0)}%</div>}
                    </div>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'var(--green)'}}>{q(a.aportado_mes)}</div>
                    <div style={{display:'flex',gap:'4px'}}>
                      <button onClick={()=>{setFAho({nombre:a.nombre,meta_total:String(a.meta_total),aportado_mes:String(a.aportado_mes)});setModalAho(a)}} style={bEdit}><IcoEdit/></button>
                      <button onClick={()=>askDel(`"${a.nombre}" se eliminará.`,()=>del('budget_ahorros',a.id,setAhorros))} style={bDel}><IcoDel/></button>
                    </div>
                  </div>
                  {a.meta_total>0&&<div style={{marginTop:'8px',height:'5px',background:'var(--inner-bg)',borderRadius:'3px'}}><div style={{height:'5px',background:'var(--green)',borderRadius:'3px',width:`${pct}%`,transition:'width 0.3s'}}/></div>}
                </div>
              )
            })
          }
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
            <FormField label="Descripción *"><input required style={inp} value={fVar.nombre} onChange={e=>setFVar(p=>({...p,nombre:e.target.value}))} placeholder="ej. Supermercado, Gasolina..."/></FormField>
            <FormField label="Categoría"><select style={inp} value={fVar.categoria} onChange={e=>setFVar(p=>({...p,categoria:e.target.value}))}>{CATS_VAR.map(c=><option key={c} value={c}>{c}</option>)}</select></FormField>
            <FormField label="Monto *"><input required type="number" step="0.01" min="0" style={inp} value={fVar.monto} onChange={e=>setFVar(p=>({...p,monto:e.target.value}))} placeholder="0.00"/></FormField>
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
            <FormField label="Meses restantes"><input type="number" min="0" style={inp} value={fPrest.meses_restantes} onChange={e=>setFPrest(p=>({...p,meses_restantes:e.target.value}))} placeholder="ej. 24"/></FormField>
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

      {confirmDel&&(
        <ConfirmModal
          msg={confirmDel.msg}
          onConfirm={()=>{confirmDel.onConfirm();setConfirmDel(null)}}
          onCancel={()=>setConfirmDel(null)}
        />
      )}
    </div>
  )
}
