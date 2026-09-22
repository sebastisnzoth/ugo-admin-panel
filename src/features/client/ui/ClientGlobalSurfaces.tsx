import{ClientGlobalMenu}from'../../../mvp/ClientGlobalMenu'
import{NotificationCenter,type UgoNotification}from'../../../mvp/NotificationCenter'
import{ClientHugoBridge}from'../../../mvp/client/ClientHugoBridge'

type Props={onOpenNotice:(notice:UgoNotification)=>void}
export function ClientGlobalSurfaces({onOpenNotice}:Props){
 return <><ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={onOpenNotice}/><ClientHugoBridge/></>
}
