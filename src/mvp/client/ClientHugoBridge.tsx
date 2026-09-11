import React,{useCallback,useEffect,useState}from'react'
import{VoiceHugoDock}from'../VoiceHugoDock'
import{useRoleSession,type Service}from'../shared'

const HUGO_ACTIVE_STATES=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado']
type PaymentStatus='none'|'cash'|'pending'|'confirmed'
type PaymentRow={metodo?:string|null;estado?:string|null;mp_payment_id?:string|null;pago_externo_id?:string|null;pix_e2e_id?:string|null}

export function ClientHugoBridge(){
 const auth=useRoleSession('client'),{supabase,session}=auth
 const[service,setService]=useState<Service|null>(null)
 const[offersPending,setOffersPending]=useState(0)
 const[paymentStatus,setPaymentStatus]=useState<PaymentStatus>('none')
 const load=useCallback(async()=>{if(!session){setService(null);setOffersPending(0);setPaymentStatus('none');return}const{data:rows}=await supabase.from('servicios').select('*,categoria:categorias(nombre,emoji),proveedor:usuarios!servicios_proveedor_id_fkey(nombre,karma)').eq('cliente_id',session.user.id).in('estado',HUGO_ACTIVE_STATES).order('created_at',{ascending:false}).limit(1);const current=((rows||[])[0]as Service|undefined)||null;setService(current);if(!current){setOffersPending(0);setPaymentStatus('none');return}if(['buscando','ofrecido'].includes(current.estado)){const{count}=await supabase.from('ofertas_servicio').select('id',{count:'exact',head:true}).eq('servicio_id',current.id).in('estado',['pendiente','enviada','ofrecida']);setOffersPending(count||0)}else setOffersPending(0);const{data:p}=await supabase.from('pagos').select('metodo,estado,mp_payment_id,pago_externo_id,pix_e2e_id,created_at').eq('servicio_id',current.id).order('created_at',{ascending:false}).limit(1).maybeSingle();const payment=(p||null)as PaymentRow|null;if(!payment)setPaymentStatus('none');else if(payment.metodo==='efectivo')setPaymentStatus('cash');else if((payment.estado==='retenido'||payment.estado==='liberado')&&(payment.mp_payment_id||payment.pago_externo_id||payment.pix_e2e_id))setPaymentStatus('confirmed');else setPaymentStatus('pending')},[session,supabase])
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
 useEffect(()=>{if(!session)return;const ch=supabase.channel(`client-hugo-context-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`cliente_id=eq.${session.user.id}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'ofertas_servicio'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>void load()).subscribe();return()=>{supabase.removeChannel(ch)}},[load,session,supabase])
 if(auth.loading||!session)return null
 return <VoiceHugoDock role="client" accessToken={session.access_token} service={service} availableOffers={offersPending} paymentStatus={paymentStatus}/>
}
