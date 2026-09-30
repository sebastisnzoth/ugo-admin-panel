import{DisputeDock}from'../../../mvp/DisputeDock'
import{ClientRatingPrompt}from'../rating/ClientRatingPrompt'
import{ClientSupportScreen}from'./ClientSupportScreen'

type Props={detailOpen:boolean;screen:string}
export function ClientOperationalSurfaces({detailOpen,screen}:Props){
 return <>{screen==='home'&&!detailOpen&&<ClientRatingPrompt/>}{screen==='dispute'&&!detailOpen&&<><ClientSupportScreen/><DisputeDock role="client" openRequest/></>}</>
}
