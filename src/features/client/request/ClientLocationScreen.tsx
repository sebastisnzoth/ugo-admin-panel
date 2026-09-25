import React,{useEffect,useState}from'react'
import{useRoleSession}from'../../../mvp/shared'
import{ClientWhenScreen}from'./ClientWhenScreen'
import{UGO_UI_EVENTS}from'../../../mvp/uiEvents'
import{geocodeClientAddress,reverseClientCoordinates,validClientCoordinates}from'../../../lib/clientGeocoding'
import'./clientLocationScreen.css'

type TariffQuote={tarifa_id:string;zona:string;precio_base:number;precio_hora:number;precio_min:number;precio_max:number|null;precio_referencia:number;moneda:string}
type PickupSource='current'|'saved'|'manual'
type Draft={address?:string;addressLabel?:string;complement?:string;description?:string;categoryName?:string;categoryId?:string;zone?:string;tariffQuote?:TariffQuote|null;pickupLat?:number|null;pickupLng?:number|null;pickupSource?:PickupSource}
type SavedPlace={id:string;etiqueta:string;direccion:string;complemento:string|null;barrio:string|null;ciudad:string|null;es_predeterminada:boolean;latitud:number|null;longitud:number|null}
type ClientProfileAddress={direccion:string|null;barrio:string|null;ciudad:string|null}
type ClientUserLocation={lat:number|null;lng:number|null}
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0))

