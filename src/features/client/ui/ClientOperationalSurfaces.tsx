import{AppLocationButton}from'../../../mvp/AppLocationButton'
import{DisputeDock}from'../../../mvp/DisputeDock'
import{ClientCompletionReview}from'../order/ClientCompletionReview'
import{ClientLiveTracking}from'../order/ClientLiveTracking'
import{ServiceChat}from'../../../mvp/ServiceChat'
import{ClientPaymentChoice}from'../payments/ClientPaymentChoice'
import{ClientProviderRadarBridge}from'../radar/ClientProviderRadarBridge'
import{ClientRatingPrompt}from'../rating/ClientRatingPrompt'

type Props={canonical:boolean;detailOpen:boolean;screen:string;openDispute:()=>void}
export function ClientOperationalSurfaces({canonical,detailOpen,screen,openDispute}:Props){
 const legacyOperational=!canonical&&(screen==='service'||screen==='payment'||screen==='review'||screen==='matching')
 const legacyRadar=screen==='search'||screen==='provider'
 return <>{legacyOperational&&!detailOpen&&<ClientPaymentChoice/>}{legacyOperational&&!detailOpen&&<ClientLiveTracking/>}{legacyOperational&&!detailOpen&&<ClientCompletionReview onOpenDispute={openDispute}/>}{screen!=='request'&&!detailOpen&&<ClientRatingPrompt/>}{legacyOperational&&!detailOpen&&<ServiceChat role="client"/>}{screen==='dispute'&&!detailOpen&&<DisputeDock role="client" openRequest/>}{legacyOperational&&!detailOpen&&<AppLocationButton role="client"/>}{legacyRadar&&<ClientProviderRadarBridge/>}</>
}
