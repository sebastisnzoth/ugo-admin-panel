import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import{supabase}from'../lib/supabase'
import'./scout-section.css'

declare const L:any

type Provider={id:string;name:string;phone?:string;email?:string;address?:string;lat:number;lng:number;dist:number;website?:string;source?:string;subcategoria_label?:string}
type Prospect={id:string;external_id:string|null;nombre:string;categoria:string;telefono:string|null;email:string|null;website:string|null;direccion:string|null;ciudad:string|null;pais:string|null;latitud:number|null;longitud:number|null;fuente:string;score_confianza:number;estado:string;notas_hugo:string|null;created_at:string;contactado_at:string|null;aprobado_at:string|null}
type DbProvider={id:string;nombre:string;lat:number|null;lng:number|null;categoria:string|null;cat_emoji:string|null;pin_color:string|null;estado_mapa:string|null;telefono:string|null;zona:string|null}

const CATEGORIES=[
 ['electricista','⚡','Electricista · Eletricista'],
 ['plomero','🚿','Plomero · Encanador'],
 ['limpeza','🧹','Limpieza · Faxina'],
 ['chaveiro','🔑','Cerrajero · Chaveiro'],
 ['pintura','🎨','Pintura'],
 ['carpintaria','🪚','Carpintería · Marcenaria'],
 ['jardinagem','🌿','Jardinería · Jardinagem'],
 ['climatizacao','❄️','Climatización · Ar condicionado'],
 ['ti_redes','💻','TI · Informática · Redes'],
 ['reformas','🏗️','Reformas · Construção'],
 ['marido_aluguel','🛠️','Marido de aluguel · Servicios generales'],
 ['mudanca','📦','Mudanza · Frete'],
 ['automotivo','🚗','Automotivo'],
] as const

const category=(key:string)=>CATEGORIES.find(([id])=>id===key)||CATEGORIES[0]
const fmtDistance=(meters:number)=>meters<1000?`${Math.round(meters)} m`:`${(meters/1000).toFixed(1)} km`
const safePhone=(value?:string|null)=>String(value||'').replace(/\D/g,'')
const sourceLabel=(s?:string)=>s==='tomtom'?'TomTom':s==='geoapify'?'Geoapify':s==='osm'?'OpenStreetMap':s==='nominatim'?'Nominatim':s||'Scout'
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch))

function icon(color:string,label:string,size=28){
 return L.divIcon({html:`<div class="ugo-scout-pin" style="--pin:${color};--size:${size}px"><span>${label}</span><i></i></div>`,className:'',iconSize:[size,size+13],iconAnchor:[size/2,size+13]})
}

