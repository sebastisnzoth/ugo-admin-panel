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
import{AssignedProviderCard}from'../order/AssignedProviderCard'
import{useLocale}from'../../../i18n/locale'

const FLORIPA:[number,number]=[-48.5482,-27.5949]
const MAP_STYLE:maplibregl.StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}
const norm=(v:string)=>v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const CORE=[['limpieza','Limpieza','🧹','Hogar y oficinas'],['repar','Reparaciones','🔧','Hogar en general'],['electric','Electricidad','⚡','Instalaciones y reparaciones'],['plomer','Plomería','🚰','Instalaciones y reparaciones']] as const
const CORE_TRANSLATIONS:Record<string,Record<string,[string,string]>>={
 'pt-BR':{limpieza:['Limpeza','Casas e escritórios'],repar:['Reparos','Serviços gerais para casa'],electric:['Eletricidade','Instalações e reparos'],plomer:['Encanamento','Instalações e reparos']},
 es:{limpieza:['Limpieza','Hogar y oficinas'],repar:['Reparaciones','Hogar en general'],electric:['Electricidad','Instalaciones y reparaciones'],plomer:['Plomería','Instalaciones y reparaciones']},
 en:{limpieza:['Cleaning','Homes and offices'],repar:['Repairs','General home repairs'],electric:['Electrical','Installation and repairs'],plomer:['Plumbing','Installation and repairs']}
}
const CATEGORY_TRANSLATIONS:Record<string,[string,string,string]>={
 limpieza:['Limpeza','Limpieza','Cleaning'],limpeza:['Limpeza','Limpieza','Cleaning'],faxina:['Faxina','Limpieza doméstica','Home cleaning'],
 reparaciones:['Reparos','Reparaciones','Repairs'],reparos:['Reparos','Reparaciones','Repairs'],electricidad:['Eletricidade','Electricidad','Electrical'],eletricidade:['Eletricidade','Electricidad','Electrical'],
 plomeria:['Encanamento','Plomería','Plumbing'],encanamento:['Encanamento','Plomería','Plumbing'],jardineria:['Jardinagem','Jardinería','Gardening'],jardinagem:['Jardinagem','Jardinería','Gardening'],
 pintura:['Pintura','Pintura','Painting'],montaje:['Montagem','Montaje','Assembly'],montagem:['Montagem','Montaje','Assembly'],mudanzas:['Mudanças','Mudanzas','Moving'],mudancas:['Mudanças','Mudanzas','Moving'],
 'marido de aluguel':['Marido de aluguel','Reparaciones del hogar','Handyman'],'aire acondicionado':['Ar-condicionado','Aire acondicionado','Air conditioning'],'ar condicionado':['Ar-condicionado','Aire acondicionado','Air conditioning']
}
const localizedCategory=(name:string|null|undefined,locale:string)=>{
 if(!name)return ''
 const key=norm(name).trim()
 const value=CATEGORY_TRANSLATIONS[key]
 return value?value[locale.startsWith('pt')?0:locale.startsWith('es')?1:2]:name
}
const ACTIVE_STATES=['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion']
const ORDER_STAGES=['asignado','en_camino','en_progreso','esperando_aprobacion'] as const
/** Pasos completados del pedido activo, para que el cliente vea dónde está sin abrir el detalle. */
const orderStage=(estado:string)=>estado==='esperando_aprobacion'?4:estado==='en_progreso'?3:['en_camino','llegado'].includes(estado)?2:estado==='asignado'?1:0
type ActiveOrder={id:string;numero:number|null;estado:string;created_at:string|null;matching_expires_at:string|null;programado_para:string|null;proveedor_id:string|null;proveedor:{nombre?:string|null;karma?:number|null;servicios_completados?:number|null;foto_url?:string|null}|null;categoria:{nombre?:string|null;emoji?:string|null}|null}
type LastService={id:string;descripcion:string|null;categoria:{nombre?:string|null;emoji?:string|null;slug?:string|null}|null}
const formatCountdown=(ms:number)=>{const total=Math.max(0,Math.ceil(ms/1000)),minutes=Math.floor(total/60),seconds=total%60;return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
type ClientPlace={barrio?:string|null;ciudad?:string|null}
type Props={onOpenService?:(serviceId:string)=>void}

export function ClientHomeScreen({onOpenService}:Props){
 const{t,locale}=useLocale()
 const flow=useClientFlow(),{supabase,session,profile}=useRoleSession('client'),{navigate:flowNavigate}=flow
 const[categories,setCategories]=useState<Category[]>([]),[orders,setOrders]=useState<ActiveOrder[]>([]),[showAll,setShowAll]=useState(false),[serviceSearch,setServiceSearch]=useState(''),[mapExpanded,setMapExpanded]=useState(false)
 const[categoriesLoading,setCategoriesLoading]=useState(true),[ordersLoading,setOrdersLoading]=useState(true),[homeEpoch,setHomeEpoch]=useState(0),[lastService,setLastService]=useState<LastService|null>(null)
 const[place,setPlace]=useState('Florianópolis'),[providers,setProviders]=useState<ProviderRadarRow[]>([]),[radarError,setRadarError]=useState(''),[userPos,setUserPos]=useState<[number,number]>(FLORIPA),[locating,setLocating]=useState(false),[channelEpoch,setChannelEpoch]=useState(0),[now,setNow]=useState(()=>Date.now()),[retryingId,setRetryingId]=useState<string|null>(null)
 const mapEl=useRef<HTMLDivElement|null>(null),mapRef=useRef<maplibregl.Map|null>(null),userMarkerRef=useRef<maplibregl.Marker|null>(null),providerMarkersRef=useRef<maplibregl.Marker[]>([])
 const[mapReady,setMapReady]=useState(false)

 const loadOrders=useCallback(async()=>{if(!session){setOrders([]);setOrdersLoading(false);return}try{const{data}=await supabase.from('servicios').select('id,numero,estado,created_at,matching_expires_at,programado_para,proveedor_id,proveedor:usuarios!servicios_proveedor_id_fkey(nombre,karma,servicios_completados,foto_url),categoria:categorias(nombre,emoji)').eq('cliente_id',session.user.id).in('estado',ACTIVE_STATES).order('created_at',{ascending:false}).limit(3);const next=(data||[])as unknown as ActiveOrder[];setOrders(next)}finally{setOrdersLoading(false)}},[session,supabase])
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
 useEffect(()=>{const map=mapRef.current;if(!map||!mapReady)return;let alive=true;providerMarkersRef.current.forEach(marker=>marker.remove());providerMarkersRef.current=[];void loadMaplibre().then(maplibregl=>{if(!alive||mapRef.current!==map)return;for(const provider of onlineProviders){const node=document.createElement('div');node.className='ugo-home-provider-marker';node.title=provider.nombre||t('clientHome.professional');providerMarkersRef.current.push(new maplibregl.Marker({element:node}).setLngLat([Number(provider.lng),Number(provider.lat)]).addTo(map))}}).catch(error=>console.warn('[ClientHome] provider markers load failed',error));return()=>{alive=false}},[onlineProviders,mapReady])

 const cards=useMemo(()=>CORE.map(([key,fallbackLabel,emoji,fallbackSub])=>({key,emoji,label:CORE_TRANSLATIONS[locale]?.[key]?.[0]||fallbackLabel,sub:CORE_TRANSLATIONS[locale]?.[key]?.[1]||fallbackSub,category:categories.find(c=>norm(`${c.slug} ${c.nombre}`).includes(key))||null})),[categories,locale])
 const matchingCategories=useMemo(()=>categories.filter(category=>norm(`${category.nombre} ${category.slug} ${localizedCategory(category.nombre,locale)}`).includes(norm(serviceSearch.trim()))),[categories,locale,serviceSearch])
 const searchLabel=locale.startsWith('pt')?'Buscar serviço ou categoria':locale.startsWith('es')?'Buscar servicio o categoría':'Search service or category'
 const mapLabel=locale.startsWith('pt')?'Ver mapa completo':locale.startsWith('es')?'Ver mapa completo':'View full map'
 const choose=(category:Category|null)=>{if(!category)return;flow.publishHugoIntent({text:`Necesito ${category.nombre}`,categoryHint:category.slug||category.id,urgent:false,description:null})}
 const openOrder=useCallback((serviceId:string)=>{if(onOpenService){onOpenService(serviceId);return}flowNavigate('history')},[flowNavigate,onOpenService])
 const retryOrder=useCallback(async(serviceId:string)=>{if(retryingId||!session)return;setRetryingId(serviceId);try{const ok=await retryOwnedClientMatching(supabase,session.user.id,serviceId);if(!ok)throw new Error('Este pedido ya cambió de estado.');await loadOrders()}catch(error){console.warn('[ClientHome] matching retry failed',error);openOrder(serviceId)}finally{setRetryingId(null)}},[loadOrders,openOrder,retryingId,session,supabase])
 const firstName=String(profile?.nombre||'').trim().split(/\s+/)[0]||'Hola'
 if(!session)return null

 return <main className="ugo-home-screen" aria-label={t('clientHome.home')}>
  <section className="ugo-home-layout">
   <div className="ugo-home-hero">
    <div className="ugo-home-topline">
     <button type="button" className="ugo-home-location" onClick={locateUser} disabled={locating} aria-label={t('clientHome.updateLocation')}><span>⌖</span><div><small>{t('clientHome.zone')}</small><strong>{place}</strong></div><b>{locating?t("uiCopy.short15"):t("screen.admin_native.7")}</b></button>
     <button type="button" className="ugo-home-bell" onClick={()=>document.querySelector<HTMLButtonElement>('.ugo-notification-center.role-client .ugo-notification-trigger')?.click()} aria-label={t('clientHome.notification')}>◇</button>
    </div>
    <span className="ugo-home-kicker"><i/> {t('clientHome.kicker')}</span>
    <h1 data-ux-screen-heading tabIndex={-1}>{firstName==='Hola'?t('home.question'):`${t('home.greeting').replace('{name}',firstName)}\n${t('home.question')}`}</h1>
    <p>{t('clientHome.intro')}</p>
    <div className="ugo-premium-search"><span aria-hidden="true">⌕</span><input type="search" value={serviceSearch} onChange={event=>{setServiceSearch(event.target.value);if(event.target.value.trim())setShowAll(true)}} placeholder={searchLabel} aria-label={searchLabel}/><button type="button" onClick={()=>{setShowAll(true);document.getElementById('ugo-client-services')?.scrollIntoView({behavior:'smooth',block:'start'})}} aria-label={t('clientHome.chooseCategory')}>→</button></div>
    {ordersLoading&&orders.length===0&&<div className="ugo-home-active-orders is-loading" aria-hidden="true"><SkeletonCard lines={2} className="ugo-home-order-skeleton"/></div>}
    {orders.length>0&&<div className="ugo-home-active-orders" aria-label={t('clientHome.activeOrders')}>{orders.map(order=>{const matching=['buscando','ofrecido'].includes(order.estado)&&!order.proveedor_id,parsedDeadline=order.matching_expires_at?new Date(order.matching_expires_at).getTime():NaN,deadline=Number.isFinite(parsedDeadline)?parsedDeadline:null,remaining=deadline===null?0:Math.max(0,deadline-now),missingDeadline=matching&&deadline===null,expired=matching&&(missingDeadline||remaining<=0);const scheduledLabel=order.programado_para?new Date(order.programado_para).toLocaleString(locale,{dateStyle:'short',timeStyle:'short'}):null,stage=orderStage(order.estado);return <button type="button" key={order.id} className={order.proveedor_id?'is-assigned':'is-searching'} disabled={expired&&retryingId===order.id} onClick={()=>{if(expired){void retryOrder(order.id);return}openOrder(order.id)}}><span className="ugo-home-order-icon">{order.proveedor_id?'✓':'⌁'}</span><span className="ugo-home-order-copy"><small>{t('clientHome.orderNumber')}{order.numero??String(order.id).slice(0,8)}</small><b>{order.proveedor_id?t('status.asignado'):scheduledLabel?`${t('clientHome.scheduled')} · ${scheduledLabel}`:expired?t('clientHome.notFound'):matching&&deadline!==null?`${t('status.buscando')} · ${formatCountdown(remaining)}`:t('status.'+order.estado)===('status.'+order.estado)?t('clientHome.activeOrder'):t('status.'+order.estado)}</b><strong>{order.proveedor_id?(order.proveedor?.nombre||t('clientHome.professional')):(order.categoria?.nombre||t('clientHome.searching'))}</strong><span className="ugo-home-order-steps" aria-hidden="true">{ORDER_STAGES.map((state,index)=><i key={state} className={index<stage?'is-done':undefined} title={t('status.'+state)}/>)}</span><em>{expired?(retryingId===order.id?t('clientHome.retrying'):t('clientHome.retryOrder')):`${order.categoria?.emoji||'🧰'} ${order.categoria?.nombre||t('clientHome.service')} · ${t('clientHome.openOrder')}`}</em></span></button>})}</div>}
    <button type="button" className="ugo-home-hugo-cta" onClick={()=>flow.navigate('request')}><span className="ugo-home-search-icon" aria-hidden="true">＋</span><span className="ugo-home-search-copy"><strong>{t('home.request')}</strong><small>{t('home.requestHelp')}</small></span><b aria-hidden="true">→</b></button>
    {lastService&&<button type="button" className="ugo-home-repeat" aria-label={t('clientHome.repeatAria')} onClick={()=>flow.publishHugoIntent({text:`Necesito ${lastService.categoria?.nombre||t('clientHome.repeatFallback')} otra vez`,categoryHint:lastService.categoria?.slug||lastService.categoria?.nombre||null,urgent:false,description:lastService.descripcion||null})}><span aria-hidden="true">↻</span><div><strong>{t('clientHome.repeat')}{localizedCategory(lastService.categoria?.nombre,locale)||t('clientHome.repeatFallback')}</strong><small>{lastService.descripcion?lastService.descripcion.slice(0,70):t('clientHome.repeatHelp')}</small></div><b aria-hidden="true">→</b></button>}
   </div>

   <aside className={`ugo-home-map-card${mapExpanded?' ugo-premium-map-expanded':''}`} id="ugo-client-map" aria-label={t('clientHome.map')}>
    <button type="button" className="ugo-premium-map-toggle" onClick={()=>setMapExpanded(expanded=>!expanded)} aria-expanded={mapExpanded}>{mapExpanded?(locale.startsWith('pt')?'Recolher mapa':locale.startsWith('es')?'Reducir mapa':'Collapse map'):mapLabel} <span aria-hidden="true">↗</span></button>
    <header><div><span className="ugo-home-live-dot"/><strong>{trackedOrder?t('home.tracking'):t('home.live')}</strong><small>{trackedOrder?`Pedido #${trackedOrder.numero??trackedOrder.id.slice(0,8)} · ${trackedOrder.estado==='en_camino'?t('status.en_camino'):t('status.asignado')}` :t('home.near')}</small></div><b>{trackedOrder?t('clientHome.activeOrder'):`${onlineProviders.length} ${t('clientHome.connected')}`}</b></header>
    {trackedOrder&&<AssignedProviderCard compact provider={trackedOrder.proveedor} providerId={trackedOrder.proveedor_id} category={trackedOrder.categoria?.nombre} onOpen={()=>openOrder(trackedOrder.id)}/>}
    {trackedOrder&&<div className="ugo-home-route-banner"><strong>{trackedOrder.proveedor?.nombre||t("uiCopy.expression45")}</strong><span>{trackedOrder.estado==='en_camino'?t("uiCopy.expression46"):t("uiCopy.expression47")}</span><button type="button" onClick={()=>openOrder(trackedOrder.id)}>{t('clientHome.openOrder')}</button></div>}
    {trackedOrder?<div className="ugo-home-route-view"><ClientActiveMap key={trackedOrder.id} supabase={supabase} serviceId={trackedOrder.id} phase={trackedOrder.estado==='en_camino'?'en_camino':'assigned'}/></div>:<div className="ugo-home-map">
     <div ref={mapEl}/>
     <div className="ugo-home-map-shade"/>
     <div className="ugo-home-map-label"><span>⌖</span><div><b>{t('clientHome.location')}</b><small>{place}</small></div></div><button type="button" className="ugo-home-map-recenter" onClick={locateUser} disabled={locating}>{locating?t("uiCopy.short15"):t("uiCopy.expression48")}</button>
     {radarError&&<div className="ugo-home-map-warning">{t('clientHome.mapLimited')}</div>}
    </div>}
    <footer><div><strong>{trackedOrder?t("uiCopy.expression49"):onlineProviders.length>0?`${onlineProviders.length} profesionales conectados cerca`:t("uiCopy.expression50")}</strong><small>{trackedOrder?t("uiCopy.expression51"):t("uiCopy.expression52")}</small></div><button type="button" onClick={()=>trackedOrder?openOrder(trackedOrder.id):flow.navigate('request')}>{trackedOrder?t("uiCopy.expression53"):t("client.request")} <span>→</span></button></footer>
    {!trackedOrder&&onlineProviders.length>0&&<section className="ugo-home-nearby" aria-label={t('clientHome.providers')}><div className="ugo-home-nearby-head"><div><strong>{t('clientHome.providerNearby')}</strong><small>{t('clientHome.availability')}</small></div><span>{onlineProviders.length} {t('clientHome.connected')}</span></div><div className="ugo-home-provider-list">{onlineProviders.slice(0,3).map(provider=><article className="ugo-home-provider-card" key={provider.id}><UserProfileAvatar name={provider.nombre||t('clientHome.professional')} role="provider" photoUrl={provider.foto_url} size={44} className="ugo-home-provider-avatar"/><div className="ugo-home-provider-info"><strong>{provider.nombre||t('clientHome.professional')}</strong><small>{provider.categoria_emoji||'🧰'} {provider.categoria_nombre||t('clientHome.homeServices')}</small><div className="ugo-home-provider-meta"><span className="ugo-home-verified">{t('clientHome.verified')}</span>{provider.karma!==null&&provider.karma!==undefined&&Number(provider.karma)>0&&<span className="ugo-home-provider-rating">★ {Number(provider.karma).toFixed(1)}</span>}{provider.servicios_completados!==null&&provider.servicios_completados!==undefined&&<span>{provider.servicios_completados} {t('clientHome.serviceCount')}</span>}</div></div><span className="ugo-home-available"><i/>{t('clientHome.connection')}</span></article>)}</div></section>}
   </aside>

   <div className="ugo-home-services" id="ugo-client-services">
    <div className="ugo-home-services-head"><div><span>{t('clientHome.services')}</span><h2>{t('clientHome.chooseCategory')}</h2></div><button type="button" onClick={()=>setShowAll(v=>!v)}>{showAll?t("uiCopy.expression54"):t("ugoWeb.seeAll")} <span>{showAll?'↑':'→'}</span></button></div>
    {categoriesLoading&&categories.length===0?<div className="ugo-home-categories is-loading" aria-hidden="true">{Array.from({length:4},(_,index)=><SkeletonCard key={index} lines={1} action={false} className="ugo-home-category-skeleton"/>)}</div>:categories.length===0?<div className="ugo-home-categories-empty" role="status"><strong>{t('clientHome.loadError')}</strong><small>{t('clientHome.retryHelp')}</small><button type="button" onClick={()=>{setCategoriesLoading(true);setHomeEpoch(value=>value+1)}}>{t('clientHome.retry')}</button></div>:<div className="ugo-home-categories">{cards.filter(({label,category})=>!serviceSearch.trim()||norm(`${label} ${category?.nombre||''}`).includes(norm(serviceSearch.trim()))).map(({key,label,emoji,sub,category})=><button type="button" key={key} disabled={!category} onClick={()=>choose(category)}><span className="ugo-home-category-icon">{category?.emoji||emoji}</span><div><b>{label}</b><small>{sub}</small></div><em>→</em></button>)}</div>}
    {showAll&&<div className="ugo-home-all-results" aria-label={t('clientHome.allCategoriesAria')}>{matchingCategories.map(c=><button type="button" key={c.id} onClick={()=>choose(c)}><span>{c.emoji||'🧰'}</span><strong>{localizedCategory(c.nombre,locale)}</strong><b>→</b></button>)}</div>}
   </div>
   <nav className="ugo-home-mobile-nav" aria-label={t('clientHome.home')}>
    <button type="button" className="active" onClick={()=>flow.navigate('home')}><span>⌂</span><small>{t('clientHome.home')}</small></button>
    <button type="button" onClick={()=>{setShowAll(true);window.setTimeout(()=>document.querySelector('.ugo-home-services')?.scrollIntoView({behavior:'smooth',block:'start'}),0)}}><span>▦</span><small>{t('clientHome.services')}</small></button>
    <button type="button" onClick={()=>{setMapExpanded(true);document.getElementById('ugo-client-map')?.scrollIntoView({behavior:'smooth',block:'start'})}}><span>⌖</span><small>{t('clientHome.map')}</small></button>
    <button type="button" onClick={()=>flow.navigate('history')}><span>◷</span><small>{t('clientHome.activity')}</small></button>
    <button type="button" onClick={()=>flow.navigate('profile')}><span>◉</span><small>{t('clientHome.profile')}</small></button>
   </nav>
  </section>
 </main>
}
export default ClientHomeScreen
