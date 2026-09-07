import React,{useEffect,useState}from'react'
import'./client-reference.css'
import'./client-global-menu.css'

function click(selector:string){(document.querySelector(selector) as HTMLButtonElement|null)?.click()}

export function ClientGlobalMenu(){
 const[open,setOpen]=useState(false)
 useEffect(()=>{
  const handler=()=>setOpen(true)
  const intercept=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null
   if(!target?.closest('.ugo-client-menu-trigger'))return
   event.preventDefault()
   event.stopPropagation()
   setOpen(true)
  }
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
  window.addEventListener('ugo:open-client-menu',handler)
  document.addEventListener('click',intercept,true)
  document.addEventListener('keydown',onKey)
  return()=>{
   window.removeEventListener('ugo:open-client-menu',handler)
   document.removeEventListener('click',intercept,true)
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
 function run(selector:string){close();window.setTimeout(()=>click(selector),90)}
 function home(){run('.ugo-ref-nav button:nth-child(1)')}
 function search(){run('.ugo-ref-nav button:nth-child(2)')}
 function hugo(){close();window.setTimeout(()=>window.dispatchEvent(new Event('ugo:open-hugo')),90)}
 function history(){run('.ugo-client-root .ugo-history-client')}
 function dispute(){run('.ugo-client-root .ugo-dispute-launch')}
 function location(){run('.ugo-client-root .ugo-location-control.role-client button')}
 return <>
  <button type="button" className="ugo-client-global-trigger" onClick={()=>setOpen(true)} aria-label="Abrir menú">☰</button>
  {open&&<div className="ugo-client-menu-backdrop ugo-client-global-backdrop" onClick={close} role="presentation"><aside className="ugo-client-menu ugo-client-global-drawer" onClick={e=>e.stopPropagation()} aria-label="Menú UGO Cliente">
   <div className="ugo-client-menu-head ugo-client-global-head">
    <div className="ugo-client-menu-brand"><strong>UGO</strong><span>Cliente</span></div>
    <button type="button" className="ugo-client-menu-close" onClick={close} aria-label="Cerrar menú">×</button>
   </div>
   <div className="ugo-client-account-card"><span className="ugo-client-account-avatar">C</span><div><b>Mi cuenta</b><small>UGO Cliente</small></div><em>›</em></div>
   <button type="button" className="ugo-client-menu-primary" onClick={search}><span>⌕</span><div><b>Buscar profesional</b><small>Encontrá ayuda cerca tuyo</small></div><em>›</em></button>
   <div className="ugo-client-menu-section-label">Tu actividad</div>
   <nav className="ugo-client-menu-list ugo-client-global-list">
    <button type="button" onClick={home}><span>⌂</span><div><b>Inicio</b><small>Volver al mapa</small></div><em>›</em></button>
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