export function SecScout(){
 const mapEl=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),resultMarkers=useRef<any[]>([]),dbMarkers=useRef<any[]>([]),centerMarker=useRef<any>(null)
 const[leafletReady,setLeafletReady]=useState(false),[mapReady,setMapReady]=useState(false)
 const[lat,setLat]=useState(-27.5954),[lng,setLng]=useState(-48.5480),[locationLabel,setLocationLabel]=useState('Florianópolis, SC')
 const[address,setAddress]=useState(''),[categoryId,setCategoryId]=useState('electricista'),[radius,setRadius]=useState(5000)
 const[results,setResults]=useState<Provider[]>([]),[prospects,setProspects]=useState<Prospect[]>([]),[dbProviders,setDbProviders]=useState<DbProvider[]>([])
 const[selected,setSelected]=useState<Provider|null>(null),[loading,setLoading]=useState(false),[geoBusy,setGeoBusy]=useState(false),[busyId,setBusyId]=useState('')
 const[status,setStatus]=useState('Listo para buscar profesionales externos.'),[error,setError]=useState(''),[outreach,setOutreach]=useState('')
 const[checked,setChecked]=useState<string[]>([]),[campaignBusy,setCampaignBusy]=useState(false),[campaignProgress,setCampaignProgress]=useState('')
 const[recruitmentText,setRecruitmentText]=useState('Olá {nombre}! Sou da equipe UGO. Estamos convidando profissionais de {categoria} em {zona} para conhecer a plataforma e receber oportunidades de clientes próximos. Se tiver interesse, responda esta mensagem e eu te explico como funciona. Se não quiser receber novos contatos, é só me avisar.')

 const loadProspects=useCallback(async()=>{
  const{data,error}=await(supabase as any).from('prospectos_scouts').select('id,external_id,nombre,categoria,telefono,email,website,direccion,ciudad,pais,latitud,longitud,fuente,score_confianza,estado,notas_hugo,created_at,contactado_at,aprobado_at').order('created_at',{ascending:false}).limit(100)
  if(error)throw error
  setProspects((data||[])as Prospect[])
 },[])

 const loadDbProviders=useCallback(async()=>{
  const{data,error}=await(supabase as any).from('vista_todos_proveedores').select('id,nombre,lat,lng,categoria,cat_emoji,pin_color,estado_mapa,telefono,zona').not('lat','is',null).not('lng','is',null).limit(500)
  if(error)throw error
  setDbProviders((data||[])as DbProvider[])
 },[])

 useEffect(()=>{void Promise.all([loadProspects(),loadDbProviders()]).catch(e=>setError(e instanceof Error?e.message:'No se pudo cargar Scout.'))},[loadProspects,loadDbProviders])

 useEffect(()=>{
  if((window as any).L){setLeafletReady(true);return}
  if(!document.querySelector('link[data-ugo-leaflet]')){const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.dataset.ugoLeaflet='1';document.head.appendChild(link)}
  const existing=document.querySelector('script[data-ugo-leaflet]') as HTMLScriptElement|null
  if(existing){existing.addEventListener('load',()=>setLeafletReady(true),{once:true});return}
  const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.dataset.ugoLeaflet='1';script.onload=()=>setLeafletReady(true);script.onerror=()=>setError('No se pudo cargar el motor del mapa.');document.body.appendChild(script)
 },[])

 useEffect(()=>{
  if(!leafletReady||!mapEl.current||mapRef.current)return
  const map=L.map(mapEl.current,{zoomControl:true,attributionControl:true}).setView([lat,lng],13)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map)
  mapRef.current=map;setMapReady(true)
  ;[80,300,800].forEach(ms=>window.setTimeout(()=>map.invalidateSize(),ms))
  return()=>{try{map.remove()}catch{}mapRef.current=null}
 },[leafletReady])

 useEffect(()=>{
  const map=mapRef.current;if(!map||!(window as any).L)return
  if(centerMarker.current)centerMarker.current.remove()
  centerMarker.current=L.marker([lat,lng],{icon:icon('#0f172a','◎',22),zIndexOffset:500}).addTo(map).bindPopup(`Centro de búsqueda · ${locationLabel}`)
 },[lat,lng,locationLabel,mapReady])

 useEffect(()=>{
  const map=mapRef.current;if(!map||!(window as any).L)return
  dbMarkers.current.forEach(m=>m.remove());dbMarkers.current=[]
  dbProviders.forEach(p=>{
   if(p.lat==null||p.lng==null)return
   const m=L.marker([p.lat,p.lng],{icon:icon(p.pin_color||'#64748b',p.cat_emoji||'✓',22),zIndexOffset:-100}).addTo(map)
   m.bindPopup(`<b>${p.nombre}</b><br><small>Ya registrado en UGO · ${p.categoria||'Proveedor'} · ${p.estado_mapa||'—'}</small>`)
   dbMarkers.current.push(m)
  })
 },[dbProviders,mapReady])

 useEffect(()=>{
  const map=mapRef.current;if(!map||!(window as any).L)return
  resultMarkers.current.forEach(m=>m.remove());resultMarkers.current=[]
  const[,emoji]=category(categoryId)
  results.forEach(p=>{
   const color=p.phone?'#10b981':'#94a3b8'
   const m=L.marker([p.lat,p.lng],{icon:icon(color,emoji,30),zIndexOffset:200}).addTo(map)
   m.bindPopup(`<b>${p.name}</b><br><small>${fmtDistance(p.dist)} · ${sourceLabel(p.source)}</small>`)
   m.on('click',()=>{setSelected(p);setOutreach('')})
   resultMarkers.current.push(m)
  })
  if(results.length){try{map.fitBounds([[lat,lng],...results.map(p=>[p.lat,p.lng])],{padding:[28,28],maxZoom:15})}catch{}}
 },[results,categoryId,lat,lng,mapReady])

 const stats=useMemo(()=>({
  saved:prospects.length,
  contacted:prospects.filter(p=>p.estado==='invitado'||p.estado==='aprobado').length,
  approved:prospects.filter(p=>p.estado==='aprobado').length
 }),[prospects])
 const selectedResults=useMemo(()=>results.filter(p=>checked.includes(p.id)),[results,checked])
 const selectedPhones=useMemo(()=>selectedResults.filter(p=>safePhone(p.phone).length>=10),[selectedResults])
 const selectedEmails=useMemo(()=>selectedResults.filter(p=>Boolean(p.email)),[selectedResults])
 const personalize=(p:Provider)=>recruitmentText.replaceAll('{nombre}',p.name||'profissional').replaceAll('{categoria}',category(categoryId)[2]).replaceAll('{zona}',locationLabel)

 async function authToken(forceRefresh=false){
  const current=forceRefresh?await supabase.auth.refreshSession():await supabase.auth.getSession()
  if(current.error)throw new Error('La sesión Admin venció. Volvé a iniciar sesión.')
  let session=current.data.session
  const now=Math.floor(Date.now()/1000)
  if(!forceRefresh&&session?.expires_at&&session.expires_at<=now+60){
   const refreshed=await supabase.auth.refreshSession()
   if(refreshed.error||!refreshed.data.session?.access_token)throw new Error('La sesión Admin venció. Volvé a iniciar sesión.')
   session=refreshed.data.session
  }
  if(!session?.access_token)throw new Error('La sesión Admin venció. Volvé a iniciar sesión.')
  return session.access_token
 }

 async function geocode(){
  const q=address.trim();if(!q)return
  setGeoBusy(true);setError('')
  try{
   const response=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`)
   if(!response.ok)throw new Error('No se pudo consultar la ubicación.')
   const rows=await response.json();if(!rows?.[0])throw new Error('No encontramos esa zona o dirección.')
   const la=Number(rows[0].lat),lo=Number(rows[0].lon);if(!Number.isFinite(la)||!Number.isFinite(lo))throw new Error('La ubicación no tiene coordenadas válidas.')
   setLat(la);setLng(lo);setLocationLabel(rows[0].display_name?.split(',').slice(0,3).join(',')||q);setAddress('');mapRef.current?.setView([la,lo],14)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo ubicar la zona.')}finally{setGeoBusy(false)}
 }

 function gps(){
  setError('')
  if(!navigator.geolocation){setError('Este navegador no ofrece GPS. Usá la búsqueda por zona.');return}
  setGeoBusy(true)
  navigator.geolocation.getCurrentPosition(p=>{setLat(p.coords.latitude);setLng(p.coords.longitude);setLocationLabel('Ubicación GPS');mapRef.current?.setView([p.coords.latitude,p.coords.longitude],14);setGeoBusy(false)},()=>{setError('No se pudo usar GPS. Podés buscar ciudad, barrio o dirección.');setGeoBusy(false)},{enableHighAccuracy:true,timeout:10000})
 }

 async function search(){
  setLoading(true);setError('');setStatus('Buscando profesionales externos…');setResults([]);setChecked([]);setSelected(null);setOutreach('')
  try{
   const request=async(token:string)=>fetch('/api/scout/places',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({lat,lng,radius,categoria:categoryId})})
   let response=await request(await authToken())
   if(response.status===401)response=await request(await authToken(true))
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw new Error(payload.error||`Scout respondió HTTP ${response.status}`)
   const rows=((payload.results||[])as any[]).map(p=>({id:String(p.id),name:String(p.name||'Profesional'),phone:p.phone||undefined,email:p.email||undefined,address:p.address||undefined,lat:Number(p.lat),lng:Number(p.lng),dist:Number(p.dist||0),website:p.website||undefined,source:p.source||payload.source,subcategoria_label:p.subcategoria_label||undefined})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng))
   setResults(rows)
   setStatus(rows.length?`${rows.length} profesionales encontrados con teléfono · fuente ${sourceLabel(payload.source)}.`:`No encontramos profesionales con teléfono en ${radius/1000} km. Probá ampliar el radio o cambiar categoría.`)
  }catch(e){setError(e instanceof Error?e.message:'Scout no pudo completar la búsqueda.');setStatus('La búsqueda no se completó.')}finally{setLoading(false)}
 }

 function prospectRow(p:Provider){
  const[,emoji,label]=category(categoryId)
  return{external_id:p.id,nombre:p.name,categoria:categoryId,telefono:p.phone||null,email:p.email||null,website:p.website||null,direccion:p.address||null,ciudad:locationLabel.split(',')[0]?.trim()||'Florianópolis',pais:'BR',latitud:p.lat,longitud:p.lng,fuente:p.source||'scout',score_confianza:p.phone?75:40,estado:'prospecto_pendiente',notas_hugo:`Scout ${emoji} ${label} · ${fmtDistance(p.dist)}`}
 }

 async function persistProspects(items:Provider[]){
  const unique=[...new Map(items.map(p=>[p.id,p])).values()]
  if(!unique.length)return
  const ids=unique.map(p=>p.id)
  const{data:existing,error:lookupError}=await(supabase as any).from('prospectos_scouts').select('id,external_id').in('external_id',ids)
  if(lookupError)throw lookupError
  const byExternal=new Map((existing||[]).map((row:any)=>[String(row.external_id),String(row.id)]))
  const inserts=unique.filter(p=>!byExternal.has(p.id)).map(prospectRow)
  if(inserts.length){const{error}=await(supabase as any).from('prospectos_scouts').insert(inserts);if(error)throw error}
  for(const p of unique.filter(p=>byExternal.has(p.id))){
   const{estado:_,...patch}=prospectRow(p)
   const{error}=await(supabase as any).from('prospectos_scouts').update(patch).eq('id',byExternal.get(p.id))
   if(error)throw error
  }
 }

 async function saveProspect(p:Provider){
  setBusyId(p.id);setError('')
  try{await persistProspects([p]);await loadProspects();setStatus(`${p.name} quedó guardado en Scout.`)}
  catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el prospecto.')}finally{setBusyId('')}
 }

 async function saveSelected(){
  if(!selectedResults.length)return
  setCampaignBusy(true);setError('');setCampaignProgress(`Guardando ${selectedResults.length} prospectos…`)
  try{await persistProspects(selectedResults);await loadProspects();setStatus(`${selectedResults.length} prospectos quedaron guardados en Scout.`);setCampaignProgress('Guardado completo.')}
  catch(e){setError(e instanceof Error?e.message:'No se pudieron guardar los prospectos seleccionados.');setCampaignProgress('')}
  finally{setCampaignBusy(false)}
 }

 function exportExcel(){
  const rows=selectedResults.length?selectedResults:results
  if(!rows.length){setError('No hay resultados para exportar.');return}
  const headers=['Nombre','Categoría','Teléfono','Email','Dirección','Distancia','Fuente','Subcategoría','Latitud','Longitud','Website']
  const body=rows.map(p=>[p.name,category(categoryId)[2],p.phone||'',p.email||'',p.address||'',fmtDistance(p.dist),sourceLabel(p.source),p.subcategoria_label||'',p.lat,p.lng,p.website||''])
  const table=`<table><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body.map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  const html=`<!doctype html><html><head><meta charset="utf-8"></head><body>${table}</body></html>`
  const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel;charset=utf-8'})
  const url=URL.createObjectURL(blob),a=document.createElement('a'),stamp=new Date().toISOString().slice(0,10)
  a.href=url;a.download=`ugo-scout-${categoryId}-${stamp}.xls`;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  setStatus(`Excel generado con ${rows.length} profesionales.`)
 }

 function openEmailDraft(){
  if(!selectedEmails.length){setError('Los seleccionados no tienen email público disponible.');return}
  const subject='UGO · Convite para profissionais'
  const generic=recruitmentText.replaceAll('{nombre}','profissional').replaceAll('{categoria}',category(categoryId)[2]).replaceAll('{zona}',locationLabel)
  window.location.href=`mailto:?bcc=${encodeURIComponent(selectedEmails.map(p=>p.email).filter(Boolean).join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generic)}`
  setStatus(`Abrí un email para ${selectedEmails.length} contactos.`)
 }

 async function sendWhatsAppSelected(){
  const batch=selectedPhones.slice(0,20)
  if(!batch.length){setError('Seleccioná profesionales con WhatsApp/teléfono.');return}
  setCampaignBusy(true);setError('');setCampaignProgress(`Preparando campaña 0/${batch.length}…`)
  try{
   await persistProspects(batch);await loadProspects()
   const{data:saved,error:savedError}=await(supabase as any).from('prospectos_scouts').select('id,external_id').in('external_id',batch.map(p=>p.id))
   if(savedError)throw savedError
   const savedIds=new Map((saved||[]).map((row:any)=>[String(row.external_id),String(row.id)]))
   let token=await authToken(),sent=0,failed=0
   for(let i=0;i<batch.length;i++){
    const p=batch[i],payload={to:safePhone(p.phone),message:personalize(p),prospecto_id:savedIds.get(p.id)||null}
    let response=await fetch('/api/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)})
    if(response.status===401){token=await authToken(true);response=await fetch('/api/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)})}
    if(response.ok)sent++;else failed++
    setCampaignProgress(`WhatsApp ${i+1}/${batch.length} · enviados ${sent} · errores ${failed}`)
   }
   await loadProspects()
   setStatus(`Campaña WhatsApp finalizada: ${sent} enviados, ${failed} con error.${selectedPhones.length>20?' Se limitó este lote a 20 contactos.':''}`)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo completar la campaña de WhatsApp.')}
  finally{setCampaignBusy(false)}
 }

 async function setProspectState(row:Prospect,next:'invitado'|'aprobado'|'rechazado'){
  setBusyId(row.id);setError('')
  try{
   const{error}=await(supabase as any).from('prospectos_scouts').update({estado:next}).eq('id',row.id)
   if(error)throw error
   await loadProspects();setStatus(next==='invitado'?'Contacto registrado.':next==='aprobado'?'Prospecto aprobado para incorporación.':'Prospecto descartado.')
  }catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar el prospecto.')}finally{setBusyId('')}
 }

 async function generateOutreach(){
  if(!selected)return
  setBusyId('outreach');setError('')
  const[,emoji,label]=category(categoryId)
  const fallback=`Olá! Sou Hugo, do UGO. Estamos incorporando profissionais de ${label} na sua região. O UGO conecta você a clientes próximos sem mensalidade. Se tiver interesse, responda esta mensagem e seguimos com o cadastro. ${emoji}`
  try{
   const token=await authToken()
   const response=await fetch('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({mode:'admin',messages:[{role:'user',content:`Escreva uma mensagem WhatsApp curta, profissional e natural em português convidando ${selected.name}, profissional de ${label}, para conhecer o UGO. Máximo 70 palavras. Não invente benefícios financeiros.`}],max_tokens:180})})
   const payload=await response.json().catch(()=>({}))
   setOutreach(payload?.content?.[0]?.text?.trim()||fallback)
  }catch{setOutreach(fallback)}finally{setBusyId('')}
 }

 const selectedSaved=selected?prospects.find(p=>p.external_id===selected.id):null
 return <div className="ugo-scout">
  <header className="ugo-scout-head"><div><small>SCOUT UGO</small><h2>Prospección territorial de proveedores</h2><p>Buscá profesionales externos, guardalos como prospectos y registrá el contacto sin salir del panel.</p></div><div className="ugo-scout-stats"><div><b>{stats.saved}</b><span>En Supabase</span></div><div><b>{stats.contacted}</b><span>Contactados</span></div><div><b>{stats.approved}</b><span>Aprobados</span></div></div></header>
  <section className="ugo-scout-controls">
   <div className="ugo-scout-location"><label><span>Zona de búsqueda</span><strong>{locationLabel}</strong></label><button type="button" onClick={gps} disabled={geoBusy}>⌖ GPS</button></div>
   <div className="ugo-scout-searchline"><input value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void geocode()}} placeholder="Ciudad, barrio o dirección…"/><button type="button" onClick={()=>void geocode()} disabled={geoBusy||!address.trim()}>{geoBusy?'Ubicando…':'Ir'}</button></div>
   <div className="ugo-scout-searchline"><select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>{CATEGORIES.map(([id,emoji,label])=><option key={id} value={id}>{emoji} {label}</option>)}</select><select value={radius} onChange={e=>setRadius(Number(e.target.value))}><option value={2000}>2 km</option><option value={5000}>5 km</option><option value={10000}>10 km</option><option value={20000}>20 km</option><option value={50000}>50 km</option></select><button className="primary" type="button" onClick={()=>void search()} disabled={loading}>{loading?'Buscando…':'🔎 Buscar'}</button></div>
  </section>
  {error&&<div className="ugo-scout-error" role="alert">{error}<button type="button" onClick={()=>setError('')}>×</button></div>}
  <div className="ugo-scout-status" role="status">{status}</div>
  <section className="ugo-scout-recruit">
   <header><div><small>RECLUTAMIENTO SCOUT</small><strong>{selectedResults.length} seleccionados</strong></div><span>WhatsApp envía hasta 20 por lote para evitar disparos accidentales.</span></header>
   <textarea value={recruitmentText} onChange={e=>setRecruitmentText(e.target.value)} aria-label="Mensaje de reclutamiento"/><small className="ugo-scout-template-help">Variables: {'{nombre}'} · {'{categoria}'} · {'{zona}'}</small>
   <div className="ugo-scout-actions">
    <button type="button" onClick={()=>setChecked(results.length===checked.length?[]:results.map(p=>p.id))} disabled={!results.length}>{results.length&&checked.length===results.length?'Limpiar selección':'Seleccionar todos'}</button>
    <button type="button" onClick={()=>void saveSelected()} disabled={!selectedResults.length||campaignBusy}>💾 Guardar seleccionados</button>
    <button type="button" onClick={exportExcel} disabled={!results.length}>⬇ Excel {selectedResults.length?'seleccionados':'encontrados'}</button>
    <button type="button" className="primary" onClick={()=>void sendWhatsAppSelected()} disabled={!selectedPhones.length||campaignBusy}>WhatsApp ({selectedPhones.length})</button>
    <button type="button" onClick={openEmailDraft} disabled={!selectedEmails.length||campaignBusy}>Email ({selectedEmails.length})</button>
   </div>
   {campaignProgress&&<div className="ugo-scout-campaign-progress" role="status">{campaignProgress}</div>}
  </section>
  <div className="ugo-scout-main">
   <div className="ugo-scout-map"><div ref={mapEl}/>{!leafletReady&&<span>Cargando mapa…</span>}</div>
   <aside className="ugo-scout-outreach">{selected?<><small>PROFESIONAL SELECCIONADO</small><h3>{selected.name}</h3><p>{selected.address||locationLabel}</p><div className="ugo-scout-tags"><span>{fmtDistance(selected.dist)}</span><span>{sourceLabel(selected.source)}</span>{selected.subcategoria_label&&<span>{selected.subcategoria_label}</span>}</div>{selected.phone&&<b>📱 {selected.phone}</b>}{selected.email&&<b>✉ {selected.email}</b>}<div className="ugo-scout-actions"><button type="button" className="primary" onClick={()=>void saveProspect(selected)} disabled={busyId===selected.id}>{selectedSaved?'Actualizar prospecto':'+ Guardar en Scout'}</button><button type="button" onClick={()=>void generateOutreach()} disabled={busyId==='outreach'}>{busyId==='outreach'?'Generando…':'✦ Hugo'}</button></div>{outreach&&<div className="ugo-scout-message"><textarea readOnly value={outreach}/>{selected.phone&&<a href={`https://wa.me/${safePhone(selected.phone)}?text=${encodeURIComponent(outreach)}`} target="_blank" rel="noreferrer" onClick={()=>{if(selectedSaved)void setProspectState(selectedSaved,'invitado')}}>Abrir WhatsApp ↗</a>}</div>}</>:<div className="ugo-scout-empty">Seleccioná un resultado del mapa o de la lista para trabajar el contacto.</div>}</aside>
  </div>
  <section className="ugo-scout-results"><header><div><small>RESULTADOS DE BÚSQUEDA</small><strong>{results.length}</strong></div><span>{checked.length} seleccionados</span></header>{results.length?<div className="ugo-scout-result-grid">{results.map(p=><div key={p.id} className={`ugo-scout-result-card ${selected?.id===p.id?'active':''}`}><label className="ugo-scout-check"><input type="checkbox" checked={checked.includes(p.id)} onChange={e=>setChecked(current=>e.target.checked?[...current,p.id]:current.filter(id=>id!==p.id))}/><span>Seleccionar</span></label><button type="button" className="ugo-scout-result-open" onClick={()=>{setSelected(p);setOutreach('')}}><b>{p.name}</b><span>{p.phone||'Sin teléfono'}{p.email?` · ${p.email}`:''} · {fmtDistance(p.dist)}</span><small>{p.address||sourceLabel(p.source)}</small></button></div>)}</div>:<p>No hay resultados cargados. Elegí zona, categoría y radio y pulsá Buscar.</p>}</section>
  <section className="ugo-scout-prospects"><header><div><small>PROSPECTOS GUARDADOS</small><strong>{prospects.length}</strong></div><button type="button" onClick={()=>void loadProspects()}>↻ Actualizar</button></header>{prospects.length?<div className="ugo-scout-prospect-list">{prospects.slice(0,30).map(p=><article key={p.id}><div><b>{p.nombre}</b><span>{p.telefono||'Sin teléfono'} · {p.categoria}</span><small>{p.ciudad||'—'} · {sourceLabel(p.fuente)} · {new Date(p.created_at).toLocaleString('es-AR')}</small></div><em className={p.estado}>{p.estado.replaceAll('_',' ')}</em><div className="ugo-scout-actions">{p.estado==='prospecto_pendiente'&&<button type="button" onClick={()=>void setProspectState(p,'invitado')} disabled={busyId===p.id}>Contactado</button>}{p.estado!=='aprobado'&&p.estado!=='rechazado'&&<button type="button" className="primary" onClick={()=>void setProspectState(p,'aprobado')} disabled={busyId===p.id}>Aprobar</button>}{p.estado!=='rechazado'&&p.estado!=='aprobado'&&<button type="button" className="danger" onClick={()=>void setProspectState(p,'rechazado')} disabled={busyId===p.id}>Descartar</button>}</div></article>)}</div>:<p>Todavía no hay prospectos guardados.</p>}</section>
 </div>
}
