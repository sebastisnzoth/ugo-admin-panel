import{useEffect}from'react'
import{getDispatchProvider}from'../../lib/dispatch/provider'
import{useRoleSession}from'../shared'
import{useClientFlow}from'./clientFlow'

const CANCELLABLE_SERVICE_STATES=['buscando','ofrecido','asignado','en_camino','llegado']
type OwnedServiceRow={id:string;estado:string;metadata?:Record<string,unknown>|null}
export function ClientFlowActionsBridge(){
 const{registerActions,navigate}=useClientFlow(),{session,supabase}=useRoleSession('client'),userId=session?.user.id||''
 useEffect(()=>{
  if(!userId)return
  // Category selection belongs only to Screen 1. Never open the legacy provider radar.
  const openSearch=()=>navigate('home')
  const cancelService=async(serviceId:string)=>{try{if(!serviceId)return false;const{data,error}=await supabase.from('servicios').select('id,estado').eq('id',serviceId).eq('cliente_id',userId).in('estado',CANCELLABLE_SERVICE_STATES).maybeSingle();if(error)throw error;const owned=(data||null)as OwnedServiceRow|null;if(!owned?.id)return false;await getDispatchProvider().cancel(owned.id);return true}catch(error){console.error('UGO client cancellation failed',error);return false}}
  const openPayment=async()=>{navigate('home');return true}
  const approveService=async()=>{try{const{data,error}=await supabase.from('servicios').select('id,estado,metadata').eq('cliente_id',userId).eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(2);if(error)throw error;const rows=(data||[])as OwnedServiceRow[];if(rows.length!==1)return false;const row=rows[0];const workApproved=Boolean(row.metadata?.trabajo_aprobado_at);const rpc=workApproved?'confirmar_pago_efectivo_cliente':'aprobar_servicio';const result=await supabase.rpc(rpc,{p_servicio_id:row.id});if(result.error)throw result.error;return true}catch(error){console.error('UGO client approval failed',error);return false}}
  return registerActions({openSearch,openProvider:()=>navigate('home'),selectProvider:()=>navigate('home'),cancelService,openPayment,approveService,openReview:()=>navigate('home'),openHistory:()=>navigate('history'),openProfile:()=>navigate('profile'),openDispute:()=>navigate('dispute')})
 },[navigate,registerActions,supabase,userId])
 return null
}
