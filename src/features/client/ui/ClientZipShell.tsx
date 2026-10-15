import React,{useState}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'
import type{ClientScreen}from'../types/clientTypes'
import'./clientZipDesign.css'

type NavItem={id:string;label:string;glyph:string;screen?:ClientScreen;onClick?:()=>void}
type Props={children:React.ReactNode;screen:ClientScreen;detailOpen:boolean}
const TITLES:Record<string,[string,string]>={
 home:['Inicio','¿Qué necesitás resolver hoy?'],
 request:['Solicitar servicio','Contanos qué necesitás y buscamos un profesional disponible'],
 history:['Tu actividad','Consultá tus pedidos y servicios reales'],
 profile:['Mi perfil','Tus datos, direcciones, preferencias y medios de pago'],
}
export function ClientZipShell({children,screen,detailOpen}:Props){
 const flow=useClientFlow()
 const {profile,session}=useRoleSession('client')
 const[menuOpen,setMenuOpen]=useState(false)
 const name=profile?.nombre?.trim()||'Cliente'
 const first=name.split(/\s+/)[0]
 const active=screen==='request'?'request':screen==='history'?'history':screen==='profile'?'profile':'home'
 const navigate=(next:ClientScreen)=>{setMenuOpen(false);flow.navigate(next)}
 const explore=()=>{navigate('home');window.setTimeout(()=>document.querySelector('.ugo-home-services')?.scrollIntoView({behavior:'smooth',block:'start'}),60)}
 const payments=()=>{navigate('profile');window.setTimeout(()=>document.getElementById('ugo-client-profile-payment-section')?.scrollIntoView({behavior:'smooth',block:'start'}),120)}
 const notify=()=>document.querySelector<HTMLButtonElement>('.ugo-notification-center.role-client .ugo-notification-trigger')?.click()
 const items:NavItem[]=[
  {id:'home',label:'Inicio',glyph:'⌂',screen:'home'},
  {id:'explore',label:'Explorar',glyph:'▦',onClick:explore},
  {id:'request',label:'Solicitar',glyph:'＋',screen:'request'},
  {id:'history',label:'Actividad',glyph:'◷',screen:'history'},
  {id:'payments',label:'Pagos',glyph:'▤',onClick:payments},
  {id:'profile',label:'Perfil',glyph:'◉',screen:'profile'},
 ]
 const trigger=(item:NavItem)=>{if(item.onClick)item.onClick();else if(item.screen)navigate(item.screen);setMenuOpen(false)}
 const avatar=<span className="ugo-zip-avatar" aria-hidden="true">{first.slice(0,1).toUpperCase()}</span>
 return <div className="ugo-zip-layout">
  {menuOpen&&<button type="button" className="ugo-zip-backdrop" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú"/>}
  <aside className={`ugo-zip-sidebar ${menuOpen?'open':''}`} aria-label="Navegación UGO Cliente">
   <div className="ugo-zip-brand"><span>u<i>•</i>go</span><small>TODO RESUELTO.</small><button type="button" className="ugo-zip-close" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú">✕</button></div>
   <button type="button" className="ugo-zip-new" onClick={()=>navigate('request')}><b>＋</b> Nuevo servicio</button>
   <nav className="ugo-zip-nav" aria-label="Menú principal"><small>MENÚ</small>
    {items.map(item=><button key={item.id} type="button" onClick={()=>trigger(item)} className={item.id===active?'active':''} aria-current={item.id===active?'page':undefined}><span aria-hidden="true">{item.glyph}</span>{item.label}</button>)}
   </nav>
   <div className="ugo-zip-sidebar-bottom">
    <button className="ugo-zip-help" type="button" onClick={()=>flow.actions.openDispute()}><span>ⓘ</span><div><strong>¿Necesitás ayuda?</strong><small>Consultá tu servicio y soporte</small></div></button>
    <button type="button" className="ugo-zip-user" onClick={()=>navigate('profile')}>{avatar}<span><strong>{name}</strong><small>{session?.user.email||'Cliente UGO'}</small></span><b>•••</b></button>
   </div>
  </aside>
  <div className="ugo-zip-main">
   {!detailOpen&&<header className="ugo-zip-topbar">
    <button type="button" className="ugo-zip-mobile-menu" onClick={()=>window.dispatchEvent(new Event('ugo:client-menu-open'))} aria-label="Abrir menú">☰</button>
    <div className="ugo-zip-heading"><h1>{screen==='home'?`¡Hola, ${first}! 👋`:(TITLES[screen]?.[0]||'UGO')}</h1><p>{TITLES[screen]?.[1]||'Tu plataforma de servicios'}</p></div>
    <div className="ugo-zip-tools">
     <button type="button" className="ugo-zip-location" onClick={()=>{navigate('home');window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.ugo-home-location')?.click(),60)}}><span>⌖</span><small>Mi ubicación<strong>Actualizar desde GPS</strong></small>⌄</button>
     <button type="button" className="ugo-zip-bell" onClick={notify} aria-label="Abrir notificaciones">♧</button>
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
   {items.filter(item=>['home','explore','request','history','profile'].includes(item.id)).map(item=><button key={item.id} type="button" onClick={()=>trigger(item)} className={item.id===active?'active':''}><span aria-hidden="true">{item.glyph}</span><small>{item.label}</small></button>)}
  </nav>}
 </div>
}
