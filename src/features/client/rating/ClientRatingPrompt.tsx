import React,{useCallback,useEffect,useRef,useState}from'react'
import{reportSentinelIncident}from'../../../lib/sentinel'
import{useRoleSession}from'../../../mvp/shared'
import{ServiceRatingError,submitServiceRating}from'../../ratings/serviceRatingService'
import'./clientRatingPrompt.css'

type CompletedService={id:string;numero:number|string|null;proveedor_id:string;descripcion:string|null;completado_at:string|null;updated_at:string|null}
type RatingTarget={service:CompletedService;providerName:string}
type Props={serviceId?:string|null;embedded?:boolean}
const shouldEscalate=()=>document.visibilityState==='visible'&&navigator.onLine

export function ClientRatingPrompt({serviceId=null,embedded=false}:Props={}){
 const{session,supabase}=useRoleSession('client'),userId=session?.user.id||null
 const[target,setTarget]=useState<RatingTarget|null>(null)
 const[score,setScore]=useState(0),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dismissed,setDismissed]=useState<string|null>(null),[channelEpoch,setChannelEpoch]=useState(0)
 const targetIdRef=useRef<string|null>(null)
 useEffect(()=>{targetIdRef.current=target?.service.id||null},[target?.service.id])

 const report=useCallback((eventType:string,text:string,error?:unknown,serviceId?:string)=>{const submit=eventType==='rating_submit_error';void reportSentinelIncident({eventType,message:text,error,role:'client',severity:'P1',serviceId:serviceId||targetIdRef.current||undefined,action:submit?'client.rating.submit':'client.rating.sync',checklistCode:submit?'RATING':undefined})},[])

 const load=useCallback(async()=>{
  if(!userId){setTarget(null);setMessage('');return}
  let servicesQuery=supabase.from('servicios').select('id,numero,proveedor_id,descripcion,completado_at,updated_at').eq('cliente_id',userId).eq('estado','completado').not('proveedor_id','is',null)
  servicesQuery=serviceId?servicesQuery.eq('id',serviceId).limit(1):servicesQuery.order('completado_at',{ascending:false,nullsFirst:false}).limit(12)
  const{data:services,error:serviceError}=await servicesQuery
  if(serviceError)throw serviceError
  const rows=(services||[])as CompletedService[]
  if(!rows.length){setTarget(null);return}
  const ids=rows.map(row=>row.id)
  const{data:reviews,error:reviewError}=await supabase.from('resenas').select('servicio_id').eq('cliente_id',userId).eq('autor_tipo','cliente').in('servicio_id',ids)
  if(reviewError)throw reviewError
  const reviewed=new Set((reviews||[]).map(row=>String(row.servicio_id)))
  const service=rows.find(row=>!reviewed.has(row.id))||null
  if(!service){setTarget(null);return}
  const{data:provider,error:providerError}=await supabase.from('usuarios').select('nombre').eq('id',service.proveedor_id).maybeSingle()
  if(providerError)throw providerError
  setTarget({service,providerName:String(provider?.nombre||'tu profesional')})
 },[serviceId,supabase,userId])
 const loadRef=useRef(load),reportRef=useRef(report)
 useEffect(()=>{loadRef.current=load},[load])
 useEffect(()=>{reportRef.current=report},[report])

 useEffect(()=>{void load().catch(error=>{if(!shouldEscalate())return;const text=error instanceof Error?error.message:'No pudimos cargar la calificación.';setMessage(text);report('rating_load_error',text,error)})},[load,report])
 useEffect(()=>{
  if(!userId)return
  let alive=true,reconnectScheduled=false
  const resync=()=>{if(alive)void loadRef.current().catch(error=>{if(shouldEscalate())reportRef.current('rating_resync_error',error instanceof Error?error.message:'No pudimos sincronizar la calificación.',error)})}
  const reconnect=()=>{if(!alive||reconnectScheduled)return;reconnectScheduled=true;window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)}
  const onVisibility=()=>{if(document.visibilityState==='visible')resync()}
  const onOnline=()=>{resync();reconnect()}
  window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility)
  const timer=window.setInterval(()=>{if(shouldEscalate())resync()},15000)
  const channel=supabase.channel(`client-rating-${userId.slice(0,6)}-${channelEpoch}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'servicios',filter:`cliente_id=eq.${userId}`},resync).on('postgres_changes',{event:'*',schema:'public',table:'resenas',filter:`cliente_id=eq.${userId}`},resync).subscribe(status=>{
   if(status==='SUBSCRIBED')resync()
   else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
    resync();reconnect()
    if(shouldEscalate())reportRef.current('rating_realtime_error',`Canal rating: ${status}`,undefined,targetIdRef.current||undefined)
   }
  })
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(channel)}
 },[channelEpoch,supabase,userId])

 const markSaved=useCallback((text='Gracias. Tu calificación quedó guardada.')=>{
  setMessage(text);setScore(0);setComment('');setDismissed(null)
  window.setTimeout(()=>{setMessage('');void loadRef.current()},900)
 },[])

 async function submit(e:React.FormEvent){
  e.preventDefault()
  if(!userId||!target||score<1||score>5||busy)return
  setBusy(true);setMessage('')
  const serviceId=target.service.id
  try{
   const result=await submitServiceRating(supabase,{userId,role:'client',serviceId,score,comment})
   setBusy(false)
   markSaved(result.status==='already_rated'?'Este servicio ya fue calificado.':'Gracias. Tu calificación quedó guardada.')
  }catch(error){
   setBusy(false)
   if(error instanceof ServiceRatingError&&error.code==='recovery_unverified'){
    const text='No pudimos confirmar si la calificación quedó guardada. Volvé a intentar más tarde.'
    setMessage(text);report('rating_submit_recovery_unverified',text,error,serviceId);return
   }
   const text=error instanceof Error?error.message:'No se pudo guardar la calificación.'
   setMessage(text);report('rating_submit_error',text,error,serviceId)
  }
 }

 if(!target||target.service.id===dismissed)return null
 const number=target.service.numero??target.service.id.slice(0,8)
 return <aside className={`ugo-client-rating ${embedded?'is-embedded':''}`} aria-label={`Calificar pedido ${number}`}>
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
