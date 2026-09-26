import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import * as maplibregl from'maplibre-gl'
import'maplibre-gl/dist/maplibre-gl.css'
import{useRoleSession,type Category}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'
import{UGO_UI_EVENTS,emitUgoUiEvent}from'../../../mvp/uiEvents'
import{refreshProviderRadar,subscribeProviderRadar,type ProviderRadarRow}from'../radar/providerRadarStore'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
const norm=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const CORE=[['limpieza','Limpieza','🧹','Hogar y oficinas'],['repar','Reparaciones','🔧','Hogar en general'],['electric','Electricidad','⚡','Instalaciones y reparaciones'],['plomer','Plomería','🚰','Instalaciones y reparaciones']] as const
const ACTIVE_STATES=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
const STATE_LABEL:Record<string,string>={buscando:'Buscando profesional',ofrecido:'Buscando profesional',asignado:'Profesional asignado',en_camino:'El profesional está yendo',llegado:'El profesional llegó',en_progreso:'Trabajo en curso',esperando_aprobacion:'Esperando tu validación'}
type ActiveOrder={id:string;numero:number|null;estado:string;created_at:string|null;proveedor_id:string|null;proveedor:{nombre?:string|null}|null;categoria:{nombre?:string|null;emoji?:string|null}|null}
const MATCHING_WINDOW_MS=5*60*1000
const formatCountdown=(ms:number)=>{const total=Math.max(0,Math.ceil(ms/1000)),minutes=Math.floor(total/60),seconds=total%60;return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
type ClientPlace={barrio?:string|null;ciudad?:string|null}
type Props={onOpenService?:(serviceId:string)=>void}

export function ClientHomeScreen({onOpenService}:Props){
 const flow=useClientFlow(),{supabase,session,profile}=useRoleSession('client')
 const[categories,setCategories]=useState<Category[]>([]),[orders,setOrders]=useState<ActiveOrder[]>([]),[query,setQuery]=useState(''),[showAll,setShowAll]=useState(false)
 const[place,setPlace]=useState('Florianópolis'),[providers,setProviders]=useState<ProviderRadarRow[]>([]),[radarError,setRadarError]=useState(''),[userPos,setUserPos]=useState<[number,number]>(FLORIPA),[locating,setLocating]=useState(false),[channelEpoch,setChannelEpoch]=useState(0),[now,setNow]=useState(()=>Date.now())
 const searchRef=useRef<HTMLInputElement|null>(null),mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),userMarkerRef=useRef<maplibregl.Marker|null>(null),providerMarkersRef=useRef<maplibregl.Marker[]>([])

 const loadOrders=useCallback(async()=>{if(!session){setOrders([]);return}const{data}=await supabase.from('servicios').select('id,numero,estado,created_at,proveedor_id,proveedor:usuarios!servicios_proveedor_id_fkey(nombre),categoria:categorias(nombre,emoji)').eq('cliente_id',session.user.id).in('estado',ACTIVE_STATES).order('created_at',{ascending:false}).limit(3);setOrders((data||[])as unknown as ActiveOrder[])},[session,supabase])
 useEffect(()=>{if(!session)return;let alive=true;void Promise.all([supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),supabase.from('perfiles_cliente').select('barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle()]).then(([cats,client])=>{if(!alive)return;setCategories((cats.data||[])as Category[]);const p=(client.data||null)as ClientPlace|null;const next=[p?.barrio,p?.ciudad].filter(Boolean).join(' · ');if(next)setPlace(next)});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{const focusSearch=()=>{setShowAll(false);window.setTimeout(()=>searchRef.current?.focus(),0)},showCategories=()=>{setQuery('');setShowAll(true);window.setTimeout(()=>document.querySelector('.ugo-home-services')?.scrollIntoView({behavior:'smooth',block:'start'}),0)};window.addEventListener(UGO_UI_EVENTS.clientFocusServiceSearch,focusSearch);window.addEventListener(UGO_UI_EVENTS.clientShowCategories,showCategories);return()=>{window.removeEventListener(UGO_UI_EVENTS.clientFocusServiceSearch,focusSearch);window.removeEventListener(UGO_UI_EVENTS.clientShowCategories,showCategories)}},[])
 useEffect(()=>{
  if(!session)return
  let alive=true,reconnectTimer:number|undefined
  const sync=()=>{if(alive)void loadOrders()}
  const reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)}
  const onOnline=()=>{sync();reconnect()}
  const onVisibility=()=>{if(document.visibilityState==='visible')sync()}
  window.addEventListener('online',onOnline)
  document.addEventListener('visibilitychange',onVisibility)
  sync()
  const ch=supabase.channel(`client-home-orders-${session.user.id}-${channelEpoch}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`cliente_id=eq.${session.user.id}`},sync).subscribe(status=>{if(status==='SUBSCRIBED'){sync();return}if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){sync();reconnect()}})
  return()=>{alive=false;if(reconnectTimer)window.clearTimeout(reconnectTimer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}
 },[channelEpoch,loadOrders,session,supabase])
 useEffect(()=>{if(!orders.some(order=>!order.proveedor_id&&['buscando','ofrecido'].includes(order.estado)))return;setNow(Date.now());const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[orders])
 useEffect(()=>{if(!session)return;const unsubscribe=subscribeProviderRadar(snapshot=>{setProviders(snapshot.providers);setRadarError(snapshot.error||'')});void refreshProviderRadar(supabase,true).catch(()=>{});return()=>{unsubscribe()}},[session,supabase])
 const locateUser=useCallback(()=>{if(!session||!navigator.geolocation){setRadarError('Activá la ubicación del navegador para centrar el mapa donde estás.');return}setLocating(true);navigator.geolocation.getCurrentPosition(async pos=>{const next:[number,number]=[pos.coords.longitude,pos.coords.latitude];setUserPos(next);setRadarError('');try{sessionStorage.setItem('ugo:last-client-location',JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude,at:Date.now()}));await (supabase as any).from('perfiles_cliente').update({ubicacion:`POINT(${pos.coords.longitude} ${pos.coords.latitude})`}).eq('usuario_id',session.user.id);const response=await fetch(`https://photon.komoot.io/reverse?lat=${encodeURIComponent(pos.coords.latitude)}&lon=${encodeURIComponent(pos.coords.longitude)}`);const data=await response.json() as {features?:Array<{properties?:Record<string,string>}>};const p=data.features?.[0]?.properties||{},label=[p.district||p.locality,p.city].filter(Boolean).join(' · ');if(label)setPlace(label)}catch(error){console.warn('[ClientHome] current location enrichment failed',error)}finally{setLocating(false)}},()=>{setLocating(false);try{const cached=JSON.parse(sessionStorage.getItem('ugo:last-client-location')||'null') as {latitude?:number;longitude?:number}|null;if(Number.isFinite(cached?.latitude)&&Number.isFinite(cached?.longitude)){setUserPos([Number(cached!.longitude),Number(cached!.latitude)]);setRadarError('Mostrando tu última ubicación conocida. Tocá “Mi ubicación” para actualizarla.');return}}catch{}setRadarError('No pudimos acceder a tu ubicación. Tocá “Mi ubicación” y permití el acceso del navegador.')},{enableHighAccuracy:true,timeout:12000,maximumAge:15000})},[session,supabase])
 useEffect(()=>{if(!session)return;locateUser()},[locateUser,session])

 const onlineProviders=useMemo(()=>providers.filter(provider=>Boolean(provider.online&&provider.disponible&&Number.isFinite(Number(provider.lat))&&Number.isFinite(Number(provider.lng)))).slice(0,24),[providers])
 useEffect(()=>{if(!session||!mapEl.current||mapRef.current)return;try{const map=new maplibregl.Map({container:mapEl.current,style:MAP_STYLE,center:userPos,zoom:13.1,attributionControl:false,interactive:true});mapRef.current=map;map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');map.once('load',()=>map.resize());const user=document.createElement('div');user.className='ugo-home-user-marker';userMarkerRef.current=new maplibregl.Marker({element:user}).setLngLat(userPos).addTo(map)}catch(error){console.warn('[ClientHome] map init failed',error);setRadarError('El mapa no pudo cargarse. Podés pedir el servicio igual.')}return()=>{providerMarkersRef.current.forEach(marker=>marker.remove());providerMarkersRef.current=[];userMarkerRef.current?.remove();userMarkerRef.current=null;mapRef.current?.remove();mapRef.current=null}},[session])
 useEffect(()=>{const map=mapRef.current;if(!map)return;userMarkerRef.current?.setLngLat(userPos);map.easeTo({center:userPos,zoom:13.1,duration:450})},[userPos])
 useEffect(()=>{const map=mapRef.current;if(!map)return;providerMarkersRef.current.forEach(marker=>marker.remove());providerMarkersRef.current=[];for(const provider of onlineProviders){const node=document.createElement('div');node.className='ugo-home-provider-marker';node.title=provider.nombre||'Profesional UGO';providerMarkersRef.current.push(new maplibregl.Marker({element:node}).setLngLat([Number(provider.lng),Number(provider.lat)]).addTo(map))}},[onlineProviders])

 const cards=useMemo(()=>CORE.map(([key,label,emoji,sub])=>({key,label,emoji,sub,category:categories.find(c=>norm(`${c.slug} ${c.nombre}`).includes(key))||null})),[categories])
 const filtered=query.trim()?categories.filter(c=>norm(c.nombre).includes(norm(query.trim()))):[]
 const choose=(category:Category|null)=>{if(!category)return;flow.publishHugoIntent({text:`Necesito ${category.nombre}`,categoryHint:category.slug||category.id,urgent:false,description:null})}
 const openOrder=(serviceId:string)=>{if(onOpenService){onOpenService(serviceId);return}flow.navigate('history')}
 const firstName=String(profile?.nombre||'').trim().split(/\s+/)[0]||'Hola'
 if(!session)return null

 return <main className="ugo-home-screen" aria-label="Inicio UGO Cliente">
  <section className="ugo-home-layout">
   <div className="ugo-home-hero">
    <div className="ugo-home-topline">
     <button type="button" className="ugo-home-location" onClick={()=>emitUgoUiEvent(UGO_UI_EVENTS.clientLocation)} aria-label="Cambiar ubicación"><span>⌖</span><div><small>TU ZONA</small><strong>{place}</strong></div><b>Cambiar</b></button>
     <button type="button" className="ugo-home-bell" onClick={()=>document.querySelector<HTMLButtonElement>('.ugo-notification-center.role-client .ugo-notification-trigger')?.click()} aria-label="Notificaciones">◇</button>
    </div>
    <span className="ugo-home-kicker"><i/> UGO CERCA TUYO</span>
    <h1>{firstName==='Hola'?'¿Qué necesitás hoy?':`Hola, ${firstName}.\n¿Qué necesitás hoy?`}</h1>
    <p>Contale a Hugo qué necesitás o elegí una categoría. Buscamos profesionales verificados cerca tuyo.</p>
    {orders.length>0&&<div className="ugo-home-active-orders" aria-label="Pedidos activos">{orders.map(order=><button type="button" key={order.id} className={order.proveedor_id?'is-assigned':'is-searching'} onClick={()=>openOrder(order.id)}><span className="ugo-home-order-icon">{order.proveedor_id?'✓':'⌁'}</span><span className="ugo-home-order-copy"><small>PEDIDO #{order.numero??String(order.id).slice(0,8)}</small><b>{order.proveedor_id?'Profesional asignado':(['buscando','ofrecido'].includes(order.estado)&&order.created_at?`Buscando profesional · ${formatCountdown(Math.max(0,new Date(order.created_at).getTime()+MATCHING_WINDOW_MS-now))}`:(STATE_LABEL[order.estado]||'Pedido activo'))}</b><strong>{order.proveedor_id?(order.proveedor?.nombre||'Profesional UGO'):(order.categoria?.nombre||'UGO está buscando')}</strong><em>{order.categoria?.emoji||'🧰'} {order.categoria?.nombre||'Servicio'} · Abrir pedido →</em></span></button>)}</div>}
    <div className="ugo-home-search-wrap">
     <label className="ugo-home-search"><span>⌕</span><input ref={searchRef} value={query} onChange={e=>{setQuery(e.target.value);setShowAll(false)}} placeholder="¿Qué servicio necesitás?" aria-label="Buscar servicio"/>{query&&<button type="button" className="ugo-home-search-clear" aria-label="Limpiar búsqueda" onClick={e=>{e.preventDefault();setQuery('');setShowAll(false);window.setTimeout(()=>searchRef.current?.focus(),0)}}>×</button>}</label>
     {filtered.length>0&&<div className="ugo-home-results">{filtered.slice(0,8).map(c=><button type="button" key={c.id} onClick={()=>choose(c)}>{c.emoji||'🧰'} <span>{c.nombre}</span><b>→</b></button>)}</div>}
    </div>
    <button type="button" className="ugo-home-hugo-cta" onClick={()=>flow.navigate('request')}><span className="ugo-home-orb" aria-hidden="true">✦</span><span><strong>Pedíselo a Hugo</strong><small>Escribí o hablá. Hugo arma el pedido con vos.</small></span><b>→</b></button>
   </div>

   <aside className="ugo-home-map-card" aria-label="Mapa de profesionales cerca">
    <header><div><span className="ugo-home-live-dot"/><strong>Mapa en vivo</strong><small>Profesionales cerca de tu zona</small></div><b>{onlineProviders.length} online</b></header>
    <div className="ugo-home-map">
     <div ref={mapEl}/>
     <div className="ugo-home-map-shade"/>
     <div className="ugo-home-map-label"><span>⌖</span><div><b>Tu ubicación</b><small>{place}</small></div></div><button type="button" className="ugo-home-map-recenter" onClick={locateUser} disabled={locating}>{locating?'Ubicando…':'⌖ Mi ubicación'}</button>
     {radarError&&<div className="ugo-home-map-warning">Mapa temporalmente limitado · el pedido sigue disponible</div>}
    </div>
    <footer><div><strong>{onlineProviders.length>0?`${onlineProviders.length} profesionales disponibles ahora`:'Buscando profesionales disponibles'}</strong><small>La disponibilidad se confirma al crear el pedido.</small></div><button type="button" onClick={()=>flow.navigate('request')}>Pedir servicio <span>→</span></button></footer>
   </aside>

   <div className="ugo-home-services">
    <div className="ugo-home-services-head"><div><span>SERVICIOS</span><h2>Elegí una categoría</h2></div><button type="button" onClick={()=>setShowAll(v=>!v)}>{showAll?'Ver menos':'Ver todas'} <span>{showAll?'↑':'→'}</span></button></div>
    <div className="ugo-home-categories">{cards.map(({key,label,emoji,sub,category})=><button type="button" key={key} disabled={!category} onClick={()=>choose(category)}><span className="ugo-home-category-icon">{category?.emoji||emoji}</span><div><b>{label}</b><small>{sub}</small></div><em>→</em></button>)}</div>
    {showAll&&<div className="ugo-home-all-results" aria-label="Todas las categorías">{categories.map(c=><button type="button" key={c.id} onClick={()=>choose(c)}><span>{c.emoji||'🧰'}</span><strong>{c.nombre}</strong><b>→</b></button>)}</div>}
   </div>
   <nav className="ugo-home-mobile-nav" aria-label="Navegación principal">
    <button type="button" className="active" onClick={()=>flow.navigate('home')}><span>⌂</span><small>Inicio</small></button>
    <button type="button" onClick={()=>{setShowAll(true);window.setTimeout(()=>document.querySelector('.ugo-home-services')?.scrollIntoView({behavior:'smooth',block:'start'}),0)}}><span>▦</span><small>Servicios</small></button>
    <button type="button" onClick={()=>flow.navigate('history')}><span>◷</span><small>Actividad</small></button>
    <button type="button" onClick={()=>flow.navigate('profile')}><span>◉</span><small>Perfil</small></button>
   </nav>
  </section>
 </main>
}
export default ClientHomeScreen
