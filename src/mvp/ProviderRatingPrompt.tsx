import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{reportSentinelIncident}from'../lib/sentinel'

type CompletedService={id:string;numero:number|string|null;cliente_id:string;descripcion:string|null;completado_at:string|null}
type Target={service:CompletedService;clientName:string}

export function ProviderRatingPrompt({suspended=false}:{suspended?:boolean}={}){
 const supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[userId,setUserId]=useState(''),[target,setTarget]=useState<Target|null>(null),[score,setScore]=useState(0),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dismissed,setDismissed]=useState<string|null>(null),[channelEpoch,setChannelEpoch]=useState(0)
 const loadRef=useRef<()=>Promise<void>>(async()=>{})

 const load=useCallback(async()=>{
  const{data:{user}}=await supabase.auth.getUser();const uid=user?.id||'';setUserId(uid)
  if(!uid){setTarget(null);return}
  const{data:services,error:serviceError}=await supabase.from('servicios').select('id,numero,cliente_id,descripcion,completado_at').eq('proveedor_id',uid).eq('estado','completado').order('completado_at',{ascending:false,nullsFirst:false}).limit(12)
  if(serviceError)throw serviceError
  const rows=(services||[])as CompletedService[]
  if(!rows.length){setTarget(null);return}
  const ids=rows.map(row=>row.id)
  const{data:reviews,error:reviewError}=await supabase.from('resenas').select('servicio_id').eq('proveedor_id',uid).eq('autor_tipo','proveedor').in('servicio_id',ids)
  if(reviewError)throw reviewError
  const reviewed=new Set((reviews||[]).map(row=>String(row.servicio_id)))
  const service=rows.find(row=>!reviewed.has(row.id))||null
  if(!service){setTarget(null);return}
  const{data:client,error:clientError}=await supabase.from('usuarios').select('nombre').eq('id',service.cliente_id).maybeSingle()
  if(clientError)throw clientError
  setTarget({service,clientName:String(client?.nombre||'el cliente')})
 },[supabase])

 useEffect(()=>{loadRef.current=load},[load])
 useEffect(()=>{void load().catch(error=>{const text=error instanceof Error?error.message:'No pudimos cargar la calificación.';setMessage(text);void reportSentinelIncident({eventType:'provider_rating_load_error',message:text,error,role:'provider',severity:'P1',action:'provider.rating.sync',checklistCode:'RATING'})})},[load])
 useEffect(()=>{if(!userId)return;let alive=true,reconnectScheduled=false;const refresh=()=>{if(alive)void loadRef.current().catch(()=>{})};const reconnect=()=>{if(!alive||reconnectScheduled)return;reconnectScheduled=true;window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)};const onOnline=()=>{refresh();reconnect()};const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);const ch=supabase.channel(`provider-rating-${userId.slice(0,6)}-${channelEpoch}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'servicios',filter:`proveedor_id=eq.${userId}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reconnect()});return()=>{alive=false;window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}},[channelEpoch,supabase,userId])

 async function submit(e:React.FormEvent){
  e.preventDefault();if(!userId||!target||score<1||score>5||busy)return
  setBusy(true);setMessage('')
  const serviceId=target.service.id
  const{error}=await supabase.from('resenas').insert({servicio_id:serviceId,cliente_id:target.service.cliente_id,proveedor_id:userId,autor_tipo:'proveedor',puntuacion:score,comentario:comment.trim()||null})
  if(!error){setBusy(false);setScore(0);setComment('');setMessage('Gracias. La calificación del cliente quedó guardada.');window.setTimeout(()=>{setMessage('');void load()},900);return}
  const{data:persisted}=await supabase.from('resenas').select('id').eq('servicio_id',serviceId).eq('proveedor_id',userId).eq('autor_tipo','proveedor').maybeSingle()
  setBusy(false)
  if(persisted){setScore(0);setComment('');setMessage('Este servicio ya fue calificado.');window.setTimeout(()=>void load(),900);return}
  const text=error.message||'No se pudo guardar la calificación.'
  setMessage(text);void reportSentinelIncident({eventType:'provider_rating_submit_error',message:text,error,role:'provider',severity:'P1',serviceId,action:'provider.rating.submit',checklistCode:'RATING'})
 }

 if(suspended||!target||target.service.id===dismissed)return null
 const number=target.service.numero??target.service.id.slice(0,8)
 return <aside className="ugo-provider-rating" aria-label={`Calificar cliente del servicio ${number}`}>
  <button type="button" className="ugo-provider-rating-close" onClick={()=>setDismissed(target.service.id)} aria-label="Calificar más tarde">×</button>
  <small>SERVICIO FINALIZADO · #{number}</small>
  <h2>¿Cómo fue trabajar con {target.clientName}?</h2>
  <p>Calificá la experiencia con el cliente. Esto queda ligado al servicio y visible para Administración.</p>
  <form onSubmit={submit}>
   <div className="ugo-provider-rating-stars" role="radiogroup" aria-label="Puntuación de 1 a 5 estrellas">{[1,2,3,4,5].map(value=><button key={value} type="button" role="radio" aria-checked={score===value} aria-label={`${value} estrella${value===1?'':'s'}`} className={value<=score?'is-active':''} onClick={()=>setScore(value)}>★</button>)}</div>
   <label>Comentario <span>opcional</span><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} rows={2} placeholder="Puntualidad, trato, claridad del pedido…"/></label>
   {message&&<div className="ugo-provider-rating-message" role="status">{message}</div>}
   <div className="ugo-provider-rating-actions"><button type="submit" disabled={busy||score===0}>{busy?'Guardando…':'Enviar calificación'}</button><button type="button" onClick={()=>setDismissed(target.service.id)}>Ahora no</button></div>
  </form>
 </aside>
}

export default ProviderRatingPrompt
