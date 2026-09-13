import React,{useEffect,useRef,useState}from'react'
import * as maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import{UGO_CLIENT_GUIDED_REQUEST_OPEN}from'../ClientQuickOrder'
import{useRoleSession,type Category}from'../shared'
import{useClientFlow}from'./clientFlow'
import'./client-premium-home.css'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
type ClientProfile={direccion?:string|null;barrio?:string|null;ciudad?:string|null}

export function ClientPremiumHome(){
 const flow=useClientFlow()
 const auth=useRoleSession('client'),{supabase,session,profile}=auth
 const[categories,setCategories]=useState<Category[]>([]),[place,setPlace]=useState('Florianópolis, SC')
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markerRef=useRef<maplibregl.Marker|null>(null)
 const openRequest=(category?:Category)=>{if(category)sessionStorage.setItem('ugo-request-category',JSON.stringify({id:category.id,slug:category.slug,nombre:category.nombre}));else sessionStorage.removeItem('ugo-request-category');window.dispatchEvent(new Event(UGO_CLIENT_GUIDED_REQUEST_OPEN))}
 useEffect(()=>{if(!session)return;let alive=true;Promise.all([supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),supabase.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle()]).then(([cats,client])=>{if(!alive)return;setCategories((cats.data||[])as Category[]);const p=(client.data||null)as ClientProfile|null;const label=[p?.barrio,p?.ciudad].filter(Boolean).join(', ');if(label)setPlace(label)});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{if(auth.loading||!session||!profile||!mapEl.current||mapRef.current)return;const map=new maplibregl.Map({container:mapEl.current,style:MAP_STYLE,center:FLORIPA,zoom:12.7,interactive:false,attributionControl:false});mapRef.current=map;map.once('load',()=>map.resize());const dot=document.createElement('div');dot.className='ugo-client-home-marker';const marker=new maplibregl.Marker({element:dot}).setLngLat(FLORIPA).addTo(map);markerRef.current=marker;navigator.geolocation?.getCurrentPosition(pos=>{const point:[number,number]=[pos.coords.longitude,pos.coords.latitude];map.jumpTo({center:point,zoom:14});marker.setLngLat(point)},()=>{},{timeout:5000,maximumAge:60000});return()=>{marker.remove();markerRef.current=null;map.remove();mapRef.current=null}},[auth.loading,session,profile])
 if(auth.loading||!session||!profile)return null
 return <main className="ugo-client-premium-home">
  <header><div><strong>U.GO</strong><span><i/> {place}</span></div><button type="button" aria-label="Abrir perfil" onClick={()=>flow.navigate('profile')}>{profile.nombre?.slice(0,1).toUpperCase()||'U'}</button></header>
  <section className="ugo-client-home-copy"><span className="ugo-client-home-kicker">Hola, {profile.nombre?.split(' ')[0]||'¿cómo estás?'}</span><h1>¿Qué servicio necesitás?</h1><p>Elegí un servicio y UGO busca a alguien cerca.</p><button type="button" className="ugo-client-home-search" onClick={()=>openRequest()}><b>⌕</b><span>Contanos qué necesitás</span><em>→</em></button></section>
  <section className="ugo-client-home-categories" aria-label="Categorías de servicios">{categories.map(c=><button key={c.id} type="button" onClick={()=>openRequest(c)}><span>{c.emoji||'🧰'}</span><small>{c.nombre}</small></button>)}</section>
  <section className="ugo-client-home-map" aria-label="Profesionales cerca"><div ref={mapEl}/><div className="ugo-client-home-map-shade"/><div className="ugo-client-home-map-label"><span>●</span><div><b>Buscamos cerca tuyo</b><small>{place}</small></div></div></section>
  <section className="ugo-client-home-sheet"><div className="ugo-client-home-handle"/><strong>Un pedido. Un profesional. Sin vueltas.</strong><p>Contanos qué necesitás, dónde y cuándo. UGO encuentra al profesional indicado para vos.</p><button type="button" onClick={()=>openRequest()}>Pedir un servicio <span>→</span></button></section>
  <nav aria-label="Navegación principal"><button className={flow.screen==='home'?'active':''} type="button" aria-current={flow.screen==='home'?'page':undefined} onClick={()=>flow.navigate('home')}>⌂<span>Inicio</span></button><button className={flow.screen==='history'?'active':''} type="button" aria-current={flow.screen==='history'?'page':undefined} onClick={()=>flow.navigate('history')}>◷<span>Actividad</span></button><button className={flow.screen==='profile'?'active':''} type="button" aria-current={flow.screen==='profile'?'page':undefined} onClick={()=>flow.navigate('profile')}>◯<span>Perfil</span></button></nav>
 </main>
}
