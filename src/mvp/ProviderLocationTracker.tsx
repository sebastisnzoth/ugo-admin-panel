import React,{useEffect,useMemo,useRef,useState}from'react'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{getRoleSupabase}from'../lib/roleSupabase'
import type{Service}from'./shared'

type Props={service?:Service|null;onAutoArrival?:()=>Promise<boolean>|boolean|void}
type TrackingProfile={online?:boolean|null;disponible?:boolean|null}
type LocationRpcClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>}
const MIN_WRITE_MS=5_000
const MIN_MOVE_M=5
const AVAILABILITY_HEARTBEAT_MS=20_000
const ARRIVAL_RADIUS_M=200
const MAX_ACCEPTABLE_ACCURACY_M=250
const MAX_POSITION_AGE_MS=30_000
const GEO_COMPATIBLE_OPTIONS:PositionOptions={enableHighAccuracy:false,maximumAge:15_000,timeout:12_000}
const GEO_HIGH_ACCURACY_OPTIONS:PositionOptions={enableHighAccuracy:true,maximumAge:15_000,timeout:15_000}

function usableBrowserPosition(pos:GeolocationPosition){
 const latitude=Number(pos.coords.latitude),longitude=Number(pos.coords.longitude),accuracy=Number(pos.coords.accuracy),capturedAtMs=Number(pos.timestamp||Date.now()),age=Date.now()-capturedAtMs
 return Number.isFinite(latitude)&&Number.isFinite(longitude)&&!(Math.abs(latitude)<0.0001&&Math.abs(longitude)<0.0001)&&Number.isFinite(accuracy)&&accuracy>0&&accuracy<=MAX_ACCEPTABLE_ACCURACY_M&&age<=MAX_POSITION_AGE_MS
}
function oneBrowserPosition(options:PositionOptions):Promise<GeolocationPosition>{return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,options))}
async function getFreshBrowserPosition(){
 let compatibleError:GeolocationPositionError|null=null
 try{const compatible=await oneBrowserPosition(GEO_COMPATIBLE_OPTIONS);if(usableBrowserPosition(compatible))return compatible}catch(error){compatibleError=error as GeolocationPositionError;if(compatibleError.code===1)throw compatibleError}
 try{return await oneBrowserPosition(GEO_HIGH_ACCURACY_OPTIONS)}catch(error){const highError=error as GeolocationPositionError;if(highError.code===1)throw highError;throw compatibleError||highError}
}


function distanceMeters(a:[number,number],b:[number,number]){
 const toRad=(v:number)=>v*Math.PI/180,R=6_371_000
 const dLat=toRad(b[0]-a[0]),dLng=toRad(b[1]-a[1]),lat1=toRad(a[0]),lat2=toRad(b[0])
 const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
 return 2*R*Math.asin(Math.sqrt(h))
}

