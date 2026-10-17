import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import type * as maplibregl from'maplibre-gl'
import{loadMaplibre}from'../../../lib/maplibreLoader'
import{useRoleSession,type Category}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'
import{UGO_UI_EVENTS}from'../../../mvp/uiEvents'
import{refreshProviderRadar,subscribeProviderRadar,type ProviderRadarRow}from'../radar/providerRadarStore'
import{retryOwnedClientMatching}from'../services/clientActionService'
import{SkeletonCard}from'../../../shared/ux'
import{UserProfileAvatar}from'../../../mvp/UserProfileAvatar'
import{ClientActiveMap}from'../order/ClientActiveMap'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
const norm=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const CORE=[['limpieza','Limpieza','🧹','Hogar y oficinas'],['repar','Reparaciones','🔧','Hogar en general'],['electric','Electricidad','⚡','Instalaciones y reparaciones'],['plomer','Plomería','🚰','Instalaciones y reparaciones']] as const
const ACTIVE_STATES=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
const STATE_LABEL:Record<string,string>={buscando:'Buscando profesional',ofrecido:'Buscando profesional',asignado:'Profesional asignado',en_camino:'El profesional está yendo',llegado:'El profesional llegó',en_progreso:'Trabajo en curso',esperando_aprobacion:'Esperando tu validación'}
const ORDER_STAGES=[['asignado','Asignado'],['en_camino','En camino'],['en_progreso','En curso'],['esperando_aprobacion','Cierre']] as const
/** Pasos completados del pedido activo, para que el cliente vea dónde está sin abrir el detalle. */
const orderStage=(estado:string)=>estado==='esperando_aprobacion'?4:estado==='en_progreso'?3:['en_camino','llegado'].includes(estado)?2:estado==='asignado'?1:0
type ActiveOrder={id:string;numero:number|null;estado:string;created_at:string|null;matching_expires_at:string|null;programado_para:string|null;proveedor_id:string|null;proveedor:{nombre?:string|null}|null;categoria:{nombre?:string|null;emoji?:string|null}|null}
type LastService={id:string;descripcion:string|null;categoria:{nombre?:string|null;emoji?:string|null;slug?:string|null}|null}
const formatCountdown=(ms:number)=>{const total=Math.max(0,Math.ceil(ms/1000)),minutes=Math.floor(total/60),seconds=total%60;return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
type ClientPlace={barrio?:string|null;ciudad?:string|null}
type Props={onOpenService?:(serviceId:string)=>void}

export function ClientHomeScreen({onOpenService}:Props){
 const flow=useClientFlow(),{supabase,session,profile}=useRoleSession('client'),{navigate:flowNavigate}=flow
 const[categories,setCategories]=useState<Category[]>([]),[orders,setOrders]=useState<ActiveOrder[]>([]),[showAll,setShowAll]=useState(false)
 const[categoriesLoading,setCategoriesLoading]=useState(true),[ordersLoading,setOrdersLoading]=useState(true),[homeEpoch,setHomeEpoch]=useState(0),[lastService,setLastService]=useState<LastService|null>(null)
 const[place,setPlace]=useState('Florianópolis'),[providers,setProviders]=useState<ProviderRadarRow[]>([]),[radarError,setRadarError]=useState(''),[userPos,setUserPos]=useState<[number,number]>(FLORIPA),[locating,setLocating]=useState(false),[channelEpoch,setChannelEpoch]=useState(0),[now,setNow]=useState(()=>Date.now()),[retryingId,setRetryingId]=useState<string|null>(null)
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),userMarkerRef=useRef<maplibregl.Marker|null>(null),providerMarkersRef=useRef<maplibregl.Marker[]>([])
 const[mapReady,setMapReady]=useState(false)

 const loadOrders=useCallback(async()=>{if(!session){setOrders([]);setOrdersLoading(false);return}try{const{data}=await supabase.from('servicios').select('id,numero,estado,created_at,matching_expires_at,programado_para,proveedor_id,proveedor:usuarios!servicios_proveedor_id_fkey(nombre),categoria:categorias(nombre,emoji)').eq('cliente_id',session.user.id).in('estado',ACTIVE_STATES).order('created_at',{ascending:false}).limit(3);const next=(data||[])as unknown as ActiveOrder[];setOrders(next)}finally{setOrdersLoading(false)}},[session,supabase])
 useEffect(()=>{if(!session)return;let alive=true;void Promise.all([supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre'),supabase.from('perfiles_cliente').select('barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle()]).then(([cats,client])=>{if(!alive)return;setCategories((cats.data||[])as Category[]);const p=(client.data||null)as ClientPlace|null;const next=[p?.barrio,p?.ciudad].filter(Boolean).join(' · ');if(next)setPlace(next)}).finally(()=>{if(alive)setCategoriesLoading(false)});return()=>{alive=false}},[session,supabase,homeEpoch])
 useEffect(()=>{const showCategories=()=>{setShowAll(true);document.getElementById('ugo-client-services')?.scrollIntoView({behavior:'smooth',block:'start'})};window.addEventListener(UGO_UI_EVENTS.clientShowCategories,showCategories);return()=>{window.removeEventListener(UGO_UI_EVENTS.clientShowCategories,showCategories)}},[])
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
  // Realtime can be delayed on Pages/mobile: reconcile the active order with Supabase.
  const poll=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)sync()},10_000)
  const ch=supabase.channel(`client-home-orders-${session.user.id}-${channelEpoch}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:`cliente_id=eq.${session.user.id}`},sync).subscribe(status=>{if(status==='SUBSCRIBED'){sync();return}if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){sync();reconnect()}})
  return()=>{alive=false;window.clearInterval(poll);if(reconnectTimer)window.clearTimeout(reconnectTimer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}
 },[channelEpoch,loadOrders,session,supabase])
 useEffect(()=>{if(!orders.some(order=>!order.proveedor_id&&['buscando','ofrecido'].includes(order.estado)))return;setNow(Date.now());const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[orders])
 useEffect(()=>{if(!session)return;const unsubscribe=subscribeProviderRadar(snapshot=>{setProviders(snapshot.providers);setRadarError(snapshot.error||'')});void refreshProviderRadar(supabase,true).catch(()=>{});return()=>{unsubscribe()}},[session,supabase])
 const locateUser=useCallback(()=>{if(!session||!navigator.geolocation){setRadarError('Activá la ubicación del navegador para centrar el mapa donde estás.');return}setLocating(true);navigator.geolocation.getCurrentPosition(async pos=>{const next:[number,number]=[pos.coords.longitude,pos.coords.latitude];setUserPos(next);setRadarError('');try{sessionStorage.setItem('ugo:last-client-location',JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude,at:Date.now()}));await Promise.all([(supabase as any).from('perfiles_cliente').update({ubicacion:`POINT(${pos.coords.longitude} ${pos.coords.latitude})`}).eq('usuario_id',session.user.id),(supabase as any).from('usuarios').update({lat:pos.coords.latitude,lng:pos.coords.longitude}).eq('id',session.user.id)]);const response=await fetch(`https://photon.komoot.io/reverse?lat=${encodeURIComponent(pos.coords.latitude)}&lon=${encodeURIComponent(pos.coords.longitude)}`);const data=await response.json() as {features?:Array<{properties?:Record<string,string>}>};const p=data.features?.[0]?.properties||{},label=[p.district||p.locality,p.city].filter(Boolean).join(' · ');if(label)setPlace(label)}catch(error){console.warn('[ClientHome] current location enrichment failed',error)}finally{setLocating(false)}},()=>{setLocating(false);try{const cached=JSON.parse(sessionStorage.getItem('ugo:last-client-location')||'null') as {latitude?:number;longitude?:number}|null;if(Number.isFinite(cached?.latitude)&&Number.isFinite(cached?.longitude)){setUserPos([Number(cached!.longitude),Number(cached!.latitude)]);setRadarError('Mostrando tu última ubicación conocida. Tocá “Mi ubicación” para actualizarla.');return}}catch{/* vacío intencional */}setRadarError('No pudimos acceder a tu ubicación. Tocá “Mi ubicación” y permití el acceso del navegador.')},{enableHighAccuracy:true,timeout:12000,maximumAge:15000})},[session,supabase])
 useEffect(()=>{if(!session)return;locateUser()},[locateUser,session])

 const trackedOrder=orders.find(order=>Boolean(order.proveedor_id)&&['en_camino','asignado'].includes(order.estado))||null
 const onlineProviders=useMemo(()=>providers.filter(provider=>Boolean(provider.online&&provider.disponible&&Number.isFinite(Number(provider.lat))&&Number.isFinite(Number(provider.lng)))).slice(0,24),[providers])
 useEffect(()=>{
  if(!session)return
  let alive=true
  void supabase.from('servicios').select('id,descripcion,categoria:categorias(nombre,emoji,slug)').eq('cliente_id',session.user.id).eq('estado','completado').order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>{if(alive&&data)setLastService(data as unknown as LastService)})
  return()=>{alive=false}
 },[session,supabase,homeEpoch])
 useEffect(()=>{if(!session||trackedOrder||!mapEl.current||mapRef.current)return;let alive=true;const fail=()=>setRadarError('El mapa no pudo cargarse. Podés pedir el servicio igual.');void loadMaplibre().then(maplibregl=>{if(!alive||!mapEl.current||mapRef.current)return;try{const map=new maplibregl.Map({container:mapEl.current,style:(import.meta.env.VITE_MAP_STYLE_URL as string|undefined)||MAP_STYLE,center:userPos,zoom:13.1,attributionControl:false,interactive:true});mapRef.current=map;map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');map.once('load',()=>map.resize());const user=document.createElement('div');user.className='ugo-home-user-marker';userMarkerRef.current=new maplibregl.Marker({element:user}).setLngLat(userPos).addTo(map);setMapReady(true)}catch(error){console.warn('[ClientHome] map init failed',error);fail()}}).catch(error=>{console.warn('[ClientHome] maplibre load failed',error);if(alive)fail()});return()=>{alive=false;setMapReady(false);providerMarkersRef.current.forEach(marker=>marker.remove());providerMarkersRef.current=[];userMarkerRef.current?.remove();userMarkerRef.current=null;mapRef.current?.remove();mapRef.current=null}},[session,trackedOrder?.id])
 useEffect(()=>{const map=mapRef.current;if(!map||!mapReady)return;userMarkerRef.current?.setLngLat(userPos);map.easeTo({center:userPos,zoom:13.1,duration:450})},[userPos,mapReady])
 useEffect(()=>{const map=mapRef.current;if(!map||!mapReady)return;let alive=true;providerMarkersRef.current.forEach(marker=>marker.remove());providerMarkersRef.current=[];void loadMaplibre().then(maplibregl=>{if(!alive||mapRef.current!==map)return;for(const provider of onlineProviders){const node=document.createElement('div');node.className='ugo-home-provider-marker';node.title=provider.nombre||'Profesional UGO';providerMarkersRef.current.push(new maplibregl.Marker({element:node}).setLngLat([Number(provider.lng),Number(provider.lat)]).addTo(map))}}).catch(error=>console.warn('[ClientHome] provider markers load failed',error));return()=>{alive=false}},[onlineProviders,mapReady])

 const cards=useMemo(()=>CORE.map(([key,label,emoji,sub])=>({key,label,emoji,sub,category:categories.find(c=>norm(`${c.slug} ${c.nombre}`).includes(key))||null})),[categories])
 const choose=(category:Category|null)=>{if(!category)return;flow.publishHugoIntent({text:`Necesito ${category.nombre}`,categoryHint:category.slug||category.id,urgent:false,description:null})}
 const openOrder=useCallback((serviceId:string)=>{if(onOpenService){onOpenService(serviceId);return}flowNavigate('history')},[flowNavigate,onOpenService])
 const retryOrder=useCallback(async(serviceId:string)=>{if(retryingId||!session)return;setRetryingId(serviceId);try{const ok=await retryOwnedClientMatching(supabase,session.user.id,serviceId);if(!ok)throw new Error('Este pedido ya cambió de estado.');await loadOrders()}catch(error){console.warn('[ClientHome] matching retry failed',error);openOrder(serviceId)}finally{setRetryingId(null)}},[loadOrders,openOrder,retryingId,session,supabase])
 const firstName=String(profile?.nombre||'').trim().split(/\s+/)[0]||'Hola'
 if(!session)return null

 return <main className="ugo-home-screen" aria-label="Inicio UGO Cliente">
  <section className="ugo-home-layout">
   <div className="ugo-home-hero">
    <div className="ugo-home-topline">
     <button type="button" className="ugo-home-location" onClick={locateUser} disabled={locating} aria-label="Actualizar mi ubicación"><span>⌖</span><div><small>TU ZONA</small><strong>{place}</strong></div><b>{locating?'Ubicando…':'Actualizar'}</b></button>
     <button type="button" className="ugo-home-bell" onClick={()=>document.querySelector<HTMLButtonElement>('.ugo-notification-center.role-client .ugo-notification-trigger')?.click()} aria-label="Notificaciones">◇</button>
    </div>
    <span className="ugo-home-kicker"><i/> UGO CERCA TUYO</span>
    <h1 data-ux-screen-heading tabIndex={-1}>{firstName==='Hola'?'¿Qué necesitás hoy?':`Hola, ${firstName}.\n¿Qué necesitás hoy?`}</h1>
    <p>Elegí el servicio que necesitás. Buscamos profesionales verificados cerca tuyo.</p>
    {ordersLoading&&orders.length===0&&<div className="ugo-home-active-orders is-loading" aria-hidden="true"><SkeletonCard lines={2} className="ugo-home-order-skeleton"/></div>}
    {orders.length>0&&<div className="ugo-home-active-orders" aria-label="Pedidos activos">{orders.map(order=>{const matching=['buscando','ofrecido'].includes(order.estado)&&!order.proveedor_id,parsedDeadline=order.matching_expires_at?new Date(order.matching_expires_at).getTime():NaN,deadline=Number.isFinite(parsedDeadline)?parsedDeadline:null,remaining=deadline===null?0:Math.max(0,deadline-now),missingDeadline=matching&&deadline===null,expired=matching&&(missingDeadline||remaining<=0);const scheduledLabel=order.programado_para?new Date(order.programado_para).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}):null,stage=orderStage(order.estado);return <button type="button" key={order.id} className={order.proveedor_id?'is-assigned':'is-searching'} disabled={expired&&retryingId===order.id} onClick={()=>{if(expired){void retryOrder(order.id);return}openOrder(order.id)}}><span className="ugo-home-order-icon">{order.proveedor_id?'✓':'⌁'}</span><span className="ugo-home-order-copy"><small>PEDIDO #{order.numero??String(order.id).slice(0,8)}</small><b>{order.proveedor_id?'Profesional asignado':scheduledLabel?`Programado · ${scheduledLabel}`:expired?'No encontramos un profesional disponible':matching&&deadline!==null?`Buscando profesional · ${formatCountdown(remaining)}`:(STATE_LABEL[order.estado]||'Pedido activo')}</b><strong>{order.proveedor_id?(order.proveedor?.nombre||'Profesional UGO'):(order.categoria?.nombre||'UGO está buscando')}</strong><span className="ugo-home-order-steps" aria-hidden="true">{ORDER_STAGES.map(([state,label],index)=><i key={state} className={index<stage?'is-done':undefined} title={label}/>)}</span><em>{expired?(retryingId===order.id?'Reintentando…':'Reintentar pedido →'):`${order.categoria?.emoji||'🧰'} ${order.categoria?.nombre||'Servicio'} · Abrir pedido →`}</em></span></button>})}</div>}
    <button type="button" className="ugo-home-hugo-cta" onClick={()=>flow.navigate('request')}><span className="ugo-home-search-icon" aria-hidden="true">＋</span><span className="ugo-home-search-copy"><strong>Pedir un servicio</strong><small>Contanos qué necesitás y encontramos un profesional.</small></span><b aria-hidden="true">→</b></button>
    {lastService&&<button type="button" className="ugo-home-repeat" aria-label="Iniciar otro pedido con los datos del último servicio" onClick={()=>flow.publishHugoIntent({text:`Necesito ${lastService.categoria?.nombre||'el mismo servicio'} otra vez`,categoryHint:lastService.categoria?.slug||lastService.categoria?.nombre||null,urgent:false,description:lastService.descripcion||null})}><span aria-hidden="true">↻</span><div><strong>Volver a pedir {lastService.categoria?.nombre||'este servicio'}</strong><small>{lastService.descripcion?lastService.descripcion.slice(0,70):'Usamos los mismos datos del pedido anterior.'}</small></div><b aria-hidden="true">→</b></button>}
   </div>

   <aside className="ugo-home-map-card" aria-label="Mapa de profesionales cerca">
    <header><div><span className="ugo-home-live-dot"/><strong>{trackedOrder?'Seguimiento de tu profesional':'Mapa en vivo'}</strong><small>{trackedOrder?`Pedido #${trackedOrder.numero??trackedOrder.id.slice(0,8)} · ${trackedOrder.estado==='en_camino'?'En camino':'Asignado'}`:'Profesionales cerca de tu zona'}</small></div><b>{trackedOrder?'Pedido activo':`${onlineProviders.length} conectados`}</b></header>
    {trackedOrder&&<div className="ugo-home-route-banner"><strong>{trackedOrder.proveedor?.nombre||'Tu profesional'}</strong><span>{trackedOrder.estado==='en_camino'?'Viene hacia tu dirección · seguimiento en vivo':'Profesional asignado · esperando inicio del viaje'}</span><button type="button" onClick={()=>openOrder(trackedOrder.id)}>Abrir pedido →</button></div>}
    {trackedOrder?<div className="ugo-home-route-view"><ClientActiveMap key={trackedOrder.id} supabase={supabase} serviceId={trackedOrder.id} phase={trackedOrder.estado==='en_camino'?'en_camino':'assigned'}/></div>:<div className="ugo-home-map">
     <div ref={mapEl}/>
     <div className="ugo-home-map-shade"/>
     <div className="ugo-home-map-label"><span>⌖</span><div><b>Tu ubicación</b><small>{place}</small></div></div><button type="button" className="ugo-home-map-recenter" onClick={locateUser} disabled={locating}>{locating?'Ubicando…':'⌖ Mi ubicación'}</button>
     {radarError&&<div className="ugo-home-map-warning">Mapa temporalmente limitado · el pedido sigue disponible</div>}
    </div>
    <footer><div><strong>{trackedOrder?'Seguí la llegada del profesional':onlineProviders.length>0?`${onlineProviders.length} profesionales conectados cerca`:'Consultando profesionales cercanos'}</strong><small>{trackedOrder?'El mapa muestra únicamente la ubicación que comparte el proveedor.':'La disponibilidad se confirma al crear el pedido.'}</small></div><button type="button" onClick={()=>trackedOrder?openOrder(trackedOrder.id):flow.navigate('request')}>{trackedOrder?'Ver detalles':'Pedir servicio'} <span>→</span></button></footer>
    {!trackedOrder&&onlineProviders.length>0&&<section className="ugo-home-nearby" aria-label="Profesionales disponibles"><div className="ugo-home-nearby-head"><div><strong>Profesionales cerca de vos</strong><small>La disponibilidad se confirma al solicitar el servicio.</small></div><span>{onlineProviders.length} conectados</span></div><div className="ugo-home-provider-list">{onlineProviders.slice(0,3).map(provider=><article className="ugo-home-provider-card" key={provider.id}><UserProfileAvatar name={provider.nombre||'Profesional UGO'} role="provider" photoUrl={provider.foto_url} size={44} className="ugo-home-provider-avatar"/><div className="ugo-home-provider-info"><strong>{provider.nombre||'Profesional UGO'}</strong><small>{provider.categoria_emoji||'🧰'} {provider.categoria_nombre||'Servicios para el hogar'}</small><div className="ugo-home-provider-meta"><span className="ugo-home-verified">✓ Verificado</span>{provider.karma!==null&&provider.karma!==undefined&&Number(provider.karma)>0&&<span className="ugo-home-provider-rating">★ {Number(provider.karma).toFixed(1)}</span>}{provider.servicios_completados!==null&&provider.servicios_completados!==undefined&&<span>{provider.servicios_completados} servicios</span>}</div></div><span className="ugo-home-available"><i/>Conectado</span></article>)}</div></section>}
   </aside>

   <div className="ugo-home-services" id="ugo-client-services">
    <div className="ugo-home-services-head"><div><span>SERVICIOS</span><h2>Elegí una categoría</h2></div><button type="button" onClick={()=>setShowAll(v=>!v)}>{showAll?'Ver menos':'Ver todas'} <span>{showAll?'↑':'→'}</span></button></div>
    {categoriesLoading&&categories.length===0?<div className="ugo-home-categories is-loading" aria-hidden="true">{Array.from({length:4},(_,index)=><SkeletonCard key={index} lines={1} action={false} className="ugo-home-category-skeleton"/>)}</div>:categories.length===0?<div className="ugo-home-categories-empty" role="status"><strong>No pudimos cargar los servicios</strong><small>Revisá tu conexión y volvé a intentar. Tu pedido activo no se pierde.</small><button type="button" onClick={()=>{setCategoriesLoading(true);setHomeEpoch(value=>value+1)}}>Reintentar</button></div>:<div className="ugo-home-categories">{cards.map(({key,label,emoji,sub,category})=><button type="button" key={key} disabled={!category} onClick={()=>choose(category)}><span className="ugo-home-category-icon">{category?.emoji||emoji}</span><div><b>{label}</b><small>{sub}</small></div><em>→</em></button>)}</div>}
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
