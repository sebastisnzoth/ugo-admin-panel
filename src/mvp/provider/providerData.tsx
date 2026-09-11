import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from'react'
import{AuthScreen,LoadingScreen,timeAgo,money,useRoleSession,type Notice,type Offer,type Service}from'../shared'
import{ProviderOnboardingGate}from'../ProviderOnboardingGate'
import{acceptProviderOpportunity,advanceProviderService,loadProviderSnapshot,rejectProviderOpportunity,setProviderAvailability,type ProviderPayment,type ProviderProfileFull}from'./providerService'
import{useProviderRealtime}from'./useProviderRealtime'
import type{DemandSignal,ProviderOpportunity}from'./providerTypes'

type ProviderData={name:string;karma:number;provider:ProviderProfileFull;offers:Offer[];opportunities:ProviderOpportunity[];demand:DemandSignal[];service:Service|null;payments:ProviderPayment[];online:boolean;released:number;retained:number;busy:boolean;notice:Notice;reload:()=>Promise<void>;toggleOnline:()=>Promise<void>;acceptOpportunity:(id:string)=>Promise<boolean>;rejectOpportunity:(id:string)=>Promise<boolean>;advance:(state:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion')=>Promise<boolean>;funded:boolean}
const C=createContext<ProviderData|null>(null)

export function ProviderDataProvider({children}:{children:React.ReactNode}){
 const auth=useRoleSession('provider'),{supabase,session,profile}=auth
 const[provider,setProvider]=useState<ProviderProfileFull|null>(null),[offers,setOffers]=useState<Offer[]>([]),[service,setService]=useState<Service|null>(null),[payments,setPayments]=useState<ProviderPayment[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null)
 const reload=useCallback(async()=>{if(!session)return;const snap=await loadProviderSnapshot(supabase,session.user.id);setProvider(snap.provider);setOffers(snap.offers);setService(snap.service);setPayments(snap.payments);setLoading(false)},[session,supabase])
 useEffect(()=>{if(session)reload().catch((e:Error)=>{setNotice({type:'error',text:e.message});setLoading(false)})},[reload,session])
 useProviderRealtime(supabase,session?.user.id||null,()=>{reload().catch(()=>{})})
 if(auth.loading||loading)return <LoadingScreen label="Preparando UGO Pro…"/>
 if(!session||!profile)return <AuthScreen role="provider" supabase={supabase} error={auth.error} onError={auth.setError}/>
 if(!provider||provider.estado_verificacion!=='verificado')return <ProviderOnboardingGate/>
 const run=async(fn:()=>Promise<void>,ok:string)=>{setBusy(true);setNotice(null);try{await fn();setNotice({type:'ok',text:ok});await reload();return true}catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'No se pudo completar la acción.'});return false}finally{setBusy(false)}}
 const toggleOnline=()=>run(()=>setProviderAvailability(supabase,session.user.id,!provider.disponible),provider.disponible?'Quedaste Offline.':'Ya estás Online.')
 const acceptOpportunity=(id:string)=>{if(service){setNotice({type:'info',text:'Ya tenés un trabajo activo. Finalizalo antes de aceptar otro.'});return Promise.resolve(false)}return run(()=>acceptProviderOpportunity(supabase,id),'Misión aceptada. Esperando pago protegido del cliente.')}
 const rejectOpportunity=(id:string)=>run(()=>rejectProviderOpportunity(supabase,id),'Oportunidad rechazada.')
 const currentPayment=service?payments.find(p=>p.servicio_id===service.id):null
 const funded=currentPayment?.estado==='retenido'&&Boolean(currentPayment.mp_payment_id)
 const advance=(state:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion')=>{if(!service)return Promise.resolve(false);if(service.estado==='asignado'&&!funded){setNotice({type:'info',text:'Todavía falta la confirmación del pago protegido.'});return Promise.resolve(false)}return run(()=>advanceProviderService(supabase,service.id,state),'Estado del servicio actualizado.')}
 const opportunities=useMemo(()=>offers.map(o=>({id:o.id,category:o.servicio?.categoria?.nombre||'Servicio',title:o.servicio?.descripcion||'Nueva oportunidad',description:o.servicio?.descripcion||'',zone:o.servicio?.direccion_cliente||'Zona por confirmar',distanceKm:Number(o.distancia_km||0),estimatedValue:Number(o.tarifa_ofrecida||o.servicio?.tarifa||0),requestedAt:o.servicio?.created_at||new Date().toISOString(),urgency:o.servicio?.urgencia?'urgent':'normal',matchScore:o.ranking==null?undefined:Number(o.ranking)})),[offers])
 const demand=useMemo(()=>opportunities.map((o,i)=>({id:o.id,category:o.category,zone:o.zone,distanceKm:o.distanceKm,estimatedValue:o.estimatedValue,requestedAt:o.requestedAt,urgency:o.urgency==='urgent'?'high':'medium',demandLevel:i<2?'high':'medium'} as DemandSignal)),[opportunities])
 const released=payments.filter(p=>p.estado==='liberado').reduce((n,p)=>n+Number(p.ganancia_proveedor||0),0),retained=payments.filter(p=>p.estado==='retenido'&&Boolean(p.mp_payment_id)).reduce((n,p)=>n+Number(p.ganancia_proveedor||0),0)
 const value:ProviderData={name:profile.nombre,karma:Number(profile.karma||5),provider,offers,opportunities,demand,service,payments,online:Boolean(provider.disponible),released,retained,busy,notice,reload,toggleOnline,acceptOpportunity,rejectOpportunity,advance,funded}
 return <C.Provider value={value}>{children}</C.Provider>
}
export function useProviderData(){const v=useContext(C);if(!v)throw new Error('useProviderData debe usarse dentro de ProviderDataProvider');return v}
export{timeAgo,money}
