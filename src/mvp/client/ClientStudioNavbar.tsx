import React,{useEffect,useState}from'react'
import{useRoleSession}from'../shared'
import{UGO_UI_EVENTS,emitUgoUiEvent}from'../uiEvents'
import{useClientFlow}from'./clientFlow'

type ClientLocation={barrio?:string|null;ciudad?:string|null}

export function ClientStudioNavbar(){
 const flow=useClientFlow(),{supabase,session,profile}=useRoleSession('client')
 const[place,setPlace]=useState('Florianópolis - Canasvieiras')
 useEffect(()=>{if(!session)return;let alive=true;supabase.from('perfiles_cliente').select('barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle().then(({data})=>{if(!alive)return;const row=(data||{})as ClientLocation;const next=[row.ciudad,row.barrio].filter(Boolean).join(' - ');if(next)setPlace(next)});return()=>{alive=false}},[session,supabase])
 const help=()=>document.querySelector<HTMLButtonElement>('.ugo-client-global-trigger')?.click()
 const services=()=>flow.actions.openSearch()
 const firstName=profile?.nombre?.split(' ')[0]||'Usuario'
 return <header className="ugo-studio-navbar" data-ugo-source="UGO-PRODUCCION/Navbar">
  <div className="ugo-studio-nav-left">
   <button type="button" className="ugo-studio-logo" onClick={()=>flow.navigate('home')} aria-label="UGO Inicio">UG<span>O</span></button>
   <nav aria-label="Navegación principal UGO">
    <button type="button" className={`ugo-studio-nav-services ${['search','provider','request'].includes(flow.screen)?'active':''}`} onClick={services}><span className="material-symbols-outlined">grid_view</span><span>Servicios</span></button>
    <button type="button" className="ugo-studio-nav-pro" onClick={()=>window.location.assign(`${window.location.pathname}?app=provider`)}><span className="material-symbols-outlined">handyman</span><span className="ugo-studio-pro-label">Trabajá con UGO</span><span className="ugo-studio-pro-short">Pro</span></button>
   </nav>
  </div>
  <div className="ugo-studio-nav-actions">
   <button type="button" className={`ugo-studio-activity-pill ${flow.screen==='history'?'active':''}`} onClick={()=>flow.navigate('history')}><span className="material-symbols-outlined">receipt_long</span><b>Actividad</b></button>
   <button type="button" className="ugo-studio-location-pill" onClick={()=>emitUgoUiEvent(UGO_UI_EVENTS.clientLocation)}><span className="material-symbols-outlined">location_on</span><b>{place}</b><span className="material-symbols-outlined ugo-studio-chevron">expand_more</span></button>
   <button type="button" className="ugo-studio-help" onClick={help}><span className="material-symbols-outlined">help_outline</span><b>Ayuda</b></button>
   <button type="button" className={`ugo-studio-profile ${flow.screen==='profile'?'active':''}`} onClick={()=>flow.navigate('profile')} aria-label="Abrir perfil"><span>{profile?.nombre?.slice(0,1).toUpperCase()||'U'}</span><b>{firstName}</b><i>⌄</i></button>
  </div>
 </header>
}
