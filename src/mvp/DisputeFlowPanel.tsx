import React,{useCallback,useEffect,useMemo,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'
import type{Service}from'./shared'
import'./dispute-flow.css'

type Role='client'|'provider'
type Dispute={id:string;numero?:number|null;servicio_id:string;estado:string;motivo:string;resolucion?:string|null;resolucion_favor?:string|null;monto_disputado?:number|null;ajuste_financiero_pendiente?:boolean|null;created_at:string}
type Message={id:number;autor_id:string|null;autor_rol:string;mensaje:string;evidencias:any;created_at:string}

const labels:Record<string,string>={abierta:'Abierta',en_revision:'En revisión',resuelta_cliente:'Resuelta a favor del cliente',resuelta_proveedor:'Resuelta a favor del proveedor',cerrada:'Cerrada'}
const canOpenStates=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','disputado']

export function DisputeFlowPanel({role,supabase,service,userId}:{role:Role;supabase:SupabaseClient;service:Service|null;userId:string}){
 const[dispute,setDispute]=useState<Dispute|null>(null),[messages,setMessages]=useState<Message[]>([]),[reason,setReason]=useState(''),[reply,setReply]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[open,setOpen]=useState(false)
 const load=useCallback(async()=>{
  if(!service?.id){setDispute(null);setMessages([]);return}
  const{data:d,error:de}=await supabase.from('disputas').select('id,numero,servicio_id,estado,motivo,resolucion,resolucion_favor,monto_disputado,ajuste_financiero_pendiente,created_at').eq('servicio_id',service.id).maybeSingle()
  if(de){setError(de.message);return}
  setDispute((d as Dispute|null)||null)
  if(d?.id){const{data:m}=await supabase.from('disputa_mensajes').select('id,autor_id,autor_rol,mensaje,evidencias,created_at').eq('disputa_id',d.id).order('created_at',{ascending:true});setMessages((m||[])as Message[])}else setMessages([])
 },[service?.id,supabase])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{if(!service?.id)return;const ch=supabase.channel(`dispute-${role}-${service.id}`).on('postgres_changes',{event:'*',schema:'public',table:'disputas'},load).on('postgres_changes',{event:'*',schema:'public',table:'disputa_mensajes'},load).subscribe();return()=>{supabase.removeChannel(ch)}},[service?.id,role,supabase,load])
 const resolved=Boolean(dispute&&['resuelta_cliente','resuelta_proveedor','cerrada'].includes(dispute.estado))
 const evidenceCount=useMemo(()=>messages.reduce((n,m)=>n+(Array.isArray(m.evidencias)?m.evidencias.length:0),0),[messages])
 const openDispute=async()=>{if(!service||reason.trim().length<8)return;setBusy(true);setError(null);const{error:e}=await supabase.rpc('abrir_disputa',{p_servicio_id:service.id,p_motivo:reason.trim(),p_evidencias:[]});setBusy(false);if(e){setError(e.message);return}setReason('');setOpen(false);await load()}
 const answer=async()=>{if(!dispute||!reply.trim())return;setBusy(true);setError(null);const{error:e}=await supabase.rpc('responder_disputa',{p_disputa_id:dispute.id,p_mensaje:reply.trim(),p_evidencias:[]});setBusy(false);if(e){setError(e.message);return}setReply('');await load()}
 if(!service||(!dispute&&!canOpenStates.includes(service.estado)))return null
 return <section className="ugo-dispute-flow">
  <header><div><small>PROTECCIÓN UGO</small><h3>{dispute?`Disputa #${dispute.numero||String(dispute.id).slice(0,8)}`:'¿Hay un problema con este servicio?'}</h3></div>{dispute&&<span className={`state ${dispute.estado}`}>{labels[dispute.estado]||dispute.estado}</span>}</header>
  {!dispute?<><p>Si el trabajo, el pago o el cumplimiento no coinciden con lo acordado, podés abrir una revisión administrativa. UGO congela el flujo mientras se revisa el caso.</p>{!open?<button className="secondary" onClick={()=>setOpen(true)}>Abrir disputa</button>:<div className="ugo-dispute-compose"><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explicá qué pasó y qué esperabas que sucediera…"/><div><button onClick={()=>setOpen(false)}>Cancelar</button><button className="danger" disabled={busy||reason.trim().length<8} onClick={openDispute}>{busy?'Abriendo…':'Enviar disputa'}</button></div></div></>:<>
   <div className="ugo-dispute-summary"><div><small>MOTIVO</small><p>{dispute.motivo}</p></div>{dispute.monto_disputado!=null&&<div><small>MONTO EN REVISIÓN</small><strong>R$ {Number(dispute.monto_disputado).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></div>}</div>
   <div className="ugo-dispute-thread">{messages.map(m=><article key={m.id} className={m.autor_id===userId?'mine':''}><div><b>{m.autor_rol==='admin'?'UGO Admin':m.autor_rol==='cliente'?'Cliente':'Proveedor'}</b><small>{new Date(m.created_at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div><p>{m.mensaje}</p>{Array.isArray(m.evidencias)&&m.evidencias.length>0&&<span>{m.evidencias.length} evidencia(s)</span>}</article>)}</div>
   {!resolved?<div className="ugo-dispute-compose"><textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder={role==='client'?'Agregar información para UGO y el proveedor…':'Responder al cliente y al equipo UGO…'}/><button className="primary" disabled={busy||!reply.trim()} onClick={answer}>{busy?'Enviando…':'Agregar respuesta'}</button></div>:<div className="ugo-dispute-resolution"><small>RESOLUCIÓN DE UGO</small><strong>{labels[dispute.estado]||'Caso resuelto'}</strong><p>{dispute.resolucion||'La disputa fue resuelta.'}</p>{dispute.ajuste_financiero_pendiente&&<span>El ajuste financiero todavía requiere conciliación.</span>}</div>}
   {evidenceCount>0&&<small className="ugo-dispute-evidence-count">{evidenceCount} evidencia(s) asociada(s) al caso</small>}
  </>}
  {error&&<div className="ugo-dispute-error">{error}</div>}
 </section>
}
