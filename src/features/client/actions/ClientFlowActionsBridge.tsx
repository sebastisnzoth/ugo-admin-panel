import{useEffect}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{useClientFlow}from'../../../mvp/client/clientFlow'
import{approvePendingClientService,cancelOwnedClientService}from'../services/clientActionService'
export function ClientFlowActionsBridge(){
 const{registerActions,navigate}=useClientFlow(),{session,supabase}=useRoleSession('client'),userId=session?.user.id||''
 useEffect(()=>{
  if(!userId)return
  // Category selection belongs only to Screen 1. Never open the legacy provider radar.
  const openSearch=()=>navigate('home')
  const cancelService=async(serviceId:string)=>{try{return await cancelOwnedClientService(supabase,userId,serviceId)}catch(error){console.error('UGO client cancellation failed',error);return false}}
  const openPayment=async()=>{navigate('home');return true}
  const approveService=async()=>{try{return await approvePendingClientService(supabase,userId)}catch(error){console.error('UGO client approval failed',error);return false}}
  return registerActions({openSearch,openProvider:()=>navigate('home'),selectProvider:()=>navigate('home'),cancelService,openPayment,approveService,openReview:()=>navigate('home'),openHistory:()=>navigate('history'),openProfile:()=>navigate('profile'),openDispute:()=>navigate('dispute')})
 },[navigate,registerActions,supabase,userId])
 return null
}
