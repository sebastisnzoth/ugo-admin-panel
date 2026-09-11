import React,{createContext,useCallback,useContext,useEffect,useState}from'react'
import{AuthScreen,LoadingScreen,timeAgo,money,useRoleSession,type Notice,type Offer,type Service}from'../shared'
import{ProviderOnboardingGate}from'../ProviderOnboardingGate'
import{acceptProviderOpportunity,advanceProviderService,loadProviderSnapshot,rejectProviderOpportunity,setProviderAvailability,type ProviderPayment,type ProviderProfileFull}from'./providerService'
import{useProviderRealtime}from'./useProviderRealtime'
import type{DemandSignal,ProviderOpportunity}from'./providerTypes'

type ProviderData={name:string;karma:number;provider:ProviderProfileFull;offers:Offer[];opportunities:ProviderOpportunity[];demand:DemandSignal[];service:Service|null;payments:ProviderPayment[];online:boolean;released:number;retained:number;busy:boolean;notice:Notice;reload:()=>Promise<void>;toggleOnline:()=>Promise<boolean>;acceptOpportunity:(id:string)=>Promise<boolean>;rejectOpportunity:(id:string)=>Promise<boolean>;advance:(state:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion')=>Promise<boolean>;funded:boolean;cashSelected:boolean;cashConfirmed:boolean;confirmCash:()=>Promise<boolean>}
type DemandRow={zona_lat:number|null;zona_lng:number|null;pedidos:number|string|null;urgentes:number|string|null;tarifa_promedio:number|string|null;ultimo_pedido:string|null}
type PixAwarePayment=ProviderPayment&{pix_e2e_id?:string|null}
const C=createContext<ProviderData|null>(null)
const isProtectedPayment=(payment:ProviderPayment|null|undefined)=>Boolean(payment&&(payment.mp_payment_id||payment.pago_externo_id||(payment as PixAwarePayment).pix_e2e_id))

export function ProviderDataProvider({children}:{children:React.ReactNode}){
 const auth=useRoleSession('provider'),{supabase,session,profile}=auth
 const[provider,setProvider]=useState<ProviderProfileFull|null>(null),[offers,setOffers]=useState<Offer[]>([]),[service,setService]=useState<Service|null>(null),[payments,setPayments]=useState<ProviderPayment[]>([]),[demand,setDemand]=useState<DemandSignal[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null)
 const reload=useCallback(async()=>{if(!session){setDemand([]);setLoading(false);return}const snap=await loadProviderSnapshot(supabase,session.user.id);setProvider(snap.provider);setOffers(snap.offers);setService(snap.service);setPayments(snap.payments);let nextDemand:DemandSignal[]=[];if(snap.provider?.estado_verificacion==='verificado'){const categoryId=snap.provider.categoria_principal_id||null;const[{data:market,error:marketError},{data:category}]=await Promise.all([supabase.rpc('obtener_demanda_proveedor',{p_categoria_id:categoryId,p_horas:24}),categoryId?supabase.from('categorias').select('nombre').eq('id',categoryId).maybeSingle():Promise.resolve({data:null,error:null})]);if(!marketError){const categoryName=String(category?.nombre||'Tu categoría');nextDemand=((market||[])as DemandRow[]).map((row,index)=>{const requests=Math.max(0,Number(row.pedidos||0)),urgent=Math.max(0,Number(row.urgentes||0)),ratio=requests?urgent/requests:0;return{id:`demand-${row.zona_lat??'x'}-${row.zona_lng??'x'}-${index}`,category:categoryName,zone:`Zona activa ${index+1} · ${requests} pedido${requests===1?'':'s'} reciente${requests===1?'':'s'}`,distanceKm:0,estimatedValue:Number(row.tarifa_promedio||0),requestedAt:row.ultimo_pedido||new Date().toISOString(),urgency:ratio>=.5?'high':urgent>0?'medium':'low',demandLevel:requests>=6||ratio>=.5?'high':requests>=3?'medium':'low'}})}}setDemand(nextDemand);setLoading(false)},[session,supabase])
 const handleRealtime=useCallback(()=>{reload().catch(()=>{})},[reload])
 useEffect(()=>{if(session)reload().catch((e:Error)=>{setNotice({type:'error',text:e.message});setLoading(false)});else setLoading(false)},[reload,session])
 useProviderRealtime(supabase,session?.user.id||null,handleRealtime)
 if(auth.loading||loading)return <LoadingScreen label="Preparando UGO Pro…"/>
 if(!session||!profile)return <AuthScreen role="provider" supabase={supabase} error={auth.error} onError={auth.setError}/>
 if(!provider||provider.estado_verificacion!=='verificado')return <ProviderOnboardingGate/>
 const run=async(fn:()=>Promise<void>,ok:string)=>{setBusy(true);setNotice(null);try{await fn();setNotice({type:'ok',text:ok});await reload();return true}catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'No se pudo completar la acción.'});return false}finally{setBusy(false)}}
 const toggleOnline=()=>run(()=>setProviderAvailability(supabase,session.user.id,!provider.disponible),provider.disponible?'Quedaste Offline.':'Ya estás Online.')
 const acceptOpportunity=(id:string)=>{if(service){setNotice({type:'info',text:'Ya tenés un trabajo activo. Finalizalo antes de aceptar otro.'});return Promise.resolve(false)}return run(()=>acceptProviderOpportunity(supabase,id),'Misión aceptada. Esperando forma de pago del cliente.')}
 const rejectOpportunity=(id:string)=>run(()=>rejectProviderOpportunity(supabase,id),'Oportunidad rechazada.')
 const currentPayment=service?payments.find(p=>p.servicio_id===service.id):null
 const funded=currentPayment?.estado==='retenido'&&isProtectedPayment(currentPayment)
 const cashSelected=currentPayment?.metodo==='efectivo'
 const cashConfirmed=cashSelected&&currentPayment?.estado==='liberado'
 const advance=(state:'en_camino'|'llegado'|'en_progreso'|'esperando_aprobacion')=>{if(!service)return Promise.resolve(false);if(service.estado==='asignado'&&!funded&&!cashSelected){setNotice({type:'info',text:'Todavía falta que el cliente confirme la forma de pago.'});return Promise.resolve(false)}return run(()=>advanceProviderService(supabase,service.id,state),'Estado del servicio actualizado.')}
 const confirmCash=async()=>{if(!service)return false;setBusy(true);setNotice(null);try{const response=await fetch('/api/pagos/confirmar-efectivo',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({servicioId:service.id})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'No se pudo confirmar el efectivo.');setNotice({type:'ok',text:'Pago en efectivo confirmado.'});await reload();return true}catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'No se pudo confirmar el efectivo.'});return false}finally{setBusy(false)}}
 const opportunities:ProviderOpportunity[]=offers.map(o=>({id:o.id,category:o.servicio?.categoria?.nombre||'Servicio',title:o.servicio?.descripcion||'Nueva oportunidad',description:o.servicio?.descripcion||'',zone:o.servicio?.direccion_cliente||'Zona por confirmar',distanceKm:Number(o.distancia_km||0),estimatedValue:Number(o.tarifa_ofrecida||o.servicio?.tarifa||0),requestedAt:o.servicio?.created_at||new Date().toISOString(),urgency:o.servicio?.urgencia?'urgent':'normal',matchScore:o.ranking==null?undefined:Number(o.ranking)}))
 const released=payments.filter(p=>p.estado==='liberado').reduce((n,p)=>n+Number(p.ganancia_proveedor||0),0),retained=payments.filter(p=>p.estado==='retenido'&&isProtectedPayment(p)).reduce((n,p)=>n+Number(p.ganancia_proveedor||0),0)
 const value:ProviderData={name:profile.nombre,karma:Number(profile.karma||5),provider,offers,opportunities,demand,service,payments,online:Boolean(provider.disponible),released,retained,busy,notice,reload,toggleOnline,acceptOpportunity,rejectOpportunity,advance,funded,cashSelected,cashConfirmed,confirmCash}
 return <C.Provider value={value}>{children}</C.Provider>
}
export function useProviderData(){const v=useContext(C);if(!v)throw new Error('useProviderData debe usarse dentro de ProviderDataProvider');return v}
export{timeAgo,money}