import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{getRoleSupabase}from'../lib/roleSupabase'
import'./notification-center.css'

export type UgoNotification={id:string;tipo:string;titulo:string;cuerpo:string|null;datos:Record<string,unknown>;leida_at:string|null;created_at:string}
type AppRole='client'|'provider'
type Props={role:AppRole;onOpenNotice?:(notice:UgoNotification)=>void;attentionEnabled?:boolean}
type PushRpcClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:{message?:string}|null}>}
const VAPID_PUBLIC='BPiPh1AzAkgiOv1lkTx0hW8X7UoP9NTnAJUWA7voNwMrwExQ7CCNC4Pbue6aH5AFkhy0xPzjIpcXv3uuou1YDyk'
function vapidBytes(base64:string){const pad='='.repeat((4-base64.length%4)%4),raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
function b64(buffer:ArrayBuffer|null){if(!buffer)return'';const bytes=new Uint8Array(buffer);let s='';bytes.forEach(v=>s+=String.fromCharCode(v));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
const PROVIDER_CALL_TYPES=new Set(['nueva_oferta','trabajo_asignado'])
const PROVIDER_ATTENTION_TYPES=new Set(['nueva_oferta','trabajo_asignado','chat_mensaje','servicio_completado','servicio_cancelado','servicio_disputado','pago_liberado','trabajo_aprobado','pago_efectivo_confirmado','agenda_recordatorio','agenda_salida'])
const CLIENT_ATTENTION_TYPES=new Set(['proveedor_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','servicio_cancelado','servicio_disputado','chat_mensaje','pago_efectivo_pendiente'])
const SERVICE_NOTICE_EXPECTED_STATE:Record<string,string>={proveedor_asignado:'asignado',trabajo_asignado:'asignado',proveedor_en_camino:'en_camino',proveedor_llego:'llegado',servicio_iniciado:'en_progreso',aprobacion_pendiente:'esperando_aprobacion',servicio_completado:'completado',trabajo_aprobado:'esperando_aprobacion',servicio_cancelado:'cancelado',servicio_disputado:'disputado'}
const noticeServiceId=(notice:UgoNotification)=>typeof notice.datos.servicio_id==='string'&&notice.datos.servicio_id.trim()?notice.datos.servicio_id.trim():null
const LEGACY_PROVIDER_OFFER_MAX_AGE_MS=6*60*1000
const NOTIFICATION_SAFETY_RESYNC_MS=20_000
const PUSH_READY_TIMEOUT_MS=5_000
function readyPushRegistration(){
 return new Promise<ServiceWorkerRegistration>((resolve,reject)=>{
  const timer=window.setTimeout(()=>reject(new Error('Los avisos Push todavía no están disponibles. Las alertas dentro de UGO siguen activas.')),PUSH_READY_TIMEOUT_MS)
  navigator.serviceWorker.ready.then(reg=>{window.clearTimeout(timer);resolve(reg)},error=>{window.clearTimeout(timer);reject(error)})
 })
}
function providerOfferNoticeActive(notice:UgoNotification,now=Date.now()){
 if(notice.tipo!=='nueva_oferta')return true
 const rawExpiry=notice.datos.expira_at
 if(typeof rawExpiry==='string'){const expiry=Date.parse(rawExpiry);if(Number.isFinite(expiry))return expiry>now}
 const created=Date.parse(notice.created_at)
 return Number.isFinite(created)&&now-created<=LEGACY_PROVIDER_OFFER_MAX_AGE_MS
}
type AudioWindow=Window&typeof globalThis&{webkitAudioContext?:typeof AudioContext}
let providerAudioContext:AudioContext|null=null
function providerAudio(){
 if(typeof window==='undefined')return null
 const Ctx=window.AudioContext||(window as AudioWindow).webkitAudioContext
 if(!Ctx)return null
 if(!providerAudioContext)providerAudioContext=new Ctx()
 return providerAudioContext
}
function emitProviderTone(ctx:AudioContext){
 const start=ctx.currentTime+.01
 ;[0,.22,.44].forEach((offset,index)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),at=start+offset;osc.type='sine';osc.frequency.setValueAtTime(index===1?740:920,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.16,at+.02);gain.gain.exponentialRampToValueAtTime(.0001,at+.17);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.18)})
}
function playProviderTone(){const ctx=providerAudio();if(!ctx)return;if(ctx.state==='running'){emitProviderTone(ctx);return}void ctx.resume().then(()=>emitProviderTone(ctx)).catch(()=>{})}
let clientAudioContext:AudioContext|null=null
function clientAudio(){
 if(typeof window==='undefined')return null
 const Ctx=window.AudioContext||(window as AudioWindow).webkitAudioContext
 if(!Ctx)return null
 if(!clientAudioContext)clientAudioContext=new Ctx()
 return clientAudioContext
}
function emitClientTone(ctx:AudioContext){
 const start=ctx.currentTime+.01
 ;[0,.18].forEach((offset,index)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),at=start+offset;osc.type='sine';osc.frequency.setValueAtTime(index===0?660:880,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.13,at+.02);gain.gain.exponentialRampToValueAtTime(.0001,at+.2);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.21)})
}
function playClientTone(){const ctx=clientAudio();if(!ctx)return;if(ctx.state==='running'){emitClientTone(ctx);return}void ctx.resume().then(()=>emitClientTone(ctx)).catch(()=>{})}


