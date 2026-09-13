import{useEffect}from'react'
import{getDispatchProvider}from'../../lib/dispatch/provider'
import{UGO_CLIENT_GUIDED_REQUEST_OPEN}from'../ClientQuickOrder'
import{useRoleSession}from'../shared'
import{useClientFlow}from'./clientFlow'

const CANCELLABLE_SERVICE_STATES=['buscando','ofrecido','asignado','en_camino','llegado']

type ActiveServiceRow={id:string;estado:string}

/**
 * Connects the shared client flow actions to real UI/navigation/database work.
 * Keep this mounted once under ClientFlowProvider so buttons never fall back to
 * the intentionally inert defaults from clientFlow.tsx.
 */
export function ClientFlowActionsBridge(){
 const{registerActions,navigate}=useClientFlow()
 const{session,supabase}=useRoleSession('client')
 const userId=session?.user.id||''

 useEffect(()=>{
  if(!userId)return

  const openSearch=()=>window.dispatchEvent(new Event(UGO_CLIENT_GUIDED_REQUEST_OPEN))
  const cancelService=async()=>{
   try{
    const{data,error}=await supabase.from('servicios').select('id,estado').eq('cliente_id',userId).in('estado',CANCELLABLE_SERVICE_STATES).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(error)throw error
    const active=(data||null)as ActiveServiceRow|null
    if(!active?.id)return false

    await getDispatchProvider().cancel(active.id)
    return true
   }catch(error){
    console.error('UGO client cancellation failed',error)
    return false
   }
  }

  return registerActions({
   openSearch,
   openProvider:(providerId)=>navigate('provider',providerId||null),
   selectProvider:(providerId)=>navigate('provider',providerId),
   cancelService,
   openPayment:async()=>{navigate('home');return true},
   openReview:()=>navigate('home'),
   openHistory:()=>navigate('history'),
   openProfile:()=>navigate('profile'),
   openDispute:()=>navigate('dispute'),
  })
 },[navigate,registerActions,supabase,userId])

 return null
}
