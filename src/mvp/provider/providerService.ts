import type{SupabaseClient}from'@supabase/supabase-js'
import{reportSentinelIncident}from'../../lib/sentinel'
import{PROVIDER_ACTIVE_STATES,type Offer,type Payment,type ProviderProfile,type Service}from'../shared'

export type ProviderProfileFull=ProviderProfile&{estado_verificacion?:string;zona_radio_km?:number|null;ciudad_base?:string|null}
export type ProviderPayment=Payment&{mp_payment_id?:string|null;mp_status?:string|null;metodo?:string|null;procesador?:string|null;pago_externo_id?:string|null;pix_e2e_id?:string|null;fecha_confirmacion?:string|null}
export type ProviderDebt={id:string;pago_id:string;servicio_id:string;proveedor_id:string;monto_servicio:number;comision_ugo:number;monto_pagado_ugo:number;saldo_pendiente:number;moneda:string;ambiente:'real'|'demo';estado:'pendiente'|'informado'|'parcial'|'pagado'|'anulado';referencia_pago?:string|null;pago_informado_at?:string|null;pagado_at?:string|null;created_at:string;servicio?:{numero?:number|string|null}|null}
export type ProviderSnapshot={provider:ProviderProfileFull|null;offers:Offer[];service:Service|null;payments:ProviderPayment[];debts:ProviderDebt[]}

type PersistedOffer={id:string;servicio_id:string;proveedor_id:string;estado:string}
type PersistedService={id:string;estado:string;proveedor_id:string|null}
type ProviderService=Service&{programado_para?:string|null}
type ProviderTransitionState='en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion'
export type ProviderAdvanceOptions={locationAlreadyPublished?:boolean}
type SnapshotPart='profile'|'offers'|'services'|'payments'|'debts'

const ACTIONABLE_SCHEDULE_LEAD_MS=60*60*1000
const MISSION_SERVICE_STATES=new Set(['en_camino','llegado','en_progreso'])
const PASSIVE_SERVICE_STATES=new Set(['esperando_aprobacion','disputado'])
const LIFECYCLE_ORDER=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'] as const
const errorRecord=(error:unknown)=>error&&typeof error==='object'?error as Record<string,unknown>:null
const messageOf=(error:unknown,fallback:string)=>{if(error instanceof Error&&error.message)return error.message;const record=errorRecord(error),message=record?.message;return typeof message==='string'&&message.trim()?message:fallback}
const errorCode=(error:unknown)=>{const code=errorRecord(error)?.code;return typeof code==='string'&&code.trim()?code:null}
const isExpectedProviderTransitionRejection=(message:string)=>/programado para más adelante|iniciar el traslado hasta 60 minutos antes/i.test(message)

function scheduleTime(service:ProviderService){if(!service.programado_para)return null;const value=new Date(service.programado_para).getTime();return Number.isFinite(value)?value:null}
export function pickActionableProviderService(rows:ProviderService[],now=Date.now()):Service|null{
 const mission=rows.find(service=>MISSION_SERVICE_STATES.has(service.estado));if(mission)return mission
 const immediate=rows.find(service=>service.estado==='asignado'&&!scheduleTime(service));if(immediate)return immediate
 const scheduled=rows.filter(service=>service.estado==='asignado').map(service=>({service,time:scheduleTime(service)})).filter((item):item is{service:ProviderService;time:number}=>item.time!=null&&item.time<=now+ACTIONABLE_SCHEDULE_LEAD_MS).sort((a,b)=>a.time-b.time)
 if(scheduled[0]?.service)return scheduled[0].service
 return rows.find(service=>PASSIVE_SERVICE_STATES.has(service.estado))||null
}

