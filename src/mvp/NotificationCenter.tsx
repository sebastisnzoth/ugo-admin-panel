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
const PROVIDER_ATTENTION_TYPES=new Set(['nueva_oferta','trabajo_asignado','chat_mensaje','servicio_completado','servicio_cancelado','servicio_disputado','pago_liberado','pago_efectivo_confirmado','agenda_recordatorio','agenda_salida'])
const CLIENT_ATTENTION_TYPES=new Set(['proveedor_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','servicio_cancelado','servicio_disputado','chat_mensaje'])
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
 const[uid,setUid]=useState<string|null>(null),[rows,setRows]=useState<UgoNotification[]>([]),[open,setOpen]=useState(false),[error,setError]=useState(''),[pushState,setPushState]=useState<'unsupported'|'off'|'on'|'blocked'|'loading'>('off'),[liveNotice,setLiveNotice]=useState<UgoNotification|null>(null),providerAlertSeen=useRef<Set<string>>(new Set()),clientAlertSeen=useRef<Set<string>>(new Set())
 const signalProviderAlert=useCallback((notice:UgoNotification)=>{if(role!=='provider'||!PROVIDER_ATTENTION_TYPES.has(notice.tipo)||providerAlertSeen.current.has(notice.id))return;if(PROVIDER_CALL_TYPES.has(notice.tipo)&&!attentionEnabled)return;providerAlertSeen.current.add(notice.id);setLiveNotice(notice);navigator.vibrate?.(PROVIDER_CALL_TYPES.has(notice.tipo)?[180,80,180,80,340]:[120,60,220]);playProviderTone()},[attentionEnabled,role])
 const signalClientAlert=useCallback((notice:UgoNotification)=>{if(role!=='client'||!attentionEnabled||!CLIENT_ATTENTION_TYPES.has(notice.tipo)||clientAlertSeen.current.has(notice.id))return;clientAlertSeen.current.add(notice.id);setLiveNotice(notice);navigator.vibrate?.([120,60,220]);playClientTone()},[attentionEnabled,role])
 useEffect(()=>{const arm=()=>{const ctx=role==='provider'?providerAudio():clientAudio();if(ctx?.state==='suspended')void ctx.resume().catch(()=>{})};window.addEventListener('pointerdown',arm,true);window.addEventListener('keydown',arm,true);return()=>{window.removeEventListener('pointerdown',arm,true);window.removeEventListener('keydown',arm,true)}},[role])
 const load=useCallback(async(userId:string)=>{const{data,error}=await db.from('notificaciones').select('id,tipo,titulo,cuerpo,datos,leida_at,created_at').eq('usuario_id',userId).order('created_at',{ascending:false}).limit(30);if(error)throw error;const next=(data||[])as UgoNotification[];setRows(next);if(role==='provider'){const pending=next.find(notice=>!notice.leida_at&&PROVIDER_ATTENTION_TYPES.has(notice.tipo));if(pending)signalProviderAlert(pending)}},[db,role,signalProviderAlert])
 const retireStalePush=useCallback(async(sub:PushSubscription|null)=>{if(!sub)return null;const currentKey=sub.options.applicationServerKey?b64(sub.options.applicationServerKey):'';if(currentKey===VAPID_PUBLIC)return sub;const rpc=db as unknown as PushRpcClient;const{error}=await rpc.rpc('desactivar_push_suscripcion',{p_endpoint:sub.endpoint});if(error)throw new Error(error.message||'No se pudo retirar la suscripción push anterior.');await sub.unsubscribe();return null},[db])
 useEffect(()=>{if(!liveNotice)return;const attention=role==='provider'&&PROVIDER_ATTENTION_TYPES.has(liveNotice.tipo),clientAttention=role==='client'&&CLIENT_ATTENTION_TYPES.has(liveNotice.tipo),providerTimeout=attention?30000:9000,timer=window.setTimeout(()=>setLiveNotice(null),clientAttention?18000:providerTimeout);return()=>window.clearTimeout(timer)},[liveNotice,role])
 useEffect(()=>{let alive=true,channel:RealtimeChannel|null=null;let currentId:string|null=null;const resync=()=>{if(alive&&currentId)void load(currentId).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudieron cargar las notificaciones.')})};const onVisibility=()=>{if(document.visibilityState==='visible')resync()};window.addEventListener('online',resync);document.addEventListener('visibilitychange',onVisibility);db.auth.getSession().then(async({data})=>{const id=data.session?.user.id||null;if(!alive||!id)return;currentId=id;setUid(id);try{await load(id)}catch(e){if(alive)setError(e instanceof Error?e.message:'No se pudieron cargar las notificaciones.')}if(!alive)return;if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))setPushState('unsupported');else if(Notification.permission==='denied')setPushState('blocked');else try{const reg=await navigator.serviceWorker.ready;const sub=await retireStalePush(await reg.pushManager.getSubscription());if(alive)setPushState(sub?'on':'off')}catch(e){if(alive){setPushState('off');setError(e instanceof Error?e.message:'No pudimos verificar los avisos del navegador.')}}if(!alive)return;channel=db.channel(`ugo-notices-${role}-${id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},payload=>{const notice=payload.new as unknown as UgoNotification;if(alive&&notice?.id){if(role==='provider'&&PROVIDER_ATTENTION_TYPES.has(notice.tipo))signalProviderAlert(notice);else if(role==='client'&&CLIENT_ATTENTION_TYPES.has(notice.tipo))signalClientAlert(notice);else setLiveNotice(notice);setError('')}resync()}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},resync).on('postgres_changes',{event:'DELETE',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},resync).subscribe(status=>{if(status==='SUBSCRIBED')resync()})}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo iniciar el centro de notificaciones.')});return()=>{alive=false;window.removeEventListener('online',resync);document.removeEventListener('visibilitychange',onVisibility);if(channel)void db.removeChannel(channel)}},[db,load,retireStalePush,role,signalClientAlert,signalProviderAlert])
 async function mark(id:string){if(!uid)return;const{error}=await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',id).eq('usuario_id',uid);if(error)throw error;await load(uid)}
 async function markAll(){if(!uid)return;setError('');try{const{error}=await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('usuario_id',uid).is('leida_at',null);if(error)throw error;await load(uid)}catch(e){setError(e instanceof Error?e.message:'No se pudieron marcar las notificaciones.')}}
 async function openNotice(notice:UgoNotification){setError('');try{if(!notice.leida_at)await mark(notice.id);setLiveNotice(null);setOpen(false);onOpenNotice?.(notice)}catch(e){setError(e instanceof Error?e.message:'No se pudo abrir la notificación.')}}
 async function enablePush(){if(!uid||pushState==='loading'||pushState==='unsupported')return;setError('');setPushState('loading');try{const permission=await Notification.requestPermission();if(permission!=='granted'){setPushState(permission==='denied'?'blocked':'off');return}const reg=await navigator.serviceWorker.ready;let sub=await retireStalePush(await reg.pushManager.getSubscription());if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC)});const endpoint=sub.endpoint,p256dh=b64(sub.getKey('p256dh')),auth=b64(sub.getKey('auth'));const rpc=db as unknown as PushRpcClient;const{error}=await rpc.rpc('guardar_push_suscripcion',{p_endpoint:endpoint,p_p256dh:p256dh,p_auth:auth,p_user_agent:navigator.userAgent});if(error)throw new Error(error.message||'No se pudo guardar la suscripción push.');setPushState('on')}catch(e){setError(e instanceof Error?e.message:'No se pudo activar Web Push');setPushState('off')}}
 const unread=rows.filter(r=>!r.leida_at).length
 const icon=(t:string)=>t.includes('chat')?'💬':t.includes('pago')?'💳':t.includes('oferta')||t.includes('asignado')?'⚡':t.includes('cancel')?'✕':t.includes('camino')||t.includes('llego')?'📍':t.includes('aprob')||t.includes('complet')?'✅':t.includes('disputa')?'🛡':'🔔'
 const pushLabel=pushState==='on'?'✓ Avisos activados':pushState==='loading'?'Activando…':pushState==='blocked'?'Avisos bloqueados':pushState==='unsupported'?'Push no disponible':'Activar avisos',providerCall=Boolean(liveNotice&&role==='provider'&&PROVIDER_CALL_TYPES.has(liveNotice.tipo)),providerAttention=Boolean(liveNotice&&role==='provider'&&PROVIDER_ATTENTION_TYPES.has(liveNotice.tipo)),clientCall=Boolean(liveNotice&&role==='client'&&CLIENT_ATTENTION_TYPES.has(liveNotice.tipo))
 return <div className={`ugo-notification-center role-${role}`}>
  <button type="button" aria-label={`Notificaciones UGO${unread?`, ${unread} sin leer`:''}`} className="ugo-notification-trigger" onClick={()=>setOpen(v=>!v)}>🔔{unread>0&&<b>{unread>99?'99+':unread}</b>}</button>
  {liveNotice&&<button type="button" className={`ugo-notification-live is-${role} ${providerCall?'is-provider-call':''}`} onClick={()=>void openNotice(liveNotice)} aria-live="assertive"><span className="ugo-notification-icon">{icon(liveNotice.tipo)}</span><span><small>{providerCall?'UGO · NUEVO PEDIDO':(clientCall||providerAttention)?(liveNotice.tipo==='chat_mensaje'?'UGO · MENSAJE NUEVO':'UGO · ACTUALIZACIÓN DEL PEDIDO'):'UGO · ACTUALIZACIÓN EN VIVO'}</small><strong>{liveNotice.titulo}</strong>{liveNotice.cuerpo&&<em>{liveNotice.cuerpo}</em>}<b>{providerCall?(liveNotice.tipo==='nueva_oferta'?'Ver y decidir →':'Abrir trabajo →'):'Ver pedido →'}</b></span></button>}
  {open&&<aside className="ugo-notification-panel" aria-label="Centro de notificaciones UGO">
   <header><strong>Notificaciones UGO</strong>{unread>0&&<button type="button" onClick={()=>void markAll()}>Marcar todas</button>}<button type="button" className="ugo-notification-close" onClick={()=>setOpen(false)} aria-label="Cerrar notificaciones">×</button></header>
   <div className="ugo-notification-push"><div><strong>Avisos fuera de la app</strong><span>Recibí cambios del servicio aunque UGO esté cerrado.</span></div><button type="button" disabled={pushState!=='off'} onClick={()=>void enablePush()}>{pushLabel}</button></div>
   <div className="ugo-notification-list">{error&&<div className="ugo-notification-error">{error}</div>}{rows.length===0&&!error&&<div className="ugo-notification-empty">Sin notificaciones todavía.</div>}{rows.map(n=><button type="button" key={n.id} className={n.leida_at?'':'is-unread'} onClick={()=>void openNotice(n)}><span className="ugo-notification-icon">{icon(n.tipo)}</span><span><strong>{n.titulo}</strong>{n.cuerpo&&<span>{n.cuerpo}</span>}<small>{new Date(n.created_at).toLocaleString('pt-BR')}</small></span></button>)}</div>
  </aside>}
 </div>
}
