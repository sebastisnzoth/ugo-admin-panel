import React,{Suspense,lazy} from'react'
import{ClientGlobalMenu}from'./ClientGlobalMenu'
import type{UgoNotification}from'../../../mvp/NotificationCenter'

const NotificationCenter=lazy(()=>import('../../../mvp/NotificationCenter').then(m=>({default:m.NotificationCenter})))

type Props={onOpenNotice:(notice:UgoNotification)=>void}
export function ClientGlobalSurfaces({onOpenNotice}:Props){
 return <><ClientGlobalMenu/><Suspense fallback={null}><NotificationCenter role="client" onOpenNotice={onOpenNotice}/></Suspense></>
}
