import{useEffect}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'

export function useProviderRealtime(supabase:SupabaseClient,userId:string|null,onChange:()=>void){
 useEffect(()=>{if(!userId)return;const ch=supabase.channel(`provider-flow-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'ofertas_servicio',filter:`proveedor_id=eq.${userId}`},onChange).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`proveedor_id=eq.${userId}`},onChange).on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`proveedor_id=eq.${userId}`},onChange).subscribe();return()=>{void supabase.removeChannel(ch)}},[onChange,supabase,userId])
}
