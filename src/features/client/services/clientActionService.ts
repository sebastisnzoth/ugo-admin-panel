import type{SupabaseClient}from'@supabase/supabase-js'
import{getDispatchProvider}from'../../../lib/dispatch/provider'

export const CLIENT_CANCELLABLE_SERVICE_STATES=['buscando','ofrecido','asignado','en_camino','llegado']
type OwnedServiceRow={id:string;estado:string;metadata?:Record<string,unknown>|null}

function hasWorkApproval(row:OwnedServiceRow|null){
 const value=row?.metadata?.trabajo_aprobado_at
 return typeof value==='string'&&value.trim().length>0
}

async function readOwnedClosureService(supabase:SupabaseClient,userId:string,serviceId:string){
 const{data,error}=await supabase.from('servicios').select('id,estado,metadata').eq('id',serviceId).eq('cliente_id',userId).maybeSingle()
 if(error)throw error
 return(data||null)as OwnedServiceRow|null
}

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
 const row=await readOwnedClosureService(supabase,userId,serviceId)
 if(!row?.id)return false
 if(row.estado==='completado')return true
 if(row.estado!=='esperando_aprobacion')return false
 if(hasWorkApproval(row))return true

 const result=await supabase.rpc('aprobar_servicio',{p_servicio_id:row.id})
 if(!result.error)return true

 try{
  const persisted=await readOwnedClosureService(supabase,userId,serviceId)
  if(persisted?.estado==='completado')return true
  if(persisted?.estado==='esperando_aprobacion'&&hasWorkApproval(persisted))return true
 }catch{}
 throw result.error
}

export async function confirmApprovedCashClientService(supabase:SupabaseClient,userId:string,serviceId:string){
 if(!serviceId)return false
 const row=await readOwnedClosureService(supabase,userId,serviceId)
 if(!row?.id)return false
 if(row.estado==='completado')return true
 if(row.estado!=='esperando_aprobacion'||!hasWorkApproval(row))return false

 const result=await supabase.rpc('confirmar_pago_efectivo_cliente',{p_servicio_id:row.id})
 if(!result.error)return true

 try{
  const persisted=await readOwnedClosureService(supabase,userId,serviceId)
  if(persisted?.estado==='completado')return true
 }catch{}
 throw result.error
}
