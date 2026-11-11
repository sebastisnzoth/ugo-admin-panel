import{useEffect,useRef,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'
import{recordSessionDiagnostic}from'../../lib/roleSupabase'

export function useProviderRealtime(supabase:SupabaseClient,userId:string|null,onChange:()=>void){
 const[channelEpoch,setChannelEpoch]=useState(0)
 const onChangeRef=useRef(onChange)
 // Single budget across reconnect epochs; do not hammer a degraded TEST/PROD backend.
 const backpressure=useRef({failures:0,nextSyncAt:0,lastSyncAt:0})
 onChangeRef.current=onChange
 useEffect(()=>{
  if(!userId)return
  let alive=true
  let reconnectTimer:number|undefined
  const resync=()=>{
   if(!alive||document.visibilityState!=='visible'||!navigator.onLine)return
   const now=Date.now()
   if(now<backpressure.current.nextSyncAt||now-backpressure.current.lastSyncAt<30_000)return
   backpressure.current.lastSyncAt=now
   void onChangeRef.current()
  }
  const reconnect=()=>{
   if(!alive||reconnectTimer!==undefined||!navigator.onLine)return
   const delay=Math.min(120_000,3_000*2**Math.min(backpressure.current.failures,5))
   backpressure.current.failures=Math.min(backpressure.current.failures+1,6)
   backpressure.current.nextSyncAt=Date.now()+delay
   reconnectTimer=window.setTimeout(()=>{
    reconnectTimer=undefined
    if(alive&&navigator.onLine)setChannelEpoch(value=>value+1)
   },delay)
  }
  const onVisibility=()=>{if(document.visibilityState==='visible'){resync();reconnect()}}
  const onFocus=()=>resync()
  const handleOnline=()=>{resync();reconnect();}
  window.addEventListener('online',handleOnline)
  window.addEventListener('focus',onFocus)
  document.addEventListener('visibilitychange',onVisibility)
  const safetyTimer=window.setInterval(()=>{if(document.visibilityState==='visible')resync()},60_000)
  const ch=supabase.channel(`provider-flow-${userId}-${channelEpoch}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'ofertas_servicio',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'deudas_ugo_proveedor',filter:`proveedor_id=eq.${userId}`},resync)
   .subscribe(status=>{if(!alive)return;if(status==='SUBSCRIBED'){if(reconnectTimer!==undefined){window.clearTimeout(reconnectTimer);reconnectTimer=undefined}backpressure.current.failures=0;backpressure.current.nextSyncAt=0;recordSessionDiagnostic('provider','realtime','channel_ready');resync()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){recordSessionDiagnostic('provider','realtime','channel_failed');reconnect()}})
  return()=>{
   alive=false
   if(reconnectTimer)window.clearTimeout(reconnectTimer)
   window.removeEventListener('online',handleOnline)
   window.removeEventListener('focus',onFocus)
   document.removeEventListener('visibilitychange',onVisibility)
   window.clearInterval(safetyTimer)
   void supabase.removeChannel(ch)
  }
 },[channelEpoch,supabase,userId])
}
