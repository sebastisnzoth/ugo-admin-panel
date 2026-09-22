import{ServiceHistoryPanel}from'../../../mvp/ServiceHistoryPanel'
type Props={onHome:()=>void;onOpenService:(serviceId:string)=>void}
export function ClientHistoryOverlay({onHome,onOpenService}:Props){
 return <div className="ugo-client-screen-overlay"><div className="ugo-client-history-wrap"><button type="button" className="ugo-client-activity-back" onClick={onHome} aria-label="Volver al inicio">‹ <span>Inicio</span></button><ServiceHistoryPanel role="client" embedded onOpenService={onOpenService}/></div></div>
}
