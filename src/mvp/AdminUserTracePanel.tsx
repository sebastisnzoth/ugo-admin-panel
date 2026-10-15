import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import{UserProfileAvatar}from'./UserProfileAvatar'
import'./admin-user-trace.css'

type User={id:string;nombre:string;apellido?:string|null;tipo:string;activo:boolean;foto_url?:string|null;foto_perfil_path?:string|null;profilePhotoRole?:'client'|'provider';email?:string|null;email_confirmed?:boolean;last_sign_in_at?:string|null;telefono?:string|null;ubicacion?:string|null;verification?:string|null;online?:boolean;karma?:number|null;servicios_completados?:number|null;created_at:string;updated_at?:string|null}
type Service={id:string;numero?:number|string|null;estado:string;descripcion?:string|null;tarifa?:number|null;created_at:string;programado_para?:string|null;aceptado_at?:string|null;iniciado_at?:string|null;completado_at?:string|null;cancelado_at?:string|null;cliente_id?:string|null;proveedor_id?:string|null;categoria?:{nombre?:string|null;emoji?:string|null}|null}
type Review={id:string;servicio_id:string;cliente_id:string;proveedor_id:string;autor_tipo:string;puntuacion:number;comentario:string|null;created_at:string}
type Document={id:string;tipo:string;url_storage:string;estado:string;descripcion:string|null;notas:string|null;notas_rechazo:string|null;created_at:string;updated_at:string|null;revisado_at:string|null;url?:string|null}
type AuditEntry={id:number|string;evento:string;actor_id:string|null;entidad_tipo:string|null;entidad_id:string|null;detalles:Record<string,unknown>|null;created_at:string}
const when=(v?:string|null)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const money=(v?:number|null)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const stateLabel=(s:string)=>({borrador:'En preparación',buscando:'Buscando',ofrecido:'Ofrecido',asignado:'Asignado',en_camino:'En camino',llegado:'Llegó',en_progreso:'En curso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado',disputado:'En disputa'} as Record<string,string>)[s]||s.replaceAll('_',' ')

