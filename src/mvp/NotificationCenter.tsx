import React,{useCallback,useEffect,useMemo,useState}from'react'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{getRoleSupabase}from'../lib/roleSupabase'
import'./notification-center.css'

export type UgoNotification={id:string;tipo:string;titulo:string;cuerpo:string|null;datos:Record<string,unknown>;leida_at:string|null;created_at:string}
type AppRole='client'|'provider'
type Props={role:AppRole;onOpenNotice?:(notice:UgoNotification)=>void}
type PushRpcClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:{message?:string}|null}>}
const VAPID_PUBLIC='BATyMzgDbJWBIkPdyVIBdsJmVSsf58lCsIN1ntWxsOXMFdW8dPiUQ83wbPsatHm3uje8RIPnU7K-LEjXmF9vNlA'
function vapidBytes(base64:string){const pad='='.repeat((4-base64.length%4)%4),raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
function b64(buffer:ArrayBuffer|null){if(!buffer)return'';const bytes=new Uint8Array(buffer);let s='';bytes.forEach(v=>s+=String.fromCharCode(v));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}

export function NotificationCenter({role,onOpenNotice}:Props){
 const db=useMemo(()=>getRoleSupabase(role),[role])
 const[uid,setUid]=useState<string|null>(null),[rows,setRows]=useState<UgoNotification[]>([]),[open,setOpen]=useState(false),[error,setError]=useState(''),[pushState,setPushState]=useState<'unsupported'|'off'|'on'|'blocked'|'loading'>('off')
 const load=useCallback(async(userId:string)=>{const{data,error}=await db.from('notificaciones').select('id,tipo,titulo,cuerpo,datos,leida_at,created_at').eq('usuario_id',userId).order('created_at',{ascending:false}).limit(30);if(error)throw error;setRows((data||[])as UgoNotification[])},[db])
 useEffect(()=>{let alive=true,channel:RealtimeChannel|null=null;db.auth.getSession().then(async({data})=>{const id=data.session?.user.id||null;if(!alive||!id)return;setUid(id);try{await load(id)}catch(e){if(alive)setError(e instanceof Error?e.message:'No se pudieron cargar las notificaciones.')}if(!alive)return;if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))setPushState('unsupported');else if(Notification.permission==='denied')setPushState('blocked');else try{const reg=await navigator.serviceWorker.ready;if(alive)setPushState((await reg.pushManager.getSubscription())?'on':'off')}catch{if(alive)setPushState('off')}if(!alive)return;channel=db.channel(`ugo-notices-${role}-${id}`).on('postgres_changes',{event:'*',schema:'public',table:'notificaciones',filter:`usuario_id=eq.${id}`},()=>void load(id)).subscribe()}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo iniciar el centro de notificaciones.')});return()=>{alive=false;if(channel)db.removeChannel(channel)}},[db,load,role])
 async function mark(id:string){if(!uid)return;const{error}=await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('id',id).eq('usuario_id',uid);if(error)throw error;await load(uid)}
 async function markAll(){if(!uid)return;setError('');try{const{error}=await db.from('notificaciones').update({leida_at:new Date().toISOString()}).eq('usuario_id',uid).is('leida_at',null);if(error)throw error;await load(uid)}catch(e){setError(e instanceof Error?e.message:'No se pudieron marcar las notificaciones.')}}
 async function openNotice(notice:UgoNotification){setError('');try{if(!notice.leida_at)await mark(notice.id);setOpen(false);onOpenNotice?.(notice)}catch(e){setError(e instanceof Error?e.message:'No se pudo abrir la notificación.')}}
 async function enablePush(){if(!uid||pushState==='loading'||pushState==='unsupported')return;setError('');setPushState('loading');try{const permission=await Notification.requestPermission();if(permission!=='granted'){setPushState(permission==='denied'?'blocked':'off');return}const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC)});const endpoint=sub.endpoint,p256dh=b64(sub.getKey('p256dh')),auth=b64(sub.getKey('auth'));const rpc=db as unknown as PushRpcClient;const{error}=await rpc.rpc('guardar_push_suscripcion',{p_endpoint:endpoint,p_p256dh:p256dh,p_auth:auth,p_user_agent:navigator.userAgent});if(error)throw new Error(error.message||'No se pudo guardar la suscripción push.');setPushState('on')}catch(e){setError(e instanceof Error?e.message:'No se pudo activar Web Push');setPushState('off')}}
 const unread=rows.filter(r=>!r.leida_at).length
 const icon=(t:string)=>t.includes('pago')?'💳':t.includes('oferta')?'⚡':t.includes('cancel')?'✕':t.includes('camino')||t.includes('llego')?'📍':t.includes('aprob')||t.includes('complet')?'✅':t.includes('disputa')?'🛡':'🔔'
 const pushLabel=pushState==='on'?'✓ Avisos activados':pushState==='loading'?'Activando…':pushState==='blocked'?'Avisos bloqueados':pushState==='unsupported'?'Push no disponible':'Activar avisos'
 return <div className={`ugo-notification-center role-${role}`}>
  <button type="button" aria-label={`Notificaciones UGO${unread?`, ${unread} sin leer`:''}`} className="ugo-notification-trigger" onClick={()=>setOpen(v=>!v)}>🔔{unread>0&&<b>{unread>99?'99+':unread}</b>}</button>
  {open&&<aside className="ugo-notification-panel" aria-label="Centro de notificaciones UGO">
   <header><strong>Notificaciones UGO</strong>{unread>0&&<button type="button" onClick={()=>void markAll()}>Marcar todas</button>}<button type="button" className="ugo-notification-close" onClick={()=>setOpen(false)} aria-label="Cerrar notificaciones">×</button></header>
   <div className="ugo-notification-push"><div><strong>Avisos fuera de la app</strong><span>Recibí cambios del servicio aunque UGO esté cerrado.</span></div><button type="button" disabled={pushState!=='off'} onClick={()=>void enablePush()}>{pushLabel}</button></div>
   <div className="ugo-notification-list">{error&&<div className="ugo-notification-error">{error}</div>}{rows.length===0&&!error&&<div className="ugo-notification-empty">Sin notificaciones todavía.</div>}{rows.map(n=><button type="button" key={n.id} className={n.leida_at?'':'is-unread'} onClick={()=>void openNotice(n)}><span className="ugo-notification-icon">{icon(n.tipo)}</span><span><strong>{n.titulo}</strong>{n.cuerpo&&<span>{n.cuerpo}</span>}<small>{new Date(n.created_at).toLocaleString('pt-BR')}</small></span></button>)}</div>
  </aside>}
 </div>
}
