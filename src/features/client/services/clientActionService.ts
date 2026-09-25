import type{SupabaseClient}from'@supabase/supabase-js'
import{getDispatchProvider}from'../../../lib/dispatch/provider'

export const CLIENT_CANCELLABLE_SERVICE_STATES=['buscando','ofrecido','asignado','en_camino','llegado']
type OwnedServiceRow={id:string;estado:string;metadata?:Record<string,unknown>|null}

export async function cancelOwnedClientService(supabase:SupabaseClient,userId:string,serviceId:string){
 if(!serviceId)return false
 const{data,error}=await supabase.from('servicios').select('id,estado').eq('id',serviceId).eq('cliente_id',userId).in('estado',CLIENT_CANCELLABLE_SERVICE_STATES).maybeSingle()
 if(error)throw error
 const owned=(data||null)as OwnedServiceRow|null
 if(!owned?.id)return false
 await getDispatchProvider().cancel(owned.id)
 return true
}

export async function approvePendingClientService(supabase:SupabaseClient,userId:string,serviceId:string){
 if(!serviceId)return false
 const{data,error}=await supabase.from('servicios').select('id,estado,metadata').eq('id',serviceId).eq('cliente_id',userId).eq('estado','esperando_aprobacion').maybeSingle()
 if(error)throw error
 const row=(data||null)as OwnedServiceRow|null
 if(!row?.id)return false
 const workApproved=Boolean(row.metadata?.trabajo_aprobado_at)
 const rpc=workApproved?'confirmar_pago_efectivo_cliente':'aprobar_servicio'
 const result=await supabase.rpc(rpc,{p_servicio_id:row.id})
 if(result.error)throw result.error
 return true
}