export async function loadProviderSnapshot(supabase:SupabaseClient,userId:string):Promise<ProviderSnapshot>{
 let failedPart:SnapshotPart|null=null
 try{
  const[{data:p,error:pe},{data:o,error:oe},{data:s,error:se},{data:pay,error:pae},{data:debts,error:debtError}]=await Promise.all([
   supabase.from('perfiles_proveedor').select('*').eq('usuario_id',userId).maybeSingle(),
   supabase.rpc('obtener_ofertas_proveedor'),
   supabase.from('servicios').select('*,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre)').eq('proveedor_id',userId).in('estado',PROVIDER_ACTIVE_STATES).order('created_at',{ascending:false}).limit(50),
   supabase.from('pagos').select('*').eq('proveedor_id',userId).order('created_at',{ascending:false}),
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabla agregada por migración 20260920070000; regenerar tipos al promover TEST→PROD.
   (supabase as any).from('deudas_ugo_proveedor').select('id,pago_id,servicio_id,proveedor_id,monto_servicio,comision_ugo,monto_pagado_ugo,saldo_pendiente,moneda,ambiente,estado,referencia_pago,pago_informado_at,pagado_at,created_at,servicio:servicios!deudas_ugo_proveedor_servicio_id_fkey(numero)').eq('proveedor_id',userId).order('created_at',{ascending:false}),
  ])
  if(pe){failedPart='profile';throw pe}if(oe){failedPart='offers';throw oe}if(se){failedPart='services';throw se}if(pae){failedPart='payments';throw pae}if(debtError){failedPart='debts';throw debtError}
  const services=(s||[])as ProviderService[]
  return{provider:(p as ProviderProfileFull|null)||null,offers:(o||[])as Offer[],service:pickActionableProviderService(services),payments:(pay||[])as ProviderPayment[],debts:(debts||[])as ProviderDebt[]}
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

const GPS_TARGET_ACCURACY_M=80
const GPS_ACCEPTABLE_ACCURACY_M=250
const GPS_FRESH_MS=30_000
const GPS_TIMEOUT_MS=20_000
function usablePosition(position:GeolocationPosition){const lat=Number(position.coords.latitude),lng=Number(position.coords.longitude),accuracy=Number(position.coords.accuracy);return Number.isFinite(lat)&&Number.isFinite(lng)&&Number.isFinite(accuracy)&&accuracy>0&&!(Math.abs(lat)<0.0001&&Math.abs(lng)<0.0001)}
function positionAge(position:GeolocationPosition){return Math.max(0,Date.now()-Number(position.timestamp||0))}
function acceptablePosition(position:GeolocationPosition){return usablePosition(position)&&positionAge(position)<=GPS_FRESH_MS&&Number(position.coords.accuracy)<=GPS_ACCEPTABLE_ACCURACY_M}
function geolocationError(error:GeolocationPositionError){
 if(error.code===1)return new Error('Necesitamos tu ubicación para confirmar la llegada. Habilitá Ubicación precisa para UGO y reintentá.')
 if(error.code===2)return new Error('El teléfono todavía no pudo fijar tu posición. Salí a un lugar con mejor señal y reintentá.')
 return new Error('El GPS está demorando en fijar tu posición. Mantené UGO abierto y reintentá.')
}
function onePosition(options:PositionOptions){return new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,options))}
async function currentPosition(){
 if(!navigator.geolocation)throw new Error('Este dispositivo no permite obtener tu ubicación.')
 let best:GeolocationPosition|null=null,lastError:GeolocationPositionError|null=null
 // First wake the location provider. A strict maximumAge=0 call can fail on mobile WebViews
 // before the GPS has a fix, so use a recent device fix only as a candidate while acquiring a fresh one.
 try{const warm=await onePosition({enableHighAccuracy:true,maximumAge:GPS_FRESH_MS,timeout:7_000});if(acceptablePosition(warm))best=warm}catch(error){lastError=error as GeolocationPositionError;if(lastError.code===1)throw geolocationError(lastError)}
 return await new Promise<GeolocationPosition>((resolve,reject)=>{
  let settled=false,watchId:number|null=null,timer:number|null=null
  const cleanup=()=>{if(watchId!=null)navigator.geolocation.clearWatch(watchId);if(timer!=null)window.clearTimeout(timer)}
  const finish=(position:GeolocationPosition)=>{if(settled)return;settled=true;cleanup();resolve(position)}
  const fail=(error:Error)=>{if(settled)return;settled=true;cleanup();reject(error)}
  timer=window.setTimeout(()=>{if(best&&acceptablePosition(best))finish(best);else if(lastError)fail(geolocationError(lastError));else fail(new Error('No pudimos fijar tu ubicación con precisión suficiente. Mantené la ubicación precisa activa, dejá UGO abierto unos segundos y reintentá.'))},GPS_TIMEOUT_MS)
  watchId=navigator.geolocation.watchPosition(position=>{
   if(!usablePosition(position)||positionAge(position)>GPS_FRESH_MS)return
   if(!best||position.coords.accuracy<best.coords.accuracy||position.timestamp>best.timestamp)best=position
   if(position.coords.accuracy<=GPS_TARGET_ACCURACY_M)finish(position)
  },error=>{lastError=error;if(error.code===1)fail(geolocationError(error))},{enableHighAccuracy:true,timeout:GPS_TIMEOUT_MS,maximumAge:0})
 })
}
async function publishProviderLocation(supabase:SupabaseClient,serviceId:string){
 try{
  const position=await currentPosition(),latitude=Number(position.coords.latitude),longitude=Number(position.coords.longitude)
  if(!acceptablePosition(position))throw new Error('La ubicación recibida no es suficientemente reciente o precisa para confirmar la llegada. Reintentá con Ubicación precisa activa.')
  const capturedAt=new Date(Number(position.timestamp)).toISOString(),accuracy=Number(position.coords.accuracy)
  const{error}=await supabase.rpc('publicar_ubicacion_proveedor',{p_servicio_id:serviceId,p_lat:latitude,p_lng:longitude,p_captured_at:capturedAt,p_accuracy_m:accuracy})
  if(error)throw error
 }catch(error){void reportSentinelIncident({eventType:'provider_location_error',message:messageOf(error,'No se pudo publicar la ubicación del proveedor.'),error,role:'provider',severity:'P0',serviceId,action:'provider.service.location',checklistCode:'MAP-GPS'});throw error}
}

