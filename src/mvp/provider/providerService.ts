import type{SupabaseClient}from'@supabase/supabase-js'
import{PROVIDER_ACTIVE_STATES,type Offer,type Payment,type ProviderProfile,type Service}from'../shared'

export type ProviderProfileFull=ProviderProfile&{estado_verificacion?:string;zona_radio_km?:number|null;ciudad_base?:string|null}
export type ProviderPayment=Payment&{mp_payment_id?:string|null;mp_status?:string|null;metodo?:string|null;procesador?:string|null;pago_externo_id?:string|null;fecha_confirmacion?:string|null}
export type ProviderSnapshot={provider:ProviderProfileFull|null;offers:Offer[];service:Service|null;payments:ProviderPayment[]}

type PersistedOffer={id:string;servicio_id:string;proveedor_id:string;estado:string}
type PersistedService={id:string;estado:string;proveedor_id:string|null}

export async function loadProviderSnapshot(supabase:SupabaseClient,userId:string):Promise<ProviderSnapshot>{
 const[{data:p,error:pe},{data:o,error:oe},{data:s,error:se},{data:pay,error:pae}]=await Promise.all([
  supabase.from('perfiles_proveedor').select('*').eq('usuario_id',userId).maybeSingle(),
  supabase.rpc('obtener_ofertas_proveedor'),
  supabase.from('servicios').select('*,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre)').eq('proveedor_id',userId).in('estado',PROVIDER_ACTIVE_STATES).order('created_at',{ascending:false}).limit(1),
  supabase.from('pagos').select('*').eq('proveedor_id',userId).order('created_at',{ascending:false}),
 ])
 if(pe)throw pe;if(oe)throw oe;if(se)throw se;if(pae)throw pae
 return{provider:(p as ProviderProfileFull|null)||null,offers:(o||[])as Offer[],service:((s||[])[0]as Service|undefined)||null,payments:(pay||[])as ProviderPayment[]}
}

export async function setProviderAvailability(supabase:SupabaseClient,userId:string,online:boolean){const{error}=await supabase.from('perfiles_proveedor').update({disponible:online,online}).eq('usuario_id',userId);if(error)throw error}

async function hasPersistedAcceptedOpportunity(supabase:SupabaseClient,opportunityId:string){
 const{data:auth}=await supabase.auth.getUser();const userId=auth.user?.id;if(!userId)return false
 const{data:offer,error:offerError}=await supabase.from('ofertas_servicio').select('id,servicio_id,proveedor_id,estado').eq('id',opportunityId).eq('proveedor_id',userId).maybeSingle()
 if(offerError||!offer)return false
 const persistedOffer=offer as PersistedOffer
 if(persistedOffer.estado!=='aceptada'||!persistedOffer.servicio_id)return false
 const{data:service,error:serviceError}=await supabase.from('servicios').select('id,estado,proveedor_id').eq('id',persistedOffer.servicio_id).eq('proveedor_id',userId).in('estado',PROVIDER_ACTIVE_STATES).maybeSingle()
 if(serviceError||!service)return false
 const persistedService=service as PersistedService
 return persistedService.id===persistedOffer.servicio_id&&persistedService.proveedor_id===userId&&PROVIDER_ACTIVE_STATES.includes(persistedService.estado)
}

export async function acceptProviderOpportunity(supabase:SupabaseClient,id:string){const{data,error}=await supabase.rpc('aceptar_oferta',{p_oferta_id:id});if(error){if(await hasPersistedAcceptedOpportunity(supabase,id))return;throw error}if(!data){if(await hasPersistedAcceptedOpportunity(supabase,id))return;throw new Error('La oportunidad ya no está disponible. Actualizamos tu radar para mostrarte las opciones vigentes.')}}
export async function rejectProviderOpportunity(supabase:SupabaseClient,id:string){const{error}=await supabase.rpc('rechazar_oferta',{p_oferta_id:id});if(error)throw error}

function currentPosition(){return new Promise<GeolocationPosition>((resolve,reject)=>{if(!navigator.geolocation){reject(new Error('Este dispositivo no permite obtener tu ubicación.'));return}navigator.geolocation.getCurrentPosition(resolve,()=>reject(new Error('Necesitamos tu ubicación actual para confirmar que llegaste al cliente. Activá el permiso de ubicación y reintentá.')),{enableHighAccuracy:true,timeout:12000,maximumAge:15000})})}
async function publishProviderLocation(supabase:SupabaseClient){const{data:auth}=await supabase.auth.getUser();const userId=auth.user?.id;if(!userId)throw new Error('Sesión no disponible.');const position=await currentPosition();const latitude=Number(position.coords.latitude),longitude=Number(position.coords.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw new Error('No pudimos validar tu ubicación actual.');const point=`POINT(${longitude} ${latitude})`;const{error}=await supabase.from('perfiles_proveedor').update({ubicacion:point,ultima_ubicacion_at:new Date().toISOString()}).eq('usuario_id',userId);if(error)throw error}

export async function advanceProviderService(supabase:SupabaseClient,serviceId:string,state:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion'){
 if(state==='llegado')await publishProviderLocation(supabase)
 const{error}=await supabase.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:state})
 if(error)throw error
}
