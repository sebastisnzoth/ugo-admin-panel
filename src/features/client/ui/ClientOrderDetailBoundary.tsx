import{SentinelErrorBoundary}from'../../../mvp/SentinelErrorBoundary'
import{ClientServiceDetail}from'../../../mvp/client/ClientServiceDetail'
type Props={serviceId:string;onClose:()=>void}
export function ClientOrderDetailBoundary({serviceId,onClose}:Props){
 return <SentinelErrorBoundary role="client" serviceId={serviceId} checklistCode="CLIENT-ORDER-OPEN" action="client.activity.open_order" severity="P0" title="No pudimos abrir este pedido" onClose={onClose}><ClientServiceDetail serviceId={serviceId} onClose={onClose}/></SentinelErrorBoundary>
}
