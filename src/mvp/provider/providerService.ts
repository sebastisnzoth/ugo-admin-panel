import type{SupabaseClient}from'@supabase/supabase-js'
import{reportSentinelIncident}from'../../lib/sentinel'
import{PROVIDER_ACTIVE_STATES,type Offer,type Payment,type ProviderProfile,type Service}from'../shared'

export type ProviderProfileFull=ProviderProfile&{estado_verificacion?:string;zona_radio_km?:number|null;ciudad_base?:string|null}
export type ProviderPayment=Payment&{mp_payment_id?:string|null;mp_status?:string|null;metodo?:string|null;procesador?:string|null;pago_externo_id?:string|null;pix_e2e_id?:string|null;fecha_confirmacion?:string|null}
export type ProviderSnapshot={provider:ProviderProfileFull|null;offers:Offer[];service:Service|null;payments:ProviderPayment[]}

type PersistedOffer={id:string;servicio_id:string;proveedor_id:string;estado:string}
type PersistedService={id:string;estado:string;proveedor_id:string|null}
type ProviderService=Service&{programado_para?:string|null}
type ProviderTransitionState='en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion'
type SnapshotPart='profile'|'offers'|'services'|'payments'

const ACTIONABLE_SCHEDULE_LEAD_MS=60*60*1000
const LIVE_SERVICE_STATES=new Set(['en_camino','llegado','en_progreso','esperando_aprobacion','disputado'])
const LIFECYCLE_ORDER=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'] as const
const errorRecord=(error:unknown)=>error&&typeof error==='object'?error as Record<string,unknown>:null
const messageOf=(error:unknown,fallback:string)=>{if(error instanceof Error&&error.message)return error.message;const record=errorRecord(error),message=record?.message;return typeof message==='string'&&message.trim()?message:fallback}
const errorCode=(error:unknown)=>{const code=errorRecord(error)?.code;return typeof code==='string'&&code.trim()?code:null}

function scheduleTime(service:ProviderService){if(!service.programado_para)return null;const value=new Date(service.programado_para).getTime();return Number.isFinite(value)?value:null}
export function pickActionableProviderService(rows:ProviderService[],now=Date.now()):Service|null{
 const live=rows.find(service=>LIVE_SERVICE_STATES.has(service.estado));if(live)return live
 const immediate=rows.find(service=>service.estado==='asignado'&&!scheduleTime(service));if(immediate)return immediate
 const scheduled=rows.filter(service=>service.estado==='asignado').map(service=>({service,time:scheduleTime(service)})).filter((item):item is{service:ProviderService;time:number}=>item.time!=null&&item.time<=now+ACTIONABLE_SCHEDULE_LEAD_MS).sort((a,b)=>a.time-b.time)
 return scheduled[0]?.service||null
}

export async function loadProviderSnapshot(supabase:SupabaseClient,userId:string):Promise<ProviderSnapshot>{
 let failedPart:SnapshotPart|null=null
 try{
  const[{data:p,error:pe},{data:o,error:oe},{data:s,error:se},{data:pay,error:pae}]=await Promise.all([
   supabase.from('perfiles_proveedor').select('*').eq('usuario_id',userId).maybeSingle(),
   supabase.rpc('obtener_ofertas_proveedor'),
   supabase.from('servicios').select('*,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre)').eq('proveedor_id',userId).in('estado',PROVIDER_ACTIVE_STATES).order('created_at',{ascending:false}).limit(50),
   supabase.from('pagos').select('*').eq('proveedor_id',userId).order('created_at',{ascending:false}),
  ])
  if(pe){failedPart='profile';throw pe}if(oe){failedPart='offers';throw oe}if(se){failedPart='services';throw se}if(pae){failedPart='payments';throw pae}
  const services=(s||[])as ProviderService[]
  return{provider:(p as ProviderProfileFull|null)||null,offers:(o||[])as Offer[],service:pickActionableProviderService(services),payments:(pay||[])as ProviderPayment[]}
 }catch(error){
  const fallback='No se pudo cargar el estado operativo del proveedor.'
  void reportSentinelIncident({eventType:'provider_snapshot_error',message:messageOf(error,fallback),error,role:'provider',severity:'P1',action:'provider.snapshot.load',metadata:{component:failedPart,errorCode:errorCode(error)}})
  throw error
 }
}

