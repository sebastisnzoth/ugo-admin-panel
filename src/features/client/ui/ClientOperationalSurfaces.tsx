import{DisputeDock}from'../../../mvp/DisputeDock'
import{ClientProviderRadarBridge}from'../radar/ClientProviderRadarBridge'
import{ClientRatingPrompt}from'../rating/ClientRatingPrompt'

type Props={canonical:boolean;detailOpen:boolean;screen:string;openDispute:()=>void}
export function ClientOperationalSurfaces({detailOpen,screen}:Props){
 const legacyRadar=screen==='search'||screen==='provider'
 return <>{screen!=='request'&&!detailOpen&&<ClientRatingPrompt/>}{screen==='dispute'&&!detailOpen&&<DisputeDock role="client" openRequest/>}{legacyRadar&&<ClientProviderRadarBridge/>}</>
}