export function ClientLocationScreen({onBack,onContinue}:{onBack:()=>void;onContinue:()=>void}){
 const{session,supabase}=useRoleSession('client')
 const[address,setAddress]=useState(''),[complement,setComplement]=useState(''),[zone,setZone]=useState(''),[places,setPlaces]=useState<SavedPlace[]>([]),[selectedPlace,setSelectedPlace]=useState(''),[locating,setLocating]=useState(false),[resolvingPickup,setResolvingPickup]=useState(false),[quoting,setQuoting]=useState(false),[quote,setQuote]=useState<TariffQuote|null>(null),[quoteChecked,setQuoteChecked]=useState(false),[message,setMessage]=useState(''),[stage,setStage]=useState<'location'|'when'>('location')
 const key=session?`ugo:guided-request-draft:${session.user.id}`:''

 useEffect(()=>{if(!key)return;try{const draft=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft;setAddress(draft.address||'');setComplement(draft.complement||'');setZone(draft.zone||'');setQuote(draft.tariffQuote||null);setQuoteChecked(Boolean(draft.tariffQuote))}catch{}},[key])
 useEffect(()=>{if(!session)return;let alive=true;void(async()=>{const[savedResult,profileResult,userResult]=await Promise.all([(supabase as any).from('direcciones_cliente').select('id,etiqueta,direccion,complemento,barrio,ciudad,es_predeterminada,latitud,longitud').eq('usuario_id',session.user.id).order('es_predeterminada',{ascending:false}).order('created_at',{ascending:true}),supabase.from('perfiles_cliente').select('direccion,barrio,ciudad').eq('usuario_id',session.user.id).maybeSingle(),(supabase as any).from('usuarios').select('lat,lng').eq('id',session.user.id).maybeSingle()]);if(!alive)return;const rows=((savedResult.data||[])as SavedPlace[]).slice(),profile=(profileResult.data||null)as ClientProfileAddress|null,user=(userResult.data||null)as ClientUserLocation|null,profileAddress=String(profile?.direccion||'').trim();if(savedResult.error)console.warn('UGO saved places unavailable',savedResult.error);if(profileAddress&&!rows.some(place=>place.direccion.trim().toLowerCase()===profileAddress.toLowerCase())){const lat=Number(user?.lat),lng=Number(user?.lng),hasCoords=user?.lat!=null&&user?.lng!=null&&validClientCoordinates(lat,lng);rows.unshift({id:'profile-address',etiqueta:'Casa',direccion:profileAddress,complemento:null,barrio:profile?.barrio||null,ciudad:profile?.ciudad||null,es_predeterminada:rows.length===0,latitud:hasCoords?lat:null,longitud:hasCoords?lng:null})}setPlaces(rows);let draftAddress='';try{draftAddress=String((JSON.parse(sessionStorage.getItem(key)||'{}')as Draft).address||'')}catch{}const current=rows.find(place=>place.direccion===draftAddress);if(current)setSelectedPlace(current.id)})().catch(error=>{if(alive){console.warn('UGO client addresses unavailable',error);setPlaces([])}});return()=>{alive=false}},[key,session,supabase])

 const save=(nextAddress=address,nextZone=zone,nextQuote=quote,nextLabel?:string,nextComplement=complement)=>{if(!key)return;try{const previous=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft;sessionStorage.setItem(key,JSON.stringify({...previous,address:nextAddress,addressLabel:nextLabel||previous.addressLabel||'Dirección del servicio',complement:nextComplement,zone:nextZone||null,tariffQuote:nextQuote||null}))}catch{}}
 const savePickup=(lat:number|null,lng:number|null,source:PickupSource)=>{if(!key)return;try{const previous=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft;sessionStorage.setItem(key,JSON.stringify({...previous,pickupLat:lat,pickupLng:lng,pickupSource:source}))}catch{}}

 const loadQuote=async(nextAddress=address,nextZone=zone)=>{
  if(!key)return null
  let draft:Draft={}
  try{draft=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft}catch{}
  if(!draft.categoryId||nextAddress.trim().length<5)return null
  setQuoting(true);setQuoteChecked(false)
  try{
   const{data,error}=await supabase.rpc('cotizar_tarifa_servicio',{p_categoria_id:draft.categoryId,p_zona:nextZone.trim()||null,p_direccion:nextAddress.trim()})
   if(error)throw error
   const raw=Array.isArray(data)?data[0]:null
   const next=raw?{tarifa_id:String(raw.tarifa_id),zona:String(raw.zona||'General'),precio_base:Number(raw.precio_base||0),precio_hora:Number(raw.precio_hora||0),precio_min:Number(raw.precio_min||0),precio_max:raw.precio_max==null?null:Number(raw.precio_max),precio_referencia:Number(raw.precio_referencia||0),moneda:String(raw.moneda||'BRL')} as TariffQuote:null
   setQuote(next);setQuoteChecked(true);save(nextAddress,nextZone,next)
   return next
  }catch(error){
   console.warn('UGO tariff quote unavailable',error)
   setQuote(null);setQuoteChecked(true);save(nextAddress,nextZone,null)
   return null
  }finally{setQuoting(false)}
 }

 useEffect(()=>{if(!key)return;const onVoiceDraft=(event:Event)=>{const detail=(event as CustomEvent<{address?:string;addressLabel?:string;pickupLat?:number|null;pickupLng?:number|null;pickupSource?:PickupSource|null;when?:string|null;scheduleAt?:string;urgent?:boolean;paymentMethod?:'cash'|'pix'|null;voiceJourney?:boolean}>).detail||{},nextAddress=String(detail.address||'').trim(),lat=detail.pickupLat==null?null:Number(detail.pickupLat),lng=detail.pickupLng==null?null:Number(detail.pickupLng),hasCoords=lat!=null&&lng!=null&&Number.isFinite(lat)&&Number.isFinite(lng),source=detail.pickupSource||null;try{const previous=JSON.parse(sessionStorage.getItem(key)||'{}');sessionStorage.setItem(key,JSON.stringify({...previous,...(nextAddress?{address:nextAddress,addressLabel:String(detail.addressLabel||previous.addressLabel||'Dirección del servicio')}:{}),...(detail.when?{when:detail.when,scheduleAt:detail.scheduleAt||'',urgent:Boolean(detail.urgent)}:{}),...(detail.paymentMethod?{paymentMethod:detail.paymentMethod}:{}),...(source?{pickupLat:hasCoords?lat:null,pickupLng:hasCoords?lng:null,pickupSource:source}:{}),voiceJourney:Boolean(detail.voiceJourney)}))}catch{}if(nextAddress.length<5)return;setSelectedPlace('');setAddress(nextAddress);setMessage('');setQuote(null);setQuoteChecked(false);if(source)savePickup(hasCoords?lat:null,hasCoords?lng:null,source);void(async()=>{const currentQuote=await loadQuote(nextAddress,zone);save(nextAddress,zone,currentQuote);setStage('when')})()};window.addEventListener(UGO_UI_EVENTS.clientHugoDraft,onVoiceDraft);return()=>window.removeEventListener(UGO_UI_EVENTS.clientHugoDraft,onVoiceDraft)},[key,zone])

 const persistCoordinates=async(latitude:number,longitude:number,label?:string)=>{if(!validClientCoordinates(latitude,longitude))throw new Error('El GPS devolvió una ubicación inválida.');try{sessionStorage.setItem('ugo:last-client-location',JSON.stringify({latitude,longitude,label:label||undefined,at:Date.now()}))}catch{}if(!session)return;const point='POINT('+longitude+' '+latitude+')';const[profileResult,userResult]=await Promise.all([(supabase as any).from('perfiles_cliente').update({ubicacion:point}).eq('usuario_id',session.user.id),(supabase as any).from('usuarios').update({lat:latitude,lng:longitude}).eq('id',session.user.id)]);if(profileResult?.error||userResult?.error)console.warn('UGO client GPS persistence partially unavailable',profileResult?.error||userResult?.error)}
 const choosePlace=async(place:SavedPlace)=>{const nextZone=place.barrio||place.ciudad||'',lat=Number(place.latitud),lng=Number(place.longitud),hasCoords=place.latitud!=null&&place.longitud!=null&&validClientCoordinates(lat,lng);setSelectedPlace(place.id);setAddress(place.direccion);setComplement(place.complemento||'');setZone(nextZone);setMessage('');setQuote(null);setQuoteChecked(false);save(place.direccion,nextZone,null,place.etiqueta||'Lugar guardado',place.complemento||'');savePickup(hasCoords?lat:null,hasCoords?lng:null,'saved');if(!hasCoords){setResolvingPickup(true);const resolved=await geocodeClientAddress(place.direccion,nextZone);setResolvingPickup(false);if(resolved){savePickup(resolved.latitude,resolved.longitude,'saved');if(place.id!=='profile-address')void(supabase as any).from('direcciones_cliente').update({latitud:resolved.latitude,longitud:resolved.longitude}).eq('id',place.id).eq('usuario_id',session?.user.id);else void persistCoordinates(resolved.latitude,resolved.longitude,place.direccion)}else setMessage('Encontramos tu dirección guardada, pero todavía no pudimos ubicarla con precisión en el mapa. Podés reintentar o usar tu GPS.')}void loadQuote(place.direccion,nextZone)}
 const useLocation=()=>{
  if(!navigator.geolocation){setMessage('Este dispositivo no ofrece GPS al navegador. Elegí una dirección guardada o escribila manualmente.');return}
  setLocating(true);setMessage('')
  navigator.geolocation.getCurrentPosition(async pos=>{
   try{
    if(!validClientCoordinates(pos.coords.latitude,pos.coords.longitude))throw new Error('El GPS devolvió coordenadas inválidas.')
    savePickup(pos.coords.latitude,pos.coords.longitude,'current')
    await persistCoordinates(pos.coords.latitude,pos.coords.longitude)
    const resolved=await reverseClientCoordinates(pos.coords.latitude,pos.coords.longitude)
    if(resolved){const value=resolved.address,nextZone=resolved.zone;setSelectedPlace('');setAddress(value);setComplement('');setZone(nextZone);save(value,nextZone,null,'Ubicación actual','');savePickup(pos.coords.latitude,pos.coords.longitude,'current');await persistCoordinates(pos.coords.latitude,pos.coords.longitude,value);void loadQuote(value,nextZone)}else setMessage('GPS recibido, pero no pudimos convertirlo en una calle. Probá otra vez o escribí la dirección; no usamos una ubicación inventada.')
   }catch(error){console.warn('UGO client GPS unavailable',error);setMessage(error instanceof Error?error.message:'No pudimos usar tu GPS.')}finally{setLocating(false)}
  },error=>{setLocating(false);setMessage(error.code===1?'UGO necesita permiso de ubicación. Habilitá la ubicación precisa del navegador y reintentá.':error.code===2?'El dispositivo no pudo determinar tu ubicación. Activá el GPS y reintentá.':'El GPS tardó demasiado en responder. Reintentá con la ubicación precisa activada.')},{enableHighAccuracy:true,timeout:15000,maximumAge:0})
 }

 const next=async()=>{
  const clean=address.trim()
  if(clean.length<5){setMessage('Ingresá la dirección del servicio.');return}
  setMessage('')
  let draft:Draft={}
  try{draft=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft}catch{}
  const savedLat=Number(draft.pickupLat),savedLng=Number(draft.pickupLng),hasPickup=draft.pickupLat!=null&&draft.pickupLng!=null&&validClientCoordinates(savedLat,savedLng)
  if(!hasPickup){setResolvingPickup(true);const resolved=await geocodeClientAddress(clean,zone);setResolvingPickup(false);if(!resolved){setMessage('No pudimos ubicar esa dirección en el mapa. Revisá calle, número y ciudad, elegí un lugar guardado o usá tu GPS.');return}savePickup(resolved.latitude,resolved.longitude,selectedPlace?'saved':'manual')}
  const currentQuote=quoteChecked?quote:await loadQuote(clean,zone)
  save(clean,zone,currentQuote)
  setStage('when')
 }

 if(!session)return null
 if(stage==='when')return <ClientWhenScreen onBack={()=>setStage('location')} onContinue={onContinue}/>
 return <main className="ugo-location-screen" aria-label="Dónde es el servicio">
  <header><button type="button" onClick={onBack} aria-label="Volver">←</button><strong>UGO</strong><div className="ugo-location-progress"><i/><i/><i/><i/><i/></div><small>2 de 5</small></header>
  <section><h1>¿Dónde es el servicio?</h1><p>Elegí un lugar guardado o usá tu ubicación actual.</p>
   {places.length>0&&<div className="ugo-location-saved"><div className="ugo-location-saved-head"><strong>Tus lugares</strong><small>{places.length+' guardado'+(places.length===1?'':'s')}</small></div><div className="ugo-location-saved-list">{places.map(place=><button type="button" key={place.id} className={selectedPlace===place.id?'selected':''} onClick={()=>void choosePlace(place)}><span>{/casa|hogar/i.test(place.etiqueta)?'⌂':/oficina|trabajo/i.test(place.etiqueta)?'▣':'⌖'}</span><div><b>{place.etiqueta}</b><small>{place.direccion}{place.complemento?' · '+place.complemento:''}</small></div>{place.es_predeterminada&&<em>Principal</em>}<i>→</i></button>)}</div></div>}
   <div className="ugo-location-map"><div className="ugo-location-map-grid"/><span className="ugo-location-pin">●</span><button type="button" onClick={useLocation} disabled={locating}>⌖ {locating?'Buscando…':'Usar mi ubicación'}</button></div>
   <label>Dirección<input value={address} onChange={e=>{setSelectedPlace('');setAddress(e.target.value);setQuote(null);setQuoteChecked(false);setMessage('');savePickup(null,null,'manual')}} onBlur={()=>{if(address.trim().length>=5){save(address,zone,null,'Dirección indicada',complement);void loadQuote(address,zone)}}} placeholder="Rua Apóstolo Paschoal, 123" autoComplete="street-address"/></label>
   <label>Complemento <small>(opcional)</small><input value={complement} onChange={e=>setComplement(e.target.value)} onBlur={()=>save()} placeholder="Apto 101, bloco B"/></label>
   {quoting&&<div className="ugo-location-tariff loading">Buscando tarifa de referencia para esta zona…</div>}
   {!quoting&&quote&&<div className="ugo-location-tariff"><div><small>TARIFA UGO · {quote.zona}</small><strong>{quote.precio_referencia>0?`Desde ${money(quote.precio_referencia)}`:'Referencia configurada'}</strong></div><div className="ugo-location-tariff-values">{quote.precio_base>0&&<span>Base <b>{money(quote.precio_base)}</b></span>}{quote.precio_hora>0&&<span>Hora <b>{money(quote.precio_hora)}</b></span>}{quote.precio_min>0&&<span>Mín. <b>{money(quote.precio_min)}</b></span>}{quote.precio_max!=null&&quote.precio_max>0&&<span>Máx. <b>{money(quote.precio_max)}</b></span>}</div><p>Referencia operativa. El valor final depende de la modalidad y del cierre real del servicio.</p></div>}
   {!quoting&&quoteChecked&&!quote&&<div className="ugo-location-tariff muted"><strong>Sin tarifa UGO para esta zona</strong><span>El pedido puede continuar; se usará la tarifa válida del profesional disponible.</span></div>}
   {message&&<p className="ugo-location-error" role="alert">{message}</p>}
  </section>
  <footer><button type="button" onClick={()=>void next()} disabled={quoting||locating||resolvingPickup}>{resolvingPickup?'Ubicando dirección…':locating?'Buscando GPS…':quoting?'Calculando tarifa…':<>Continuar <span>→</span></>}</button></footer>
 </main>
}
export default ClientLocationScreen
