import React,{useEffect,useMemo,useRef,useState}from'react'
import type{SupabaseClient}from'@supabase/supabase-js'
import * as maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import'./client-quantum.css'
import'./client-reference.css'
import type{Category}from'./shared'
import{parseClientIntent}from'./hugoIntent'
import type{ClientHugoIntent,ClientScreen}from'./client/clientTypes'
import{getRoutingProvider}from'../lib/routing/provider'

export type ProviderMapRow={id:string;nombre:string|null;foto_url:string|null;karma:number|string|null;servicios_completados:number|null;tarifa_base:number|string|null;online:boolean|null;disponible:boolean|null;estado_verificacion:string|null;categoria_principal_id:string|null;categoria_nombre:string|null;categoria_emoji:string|null;lat:number|null;lng:number|null;pais?:string|null;zona?:string|null;bio?:string|null;experiencia_anos?:number|null;especialidades?:string|null;idiomas?:string|null;disponibilidad_horaria?:string|null;telefono_profesional?:string|null;ciudad_base?:string|null}
type IntentPayload={categoryId?:string;categoryName?:string;urgency:boolean;description:string}
type Props={supabase:SupabaseClient;categories:Category[];selectedCategoryId:string;requestedScreen?:ClientScreen;requestedProviderId?:string|null;hugoIntent?:ClientHugoIntent|null;onCategorySelect:(id:string)=>void;onProviderPick:(provider:ProviderMapRow)=>void;onSearchClose?:()=>void;onIntent?:(intent:IntentPayload)=>void}
type EtaMeta={etaSeconds:number;distanceMeters:number}

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const ROUTE_SOURCE='ugo-selected-route-source',ROUTE_LAYER='ugo-selected-route-layer'
const MAP_STYLE:any={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}

function avatarNode(p:ProviderMapRow){
 const wrap=document.createElement('span');wrap.className='ugo-provider-avatar'
 if(p.foto_url){const img=document.createElement('img');img.src=p.foto_url;img.alt='';wrap.appendChild(img)}
 else wrap.textContent=((p.nombre||'P')[0]||'P').toUpperCase()
 return wrap
}
function markerNode(p:ProviderMapRow,active:boolean){
 const el=document.createElement('button');el.type='button';el.className=`ugo-provider-marker${active?' active':''}`;el.appendChild(avatarNode(p))
 const copy=document.createElement('span');copy.className='ugo-provider-copy'
 const name=document.createElement('b');name.textContent=(p.nombre||'Profesional').split(' ')[0]
 const cat=document.createElement('small');cat.textContent=p.categoria_nombre||'Especialista'
 const meta=document.createElement('em');meta.textContent=`R$ ${Number(p.tarifa_base||0).toFixed(0)}/h · ★ ${Number(p.karma||5).toFixed(1)}`
 copy.append(name,cat,meta);el.appendChild(copy)
 const dot=document.createElement('i');dot.className=p.online&&p.disponible?'online':'offline';el.appendChild(dot)
 return el
}
function categoryByHint(categories:Category[],hint:string|null|undefined){
 if(!hint)return null
 const q=hint.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 return categories.find(c=>[c.nombre,c.slug].filter(Boolean).some(v=>{const n=String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return n.includes(q)||q.includes(n)}))||null
}
function etaLabel(meta:EtaMeta|undefined){return meta?`${Math.max(1,Math.round(meta.etaSeconds/60))} min`:''}
function clearRoute(map:maplibregl.Map){
 try{if(map.getLayer(ROUTE_LAYER))map.removeLayer(ROUTE_LAYER)}catch{}
 try{if(map.getSource(ROUTE_SOURCE))map.removeSource(ROUTE_SOURCE)}catch{}
}

