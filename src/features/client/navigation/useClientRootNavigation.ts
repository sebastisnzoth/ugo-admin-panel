import{useCallback,useState}from'react'
import{clearSentinelContext,setSentinelContext}from'../../../lib/sentinel'
import{clientDeepLinkedServiceId,clientNoticeDestination,type ClientNoticeLike}from'./clientNavigation'

type ClientRootNavigationOptions={navigateHome:()=>void;openDispute:()=>void;openReview:()=>void}

export function useClientRootNavigation({navigateHome,openDispute,openReview}:ClientRootNavigationOptions){
 const[selectedServiceId,setSelectedServiceId]=useState<string|null>(()=>clientDeepLinkedServiceId(typeof window==='undefined'?'':window.location.search))
 const openService=useCallback((serviceId:string)=>{setSentinelContext({role:'client',serviceId,action:'client.activity.open_order',checklistCode:'CLIENT-ORDER-OPEN',severity:'P0'});setSelectedServiceId(serviceId)},[])
 const closeService=useCallback(()=>{clearSentinelContext();setSelectedServiceId(null)},[])
 const goHome=useCallback(()=>{closeService();navigateHome()},[closeService,navigateHome])
 const openNotice=useCallback((notice:ClientNoticeLike)=>{const destination=clientNoticeDestination(notice);if(destination.kind==='dispute')return openDispute();if(destination.kind==='review')return openReview();if(destination.kind==='service')return openService(destination.serviceId);navigateHome()},[navigateHome,openDispute,openReview,openService])
 return{selectedServiceId,detailOpen:Boolean(selectedServiceId),openService,closeService,goHome,openNotice}
}
