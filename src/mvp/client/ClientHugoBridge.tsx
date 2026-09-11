import React,{useCallback,useEffect,useState}from'react'
import{VoiceHugoDock}from'../VoiceHugoDock'
import{useRoleSession,type Service}from'../shared'

const HUGO_ACTIVE_STATES=['buscando','ofrecido','asignado','pago_pendiente','pago_habilitado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado']

export function ClientHugoBridge(){
 const auth=useRoleSession('client'),{supabase,session}=auth
 const[service,setService]=useState<Service|null>(null)
 const[offersPending,setOffersPending]=useState(0)
 const load=useCallback(async()=>{if(!session){setService(null);setOffersPending(0);return}const{data:rows}=await supabase.from('servicios').select('*,categoria:categorias(nombre,emoji),proveedor:usuarios!servicios_proveedor_id_fkey(nombre,karma)').eq('cliente_id',session.user.id).in('estado',HUGO_ACTIVE_STATES).order('created_at',{ascending:false}).limit(1);const current=((rows||[])[0]as Service|undefined)||null;setService(current);if(!current||!['buscando','ofrecido'].includes(current.estado)){setOffersPending(0);return}const{count}=await supabase.from('ofertas_servicio').select('id',{count:'exact',head:true}).eq('servicio_id',current.id).in('estado',['pendiente','enviada','ofrecida']);setOffersPending(count||0)},[session,supabase])
 useEffect(()=>{void load()},[load])
 useEffect(()=>{if(!session)return;const ch=supabase.channel(`client-hugo-context-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`cliente_id=eq.${session.user.id}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'ofertas_servicio'},()=>void load()).subscribe();return()=>{supabase.removeChannel(ch)}},[load,session,supabase])
 if(auth.loading||!session)return null
 return <VoiceHugoDock role="client" accessToken={session.access_token} service={service} availableOffers={offersPending}/>
}
