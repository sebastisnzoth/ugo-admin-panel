import{ClientGlobalMenu}from'./ClientGlobalMenu'
import{NotificationCenter,type UgoNotification}from'../../../mvp/NotificationCenter'

type Props={onOpenNotice:(notice:UgoNotification)=>void}
export function ClientGlobalSurfaces({onOpenNotice}:Props){
 return <><ClientGlobalMenu/><NotificationCenter role="client" onOpenNotice={onOpenNotice}/></>
}
