import{useEffect,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'

export function useProviderRealtime(supabase:SupabaseClient,userId:string|null,onChange:()=>void){
 const[channelEpoch,setChannelEpoch]=useState(0)
 useEffect(()=>{
  if(!userId)return
  let alive=true
  let reconnectTimer:number|undefined
  const resync=()=>void onChange()
  const reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1500)}
  const onVisibility=()=>{if(document.visibilityState==='visible')resync()}
  window.addEventListener('online',resync)
  window.addEventListener('online',reconnect)
  document.addEventListener('visibilitychange',onVisibility)
  const ch=supabase.channel(`provider-flow-${userId}-${channelEpoch}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'ofertas_servicio',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'deudas_ugo_proveedor',filter:`proveedor_id=eq.${userId}`},resync)
   .subscribe(status=>{if(status==='SUBSCRIBED')resync();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){resync();reconnect()}})
  return()=>{
   alive=false
   if(reconnectTimer)window.clearTimeout(reconnectTimer)
   window.removeEventListener('online',resync)
   window.removeEventListener('online',reconnect)
   document.removeEventListener('visibilitychange',onVisibility)
   void supabase.removeChannel(ch)
  }
 },[channelEpoch,onChange,supabase,userId])
}
