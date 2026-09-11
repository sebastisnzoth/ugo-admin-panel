import type{SupabaseClient}from'@supabase/supabase-js'
import{PROVIDER_ACTIVE_STATES,type Offer,type Payment,type ProviderProfile,type Service}from'../shared'

export type ProviderProfileFull=ProviderProfile&{estado_verificacion?:string;zona_radio_km?:number|null;ciudad_base?:string|null}
export type ProviderPayment=Payment&{mp_payment_id?:string|null;mp_status?:string|null;metodo?:string|null;procesador?:string|null;pago_externo_id?:string|null;fecha_confirmacion?:string|null}
export type ProviderSnapshot={provider:ProviderProfileFull|null;offers:Offer[];service:Service|null;payments:ProviderPayment[]}

export async function loadProviderSnapshot(supabase:SupabaseClient,userId:string):Promise<ProviderSnapshot>{
 const[{data:p,error:pe},{data:o,error:oe},{data:s,error:se},{data:pay,error:pae}]=await Promise.all([
  supabase.from('perfiles_proveedor').select('*').eq('usuario_id',userId).maybeSingle(),
  supabase.from('ofertas_servicio').select('*,servicio:servicios(*,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre))').eq('proveedor_id',userId).eq('estado','pendiente').order('created_at',{ascending:false}),
  supabase.from('servicios').select('*,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre)').eq('proveedor_id',userId).in('estado',PROVIDER_ACTIVE_STATES).order('created_at',{ascending:false}).limit(1),
  supabase.from('pagos').select('*').eq('proveedor_id',userId).order('created_at',{ascending:false}),
 ])
 if(pe)throw pe;if(oe)throw oe;if(se)throw se;if(pae)throw pae
 return{provider:(p as ProviderProfileFull|null)||null,offers:(o||[])as Offer[],service:((s||[])[0]as Service|undefined)||null,payments:(pay||[])as ProviderPayment[]}
}

export async function setProviderAvailability(supabase:SupabaseClient,userId:string,online:boolean){const{error}=await supabase.from('perfiles_proveedor').update({disponible:online,online}).eq('usuario_id',userId);if(error)throw error}
export async function acceptProviderOpportunity(supabase:SupabaseClient,id:string){const{error}=await supabase.rpc('aceptar_oferta',{p_oferta_id:id});if(error)throw error}
export async function rejectProviderOpportunity(supabase:SupabaseClient,id:string){const{error}=await supabase.rpc('rechazar_oferta',{p_oferta_id:id});if(error)throw error}
export async function advanceProviderService(supabase:SupabaseClient,serviceId:string,state:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion'){const{error}=await supabase.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:state});if(error)throw error}
