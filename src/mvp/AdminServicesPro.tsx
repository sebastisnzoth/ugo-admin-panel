import React,{useMemo,useState}from'react'
import{SERVICE_STATES,type ServiceState,useAdminActiveServices}from'../hooks/useAdminActiveServices'
import'./admin-services-pro.css'

const ACTIVE=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion'] as const
const label=(s:string)=>({buscando:'Buscando',ofrecido:'Ofrecido',asignado:'Asignado',en_camino:'En camino',llegado:'Llegó',en_progreso:'En progreso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado'} as Record<string,string>)[s]||s.replace(/_/g,' ')
const money=(v:any)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const when=(v:any)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'
const fullName=(u:any)=>[u?.nombre,u?.apellido].filter(Boolean).join(' ')||'—'

type EditForm={estado:ServiceState;proveedor_id:string;tarifa:string;descripcion:string;direccion_cliente:string;motivo:string}
const toForm=(s:any):EditForm=>({estado:s.estado,proveedor_id:s.proveedor_id||s.proveedor?.id||'',tarifa:String(Number(s.tarifa||0)),descripcion:s.descripcion||'',direccion_cliente:s.direccion_cliente||'',motivo:''})

export function AdminServicesPro(){
 const{services,providers,loading,error,refetch,updateService,updateServiceStatus}=useAdminActiveServices();const[q,setQ]=useState('');const[state,setState]=useState('todos')
 const[drafts,setDrafts]=useState<Record<string,ServiceState>>({});const[saving,setSaving]=useState<string|null>(null);const[actionMessage,setActionMessage]=useState<Record<string,{kind:'ok'|'error';text:string}>>({})
 const[editing,setEditing]=useState<any|null>(null);const[form,setForm]=useState<EditForm|null>(null);const[editBusy,setEditBusy]=useState(false);const[editMessage,setEditMessage]=useState('')
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
 const openEdit=(s:any)=>{setEditing(s);setForm(toForm(s));setEditMessage('')}
 const closeEdit=()=>{if(editBusy)return;setEditing(null);setForm(null);setEditMessage('')}
 const saveEdit=async()=>{
  if(!editing||!form)return
  if(form.estado==='cancelado'&&!form.motivo.trim()){setEditMessage('Indicá el motivo de la cancelación antes de guardar.');return}
  const tarifa=Number(String(form.tarifa).replace(',','.'))
  if(!Number.isFinite(tarifa)||tarifa<0){setEditMessage('La tarifa debe ser un importe válido.');return}
  setEditBusy(true);setEditMessage('')
  try{
   const descripcion=form.estado==='cancelado'&&form.motivo.trim()?`${form.descripcion.trim()}${form.descripcion.trim()?'\n\n':''}[ADMIN · CANCELACIÓN] ${form.motivo.trim()}`:form.descripcion.trim()
   await updateService(editing.id,{estado:form.estado,proveedor_id:form.proveedor_id||null,tarifa,descripcion,direccion_cliente:form.direccion_cliente.trim()})
   setEditMessage('Cambios guardados correctamente.')
   await refetch()
   setTimeout(()=>{setEditing(null);setForm(null);setEditMessage('')},500)
  }catch(err){setEditMessage(err instanceof Error?err.message:'No se pudieron guardar los cambios.')}
  finally{setEditBusy(false)}
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
    <div className="ugo-services-pro-control"><small>CONTROL ADMINISTRATIVO</small><div className="ugo-services-pro-control-row"><select aria-label={`Cambiar estado del servicio ${s.numero||s.id}`} value={draft} disabled={saving===id} onChange={e=>{setDrafts(d=>({...d,[id]:e.target.value as ServiceState}));setActionMessage(m=>{const copy={...m};delete copy[id];return copy})}}>{SERVICE_STATES.map(option=><option key={option} value={option}>{label(option)}</option>)}</select><button onClick={()=>{void changeStatus(s)}} disabled={!changed||saving===id}>{saving===id?'Guardando…':'Guardar estado'}</button><button className="secondary" onClick={()=>openEdit(s)}>Ver / Editar</button></div>{message&&<span className={`ugo-services-pro-feedback ${message.kind}`}>{message.text}</span>}</div>
   </article>
  })}</div>}
  {editing&&form&&<div className="ugo-operation-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)closeEdit()}}><section className="ugo-operation-modal" role="dialog" aria-modal="true" aria-label={`Editar servicio ${editing.numero||editing.id}`}>
   <header><div><small>OPERACIÓN #{editing.numero||'—'}</small><h2>Editar operación</h2><p>{editing.categoria?.emoji} {editing.categoria?.nombre||'Servicio'} · Cliente: {fullName(editing.cliente)}</p></div><button className="icon" onClick={closeEdit} aria-label="Cerrar">×</button></header>
   <div className="ugo-operation-summary"><div><small>CREADO</small><strong>{when(editing.created_at)}</strong></div><div><small>ÚLTIMA ACTUALIZACIÓN</small><strong>{when(editing.updated_at)}</strong></div><div><small>ESTADO ACTUAL</small><strong>{label(editing.estado)}</strong></div></div>
   <div className="ugo-operation-form-grid">
    <label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as ServiceState})}>{SERVICE_STATES.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
    <label>Proveedor<select value={form.proveedor_id} onChange={e=>setForm({...form,proveedor_id:e.target.value})}><option value="">Sin asignar</option>{providers.map(p=><option key={p.id} value={p.id}>{fullName(p)} · ⭐ {Number(p.karma||0).toFixed(1)}</option>)}</select></label>
    <label>Tarifa (R$)<input inputMode="decimal" value={form.tarifa} onChange={e=>setForm({...form,tarifa:e.target.value})}/></label>
    <label>Dirección<input value={form.direccion_cliente} onChange={e=>setForm({...form,direccion_cliente:e.target.value})}/></label>
    <label className="wide">Descripción<textarea rows={4} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})}/></label>
    {form.estado==='cancelado'&&<label className="wide danger">Motivo de cancelación<textarea rows={3} placeholder="Obligatorio para cancelar. Se agrega al registro de la operación." value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})}/></label>}
   </div>
   <div className="ugo-operation-audit"><strong>Actividad disponible</strong><p>Creado {when(editing.created_at)} · Última modificación {when(editing.updated_at)}. Los cambios de estado quedan reflejados por la fecha de actualización del servicio.</p></div>
   {editMessage&&<div className={`ugo-operation-message ${editMessage.includes('correctamente')?'ok':''}`}>{editMessage}</div>}
   <footer><button className="secondary" onClick={closeEdit} disabled={editBusy}>Cancelar</button><button onClick={()=>{void saveEdit()}} disabled={editBusy}>{editBusy?'Guardando…':'Guardar cambios'}</button></footer>
  </section></div>}
 </div>
}
