import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'

type Service={id:string;estado?:string|null;direccion_cliente?:string|null;cliente_id?:string|null;proveedor_id?:string|null;proveedor?:{nombre?:string|null;apellido?:string|null}|null}
type ChatMessage={id:number|string;emisor_id:string|null;emisor_rol:string;contenido:string;created_at:string}
type Dispute={id:string;numero:number|string|null;estado:string;motivo:string|null;monto_disputado:number|null;resolucion:string|null;resolucion_favor:string|null;abierta_por:string|null;created_at:string}
type DisputeMessage={id:number|string;disputa_id:string;autor_id:string;autor_rol:string;mensaje:string;evidencias:unknown;created_at:string}
type Location={lat_cliente:number|null;lng_cliente:number|null;proveedor_lat:number|null;proveedor_lng:number|null}
const when=(v?:string|null)=>v?new Date(v).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'
const money=(v:number|null)=>`R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const coords=(lat?:number|null,lng?:number|null)=>lat==null||lng==null?'Sin coordenadas':`${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
const providerName=(s:Service)=>[s.proveedor?.nombre,s.proveedor?.apellido].filter(Boolean).join(' ')||'Proveedor sin asignar'
const evidenceCount=(value:unknown)=>Array.isArray(value)?value.length:0

export function AdminServiceExtendedTrace({service}:{service:Service}){
 const[loading,setLoading]=useState(true),[error,setError]=useState(''),[warnings,setWarnings]=useState<string[]>([]),[messages,setMessages]=useState<ChatMessage[]>([]),[disputes,setDisputes]=useState<Dispute[]>([]),[disputeMessages,setDisputeMessages]=useState<DisputeMessage[]>([]),[location,setLocation]=useState<Location|null>(null),[actors,setActors]=useState<Record<string,string>>({})
 const load=useCallback(async()=>{
  setLoading(true);setError('');setWarnings([])
  try{
   const[messageResult,disputeResult,locationResult]=await Promise.all([
    (supabase as any).from('mensajes').select('id,emisor_id,emisor_rol,contenido,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('disputas').select('id,numero,estado,motivo,monto_disputado,resolucion,resolucion_favor,abierta_por,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    (supabase as any).from('mapa_operativo_servicios').select('lat_cliente,lng_cliente,proveedor_lat,proveedor_lng').eq('id',service.id).maybeSingle(),
   ])
   const warningList:string[]=[]
   if(messageResult.error)warningList.push('No se pudo leer el chat del servicio.')
   if(disputeResult.error)warningList.push('No se pudo leer el expediente de disputa.')
   if(locationResult.error)warningList.push('No se pudo leer la ubicación operativa.')
   const messageList=(messageResult.data||[])as ChatMessage[],disputeList=(disputeResult.data||[])as Dispute[]
   let disputeMessageList:DisputeMessage[]=[]
   if(disputeList.length){
    const{data,error:threadError}=await(supabase as any).from('disputa_mensajes').select('id,disputa_id,autor_id,autor_rol,mensaje,evidencias,created_at').in('disputa_id',disputeList.map(d=>d.id)).order('created_at',{ascending:true})
    if(threadError)warningList.push('No se pudieron leer los mensajes del expediente de disputa.');else disputeMessageList=(data||[])as DisputeMessage[]
   }
   const actorIds=Array.from(new Set([...messageList.map(m=>m.emisor_id),...disputeList.map(d=>d.abierta_por),...disputeMessageList.map(m=>m.autor_id),service.cliente_id,service.proveedor_id].filter(Boolean)))as string[]
   if(actorIds.length){const{data:userRows,error:userError}=await(supabase as any).from('usuarios').select('id,nombre,apellido').in('id',actorIds);if(userError)warningList.push('No se pudieron resolver todos los nombres de participantes.');else setActors(Object.fromEntries((userRows||[]).map((u:any)=>[u.id,[u.nombre,u.apellido].filter(Boolean).join(' ')||u.id.slice(0,8)])))}else setActors({})
   setMessages(messageList);setDisputes(disputeList);setDisputeMessages(disputeMessageList);setLocation((locationResult.data||null)as Location|null);setWarnings(warningList)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la trazabilidad extendida.')}finally{setLoading(false)}
 },[service.id,service.cliente_id,service.proveedor_id])
 useEffect(()=>{void load()},[load])
 return <div className="ugo-admin-extended-trace">
  <div className="ugo-admin-extended-trace-head"><strong>Comunicación, ubicación y reclamos</strong><button type="button" onClick={()=>void load()} disabled={loading}>{loading?'Actualizando…':'↻ Actualizar'}</button></div>
  {error&&<div className="ugo-admin-service-trace-error">{error}</div>}{!!warnings.length&&<div className="ugo-admin-service-trace-warning">{warnings.join(' ')}</div>}
  <section className="ugo-admin-location"><header><strong>Estado y ubicación</strong><span>{String(service.estado||'sin estado').replaceAll('_',' ')}</span></header><div><article><small>DESTINO DEL CLIENTE</small><strong>{service.direccion_cliente||'Dirección no informada'}</strong><code>{coords(location?.lat_cliente,location?.lng_cliente)}</code></article><article><small>ÚLTIMA UBICACIÓN PERSISTIDA DEL PROVEEDOR</small><strong>{providerName(service)}</strong><code>{coords(location?.proveedor_lat,location?.proveedor_lng)}</code></article></div><p>La posición mostrada es la última persistida disponible para Admin; no se presenta como GPS en tiempo real.</p></section>
  <section className="ugo-admin-chat-history"><header><strong>Chat del servicio</strong><span>{messages.length}</span></header><div>{messages.map(m=><article key={String(m.id)}><div><b>{actors[m.emisor_id||'']||m.emisor_rol}</b><span>{m.emisor_rol}</span><time>{when(m.created_at)}</time></div><p>{m.contenido}</p></article>)}{!messages.length&&<p className="empty">No hay mensajes guardados para este servicio.</p>}</div></section>
  <section className="ugo-admin-disputes"><header><strong>Disputas y reclamos</strong><span>{disputes.length}</span></header><div>{disputes.map(d=>{const thread=disputeMessages.filter(m=>m.disputa_id===d.id);return <article key={d.id}><div className="ugo-admin-dispute-summary"><div><small>CASO #{d.numero||d.id.slice(0,8)}</small><strong>{String(d.estado||'sin estado').replaceAll('_',' ')}</strong></div><div><small>ABIERTO</small><strong>{when(d.created_at)}</strong></div><div><small>MONTO</small><strong>{money(d.monto_disputado)}</strong></div></div><p><b>Motivo:</b> {d.motivo||'Sin motivo registrado.'}</p>{d.resolucion&&<p><b>Resolución{d.resolucion_favor?` · ${d.resolucion_favor}`:''}:</b> {d.resolucion}</p>}<div className="ugo-admin-dispute-thread">{thread.map(m=><div key={String(m.id)}><span>{actors[m.autor_id]||m.autor_rol} · {m.autor_rol} · {when(m.created_at)}</span><p>{m.mensaje}</p>{evidenceCount(m.evidencias)>0&&<small>{evidenceCount(m.evidencias)} evidencia(s) adjunta(s)</small>}</div>)}{!thread.length&&<small>Sin mensajes adicionales en el expediente.</small>}</div></article>})}{!disputes.length&&<p className="empty">Este servicio no tiene reclamos o disputas registrados.</p>}</div></section>
 </div>
}
