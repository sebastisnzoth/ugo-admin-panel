import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-user-trace.css'

type User={id:string;nombre:string;apellido?:string|null;tipo:string;activo:boolean;email?:string|null;email_confirmed?:boolean;last_sign_in_at?:string|null;telefono?:string|null;ubicacion?:string|null;verification?:string|null;online?:boolean;karma?:number|null;servicios_completados?:number|null;created_at:string;updated_at?:string|null}
type Service={id:string;numero?:number|string|null;estado:string;descripcion?:string|null;tarifa?:number|null;created_at:string;programado_para?:string|null;aceptado_at?:string|null;iniciado_at?:string|null;completado_at?:string|null;cancelado_at?:string|null;cliente_id?:string|null;proveedor_id?:string|null;categoria?:{nombre?:string|null;emoji?:string|null}|null}
type Review={id:string;servicio_id:string;cliente_id:string;proveedor_id:string;autor_tipo:string;puntuacion:number;comentario:string|null;created_at:string}
type Document={id:string;tipo:string;url_storage:string;estado:string;descripcion:string|null;notas:string|null;notas_rechazo:string|null;created_at:string;updated_at:string|null;revisado_at:string|null;url?:string|null}
const when=(v?:string|null)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const money=(v?:number|null)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const stateLabel=(s:string)=>({borrador:'En preparación',buscando:'Buscando',ofrecido:'Ofrecido',asignado:'Asignado',en_camino:'En camino',llegado:'Llegó',en_progreso:'En curso',esperando_aprobacion:'Esperando aprobación',completado:'Completado',cancelado:'Cancelado',disputado:'En disputa'} as Record<string,string>)[s]||s.replaceAll('_',' ')

