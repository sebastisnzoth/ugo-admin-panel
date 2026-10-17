import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import{useLocale}from'../i18n/locale'
import{getRoleSupabase}from'../lib/roleSupabase'
import{reportSentinelIncident}from'../lib/sentinel'
import{ServiceRatingError,submitServiceRating}from'../features/ratings/serviceRatingService'

type CompletedService={id:string;numero:number|string|null;cliente_id:string;descripcion:string|null;completado_at:string|null}
type Target={service:CompletedService;clientName:string}

export function ProviderRatingPrompt({suspended=false,serviceId=null,embedded=false}:{suspended?:boolean;serviceId?:string|null;embedded?:boolean}={}){
 const{t}=useLocale()
 const supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[userId,setUserId]=useState(''),[target,setTarget]=useState<Target|null>(null),[score,setScore]=useState(0),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dismissed,setDismissed]=useState<string|null>(null),[channelEpoch,setChannelEpoch]=useState(0)
 const loadRef=useRef<()=>Promise<void>>(async()=>{})

 const load=useCallback(async()=>{
  const{data:{user}}=await supabase.auth.getUser();const uid=user?.id||'';setUserId(uid)
  if(!uid){setTarget(null);return}
  let servicesQuery=supabase.from('servicios').select('id,numero,cliente_id,descripcion,completado_at').eq('proveedor_id',uid).eq('estado','completado')
  servicesQuery=serviceId?servicesQuery.eq('id',serviceId).limit(1):servicesQuery.order('completado_at',{ascending:false,nullsFirst:false}).limit(12)
  const{data:services,error:serviceError}=await servicesQuery
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
 },[serviceId,supabase])

 useEffect(()=>{loadRef.current=load},[load])
 useEffect(()=>{void load().catch(error=>{const text=error instanceof Error?error.message:t('providerRate.loadFailed');setMessage(text);void reportSentinelIncident({eventType:'provider_rating_load_error',message:text,error,role:'provider',severity:'P1',action:'provider.rating.sync',checklistCode:'RATING'})})},[load,t])
 useEffect(()=>{if(!userId)return;let alive=true,reconnectScheduled=false;const refresh=()=>{if(alive)void loadRef.current().catch(()=>{})};const reconnect=()=>{if(!alive||reconnectScheduled)return;reconnectScheduled=true;window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)};const onOnline=()=>{refresh();reconnect()};const onVisibility=()=>{if(document.visibilityState==='visible'){refresh();reconnect()}};window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);const ch=supabase.channel(`provider-rating-${userId.slice(0,6)}-${channelEpoch}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'servicios',filter:`proveedor_id=eq.${userId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'resenas',filter:`proveedor_id=eq.${userId}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){refresh();reconnect()}});return()=>{alive=false;window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}},[channelEpoch,supabase,userId])

 async function submit(e:React.FormEvent){
  e.preventDefault();if(!userId||!target||score<1||score>5||busy)return
  setBusy(true);setMessage('')
  const serviceId=target.service.id
  try{
   const result=await submitServiceRating(supabase,{userId,role:'provider',serviceId,score,comment})
   setBusy(false);setScore(0);setComment('');setMessage(result.status==='already_rated'?t('providerRate.already'):t('providerRate.thanks'));window.setTimeout(()=>{setMessage('');void load()},900)
  }catch(error){
   setBusy(false)
   const text=error instanceof ServiceRatingError&&error.code==='recovery_unverified'?t('providerRate.recovery'):error instanceof Error?error.message:t('providerRate.saveFailed')
   setMessage(text);void reportSentinelIncident({eventType:error instanceof ServiceRatingError&&error.code==='recovery_unverified'?'provider_rating_recovery_unverified':'provider_rating_submit_error',message:text,error,role:'provider',severity:'P1',serviceId,action:error instanceof ServiceRatingError&&error.code==='recovery_unverified'?'provider.rating.sync':'provider.rating.submit',checklistCode:error instanceof ServiceRatingError&&error.code==='recovery_unverified'?undefined:'RATING'})
  }
 }

 if(suspended||!target||target.service.id===dismissed)return null
 const number=target.service.numero??target.service.id.slice(0,8)
 return <aside className={`ugo-provider-rating${embedded?' is-embedded':''}`} aria-label={t('providerRate.label',{number})}>
  <button type="button" className="ugo-provider-rating-close" onClick={()=>setDismissed(target.service.id)} aria-label={t('providerRate.later')}>×</button>
  <small>{t('providerRate.finished',{number})}</small>
  <h2>{t('providerRate.question',{client:target.clientName})}</h2>
  <p>{t('providerRate.help')}</p>
  <form onSubmit={submit}>
   <div className="ugo-provider-rating-stars" role="radiogroup" aria-label={t('providerRate.score')}>{[1,2,3,4,5].map(value=><button key={value} type="button" role="radio" aria-checked={score===value} aria-label={t('providerRate.star',{count:value})} className={value<=score?'is-active':''} onClick={()=>setScore(value)}>★</button>)}</div>
   <label>{t('providerRate.comment')} <span>{t('providerRate.optional')}</span><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} rows={2} placeholder={t('providerRate.placeholder')}/></label>
   {message&&<div className="ugo-provider-rating-message" role="status">{message}</div>}
   <div className="ugo-provider-rating-actions"><button type="submit" disabled={busy||score===0}>{busy?t('providerRate.saving'):t('providerRate.send')}</button><button type="button" onClick={()=>setDismissed(target.service.id)}>{t('providerRate.now')}</button></div>
  </form>
 </aside>
}

export default ProviderRatingPrompt
