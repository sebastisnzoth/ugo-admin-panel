import{DisputeDock}from'../../../mvp/DisputeDock'
import{ClientRatingPrompt}from'../rating/ClientRatingPrompt'

type Props={detailOpen:boolean;screen:string}
export function ClientOperationalSurfaces({detailOpen,screen}:Props){
 return <>{screen==='home'&&!detailOpen&&<ClientRatingPrompt/>}{screen==='dispute'&&!detailOpen&&<DisputeDock role="client" openRequest/>}</>
}
