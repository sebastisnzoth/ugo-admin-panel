import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{supabase as adminSupabase}from'../lib/supabase'
import{UGO_UI_EVENTS}from'./uiEvents'
import'./provider-special-states.css'

type AppRole='client'|'provider'|'admin'
type DbError={message?:string}|null
type LocationTableClient={from:(table:string)=>{update:(values:Record<string,unknown>)=>{eq:(column:string,value:string)=>PromiseLike<{error:DbError}>}}}
type LocationRpcClient={rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{error:DbError}>}
type ProviderAvailabilityClient={from:(table:string)=>{select:(columns:string)=>{eq:(column:string,value:string)=>{maybeSingle:()=>PromiseLike<{data:{online?:boolean|null;disponible?:boolean|null}|null;error:DbError}>}}}}

export function AppLocationButton({role}:{role:AppRole}){
 const sb=useMemo(()=>role==='admin'?adminSupabase:getRoleSupabase(role),[role])
 const[userId,setUserId]=useState<string|null>(null),[busy,setBusy]=useState(false),[ok,setOk]=useState(false),[msg,setMsg]=useState('')
 useEffect(()=>{let mounted=true;sb.auth.getSession().then(({data})=>{if(mounted)setUserId(data.session?.user?.id||null)});const{data:l}=sb.auth.onAuthStateChange((_e,s)=>setUserId(s?.user?.id||null));return()=>{mounted=false;l.subscription.unsubscribe()}},[sb])
 const capture=useCallback(()=>{
  if(!userId)return
  if(!navigator.geolocation){setMsg('GPS no disponible');return}
  setBusy(true);setMsg('')
  navigator.geolocation.getCurrentPosition(async pos=>{
   try{
    const lat=Number(pos.coords.latitude),lng=Number(pos.coords.longitude),accuracy=Number(pos.coords.accuracy),capturedAt=new Date(Number(pos.timestamp||Date.now())).toISOString(),point=`POINT(${lng} ${lat})`,tables=sb as unknown as LocationTableClient
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||(Math.abs(lat)<0.0001&&Math.abs(lng)<0.0001))throw new Error('El GPS devolvió una ubicación inválida. Reintentá con Ubicación precisa activa.')
    if(role==='provider'){
      const providerDb=sb as unknown as ProviderAvailabilityClient
      const{data:providerProfile,error:profileError}=await providerDb.from('perfiles_proveedor').select('online,disponible').eq('usuario_id',userId).maybeSingle()
      if(profileError)throw new Error(profileError.message||'No pudimos verificar el estado del proveedor.')
      if(providerProfile?.online&&providerProfile?.disponible){
        if(!Number.isFinite(accuracy)||accuracy<=0||accuracy>250)throw new Error('La precisión GPS todavía no es suficiente para recibir pedidos. Esperá una señal mejor y reintentá.')
        const{error}=await(sb as unknown as LocationRpcClient).rpc('publicar_ubicacion_disponibilidad_proveedor',{p_lat:lat,p_lng:lng,p_captured_at:capturedAt,p_accuracy_m:accuracy})
        if(error)throw new Error(error.message||'No se pudo publicar la ubicación confiable del proveedor.')
      }else{
        const{error}=await tables.from('usuarios').update({lat,lng}).eq('id',userId)
        if(error)throw new Error(error.message||'No se pudo guardar la ubicación de la cuenta.')
      }
    }else{
      const{error:uerr}=await tables.from('usuarios').update({lat,lng}).eq('id',userId)
      if(uerr)throw new Error(uerr.message||'No se pudo actualizar la ubicación de la cuenta.')
      if(role==='client'){
        const{error}=await tables.from('perfiles_cliente').update({ubicacion:point}).eq('usuario_id',userId)
        if(error)throw new Error(error.message||'No se pudo actualizar la ubicación del cliente.')
        try{sessionStorage.setItem('ugo:last-client-location',JSON.stringify({latitude:lat,longitude:lng,at:Date.now()}))}catch(error){console.warn('No pudimos guardar la última ubicación local.',error)}
      }
    }
    const roundedAccuracy=Math.round(Number(pos.coords.accuracy||0))
    setOk(true);setMsg(roundedAccuracy>0?`Ubicación actualizada · precisión ±${roundedAccuracy} m`:'Ubicación actualizada')
    window.setTimeout(()=>{setOk(false);setMsg('')},2500)
   }catch(error){setMsg(error instanceof Error?error.message:'No se pudo guardar la ubicación')}finally{setBusy(false)}
  },()=>{setBusy(false);setMsg('Permití acceso a ubicación en el navegador')},{enableHighAccuracy:true,timeout:15000,maximumAge:0})
 },[role,sb,userId])
 useEffect(()=>{if(role!=='client')return;const handler=()=>capture();window.addEventListener(UGO_UI_EVENTS.clientLocation,handler);return()=>window.removeEventListener(UGO_UI_EVENTS.clientLocation,handler)},[capture,role])
 if(!userId)return null
 return <div className={`ugo-location-control role-${role}`}>{msg&&<div className="ugo-location-message">{msg}</div>}<button type="button" onClick={capture} disabled={busy} title="Guardar mi ubicación actual en UGO" style={{border:0,borderRadius:999,padding:'11px 14px',fontWeight:900,background:ok?'#067647':'#fff',color:ok?'#fff':'#111',boxShadow:'0 8px 28px rgba(0,0,0,.24)',cursor:'pointer'}}>{busy?'📍 Buscando…':ok?'✓ Ubicación guardada':'📍 Mi ubicación'}</button></div>
}