export function AdminUserTracePanel({user,onClose}:{user:User;onClose:()=>void}){
 const[loading,setLoading]=useState(true),[error,setError]=useState(''),[services,setServices]=useState<Service[]>([]),[reviews,setReviews]=useState<Review[]>([]),[documents,setDocuments]=useState<Document[]>([])
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const serviceQuery=(supabase as any).from('servicios').select('id,numero,estado,descripcion,tarifa,created_at,programado_para,aceptado_at,iniciado_at,completado_at,cancelado_at,cliente_id,proveedor_id,categoria:categorias(nombre,emoji)').or(`cliente_id.eq.${user.id},proveedor_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(150)
   const reviewQuery=(supabase as any).from('resenas').select('id,servicio_id,cliente_id,proveedor_id,autor_tipo,puntuacion,comentario,created_at').or(`cliente_id.eq.${user.id},proveedor_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(150)
   const docQuery=user.tipo==='proveedor'?(supabase as any).from('documentos').select('id,tipo,url_storage,estado,descripcion,notas,notas_rechazo,created_at,updated_at,revisado_at').eq('usuario_id',user.id).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null})
   const[{data:serviceRows,error:serviceError},{data:reviewRows,error:reviewError},{data:docRows,error:docError}]=await Promise.all([serviceQuery,reviewQuery,docQuery])
   const firstError=serviceError||reviewError||docError;if(firstError)throw firstError
   const signedDocs=await Promise.all(((docRows||[])as Document[]).map(async row=>{let url:string|null=null;for(const bucket of ['provider-kyc','documentos']){const{data,error}=await supabase.storage.from(bucket).createSignedUrl(row.url_storage,1800);if(!error&&data?.signedUrl){url=data.signedUrl;break}}return{...row,url}}))
   setServices((serviceRows||[])as Service[]);setReviews((reviewRows||[])as Review[]);setDocuments(signedDocs)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el historial del usuario.')}finally{setLoading(false)}
 },[user.id,user.tipo])
 useEffect(()=>{void load()},[load])

 const received=useMemo(()=>reviews.filter(r=>r.autor_tipo==='cliente'?r.proveedor_id===user.id:r.cliente_id===user.id),[reviews,user.id])
 const authored=useMemo(()=>reviews.filter(r=>r.autor_tipo==='cliente'?r.cliente_id===user.id:r.proveedor_id===user.id),[reviews,user.id])
 const avg=received.length?received.reduce((sum,r)=>sum+Number(r.puntuacion||0),0)/received.length:null
 return <div className="ugo-admin-user-trace-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
  <section className="ugo-admin-user-trace" role="dialog" aria-modal="true" aria-label={`Historial de ${user.nombre}`}>
   <header><div><small>FICHA COMPLETA · {user.tipo.toUpperCase()}</small><h2>{user.nombre} {user.apellido||''}</h2><p>{user.email||'Sin email'} · {user.activo?'Cuenta activa':'Cuenta inactiva'}</p></div><button onClick={onClose} aria-label="Cerrar">×</button></header>
   <div className="ugo-admin-user-trace-meta"><div><small>ALTA EN UGO</small><strong>{when(user.created_at)}</strong></div><div><small>ÚLTIMO ACCESO</small><strong>{when(user.last_sign_in_at)}</strong></div><div><small>ÚLTIMA ACTUALIZACIÓN</small><strong>{when(user.updated_at)}</strong></div><div><small>REPUTACIÓN RECIBIDA</small><strong>{avg==null?'Sin calificaciones':`★ ${avg.toFixed(1)} · ${received.length}`}</strong></div></div>
   <div className="ugo-admin-user-trace-facts"><span>Rol: <b>{user.tipo}</b></span><span>Teléfono: <b>{user.telefono||'—'}</b></span><span>Ubicación: <b>{user.ubicacion||'—'}</b></span>{user.tipo==='proveedor'&&<><span>Verificación: <b>{user.verification||'—'}</b></span><span>Disponibilidad: <b>{user.online?'Online':'Offline'}</b></span></>}</div>
   {error&&<div className="ugo-admin-user-trace-error">{error}</div>}
   {loading?<div className="ugo-admin-user-trace-loading">Cargando historial completo…</div>:<>
    <section className="ugo-admin-user-trace-section"><header><strong>Servicios vinculados</strong><span>{services.length}</span></header><div className="ugo-admin-user-services">{services.map(s=><article key={s.id}><div><small>{s.cliente_id===user.id?'COMO CLIENTE':'COMO PROVEEDOR'} · #{s.numero||s.id.slice(0,8)}</small><strong>{s.categoria?.emoji||'🧰'} {s.categoria?.nombre||'Servicio'}</strong><p>{s.descripcion||'Sin descripción'}</p></div><div><b>{stateLabel(s.estado)}</b><span>{money(s.tarifa)}</span><small>Pedido {when(s.created_at)}</small>{s.programado_para&&<small>Programado {when(s.programado_para)}</small>}{s.aceptado_at&&<small>Aceptado {when(s.aceptado_at)}</small>}{s.iniciado_at&&<small>Iniciado {when(s.iniciado_at)}</small>}{s.completado_at&&<small>Completado {when(s.completado_at)}</small>}{s.cancelado_at&&<small>Cancelado {when(s.cancelado_at)}</small>}</div></article>)}{!services.length&&<p className="empty">Sin servicios vinculados.</p>}</div></section>
    {user.tipo==='proveedor'&&<section className="ugo-admin-user-trace-section"><header><strong>Documentación</strong><span>{documents.length}</span></header><div className="ugo-admin-user-docs">{documents.map(d=><article key={d.id}><div><strong>{d.tipo.replaceAll('_',' ')}</strong><span>{d.estado}</span></div><small>Subido {when(d.created_at)}{d.revisado_at?` · Revisado ${when(d.revisado_at)}`:''}</small>{(d.notas_rechazo||d.notas||d.descripcion)&&<p>{d.notas_rechazo||d.notas||d.descripcion}</p>}{d.url&&<a href={d.url} target="_blank" rel="noreferrer">Ver documento</a>}</article>)}{!documents.length&&<p className="empty">Sin documentos registrados.</p>}</div></section>}
    <section className="ugo-admin-user-trace-section"><header><strong>Calificaciones</strong><span>{reviews.length}</span></header><div className="ugo-admin-user-ratings"><div><small>RECIBIDAS</small>{received.map(r=><article key={r.id}><strong>{'★'.repeat(r.puntuacion)}{'☆'.repeat(5-r.puntuacion)}</strong><p>{r.comentario||'Sin comentario'}</p><time>{when(r.created_at)}</time></article>)}{!received.length&&<p className="empty">Todavía no recibió calificaciones.</p>}</div><div><small>EMITIDAS</small>{authored.map(r=><article key={r.id}><strong>{'★'.repeat(r.puntuacion)}{'☆'.repeat(5-r.puntuacion)}</strong><p>{r.comentario||'Sin comentario'}</p><time>{when(r.created_at)}</time></article>)}{!authored.length&&<p className="empty">Todavía no emitió calificaciones.</p>}</div></div></section>
   </>}
  </section>
 </div>
}
