import React,{useEffect,useState}from'react'
import{reportSentinelIncident}from'../../lib/sentinel'
import{useRoleSession}from'../shared'
import{useClientFlow}from'./clientFlow'
import{refreshProviderRadar}from'./providerRadarStore'

export function ClientProviderRadarBridge(){
 const flow=useClientFlow()
 const{session,supabase}=useRoleSession('client')
 const[channelEpoch,setChannelEpoch]=useState(0)
 useEffect(()=>{
  if(!session)return
  let alive=true,reconnectScheduled=false
  const report=(eventType:string,message:string,error?:unknown)=>{if(!alive)return;void reportSentinelIncident({eventType,message,error,role:'client',severity:'P1',action:'client.provider_radar.sync',checklistCode:'MATCH-ONLINE'})}
  const refresh=async()=>{try{await refreshProviderRadar(supabase,true)}catch(error){if(alive){console.warn('No pudimos sincronizar el radar compartido.',error);report('client_provider_radar_sync_error',error instanceof Error?error.message:'No pudimos sincronizar profesionales online.',error)}}}
  const reconnect=()=>{if(!alive||reconnectScheduled)return;reconnectScheduled=true;window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)}
  void refresh()
  const ch=supabase.channel(`client-provider-radar-${session.user.id}-${channelEpoch}`).on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},()=>{void refresh()}).subscribe(status=>{
   if(status==='SUBSCRIBED')void refresh()
   else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){report('client_provider_radar_realtime_error',`Canal radar: ${status}`);void refresh();reconnect()}
  })
  const onOnline=()=>{void refresh();reconnect()}
  const onVisibility=()=>{if(document.visibilityState==='visible')void refresh()}
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh()},15000)
  window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility)
  return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}
 },[channelEpoch,session,supabase])
 // P0 invariant: the client never chooses a provider before confirming an order.
 // Provider availability stays synchronized in the background and is consumed
 // by post-confirm matching only. Any stale legacy search/provider route returns
 // to the canonical home instead of exposing the old radar/category picker.
 useEffect(()=>{if(flow.screen==='search'||flow.screen==='provider')flow.navigate('home')},[flow.screen,flow.navigate])
 return null
}

export default ClientProviderRadarBridge
