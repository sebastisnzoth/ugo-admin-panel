import React,{useEffect,useState}from'react'
import'./provider-global-menu.css'

type ProviderTabLabel='RADAR'|'TRABAJOS'|'GANANCIAS'|'PERFIL'

function clickTab(label:ProviderTabLabel){
 const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.ugo-provider-bottomnav>button'))
 const target=buttons.find(button=>String(button.innerText||button.textContent||'').toUpperCase().includes(label))
 target?.click()
 return Boolean(target)
}

export function ProviderGlobalMenu(){
 const[open,setOpen]=useState(false)
 useEffect(()=>{
  const openMenu=()=>setOpen(true)
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
  window.addEventListener('ugo:open-provider-menu',openMenu)
  document.addEventListener('keydown',onKey)
  return()=>{window.removeEventListener('ugo:open-provider-menu',openMenu);document.removeEventListener('keydown',onKey)}
 },[])
 useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prev}},[open])
 function go(label:ProviderTabLabel){clickTab(label);setOpen(false)}
 function hugo(){setOpen(false);window.setTimeout(()=>window.dispatchEvent(new Event('ugo:open-hugo')),60)}
 return <>
  <button type="button" className="ugo-provider-menu-trigger" onClick={()=>setOpen(true)} aria-label="Abrir menú">☰</button>
  {open&&<div className="ugo-provider-menu-backdrop" onClick={()=>setOpen(false)} role="presentation">
   <aside className="ugo-provider-menu-drawer" onClick={e=>e.stopPropagation()} aria-label="Menú UGO Proveedor">
    <header><div><strong>U.GO</strong><span>Proveedor</span></div><button type="button" onClick={()=>setOpen(false)} aria-label="Cerrar menú">×</button></header>
    <button type="button" className="ugo-provider-menu-hugo" onClick={hugo}><span>✦</span><div><b>Hugo</b><small>Preguntá qué hacer ahora</small></div><em>›</em></button>
    <small className="ugo-provider-menu-section">Trabajo</small>
    <nav>
     <button type="button" onClick={()=>go('RADAR')}><span>⌖</span><div><b>Inicio</b><small>Radar y misión activa</small></div><em>›</em></button>
     <button type="button" onClick={()=>go('TRABAJOS')}><span>▣</span><div><b>Trabajos</b><small>Activos y oportunidades</small></div><em>›</em></button>
     <button type="button" onClick={()=>go('GANANCIAS')}><span>R$</span><div><b>Ganancias</b><small>Pagos y retiros</small></div><em>›</em></button>
    </nav>
    <small className="ugo-provider-menu-section">Cuenta</small>
    <nav>
     <button type="button" onClick={()=>go('PERFIL')}><span>◯</span><div><b>Perfil profesional</b><small>Tarifa, zona y experiencia</small></div><em>›</em></button>
    </nav>
    <footer><b>UGO PRO</b><span>Tu trabajo, en orden.</span></footer>
   </aside>
  </div>}
 </>
}
