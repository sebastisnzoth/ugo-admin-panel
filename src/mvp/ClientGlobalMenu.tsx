import React,{useEffect,useState}from'react'
import'./client-reference.css'
import'./client-global-menu.css'

function emit(name:string){window.dispatchEvent(new Event(name))}
function click(selector:string){(document.querySelector(selector) as HTMLButtonElement|null)?.click()}

export function ClientGlobalMenu(){
 const[open,setOpen]=useState(false)
 useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener('ugo:open-client-menu',handler);return()=>window.removeEventListener('ugo:open-client-menu',handler)},[])
 function close(){setOpen(false)}
 function home(){close();window.setTimeout(()=>emit('ugo:client-home'),80)}
 function search(){close();window.setTimeout(()=>emit('ugo:client-search'),80)}
 function hugo(){close();window.setTimeout(()=>emit('ugo:open-hugo'),80)}
 function history(){close();window.setTimeout(()=>click('.ugo-client-root .ugo-history-client'),80)}
 function dispute(){close();window.setTimeout(()=>click('.ugo-client-root .ugo-dispute-launch'),80)}
 function location(){close();window.setTimeout(()=>click('.ugo-client-root .ugo-location-control.role-client button'),80)}
 return <>
  <button type="button" className="ugo-client-global-trigger" onClick={()=>setOpen(true)} aria-label="Abrir menú">☰</button>
  {open&&<div className="ugo-client-menu-backdrop ugo-client-global-backdrop" onClick={close}><aside className="ugo-client-menu ugo-client-global-drawer" onClick={e=>e.stopPropagation()}>
   <div className="ugo-client-menu-head"><div className="ugo-client-menu-brand"><strong>UGO</strong><span>Cliente</span></div><button type="button" onClick={close} aria-label="Cerrar menú">×</button></div>
   <nav className="ugo-client-menu-list ugo-client-global-list">
    <button type="button" onClick={home}><span>⌂</span><div><b>Inicio</b></div><em>›</em></button>
    <button type="button" onClick={search}><span>⌕</span><div><b>Buscar</b></div><em>›</em></button>
    <button type="button" onClick={history}><span>▣</span><div><b>Mis servicios</b></div><em>›</em></button>
    <button type="button" onClick={dispute}><span>?</span><div><b>Ayuda y disputas</b></div><em>›</em></button>
    <button type="button" onClick={location}><span>⌖</span><div><b>Mi ubicación</b></div><em>›</em></button>
    <button type="button" onClick={hugo}><span>✦</span><div><b>Hablar con Hugo</b></div><em>›</em></button>
   </nav>
   <div className="ugo-client-global-footer">UGO · personas que resuelven</div>
  </aside></div>}
 </>
}
