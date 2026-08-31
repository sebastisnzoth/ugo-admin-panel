import React,{useEffect,useMemo,useRef,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'
import maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import'./client-quantum.css'
import type{Category}from'./shared'
import{parseClientIntent}from'./hugoIntent'

export type ProviderMapRow={
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

type IntentPayload={categoryId?:string;categoryName?:string;urgency:boolean;description:string}

type Props={
 supabase:SupabaseClient
 categories:Category[]
 selectedCategoryId:string
 onCategorySelect:(id:string)=>void
 onProviderPick:(provider:ProviderMapRow)=>void
 onIntent?:(intent:IntentPayload)=>void
 onManualRequest?:()=>void
}

const FLORIPA:[number,number]=[-48.5482,-27.5949]

function avatarNode(p:ProviderMapRow){
 const wrap=document.createElement('span')
 wrap.className='ugo-provider-avatar'
 if(p.foto_url){
  const img=document.createElement('img')
  img.src=p.foto_url
  img.alt=''
  wrap.appendChild(img)
 }else wrap.textContent=((p.nombre||'P')[0]||'P').toUpperCase()
 return wrap
}

function markerNode(p:ProviderMapRow,active:boolean){
 const el=document.createElement('button')
 el.type='button'
 el.className=`ugo-provider-marker${active?' active':''}`
 el.appendChild(avatarNode(p))
 const copy=document.createElement('span');copy.className='ugo-provider-copy'
 const name=document.createElement('b');name.textContent=(p.nombre||'Profesional').split(' ')[0]
 const cat=document.createElement('small');cat.textContent=`${p.categoria_emoji||'🛠️'} ${p.categoria_nombre||'Especialista'}`
 const meta=document.createElement('em');meta.textContent=`R$ ${Number(p.tarifa_base||0).toFixed(0)}/h · ★ ${Number(p.karma||5).toFixed(1)}`
 copy.append(name,cat,meta);el.appendChild(copy)
 const dot=document.createElement('i');dot.className=p.online&&p.disponible?'online':'offline';el.appendChild(dot)
 return el
}

function categoryByHint(categories:Category[],hint:string|null|undefined){
 if(!hint)return null
 const q=hint.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 return categories.find(c=>{
  const values=[c.nombre,c.slug].filter(Boolean).map(v=>String(v).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,''))
  return values.some(v=>v.includes(q)||q.includes(v))
 })||null
}

export function ClientQuantumExperience({supabase,categories,selectedCategoryId,onCategorySelect,onProviderPick,onIntent,onManualRequest}:Props){
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markers=useRef<maplibregl.Marker[]>([])
 const[userPos,setUserPos]=useState<[number,number]>(FLORIPA),[providers,setProviders]=useState<ProviderMapRow[]>([]),[selected,setSelected]=useState<string|null>(null),[drawer,setDrawer]=useState(false),[geoStatus,setGeoStatus]=useState('Florianópolis · ubicación aproximada'),[intentStatus,setIntentStatus]=useState('Decime qué necesitás y Hugo lo encuentra')

 const filtered=useMemo(()=>providers.filter(p=>!selectedCategoryId||!p.categoria_principal_id||p.categoria_principal_id===selectedCategoryId),[providers,selectedCategoryId])
 const selectedProvider=useMemo(()=>filtered.find(p=>p.id===selected)||null,[filtered,selected])
 const availableCount=filtered.filter(p=>p.online&&p.disponible).length

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
   if(intent.categoryId){
    onCategorySelect(intent.categoryId)
    setIntentStatus(`Hugo entendió: ${intent.categoryName||'servicio'}${intent.urgency?' · urgente':''}`)
    setDrawer(true)
    onIntent?.({categoryId:intent.categoryId,categoryName:intent.categoryName||'',urgency:intent.urgency,description:text})
   }else{
    setIntentStatus(intent.urgency?'Entendí que es urgente. Decime qué tipo de profesional necesitás.':'Te escuché. Nombrame el oficio o contame el problema con un poco más de detalle.')
   }
  }
  function onHugoAi(event:Event){
   const detail=(event as CustomEvent<{text?:string;categoryHint?:string|null;urgent?:boolean;description?:string|null}>).detail||{}
   const matched=categoryByHint(categories,detail.categoryHint)
   if(!matched)return
   onCategorySelect(matched.id)
   const description=String(detail.description||detail.text||'').trim()
   setIntentStatus(`Hugo encontró: ${matched.nombre}${detail.urgent?' · urgente':''}`)
   setDrawer(true)
   onIntent?.({categoryId:matched.id,categoryName:matched.nombre,urgency:Boolean(detail.urgent),description})
  }
  window.addEventListener('ugo:hugo-user-text',onHugoText as EventListener)
  window.addEventListener('ugo:hugo-ai-intent',onHugoAi as EventListener)
  return()=>{
   window.removeEventListener('ugo:hugo-user-text',onHugoText as EventListener)
   window.removeEventListener('ugo:hugo-ai-intent',onHugoAi as EventListener)
  }
 },[categories,onCategorySelect,onIntent])

 useEffect(()=>{
  if(!navigator.geolocation)return
  navigator.geolocation.getCurrentPosition(pos=>{const next:[number,number]=[pos.coords.longitude,pos.coords.latitude];setUserPos(next);setGeoStatus('Tu ubicación actual')},()=>setGeoStatus('Florianópolis · ubicación aproximada'),{enableHighAccuracy:true,timeout:8000,maximumAge:60000})
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
  const user=document.createElement('div');user.className='ugo-user-marker';const pulse=document.createElement('span');user.appendChild(pulse)
  markers.current.push(new maplibregl.Marker({element:user}).setLngLat(userPos).addTo(map))
  filtered.forEach(p=>{
   if(p.lat==null||p.lng==null||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))return
   const el=markerNode(p,p.id===selected)
   el.onclick=()=>{setSelected(p.id);setDrawer(true);map.easeTo({center:[Number(p.lng),Number(p.lat)],zoom:14.5,duration:700})}
   markers.current.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([Number(p.lng),Number(p.lat)]).addTo(map))
  })
 },[filtered,selected,userPos])

 return <section className="ugo-quantum-shell prototype-flow">
  <div className="ugo-map-stage">
   <div ref={mapEl} className="ugo-map-canvas"/>
   <div className="ugo-map-brand"><span className="ugo-brand-orb"/><div><b>U.G.O.</b><small>Hugo Radar</small></div></div>
   <div className="ugo-map-location"><span className="ugo-live-dot"/>{geoStatus}</div>
   <div className="ugo-category-rail">{categories.slice(0,10).map(c=><button type="button" key={c.id} className={selectedCategoryId===c.id?'active':''} onClick={()=>{onCategorySelect(c.id);setIntentStatus(`${c.nombre} seleccionado`);setDrawer(true)}}><b>{c.emoji}</b><span>{c.nombre}</span></button>)}</div>
   <div className="ugo-hugo-message"><small>HUGO</small><p>{intentStatus}</p></div>
   <div className="ugo-map-actions"><button type="button" onClick={()=>setDrawer(true)}><strong>{availableCount}</strong><span>disponibles cerca</span></button><button type="button" onClick={onManualRequest}>⌨️ <span>Escribir pedido</span></button></div>
  </div>
  {drawer&&<div className="ugo-drawer-backdrop" onClick={()=>setDrawer(false)}><div className="ugo-provider-drawer" onClick={e=>e.stopPropagation()}><div className="ugo-drawer-handle"/><div className="ugo-drawer-head"><div><small>HUGO ENCONTRÓ</small><h3>Profesionales para vos</h3><p>{selectedCategoryId?'Elegí uno o seguí hablando con Hugo.':'Elegí una categoría para filtrar el radar.'}</p></div><button type="button" onClick={()=>setDrawer(false)}>×</button></div><div className="ugo-provider-list">{filtered.length===0&&<p className="ugo-empty">Todavía no hay proveedores para esta categoría.</p>}{filtered.map(p=>{const active=p.id===selected;return <button type="button" key={p.id} className={`ugo-provider-card${active?' selected':''}`} onClick={()=>setSelected(p.id)}><span className="ugo-card-avatar">{p.foto_url?<img src={p.foto_url} alt=""/>:(p.nombre?.[0]||'P').toUpperCase()}</span><span className="ugo-card-main"><b>{p.nombre||'Profesional UGO'}</b><small>{p.categoria_emoji||'🛠️'} {p.categoria_nombre||'Especialista'}</small><em><span className={p.online&&p.disponible?'available':'offline'}>{p.online&&p.disponible?'Disponible ahora':'No disponible'}</span> · ★ {Number(p.karma||5).toFixed(1)} · {p.servicios_completados||0} servicios</em></span><strong>R$ {Number(p.tarifa_base||0).toFixed(0)}/h</strong></button>})}</div>{selectedProvider&&<button type="button" className="ugo-hire-button" onClick={()=>{onProviderPick(selectedProvider);setDrawer(false)}}>Continuar con {selectedProvider.nombre?.split(' ')[0]||'este profesional'} →</button>}</div></div>}
 </section>
}
