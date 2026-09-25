import{useEffect}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'
import{approvePendingClientService,cancelOwnedClientService,confirmApprovedCashClientService}from'../services/clientActionService'
import{submitServiceRating}from'../../ratings/serviceRatingService'

export function ClientFlowActionsBridge(){
 const{registerActions,navigate}=useClientFlow(),{session,supabase}=useRoleSession('client'),userId=session?.user.id||''
 useEffect(()=>{
  if(!userId)return
  const openSearch=()=>navigate('home')
  const cancelService=async(serviceId:string)=>{try{return await cancelOwnedClientService(supabase,userId,serviceId)}catch(error){console.error('UGO client cancellation failed',error);return false}}
  const openPayment=async()=>{navigate('home');return true}
  const approveService=async(serviceId:string)=>{try{return await approvePendingClientService(supabase,userId,serviceId)}catch(error){console.error('UGO client approval failed',error);return false}}
  const confirmCashPayment=async(serviceId:string)=>{try{return await confirmApprovedCashClientService(supabase,userId,serviceId)}catch(error){console.error('UGO client cash confirmation failed',error);return false}}
  const rateService=async(serviceId:string,score:number,comment='')=>{try{const result=await submitServiceRating(supabase,{userId,role:'client',serviceId,score,comment});return result.status==='saved'||result.status==='already_rated'}catch(error){console.error('UGO client rating failed',error);return false}}
  return registerActions({openSearch,openProvider:()=>navigate('home'),selectProvider:()=>navigate('home'),cancelService,openPayment,approveService,confirmCashPayment,rateService,openReview:()=>navigate('home'),openHistory:()=>navigate('history'),openProfile:()=>navigate('profile'),openDispute:()=>navigate('dispute')})
 },[navigate,registerActions,supabase,userId])
 return null
}
