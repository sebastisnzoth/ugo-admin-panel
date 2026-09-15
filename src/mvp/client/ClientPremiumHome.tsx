import React,{useEffect,useMemo,useRef,useState}from'react'
import * as maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import{useRoleSession,type Category}from'../shared'
import{useClientFlow}from'./clientFlow'
import'./client-premium-home.css'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
type ClientProfile={direccion?:string|null;barrio?:string|null;ciudad?:string|null}
type CoreService={key:string;label:string;emoji:string;matches:(category:Category)=>boolean}
const norm=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const CORE_SERVICES:CoreService[]=[
 {key:'limpieza',label:'Limpieza',emoji:'🧹',matches:c=>norm(`${c.slug} ${c.nombre}`).includes('limpieza')},
 {key:'reparaciones',label:'Reparaciones',emoji:'🛠️',matches:c=>{const value=norm(`${c.slug} ${c.nombre}`);return value.includes('montaje')||value.includes('reparacion')}},
 {key:'electricidad',label:'Electricidad',emoji:'⚡',matches:c=>norm(`${c.slug} ${c.nombre}`).includes('electric')},
 {key:'plomeria',label:'Plomería',emoji:'💧',matches:c=>norm(`${c.slug} ${c.nombre}`).includes('plomer')},
]

export function ClientPremiumHome(){
 const flow=useClientFlow(),auth=useRoleSession('client'),{supabase,session,profile}=auth
 const[categories,setCategories]=useState<Category[]>([]),[place,setPlace]=useState('Florianópolis, SC')
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markerRef=useRef<maplibregl.Marker|null>(null)
 const coreCategories=useMemo(()=>CORE_SERVICES.map(item=>({item,category:categories.find(item.matches)||null})),[categories])
 const talkToHugo=()=>window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.ugo-real-orb')?.click(),0)
 const writeToHugo=()=>window.setTimeout(()=>document.querySelector<HTMLInputElement>('.ugo-hugo-stage-composer input')?.focus(),0)
 const openCategory=(item:CoreService,category:Category|null)=>{if(!category){flow.navigate('search');return}flow.publishHugoIntent({text:`Necesito ${category.nombre||item.label}`,categoryHint:category.slug||category.id,urgent:false,description:null})}
 useEffect(()=>{if(!session)return;let alive=true;Promise.all([supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),supabase.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle()]).then(([cats,client])=>{if(!alive)return;setCategories((cats.data||[])as Category[]);const p=(client.data||null)as ClientProfile|null;const label=[p?.barrio,p?.ciudad].filter(Boolean).join(', ');if(label)setPlace(label)});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{if(flow.screen!=='home'||auth.loading||!session||!profile||!mapEl.current||mapRef.current)return;const map=new maplibregl.Map({container:mapEl.current,style:MAP_STYLE,center:FLORIPA,zoom:11.8,interactive:false,attributionControl:false});mapRef.current=map;map.once('load',()=>map.resize());const dot=document.createElement('div');dot.className='ugo-client-home-marker';const marker=new maplibregl.Marker({element:dot}).setLngLat(FLORIPA).addTo(map);markerRef.current=marker;navigator.geolocation?.getCurrentPosition(pos=>{const point:[number,number]=[pos.coords.longitude,pos.coords.latitude];map.jumpTo({center:point,zoom:13.4});marker.setLngLat(point)},()=>{},{timeout:5000,maximumAge:60000});return()=>{marker.remove();markerRef.current=null;map.remove();mapRef.current=null}},[auth.loading,flow.screen,session,profile])
 if(auth.loading||!session||!profile||flow.screen!=='home')return null
 return <main className="ugo-client-premium-home ugo-client-stitch-home">
  <section className="ugo-client-home-map" aria-label="Mapa de tu zona"><div ref={mapEl}/><div className="ugo-client-home-map-shade"/></section>
  <header className="ugo-client-home-topbar"><div className="ugo-client-home-brand"><strong>UGO</strong><span>Un pedido. Un profesional. Sin vueltas.</span></div><div className="ugo-client-home-top-actions"><button type="button" className="ugo-client-home-place" onClick={()=>flow.navigate('profile')} aria-label={`Ubicación: ${place}`}><span>⌖</span><div><b>{place.split(',')[0]}</b><small>{place.includes(',')?place.split(',').slice(1).join(',').trim():'Santa Catarina'}</small></div></button><button type="button" className="ugo-client-home-avatar" aria-label="Abrir perfil" onClick={()=>flow.navigate('profile')}>{profile.nombre?.slice(0,1).toUpperCase()||'U'}</button></div></header>
  <section className="ugo-client-home-hero" aria-label="Hugo, asistente de UGO"><div className="ugo-client-home-spacer"/><div className="ugo-client-home-question"><span>HUGO ESTÁ LISTO</span><h1>¿Qué necesitás?</h1><p>Hablá con Hugo o escribí. UGO te va guiando paso a paso.</p><div className="ugo-client-home-inline-actions"><button type="button" onClick={talkToHugo}><span>◉</span>Hablar con Hugo</button><button type="button" onClick={writeToHugo}><span>⌨</span>Escribir</button></div></div></section>
  <section className="ugo-client-home-categories" aria-label="Servicios rápidos"><div className="ugo-client-categories-head"><strong>Servicios rápidos</strong><button type="button" onClick={()=>flow.navigate('search')}>Ver todos</button></div><div className="ugo-client-category-grid">{coreCategories.map(({item,category})=><button key={item.key} type="button" onClick={()=>openCategory(item,category)}><span>{category?.emoji||item.emoji}</span><small>{item.label}</small></button>)}</div></section>
  <nav aria-label="Navegación principal"><button className="active" type="button" aria-current="page" onClick={()=>flow.navigate('home')}>⌂<span>Inicio</span></button><button type="button" onClick={()=>flow.navigate('search')}>▦<span>Servicios</span></button><button type="button" onClick={()=>flow.navigate('history')}>◷<span>Actividad</span></button><button type="button" onClick={()=>flow.navigate('profile')}>◯<span>Perfil</span></button></nav>
 </main>
}
