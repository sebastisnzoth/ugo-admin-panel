import React,{useEffect,useState}from'react'
import{useClientFlow}from'./client/clientFlow'
import{UGO_UI_EVENTS,emitUgoUiEvent}from'./uiEvents'
import'./client-reference.css'
import'./client-global-menu.css'

export function ClientGlobalMenu(){
 const[open,setOpen]=useState(false)
 const flow=useClientFlow(),{actions}=flow
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
  document.addEventListener('keydown',onKey)
  return()=>{
   document.removeEventListener('keydown',onKey)
  }
 },[])
 useEffect(()=>{
  if(!open)return
  const previous=document.body.style.overflow
  document.body.style.overflow='hidden'
  return()=>{document.body.style.overflow=previous}
 },[open])
 function close(){setOpen(false)}
 function home(){close();flow.navigate('home')}
 function search(){close();actions.openSearch()}
 function profile(){close();actions.openProfile()}
 function hugo(){close();emitUgoUiEvent(UGO_UI_EVENTS.clientHugo)}
 function history(){close();actions.openHistory()}
 function dispute(){close();actions.openDispute()}
 function location(){close();emitUgoUiEvent(UGO_UI_EVENTS.clientLocation)}
 return <>
  <button type="button" className="ugo-client-global-trigger" onClick={()=>setOpen(true)} aria-label="Abrir menú">☰</button>
  {open&&<div className="ugo-client-menu-backdrop ugo-client-global-backdrop" onClick={close} role="presentation"><aside className="ugo-client-menu ugo-client-global-drawer" onClick={e=>e.stopPropagation()} aria-label="Menú UGO Cliente">
   <div className="ugo-client-menu-head ugo-client-global-head">
    <div className="ugo-client-menu-brand"><strong>UGO</strong><span>Cliente</span></div>
    <button type="button" className="ugo-client-menu-close" onClick={close} aria-label="Cerrar menú">×</button>
   </div>

   <button type="button" className="ugo-client-account-card" onClick={profile}>
    <span className="ugo-client-account-avatar">C</span>
    <div><b>Mi cuenta</b><small>Perfil y preferencias</small></div>
    <em>›</em>
   </button>

   <button type="button" className="ugo-client-menu-primary" onClick={search}>
    <span>⌕</span><div><b>Buscar profesional</b><small>Encontrá ayuda cerca tuyo</small></div><em>›</em>
   </button>

   <div className="ugo-client-menu-section-label">Tu actividad</div>
   <nav className="ugo-client-menu-list ugo-client-global-list">
    <button type="button" onClick={home}><span>⌂</span><div><b>Inicio</b><small>Volver al radar</small></div><em>›</em></button>
    <button type="button" onClick={history}><span>▣</span><div><b>Mis servicios</b><small>Pedidos e historial</small></div><em>›</em></button>
    <button type="button" onClick={location}><span>⌖</span><div><b>Mi ubicación</b><small>Actualizar dónde estás</small></div><em>›</em></button>
   </nav>

   <div className="ugo-client-menu-section-label">Ayuda</div>
   <nav className="ugo-client-menu-list ugo-client-global-list ugo-client-global-list-secondary">
    <button type="button" onClick={dispute}><span>?</span><div><b>Ayuda y disputas</b><small>Problemas con un servicio</small></div><em>›</em></button>
    <button type="button" onClick={hugo}><span>✦</span><div><b>Hugo</b><small>Asistente de UGO</small></div><em>›</em></button>
   </nav>

   <div className="ugo-client-global-footer"><b>UGO</b><span>Personas que resuelven.</span></div>
  </aside></div>}
 </>
}
