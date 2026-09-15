import React,{useEffect,useMemo,useRef,useState}from'react'
import * as maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import{useRoleSession,type Category}from'../shared'
import{UGO_UI_EVENTS,emitUgoUiEvent}from'../uiEvents'
import{useClientFlow}from'./clientFlow'
import'./client-premium-home.css'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
type ClientProfile={direccion?:string|null;barrio?:string|null;ciudad?:string|null}
type ProviderRate={tarifa_base?:number|null}
const norm=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const preferred=(categories:Category[])=>{
 const order=['electric','limpieza','plomer','repar','montaje','pint','jardin','cerraj']
 return [...categories].sort((a,b)=>{
  const av=norm(`${a.slug} ${a.nombre}`),bv=norm(`${b.slug} ${b.nombre}`)
  const ai=order.findIndex(key=>av.includes(key)),bi=order.findIndex(key=>bv.includes(key))
  return(ai<0?999:ai)-(bi<0?999:bi)
 })
}

export function ClientPremiumHome(){
 const flow=useClientFlow(),auth=useRoleSession('client'),{supabase,session,profile}=auth
 const[categories,setCategories]=useState<Category[]>([]),[place,setPlace]=useState('Florianópolis, SC'),[selectedId,setSelectedId]=useState(''),[available,setAvailable]=useState(0),[rate,setRate]=useState<number|null>(null)
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markerRef=useRef<maplibregl.Marker|null>(null)
 const ordered=useMemo(()=>preferred(categories),[categories]),visible=ordered.slice(0,6),selected=useMemo(()=>categories.find(item=>item.id===selectedId)||visible[0]||null,[categories,selectedId,visible])
 const openRequest=(category?:Category|null)=>{if(category)flow.publishHugoIntent({text:`Necesito ${category.nombre}`,categoryHint:category.slug||category.id,urgent:false,description:null});flow.actions.openSearch()}
 const openMenu=()=>document.querySelector<HTMLButtonElement>('.ugo-client-global-trigger')?.click()
 useEffect(()=>{if(!session)return;let alive=true;Promise.all([supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),supabase.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle()]).then(([cats,client])=>{if(!alive)return;const next=(cats.data||[])as Category[];setCategories(next);setSelectedId(value=>value||preferred(next)[0]?.id||'');const p=(client.data||null)as ClientProfile|null;const label=[p?.barrio,p?.ciudad].filter(Boolean).join(', ');if(label)setPlace(label)});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{if(!selected)return;let alive=true;supabase.from('proveedores_mapa').select('tarifa_base').eq('categoria_principal_id',selected.id).eq('online',true).eq('disponible',true).limit(24).then(({data})=>{if(!alive)return;const rows=(data||[])as ProviderRate[],rates=rows.map(item=>Number(item.tarifa_base)).filter(value=>Number.isFinite(value)&&value>0).sort((a,b)=>a-b);setAvailable(rows.length);setRate(rates.length?rates[Math.floor(rates.length/2)]:null)});return()=>{alive=false}},[selected,supabase])
 useEffect(()=>{if(auth.loading||!session||!profile||!mapEl.current||mapRef.current)return;const map=new maplibregl.Map({container:mapEl.current,style:MAP_STYLE,center:FLORIPA,zoom:12.7,interactive:true,attributionControl:false});mapRef.current=map;map.once('load',()=>map.resize());const dot=document.createElement('div');dot.className='ugo-client-home-marker';const marker=new maplibregl.Marker({element:dot}).setLngLat(FLORIPA).addTo(map);markerRef.current=marker;navigator.geolocation?.getCurrentPosition(pos=>{const point:[number,number]=[pos.coords.longitude,pos.coords.latitude];map.easeTo({center:point,zoom:14});marker.setLngLat(point)},()=>{},{timeout:5000,maximumAge:60000});return()=>{marker.remove();markerRef.current=null;map.remove();mapRef.current=null}},[auth.loading,session,profile])
 if(auth.loading||!session||!profile)return null
 const firstName=profile.nombre?.split(' ')[0]||'Sergio'
 return <main className="ugo-client-premium-home ugo-studio-home">
  <header className="ugo-studio-navbar"><button type="button" className="ugo-studio-logo" onClick={()=>flow.navigate('home')}>UG<span>O</span></button><nav><button type="button" className="active" onClick={()=>flow.navigate('home')}>Inicio</button><button type="button" onClick={()=>openRequest(selected)}>Servicios</button><button type="button" onClick={()=>flow.navigate('history')}>Actividad</button><button type="button" onClick={()=>window.location.assign(`${window.location.pathname}?app=provider`)}>Trabajá con UGO</button></nav><div className="ugo-studio-nav-actions"><button type="button" className="ugo-studio-location-pill" onClick={()=>emitUgoUiEvent(UGO_UI_EVENTS.clientLocation)}><span className="material-symbols-outlined">location_on</span><b>{place}</b></button><button type="button" className="ugo-studio-help" onClick={openMenu}><span className="material-symbols-outlined">help_outline</span><b>Ayuda</b></button><button type="button" className="ugo-studio-profile" onClick={()=>flow.navigate('profile')} aria-label="Abrir perfil"><span>{profile.nombre?.slice(0,1).toUpperCase()||'U'}</span><b>{firstName}</b><i>⌄</i></button></div></header>
  <section className="ugo-studio-home-main">
   <div className="ugo-studio-service-card"><div className="ugo-studio-title-row"><div><span className="ugo-studio-eyebrow">UGO EN TU ZONA</span><h1>Elegí un servicio</h1><p>Profesionales verificados listos para resolver lo que necesitás.</p></div><span className="ugo-studio-live"><i/> En vivo</span></div>
    <button type="button" className="ugo-studio-address" onClick={()=>emitUgoUiEvent(UGO_UI_EVENTS.clientLocation)}><span className="material-symbols-outlined">location_on</span><div><small>Dirección de servicio</small><strong>{place}</strong><em>Usar o actualizar mi ubicación</em></div><b>Cambiar</b></button>
    <div className="ugo-studio-services">{visible.map(category=>{const active=category.id===selected?.id;return <button type="button" key={category.id} className={active?'selected':''} onClick={()=>setSelectedId(category.id)}><span className="ugo-studio-service-icon">{category.emoji||'🧰'}</span><div><strong>{category.nombre}</strong><small>{active&&available>0?`${available} profesional${available===1?'':'es'} disponible${available===1?'':'s'}`:'Profesionales verificados en tu zona'}</small></div><span className="ugo-studio-service-price">{active&&rate!=null?`R$ ${Math.round(rate)}`:'→'}</span></button>})}</div>
    <button type="button" className="ugo-studio-catalog" onClick={()=>openRequest(null)}><span className="material-symbols-outlined">grid_view</span>Ver todas las especialidades<span>→</span></button>
    <button type="button" className="ugo-studio-book" disabled={!selected} onClick={()=>openRequest(selected)}><span><span className="material-symbols-outlined">handyman</span>Pedir {selected?.nombre||'servicio'}</span><b>{rate!=null?`desde R$ ${Math.round(rate)}`:'Continuar'} →</b></button>
    <div className="ugo-studio-care"><span className="material-symbols-outlined">verified_user</span><span>Pedido real conectado a UGO · seguimiento, chat y estados por serviceId</span></div>
   </div>
   <div className="ugo-studio-map-card"><div className="ugo-studio-map-bar"><span><i/>Cobertura en tiempo real: Florianópolis</span><b>{available>0?`${available} disponibles`:'Buscando disponibilidad'}</b></div><div className="ugo-studio-map"><div ref={mapEl}/><div className="ugo-client-home-map-shade"/><div className="ugo-client-home-map-label"><span className="material-symbols-outlined">my_location</span><div><b>Tu zona de servicio</b><small>{place}</small></div></div>{selected&&<div className="ugo-studio-map-banner"><span className="material-symbols-outlined">electric_bolt</span><div><b>{selected.nombre}</b><small>{available>0?`${available} profesionales online`:'UGO verificará disponibilidad al confirmar'}</small></div></div>}</div><div className="ugo-studio-map-summary"><div><small>Servicio seleccionado</small><strong>{selected?.emoji||'🧰'} {selected?.nombre||'Elegí un servicio'}</strong></div><div><small>Disponibilidad</small><strong>{available>0?'Ahora':'A confirmar'}</strong></div><button type="button" onClick={()=>flow.navigate('history')}>Ver mi actividad →</button></div></div>
  </section>
  <section className="ugo-studio-bottom-grid"><button type="button" onClick={()=>flow.navigate('history')}><span className="material-symbols-outlined">receipt_long</span><div><strong>Actividad</strong><small>Pedidos activos, programados e historial</small></div><b>→</b></button><button type="button" onClick={()=>flow.navigate('profile')}><span className="material-symbols-outlined">person</span><div><strong>Mi cuenta</strong><small>Datos, direcciones y seguridad</small></div><b>→</b></button><button type="button" onClick={()=>{flow.actions.openSearch();window.setTimeout(()=>emitUgoUiEvent(UGO_UI_EVENTS.clientHugoVoice),0)}}><span className="material-symbols-outlined">graphic_eq</span><div><strong>Hablar con Hugo</strong><small>Pedí por voz sin completar formularios largos</small></div><b>→</b></button></section>
 </main>
}