async function persistedProviderTransition(supabase:SupabaseClient,serviceId:string,target:ProviderTransitionState):Promise<boolean|null>{
 try{
  const{data:auth,error:authError}=await supabase.auth.getUser();const userId=auth.user?.id;if(authError||!userId)return null
  const{data,error}=await supabase.from('servicios').select('estado').eq('id',serviceId).eq('proveedor_id',userId).maybeSingle();if(error||!data)return null
  const current=LIFECYCLE_ORDER.indexOf(String(data.estado||'') as typeof LIFECYCLE_ORDER[number]),wanted=LIFECYCLE_ORDER.indexOf(target as typeof LIFECYCLE_ORDER[number])
  return wanted>=0&&current>=wanted
 }catch{return null}
}

type ProviderArrivalResult={status?:string;code?:string;state?:string|null;distance_m?:number|null;location_age_ms?:number|null;idempotent?:boolean}
type ProviderArrivalFailure=Error&{ugoArrivalCode?:string}
const arrivalFailure=(code:string,message:string)=>Object.assign(new Error(message),{ugoArrivalCode:code}) as ProviderArrivalFailure
const providerArrivalCode=(error:unknown)=>{const code=errorRecord(error)?.ugoArrivalCode;return typeof code==='string'?code:null}
const isExpectedProviderArrivalRejection=(error:unknown)=>{const code=providerArrivalCode(error);return code==='outside_geofence'||code==='invalid_state'}
function providerArrivalError(result:ProviderArrivalResult){
 const code=String(result.code||'backend_invalid_response')
 if(code==='outside_geofence')return arrivalFailure(code,result.distance_m!=null?`Todavía estás a ${Math.round(result.distance_m)} m del punto del servicio. Acercate a 200 m o menos para confirmar llegada.`:'Todavía estás demasiado lejos del punto del servicio para confirmar llegada.')
 if(code==='gps_stale')return arrivalFailure(code,'Tu última ubicación ya no es reciente. UGO necesita una posición GPS nueva para confirmar la llegada.')
 if(code==='gps_unavailable')return arrivalFailure(code,'No hay una ubicación GPS válida publicada. Activá Ubicación precisa y reintentá.')
 if(code==='gps_inaccurate')return arrivalFailure(code,'La precisión GPS todavía no es suficiente para confirmar la llegada.')
 if(code==='client_location_unavailable')return arrivalFailure(code,'El punto del servicio no tiene una ubicación válida para verificar la llegada.')
 if(code==='invalid_state')return arrivalFailure(code,'El servicio ya no está en un estado que permita confirmar llegada.')
 return arrivalFailure(code,'UGO no pudo validar la llegada con el backend.')
}
async function markProviderArrived(supabase:SupabaseClient,serviceId:string){
 await publishProviderLocation(supabase,serviceId)
 return confirmProviderArrival(supabase,serviceId)
}
async function confirmProviderArrival(supabase:SupabaseClient,serviceId:string){
 const{data,error}=await supabase.rpc('marcar_llegada_proveedor',{p_servicio_id:serviceId})
 if(!error){
  const result=(data||{}) as ProviderArrivalResult
  if(result.status==='arrived')return
  throw providerArrivalError(result)
 }
 const persisted=await persistedProviderTransition(supabase,serviceId,'llegado')
 if(persisted===true)return
 throw error
}

export async function advanceProviderService(supabase:SupabaseClient,serviceId:string,state:ProviderTransitionState,options:ProviderAdvanceOptions={}){
 if(state==='llegado'){
  try{return options.locationAlreadyPublished?await confirmProviderArrival(supabase,serviceId):await markProviderArrived(supabase,serviceId)}
  catch(error){
   const transitionMessage=messageOf(error,'No se pudo confirmar la llegada.')
   if(!isExpectedProviderArrivalRejection(error))void reportSentinelIncident({eventType:'provider_arrival_error',message:transitionMessage,error,role:'provider',severity:'P0',serviceId,action:'provider.service.arrive',checklistCode:'MAP-GPS',metadata:{arrivalCode:providerArrivalCode(error)}})
   throw error
  }
 }
 const{error}=await supabase.rpc('avanzar_servicio',{p_servicio_id:serviceId,p_estado:state})
 if(!error)return
 const persisted=await persistedProviderTransition(supabase,serviceId,state)
 if(persisted===true)return
 const transitionMessage=messageOf(error,`No se pudo avanzar el servicio a ${state}.`)
 if(persisted===false){
  if(!isExpectedProviderTransitionRejection(transitionMessage))void reportSentinelIncident({eventType:'provider_service_state_error',message:transitionMessage,error,role:'provider',severity:'P0',serviceId,action:'provider.service.advance',checklistCode:'PROVIDER-STATES',metadata:{targetState:state}})
 }else{
  void reportSentinelIncident({eventType:'provider_service_state_recovery_unverified',message:'No pudimos verificar si la transición quedó persistida. La interfaz volverá a consultar el estado real.',error,role:'provider',severity:'P1',serviceId,action:'provider.service.advance.recovery',metadata:{targetState:state}})
 }
 throw new Error(transitionMessage)
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
