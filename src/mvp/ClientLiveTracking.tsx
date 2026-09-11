import React,{Suspense,lazy,useCallback,useEffect,useMemo,useState}from'react'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{getRoleSupabase}from'../lib/roleSupabase'
import'./client-live-tracking.css'

const ClientActiveMap=lazy(()=>import('./ClientActiveMap').then(module=>({default:module.ClientActiveMap})))
type TrackedService={id:string;numero:number|string;estado:'asignado'|'pago_habilitado'|'en_camino'|'llegado';proveedor_id:string|null}
const TRACKABLE_STATES=['asignado','pago_habilitado','en_camino','llegado']

export function ClientLiveTracking(){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[service,setService]=useState<TrackedService|null>(null)
 const load=useCallback(async()=>{const{data:{user}}=await supabase.auth.getUser();if(!user){setService(null);return}const{data,error}=await supabase.from('servicios').select('id,numero,estado,proveedor_id').eq('cliente_id',user.id).in('estado',TRACKABLE_STATES).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error){setService(null);return}setService((data||null)as TrackedService|null)},[supabase])
 useEffect(()=>{let channel:RealtimeChannel|null=null,alive=true;const initial=window.setTimeout(()=>void load(),0);supabase.auth.getUser().then(({data})=>{if(!alive||!data.user)return;channel=supabase.channel(`client-live-tracking-${data.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`cliente_id=eq.${data.user.id}`},()=>void load()).subscribe()}).catch(()=>{});return()=>{alive=false;window.clearTimeout(initial);if(channel)supabase.removeChannel(channel)}},[load,supabase])
 if(!service||!service.proveedor_id)return null
 if(service.estado==='asignado')return <aside className="ugo-live-tracking is-compact" aria-live="polite"><div className="ugo-live-tracking-status"><span>✓</span><div><strong>Profesional asignado</strong><p>Elegí la forma de pago para habilitar el siguiente paso del servicio.</p></div></div></aside>
 if(service.estado==='pago_habilitado')return <aside className="ugo-live-tracking is-compact" aria-live="polite"><div className="ugo-live-tracking-status"><span>✓</span><div><strong>Servicio habilitado</strong><p>La forma de pago ya está resuelta. Cuando el profesional salga vas a ver su ruta y el tiempo estimado de llegada.</p></div></div></aside>
 if(service.estado==='llegado')return <aside className="ugo-live-tracking is-compact is-arrived" aria-live="polite"><div className="ugo-live-tracking-status"><span>📍</span><div><strong>El profesional llegó</strong><p>Ya está en el punto del servicio. El siguiente paso es validar el inicio del trabajo.</p></div></div></aside>
 return <aside className="ugo-live-tracking" aria-live="polite"><header><div><small>SERVICIO #{service.numero}</small><strong>Profesional en camino</strong><p>Seguimiento exacto sólo durante el traslado.</p></div><span className="ugo-live-dot">●</span></header><Suspense fallback={<div className="ugo-active-map-wrap"><div className="ugo-active-eta is-syncing"><small>Cargando mapa en vivo…</small></div></div>}><ClientActiveMap supabase={supabase} serviceId={service.id}/></Suspense></aside>
}
