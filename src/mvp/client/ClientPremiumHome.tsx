import React,{useEffect,useRef,useState}from'react'
import * as maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import{UGO_UI_EVENTS,emitUgoUiEvent}from'../uiEvents'
import{useRoleSession,type Category}from'../shared'
import{useClientFlow}from'./clientFlow'
import'./client-premium-home.css'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
type ClientProfile={direccion?:string|null;barrio?:string|null;ciudad?:string|null}

export function ClientPremiumHome(){
 const flow=useClientFlow(),auth=useRoleSession('client'),{supabase,session,profile}=auth
 const[categories,setCategories]=useState<Category[]>([]),[place,setPlace]=useState('Florianópolis, SC')
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markerRef=useRef<maplibregl.Marker|null>(null)
 const openRequest=()=>flow.actions.openSearch()
 const talkToHugo=()=>{openRequest();window.setTimeout(()=>emitUgoUiEvent(UGO_UI_EVENTS.clientHugoVoice),0)}
 const writeToHugo=(text='',send=false)=>{openRequest();window.setTimeout(()=>window.dispatchEvent(new CustomEvent(UGO_UI_EVENTS.clientHugoText,{detail:text?{text,send}:undefined})),0)}
 useEffect(()=>{if(!session)return;let alive=true;Promise.all([supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),supabase.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle()]).then(([cats,client])=>{if(!alive)return;setCategories((cats.data||[])as Category[]);const p=(client.data||null)as ClientProfile|null;const label=[p?.barrio,p?.ciudad].filter(Boolean).join(', ');if(label)setPlace(label)});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{if(auth.loading||!session||!profile||!mapEl.current||mapRef.current)return;const map=new maplibregl.Map({container:mapEl.current,style:MAP_STYLE,center:FLORIPA,zoom:12.7,interactive:false,attributionControl:false});mapRef.current=map;map.once('load',()=>map.resize());const dot=document.createElement('div');dot.className='ugo-client-home-marker';const marker=new maplibregl.Marker({element:dot}).setLngLat(FLORIPA).addTo(map);markerRef.current=marker;navigator.geolocation?.getCurrentPosition(pos=>{const point:[number,number]=[pos.coords.longitude,pos.coords.latitude];map.jumpTo({center:point,zoom:14});marker.setLngLat(point)},()=>{},{timeout:5000,maximumAge:60000});return()=>{marker.remove();markerRef.current=null;map.remove();mapRef.current=null}},[auth.loading,session,profile])
 if(auth.loading||!session||!profile)return null
 const firstName=profile.nombre?.split(' ')[0]||''
 return <main className="ugo-client-premium-home ugo-client-conversational-home">
  <header><div><strong>U.GO</strong><span><i/> {place}</span></div><button type="button" aria-label="Abrir perfil" onClick={()=>flow.navigate('profile')}>{profile.nombre?.slice(0,1).toUpperCase()||'U'}</button></header>
  <section className="ugo-client-home-copy ugo-client-home-hugo-copy"><span className="ugo-client-home-kicker">{firstName?'Hola, '+firstName:'HOLA'}</span><h1>Contame qué necesitás. Yo te ayudo a resolverlo.</h1><p>Decí “Hola Hugo” o contale el problema. UGO arma el pedido y busca al profesional indicado.</p><div className="ugo-client-home-hugo-actions"><button type="button" className="ugo-client-home-talk" onClick={talkToHugo}><b>⌁</b><span>Hablar con Hugo</span><em>●</em></button><button type="button" className="ugo-client-home-search" onClick={()=>writeToHugo()}><b>✎</b><span>Escribirle a Hugo</span><em>→</em></button></div></section>
  <section className="ugo-client-home-categories" aria-label="Elegir servicio"><div className="ugo-client-categories-head"><strong>¿Qué necesitás?</strong><small>Elegí uno o contalo con tus palabras</small></div>{categories.map(c=><button key={c.id} type="button" onClick={()=>writeToHugo('Necesito '+c.nombre,true)}><span>{c.emoji||'🧰'}</span><small>{c.nombre}</small></button>)}</section>
  <section className="ugo-client-home-map" aria-label="Tu zona"><div ref={mapEl}/><div className="ugo-client-home-map-shade"/><div className="ugo-client-home-map-label"><span>●</span><div><b>Buscamos cerca tuyo</b><small>{place}</small></div></div></section>
  <section className="ugo-client-home-sheet" aria-label="Cómo funciona UGO"><div className="ugo-client-home-handle"/><strong>Un pedido. Un profesional. Sin vueltas.</strong><div className="ugo-client-home-steps"><span><b>1</b>Contás</span><span><b>2</b>UGO busca</span><span><b>3</b>Se resuelve</span></div><p>Voz y texto completan el mismo pedido. Siempre podés revisar antes de confirmar.</p></section>
  <nav aria-label="Navegación principal"><button className={flow.screen==='home'?'active':''} type="button" aria-current={flow.screen==='home'?'page':undefined} onClick={()=>flow.navigate('home')}>⌂<span>Inicio</span></button><button className={flow.screen==='history'?'active':''} type="button" aria-current={flow.screen==='history'?'page':undefined} onClick={()=>flow.navigate('history')}>◷<span>Actividad</span></button><button className={flow.screen==='profile'?'active':''} type="button" aria-current={flow.screen==='profile'?'page':undefined} onClick={()=>flow.navigate('profile')}>◯<span>Perfil</span></button></nav>
 </main>
}
