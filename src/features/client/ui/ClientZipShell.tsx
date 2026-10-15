import React,{useEffect,useState}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'
import type{ClientScreen}from'../types/clientTypes'
import{ClientZipIcon}from'./ClientZipIcon'
import'./clientZipDesign.css'

type NavItem={id:'home'|'explore'|'active'|'request'|'history'|'payments'|'profile';label:string;screen?:ClientScreen;onClick?:()=>void}
type Props={children:React.ReactNode;screen:ClientScreen;detailOpen:boolean}
const TITLES:Record<string,[string,string]>={
 home:['Inicio','¿Qué necesitás resolver hoy?'],
 explore:['Explorar servicios','Encontrá profesionales verificados cerca tuyo'],
 active:['Servicio en curso','Seguí el progreso de tu pedido'],
 payments:['Pagos y métodos','Gestioná tus formas de pago'],
 request:['Solicitar servicio','Contanos qué necesitás y buscamos un profesional disponible'],
 history:['Tu actividad','Consultá tus pedidos y servicios reales'],
 profile:['Mi perfil','Tus datos, direcciones, preferencias y medios de pago'],
}
export function ClientZipShell({children,screen,detailOpen}:Props){
 const flow=useClientFlow()
 const {profile,session,supabase}=useRoleSession('client')
 const[clientArea,setClientArea]=useState('Ubicación sin configurar')
 useEffect(()=>{if(!session)return;let alive=true;void supabase.from('perfiles_cliente').select('barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle().then(({data})=>{if(!alive)return;setClientArea([data?.barrio,data?.ciudad].filter(Boolean).join(' · ')||'Ubicación sin configurar')});return()=>{alive=false}},[session,supabase])
 const[menuOpen,setMenuOpen]=useState(false)
 const name=profile?.nombre?.trim()||'Cliente'
 const first=name.split(/\s+/)[0]
 const active=screen==='explore'?'explore':screen==='active'?'active':screen==='payments'?'payments':screen==='request'?'request':screen==='history'?'history':screen==='profile'?'profile':'home'
 const navigate=(next:ClientScreen)=>{setMenuOpen(false);flow.navigate(next)}
 const explore=()=>navigate('explore')
 const payments=()=>navigate('payments')
 const notify=()=>document.querySelector<HTMLButtonElement>('.ugo-notification-center.role-client .ugo-notification-trigger')?.click()
 const items:NavItem[]=[
  {id:'home',label:'Inicio',screen:'home'},
  {id:'explore',label:'Explorar',screen:'explore'},
  {id:'request',label:'Solicitar',screen:'request'},
  {id:'active',label:'Servicio',onClick:()=>navigate('active')},
  {id:'history',label:'Actividad',screen:'history'},
  {id:'payments',label:'Pagos',screen:'payments'},
  {id:'profile',label:'Perfil',screen:'profile'},
 ]
 const trigger=(item:NavItem)=>{if(item.onClick)item.onClick();else if(item.screen)navigate(item.screen);setMenuOpen(false)}
 const avatar=<span className="ugo-zip-avatar" aria-hidden="true">{first.slice(0,1).toUpperCase()}</span>
 return <div className="ugo-zip-layout">
  {menuOpen&&<button type="button" className="ugo-zip-backdrop" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú"/>}
  <aside className={`ugo-zip-sidebar ${menuOpen?'open':''}`} aria-label="Navegación UGO Cliente">
   <div className="ugo-zip-brand"><span>u<i>•</i>go</span><small>TODO RESUELTO.</small><button type="button" className="ugo-zip-close" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú">✕</button></div>
   <button type="button" className="ugo-zip-new" onClick={()=>navigate('request')}><b>＋</b> Nuevo servicio</button>
   <nav className="ugo-zip-nav" aria-label="Menú principal"><small>MENÚ</small>
    {items.map(item=><button key={item.id} type="button" onClick={()=>trigger(item)} className={item.id===active?'active':''} aria-current={item.id===active?'page':undefined}><ClientZipIcon name={item.id}/>{item.label}</button>)}
   </nav>
   <div className="ugo-zip-sidebar-bottom">
    <button className="ugo-zip-help" type="button" onClick={()=>window.dispatchEvent(new Event('ugo:client-menu-open'))}><span>ⓘ</span><div><strong>¿Necesitás ayuda?</strong><small>Consultá tu servicio y soporte</small></div></button>
    <button type="button" className="ugo-zip-user" onClick={()=>navigate('profile')}>{avatar}<span><strong>{name}</strong><small>{session?.user.email||'Cliente UGO'}</small></span><b>•••</b></button>
   </div>
  </aside>
  <div className="ugo-zip-main">
   {!detailOpen&&<header className="ugo-zip-topbar">
    <button type="button" className="ugo-zip-mobile-menu" onClick={()=>window.dispatchEvent(new Event('ugo:client-menu-open'))} aria-label="Abrir menú"><ClientZipIcon name="menu"/></button>
    <div className="ugo-zip-heading"><h1>{screen==='home'?`¡Hola, ${first}! 👋`:(TITLES[screen]?.[0]||'UGO')}</h1><p>{TITLES[screen]?.[1]||'Tu plataforma de servicios'}</p></div>
    <div className="ugo-zip-tools">
     <button type="button" className="ugo-zip-location" onClick={()=>{navigate('home');window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.ugo-home-location')?.click(),60)}}><span><ClientZipIcon name="location" size={18}/></span><small>TU UBICACIÓN<strong>{clientArea}</strong></small>⌄</button>
     <button type="button" className="ugo-zip-bell" onClick={notify} aria-label="Abrir notificaciones"><ClientZipIcon name="notifications"/></button>
     <button type="button" className="ugo-zip-top-person" onClick={()=>navigate('profile')} aria-label="Mi perfil">{avatar}</button>
    </div>
   </header>}
   <div className="ugo-zip-content">
    {screen==='home'&&!detailOpen&&<section className="ugo-zip-hero" aria-label="Bienvenido a UGO">
     <div className="ugo-zip-hero-copy"><span className="ugo-zip-eyebrow">✦ PROFESIONALES DE CONFIANZA</span><h2>Tu casa en buenas manos.</h2><p>Contanos qué necesitás. UGO busca profesionales disponibles en tu zona y te permite seguir cada servicio de principio a fin.</p><div className="ugo-zip-actions"><button type="button" onClick={()=>navigate('request')}>Solicitar un servicio　→</button><button type="button" onClick={explore}>Explorar servicios</button></div><div className="ugo-zip-trust"><span>✓ Protección UGO</span><span>◷ Seguimiento real</span><span>☆ Opiniones de clientes</span></div></div>
     <div className="ugo-zip-hero-art" aria-hidden="true"><div className="ugo-zip-circle-one"/><div className="ugo-zip-circle-two"/><div className="ugo-zip-worker-photo"><img src="https://images.pexels.com/photos/7562139/pexels-photo-7562139.jpeg?auto=compress&cs=tinysrgb&w=500" alt="" loading="lazy"/></div></div>
    </section>}
    {children}
   </div>
  </div>
  {!detailOpen&&<nav className="ugo-zip-mobile-nav" aria-label="Navegación móvil">
   {items.filter(item=>['home','explore'].includes(item.id)).map(item=><button key={item.id} type="button" onClick={()=>trigger(item)} className={item.id===active?'active':''}><ClientZipIcon name={item.id}/><small>{item.label}</small></button>)}
   <button type="button" className="ugo-zip-mobile-add" onClick={()=>navigate('request')} aria-label="Solicitar servicio"><ClientZipIcon name="request" size={27}/></button>
   {items.filter(item=>['history','profile'].includes(item.id)).map(item=><button key={item.id} type="button" onClick={()=>trigger(item)} className={item.id===active?'active':''}><ClientZipIcon name={item.id}/><small>{item.label}</small></button>)}
  </nav>}
 </div>
}
