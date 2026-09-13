import React,{useEffect,useRef,useState}from'react'
import * as maplibregl from'maplibre-gl'
import{UGO_CLIENT_GUIDED_REQUEST_OPEN}from'../ClientQuickOrder'
import{useRoleSession,type Category}from'../shared'
import'./client-premium-home.css'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}

type ClientProfile={direccion?:string|null;barrio?:string|null;ciudad?:string|null}

export function ClientPremiumHome(){
 const auth=useRoleSession('client'),{supabase,session,profile}=auth
 const[categories,setCategories]=useState<Category[]>([])
 const[place,setPlace]=useState('Florianópolis, SC')
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null)
 const openRequest=()=>window.dispatchEvent(new Event(UGO_CLIENT_GUIDED_REQUEST_OPEN))
 useEffect(()=>{if(!session)return;let alive=true;Promise.all([
  supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre').limit(8),
  supabase.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle(),
 ]).then(([cats,client])=>{if(!alive)return;setCategories((cats.data||[])as Category[]);const p=(client.data||null)as ClientProfile|null;const label=[p?.barrio,p?.ciudad].filter(Boolean).join(', ');if(label)setPlace(label)});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{if(!mapEl.current||mapRef.current)return;const map=new maplibregl.Map({container:mapEl.current,style:MAP_STYLE,center:FLORIPA,zoom:12.7,interactive:false,attributionControl:false});mapRef.current=map;const dot=document.createElement('div');dot.className='ugo-client-home-marker';new maplibregl.Marker({element:dot}).setLngLat(FLORIPA).addTo(map);navigator.geolocation?.getCurrentPosition(pos=>{const point:[number,number]=[pos.coords.longitude,pos.coords.latitude];map.jumpTo({center:point,zoom:14});new maplibregl.Marker({element:dot}).setLngLat(point).addTo(map)},()=>{},{timeout:5000,maximumAge:60000});return()=>{map.remove();mapRef.current=null}},[])
 if(auth.loading||!session||!profile)return null
 return <main className="ugo-client-premium-home">
  <header><div><strong>U.GO</strong><span>● {place}</span></div><button type="button" aria-label="Perfil">{profile.nombre?.slice(0,1).toUpperCase()||'U'}</button></header>
  <section className="ugo-client-home-copy"><h1>¿Qué servicio necesitás?</h1><p>Personas de confianza, cerca tuyo.</p><button type="button" className="ugo-client-home-search" onClick={openRequest}>⌕ <span>Buscá servicios, profesionales…</span></button></section>
  <section className="ugo-client-home-categories" aria-label="Categorías">{categories.slice(0,5).map(c=><button key={c.id} type="button" onClick={openRequest}><span>{c.emoji||'🧰'}</span><small>{c.nombre}</small></button>)}</section>
  <section className="ugo-client-home-map"><div ref={mapEl}/><div className="ugo-client-home-map-shade"/></section>
  <section className="ugo-client-home-sheet"><div className="ugo-client-home-handle"/><small>Tu ubicación</small><strong>{place}</strong><p>UGO buscará profesionales disponibles cerca de esta zona.</p><button type="button" onClick={openRequest}>Encontrar profesionales <span>→</span></button></section>
  <nav aria-label="Navegación principal"><button className="active" type="button">⌂<span>Inicio</span></button><button type="button">▦<span>Servicios</span></button><button type="button">◷<span>Actividad</span></button><button type="button">◯<span>Perfil</span></button></nav>
 </main>
}