export function ClientQuantumExperience({supabase,categories,selectedCategoryId,requestedScreen,requestedProviderId,hugoIntent,onCategorySelect,onProviderPick,onSearchClose,onIntent}:Props){
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),markers=useRef<maplibregl.Marker[]>([]),searchInput=useRef<HTMLInputElement|null>(null)
 const[userPos,setUserPos]=useState<[number,number]>(FLORIPA)
 const[providers,setProviders]=useState<ProviderMapRow[]>([])
 const[selected,setSelected]=useState<string|null>(null)
 const[drawer,setDrawer]=useState(false)
 const[menuOpen,setMenuOpen]=useState(false)
 const[etaByProvider,setEtaByProvider]=useState<Record<string,EtaMeta>>({})
 const[search,setSearch]=useState('')
 const[loading,setLoading]=useState(true)
 const[loadError,setLoadError]=useState('')
 const[mapError,setMapError]=useState('')
 const[reloadKey,setReloadKey]=useState(0)
 const[locationNotice,setLocationNotice]=useState('')

 const categoryFiltered=useMemo(()=>providers.filter(p=>!selectedCategoryId||!p.categoria_principal_id||p.categoria_principal_id===selectedCategoryId),[providers,selectedCategoryId])
 const filtered=useMemo(()=>[...categoryFiltered].filter(p=>!search.trim()||`${p.nombre||''} ${p.categoria_nombre||''} ${p.especialidades||''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>{const availability=Number(Boolean(b.online&&b.disponible))-Number(Boolean(a.online&&a.disponible));if(availability)return availability;const ae=etaByProvider[a.id]?.etaSeconds??Number.MAX_SAFE_INTEGER,be=etaByProvider[b.id]?.etaSeconds??Number.MAX_SAFE_INTEGER;if(ae!==be)return ae-be;return Number(b.karma||0)-Number(a.karma||0)}),[categoryFiltered,etaByProvider,search])
 const selectedProvider=useMemo(()=>filtered.find(p=>p.id===selected)||providers.find(p=>p.id===selected)||null,[filtered,providers,selected])
 const featured=filtered.slice(0,3)

 useEffect(()=>{let alive=true;async function load(){setLoading(true);setLoadError('');try{const{data,error}=await supabase.from('proveedores_mapa').select('*').order('online',{ascending:false}).order('disponible',{ascending:false}).limit(50);if(!alive)return;if(error)setLoadError(error.message);else setProviders((data||[])as ProviderMapRow[])}catch(e){if(alive)setLoadError(e instanceof Error?e.message:'No pudimos cargar el radar.')}finally{if(alive)setLoading(false)}}void load();const ch=supabase.channel('client-provider-map').on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},()=>{void load()}).subscribe();return()=>{alive=false;void supabase.removeChannel(ch)}},[supabase,reloadKey])
 useEffect(()=>{function local(event:Event){const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim();if(!text)return;const intent=parseClientIntent(text,categories);if(intent.categoryId){onCategorySelect(intent.categoryId);setDrawer(true);onIntent?.({categoryId:intent.categoryId,categoryName:intent.categoryName||'',urgency:intent.urgency,description:text})}}function ai(event:Event){const d=(event as CustomEvent<{text?:string;categoryHint?:string|null;urgent?:boolean;description?:string|null}>).detail||{};const matched=categoryByHint(categories,d.categoryHint);if(!matched)return;onCategorySelect(matched.id);setDrawer(true);onIntent?.({categoryId:matched.id,categoryName:matched.nombre,urgency:Boolean(d.urgent),description:String(d.description||d.text||'').trim()})}window.addEventListener('ugo:hugo-user-text',local as EventListener);window.addEventListener('ugo:hugo-ai-intent',ai as EventListener);return()=>{window.removeEventListener('ugo:hugo-user-text',local as EventListener);window.removeEventListener('ugo:hugo-ai-intent',ai as EventListener)}},[categories,onCategorySelect,onIntent])
 useEffect(()=>{if(!hugoIntent)return;const matched=categoryByHint(categories,hugoIntent.categoryHint);if(matched)onCategorySelect(matched.id);setDrawer(true);onIntent?.({categoryId:matched?.id,categoryName:matched?.nombre||'',urgency:Boolean(hugoIntent.urgent),description:String(hugoIntent.description||hugoIntent.text||'').trim()})},[categories,hugoIntent,onCategorySelect,onIntent])
 useEffect(()=>{if(requestedScreen==='search'){setSelected(null);setDrawer(true)}if(requestedScreen==='provider'&&requestedProviderId){setSelected(requestedProviderId);setDrawer(true)}},[requestedProviderId,requestedScreen])
 useEffect(()=>{if(!navigator.geolocation){setLocationNotice('La ubicación no está disponible en este dispositivo.');return}navigator.geolocation.getCurrentPosition(pos=>{setUserPos([pos.coords.longitude,pos.coords.latitude]);setLocationNotice('');try{sessionStorage.setItem('ugo:last-client-location',JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,at:Date.now()}))}catch{}},()=>setLocationNotice('No pudimos acceder a tu ubicación. Podés reintentar cuando quieras.'),{enableHighAccuracy:true,timeout:8000,maximumAge:60000})},[reloadKey])
 useEffect(()=>{let alive=true;const candidates=categoryFiltered.filter(p=>p.lat!=null&&p.lng!=null&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))).map(p=>({providerId:p.id,location:{latitude:Number(p.lat),longitude:Number(p.lng)},available:Boolean(p.online&&p.disponible)}));if(!candidates.length){setEtaByProvider({});return()=>{alive=false}};getRoutingProvider().rankByEta({latitude:userPos[1],longitude:userPos[0]},candidates).then(rows=>{if(!alive)return;const next:Record<string,EtaMeta>={};rows.forEach(row=>{next[row.providerId]={etaSeconds:row.etaSeconds,distanceMeters:row.distanceMeters}});setEtaByProvider(next)}).catch(()=>{if(alive)setEtaByProvider({})});return()=>{alive=false}},[categoryFiltered,userPos])

 useEffect(()=>{
  if(!mapEl.current||mapRef.current)return
  let map:maplibregl.Map|null=null
  try{
   map=new maplibregl.Map({container:mapEl.current,style:MAP_STYLE,center:userPos,zoom:14,attributionControl:false})
   map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left')
   map.on('error',event=>console.warn('UGO client map resource error',event?.error||event))
   mapRef.current=map
   setMapError('')
  }catch(error){
   console.warn('UGO client map unavailable',error)
   setMapError('El mapa no pudo iniciarse en este navegador. Podés seguir buscando y contratando profesionales desde la lista.')
   try{map?.remove()}catch{}
   mapRef.current=null
  }
  return()=>{
   markers.current.forEach(marker=>{try{marker.remove()}catch{}});markers.current=[]
   const current=mapRef.current;mapRef.current=null
   if(current){clearRoute(current);try{current.remove()}catch{}}
  }
 },[])
 useEffect(()=>{if(!selected){try{mapRef.current?.easeTo({center:userPos,zoom:14,duration:700})}catch{}}},[selected,userPos])
 useEffect(()=>{const map=mapRef.current;if(!map)return;try{markers.current.forEach(m=>{try{m.remove()}catch{}});markers.current=[];const user=document.createElement('div');user.className='ugo-user-marker';user.appendChild(document.createElement('span'));markers.current.push(new maplibregl.Marker({element:user}).setLngLat(userPos).addTo(map));filtered.forEach(p=>{if(p.lat==null||p.lng==null||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))return;const el=markerNode(p,p.id===selected);el.onclick=()=>{setSelected(p.id);setDrawer(true)};markers.current.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([Number(p.lng),Number(p.lat)]).addTo(map))})}catch(error){console.warn('UGO client marker render failed',error);setMapError('El mapa quedó temporalmente no disponible. La búsqueda de profesionales sigue funcionando.')}},[filtered,selected,userPos])
 useEffect(()=>{const map=mapRef.current;if(!map)return;let alive=true;const provider=selectedProvider;if(!provider||provider.lat==null||provider.lng==null||!Number.isFinite(Number(provider.lat))||!Number.isFinite(Number(provider.lng))){clearRoute(map);return()=>{alive=false}}const origin={latitude:Number(provider.lat),longitude:Number(provider.lng)},destination={latitude:userPos[1],longitude:userPos[0]};getRoutingProvider().route(origin,destination).then(route=>{if(!alive||!mapRef.current)return;const current=mapRef.current;const geometry=(route.geometry&&typeof route.geometry==='object'&&(route.geometry as any).type==='LineString')?route.geometry:{type:'LineString',coordinates:[[origin.longitude,origin.latitude],[destination.longitude,destination.latitude]]};const render=()=>{if(!alive||!current.isStyleLoaded())return;try{clearRoute(current);current.addSource(ROUTE_SOURCE,{type:'geojson',data:{type:'Feature',properties:{},geometry} as any});current.addLayer({id:ROUTE_LAYER,type:'line',source:ROUTE_SOURCE,layout:{'line-cap':'round','line-join':'round'},paint:{'line-width':5,'line-opacity':.88,'line-color':'#079455'}});const bounds=new maplibregl.LngLatBounds();(geometry as any).coordinates.forEach((c:[number,number])=>bounds.extend(c));if(!bounds.isEmpty())current.fitBounds(bounds,{padding:90,maxZoom:15,duration:700})}catch(error){console.warn('UGO route render failed',error)}};if(current.isStyleLoaded())render();else current.once('load',render)}).catch(()=>{});return()=>{alive=false}},[selectedProvider,userPos])

 function pickProvider(p:ProviderMapRow){setSelected(p.id);setDrawer(true)}
 function goHome(){setMenuOpen(false);setSearch('');onCategorySelect('');setSelected(null);setDrawer(false);try{mapRef.current?.easeTo({center:userPos,zoom:14,duration:500})}catch{}}
 function focusSearch(){setMenuOpen(false);window.setTimeout(()=>{searchInput.current?.focus();setDrawer(true)},120)}
 function openHugo(){setMenuOpen(false);window.dispatchEvent(new Event('ugo:open-hugo'))}
 function closeDrawer(){const wasSearch=requestedScreen==='search';setDrawer(false);if(wasSearch)onSearchClose?.()}

 return <section className="ugo-quantum-shell ugo-responsive-home ugo-ref-client">
  <div className="ugo-map-stage"><div ref={mapEl} className="ugo-map-canvas"/>{mapError&&<div role="status" style={{position:'absolute',left:'50%',top:'46%',transform:'translate(-50%,-50%)',zIndex:6,width:'min(360px,calc(100% - 32px))',padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,.96)',boxShadow:'0 12px 34px rgba(15,23,42,.14)',fontSize:12,lineHeight:1.45,color:'#475467'}}><b style={{display:'block',color:'#101828',marginBottom:4}}>Mapa no disponible</b>{mapError}</div>}</div>
  <header className="ugo-ref-topbar"><button type="button" className="ugo-ref-circle ugo-client-menu-trigger" aria-label="Abrir menú" onClick={()=>setMenuOpen(true)}>☰</button><div className="ugo-ref-location"><span>●</span><div><b>Mi ubicación</b><small>Florianópolis</small></div><em>⌄</em></div><button type="button" className="ugo-ref-circle ugo-ref-bell" aria-label="Actualizar radar" onClick={()=>setReloadKey(v=>v+1)} disabled={loading}>↻</button></header>
  {menuOpen&&<div className="ugo-client-menu-backdrop" onClick={()=>setMenuOpen(false)}><aside className="ugo-client-menu" onClick={e=>e.stopPropagation()}><div className="ugo-client-menu-head"><div className="ugo-client-menu-brand"><strong>UGO</strong><span>Cliente</span></div><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú">×</button></div><div className="ugo-client-menu-account"><span>C</span><div><b>Tu cuenta UGO</b><small>Todo lo que necesitás, en un lugar</small></div></div><nav className="ugo-client-menu-list"><button type="button" className="active" onClick={goHome}><span>⌂</span><div><b>Inicio</b><small>Volver al radar</small></div><em>›</em></button><button type="button" onClick={focusSearch}><span>⌕</span><div><b>Buscar profesional</b><small>Encontrá el servicio que necesitás</small></div><em>›</em></button><button type="button" onClick={openHugo}><span>✦</span><div><b>Hablar con Hugo</b><small>Pedí ayuda por voz</small></div><em>›</em></button></nav><div className="ugo-client-menu-tip"><span>✓</span><div><b>Profesionales verificados</b><small>UGO prioriza confianza, cercanía y reputación.</small></div></div><div className="ugo-client-menu-footer"><small>UGO Cliente</small><span>Servicios para una vida en movimiento.</span></div></aside></div>}
  <button type="button" className="ugo-ref-hugo" onClick={openHugo} aria-label="Hablar con Hugo"><span>⌣</span><small>Tocá para hablar</small></button>
  <aside className="ugo-home-panel ugo-ref-sheet"><div className="ugo-drawer-handle"/><label className="ugo-home-search ugo-ref-search"><span>⌕</span><input ref={searchInput} value={search} onChange={e=>setSearch(e.target.value)} placeholder="¿Qué servicio necesitás?"/></label><div className="ugo-category-row ugo-ref-categories">{categories.slice(0,5).map(c=><button type="button" key={c.id} className={selectedCategoryId===c.id?'active':''} onClick={()=>onCategorySelect(selectedCategoryId===c.id?'':c.id)}><b>{c.emoji||'•'}</b><span>{c.nombre}</span></button>)}</div><div className="ugo-featured-head ugo-ref-feature-title"><div><small>PROFESIONALES CERCA</small><h2>{selectedCategoryId?'Disponibles ahora':'Recomendados'}</h2></div><button type="button" onClick={()=>setDrawer(true)}>Ver todos</button></div>{locationNotice&&<button type="button" className="ugo-home-empty" onClick={()=>setReloadKey(v=>v+1)}>{locationNotice} Reintentar ubicación</button>}<div className="ugo-featured-grid ugo-ref-featured">{loading?<div className="ugo-home-empty" aria-busy="true">Actualizando profesionales cercanos…</div>:loadError?<button type="button" className="ugo-home-empty" onClick={()=>setReloadKey(v=>v+1)}>No pudimos cargar el radar. Reintentar</button>:featured.length===0?<div className="ugo-home-empty">No hay profesionales disponibles para este filtro.</div>:featured.map(p=><button type="button" key={p.id} className="ugo-feature-card" onClick={()=>pickProvider(p)}><span className="ugo-feature-avatar">{p.foto_url?<img src={p.foto_url} alt=""/>:(p.nombre?.[0]||'P').toUpperCase()}</span><span className="ugo-feature-copy"><b>{p.nombre||'Profesional UGO'}</b><small>{p.categoria_emoji} {p.categoria_nombre||'Especialista'}</small><em>★ {Number(p.karma||5).toFixed(1)} · {p.servicios_completados||0} servicios</em><strong>R$ {Number(p.tarifa_base||0).toFixed(0)} / hora</strong></span>{etaByProvider[p.id]&&<span className="ugo-feature-eta">{etaLabel(etaByProvider[p.id])}</span>}</button>)}</div></aside>
  <nav className="ugo-mobile-nav ugo-ref-nav"><button className="active" type="button" onClick={goHome}><b>⌂</b><span>Inicio</span></button><button type="button" onClick={focusSearch}><b>⌕</b><span>Buscar</span></button><button type="button" className="ugo-ref-nav-hugo" onClick={openHugo}><b>✦</b><span>Hugo</span></button><button type="button" onClick={()=>setMenuOpen(true)}><b>☰</b><span>Menú</span></button></nav>
  {drawer&&<div className="ugo-drawer-backdrop ugo-ref-backdrop" onClick={closeDrawer}><div className="ugo-provider-drawer ugo-ref-provider-sheet" onClick={e=>e.stopPropagation()}><div className="ugo-drawer-handle"/><div className="ugo-drawer-title-row"><div><small>{selectedProvider?'PROVEEDOR SELECCIONADO':'PROFESIONALES'}</small><h2>{selectedProvider?'Revisá los detalles':'Elegí con confianza'}</h2></div><button type="button" onClick={closeDrawer}>×</button></div>{!selectedProvider&&<div className="ugo-provider-list">{filtered.length===0&&<p className="ugo-empty">No hay profesionales disponibles para esta categoría.</p>}{filtered.map(p=><button type="button" key={p.id} className="ugo-provider-card" onClick={()=>setSelected(p.id)}><span className="ugo-card-avatar">{p.foto_url?<img src={p.foto_url} alt=""/>:(p.nombre?.[0]||'P').toUpperCase()}</span><span className="ugo-card-main"><b>{p.nombre||'Profesional UGO'}</b><small>{p.categoria_nombre||'Especialista'}</small><em><span className={p.online&&p.disponible?'available':'offline'}>{p.online&&p.disponible?'Disponible ahora':'No disponible'}</span>{etaByProvider[p.id]?` · ${etaLabel(etaByProvider[p.id])}`:''} · ★ {Number(p.karma||5).toFixed(1)}</em></span><strong>R$ {Number(p.tarifa_base||0).toFixed(0)}/h</strong></button>)}</div>}{selectedProvider&&<div className="ugo-provider-full-profile ugo-ref-profile"><div className="ugo-ref-profile-head"><span className="ugo-card-avatar">{selectedProvider.foto_url?<img src={selectedProvider.foto_url} alt=""/>:(selectedProvider.nombre?.[0]||'P').toUpperCase()}</span><div><h3>{selectedProvider.nombre}</h3><p><b>★ {Number(selectedProvider.karma||5).toFixed(1)}</b> · {selectedProvider.servicios_completados||0} servicios</p></div><strong>R$ {Number(selectedProvider.tarifa_base||0).toFixed(0)} <small>/ hora</small></strong></div><div className="ugo-ref-badges"><span>✓ Verificado</span><span>◈ Seguro</span>{selectedProvider.experiencia_anos!=null&&<span>◷ {selectedProvider.experiencia_anos}+ años</span>}</div><p className="ugo-ref-bio">{selectedProvider.bio||`Especialista en ${selectedProvider.especialidades||selectedProvider.categoria_nombre||'servicios para el hogar'}.`}</p><div className="ugo-provider-facts">{etaByProvider[selectedProvider.id]&&<span>🚗 Llegada: {etaLabel(etaByProvider[selectedProvider.id])}</span>}<span>🧰 {selectedProvider.especialidades||selectedProvider.categoria_nombre||'Especialista'}</span><span>📍 {selectedProvider.ciudad_base||selectedProvider.zona||'Florianópolis'}</span><span>🗣 {selectedProvider.idiomas||'Idiomas no informados'}</span></div><button type="button" className="ugo-hire-button" onClick={()=>{onProviderPick(selectedProvider);setDrawer(false)}}>Contratar</button><button type="button" className="ugo-ref-back-list" onClick={()=>setSelected(null)}>← Ver otros profesionales</button></div>}</div></div>}
 </section>
}
