import React,{useEffect,useState}from'react'
import{useRoleSession}from'../shared'
import{ClientWhenScreen}from'./ClientWhenScreen'
import'./client-location-screen.css'

type TariffQuote={tarifa_id:string;zona:string;precio_base:number;precio_hora:number;precio_min:number;precio_max:number|null;precio_referencia:number;moneda:string}
type PickupSource='current'|'saved'|'manual'
type Draft={address?:string;addressLabel?:string;complement?:string;description?:string;categoryName?:string;categoryId?:string;zone?:string;tariffQuote?:TariffQuote|null;pickupLat?:number|null;pickupLng?:number|null;pickupSource?:PickupSource}
type SavedPlace={id:string;etiqueta:string;direccion:string;complemento:string|null;barrio:string|null;ciudad:string|null;es_predeterminada:boolean;latitud:number|null;longitud:number|null}
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0))

export function ClientLocationScreen({onBack,onContinue}:{onBack:()=>void;onContinue:()=>void}){
 const{session,supabase}=useRoleSession('client')
 const[address,setAddress]=useState(''),[complement,setComplement]=useState(''),[zone,setZone]=useState(''),[places,setPlaces]=useState<SavedPlace[]>([]),[selectedPlace,setSelectedPlace]=useState(''),[locating,setLocating]=useState(false),[quoting,setQuoting]=useState(false),[quote,setQuote]=useState<TariffQuote|null>(null),[quoteChecked,setQuoteChecked]=useState(false),[message,setMessage]=useState(''),[stage,setStage]=useState<'location'|'when'>('location')
 const key=session?`ugo:guided-request-draft:${session.user.id}`:''

 useEffect(()=>{if(!key)return;try{const draft=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft;setAddress(draft.address||'');setComplement(draft.complement||'');setZone(draft.zone||'');setQuote(draft.tariffQuote||null);setQuoteChecked(Boolean(draft.tariffQuote))}catch{}},[key])
 useEffect(()=>{if(!session)return;let alive=true;void (supabase as any).from('direcciones_cliente').select('id,etiqueta,direccion,complemento,barrio,ciudad,es_predeterminada,latitud,longitud').eq('usuario_id',session.user.id).order('es_predeterminada',{ascending:false}).order('created_at',{ascending:true}).then(({data,error}:{data:SavedPlace[]|null,error:{message?:string}|null})=>{if(!alive)return;if(error){console.warn('UGO saved places unavailable',error);setPlaces([]);return}const rows=data||[];setPlaces(rows);const current=rows.find(place=>place.direccion===address);if(current)setSelectedPlace(current.id)});return()=>{alive=false}},[address,session,supabase])

 const save=(nextAddress=address,nextZone=zone,nextQuote=quote)=>{if(!key)return;try{const previous=JSON.parse(sessionStorage.getItem(key)||'{}')as Draft;sessionStorage.setItem(key,JSON.stringify({...previous,address:nextAddress,addressLabel:previous.addressLabel||'Dirección del servicio',complement,zone:nextZone||null,tariffQuote:nextQuote||null}))}catch{}}
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

 const choosePlace=(place:SavedPlace)=>{const nextZone=place.barrio||place.ciudad||'',lat=Number(place.latitud),lng=Number(place.longitud),hasCoords=place.latitud!=null&&place.longitud!=null&&Number.isFinite(lat)&&Number.isFinite(lng);setSelectedPlace(place.id);setAddress(place.direccion);setComplement(place.complemento||'');setZone(nextZone);setMessage('');setQuote(null);setQuoteChecked(false);save(place.direccion,nextZone,null);savePickup(hasCoords?lat:null,hasCoords?lng:null,'saved');void loadQuote(place.direccion,nextZone)}
 const useLocation=()=>{
  if(!navigator.geolocation){setMessage('Ingresá la dirección manualmente.');return}
  setLocating(true);setMessage('')
  navigator.geolocation.getCurrentPosition(async pos=>{
   try{
    const response=await fetch(`https://photon.komoot.io/reverse?lat=${encodeURIComponent(pos.coords.latitude)}&lon=${encodeURIComponent(pos.coords.longitude)}`)
    const data=await response.json() as {features?:Array<{properties?:Record<string,string>}>}
    const p=data.features?.[0]?.properties||{},street=p.street||p.name||'',number=p.housenumber||'',district=p.district||p.locality||'',city=p.city||''
    const value=[`${street}${number?` ${number}`:''}`,district,city].filter(Boolean).join(', '),nextZone=district||city
    if(value){setSelectedPlace('');setAddress(value);setZone(nextZone);save(value,nextZone,null);savePickup(pos.coords.latitude,pos.coords.longitude,'current');try{sessionStorage.setItem('ugo:last-client-location',JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude,label:value,at:Date.now()}));if(session)await (supabase as any).from('perfiles_cliente').update({ubicacion:`POINT(${pos.coords.longitude} ${pos.coords.latitude})`}).eq('usuario_id',session.user.id)}catch(error){console.warn('UGO client GPS persistence unavailable',error)}void loadQuote(value,nextZone)}else setMessage('No pudimos obtener la dirección. Escribila abajo.')
   }catch{setMessage('No pudimos obtener la dirección. Escribila abajo.')}finally{setLocating(false)}
  },()=>{setLocating(false);setMessage('No se pudo acceder a tu ubicación. Podés escribir la dirección manualmente.')},{enableHighAccuracy:true,timeout:8000,maximumAge:30000})
 }

 const next=async()=>{
  const clean=address.trim()
  if(clean.length<5){setMessage('Ingresá la dirección del servicio.');return}
  setMessage('')
  const currentQuote=quoteChecked?quote:await loadQuote(clean,zone)
  save(clean,zone,currentQuote)
  setStage('when')
 }

 if(!session)return null
 if(stage==='when')return <ClientWhenScreen onBack={()=>setStage('location')} onContinue={onContinue}/>
 return <main className="ugo-location-screen" aria-label="Dónde es el servicio">
  <header><button type="button" onClick={onBack} aria-label="Volver">←</button><strong>UGO</strong><div className="ugo-location-progress"><i/><i/><i/><i/><i/></div><small>2 de 5</small></header>
  <section><h1>¿Dónde es el servicio?</h1><p>Elegí un lugar guardado o usá tu ubicación actual.</p>
   {places.length>0&&<div className="ugo-location-saved"><div className="ugo-location-saved-head"><strong>Tus lugares</strong><small>{places.length+' guardado'+(places.length===1?'':'s')}</small></div><div className="ugo-location-saved-list">{places.map(place=><button type="button" key={place.id} className={selectedPlace===place.id?'selected':''} onClick={()=>choosePlace(place)}><span>{/casa|hogar/i.test(place.etiqueta)?'⌂':/oficina|trabajo/i.test(place.etiqueta)?'▣':'⌖'}</span><div><b>{place.etiqueta}</b><small>{place.direccion}{place.complemento?' · '+place.complemento:''}</small></div>{place.es_predeterminada&&<em>Principal</em>}<i>→</i></button>)}</div></div>}
   <div className="ugo-location-map"><div className="ugo-location-map-grid"/><span className="ugo-location-pin">●</span><button type="button" onClick={useLocation} disabled={locating}>⌖ {locating?'Buscando…':'Usar mi ubicación'}</button></div>
   <label>Dirección<input value={address} onChange={e=>{setSelectedPlace('');setAddress(e.target.value);setQuote(null);setQuoteChecked(false);setMessage('');savePickup(null,null,'manual')}} onBlur={()=>{if(address.trim().length>=5)void loadQuote(address,zone)}} placeholder="Rua Apóstolo Paschoal, 123" autoComplete="street-address"/></label>
   <label>Complemento <small>(opcional)</small><input value={complement} onChange={e=>setComplement(e.target.value)} onBlur={()=>save()} placeholder="Apto 101, bloco B"/></label>
   {quoting&&<div className="ugo-location-tariff loading">Buscando tarifa de referencia para esta zona…</div>}
   {!quoting&&quote&&<div className="ugo-location-tariff"><div><small>TARIFA UGO · {quote.zona}</small><strong>{quote.precio_referencia>0?`Desde ${money(quote.precio_referencia)}`:'Referencia configurada'}</strong></div><div className="ugo-location-tariff-values">{quote.precio_base>0&&<span>Base <b>{money(quote.precio_base)}</b></span>}{quote.precio_hora>0&&<span>Hora <b>{money(quote.precio_hora)}</b></span>}{quote.precio_min>0&&<span>Mín. <b>{money(quote.precio_min)}</b></span>}{quote.precio_max!=null&&quote.precio_max>0&&<span>Máx. <b>{money(quote.precio_max)}</b></span>}</div><p>Referencia operativa. El valor final depende de la modalidad y del cierre real del servicio.</p></div>}
   {!quoting&&quoteChecked&&!quote&&<div className="ugo-location-tariff muted"><strong>Sin tarifa UGO para esta zona</strong><span>El pedido puede continuar; se usará la tarifa válida del profesional disponible.</span></div>}
   {message&&<p className="ugo-location-error" role="alert">{message}</p>}
  </section>
  <footer><button type="button" onClick={()=>void next()} disabled={quoting}>{quoting?'Calculando tarifa…':<>Continuar <span>→</span></>}</button></footer>
 </main>
}
export default ClientLocationScreen
