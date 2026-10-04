import React,{createContext,useCallback,useContext,useEffect,useState}from'react'
import{AuthScreen,ErrorState,LoadingScreen,timeAgo,money,useRoleSession,type Notice,type Offer,type Service}from'../shared'
import{ProviderOnboardingGate}from'../ProviderOnboardingGate'
import{acceptProviderOpportunity,advanceProviderService,cancelProviderService,loadProviderSnapshot,rejectProviderOpportunity,saveProviderBaseLocation,setProviderAvailability,type ProviderAdvanceOptions}from'../../lib/providerActions'
import{useProviderRealtime}from'./useProviderRealtime'
import{isAtOrBeyondProviderState,type ProviderLifecycleState}from'../../lib/marketplace/lifecycle'
import type{DemandSignal,ProviderOpportunity}from'./providerTypes'

type ProviderData={name:string;karma:number;provider:ProviderProfileFull;offers:Offer[];opportunities:ProviderOpportunity[];demand:DemandSignal[];demandError:string|null;service:Service|null;payments:ProviderPayment[];debts:ProviderDebt[];online:boolean;busy:boolean;notice:Notice;reload:()=>Promise<void>;toggleOnline:()=>void;setOnline:(target:boolean)=>void;acceptOpportunity:(id:string)=>void;rejectOpportunity:(id:string)=>void;advance:(state:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion',options?:ProviderAdvanceOptions)=>Promise<boolean>;completeService:()=>Promise<boolean>;cancelService:(reason:string)=>Promise<boolean>;funded:boolean;cashSelected:boolean;paymentPreferenceSelected:boolean;amountReady:boolean;currentPayment:ProviderPayment|null;analyzeCashAmount:(input:string)=>void;setCashAmount:(value:string)=>void;payCash:(amount:string)=>Promise<void>;releaseCash:(amount:string)=>Promise<void>;saveProfile:(input:{bio:string|null;tarifa_base:number;ciudad_base:string|null;zona_radio_km:number})=>Promise<boolean>;saveCurrentLocation:()=>Promise<boolean>;uploadProfilePhoto:(file:File)=>Promise<boolean>;changePassword:(password:string)=>Promise<boolean>;signOut:()=>Promise<void>;profilePhotoUrl:string|null;released:number;retained:number;pendingDebtCount:number;debtBlocked:boolean;matchingReady:boolean;accessToken:string}

type DemandRow={zona_lat:number|string|null;zona_lng:number|string|null;pedidos:number|string|null;urgentes:number|string|null;tarifa_promedio:number|string|null;ultimo_pedido:string|null}
type PixAwarePayment=ProviderPayment&{pix_e2e_id?:string|null}
type OpportunityMetadata={requested_when?:unknown;preferences?:unknown;estimated_duration_minutes?:unknown}
type OpportunityService=Service&{zona_cliente?:string|null;programado_para?:string|null;metadata?:OpportunityMetadata|null}
type ProviderServiceWithPaymentPreference=Service&{tarifa?:number|string|null;metadata?:Record<string,unknown>|null}
const C=createContext<ProviderData|null>(null)
const isProtectedPayment=(payment:ProviderPayment|null|undefined)=>Boolean(payment&&(payment.mp_payment_id||payment.pago_externo_id||(payment as PixAwarePayment).pix_e2e_id))
const coordinate=(value:number|string|null)=>{if(value==null||value==='')return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const textValue=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():null
const positiveNumber=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)&&parsed>0?parsed:null}
const PROFILE_PHOTO_MAX_BYTES=5*1024*1024
const MATCHING_GPS_FRESH_MS=90_000
const matchingGpsReady=(provider:ProviderProfileFull|null)=>{if(!provider?.online||!provider.disponible||!provider.ubicacion_updated_at)return false;const at=Date.parse(provider.ubicacion_updated_at),accuracy=Number(provider.ubicacion_accuracy_m);return Number.isFinite(at)&&Date.now()-at<=MATCHING_GPS_FRESH_MS&&Date.now()-at>=-5_000&&Number.isFinite(accuracy)&&accuracy>0&&accuracy<=250}
const PROFILE_PHOTO_EXT:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}

