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

export async function approvePendingClientService(supabase:SupabaseClient,userId:string){
 const{data,error}=await supabase.from('servicios').select('id,estado,metadata').eq('cliente_id',userId).eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(2)
 if(error)throw error
 const rows=(data||[])as OwnedServiceRow[]
 if(rows.length!==1)return false
 const row=rows[0]
 const workApproved=Boolean(row.metadata?.trabajo_aprobado_at)
 const rpc=workApproved?'confirmar_pago_efectivo_cliente':'aprobar_servicio'
 const result=await supabase.rpc(rpc,{p_servicio_id:row.id})
 if(result.error)throw result.error
 return true
}
