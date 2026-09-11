import React,{useMemo,useState}from'react'
import{SERVICE_STATES,type ServiceState,useAdminActiveServices}from'../hooks/useAdminActiveServices'
import'./admin-services-pro.css'

const ACTIVE=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion'] as const
const label=(s:string)=>({buscando:'Buscando',ofrecido:'Ofrecido',asignado:'Asignado',en_camino:'En camino',llegado:'Llegó',en_progreso:'En progreso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado'} as Record<string,string>)[s]||s.replace(/_/g,' ')
const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const when=(v:any)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'
const fullName=(u:any)=>[u?.nombre,u?.apellido].filter(Boolean).join(' ')||'—'

export function AdminServicesPro(){
 const{services,loading,error,refetch,updateServiceStatus}=useAdminActiveServices();const[q,setQ]=useState('');const[state,setState]=useState('todos')
 const[drafts,setDrafts]=useState<Record<string,ServiceState>>({});const[saving,setSaving]=useState<string|null>(null);const[actionMessage,setActionMessage]=useState<Record<string,{kind:'ok'|'error';text:string}>>({})
 const rows=useMemo(()=>services.filter((s:any)=>{
  if(state!=='todos'&&s.estado!==state)return false
  const hay=[s.numero,s.descripcion,s.estado,s.direccion_cliente,s.categoria?.nombre,fullName(s.cliente),fullName(s.proveedor)].filter(Boolean).join(' ').toLowerCase()
  return !q.trim()||hay.includes(q.trim().toLowerCase())
 }),[services,q,state])
 const counts=useMemo(()=>SERVICE_STATES.reduce((a:any,k)=>{a[k]=services.filter((s:any)=>s.estado===k).length;return a},{}),[services])
 const activeCount=useMemo(()=>services.filter((s:any)=>ACTIVE.includes(s.estado)).length,[services])
 const changeStatus=async(s:any)=>{
  const next=drafts[String(s.id)]||s.estado
  if(next===s.estado)return
  setSaving(String(s.id));setActionMessage(m=>({...m,[String(s.id)]:{kind:'ok',text:'Guardando cambio…'}}))
  try{
   await updateServiceStatus(s.id,next)
   setDrafts(d=>{const copy={...d};delete copy[String(s.id)];return copy})
   setActionMessage(m=>({...m,[String(s.id)]:{kind:'ok',text:`Estado actualizado a ${label(next)}.`}}))
  }catch(err){
   setActionMessage(m=>({...m,[String(s.id)]:{kind:'error',text:err instanceof Error?err.message:'No se pudo actualizar el estado.'}}))
  }finally{setSaving(null)}
 }
 return <div className="ugo-services-pro">
  <div className="ugo-services-pro-toolbar"><div><small>CONTROL DE OPERACIONES</small><strong>{services.length} operaciones cargadas · {activeCount} activas</strong></div><button onClick={()=>{void refetch()}} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button></div>
  <div className="ugo-services-pro-filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar #, cliente, proveedor, categoría o descripción…"/><select value={state} onChange={e=>setState(e.target.value)}><option value="todos">Todos los estados</option>{SERVICE_STATES.map(s=><option key={s} value={s}>{label(s)} ({counts[s]||0})</option>)}</select></div>
  <div className="ugo-services-pro-pills"><button className={state==='todos'?'active':''} onClick={()=>setState('todos')}>Todos <b>{services.length}</b></button>{SERVICE_STATES.map(s=><button key={s} className={state===s?'active':''} onClick={()=>setState(s)}>{label(s)} <b>{counts[s]||0}</b></button>)}</div>
  {error?<div className="ugo-services-pro-empty"><strong>No se pudieron cargar las operaciones</strong><span>{error}</span><button onClick={()=>{void refetch()}}>Reintentar</button></div>:loading&&!services.length?<div className="ugo-services-pro-empty">Cargando operación…</div>:!rows.length?<div className="ugo-services-pro-empty"><strong>No hay operaciones para este filtro</strong><span>Probá otro estado o limpiá la búsqueda.</span></div>:<div className="ugo-services-pro-list">{rows.map((s:any)=>{
   const id=String(s.id);const draft=drafts[id]||s.estado;const changed=draft!==s.estado;const message=actionMessage[id]
   return <article key={s.id}>
    <div className="ugo-services-pro-main"><div className={`ugo-services-pro-status status-${s.estado}`}><i/>{label(s.estado)}</div><h3>Servicio #{s.numero||'—'} · {s.categoria?.emoji} {s.categoria?.nombre||'Servicio'}</h3><p>{s.descripcion||'Sin descripción adicional.'}</p>{s.direccion_cliente&&<small>{s.direccion_cliente}</small>}</div>
    <div className="ugo-services-pro-people"><small>CLIENTE</small><strong>{fullName(s.cliente)}</strong><small>PROVEEDOR</small><strong>{s.proveedor?fullName(s.proveedor):'Sin asignar'}</strong></div>
    <div className="ugo-services-pro-meta"><small>TARIFA</small><strong>{money(s.tarifa)}</strong><small>ACTUALIZADO</small><span>{when(s.updated_at||s.created_at)}</span></div>
    <div className="ugo-services-pro-control"><small>CONTROL ADMINISTRATIVO</small><div className="ugo-services-pro-control-row"><select aria-label={`Cambiar estado del servicio ${s.numero||s.id}`} value={draft} disabled={saving===id} onChange={e=>{setDrafts(d=>({...d,[id]:e.target.value as ServiceState}));setActionMessage(m=>{const copy={...m};delete copy[id];return copy})}}>{SERVICE_STATES.map(option=><option key={option} value={option}>{label(option)}</option>)}</select><button onClick={()=>{void changeStatus(s)}} disabled={!changed||saving===id}>{saving===id?'Guardando…':'Guardar estado'}</button></div>{message&&<span className={`ugo-services-pro-feedback ${message.kind}`}>{message.text}</span>}</div>
   </article>
  })}</div>}
 </div>
}