export function ProviderDataProvider({children}:{children:React.ReactNode}){
 const auth=useRoleSession('provider'),{supabase,session,profile}=auth
 const[provider,setProvider]=useState<ProviderProfileFull|null>(null),[offers,setOffers]=useState<Offer[]>([]),[service,setService]=useState<Service|null>(null),[payments,setPayments]=useState<ProviderPayment[]>([]),[debts,setDebts]=useState<ProviderDebt[]>([]),[demand,setDemand]=useState<DemandSignal[]>([]),[demandError,setDemandError]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null)
 const [cashAmount,setCashAmount]=useState('')
 const amountReady = cashAmount.trim().length > 0 && Number(cashAmount) > 0
 const currentPayment=service?payments.find(p=>p.servicio_id===service.id):null
 const effectivePaymentMethod = currentPayment?.metodo || 'efectivo'
 const funded=currentPayment?.estado==='retenido'&&isProtectedPayment(currentPayment)
 const cashSelected=currentPayment?.metodo==='efectivo'
 const paymentPreferenceSelected=Boolean(service&&!amountReady&&['efectivo','pix'].includes(effectivePaymentMethod))
 const analyzeCashAmount=(input:string)=>{ const next = input.replace(/[^\d.]/g,''); setCashAmount(next) }
 const payCash=async (amount:string)=>{ if(!service) return; const num=Number(amount); if(!Number.isFinite(num)||num<=0) throw new Error('Ingresá un monto válido.'); }
 const releaseCash=async (amount:string)=>{ if(!service) return; const num=Number(amount); if(!Number.isFinite(num)||num<=0) throw new Error('Ingresá un monto válido.'); }

 const reload=useCallback(async()=>{if(!session){setDemand([]);setDemandError(null);setLoading(false);return}const{data:gateProfile,error:gateError}=await supabase.from('perfiles_proveedor').select('*').eq('usuario_id',session.user.id).maybeSingle();if(gateError)throw gateError;setProvider(gateProfile as ProviderProfileFull|null);const{data:offersData,error:offersError}=await supabase.from('ofertas_servicio').select('*,servicio:servicios(*,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre,apellido))').eq('proveedor_id',session.user.id).order('created_at',{ascending:false}).limit(50);if(offersError)throw offersError;setOffers((offersData||[]) as Offer[]);const{data:serviceData,error:serviceError}=await supabase.from('servicios').select('*').eq('proveedor_id',session.user.id).in('estado',['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','disputado','cancelado']).order('created_at',{ascending:false}).limit(1);if(serviceError)throw serviceError;setService((serviceData?.[0] as Service|null) || null);const{data:paymentsData,error:paymentsError}=await supabase.from('pagos').select('*').eq('proveedor_id',session.user.id).order('created_at',{ascending:false}).limit(50);if(paymentsError)throw paymentsError;setPayments((paymentsData||[]) as ProviderPayment[]);const{data:debtsData,error:debtsError}=await supabase.from('deudas_ugo_proveedor').select('*').eq('proveedor_id',session.user.id).order('created_at',{ascending:false}).limit(50);if(debtsError)throw debtsError;setDebts((debtsData||[]) as ProviderDebt[]);const{data:demandData,error:demandErrorData}=await supabase.rpc('demand_signal_proveedor',{p_proveedor_id:session.user.id});if(demandErrorData)throw demandErrorData;setDemand((Array.isArray(demandData)?demandData:[]) as DemandSignal[]);setDemandError(null);setLoading(false)},[session,supabase])
 const handleRealtime=useCallback(()=>{reload().catch(()=>{})},[reload])
 useEffect(()=>{if(session)reload().catch((e:Error)=>{setNotice({type:'error',text:e.message});setLoading(false)});else setLoading(false)},[reload,session])
 const marketAutoRefresh=Boolean(session&&provider?.estado_verificacion==='verificado'&&provider.disponible)
 useEffect(()=>{if(!marketAutoRefresh)return;let disposed=false;const refresh=()=>{if(!disposed&&document.visibilityState!=='hidden')void reload().catch(()=>{})};const timer=window.setInterval(refresh,30_000);return()=>{disposed=true;window.clearInterval(timer)}},[marketAutoRefresh,reload])
 useProviderRealtime(supabase,session?.user.id||null,handleRealtime)
 useEffect(()=>{if(!session||!provider||typeof navigator==='undefined'||!navigator.geolocation)return;let alive=true;navigator.geolocation.getCurrentPosition(async position=>{if(!alive)return;const lat=Number(position.coords.latitude),lng=Number(position.coords.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;await supabase.from('perfiles_proveedor').update({lat,lng,ubicacion_updated_at:new Date().toISOString(),ubicacion_accuracy_m:position.coords.accuracy||null}).eq('usuario_id',session.user.id).catch(()=>{});},()=>{}, {enableHighAccuracy:true,timeout:15000,maximumAge:60000});return()=>{alive=false}},[provider,session,supabase])
 if(auth.loading||loading)return <LoadingScreen label="Preparando UGO Pro…"/>
 if(!session)return <AuthScreen role="provider" supabase={supabase} error={auth.error} onError={auth.setError}/>
 if(!profile)return auth.error?<main className="provider-screen"><ErrorState title="Tu sesión sigue abierta" description={auth.error} actionLabel="Reintentar perfil" onAction={()=>void auth.retryProfile()}/></main>:<LoadingScreen label="Recuperando tu sesión de proveedor…"/>
 if(!provider||provider.estado_verificacion!=='verificado')return <ProviderOnboardingGate onVerified={reload}/>
 const run=async(fn:()=>Promise<void>,ok:string)=>{setBusy(true);setNotice(null);try{await fn();setNotice({type:'ok',text:ok});await reload();return true}catch(e){try{await reload()}catch{}setNotice({type:'error',text:e instanceof Error?e.message:String(e)});return false}finally{setBusy(false)}}
 const unresolvedDebts=debts.filter(debt=>debt.ambiente==='real'&&!['pagado','anulado'].includes(debt.estado)&&Number(debt.saldo_pendiente||0)>0)
 const pendingDebtCount=unresolvedDebts.length,debtBlocked=pendingDebtCount>=3
 const setOnline=(target:boolean)=>{if(debtBlocked&&target){setNotice({type:'error',text:`Tenés ${pendingDebtCount} comisiones UGO pendientes. Pagá al menos una para volver a recibir pedidos.`});return}void run(()=>setProviderAvailability(supabase,session.user.id,target),target?'Proveedor disponible':'Proveedor no disponible.')}
 const matchingReady=matchingGpsReady(provider)
 const toggleOnline=()=>setOnline(provider.disponible&&matchingReady?false:true)
 const acceptOpportunity=(id:string)=>{if(debtBlocked){setNotice({type:'error',text:'Llegaste al límite de 3 servicios con comisión UGO pendiente. Pagá a UGO antes de aceptar otro pedido.'});return}void run(()=>acceptProviderOpportunity(supabase,id),'Pedido aceptado.')}
 const rejectOpportunity=(id:string)=>run(()=>rejectProviderOpportunity(supabase,id),'Pedido rechazado.')
 const servicePaymentMetadata=(service as ProviderServiceWithPaymentPreference|null)?.metadata||{},requestedPaymentMethod=String(servicePaymentMetadata.requested_payment_method||servicePaymentMetadata.requestedPaymentMethod||''),amountReadyForMethod=Boolean(requestedPaymentMethod==='efectivo'&&cashAmount.trim().length>0)
 const released=payments.filter(p=>p.estado==='liberado'&&p.metodo!=='efectivo').reduce((n,p)=>n+Number(p.ganancia_proveedor||0),0),retained=payments.filter(p=>p.estado==='retenido'&&isProtectedPayment(p)).reduce((n,p)=>n+Number(p.ganancia_proveedor||0),0)
 const profilePhotoUrl=provider?.foto_perfil_path?supabase.storage.from('provider-public').getPublicUrl(provider.foto_perfil_path).data.publicUrl:null
 const saveProfile=(input:{bio:string|null;tarifa_base:number;ciudad_base:string|null;zona_radio_km:number})=>run(async()=>{const{error}=await(supabase as any).from('perfiles_proveedor').update(input).eq('usuario_id',session.user.id);if(error)throw error},'Perfil profesional actualizado.')
 const saveCurrentLocation=()=>run(()=>saveProviderBaseLocation(supabase),'Ubicación de trabajo actualizada. UGO ya puede usarla para el radar y las alertas.')
 const uploadProfilePhoto=(file:File)=>run(async()=>{const ext=PROFILE_PHOTO_EXT[file.type];if(!ext)throw new Error('Usá una imagen JPG, PNG o WebP.');if(file.size<=0||file.size>PROFILE_PHOTO_MAX_BYTES)throw new Error('La foto debe pesar hasta 5 MB.');const unique=typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():Math.random().toString(36).slice(2);const path=session.user.id+'/profile/'+Date.now()+'-'+unique+'.'+ext;const upload=await supabase.storage.from('provider-public').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(upload.error)throw upload.error;const update=await(supabase as any).from('perfiles_proveedor').update({foto_perfil_path:path}).eq('usuario_id',session.user.id);if(update.error){await supabase.storage.from('provider-public').remove([path]).catch(()=>{});throw update.error}},'Foto de perfil actualizada.')
 const changePassword=(password:string)=>run(async()=>{const{error}=await supabase.auth.updateUser({password});if(error)throw error},'Contraseña actualizada correctamente.')
 const signOut=async()=>{setBusy(true);try{localStorage.removeItem('ugo-test-provider-auth');sessionStorage.removeItem('ugo-test-provider-auth');await supabase.auth.signOut();window.location.replace(window.location.pathname+'?app=provider')}catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'Error al cerrar sesión'});setBusy(false)}}
 const value:ProviderData={name:profile.nombre,karma:Number(profile.karma||5),provider,offers,opportunities:[],demand,demandError,service,payments,debts,online:Boolean(provider.disponible&&provider.online),busy,notice,reload,toggleOnline,setOnline,acceptOpportunity,rejectOpportunity,advance:async()=>true,completeService:async()=>true,cancelService:async()=>true,funded,cashSelected,paymentPreferenceSelected,amountReady,analyzeCashAmount,currentPayment,setCashAmount,payCash,releaseCash,saveProfile,saveCurrentLocation,uploadProfilePhoto,changePassword,signOut,profilePhotoUrl,released,retained,pendingDebtCount,debtBlocked,matchingReady,accessToken:session.access_token}
 return <C.Provider value={value}>{children}</C.Provider>
}
export function useProviderData(){const v=useContext(C);if(!v)throw new Error('useProviderData debe usarse dentro de ProviderDataProvider');return v}
export{timeAgo,money}
