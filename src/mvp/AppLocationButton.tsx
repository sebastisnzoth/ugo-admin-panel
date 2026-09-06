import React,{useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{supabase as adminSupabase}from'../lib/supabase'

type AppRole='client'|'provider'|'admin'

export function AppLocationButton({role}:{role:AppRole}){
 const sb=useMemo(()=>role==='admin'?adminSupabase:getRoleSupabase(role),[role])
 const[userId,setUserId]=useState<string|null>(null),[busy,setBusy]=useState(false),[ok,setOk]=useState(false),[msg,setMsg]=useState('')
 useEffect(()=>{let mounted=true;sb.auth.getSession().then(({data})=>{if(mounted)setUserId(data.session?.user?.id||null)});const{data:l}=sb.auth.onAuthStateChange((_e,s)=>setUserId(s?.user?.id||null));return()=>{mounted=false;l.subscription.unsubscribe()}},[sb])
 if(!userId)return null
 function capture(){
  if(!navigator.geolocation){setMsg('GPS no disponible');return}
  setBusy(true);setMsg('')
  navigator.geolocation.getCurrentPosition(async pos=>{
   try{
    const lat=pos.coords.latitude,lng=pos.coords.longitude,point=`POINT(${lng} ${lat})`
    const{error:uerr}=await (sb as any).from('usuarios').update({lat,lng}).eq('id',userId)
    if(uerr)throw uerr
    if(role==='client'){
      const{error}=await (sb as any).from('perfiles_cliente').update({ubicacion:point}).eq('usuario_id',userId)
      if(error)throw error
    }
    if(role==='provider'){
      const{error}=await (sb as any).from('perfiles_proveedor').update({ubicacion:point}).eq('usuario_id',userId)
      if(error)throw error
    }
    setOk(true);setMsg('Ubicación actualizada')
    window.setTimeout(()=>{setOk(false);setMsg('')},2500)
   }catch(e:any){setMsg(e?.message||'No se pudo guardar la ubicación')}finally{setBusy(false)}
  },()=>{setBusy(false);setMsg('Permití acceso a ubicación en el navegador')},{enableHighAccuracy:true,timeout:12000,maximumAge:30000})
 }
 return <div className={`ugo-location-control role-${role}`}>{msg&&<div className="ugo-location-message">{msg}</div>}<button type="button" onClick={capture} disabled={busy} title="Guardar mi ubicación actual en UGO" style={{border:0,borderRadius:999,padding:'11px 14px',fontWeight:900,background:ok?'#067647':'#fff',color:ok?'#fff':'#111',boxShadow:'0 8px 28px rgba(0,0,0,.24)',cursor:'pointer'}}>{busy?'📍 Buscando…':ok?'✓ Ubicación guardada':'📍 Mi ubicación'}</button></div>
}