export function AdminUserTracePanel({user,onClose,onSaved}:{user:User;onClose:()=>void;onSaved?:()=>void}){
 const[loading,setLoading]=useState(true),[error,setError]=useState(''),[services,setServices]=useState<Service[]>([]),[reviews,setReviews]=useState<Review[]>([]),[documents,setDocuments]=useState<Document[]>([]),[audits,setAudits]=useState<AuditEntry[]>([])
 const[editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[saveMessage,setSaveMessage]=useState('')
 const[baseDraft,setBaseDraft]=useState<Record<string,string>>({}),[detailDraft,setDetailDraft]=useState<Record<string,string>>({})
 const[originalBase,setOriginalBase]=useState<Record<string,string>>({}),[originalDetail,setOriginalDetail]=useState<Record<string,string>>({})
 const editableBase={nombre:'Nombre',apellido:'Apellido',telefono:'Teléfono',pais:'País (2 letras)',zona:'Zona',endereco:'Dirección'} as Record<string,string>
 const clientFields={telefono:'WhatsApp / teléfono',direccion:'Dirección',barrio:'Barrio',ciudad:'Ciudad',idioma_preferido:'Idioma',contacto_preferido:'Contacto preferido'} as Record<string,string>
 const providerFields={telefono_profesional:'WhatsApp profesional',ciudad_base:'Ciudad base',bio:'Presentación',especialidades:'Especialidades',disponibilidad_horaria:'Disponibilidad',experiencia_anos:'Experiencia (años)',zona_radio_km:'Radio (km)',tarifa_base:'Tarifa base (R$)'} as Record<string,string>
 const detailFields=user.tipo==='cliente'?clientFields:user.tipo==='proveedor'?providerFields:{} as Record<string,string>

 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const serviceQuery=(supabase as any).from('servicios').select('id,numero,estado,descripcion,tarifa,created_at,programado_para,aceptado_at,iniciado_at,completado_at,cancelado_at,cliente_id,proveedor_id,categoria:categorias(nombre,emoji)').or(`cliente_id.eq.${user.id},proveedor_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(150)
   const reviewQuery=(supabase as any).from('resenas').select('id,servicio_id,cliente_id,proveedor_id,autor_tipo,puntuacion,comentario,created_at').or(`cliente_id.eq.${user.id},proveedor_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(150)
   const docQuery=user.tipo==='proveedor'?(supabase as any).from('documentos').select('id,tipo,url_storage,estado,descripcion,notas,notas_rechazo,created_at,updated_at,revisado_at').eq('usuario_id',user.id).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null})
   const auditQuery=(supabase as any).from('audit_log').select('id,evento,actor_id,entidad_tipo,entidad_id,detalles,created_at').or(`entidad_id.eq.${user.id},actor_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(200)
   const userQuery=(supabase as any).from('usuarios').select('nombre,apellido,telefono,pais,zona,endereco').eq('id',user.id).single()
   const profileQuery=user.tipo==='cliente'?(supabase as any).from('perfiles_cliente').select('telefono,direccion,barrio,ciudad,idioma_preferido,contacto_preferido').eq('usuario_id',user.id).maybeSingle():user.tipo==='proveedor'?(supabase as any).from('perfiles_proveedor').select('telefono_profesional,ciudad_base,bio,especialidades,disponibilidad_horaria,experiencia_anos,zona_radio_km,tarifa_base').eq('usuario_id',user.id).maybeSingle():Promise.resolve({data:null,error:null})
   const[{data:serviceRows,error:serviceError},{data:reviewRows,error:reviewError},{data:docRows,error:docError},{data:auditRows,error:auditError},{data:userRow,error:userError},{data:profileRow,error:profileError}]=await Promise.all([serviceQuery,reviewQuery,docQuery,auditQuery,userQuery,profileQuery])
   const firstError=serviceError||reviewError||docError||auditError||userError||profileError;if(firstError)throw firstError
   const base=Object.fromEntries(Object.keys(editableBase).map(key=>[key,String(userRow?.[key]??'')]))
   const detail=Object.fromEntries(Object.keys(detailFields).map(key=>[key,String(profileRow?.[key]??'')]))
   setOriginalBase(base);setBaseDraft(base);setOriginalDetail(detail);setDetailDraft(detail)
   const signedDocs=await Promise.all(((docRows||[])as Document[]).map(async row=>{let url:string|null=null;for(const bucket of ['provider-kyc','documentos']){const{data,error}=await supabase.storage.from(bucket).createSignedUrl(row.url_storage,1800);if(!error&&data?.signedUrl){url=data.signedUrl;break}}return{...row,url}}))
   setServices((serviceRows||[])as Service[]);setReviews((reviewRows||[])as Review[]);setDocuments(signedDocs);setAudits((auditRows||[])as AuditEntry[])
  }catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el historial del usuario.')}finally{setLoading(false)}
 },[user.id,user.tipo])
 useEffect(()=>{void load()},[load])
 async function saveProfile(event:React.FormEvent){
   event.preventDefault();if(saving)return;setSaveMessage('')
   const diff=(draft:Record<string,string>,original:Record<string,string>)=>Object.fromEntries(Object.entries(draft).filter(([key,value])=>value!==original[key]))
   const base=diff(baseDraft,originalBase),detail=diff(detailDraft,originalDetail)
   if(!Object.keys(base).length&&!Object.keys(detail).length){setSaveMessage('No hay cambios pendientes.');return}
   setSaving(true)
   try{
     const {data:{session},error:sessionError}=await supabase.auth.getSession()
     if(sessionError||!session)throw new Error('Sesión administrativa requerida.')
     const response=await fetch('/api/operations?op=admin-update-profile',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({userId:user.id,base,detail})})
     const payload=await response.json().catch(()=>({}))
     if(!response.ok||!payload.saved)throw new Error(payload.error||'No se pudo actualizar el perfil.')
     setEditing(false);setSaveMessage('Cambios guardados y auditados en UGO TEST.');await load();onSaved?.()
   }catch(e){setSaveMessage(e instanceof Error?e.message:'No se pudo guardar el perfil.')}finally{setSaving(false)}
 }


 const received=useMemo(()=>reviews.filter(r=>r.autor_tipo==='cliente'?r.proveedor_id===user.id:r.cliente_id===user.id),[reviews,user.id])
 const authored=useMemo(()=>reviews.filter(r=>r.autor_tipo==='cliente'?r.cliente_id===user.id:r.proveedor_id===user.id),[reviews,user.id])
 const avg=received.length?received.reduce((sum,r)=>sum+Number(r.puntuacion||0),0)/received.length:null
 return <div className="ugo-admin-user-trace-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
  <section className="ugo-admin-user-trace" role="dialog" aria-modal="true" aria-label={`Historial de ${user.nombre}`}>
   <header><UserProfileAvatar name={user.nombre+' '+(user.apellido||'')} role={user.profilePhotoRole||(user.tipo==='proveedor'?'provider':'client')} photoPath={user.foto_perfil_path} photoUrl={user.foto_url} size={54}/><div><small>FICHA COMPLETA · {user.tipo.toUpperCase()}</small><h2>{user.nombre} {user.apellido||''}</h2><p>{user.email||'Sin email'} · {user.activo?'Cuenta activa':'Cuenta inactiva'}</p></div><button onClick={onClose} aria-label="Cerrar">×</button></header>
   <div className="ugo-admin-user-trace-meta"><div><small>ALTA EN UGO</small><strong>{when(user.created_at)}</strong></div><div><small>ÚLTIMO ACCESO</small><strong>{when(user.last_sign_in_at)}</strong></div><div><small>ÚLTIMA ACTUALIZACIÓN</small><strong>{when(user.updated_at)}</strong></div><div><small>REPUTACIÓN RECIBIDA</small><strong>{avg==null?'Sin calificaciones':`★ ${avg.toFixed(1)} · ${received.length}`}</strong></div></div>
   <div className="ugo-admin-user-trace-facts"><span>Rol: <b>{user.tipo}</b></span><span>Teléfono: <b>{user.telefono||'—'}</b></span><span>Ubicación: <b>{user.ubicacion||'—'}</b></span>{user.tipo==='proveedor'&&<><span>Verificación: <b>{user.verification||'—'}</b></span><span>Disponibilidad: <b>{user.online?'Online':'Offline'}</b></span></>}</div>
   <div className="ugo-admin-user-profile-editor" style={{padding:'16px',margin:'12px 0',border:'1px solid #d4dde4',borderRadius:16}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
     <strong>Datos del perfil</strong>
     <button type="button" onClick={()=>{setEditing(v=>!v);setSaveMessage('')}} disabled={loading||saving}>{editing?'Cancelar edición':'Editar datos'}</button>
    </div>
    <small>Los permisos, el email de acceso, la verificación KYC, las contraseñas y las cuentas financieras se administran por operaciones separadas.</small>
    {saveMessage&&<p role="status">{saveMessage}</p>}
    {editing&&<form onSubmit={saveProfile} style={{display:'grid',gap:12,marginTop:12}}>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
      {Object.entries(editableBase).map(([key,label])=><label key={key} style={{display:'grid',gap:4}}>{label}<input value={baseDraft[key]||''} maxLength={key==='pais'?2:255} onChange={event=>setBaseDraft(v=>({...v,[key]:event.target.value}))}/></label>)}
      {Object.entries(detailFields).map(([key,label])=><label key={key} style={{display:'grid',gap:4}}>{label}<input value={detailDraft[key]||''} maxLength={500} onChange={event=>setDetailDraft(v=>({...v,[key]:event.target.value}))}/></label>)}
     </div>
     <button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar cambios auditados'}</button>
    </form>}
   </div>
   {error&&<div className="ugo-admin-user-trace-error">{error}</div>}
   {loading?<div className="ugo-admin-user-trace-loading">Cargando historial completo…</div>:<>
    <section className="ugo-admin-user-trace-section"><header><strong>Servicios vinculados</strong><span>{services.length}</span></header><div className="ugo-admin-user-services">{services.map(s=><article key={s.id}><div><small>{s.cliente_id===user.id?'COMO CLIENTE':'COMO PROVEEDOR'} · #{s.numero||s.id.slice(0,8)}</small><strong>{s.categoria?.emoji||'🧰'} {s.categoria?.nombre||'Servicio'}</strong><p>{s.descripcion||'Sin descripción'}</p></div><div><b>{stateLabel(s.estado)}</b><span>{money(s.tarifa)}</span><small>Pedido {when(s.created_at)}</small>{s.programado_para&&<small>Programado {when(s.programado_para)}</small>}{s.aceptado_at&&<small>Aceptado {when(s.aceptado_at)}</small>}{s.iniciado_at&&<small>Iniciado {when(s.iniciado_at)}</small>}{s.completado_at&&<small>Completado {when(s.completado_at)}</small>}{s.cancelado_at&&<small>Cancelado {when(s.cancelado_at)}</small>}</div></article>)}{!services.length&&<p className="empty">Sin servicios vinculados.</p>}</div></section>
    {user.tipo==='proveedor'&&<section className="ugo-admin-user-trace-section"><header><strong>Documentación</strong><span>{documents.length}</span></header><div className="ugo-admin-user-docs">{documents.map(d=><article key={d.id}><div><strong>{d.tipo.replaceAll('_',' ')}</strong><span>{d.estado}</span></div><small>Subido {when(d.created_at)}{d.revisado_at?` · Revisado ${when(d.revisado_at)}`:''}</small>{(d.notas_rechazo||d.notas||d.descripcion)&&<p>{d.notas_rechazo||d.notas||d.descripcion}</p>}{d.url&&<a href={d.url} target="_blank" rel="noreferrer">Ver documento</a>}</article>)}{!documents.length&&<p className="empty">Sin documentos registrados.</p>}</div></section>}
    <section className="ugo-admin-user-trace-section"><header><strong>Acciones auditadas</strong><span>{audits.length}</span></header><div className="ugo-admin-user-services">{audits.map(a=><article key={a.id}><div><small>{a.actor_id===user.id?'ACCIÓN DEL USUARIO':'ACCIÓN SOBRE EL USUARIO'}</small><strong>{a.evento.replaceAll('_',' ').replaceAll('.',' · ')}</strong><p>{a.entidad_tipo||'evento'}{a.entidad_id?` · ${a.entidad_id}`:''}</p></div><div><small>{when(a.created_at)}</small>{a.detalles&&<small>{Object.entries(a.detalles).slice(0,4).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):String(v)}`).join(' · ')}</small>}</div></article>)}{!audits.length&&<p className="empty">Sin acciones auditadas vinculadas.</p>}</div></section>
    <section className="ugo-admin-user-trace-section"><header><strong>Calificaciones</strong><span>{reviews.length}</span></header><div className="ugo-admin-user-ratings"><div><small>RECIBIDAS</small>{received.map(r=><article key={r.id}><strong>{'★'.repeat(r.puntuacion)}{'☆'.repeat(5-r.puntuacion)}</strong><p>{r.comentario||'Sin comentario'}</p><time>{when(r.created_at)}</time></article>)}{!received.length&&<p className="empty">Todavía no recibió calificaciones.</p>}</div><div><small>EMITIDAS</small>{authored.map(r=><article key={r.id}><strong>{'★'.repeat(r.puntuacion)}{'☆'.repeat(5-r.puntuacion)}</strong><p>{r.comentario||'Sin comentario'}</p><time>{when(r.created_at)}</time></article>)}{!authored.length&&<p className="empty">Todavía no emitió calificaciones.</p>}</div></div></section>
   </>}
  </section>
 </div>
}
