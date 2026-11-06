import{useLocale}from'../../../i18n/locale'
import{SentinelErrorBoundary}from'../../../mvp/SentinelErrorBoundary'
import{ClientServiceDetail}from'../order/ClientServiceDetail'
type Props={serviceId:string;onClose:()=>void;onSwitch?:(id:string)=>void}
export function ClientOrderDetailBoundary({serviceId,onClose,onSwitch}:Props){
 const{t}=useLocale()
 return <SentinelErrorBoundary role="client" serviceId={serviceId} checklistCode="CLIENT-ORDER-OPEN" action="client.activity.open_order" severity="P0" title={t('clientBoundary.openFailed')} onClose={onClose}><ClientServiceDetail serviceId={serviceId} onClose={onClose} onSwitch={onSwitch}/></SentinelErrorBoundary>
}
