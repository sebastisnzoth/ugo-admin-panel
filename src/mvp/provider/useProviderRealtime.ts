import{useEffect,useRef,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'

/**
 * A refreshed session recreates ProviderDataProvider.reload's callback.
 * Keep the current callback without rebuilding the realtime subscription on
 * every session/token update; rebuild only for identity or reconnection.
 */
export function useProviderRealtime(supabase:SupabaseClient,userId:string|null,onChange:()=>void){
 const[channelEpoch,setChannelEpoch]=useState(0)
 const onChangeRef=useRef(onChange)
 onChangeRef.current=onChange
 useEffect(()=>{
  if(!userId)return
  let alive=true
  let reconnectTimer:number|undefined
  const resync=()=>{if(alive)void onChangeRef.current()}
  const reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1500)}
  const onVisibility=()=>{if(document.visibilityState==='visible'){resync();reconnect()}}
  const onFocus=()=>resync()
  const onOnline=()=>{resync();reconnect()}
  window.addEventListener('online',onOnline)
  window.addEventListener('focus',onFocus)
  document.addEventListener('visibilitychange',onVisibility)
  const safetyTimer=window.setInterval(()=>{if(document.visibilityState==='visible')resync()},20_000)
  const ch=supabase.channel(`provider-flow-${userId}-${channelEpoch}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'ofertas_servicio',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'deudas_ugo_proveedor',filter:`proveedor_id=eq.${userId}`},resync)
   .subscribe(status=>{if(status==='SUBSCRIBED')resync();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){resync();reconnect()}})
  return()=>{
   alive=false
   if(reconnectTimer)window.clearTimeout(reconnectTimer)
   window.removeEventListener('online',onOnline)
   window.removeEventListener('focus',onFocus)
   document.removeEventListener('visibilitychange',onVisibility)
   window.clearInterval(safetyTimer)
   void supabase.removeChannel(ch)
  }
 },[channelEpoch,supabase,userId])
}
