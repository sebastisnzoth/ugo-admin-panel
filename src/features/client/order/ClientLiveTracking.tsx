import React,{Suspense,lazy,useCallback,useEffect,useMemo,useState}from'react'
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
 {key:'assigned',label:'Asignado'},
 {key:'accepted',label:'Aceptado'},
 {key:'route',label:'En camino'},
 {key:'arrived',label:'Llegó'},
 {key:'working',label:'Trabajando'},
 {key:'finished',label:'Finalizado'},
] as const
const STAGE_BY_STATE:Record<TrackedState,number>={asignado:1,en_camino:2,llegado:3,en_progreso:4,esperando_aprobacion:5,completado:5}

function StatusTimeline({state}:{state:TrackedState}){
 const current=STAGE_BY_STATE[state]
 return <ol className="ugo-client-status-timeline" aria-label="Seguimiento del profesional" data-service-state={state} data-current-stage={TIMELINE[current].key}>
  {TIMELINE.map((step,index)=><li key={step.key} className={index<current?'done':index===current?'current':''} aria-current={index===current?'step':undefined}><span>{index<current?'✓':index+1}</span><small>{step.label}</small></li>)}
 </ol>
}

export function ClientLiveTracking({serviceId=null,embedded=false}:{serviceId?:string|null;embedded?:boolean}={}){
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
 useEffect(()=>{let channel:RealtimeChannel|null=null,alive=true;const resync=()=>{if(alive)void load()};const onVisibility=()=>{if(document.visibilityState==='visible')resync()};const initial=window.setTimeout(resync,0);window.addEventListener('online',resync);document.addEventListener('visibilitychange',onVisibility);supabase.auth.getUser().then(({data})=>{if(!alive||!data.user)return;const filter=serviceId?`id=eq.${serviceId}`:`cliente_id=eq.${data.user.id}`;channel=supabase.channel(`client-live-tracking-${serviceId||data.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter},resync).on('postgres_changes',{event:'*',schema:'public',table:'pagos',...(serviceId?{filter:`servicio_id=eq.${serviceId}`}:{filter:`cliente_id=eq.${data.user.id}`})},resync).subscribe(status=>{if(status==='SUBSCRIBED')resync()})}).catch(()=>{});return()=>{alive=false;window.clearTimeout(initial);window.removeEventListener('online',resync);document.removeEventListener('visibilitychange',onVisibility);if(channel)void supabase.removeChannel(channel)}},[load,serviceId,supabase])
 if(!service||!service.proveedor_id)return null
 const rootClass=`ugo-live-tracking${embedded?' is-embedded':''}`
 const timeline=<StatusTimeline state={service.estado}/>
 if(service.estado==='asignado'){
  const cashSelected=payment?.metodo==='efectivo'
  const electronicConfirmed=Boolean(payment&&(payment.estado==='retenido'||payment.estado==='liberado')&&(payment.mp_payment_id||payment.pago_externo_id||payment.pix_e2e_id))
  const electronicPending=Boolean(payment&&!cashSelected&&!electronicConfirmed)
  const title=cashSelected?'Efectivo seleccionado':electronicConfirmed?'Pago confirmado':electronicPending?'Esperando confirmación del pago':'Profesional aceptó el pedido'
  const text=cashSelected?'La forma de pago ya está definida. Vas a ver el recorrido apenas el profesional inicie el viaje.':electronicConfirmed?'El pago electrónico quedó confirmado. Vas a ver el recorrido apenas el profesional inicie el viaje.':electronicPending?'Terminá el pago electrónico para habilitar la salida del profesional.':'El profesional ya está asignado y aceptó. Te avisamos cuando salga hacia tu dirección.'
  return <aside className={`${rootClass} is-assigned-map`} aria-live="polite"><header><div><small>SERVICIO #{service.numero}</small><strong>{title}</strong><p>{text}</p></div><span className="ugo-live-dot is-waiting">●</span></header>{timeline}<Suspense fallback={<div className="ugo-active-map-wrap"><div className="ugo-active-eta is-syncing"><small>Cargando mapa del profesional…</small></div></div>}><ClientActiveMap supabase={supabase} serviceId={service.id} phase="assigned"/></Suspense></aside>
 }
 if(service.estado==='llegado')return <aside className={`${rootClass} is-compact is-arrived`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>📍</span><div><strong>El profesional llegó</strong><p>Ya está en el punto del servicio. El siguiente paso es validar el inicio del trabajo.</p></div></div></aside>
 if(service.estado==='en_progreso')return <aside className={`${rootClass} is-compact is-working`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>🛠</span><div><strong>Trabajo en curso</strong><p>El profesional ya comenzó. El estado sigue sincronizado con este pedido.</p></div></div></aside>
 if(service.estado==='esperando_aprobacion')return <aside className={`${rootClass} is-compact is-finished`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>✓</span><div><strong>Trabajo finalizado</strong><p>El profesional terminó. Revisá el trabajo para aprobar, disputar o continuar con el cierre.</p></div></div></aside>
 if(service.estado==='completado')return <aside className={`${rootClass} is-compact is-completed`} aria-live="polite">{timeline}<div className="ugo-live-tracking-status"><span>✓</span><div><strong>Servicio completado</strong><p>El cierre quedó confirmado y guardado en tu historial.</p></div></div></aside>
 return <aside className={rootClass} aria-live="polite"><header><div><small>SERVICIO #{service.numero}</small><strong>Profesional en camino</strong><p>Seguimiento en vivo hasta tu dirección.</p></div><span className="ugo-live-dot">●</span></header>{timeline}<Suspense fallback={<div className="ugo-active-map-wrap"><div className="ugo-active-eta is-syncing"><small>Cargando mapa en vivo…</small></div></div>}><ClientActiveMap supabase={supabase} serviceId={service.id} phase="en_camino"/></Suspense></aside>
}