export function NotificationCenter({role,onOpenNotice,attentionEnabled=true}:Props){
 const db=useMemo(()=>getRoleSupabase(role),[role])
 const[uid,setUid]=useState<string|null>(null),[rows,setRows]=useState<UgoNotification[]>([]),[open,setOpen]=useState(false),[error,setError]=useState(''),[pushState,setPushState]=useState<'unsupported'|'off'|'on'|'blocked'|'loading'>('off'),[liveNotice,setLiveNotice]=useState<UgoNotification|null>(null),[channelEpoch,setChannelEpoch]=useState(0),providerAlertSeen=useRef<Set<string>>(new Set()),clientAlertSeen=useRef<Set<string>>(new Set())
 const signalProviderAlert=useCallback((notice:UgoNotification)=>{const offerId=notice.tipo==='nueva_oferta'&&typeof notice.datos.oferta_id==='string'?notice.datos.oferta_id:'';const alertKey=offerId?`offer:${offerId}`:notice.id;if(role!=='provider'||!PROVIDER_ATTENTION_TYPES.has(notice.tipo)||!providerOfferNoticeActive(notice)||providerAlertSeen.current.has(alertKey))return;if(PROVIDER_CALL_TYPES.has(notice.tipo)&&!attentionEnabled)return;providerAlertSeen.current.add(alertKey);setLiveNotice(notice);navigator.vibrate?.(PROVIDER_CALL_TYPES.has(notice.tipo)?[180,80,180,80,340]:[120,60,220]);playProviderTone()},[attentionEnabled,role])
 const signalClientAlert=useCallback((notice:UgoNotification)=>{if(role!=='client'||!attentionEnabled||!CLIENT_ATTENTION_TYPES.has(notice.tipo)||clientAlertSeen.current.has(notice.id))return;clientAlertSeen.current.add(notice.id);setLiveNotice(notice);navigator.vibrate?.([120,60,220]);playClientTone()},[attentionEnabled,role])
 useEffect(()=>{const arm=()=>{const ctx=role==='provider'?providerAudio():clientAudio();if(ctx?.state==='suspended')void ctx.resume().catch(()=>{})};window.addEventListener('pointerdown',arm,true);window.addEventListener('keydown',arm,true);return()=>{window.removeEventListener('pointerdown',arm,true);window.removeEventListener('keydown',arm,true)}},[role])
 const load=useCallback(async(userId:string,isCurrent:()=>boolean=()=>true)=>{const{data,error}=await db.from('notificaciones').select('id,tipo,titulo,cuerpo,datos,leida_at,created_at').eq('usuario_id',userId).order('created_at',{ascending:false}).limit(30);if(!isCurrent())return;if(error)throw error;const next=(data||[])as UgoNotification[],stateBound=next.filter(notice=>Boolean(SERVICE_NOTICE_EXPECTED_STATE[notice.tipo]));const actionable=new Set(next.map(notice=>notice.id)),stale=new Set<string>();if(stateBound.length){const serviceIds=[...new Set(stateBound.map(noticeServiceId).filter((value):value is string=>Boolean(value)))];if(serviceIds.length){const{data:serviceRows,error:serviceError}=await db.from('servicios').select('id,estado').in('id',serviceIds);if(!isCurrent())return;if(serviceError){stateBound.forEach(notice=>actionable.delete(notice.id))}else{const states=new Map((serviceRows||[]).map(row=>[String(row.id),String(row.estado)]));stateBound.forEach(notice=>{const serviceId=noticeServiceId(notice),expected=SERVICE_NOTICE_EXPECTED_STATE[notice.tipo],current=serviceId?states.get(serviceId):null;if(!serviceId||current!==expected){actionable.delete(notice.id);stale.add(notice.id)}})}}else stateBound.forEach(notice=>{actionable.delete(notice.id);stale.add(notice.id)})}if(stale.size){const retiredAt=new Date().toISOString(),staleIds=[...stale];setLiveNotice(current=>current&&stale.has(current.id)?null:current);setRows(next.map(notice=>stale.has(notice.id)&&!notice.leida_at?{...notice,leida_at:retiredAt}:notice));void db.from('notificaciones').update({leida_at:retiredAt}).eq('usuario_id',userId).in('id',staleIds).is('leida_at',null).then(({error:retireError})=>{if(retireError)console.warn('UGO stale notification retirement unavailable',retireError)})}else setRows(next);if(role==='provider'){const pending=next.find(notice=>!notice.leida_at&&actionable.has(notice.id)&&PROVIDER_ATTENTION_TYPES.has(notice.tipo)&&providerOfferNoticeActive(notice)&&!providerAlertSeen.current.has(notice.id)&&(!PROVIDER_CALL_TYPES.has(notice.tipo)||attentionEnabled));if(pending)signalProviderAlert(pending)}else if(role==='client'){const pending=next.find(notice=>!notice.leida_at&&actionable.has(notice.id)&&CLIENT_ATTENTION_TYPES.has(notice.tipo));if(pending)signalClientAlert(pending)}},[attentionEnabled,db,role,signalClientAlert,signalProviderAlert])
 const retireStalePush=useCallback(async(sub:PushSubscription|null)=>{if(!sub)return null;const currentKey=sub.options.applicationServerKey?b64(sub.options.applicationServerKey):'';if(currentKey===VAPID_PUBLIC)return sub;const rpc=db as unknown as PushRpcClient;const{error}=await rpc.rpc('desactivar_push_suscripcion',{p_endpoint:sub.endpoint});if(error)throw new Error(error.message||'No se pudo retirar la suscripción push anterior.');await sub.unsubscribe();return null},[db])
 useEffect(()=>{if(!liveNotice)return;const timer=window.setTimeout(()=>setLiveNotice(null),5000);return()=>window.clearTimeout(timer)},[liveNotice])
 useEffect(()=>{
  let alive=true,channel:RealtimeChannel|null=null,currentId:string|null=null,reconnectTimer:number|undefined
  let syncing=false,resyncAgain=false
  const resync=()=>{
   if(!alive||!currentId)return
   if(syncing){resyncAgain=true;return}
   syncing=true
   void load(currentId,()=>alive).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudieron cargar las notificaciones.')}).finally(()=>{
    syncing=false
    if(alive&&resyncAgain){resyncAgain=false;resync()}
   })
  }
  const reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)}
  const onVisibility=()=>{if(document.visibilityState==='visible')resync()}
  const onFocus=()=>resync()
  const onOnline=()=>{resync();reconnect()}
  window.addEventListener('online',onOnline)
  window.addEventListener('focus',onFocus)
  document.addEventListener('visibilitychange',onVisibility)
  const safetyTimer=window.setInterval(()=>{if(document.visibilityState==='visible')resync()},NOTIFICATION_SAFETY_RESYNC_MS)
  const initializePush=async()=>{
   if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){if(alive)setPushState('unsupported');return}
   if(Notification.permission==='denied'){if(alive)setPushState('blocked');return}
   try{
    const reg=await readyPushRegistration()
    if(!alive)return
    let sub=await retireStalePush(await reg.pushManager.getSubscription())
    if(!alive)return
    if(!sub&&Notification.permission==='granted'){
     sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC)})
     if(!alive)return
     const rpc=db as unknown as PushRpcClient
     const{error:savePushError}=await rpc.rpc('guardar_push_suscripcion',{p_endpoint:sub.endpoint,p_p256dh:b64(sub.getKey('p256dh')),p_auth:b64(sub.getKey('auth')),p_user_agent:navigator.userAgent})
     if(savePushError)throw new Error(savePushError.message||'No se pudo reparar la suscripción push.')
    }
    if(alive)setPushState(sub?'on':'off')
   }catch(e){if(alive){setPushState('off');setError(e instanceof Error?e.message:'No pudimos verificar los avisos del navegador.')}}
  }
  db.auth.getSession().then(({data})=>{
   const id=data.session?.user.id||null
   if(!alive||!id)return
   currentId=id;setUid(id)
   // Foreground delivery must never wait for Web Push or a SELECT response.
   channel=db.channel(`ugo-notices-${role}-${id}-${channelEpoch}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},payload=>{
     const notice=payload.new as unknown as UgoNotification
     if(!alive||!notice?.id)return
     setError('');setRows(current=>[notice,...current.filter(item=>item.id!==notice.id)].slice(0,30))
     if(role==='provider'&&!SERVICE_NOTICE_EXPECTED_STATE[notice.tipo])signalProviderAlert(notice)
     resync()
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},resync)
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},resync)
   if(role==='provider')channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'ofertas_servicio',filter:`proveedor_id=eq.${id}`},payload=>{
    const offer=payload.new as Record<string,unknown>,offerId=typeof offer.id==='string'?offer.id:''
    if(!alive||!offerId)return
    const serviceId=typeof offer.servicio_id==='string'?offer.servicio_id:'',expiresAt=typeof offer.expira_at==='string'?offer.expira_at:null,createdAt=typeof offer.created_at==='string'?offer.created_at:new Date().toISOString()
    signalProviderAlert({id:`offer:${offerId}`,tipo:'nueva_oferta',titulo:'Nuevo servicio en tu zona',cuerpo:'Tenés un nuevo pedido disponible.',datos:{role:'provider',oferta_id:offerId,servicio_id:serviceId,expira_at:expiresAt},leida_at:null,created_at:createdAt})
    resync()
   })
   channel.subscribe(status=>{if(status==='SUBSCRIBED')resync();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){resync();reconnect()}})
   resync()
   void initializePush()
  }).catch(e=>{if(alive){setError(e instanceof Error?e.message:'No se pudo iniciar el centro de notificaciones.');reconnect()}})
  return()=>{
   alive=false
   if(reconnectTimer)window.clearTimeout(reconnectTimer)
   window.clearInterval(safetyTimer)
   window.removeEventListener('online',onOnline)
   window.removeEventListener('focus',onFocus)
   document.removeEventListener('visibilitychange',onVisibility)
   if(channel)void db.removeChannel(channel)
  }
 },[channelEpoch,db,load,retireStalePush,role,signalClientAlert,signalProviderAlert])
 async function mark(id:string){if(!uid)return;const{error}=await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',id).eq('usuario_id',uid);if(error)throw error;await load(uid)}
 async function markAll(){if(!uid)return;setError('');try{const{error}=await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('usuario_id',uid).is('leida_at',null);if(error)throw error;await load(uid)}catch(e){setError(e instanceof Error?e.message:'No se pudieron marcar las notificaciones.')}}
 async function noticeStillActionable(notice:UgoNotification){
  if(role==='provider'&&notice.tipo==='nueva_oferta'&&!providerOfferNoticeActive(notice))return{ok:false,message:'Esta oferta ya venció. Actualizamos tus oportunidades para evitar una acción obsoleta.'}
  const expected=SERVICE_NOTICE_EXPECTED_STATE[notice.tipo]
  if(!expected)return{ok:true}
  const serviceId=noticeServiceId(notice)
  if(!serviceId)return{ok:false,message:'Esta notificación ya no tiene un servicio válido asociado.'}
  const{data,error}=await db.from('servicios').select('estado').eq('id',serviceId).maybeSingle()
  if(error)return{ok:false,message:'No pudimos validar el estado actual del servicio. Reintentá cuando vuelva la conexión.'}
  if(!data||String(data.estado)!==expected)return{ok:false,message:'El servicio ya cambió de estado. Abrí Mis servicios para ver la situación actual.'}
  return{ok:true}
 }
 async function openNotice(notice:UgoNotification){setError('');try{const actionable=await noticeStillActionable(notice);if(!notice.leida_at)await mark(notice.id);if(!actionable.ok){setLiveNotice(null);setOpen(false);setError(actionable.message||'Esta notificación ya no está disponible.');return}setLiveNotice(null);setOpen(false);onOpenNotice?.(notice)}catch(e){setError(e instanceof Error?e.message:'No se pudo abrir la notificación.')}}
 async function enablePush(){if(!uid||pushState==='loading'||pushState==='unsupported')return;setError('');setPushState('loading');try{const permission=await Notification.requestPermission();if(permission!=='granted'){setPushState(permission==='denied'?'blocked':'off');return}const reg=await readyPushRegistration();let sub=await retireStalePush(await reg.pushManager.getSubscription());if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC)});const endpoint=sub.endpoint,p256dh=b64(sub.getKey('p256dh')),auth=b64(sub.getKey('auth'));const rpc=db as unknown as PushRpcClient;const{error}=await rpc.rpc('guardar_push_suscripcion',{p_endpoint:endpoint,p_p256dh:p256dh,p_auth:auth,p_user_agent:navigator.userAgent});if(error)throw new Error(error.message||'No se pudo guardar la suscripción push.');setPushState('on')}catch(e){setError(e instanceof Error?e.message:'No se pudo activar Web Push');setPushState('off')}}
 const unread=rows.filter(r=>!r.leida_at).length
 const icon=(t:string)=>t.includes('chat')?'💬':t.includes('pago')?'💳':t.includes('oferta')||t.includes('asignado')?'⚡':t.includes('cancel')?'✕':t.includes('camino')||t.includes('llego')?'📍':t.includes('aprob')||t.includes('complet')?'✅':t.includes('disputa')?'🛡':'🔔'
 const pushLabel=pushState==='on'?'✓ Avisos activados':pushState==='loading'?'Activando…':pushState==='blocked'?'Avisos bloqueados':pushState==='unsupported'?'Push no disponible':'Activar avisos',providerCall=Boolean(liveNotice&&role==='provider'&&PROVIDER_CALL_TYPES.has(liveNotice.tipo)),providerAttention=Boolean(liveNotice&&role==='provider'&&PROVIDER_ATTENTION_TYPES.has(liveNotice.tipo)),clientCall=Boolean(liveNotice&&role==='client'&&CLIENT_ATTENTION_TYPES.has(liveNotice.tipo))
 return <div className={`ugo-notification-center role-${role}`}>
  <button type="button" aria-label={`Notificaciones UGO${unread?`, ${unread} sin leer`:''}`} className="ugo-notification-trigger" onClick={()=>setOpen(v=>!v)}>🔔{unread>0&&<b>{unread>99?'99+':unread}</b>}</button>
  
  {liveNotice&&<div role="button" tabIndex={0} className={`ugo-notification-live is-${role} ${providerCall?'is-provider-call':''}`} onClick={()=>void openNotice(liveNotice)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();void openNotice(liveNotice)}}} aria-live="assertive" aria-label={`${liveNotice.titulo}. Abrir notificación`}><span className="ugo-notification-icon">{icon(liveNotice.tipo)}</span><span><small>{providerCall?'UGO · NUEVO PEDIDO':(clientCall||providerAttention)?(liveNotice.tipo==='chat_mensaje'?'UGO · MENSAJE NUEVO':'UGO · ACTUALIZACIÓN DEL PEDIDO'):'UGO · ACTUALIZACIÓN EN VIVO'}</small><strong>{liveNotice.titulo}</strong>{liveNotice.cuerpo&&<em>{liveNotice.cuerpo}</em>}<b>{providerCall?(liveNotice.tipo==='nueva_oferta'?'Ver y decidir →':'Abrir trabajo →'):'Ver pedido →'}</b></span><button type="button" className="ugo-notification-live-close" aria-label="Cerrar notificación" onClick={event=>{event.stopPropagation();setLiveNotice(null)}}>×</button></div>}
  {open&&<aside className="ugo-notification-panel" aria-label="Centro de notificaciones UGO">
   <header><strong>Notificaciones UGO</strong>{unread>0&&<button type="button" onClick={()=>void markAll()}>Marcar todas</button>}<button type="button" className="ugo-notification-close" onClick={()=>setOpen(false)} aria-label="Cerrar notificaciones">×</button></header>
   <div className="ugo-notification-push"><div><strong>Avisos fuera de la app</strong><span>Recibí cambios del servicio aunque UGO esté cerrado.</span></div><button type="button" disabled={pushState!=='off'} onClick={()=>void enablePush()}>{pushLabel}</button></div>
   <div className="ugo-notification-list">{error&&<div className="ugo-notification-error">{error}</div>}{rows.length===0&&!error&&<div className="ugo-notification-empty">Sin notificaciones todavía.</div>}{rows.map(n=><button type="button" key={n.id} className={n.leida_at?'':'is-unread'} onClick={()=>void openNotice(n)}><span className="ugo-notification-icon">{icon(n.tipo)}</span><span><strong>{n.titulo}</strong>{n.cuerpo&&<span>{n.cuerpo}</span>}<small>{new Date(n.created_at).toLocaleString('pt-BR')}</small></span></button>)}</div>
  </aside>}
 </div>
}
