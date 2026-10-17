import{useLocale}from'../../i18n/locale'
import React,{useEffect,useRef}from'react'
import{useNetworkStatus}from'./useNetworkStatus'

type Props={onRestored?:()=>void;className?:string}

/**
 * Aviso transversal de conectividad para Cliente y Proveedor.
 * Nunca bloquea la pantalla: informa el estado real y, al volver internet,
 * avisa a la shell para que resincronice datos persistidos.
 */
export function ConnectionBanner({onRestored,className}:Props){
 const{t}=useLocale()
 const{online,restored}=useNetworkStatus()
 const notified=useRef(false)
 useEffect(()=>{
  if(!restored){notified.current=false;return}
  if(notified.current)return
  notified.current=true
  onRestored?.()
 },[restored,onRestored])
 if(online&&!restored)return null
 return <div className={`ugo-ux-connection ${online?'is-restored':'is-offline'}${className?` ${className}`:''}`} role="status" aria-live="polite">
  <span className="ugo-ux-connection-icon" aria-hidden="true">{online?'✓':'⌁'}</span>
  <div className="ugo-ux-connection-copy">
   <strong>{online?t("uiCopy.expression228"):t("uiCopy.expression229")}</strong>
   <small>{online?t("uiCopy.expression230"):t("uiCopy.expression231")}</small>
  </div>
 </div>
}
