import{useEffect}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'

export function useProviderRealtime(supabase:SupabaseClient,userId:string|null,onChange:()=>void){
 useEffect(()=>{
  if(!userId)return
  const resync=()=>void onChange()
  const onVisibility=()=>{if(document.visibilityState==='visible')resync()}
  window.addEventListener('online',resync)
  document.addEventListener('visibilitychange',onVisibility)
  const ch=supabase.channel(`provider-flow-${userId}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'ofertas_servicio',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`proveedor_id=eq.${userId}`},resync)
   .on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${userId}`},resync)
   .subscribe(status=>{if(status==='SUBSCRIBED')resync()})
  return()=>{
   window.removeEventListener('online',resync)
   document.removeEventListener('visibilitychange',onVisibility)
   void supabase.removeChannel(ch)
  }
 },[onChange,supabase,userId])
}