async function persistedProviderAvailability(supabase:SupabaseClient,userId:string,online:boolean):Promise<boolean|null>{
 try{const{data,error}=await supabase.from('perfiles_proveedor').select('disponible,online').eq('usuario_id',userId).maybeSingle();if(error)return null;if(!data)return false;return data.disponible===online&&data.online===online}catch{return null}
}
export async function setProviderAvailability(supabase:SupabaseClient,userId:string,online:boolean){
 let mutationError:unknown
 try{
  const{error}=await supabase.from('perfiles_proveedor').update({disponible:online,online}).eq('usuario_id',userId)
  if(!error)return
  mutationError=error
 }catch(error){mutationError=error}
 const persisted=await persistedProviderAvailability(supabase,userId,online)
 if(persisted===true)return
 if(persisted===false){void reportSentinelIncident({eventType:'provider_availability_error',message:messageOf(mutationError,'No se pudo actualizar la disponibilidad.'),error:mutationError,role:'provider',severity:'P1',action:'provider.availability',checklistCode:'MATCH-ONLINE'})}
 else{void reportSentinelIncident({eventType:'provider_availability_recovery_unverified',message:'No pudimos confirmar el estado online/offline persistido. El radar volverá a leer la disponibilidad real.',error:mutationError,role:'provider',severity:'P2',action:'provider.availability.recovery'})}
 throw mutationError||new Error('No se pudo actualizar la disponibilidad.')
}

async function opportunityServiceId(supabase:SupabaseClient,opportunityId:string){
 try{const{data,error}=await supabase.from('ofertas_servicio').select('servicio_id').eq('id',opportunityId).maybeSingle();if(error)return null;return typeof data?.servicio_id==='string'?data.servicio_id:null}catch{return null}
}

async function persistedAcceptedOpportunity(supabase:SupabaseClient,opportunityId:string,knownServiceId:string|null):Promise<boolean|null>{
 try{
  const{data:auth,error:authError}=await supabase.auth.getUser();const userId=auth.user?.id;if(authError||!userId)return null
  let serviceId=knownServiceId
  if(!serviceId){
   const{data:offer,error:offerError}=await supabase.from('ofertas_servicio').select('id,servicio_id,proveedor_id,estado').eq('id',opportunityId).eq('proveedor_id',userId).maybeSingle()
   if(offerError)return null
   if(!offer)return false
   const persistedOffer=offer as PersistedOffer
   if(persistedOffer.estado!=='aceptada'||!persistedOffer.servicio_id)return false
   serviceId=persistedOffer.servicio_id
  }
  const{data:service,error:serviceError}=await supabase.from('servicios').select('id,estado,proveedor_id').eq('id',serviceId).maybeSingle()
  if(serviceError)return null
  if(!service)return false
  const persistedService=service as PersistedService
  if(persistedService.id!==serviceId)return false
  if(persistedService.proveedor_id!==userId)return false
  return PROVIDER_ACTIVE_STATES.includes(persistedService.estado)
 }catch{return null}
}

async function persistedRejectedOpportunity(supabase:SupabaseClient,opportunityId:string):Promise<boolean|null>{
 try{
  const{data:auth,error:authError}=await supabase.auth.getUser();const userId=auth.user?.id;if(authError||!userId)return null
  const{data,error}=await supabase.from('ofertas_servicio').select('estado').eq('id',opportunityId).eq('proveedor_id',userId).maybeSingle()
  if(error)return null
  if(!data)return false
  return data.estado==='rechazada'
 }catch{return null}
}

export async function acceptProviderOpportunity(supabase:SupabaseClient,id:string){
 const serviceId=await opportunityServiceId(supabase,id)
 const{data,error}=await supabase.rpc('aceptar_oferta',{p_oferta_id:id})
 if(error){
  const persisted=await persistedAcceptedOpportunity(supabase,id,serviceId)
  if(persisted===true)return
  if(persisted===false){void reportSentinelIncident({eventType:'provider_accept_offer_error',message:messageOf(error,'No se pudo aceptar el pedido.'),error,role:'provider',severity:'P0',serviceId,action:'provider.offer.accept',checklistCode:'PROVIDER-ASSIGN'})}
  else{void reportSentinelIncident({eventType:'provider_accept_offer_recovery_unverified',message:'Falló la aceptación y no pudimos verificar si la asignación quedó persistida. Actualizamos el estado real antes de permitir otro intento.',error,role:'provider',severity:'P1',serviceId,action:'provider.offer.accept.recovery'})}
  throw error
 }
 if(!data){
  const persisted=await persistedAcceptedOpportunity(supabase,id,serviceId)
  if(persisted===true)return
  const unavailable=new Error('La oportunidad ya no está disponible. Actualizamos tu radar para mostrarte las opciones vigentes.')
  void reportSentinelIncident({eventType:persisted===null?'provider_offer_recovery_unverified':'provider_offer_unavailable',message:persisted===null?'La oportunidad no confirmó aceptación y no pudimos verificar el estado persistido.':unavailable.message,error:unavailable,role:'provider',severity:persisted===null?'P1':'P2',serviceId,action:persisted===null?'provider.offer.accept.recovery':'provider.offer.accept'})
  throw unavailable
 }
}

