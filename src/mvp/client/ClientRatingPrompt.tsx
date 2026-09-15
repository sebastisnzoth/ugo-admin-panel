import React,{useCallback,useEffect,useState}from'react'
import{reportSentinelIncident}from'../../lib/sentinel'
import{useRoleSession}from'../shared'
import'./client-rating-prompt.css'

type CompletedService={id:string;numero:number|string|null;proveedor_id:string;descripcion:string|null;completado_at:string|null;updated_at:string|null}

type RatingTarget={service:CompletedService;providerName:string}

export function ClientRatingPrompt(){
 const{session,supabase}=useRoleSession('client')
 const[target,setTarget]=useState<RatingTarget|null>(null)
 const[score,setScore]=useState(0),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dismissed,setDismissed]=useState<string|null>(null)

 const report=useCallback((eventType:string,text:string,error?:unknown,serviceId?:string)=>{void reportSentinelIncident({eventType,message:text,error,role:'client',severity:'P1',serviceId:serviceId||target?.service.id,action:'client.rating',checklistCode:'RATING'})},[target?.service.id])

 const load=useCallback(async()=>{
  if(!session){setTarget(null);return}
  const{data:services,error:serviceError}=await supabase.from('servicios').select('id,numero,proveedor_id,descripcion,completado_at,updated_at').eq('cliente_id',session.user.id).eq('estado','completado').not('proveedor_id','is',null).order('completado_at',{ascending:false,nullsFirst:false}).limit(12)
  if(serviceError)throw serviceError
  const rows=(services||[])as CompletedService[]
  if(!rows.length){setTarget(null);return}
  const ids=rows.map(row=>row.id)
  const{data:reviews,error:reviewError}=await supabase.from('resenas').select('servicio_id').eq('cliente_id',session.user.id).in('servicio_id',ids)
  if(reviewError)throw reviewError
  const reviewed=new Set((reviews||[]).map(row=>String(row.servicio_id)))
  const service=rows.find(row=>!reviewed.has(row.id))||null
  if(!service){setTarget(null);return}
  const{data:provider,error:providerError}=await supabase.from('usuarios').select('nombre').eq('id',service.proveedor_id).maybeSingle()
  if(providerError)throw providerError
  setTarget({service,providerName:String(provider?.nombre||'tu profesional')})
 },[session,supabase])

 useEffect(()=>{void load().catch(error=>{const text=error instanceof Error?error.message:'No pudimos cargar la calificación.';setMessage(text);report('rating_load_error',text,error)})},[load,report])
 useEffect(()=>{
  if(!session)return
  let alive=true
  const resync=()=>{if(alive)void load().catch(error=>report('rating_resync_error',error instanceof Error?error.message:'No pudimos sincronizar la calificación.',error))}
  const onVisibility=()=>{if(document.visibilityState==='visible')resync()}
  window.addEventListener('online',resync);document.addEventListener('visibilitychange',onVisibility)
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)resync()},15000)
  let channel=supabase.channel(`client-rating-${session.user.id.slice(0,6)}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'servicios',filter:`cliente_id=eq.${session.user.id}`},resync).subscribe(status=>{if(status==='SUBSCRIBED')resync();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')report('rating_realtime_error',`Canal rating: ${status}`,undefined,target?.service.id)})
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('online',resync);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(channel)}
 },[load,report,session,supabase,target?.service.id])

 async function submit(e:React.FormEvent){
  e.preventDefault()
  if(!session||!target||score<1||score>5||busy)return
  setBusy(true);setMessage('')
  const{error}=await supabase.from('resenas').insert({servicio_id:target.service.id,cliente_id:session.user.id,proveedor_id:target.service.proveedor_id,puntuacion:score,comentario:comment.trim()||null})
  setBusy(false)
  if(error){const text=error.code==='23505'?'Este servicio ya fue calificado.':error.message;setMessage(text);report('rating_submit_error',text,error,target.service.id);if(error.code==='23505')void load();return}
  setMessage('Gracias. Tu calificación quedó guardada.')
  setScore(0);setComment('');setDismissed(null)
  window.setTimeout(()=>{setMessage('');void load()},900)
 }

 if(!target||target.service.id===dismissed)return null
 const number=target.service.numero??target.service.id.slice(0,8)
 return <aside className="ugo-client-rating" aria-label={`Calificar pedido ${number}`}>
  <button type="button" className="ugo-client-rating-close" onClick={()=>setDismissed(target.service.id)} aria-label="Calificar más tarde">×</button>
  <small>SERVICIO FINALIZADO · PEDIDO #{number}</small>
  <h2>¿Cómo te fue con {target.providerName}?</h2>
  <p>Tu experiencia ayuda a mantener la calidad de UGO.</p>
  <form onSubmit={submit}>
   <div className="ugo-client-rating-stars" role="radiogroup" aria-label="Puntuación de 1 a 5 estrellas">{[1,2,3,4,5].map(value=><button key={value} type="button" role="radio" aria-checked={score===value} aria-label={`${value} estrella${value===1?'':'s'}`} className={value<=score?'is-active':''} onClick={()=>setScore(value)}>★</button>)}</div>
   <label>Comentario <span>opcional</span><textarea value={comment} onChange={event=>setComment(event.target.value)} maxLength={500} rows={2} placeholder="Contanos brevemente cómo salió el trabajo"/></label>
   {message&&<p className="ugo-client-rating-message" role="status">{message}</p>}
   <div className="ugo-client-rating-actions"><button type="submit" disabled={busy||score===0}>{busy?'Guardando…':'Enviar calificación'}</button><button type="button" onClick={()=>setDismissed(target.service.id)}>Ahora no</button></div>
  </form>
 </aside>
}

export default ClientRatingPrompt