export function ProviderLocationTracker({service,onAutoArrival}:Props){
 const supabase=useMemo(()=>getRoleSupabase('provider'),[])
 const[available,setAvailable]=useState(false)
 const[distanceToClient,setDistanceToClient]=useState<number|null>(null)
 const[locationError,setLocationError]=useState('')
 const[lastFix,setLastFix]=useState<{capturedAt:number;accuracy:number}|null>(null)
 const[nowMs,setNowMs]=useState(()=>Date.now())
 const enRoute=service?.estado==='en_camino'
 const autoArrivalRef=useRef(onAutoArrival),attemptedServiceRef=useRef<string|null>(null),lastValidFixAtRef=useRef(0)
 useEffect(()=>{autoArrivalRef.current=onAutoArrival},[onAutoArrival])
 useEffect(()=>{if(service?.estado!=='en_camino'){attemptedServiceRef.current=null;setLastFix(null)}},[service?.estado,service?.id])
 useEffect(()=>{if(!available&&!enRoute)return;setNowMs(Date.now());const timer=window.setInterval(()=>setNowMs(Date.now()),1_000);return()=>window.clearInterval(timer)},[available,enRoute])

 useEffect(()=>{
  let alive=true
  let channel:RealtimeChannel|null=null
  supabase.auth.getUser().then(async({data})=>{
   if(!alive||!data.user)return
   const userId=data.user.id
   const{data:profile}=await supabase.from('perfiles_proveedor').select('online,disponible').eq('usuario_id',userId).maybeSingle()
   const trackingProfile=profile as TrackingProfile|null
   if(alive)setAvailable(Boolean(trackingProfile&&trackingProfile.online&&trackingProfile.disponible))
   channel=supabase.channel(`provider-tracking-status-${userId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'perfiles_proveedor',filter:`usuario_id=eq.${userId}`},payload=>{
    const row=(payload.new||{}) as TrackingProfile
    if(alive)setAvailable(Boolean(row.online&&row.disponible))
   }).subscribe()
  }).catch(()=>{})
  return()=>{alive=false;if(channel)supabase.removeChannel(channel)}
 },[supabase])

 useEffect(()=>{
  if(!available||enRoute||!navigator.geolocation)return
  let alive=true
  const rpc=supabase as unknown as LocationRpcClient
  let heartbeatBusy=false
  const publishHeartbeat=async()=>{
   if(heartbeatBusy)return
   heartbeatBusy=true
   try{
    const pos=await getFreshBrowserPosition()
    if(!alive)return
    const latitude=Number(pos.coords.latitude),longitude=Number(pos.coords.longitude),accuracy=Number(pos.coords.accuracy),capturedAtMs=Number(pos.timestamp||Date.now()),age=Date.now()-capturedAtMs
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||(Math.abs(latitude)<0.0001&&Math.abs(longitude)<0.0001)||!Number.isFinite(accuracy)||accuracy<=0||accuracy>MAX_ACCEPTABLE_ACCURACY_M||age>MAX_POSITION_AGE_MS){
     setLocationError('UGO recibió una ubicación inválida o antigua. Está reintentando para mantenerte dentro del matching.')
     return
    }
    const{error}=await rpc.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:latitude,p_lng:longitude,p_captured_at:new Date(capturedAtMs).toISOString(),p_accuracy_m:accuracy})
    if(!alive)return
    if(error){const rpcMessage=typeof error==='object'&&error&&'message'in error?String((error as{message?:unknown}).message||''):'';setLocationError(rpcMessage||'No pudimos mantener tu GPS reciente para recibir pedidos. UGO va a reintentar.');return}
    setLocationError('');lastValidFixAtRef.current=Date.now();setLastFix({capturedAt:capturedAtMs,accuracy})
   }catch(error){
    if(!alive)return
    const geoError=error as GeolocationPositionError
    if(lastValidFixAtRef.current&&Date.now()-lastValidFixAtRef.current<=MAX_POSITION_AGE_MS)return
    setLocationError(geoError.code===1?'UGO perdió el permiso de ubicación precisa. Estás Online, pero no podés recibir pedidos hasta reactivarlo.':geoError.code===2?'UGO no puede obtener tu GPS ahora. Estás Online, pero el matching te excluirá hasta recuperar una ubicación reciente.':'El GPS tardó demasiado en responder. UGO sigue reintentando para devolverte al matching.')
   }finally{heartbeatBusy=false}
  }
  const onForeground=()=>{if(document.visibilityState==='visible')void publishHeartbeat()}
  void publishHeartbeat()
  const timer=window.setInterval(()=>void publishHeartbeat(),AVAILABILITY_HEARTBEAT_MS)
  window.addEventListener('focus',onForeground);document.addEventListener('visibilitychange',onForeground)
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('focus',onForeground);document.removeEventListener('visibilitychange',onForeground)}
 },[available,enRoute,supabase])

 useEffect(()=>{
  if(!navigator.geolocation||(!available&&!enRoute))return
  let lastWrite=0,lastPoint:[number,number]|null=null,writing=false
  const rpc=supabase as unknown as LocationRpcClient
  const watchId=navigator.geolocation.watchPosition(async pos=>{
   setLocationError('')
   const point:[number,number]=[pos.coords.latitude,pos.coords.longitude]
   const accuracy=Number(pos.coords.accuracy),age=Date.now()-Number(pos.timestamp||Date.now())
   if(!Number.isFinite(accuracy)||accuracy>MAX_ACCEPTABLE_ACCURACY_M){setLocationError('La señal GPS todavía no es suficientemente precisa. UGO sigue buscando una ubicación mejor.');return}
   if(age>MAX_POSITION_AGE_MS){setLocationError('La ubicación recibida es antigua. UGO está esperando una posición GPS nueva.');return}
   if(!Number.isFinite(point[0])||!Number.isFinite(point[1])||(Math.abs(point[0])<0.0001&&Math.abs(point[1])<0.0001))return
   const now=Date.now(),moved=!lastPoint||distanceMeters(lastPoint,point)>=MIN_MOVE_M
   const heartbeatDue=lastWrite===0||now-lastWrite>=AVAILABILITY_HEARTBEAT_MS
   if(writing||now-lastWrite<MIN_WRITE_MS||(!moved&&!heartbeatDue))return
   writing=true
   const serviceId=service?.estado==='en_camino'?service.id:null
   const capturedAt=new Date(Number(pos.timestamp||Date.now())).toISOString()
   const{data,error}=serviceId
    ?await rpc.rpc('publicar_ubicacion_proveedor',{p_servicio_id:serviceId,p_lat:point[0],p_lng:point[1],p_captured_at:capturedAt,p_accuracy_m:accuracy})
    :await rpc.rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:point[0],p_lng:point[1],p_captured_at:capturedAt,p_accuracy_m:accuracy})
   writing=false
   if(error){
    const rpcMessage=typeof error==='object'&&error&&'message'in error?String((error as{message?:unknown}).message||''):''
    if(enRoute)setLocationError(rpcMessage||'No pudimos publicar tu GPS reciente. UGO sigue reintentando.')
    return
   }
   {
    lastWrite=Date.now();lastPoint=point;lastValidFixAtRef.current=Date.now();setLastFix({capturedAt:Number(pos.timestamp||Date.now()),accuracy})
    const distanceValue=serviceId&&data&&typeof data==='object'?(data as{distance_m?:unknown}).distance_m:data
    const meters=distanceValue==null?null:Number(distanceValue),validMeters=Number.isFinite(meters)?meters:null
    setDistanceToClient(validMeters)
    if(serviceId&&validMeters!=null&&validMeters<=ARRIVAL_RADIUS_M&&autoArrivalRef.current&&attemptedServiceRef.current!==serviceId){
     attemptedServiceRef.current=serviceId
     try{const ok=await autoArrivalRef.current();if(ok===false)attemptedServiceRef.current=null}catch{attemptedServiceRef.current=null}
    }
   }
  },error=>{if(error.code!==1&&lastValidFixAtRef.current&&Date.now()-lastValidFixAtRef.current<=MAX_POSITION_AGE_MS)return;setLocationError(error.code===1?'UGO necesita permiso de ubicación precisa para seguir el servicio.':error.code===2?'No pudimos obtener tu GPS. Revisá que la ubicación del dispositivo esté activada.':'El GPS tardó demasiado en responder. Reintentando…')}, {enableHighAccuracy:true,maximumAge:10_000,timeout:20_000})
  return()=>navigator.geolocation.clearWatch(watchId)
 },[available,enRoute,service?.id,service?.estado,supabase])

 const fixAgeMs=lastFix?Math.max(0,nowMs-lastFix.capturedAt):null
 const freshness=lastFix?`${fixAgeMs!=null&&fixAgeMs<=MAX_POSITION_AGE_MS?'GPS reciente':'GPS desactualizado'} · hace ${Math.floor((fixAgeMs||0)/1_000)} s · precisión ±${Math.round(lastFix.accuracy)} m`:'Esperando primera ubicación reciente…'
 const idleGpsStale=available&&(!lastFix||fixAgeMs==null||fixAgeMs>MAX_POSITION_AGE_MS)
 if(service?.estado!=='en_camino'){
  if(!available)return null
  if(locationError)return <div className="provider-arrival-toast provider-location-error" role="alert"><strong>Online sin GPS válido</strong><span>📍 {locationError}</span><span className="provider-location-freshness">{freshness}</span></div>
  if(idleGpsStale)return <div className="provider-arrival-toast provider-location-error" role="alert"><strong>Online, pero fuera del matching</strong><span>📍 UGO necesita renovar tu GPS para poder enviarte nuevos pedidos.</span><span className="provider-location-freshness">{freshness}</span></div>
  return null
 }
 if(locationError)return <div className="provider-arrival-toast provider-location-error" role="alert"><strong>GPS necesita atención</strong><span>📍 {locationError}</span><span className="provider-location-freshness">{freshness}</span></div>
 if(distanceToClient==null)return <div className="provider-arrival-toast provider-location-info" role="status"><strong>GPS activo</strong><span>Buscando tu distancia exacta al cliente…</span><span className="provider-location-freshness">{freshness}</span></div>
 if(distanceToClient>ARRIVAL_RADIUS_M)return <div className="provider-arrival-toast provider-location-info" role="status"><strong>{Math.round(distanceToClient)} m para llegar</strong><span>UGO sigue publicando tu ubicación. “YA LLEGUÉ” se valida contra el geofence de {ARRIVAL_RADIUS_M} m.</span><span className="provider-location-freshness">{freshness}</span></div>
 return <div className="provider-arrival-toast provider-location-ok" role="status"><strong>Llegada detectada</strong><span>📍 Estás a {Math.round(distanceToClient)} m · UGO está confirmando automáticamente.</span><span className="provider-location-freshness">{freshness}</span></div>
}