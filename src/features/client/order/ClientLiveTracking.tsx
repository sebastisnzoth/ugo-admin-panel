import{useLocale}from'../../../i18n/locale'
import React,{Suspense,lazy,useCallback,useEffect,useMemo,useState}from'react'
import{subscribeRealtimeChannel}from'../../../lib/realtimeChannel'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import'./clientLiveTracking.css'

const ClientActiveMap=lazy(()=>import('./ClientActiveMap').then(module=>({default:module.ClientActiveMap})))
type TrackedState='asignado'|'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion'|'completado'
type TrackedService={id:string;numero:number|string;estado:TrackedState;proveedor_id:string|null}
type TrackedPayment={metodo?:string|null;estado?:string|null;mp_payment_id?:string|null;pago_externo_id?:string|null;pix_e2e_id?:string|null}
const ACTIVE_TRACKING_STATES:TrackedState[]=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
const DETAIL_TRACKING_STATES:TrackedState[]=[...ACTIVE_TRACKING_STATES,'completado']
const TIMELINE=[
 {key:'assigned'},
 {key:'accepted'},
 {key:'route'},
 {key:'arrived'},
 {key:'working'},
 {key:'finished'},
] as const
const STAGE_BY_STATE:Record<TrackedState,number>={asignado:1,en_camino:2,llegado:3,en_progreso:4,esperando_aprobacion:5,completado:5}

function StatusTimeline({state}:{state:TrackedState}){
 const{t}=useLocale()
 const current=STAGE_BY_STATE[state]
 return <ol className="ugo-client-status-timeline" aria-label={t('clientTracking.timeline')} data-service-state={state} data-current-stage={TIMELINE[current].key}>
  {TIMELINE.map((step,index)=><li key={step.key} className={index<current?'done':index===current?'current':''} aria-current={index===current?'step':undefined}><span>{index<current?'✓':index+1}</span><small>{t('clientTracking.'+step.key)}</small></li>)}
 </ol>
}