export async function rejectProviderOpportunity(supabase:SupabaseClient,id:string){
 const serviceId=await opportunityServiceId(supabase,id)
 const{error}=await supabase.rpc('rechazar_oferta',{p_oferta_id:id})
 if(!error)return
 const persisted=await persistedRejectedOpportunity(supabase,id)
 if(persisted===true)return
 if(persisted===false){void reportSentinelIncident({eventType:'provider_reject_offer_error',message:messageOf(error,'No se pudo rechazar el pedido.'),error,role:'provider',severity:'P1',serviceId,action:'provider.offer.reject'})}
 else{void reportSentinelIncident({eventType:'provider_reject_offer_recovery_unverified',message:'No pudimos confirmar si el rechazo quedó persistido. El radar volverá a leer la oferta antes de escalar el incidente.',error,role:'provider',severity:'P2',serviceId,action:'provider.offer.reject.recovery'})}
 throw error
}

function currentPosition(){return new Promise<GeolocationPosition>((resolve,reject)=>{if(!navigator.geolocation){reject(new Error('Este dispositivo no permite obtener tu ubicación.'));return}navigator.geolocation.getCurrentPosition(resolve,()=>reject(new Error('Necesitamos tu ubicación actual para confirmar que llegaste al cliente. Activá el permiso de ubicación y reintentá.')),{enableHighAccuracy:true,timeout:12000,maximumAge:15000})})}
async function publishProviderLocation(supabase:SupabaseClient,serviceId:string){
 try{
  const position=await currentPosition(),latitude=Number(position.coords.latitude),longitude=Number(position.coords.longitude)
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw new Error('No pudimos validar tu ubicación actual.')
  const{error}=await supabase.rpc('actualizar_ubicacion_y_distancia',{p_lat:latitude,p_lng:longitude,p_servicio_id:serviceId})
  if(error)throw error
 }catch(error){void reportSentinelIncident({eventType:'provider_location_error',message:messageOf(error,'No se pudo publicar la ubicación del proveedor.'),error,role:'provider',severity:'P1',serviceId,action:'provider.service.location',checklistCode:'MAP-GPS'});throw error}
}

async function persistedProviderTransition(supabase:SupabaseClient,serviceId:string,target:ProviderTransitionState):Promise<boolean|null>{
 try{
  const{data:auth,error:authError}=await supabase.auth.getUser();const userId=auth.user?.id;if(authError||!userId)return null
  const{data,error}=await supabase.from('servicios').select('estado').eq('id',serviceId).eq('proveedor_id',userId).maybeSingle();if(error||!data)return null
  const current=LIFECYCLE_ORDER.indexOf(String(data.estado||'') as typeof LIFECYCLE_ORDER[number]),wanted=LIFECYCLE_ORDER.indexOf(target as typeof LIFECYCLE_ORDER[number])
  return wanted>=0&&current>=wanted
 }catch{return null}
}

export async function advanceProviderService(supabase:SupabaseClient,serviceId:string,state:ProviderTransitionState){
 if(state==='llegado')await publishProviderLocation(supabase,serviceId)
 const{error}=await supabase.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:state})
 if(!error)return
 const persisted=await persistedProviderTransition(supabase,serviceId,state)
 if(persisted===true)return
 if(persisted===false){
  void reportSentinelIncident({eventType:'provider_service_state_error',message:messageOf(error,`No se pudo avanzar el servicio a ${state}.`),error,role:'provider',severity:'P0',serviceId,action:'provider.service.advance',checklistCode:'PROVIDER-STATES',metadata:{targetState:state}})
 }else{
  void reportSentinelIncident({eventType:'provider_service_state_recovery_unverified',message:'No pudimos verificar si la transición quedó persistida. La interfaz volverá a consultar el estado real.',error,role:'provider',severity:'P1',serviceId,action:'provider.service.advance.recovery',metadata:{targetState:state}})
 }
 throw new Error(messageOf(error,`No se pudo avanzar el servicio a ${state}.`))
}

export async function cancelProviderService(supabase:SupabaseClient,serviceId:string,reason:string){
 const motivo=reason.trim()
 if(motivo.length<5)throw new Error('Indicá el motivo de la cancelación para que quede registrado.')
 const{error}=await supabase.rpc('cancelar_servicio_proveedor',{p_servicio_id:serviceId,p_motivo:motivo})
 if(!error)return
 try{const{data}=await supabase.from('servicios').select('estado').eq('id',serviceId).maybeSingle();if(data?.estado==='cancelado')return}catch{void 0}
 void reportSentinelIncident({eventType:'provider_service_cancel_error',message:messageOf(error,'No se pudo cancelar el servicio.'),error,role:'provider',severity:'P0',serviceId,action:'provider.service.cancel',checklistCode:'PROVIDER-STATES'})
 throw error
}
