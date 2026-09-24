import React,{useEffect,useState}from'react'
import{useClientFlow}from'../flow/clientFlow'
import{useRoleSession}from'../../../mvp/shared'
import{UGO_UI_EVENTS,emitUgoUiEvent}from'../../../mvp/uiEvents'
import'../../../mvp/client-reference.css'
import'../../../mvp/client-global-menu.css'

export function ClientGlobalMenu(){
 const[open,setOpen]=useState(false),flow=useClientFlow(),{supabase}=useRoleSession('client')
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[])
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[open])
 const close=()=>setOpen(false)
 const go=(screen:'home'|'history'|'profile'|'dispute'|'search')=>{close();flow.navigate(screen)}
 const after=(eventName:(typeof UGO_UI_EVENTS)[keyof typeof UGO_UI_EVENTS])=>window.setTimeout(()=>emitUgoUiEvent(eventName),60)
 const request=()=>{close();flow.navigate('home');after(UGO_UI_EVENTS.clientFocusServiceSearch)}
 const categories=()=>{close();flow.navigate('home');after(UGO_UI_EVENTS.clientShowCategories)}
 const addresses=()=>{close();flow.navigate('profile');after(UGO_UI_EVENTS.clientProfileAddresses)}
 const payment=()=>{close();flow.navigate('profile');after(UGO_UI_EVENTS.clientProfilePayment)}
 const hugo=()=>go('search')
 const notifications=()=>{close();window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.ugo-notification-center.role-client .ugo-notification-trigger')?.click(),60)}
 const logout=async()=>{close();await supabase.auth.signOut();window.location.reload()}
 return <>
  <button type="button" className="ugo-client-global-trigger" onClick={()=>setOpen(true)} aria-label="Abrir menú UGO">☰</button>
  {open&&<div className="ugo-client-menu-backdrop ugo-client-global-backdrop" onClick={close} role="presentation">
   <aside className="ugo-client-menu ugo-client-global-drawer" onClick={event=>event.stopPropagation()} aria-label="Menú UGO Cliente">
    <div className="ugo-client-menu-head ugo-client-global-head">
     <div className="ugo-client-menu-brand"><strong>UGO</strong><span>Cliente</span></div>
     <button type="button" className="ugo-client-menu-close" onClick={close} aria-label="Cerrar menú">×</button>
    </div>
    <button type="button" className="ugo-client-account-card" onClick={()=>go('profile')}><span className="ugo-client-account-avatar">S</span><div><b>Mi perfil</b><small>Ver mi perfil</small></div><em>›</em></button>
    <nav className="ugo-client-menu-list ugo-client-global-list">
     <button type="button" onClick={()=>go('home')}><span>⌂</span><div><b>Inicio</b></div></button>
     <button type="button" onClick={request}><span>＋</span><div><b>Pedir servicio</b></div></button>
     <button type="button" onClick={categories}><span>▦</span><div><b>Servicios y categorías</b></div></button>
     <button type="button" onClick={()=>go('history')}><span>▣</span><div><b>Actividad y pedidos</b></div></button>
     <button type="button" onClick={addresses}><span>⌖</span><div><b>Direcciones</b></div></button>
     <button type="button" onClick={payment}><span>▤</span><div><b>Formas de pago</b></div></button>
     <button type="button" onClick={notifications}><span>♢</span><div><b>Notificaciones</b></div></button>
     <button type="button" onClick={hugo}><span>✦</span><div><b>Hugo / Asistente IA</b></div></button>
     <button type="button" onClick={()=>go('dispute')}><span>?</span><div><b>Ayuda y soporte</b></div></button>
     <button type="button" onClick={()=>go('profile')}><span>⚙</span><div><b>Configuración</b></div></button>
     <button type="button" className="ugo-menu-logout" onClick={()=>void logout()}><span>⇥</span><div><b>Cerrar sesión</b></div></button>
    </nav>
    <div className="ugo-client-global-footer"><b>UGO</b><span>Un pedido. Un profesional. Sin vueltas.</span></div>
   </aside>
  </div>}
 </>
}
