import React,{useEffect,useMemo,useRef,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'
import maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import'./client-quantum.css'
import type{Category}from'./shared'
import{parseClientIntent}from'./hugoIntent'

type ProviderMapRow={
 id:string
 nombre:string|null
 foto_url:string|null
 karma:number|string|null
 servicios_completados:number|null
 tarifa_base:number|string|null
 online:boolean|null
 disponible:boolean|null
 estado_verificacion:string|null
 categoria_principal_id:string|null
 categoria_nombre:string|null
 categoria_emoji:string|null
 lat:number|null
 lng:number|null
}

type Props={
 supabase:SupabaseClient
 categories:Category[]
 selectedCategoryId:string
 onCategorySelect:(id:string)=>void
 onProviderPick:(provider:ProviderMapRow)=>void
}

const FLORIPA:[number,number]=[-48.5482,-27.5949]

function markerNode(p:ProviderMapRow,active:boolean){
 const el=document.createElement('button')
 el.type='button'
 el.className=`ugo-provider-marker${active?' active':''}`
 const name=(p.nombre||'Profesional').split(' ')[0]
 const price=Number(p.tarifa_base||0)
 const rating=Number(p.karma||5)
 el.innerHTML=`<span class="ugo-provider-avatar">${p.foto_url?`<img src="${p.foto_url}" alt=""/>`:(name[0]||'P').toUpperCase()}</span><span class="ugo-provider-copy"><b>${name}</b><small>${p.categoria_emoji||'🛠️'} ${p.categoria_nombre||'Especialista'}</small><em>R$ ${price.toFixed(0)}/h · ★ ${rating.toFixed(1)}</em></span><i class="${p.online&&p.disponible?'online':'offline'}"></i>`
 return el
}

function HugoOrb({state,onClick}:{state:'IDLE'|'LISTENING'|'THINKING'|'SPEAKING';onClick:()=>void}){
 return <button type="button" className={`ugo-hugo-orb state-${state.toLowerCase()}`} onClick={onClick} aria-label="Hablar con Hugo"><span className="ugo-hugo-ring ring-a"/><span className="ugo-hugo-ring ring-b"/><span className="ugo-hugo-core">{state==='THINKING'?'✦':state==='LISTENING'?'🎙️':'H'}</span><small>{state==='LISTENING'?'Escuchando':state==='THINKING'?'Pensando':'Hola, Hugo'}</small></button>
}

export function ClientQuantumExperience({supabase,categories,selectedCategoryId,onCategorySelect,onProviderPick}:Props){
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markers=useRef<maplibregl.Marker[]>([])
 const[userPos,setUserPos]=useState<[number,number]>(FLORIPA),[providers,setProviders]=useState<ProviderMapRow[]>([]),[selected,setSelected]=useState<string|null>(null),[drawer,setDrawer]=useState(false),[orb,setOrb]=useState<'IDLE'|'LISTENING'|'THINKING'|'SPEAKING'>('IDLE'),[geoStatus,setGeoStatus]=useState('Ubicación aproximada · Florianópolis'),[intentStatus,setIntentStatus]=useState('')

 const filtered=useMemo(()=>providers.filter(p=>!selectedCategoryId||!p.categoria_principal_id||p.categoria_principal_id===selectedCategoryId),[providers,selectedCategoryId])
 const selectedProvider=useMemo(()=>filtered.find(p=>p.id===selected)||null,[filtered,selected])

 useEffect(()=>{
  let alive=true
  async function load(){
   const{data,error}=await supabase.from('proveedores_mapa').select('*').order('online',{ascending:false}).order('disponible',{ascending:false}).limit(50)
   if(!alive)return
   if(!error)setProviders((data||[])as ProviderMapRow[])
  }
  load().catch(()=>{})
  const ch=supabase.channel('client-provider-map').on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},()=>load()).subscribe()
  return()=>{alive=false;supabase.removeChannel(ch)}
 },[supabase])

 useEffect(()=>{
  function onHugoText(event:Event){
   const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim()
   if(!text)return
   const intent=parseClientIntent(text,categories)
   setOrb('THINKING')
   if(intent.categoryId){
    onCategorySelect(intent.categoryId)
    setIntentStatus(`Hugo entendió: ${intent.categoryName||'servicio'}${intent.urgency?' · urgente':''}`)
    setDrawer(true)
   }else{
    setIntentStatus(intent.urgency?'Hugo entendió que es urgente. Decime qué profesional necesitás.':'Hugo escuchó el pedido, pero necesita que menciones el tipo de profesional.')
   }
   window.setTimeout(()=>setOrb('IDLE'),700)
  }
  window.addEventListener('ugo:hugo-user-text',onHugoText as EventListener)
  return()=>window.removeEventListener('ugo:hugo-user-text',onHugoText as EventListener)
 },[categories,onCategorySelect])

 useEffect(()=>{
  if(!navigator.geolocation)return
  navigator.geolocation.getCurrentPosition(pos=>{const next:[number,number]=[pos.coords.longitude,pos.coords.latitude];setUserPos(next);setGeoStatus('Tu ubicación actual')},()=>setGeoStatus('Ubicación aproximada · Florianópolis'),{enableHighAccuracy:true,timeout:8000,maximumAge:60000})
 },[])

 useEffect(()=>{
  if(!mapEl.current||mapRef.current)return
  const map=new maplibregl.Map({container:mapEl.current,style:'https://demotiles.maplibre.org/style.json',center:userPos,zoom:13.3,attributionControl:false})
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right')
  mapRef.current=map
  return()=>{markers.current.forEach(m=>m.remove());markers.current=[];map.remove();mapRef.current=null}
 },[])

 useEffect(()=>{mapRef.current?.easeTo({center:userPos,zoom:13.6,duration:900})},[userPos])

 useEffect(()=>{
  const map=mapRef.current
  if(!map)return
  markers.current.forEach(m=>m.remove());markers.current=[]
  const user=document.createElement('div');user.className='ugo-user-marker';user.innerHTML='<span></span>'
  markers.current.push(new maplibregl.Marker({element:user}).setLngLat(userPos).addTo(map))
  filtered.forEach(p=>{
   if(p.lat==null||p.lng==null||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))return
   const el=markerNode(p,p.id===selected)
   el.onclick=()=>{setSelected(p.id);setDrawer(true);map.easeTo({center:[Number(p.lng),Number(p.lat)],zoom:14.5,duration:700})}
   markers.current.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([Number(p.lng),Number(p.lat)]).addTo(map))
  })
 },[filtered,selected,userPos])

 function toggleHugo(){
  if(orb==='LISTENING'){setOrb('THINKING');setTimeout(()=>{setOrb('IDLE');setDrawer(true)},900);return}
  setOrb('LISTENING');setTimeout(()=>setOrb(v=>v==='LISTENING'?'IDLE':v),5000)
 }

 return <section className="ugo-quantum-shell">
  <div className="ugo-map-stage">
   <div ref={mapEl} className="ugo-map-canvas"/>
   <div className="ugo-map-topbar"><div><span className="ugo-live-dot"/>Hugo Radar</div><small>{geoStatus}</small></div>
   {intentStatus&&<div className="ugo-intent-status">{intentStatus}</div>}
   <div className="ugo-category-rail">{categories.slice(0,8).map(c=><button type="button" key={c.id} className={selectedCategoryId===c.id?'active':''} onClick={()=>onCategorySelect(c.id)}><b>{c.emoji}</b><span>{c.nombre}</span></button>)}</div>
   <button type="button" className="ugo-nearby-button" onClick={()=>setDrawer(true)}>{filtered.filter(p=>p.online&&p.disponible).length} disponibles cerca</button>
   <HugoOrb state={orb} onClick={toggleHugo}/>
  </div>
  {drawer&&<div className="ugo-drawer-backdrop" onClick={()=>setDrawer(false)}><div className="ugo-provider-drawer" onClick={e=>e.stopPropagation()}><div className="ugo-drawer-handle"/><div className="ugo-drawer-head"><div><small>HUGO ENCONTRÓ</small><h3>Profesionales disponibles</h3></div><button type="button" onClick={()=>setDrawer(false)}>×</button></div><div className="ugo-provider-list">{filtered.length===0&&<p className="ugo-empty">Todavía no hay proveedores para esta categoría.</p>}{filtered.map(p=>{const active=p.id===selected;return <button type="button" key={p.id} className={`ugo-provider-card${active?' selected':''}`} onClick={()=>setSelected(p.id)}><span className="ugo-card-avatar">{p.foto_url?<img src={p.foto_url} alt=""/>:(p.nombre?.[0]||'P').toUpperCase()}</span><span className="ugo-card-main"><b>{p.nombre||'Profesional UGO'}</b><small>{p.categoria_emoji||'🛠️'} {p.categoria_nombre||'Especialista'}</small><em><span className={p.online&&p.disponible?'available':'offline'}>{p.online&&p.disponible?'Disponible ahora':'No disponible'}</span> · ★ {Number(p.karma||5).toFixed(1)} · {p.servicios_completados||0} servicios</em></span><strong>R$ {Number(p.tarifa_base||0).toFixed(0)}/h</strong></button>})}</div>{selectedProvider&&<button type="button" className="ugo-hire-button" onClick={()=>{onProviderPick(selectedProvider);setDrawer(false)}}>Elegir a {selectedProvider.nombre?.split(' ')[0]||'este profesional'}</button>}</div></div>}
 </section>
}
