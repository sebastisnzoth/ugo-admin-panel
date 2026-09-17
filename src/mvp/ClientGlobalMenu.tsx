import React,{useEffect,useState}from'react'
import{useClientFlow}from'./client/clientFlow'
import{UGO_UI_EVENTS,emitUgoUiEvent}from'./uiEvents'
import'./client-reference.css'
import'./client-global-menu.css'

export function ClientGlobalMenu(){
 const[open,setOpen]=useState(false)
 const flow=useClientFlow(),{actions}=flow
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[])
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[open])
 function close(){setOpen(false)}
 function go(screen:'home'|'history'|'profile'|'dispute'){close();flow.navigate(screen)}
 function request(){close();actions.openSearch();window.setTimeout(()=>emitUgoUiEvent(UGO_UI_EVENTS.clientHugoText),0)}
 function hugo(){close();actions.openSearch();window.setTimeout(()=>emitUgoUiEvent(UGO_UI_EVENTS.clientHugoVoice),0)}
 function location(){close();emitUgoUiEvent(UGO_UI_EVENTS.clientLocation)}
 function notifications(){close();window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.ugo-notification-center.role-client .ugo-notification-trigger')?.click(),0)}
 return <>
  <button type="button" className="ugo-client-global-trigger" onClick={()=>setOpen(true)} aria-label="Abrir menú UGO">☰</button>
  {open&&<div className="ugo-client-menu-backdrop ugo-client-global-backdrop" onClick={close} role="presentation"><aside className="ugo-client-menu ugo-client-global-drawer" onClick={e=>e.stopPropagation()} aria-label="Menú UGO Cliente">
   <div className="ugo-client-menu-head ugo-client-global-head"><div className="ugo-client-menu-brand"><strong>UGO</strong><span>Cliente</span></div><button type="button" className="ugo-client-menu-close" onClick={close} aria-label="Cerrar menú">×</button></div>
   <button type="button" className="ugo-client-account-card" onClick={()=>go('profile')}><span className="ugo-client-account-avatar">C</span><div><b>Mi cuenta</b><small>Perfil, datos y preferencias</small></div><em>›</em></button>
   <button type="button" className="ugo-client-menu-primary" onClick={request}><span>＋</span><div><b>Pedir un servicio</b><small>Nuevo pedido con Hugo</small></div><em>›</em></button>
   <div className="ugo-client-menu-section-label">UGO</div>
   <nav className="ugo-client-menu-list ugo-client-global-list">
    <button type="button" onClick={()=>go('home')}><span>⌂</span><div><b>Inicio</b><small>Servicios y categorías</small></div><em>›</em></button>
    <button type="button" onClick={request}><span>▦</span><div><b>Servicios</b><small>Ver categorías y pedir un profesional</small></div><em>›</em></button>
    <button type="button" onClick={()=>go('history')}><span>◷</span><div><b>Actividad y pedidos</b><small>Activos, programados, finalizados y cancelados</small></div><em>›</em></button>
    <button type="button" onClick={notifications}><span>♢</span><div><b>Notificaciones</b><small>Novedades de tus pedidos</small></div><em>›</em></button>
   </nav>
   <div className="ugo-client-menu-section-label">Cuenta</div>
   <nav className="ugo-client-menu-list ugo-client-global-list">
    <button type="button" onClick={location}><span>⌖</span><div><b>Direcciones y ubicación</b><small>Casa, trabajo y ubicación del servicio</small></div><em>›</em></button>
    <button type="button" onClick={()=>go('profile')}><span>◎</span><div><b>Perfil y preferencias</b><small>Datos de la cuenta y configuración</small></div><em>›</em></button>
    <button type="button" onClick={request}><span>▣</span><div><b>Formas de pago</b><small>PIX o efectivo, elegidos dentro de cada pedido</small></div><em>›</em></button>
   </nav>
   <div className="ugo-client-menu-section-label">Asistencia</div>
   <nav className="ugo-client-menu-list ugo-client-global-list ugo-client-global-list-secondary">
    <button type="button" onClick={hugo}><span>✦</span><div><b>Hablar con Hugo</b><small>Asistente por voz o texto</small></div><em>›</em></button>
    <button type="button" onClick={()=>go('dispute')}><span>?</span><div><b>Ayuda y soporte</b><small>Resolver un problema con UGO</small></div><em>›</em></button>
    <button type="button" onClick={()=>go('dispute')}><span>!</span><div><b>Disputas</b><small>Reportar un problema con un servicio</small></div><em>›</em></button>
   </nav>
   <div className="ugo-client-global-footer"><b>UGO</b><span>Un pedido. Un profesional. Sin vueltas.</span></div>
  </aside></div>}
 </>
}
