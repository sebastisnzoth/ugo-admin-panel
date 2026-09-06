import React,{useEffect,useState}from'react'
import'./client-reference.css'

function emit(name:string){window.dispatchEvent(new Event(name))}

export function ClientGlobalMenu(){
 const[open,setOpen]=useState(false)
 useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener('ugo:open-client-menu',handler);return()=>window.removeEventListener('ugo:open-client-menu',handler)},[])
 function run(name:string){setOpen(false);window.setTimeout(()=>emit(name),80)}
 if(!open)return null
 return <div className="ugo-client-menu-backdrop" onClick={()=>setOpen(false)}><aside className="ugo-client-menu" onClick={e=>e.stopPropagation()}>
  <div className="ugo-client-menu-head"><div className="ugo-client-menu-brand"><strong>UGO</strong><span>Cliente</span></div><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar menú">×</button></div>
  <div className="ugo-client-menu-account"><span>C</span><div><b>Tu cuenta UGO</b><small>Todo lo que necesitás, en un lugar</small></div></div>
  <nav className="ugo-client-menu-list">
   <button type="button" onClick={()=>run('ugo:client-home')}><span>⌂</span><div><b>Inicio</b><small>Volver al radar</small></div><em>›</em></button>
   <button type="button" onClick={()=>run('ugo:client-search')}><span>⌕</span><div><b>Buscar profesional</b><small>Encontrá el servicio que necesitás</small></div><em>›</em></button>
   <button type="button" onClick={()=>run('ugo:open-history')}><span>▣</span><div><b>Mis servicios</b><small>Historial y pedidos anteriores</small></div><em>›</em></button>
   <button type="button" onClick={()=>run('ugo:open-dispute')}><span>⚖</span><div><b>Ayuda y disputas</b><small>Resolver problemas con un servicio</small></div><em>›</em></button>
   <button type="button" onClick={()=>run('ugo:update-location')}><span>⌖</span><div><b>Actualizar ubicación</b><small>Guardar tu posición actual</small></div><em>›</em></button>
   <button type="button" onClick={()=>run('ugo:open-hugo')}><span>✦</span><div><b>Hablar con Hugo</b><small>Pedí ayuda por voz</small></div><em>›</em></button>
  </nav>
  <div className="ugo-client-menu-tip"><span>✓</span><div><b>Profesionales verificados</b><small>UGO prioriza confianza, cercanía y reputación.</small></div></div>
 </aside></div>
}
