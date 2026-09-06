import React,{useMemo,useState}from'react'
import{useActiveServices}from'../hooks/useAdminData'
import'./admin-services-pro.css'

const ACTIVE=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
const label=(s:string)=>({buscando:'Buscando',ofrecido:'Ofrecido',asignado:'Asignado',en_camino:'En camino',llegado:'Llegó',en_progreso:'En progreso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado'} as Record<string,string>)[s]||s.replace(/_/g,' ')
const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const when=(v:any)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'

export function AdminServicesPro(){
 const{services,loading,refetch}=useActiveServices();const[q,setQ]=useState('');const[state,setState]=useState('todos')
 const rows=useMemo(()=>services.filter((s:any)=>{
  if(state!=='todos'&&s.estado!==state)return false
  const hay=[s.descripcion,s.estado,s.categorias?.nombre,s.clientes?.nombre,s.proveedores?.nombre].filter(Boolean).join(' ').toLowerCase()
  return !q.trim()||hay.includes(q.trim().toLowerCase())
 }),[services,q,state])
 const counts=useMemo(()=>ACTIVE.reduce((a:any,k)=>{a[k]=services.filter((s:any)=>s.estado===k).length;return a},{}),[services])
 return <div className="ugo-services-pro">
  <div className="ugo-services-pro-toolbar"><div><small>CONTROL DE SERVICIOS</small><strong>{services.length} servicios cargados</strong></div><button onClick={refetch} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button></div>
  <div className="ugo-services-pro-filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente, proveedor, categoría o descripción…"/><select value={state} onChange={e=>setState(e.target.value)}><option value="todos">Todos los estados</option>{ACTIVE.map(s=><option key={s} value={s}>{label(s)} ({counts[s]||0})</option>)}</select></div>
  <div className="ugo-services-pro-pills"><button className={state==='todos'?'active':''} onClick={()=>setState('todos')}>Todos <b>{services.length}</b></button>{ACTIVE.map(s=><button key={s} className={state===s?'active':''} onClick={()=>setState(s)}>{label(s)} <b>{counts[s]||0}</b></button>)}</div>
  {loading&&!services.length?<div className="ugo-services-pro-empty">Cargando operación…</div>:!rows.length?<div className="ugo-services-pro-empty"><strong>No hay servicios para este filtro</strong><span>Probá otro estado o limpiá la búsqueda.</span></div>:<div className="ugo-services-pro-list">{rows.map((s:any)=><article key={s.id}><div className="ugo-services-pro-main"><div className={`ugo-services-pro-status status-${s.estado}`}><i/>{label(s.estado)}</div><h3>{s.categorias?.emoji} {s.categorias?.nombre||'Servicio'}</h3><p>{s.descripcion||'Sin descripción adicional.'}</p></div><div className="ugo-services-pro-people"><small>CLIENTE</small><strong>{s.clientes?.nombre||'—'}</strong><small>PROVEEDOR</small><strong>{s.proveedores?.nombre||'Sin asignar'}</strong></div><div className="ugo-services-pro-meta"><small>TARIFA</small><strong>{money(s.tarifa)}</strong><small>CREADO</small><span>{when(s.created_at)}</span></div></article>)}</div>}
 </div>
}
