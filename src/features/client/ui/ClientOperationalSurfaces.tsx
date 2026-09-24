import{AppLocationButton}from'../../../mvp/AppLocationButton'
import{DisputeDock}from'../../../mvp/DisputeDock'
import{ClientCompletionReview}from'../order/ClientCompletionReview'
import{ClientLiveTracking}from'../../../mvp/ClientLiveTracking'
import{ServiceChat}from'../../../mvp/ServiceChat'
import{ClientPaymentChoice}from'../payments/ClientPaymentChoice'
import{ClientProviderRadarBridge}from'../radar/ClientProviderRadarBridge'
import{ClientRatingPrompt}from'../rating/ClientRatingPrompt'

type Props={canonical:boolean;detailOpen:boolean;screen:string;openDispute:()=>void}
export function ClientOperationalSurfaces({canonical,detailOpen,screen,openDispute}:Props){
 return <>{!canonical&&!detailOpen&&<ClientPaymentChoice/>}{!canonical&&!detailOpen&&<ClientLiveTracking/>}{!canonical&&!detailOpen&&<ClientCompletionReview onOpenDispute={openDispute}/>}{screen!=='request'&&!detailOpen&&<ClientRatingPrompt/>}{!canonical&&!detailOpen&&<ServiceChat role="client"/>}{!canonical&&!detailOpen&&<DisputeDock role="client" openRequest={screen==='dispute'}/>}{!canonical&&!detailOpen&&<AppLocationButton role="client"/>}{!canonical&&<ClientProviderRadarBridge/>}</>
}
