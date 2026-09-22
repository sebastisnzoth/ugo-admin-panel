import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import{supabase}from'../lib/supabase'
import'./scout-section.css'

declare const L:any

type Provider={id:string;name:string;phone?:string;email?:string;address?:string;lat:number;lng:number;dist:number;website?:string;source?:string;subcategoria_label?:string}
type Prospect={id:string;external_id:string|null;nombre:string;categoria:string;telefono:string|null;email:string|null;website:string|null;direccion:string|null;ciudad:string|null;pais:string|null;latitud:number|null;longitud:number|null;fuente:string;score_confianza:number;estado:string;notas_hugo:string|null;created_at:string;updated_at:string;contactado_at:string|null;aprobado_at:string|null;pipeline_etapa:string;recruitment_score:number;contactos_intentos:number;ultimo_canal:string|null;ultimo_contacto_at:string|null;proximo_contacto_at:string|null;no_contactar:boolean;invitation_token:string|null}
type DbProvider={id:string;nombre:string;lat:number|null;lng:number|null;categoria:string|null;cat_emoji:string|null;pin_color:string|null;estado_mapa:string|null;telefono:string|null;zona:string|null}
type DemandRow={slug:string;nombre:string;emoji:string|null;pedidos_30d:number;proveedores_activos:number;brecha:number;prioridad:string}

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
const safeWebsite=(value?:string|null)=>{try{const raw=String(value||'').trim();if(!raw)return'';const u=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);return ['http:','https:'].includes(u.protocol)?u.toString():''}catch{return''}}
const PIPELINE=[['nuevo','Nuevo'],['listo','Listo para contactar'],['contactado','Contactado'],['respondio','Respondió'],['interesado','Interesado'],['registro_iniciado','Registro iniciado'],['documentos_pendientes','Documentos pendientes'],['aprobado','Aprobado'],['activo','Activo'],['no_interesado','No interesado']] as const
const pipelineLabel=(value:string)=>PIPELINE.find(([id])=>id===value)?.[1]||value.replaceAll('_',' ')
const demandScoutKey=(slug:string)=>({electricidad:'electricista',plomeria:'plomero',limpieza:'limpeza',cerrajeria:'chaveiro',pintura:'pintura',jardineria:'jardinagem',reparaciones:'reformas'} as Record<string,string>)[slug]||slug
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
 const[savedCategory,setSavedCategory]=useState('all'),[pipelineFilter,setPipelineFilter]=useState('all'),[prospectSearch,setProspectSearch]=useState(''),[followupOnly,setFollowupOnly]=useState(false)
 const[selectedProspect,setSelectedProspect]=useState<Prospect|null>(null),[prospectDraft,setProspectDraft]=useState<Prospect|null>(null),[prospectBusy,setProspectBusy]=useState(false)
 const[demand,setDemand]=useState<DemandRow[]>([]),[emailSubject,setEmailSubject]=useState('UGO · Convite para profissionais')
 const[recruitmentText,setRecruitmentText]=useState('Olá {nombre}! Sou da equipe UGO. Estamos convidando profissionais de {categoria} em {zona} para conhecer a plataforma e receber oportunidades de clientes próximos. Se tiver interesse, responda esta mensagem e eu te explico como funciona. Se não quiser receber novos contatos, é só me avisar.')

 const loadProspects=useCallback(async()=>{
  const pageSize=500,all:Prospect[]=[]
  for(let from=0;from<10000;from+=pageSize){
   const{data,error}=await(supabase as any).from('prospectos_scouts').select('id,external_id,nombre,categoria,telefono,email,website,direccion,ciudad,pais,latitud,longitud,fuente,score_confianza,estado,notas_hugo,created_at,updated_at,contactado_at,aprobado_at,pipeline_etapa,recruitment_score,contactos_intentos,ultimo_canal,ultimo_contacto_at,proximo_contacto_at,no_contactar,invitation_token').order('created_at',{ascending:false}).range(from,from+pageSize-1)
   if(error)throw error
   const page=(data||[])as Prospect[];all.push(...page)
   if(page.length<pageSize)break
  }
  setProspects(all)
 },[])

 const loadDbProviders=useCallback(async()=>{
  const{data,error}=await(supabase as any).from('vista_todos_proveedores').select('id,nombre,lat,lng,categoria,cat_emoji,pin_color,estado_mapa,telefono,zona').not('lat','is',null).not('lng','is',null).limit(500)
  if(error)throw error
  setDbProviders((data||[])as DbProvider[])
 },[])
 const loadDemand=useCallback(async()=>{
  const{data,error}=await(supabase as any).from('scout_demanda_categorias').select('slug,nombre,emoji,pedidos_30d,proveedores_activos,brecha,prioridad').order('brecha',{ascending:false})
  if(error)throw error
  setDemand((data||[])as DemandRow[])
 },[])

 useEffect(()=>{void Promise.all([loadProspects(),loadDbProviders(),loadDemand()]).catch(e=>setError(e instanceof Error?e.message:'No se pudo cargar Scout.'))},[loadProspects,loadDbProviders,loadDemand])

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
 const categoryStats=useMemo(()=>CATEGORIES.map(([id,emoji,label])=>({id,emoji,label,total:prospects.filter(p=>p.categoria===id).length})).filter(x=>x.total>0),[prospects])
 const demandByScout=useMemo(()=>new Map(demand.map(row=>[demandScoutKey(row.slug),row])),[demand])
 const dueNow=Date.now()
 const visibleProspects=useMemo(()=>prospects.filter(p=>{
  if(savedCategory!=='all'&&p.categoria!==savedCategory)return false
  if(pipelineFilter!=='all'&&p.pipeline_etapa!==pipelineFilter)return false
  if(followupOnly&&(!p.proximo_contacto_at||new Date(p.proximo_contacto_at).getTime()>Date.now()||p.no_contactar))return false
  const q=prospectSearch.trim().toLowerCase()
  if(q&&!([p.nombre,p.telefono,p.email,p.ciudad,p.direccion].filter(Boolean).join(' ').toLowerCase().includes(q)))return false
  return true
 }),[prospects,savedCategory,pipelineFilter,followupOnly,prospectSearch])
 const funnel=useMemo(()=>({
  nuevos:prospects.filter(p=>['nuevo','listo'].includes(p.pipeline_etapa)).length,
  contactados:prospects.filter(p=>p.pipeline_etapa==='contactado').length,
  respondieron:prospects.filter(p=>['respondio','interesado'].includes(p.pipeline_etapa)).length,
  registro:prospects.filter(p=>['registro_iniciado','documentos_pendientes'].includes(p.pipeline_etapa)).length,
  activos:prospects.filter(p=>p.pipeline_etapa==='activo').length,
  seguimiento:prospects.filter(p=>p.proximo_contacto_at&&!p.no_contactar&&new Date(p.proximo_contacto_at).getTime()<=dueNow).length
 }),[prospects,dueNow])
 const savedEmails=useMemo(()=>visibleProspects.filter(p=>Boolean(p.email)&&!p.no_contactar),[visibleProspects])
 const websitesMissingEmail=useMemo(()=>visibleProspects.filter(p=>!p.email&&Boolean(p.website)&&!p.no_contactar),[visibleProspects])
 const personalize=(p:Provider)=>recruitmentText.replaceAll('{nombre}',p.name||'profissional').replaceAll('{categoria}',category(categoryId)[2]).replaceAll('{zona}',locationLabel)
 const prospectMessage=(p:Prospect)=>recruitmentText.replaceAll('{nombre}',p.nombre||'profissional').replaceAll('{categoria}',category(p.categoria)[2]).replaceAll('{zona}',p.ciudad||locationLabel)

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
 async function saveAllResults(){
  if(!results.length)return
  setCampaignBusy(true);setError('');setCampaignProgress(`Guardando ${results.length} encontrados…`)
  try{await persistProspects(results);await loadProspects();setStatus(`${results.length} resultados guardados en Scout.`);setCampaignProgress('Guardado completo.')}
  catch(e){setError(e instanceof Error?e.message:'No se pudieron guardar todos los encontrados.');setCampaignProgress('')}
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

 function chunks<T>(items:T[],size:number){const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}

 async function scoutAction(body:Record<string,unknown>){
  const request=async(token:string)=>fetch('/api/scout/places',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)})
  let response=await request(await authToken())
  if(response.status===401)response=await request(await authToken(true))
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(payload.error||`Scout respondió HTTP ${response.status}`)
  return payload
 }

 async function collectPublicEmails(){
  if(!websitesMissingEmail.length){setStatus('No hay sitios pendientes de revisar en esta vista.');return}
  setCampaignBusy(true);setError('');let found=0,checkedSites=0
  try{
   for(const batch of chunks(websitesMissingEmail,12)){
    setCampaignProgress(`Buscando emails públicos… ${checkedSites}/${websitesMissingEmail.length} · encontrados ${found}`)
    const payload=await scoutAction({action:'enrich_emails',ids:batch.map(p=>p.id)})
    checkedSites+=Number(payload.checked||batch.length);found+=Number(payload.found||0)
   }
   await loadProspects();setCampaignProgress('');setStatus(`Recopilación terminada: ${found} emails encontrados en ${checkedSites} sitios públicos.`)
  }catch(e){setError(e instanceof Error?e.message:'No se pudieron recopilar los emails públicos.')}
  finally{setCampaignBusy(false)}
 }

 function openSavedEmailDraft(){
  if(!savedEmails.length){setError('Esta vista todavía no tiene emails disponibles.');return}
  const generic=recruitmentText.replaceAll('{nombre}','profissional').replaceAll('{categoria}',savedCategory==='all'?'serviços':category(savedCategory)[2]).replaceAll('{zona}',locationLabel)
  const bcc=savedEmails.slice(0,80).map(p=>p.email).filter(Boolean).join(',')
  window.location.href=`mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(generic)}`
  setStatus(`Abrí BCC con ${Math.min(savedEmails.length,80)} emails.`)
 }

 async function sendSavedEmailCampaign(){
  if(!savedEmails.length){setError('Esta vista todavía no tiene emails disponibles.');return}
  if(!window.confirm(`Enviar email de reclutamiento a ${savedEmails.length} prospectos visibles?`))return
  setCampaignBusy(true);setError('');let sent=0,failed=0,done=0
  try{
   for(const batch of chunks(savedEmails,20)){
    setCampaignProgress(`Email ${done}/${savedEmails.length} · enviados ${sent} · errores ${failed}`)
    const payload=await scoutAction({action:'email_campaign',ids:batch.map(p=>p.id),subject:emailSubject,message:recruitmentText,zona:locationLabel})
    sent+=Number(payload.sent||0);failed+=Number(payload.failed||0);done+=batch.length
   }
   await loadProspects();setCampaignProgress('');setStatus(`Campaña finalizada: ${sent} emails enviados · ${failed} errores.`)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo completar la campaña de email.')}
  finally{setCampaignBusy(false)}
 }

 function openProspectCard(p:Prospect){setSelectedProspect(p);setProspectDraft({...p});setError('')}
 function closeProspectCard(){setSelectedProspect(null);setProspectDraft(null);setProspectBusy(false)}
 const legacyStateForPipeline=(stage:string)=>stage==='activo'||stage==='aprobado'?'aprobado':stage==='no_interesado'?'rechazado':['contactado','respondio','interesado','registro_iniciado','documentos_pendientes'].includes(stage)?'invitado':'prospecto_pendiente'

 async function saveProspectCard(){
  if(!prospectDraft)return
  setProspectBusy(true);setError('')
  try{
   const patch={
    nombre:prospectDraft.nombre.trim(),categoria:prospectDraft.categoria,telefono:prospectDraft.telefono?.trim()||null,email:prospectDraft.email?.trim()||null,
    website:prospectDraft.website?.trim()||null,direccion:prospectDraft.direccion?.trim()||null,ciudad:prospectDraft.ciudad?.trim()||null,pais:prospectDraft.pais||'BR',
    estado:legacyStateForPipeline(prospectDraft.pipeline_etapa),pipeline_etapa:prospectDraft.pipeline_etapa,score_confianza:Math.max(0,Math.min(100,Number(prospectDraft.score_confianza)||0)),
    notas_hugo:prospectDraft.notas_hugo?.trim()||null,proximo_contacto_at:prospectDraft.proximo_contacto_at||null,no_contactar:Boolean(prospectDraft.no_contactar)
   }
   const{data,error}=await(supabase as any).from('prospectos_scouts').update(patch).eq('id',prospectDraft.id).select('id,external_id,nombre,categoria,telefono,email,website,direccion,ciudad,pais,latitud,longitud,fuente,score_confianza,estado,notas_hugo,created_at,updated_at,contactado_at,aprobado_at,pipeline_etapa,recruitment_score,contactos_intentos,ultimo_canal,ultimo_contacto_at,proximo_contacto_at,no_contactar,invitation_token').single()
   if(error)throw error
   setSelectedProspect(data as Prospect);setProspectDraft(data as Prospect);await loadProspects();setStatus(`Ficha de ${data.nombre} actualizada.`)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar la ficha Scout.')}
  finally{setProspectBusy(false)}
 }

 async function registerContact(p:Prospect,canal:'whatsapp'|'email'){
  if(p.no_contactar)throw new Error('Este prospecto está marcado como no contactar.')
  const now=new Date(),next=new Date(now.getTime()+2*24*60*60*1000)
  const patch:any={estado:p.estado==='prospecto_pendiente'?'invitado':p.estado,pipeline_etapa:['nuevo','listo'].includes(p.pipeline_etapa)?'contactado':p.pipeline_etapa,contactado_at:p.contactado_at||now.toISOString(),ultimo_contacto_at:now.toISOString(),ultimo_canal:canal,contactos_intentos:Number(p.contactos_intentos||0)+1,proximo_contacto_at:next.toISOString()}
  const{data,error}=await(supabase as any).from('prospectos_scouts').update(patch).eq('id',p.id).select('id,external_id,nombre,categoria,telefono,email,website,direccion,ciudad,pais,latitud,longitud,fuente,score_confianza,estado,notas_hugo,created_at,updated_at,contactado_at,aprobado_at,pipeline_etapa,recruitment_score,contactos_intentos,ultimo_canal,ultimo_contacto_at,proximo_contacto_at,no_contactar,invitation_token').single()
  if(error)throw error
  setSelectedProspect(data as Prospect);setProspectDraft(data as Prospect);await loadProspects()
 }

 function contactProspectWhatsApp(p:Prospect){
  const phone=safePhone(p.telefono);if(phone.length<10){setError('Este prospecto no tiene un teléfono válido.');return}
  if(p.no_contactar){setError('Este prospecto está marcado como no contactar.');return}
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(prospectMessage(p))}`,'_blank','noopener,noreferrer')
  void registerContact(p,'whatsapp').then(()=>setStatus(`WhatsApp registrado para ${p.nombre}; seguimiento programado en 2 días.`)).catch(e=>setError(e instanceof Error?e.message:'No se pudo registrar el contacto.'))
 }

 function contactProspectEmail(p:Prospect){
  const email=String(p.email||'').trim();if(!email){setError('Este prospecto todavía no tiene email.');return}
  if(p.no_contactar){setError('Este prospecto está marcado como no contactar.');return}
  window.location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(prospectMessage(p))}`
  void registerContact(p,'email').then(()=>setStatus(`Email registrado para ${p.nombre}; seguimiento programado en 2 días.`)).catch(e=>setError(e instanceof Error?e.message:'No se pudo registrar el contacto.'))
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
   <input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} aria-label="Asunto de email" placeholder="Asunto del email"/>
   <textarea value={recruitmentText} onChange={e=>setRecruitmentText(e.target.value)} aria-label="Mensaje de reclutamiento"/><small className="ugo-scout-template-help">Variables: {'{nombre}'} · {'{categoria}'} · {'{zona}'}</small>
   <div className="ugo-scout-actions">
    <button type="button" onClick={()=>setChecked(results.length===checked.length?[]:results.map(p=>p.id))} disabled={!results.length}>{results.length&&checked.length===results.length?'Limpiar selección':'Seleccionar todos'}</button>
    <button type="button" onClick={()=>void saveSelected()} disabled={!selectedResults.length||campaignBusy}>💾 Guardar seleccionados</button>
    <button type="button" onClick={()=>void saveAllResults()} disabled={!results.length||campaignBusy}>Guardar todos ({results.length})</button>
    <button type="button" onClick={exportExcel} disabled={!results.length}>⬇ Excel {selectedResults.length?'seleccionados':'encontrados'}</button>
    <button type="button" className="primary" onClick={()=>void sendWhatsAppSelected()} disabled={!selectedPhones.length||campaignBusy}>WhatsApp ({selectedPhones.length})</button>
    <button type="button" onClick={openEmailDraft} disabled={!selectedEmails.length||campaignBusy}>Email ({selectedEmails.length})</button>
   </div>
   {campaignProgress&&<div className="ugo-scout-campaign-progress" role="status">{campaignProgress}</div>}
  </section>
  <section className="ugo-scout-funnel">
   <header><div><small>EMBUDO DE RECLUTAMIENTO</small><strong>Priorizar, contactar y seguir</strong></div></header>
   <div className="ugo-scout-funnel-grid"><div><b>{funnel.nuevos}</b><span>Nuevos</span></div><div><b>{funnel.contactados}</b><span>Contactados</span></div><div><b>{funnel.respondieron}</b><span>Respondieron</span></div><div><b>{funnel.registro}</b><span>En registro</span></div><div><b>{funnel.activos}</b><span>Activos</span></div><button type="button" className={followupOnly?'active':''} onClick={()=>setFollowupOnly(v=>!v)}><b>{funnel.seguimiento}</b><span>Seguimientos vencidos</span></button></div>
   {demand.some(d=>d.prioridad!=='normal')&&<div className="ugo-scout-demand"><small>DEMANDA UGO · ÚLTIMOS 30 DÍAS</small>{demand.filter(d=>d.prioridad!=='normal').slice(0,6).map(d=>{const key=demandScoutKey(d.slug);return <button type="button" key={d.slug} onClick={()=>{setCategoryId(key);setSavedCategory(key)}}><b>{d.emoji||'🛠️'} {d.nombre}</b><span>{d.pedidos_30d} pedidos · {d.proveedores_activos} proveedores · brecha {d.brecha}</span><em>{d.prioridad}</em></button>})}</div>}
  </section>
  <div className="ugo-scout-main">
   <div className="ugo-scout-map"><div ref={mapEl}/>{!leafletReady&&<span>Cargando mapa…</span>}</div>
   <aside className="ugo-scout-outreach">{selected?<><small>PROFESIONAL SELECCIONADO</small><h3>{selected.name}</h3><p>{selected.address||locationLabel}</p><div className="ugo-scout-tags"><span>{fmtDistance(selected.dist)}</span><span>{sourceLabel(selected.source)}</span>{selected.subcategoria_label&&<span>{selected.subcategoria_label}</span>}</div>{selected.phone&&<b>📱 {selected.phone}</b>}{selected.email&&<b>✉ {selected.email}</b>}<div className="ugo-scout-actions"><button type="button" className="primary" onClick={()=>void saveProspect(selected)} disabled={busyId===selected.id}>{selectedSaved?'Actualizar prospecto':'+ Guardar en Scout'}</button><button type="button" onClick={()=>void generateOutreach()} disabled={busyId==='outreach'}>{busyId==='outreach'?'Generando…':'✦ Hugo'}</button></div>{outreach&&<div className="ugo-scout-message"><textarea readOnly value={outreach}/>{selected.phone&&<a href={`https://wa.me/${safePhone(selected.phone)}?text=${encodeURIComponent(outreach)}`} target="_blank" rel="noreferrer" onClick={()=>{if(selectedSaved)void setProspectState(selectedSaved,'invitado')}}>Abrir WhatsApp ↗</a>}</div>}</>:<div className="ugo-scout-empty">Seleccioná un resultado del mapa o de la lista para trabajar el contacto.</div>}</aside>
  </div>
  <section className="ugo-scout-results"><header><div><small>RESULTADOS DE BÚSQUEDA</small><strong>{results.length}</strong></div><span>{checked.length} seleccionados</span></header>{results.length?<div className="ugo-scout-result-grid">{results.map(p=><div key={p.id} className={`ugo-scout-result-card ${selected?.id===p.id?'active':''}`}><label className="ugo-scout-check"><input type="checkbox" checked={checked.includes(p.id)} onChange={e=>setChecked(current=>e.target.checked?[...current,p.id]:current.filter(id=>id!==p.id))}/><span>Seleccionar</span></label><button type="button" className="ugo-scout-result-open" onClick={()=>{setSelected(p);setOutreach('')}}><b>{p.name}</b><span>{p.phone||'Sin teléfono'}{p.email?` · ${p.email}`:''} · {fmtDistance(p.dist)}</span><small>{p.address||sourceLabel(p.source)}</small></button></div>)}</div>:<p>No hay resultados cargados. Elegí zona, categoría y radio y pulsá Buscar.</p>}</section>
  <section className="ugo-scout-prospects">
   <header><div><small>CRM SCOUT POR CATEGORÍA</small><strong>{prospects.length} prospectos · {savedEmails.length} emails en vista</strong></div><button type="button" onClick={()=>void loadProspects()}>↻ Actualizar</button></header>
   <div className="ugo-scout-category-tabs"><button type="button" className={savedCategory==='all'?'active':''} onClick={()=>setSavedCategory('all')}>Todos <b>{prospects.length}</b></button>{categoryStats.map(c=><button type="button" key={c.id} className={savedCategory===c.id?'active':''} onClick={()=>setSavedCategory(c.id)}>{c.emoji} {c.label} <b>{c.total}</b>{demandByScout.get(c.id)?.prioridad==='alta'&&<small>ALTA</small>}</button>)}</div>
   <div className="ugo-scout-crm-toolbar"><input value={prospectSearch} onChange={e=>setProspectSearch(e.target.value)} placeholder="Buscar nombre, teléfono, email, ciudad…"/><select value={pipelineFilter} onChange={e=>setPipelineFilter(e.target.value)}><option value="all">Todo el embudo</option>{PIPELINE.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><button type="button" className={followupOnly?'active':''} onClick={()=>setFollowupOnly(v=>!v)}>Seguimientos ({funnel.seguimiento})</button><button type="button" onClick={()=>void collectPublicEmails()} disabled={!websitesMissingEmail.length||campaignBusy}>Recopilar emails ({websitesMissingEmail.length})</button><button type="button" onClick={openSavedEmailDraft} disabled={!savedEmails.length}>BCC ({savedEmails.length})</button><button type="button" className="primary" onClick={()=>void sendSavedEmailCampaign()} disabled={!savedEmails.length||campaignBusy}>Enviar email ({savedEmails.length})</button></div>
   {visibleProspects.length?<div className="ugo-scout-prospect-list">{visibleProspects.map(p=><article key={p.id} className={selectedProspect?.id===p.id?'active':''}><button type="button" className="ugo-scout-prospect-main" onClick={()=>openProspectCard(p)}><div className="ugo-scout-prospect-title"><b>{p.nombre}</b><em className={p.pipeline_etapa}>{pipelineLabel(p.pipeline_etapa)}</em><i>Score {p.recruitment_score}</i></div><span>{p.telefono||'Sin teléfono'} · {p.email||'Sin email'} · {category(p.categoria)[2]}</span><small>{p.ciudad||'—'} · {sourceLabel(p.fuente)} · contactos {p.contactos_intentos||0}{p.proximo_contacto_at?` · próximo ${new Date(p.proximo_contacto_at).toLocaleString('es-AR')}`:''}{p.no_contactar?' · NO CONTACTAR':''}</small></button><div className="ugo-scout-actions"><button type="button" onClick={()=>openProspectCard(p)}>Ficha</button><button type="button" onClick={()=>contactProspectWhatsApp(p)} disabled={!p.telefono||p.no_contactar}>WhatsApp</button><button type="button" onClick={()=>contactProspectEmail(p)} disabled={!p.email||p.no_contactar}>Email</button>{p.estado!=='aprobado'&&p.estado!=='rechazado'&&<button type="button" className="primary" onClick={()=>void setProspectState(p,'aprobado')} disabled={busyId===p.id}>Aprobar</button>}</div></article>)}</div>:<p>No hay prospectos con estos filtros.</p>}
  </section>
  {selectedProspect&&prospectDraft&&<div className="ugo-scout-card-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeProspectCard()}}>
   <section className="ugo-scout-card" role="dialog" aria-modal="true" aria-label={`Ficha Scout de ${selectedProspect.nombre}`}>
    <header><div><small>FICHA SCOUT</small><h3>{selectedProspect.nombre}</h3><p>{category(selectedProspect.categoria)[2]} · Score {selectedProspect.recruitment_score} · {pipelineLabel(selectedProspect.pipeline_etapa)}</p></div><button type="button" className="ugo-scout-card-close" onClick={closeProspectCard}>×</button></header>
    <div className="ugo-scout-card-meta"><span>Guardado {new Date(selectedProspect.created_at).toLocaleString('es-AR')}</span><span>Último contacto {selectedProspect.ultimo_contacto_at?new Date(selectedProspect.ultimo_contacto_at).toLocaleString('es-AR'):'—'}</span><span>Intentos {selectedProspect.contactos_intentos||0}</span></div>
    <div className="ugo-scout-card-contact"><button type="button" className="primary" onClick={()=>contactProspectWhatsApp(selectedProspect)} disabled={!selectedProspect.telefono||selectedProspect.no_contactar}>WhatsApp</button><button type="button" onClick={()=>contactProspectEmail(selectedProspect)} disabled={!selectedProspect.email||selectedProspect.no_contactar}>Email</button>{safeWebsite(selectedProspect.website)&&<a href={safeWebsite(selectedProspect.website)} target="_blank" rel="noreferrer">Sitio web ↗</a>}</div>
    <div className="ugo-scout-card-grid">
     <label><span>Nombre</span><input value={prospectDraft.nombre} onChange={e=>setProspectDraft({...prospectDraft,nombre:e.target.value})}/></label>
     <label><span>Categoría</span><select value={prospectDraft.categoria} onChange={e=>setProspectDraft({...prospectDraft,categoria:e.target.value})}>{CATEGORIES.map(([id,emoji,label])=><option key={id} value={id}>{emoji} {label}</option>)}</select></label>
     <label><span>Teléfono / WhatsApp</span><input value={prospectDraft.telefono||''} onChange={e=>setProspectDraft({...prospectDraft,telefono:e.target.value})}/></label>
     <label><span>Email</span><input type="email" value={prospectDraft.email||''} onChange={e=>setProspectDraft({...prospectDraft,email:e.target.value})}/></label>
     <label className="wide"><span>Sitio web</span><input value={prospectDraft.website||''} onChange={e=>setProspectDraft({...prospectDraft,website:e.target.value})}/></label>
     <label className="wide"><span>Dirección</span><input value={prospectDraft.direccion||''} onChange={e=>setProspectDraft({...prospectDraft,direccion:e.target.value})}/></label>
     <label><span>Ciudad</span><input value={prospectDraft.ciudad||''} onChange={e=>setProspectDraft({...prospectDraft,ciudad:e.target.value})}/></label>
     <label><span>Etapa del embudo</span><select value={prospectDraft.pipeline_etapa} onChange={e=>setProspectDraft({...prospectDraft,pipeline_etapa:e.target.value})}>{PIPELINE.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
     <label><span>Próximo seguimiento</span><input type="datetime-local" value={prospectDraft.proximo_contacto_at?new Date(prospectDraft.proximo_contacto_at).toISOString().slice(0,16):''} onChange={e=>setProspectDraft({...prospectDraft,proximo_contacto_at:e.target.value?new Date(e.target.value).toISOString():null})}/></label>
     <label><span>Confianza</span><input type="number" min="0" max="100" value={prospectDraft.score_confianza} onChange={e=>setProspectDraft({...prospectDraft,score_confianza:Number(e.target.value)})}/></label>
     <label className="ugo-scout-card-check"><input type="checkbox" checked={prospectDraft.no_contactar} onChange={e=>setProspectDraft({...prospectDraft,no_contactar:e.target.checked})}/><span>No contactar nuevamente</span></label>
     <label className="wide"><span>Notas</span><textarea value={prospectDraft.notas_hugo||''} onChange={e=>setProspectDraft({...prospectDraft,notas_hugo:e.target.value})}/></label>
    </div>
    <div className="ugo-scout-card-preview"><small>MENSAJE DE RECLUTAMIENTO</small><p>{prospectMessage(prospectDraft)}</p></div>
    <footer><button type="button" onClick={closeProspectCard}>Cerrar</button><button type="button" className="primary" onClick={()=>void saveProspectCard()} disabled={prospectBusy}>{prospectBusy?'Guardando…':'Guardar cambios'}</button></footer>
   </section>
  </div>}
 </div>
}