export function ClientLiveTracking({serviceId=null,embedded=false}:{serviceId?:string|null;embedded?:boolean}={}){
 const{t}=useLocale();
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[service,setService]=useState<TrackedService|null>(null)
 const[payment,setPayment]=useState<TrackedPayment|null>(null)
 const load=useCallback(async()=>{
  const{data:{user}}=await supabase.auth.getUser();if(!user){setService(null);setPayment(null);return}
  let query=supabase.from('servicios').select('id,numero,estado,proveedor_id').eq('cliente_id',user.id)
  if(serviceId)query=query.eq('id',serviceId).in('estado',DETAIL_TRACKING_STATES)
  else query=query.in('estado',ACTIVE_TRACKING_STATES).order('created_at',{ascending:false}).limit(2)
  const{data,error}=await query
  if(error){setService(null);setPayment(null);return}
  const rows=(data||[])as TrackedService[]
  if(!serviceId&&rows.length!==1){setService(null);setPayment(null);return}
  const current=rows[0]||null
  if(!current){setService(null);setPayment(null);return}
  setService(current)
  const{data:p}=await supabase.from('pagos').select('metodo,estado,mp_payment_id,pago_externo_id,pix_e2e_id,created_at').eq('servicio_id',current.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
  setPayment((p||null)as TrackedPayment|null)
 },[serviceId,supabase])
 const[channelEpoch,setChannelEpoch]=useState(0)
 useEffect(()=>{let channel:RealtimeChannel|null=null,disposeChannel:(()=>void)|null=null,alive=true;const resync=()=>{if(alive)void load()};const onVisibility=()=>{if(document.visibilityState==='visible')resync()};const initial=window.setTimeout(resync,0);/* Realtime may silently miss an event: reconcile the owned service while visible. */const fallbackTimer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)resync()},10000);window.addEventListener('online',resync);document.addEventListener('visibilitychange',onVisibility);supabase.auth.getUser().then(({data})=>{if(!alive||!data.user)return;const filter=serviceId?`id=eq.${serviceId}`:`cliente_id=eq.${data.user.id}`;channel=supabase.channel(`client-live-tracking-${serviceId||data.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter},resync).on('postgres_changes',{event:'*',schema:'public',table:'pagos',...(serviceId?{filter:`servicio_id=eq.${serviceId}`}:{filter:`cliente_id=eq.${data.user.id}`})},resync);disposeChannel=subscribeRealtimeChannel(channel,supabase,{onSync:resync,onReconnect:()=>{if(alive)setChannelEpoch(v=>v+1)}})}).catch(()=>{});return()=>{alive=false;window.clearTimeout(initial);window.clearInterval(fallbackTimer);window.removeEventListener('online',resync);document.removeEventListener('visibilitychange',onVisibility);if(disposeChannel)disposeChannel();else if(channel)void supabase.removeChannel(channel)}},[load,serviceId,supabase,channelEpoch])
 if(!service||!service.proveedor_id)return null
 const rootClass=`ugo-live-tracking${embedded?' is-embedded':''}`
 const timeline=<StatusTimeline state={service.estado}/>
 if(service.estado==='asignado'){
  const cashSelected=payment?.metodo==='efectivo'
  const electronicConfirmed=Boolean(payment&&(payment.estado==='retenido'||payment.estado==='liberado')&&(payment.mp_payment_id||payment.pago_externo_id||payment.pix_e2e_id))
  const electronicPending=Boolean(payment&&!cashSelected&&!electronicConfirmed)
  const title=cashSelected?t('clientTracking.title.cash'):electronicConfirmed?t('clientTracking.title.paid'):electronicPending?t('clientTracking.title.waiting'):t('clientTracking.title.assigned')
  const text=cashSelected?t('clientTracking.text.cash'):electronicConfirmed?t('clientTracking.text.paid'):electronicPending?t('clientTracking.text.waiting'):t('clientTracking.text.assigned')
  return <aside className={`${rootClass} is-assigned-map`} aria-live="polite"><header><div><small>{t('clientTracking.service')}{service.numero}</small><strong>{title}</strong><p>{text}</p></div><span className="ugo-live-dot is-waiting">●</span></header>{timeline}<Suspense fallback={<div className="ugo-active-map-wrap"><div className="ugo-active-eta is-syncing"><small>{t('screen.client_tracking.1')}</small></div></div>}><ClientActiveMap supabase={supabase} serviceId={service.id} phase="assigned"/></Suspense></aside>
 }
 if(service.estado==='llegado')return <aside className={`${rootClass} is-compact is-arrived`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>📍</span><div><strong>{t('screen.client_tracking.2')}</strong><p>{t('screen.client_tracking.3')}</p></div></div></aside>
 if(service.estado==='en_progreso')return <aside className={`${rootClass} is-compact is-working`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>🛠</span><div><strong>{t('screen.client_tracking.4')}</strong><p>{t('screen.client_tracking.5')}</p></div></div></aside>
 if(service.estado==='esperando_aprobacion')return <aside className={`${rootClass} is-compact is-finished`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>✓</span><div><strong>{t('screen.client_tracking.6')}</strong><p>{t('screen.client_tracking.7')}</p></div></div></aside>
 if(service.estado==='completado')return <aside className={`${rootClass} is-compact is-completed`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>✓</span><div><strong>{t('screen.client_tracking.8')}</strong><p>{t('screen.client_tracking.9')}</p></div></div></aside>
 return <aside className={rootClass} aria-live="polite"><header><div><small>{t('clientTracking.service')}{service.numero}</small><strong>{t('screen.client_tracking.10')}</strong><p>{t('screen.client_tracking.11')}</p></div><span className="ugo-live-dot">●</span></header>{timeline}<Suspense fallback={<div className="ugo-active-map-wrap"><div className="ugo-active-eta is-syncing"><small>{t('screen.client_tracking.12')}</small></div></div>}><ClientActiveMap supabase={supabase} serviceId={service.id} phase="en_camino"/></Suspense></aside>
}
