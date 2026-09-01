import React,{useEffect,useState}from'react'
import{supabase}from'../lib/supabase'
import type{Service}from'./shared'

type Props={service?:Service|null}
type TrackingProfile={online?:boolean|null;disponible?:boolean|null}
const ACTIVE_TRACKING_STATES=new Set(['asignado','en_camino','en_progreso','esperando_aprobacion'])
const MIN_WRITE_MS=10_000
const MIN_MOVE_M=15
const ARRIVAL_RADIUS_M=100

function distanceMeters(a:[number,number],b:[number,number]){
 const toRad=(v:number)=>v*Math.PI/180,R=6_371_000
 const dLat=toRad(b[0]-a[0]),dLng=toRad(b[1]-a[1]),lat1=toRad(a[0]),lat2=toRad(b[0])
 const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
 return 2*R*Math.asin(Math.sqrt(h))
}

export function ProviderLocationTracker({service}:Props){
 const[available,setAvailable]=useState(false)
 const[distanceToClient,setDistanceToClient]=useState<number|null>(null)
 const serviceActive=Boolean(service&&ACTIVE_TRACKING_STATES.has(service.estado))

 useEffect(()=>{
  let alive=true
  let channel:any=null
  supabase.auth.getUser().then(async({data})=>{
   if(!alive||!data.user)return
   const userId=data.user.id
   const{data:profile}=await supabase.from('perfiles_proveedor').select('online,disponible').eq('usuario_id',userId).maybeSingle()
   const trackingProfile=profile as TrackingProfile|null
   if(alive)setAvailable(Boolean(trackingProfile&&(trackingProfile.online||trackingProfile.disponible)))
   channel=supabase.channel(`provider-tracking-status-${userId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'perfiles_proveedor',filter:`usuario_id=eq.${userId}`},(payload:any)=>{
    const row=(payload.new||{}) as TrackingProfile
    if(alive)setAvailable(Boolean(row.online||row.disponible))
   }).subscribe()
  }).catch(()=>{})
  return()=>{alive=false;if(channel)supabase.removeChannel(channel)}
 },[])

 useEffect(()=>{
  if(!navigator.geolocation||(!available&&!serviceActive))return
  let lastWrite=0,lastPoint:[number,number]|null=null,writing=false
  const watchId=navigator.geolocation.watchPosition(async pos=>{
   const point:[number,number]=[pos.coords.latitude,pos.coords.longitude]
   const now=Date.now(),moved=!lastPoint||distanceMeters(lastPoint,point)>=MIN_MOVE_M
   if(writing||now-lastWrite<MIN_WRITE_MS||!moved)return
   writing=true
   const serviceId=service?.estado==='en_camino'?service.id:null
   const{data,error}=await (supabase as any).rpc('actualizar_ubicacion_y_distancia',{p_lat:point[0],p_lng:point[1],p_servicio_id:serviceId})
   writing=false
   if(!error){
    lastWrite=Date.now();lastPoint=point
    const meters=data==null?null:Number(data)
    setDistanceToClient(Number.isFinite(meters as number)?meters:null)
   }
  },()=>{}, {enableHighAccuracy:true,maximumAge:5000,timeout:12000})
  return()=>navigator.geolocation.clearWatch(watchId)
 },[available,serviceActive,service?.id,service?.estado])

 if(service?.estado!=='en_camino'||distanceToClient==null||distanceToClient>ARRIVAL_RADIUS_M)return null
 return <div style={{position:'fixed',left:'50%',bottom:96,transform:'translateX(-50%)',zIndex:80,background:'#fff',borderRadius:18,padding:'12px 16px',boxShadow:'0 8px 28px rgba(0,0,0,.18)',fontWeight:800,fontSize:14,maxWidth:'calc(100vw - 32px)',textAlign:'center'}}>📍 Estás a {Math.max(1,Math.round(distanceToClient))} m del cliente · Confirmá “Llegué al cliente”</div>
}
