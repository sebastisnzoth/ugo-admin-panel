import React,{useEffect,useMemo,useState}from'react'
import{useRoleSession,type Category}from'../../../mvp/shared'
import{useClientFlow}from'../flow/clientFlow'
import{refreshProviderRadar,subscribeProviderRadar,type ProviderRadarRow}from'../radar/providerRadarStore'
import{UserProfileAvatar}from'../../../mvp/UserProfileAvatar'
import{ClientZipIcon}from'../ui/ClientZipIcon'

const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
export function ClientZipExplore(){
 const {supabase,session}=useRoleSession('client'),flow=useClientFlow()
 const[categories,setCategories]=useState<Category[]>([])
 const[providers,setProviders]=useState<ProviderRadarRow[]>([])
 const[term,setTerm]=useState(''),[categoryId,setCategoryId]=useState(''),[available,setAvailable]=useState(false)
 const[loading,setLoading]=useState(true),[error,setError]=useState('')
 const[refresh,setRefresh]=useState(0)
 useEffect(()=>{
  if(!session)return
  let alive=true
  setLoading(true);setError('')
  void supabase.from('categorias').select('id,nombre,slug,emoji').eq('activa',true).order('nombre').then(({data,error:loadError})=>{
   if(!alive)return
   if(loadError)setError('No pudimos cargar las categorías. Reintentá.')
   setCategories((data||[]) as Category[])
   setLoading(false)
  })
  return()=>{alive=false}
 },[supabase,session,refresh])
 useEffect(()=>{
  const unsubscribe=subscribeProviderRadar(s=>setProviders(s.providers))
  void refreshProviderRadar(supabase,true).catch(()=>setError('El radar de profesionales está temporalmente limitado. Podés solicitar tu servicio igualmente.'))
  return()=>{unsubscribe()}
 },[supabase,refresh])
 const filtered=useMemo(()=>providers.filter(p=>{
  if(p.estado_verificacion!=='verificado')return false
  if(available&&!(p.online&&p.disponible))return false
  if(categoryId&&!(p.categoria_principal_id===categoryId||p.categoria_ids?.includes(categoryId)))return false
  const haystack=normalize([p.nombre,p.categoria_nombre,p.especialidades,p.bio].filter(Boolean).join(' '))
  return !term.trim()||haystack.includes(normalize(term.trim()))
 }),[providers,term,categoryId,available])
 const shownCategories=useMemo(()=>categories.filter(c=>!term.trim()||normalize(c.nombre).includes(normalize(term.trim()))),[categories,term])
 const request=(category?:Category)=>{
  if(category)flow.publishHugoIntent({text:`Necesito ${category.nombre}`,categoryHint:category.slug||category.nombre,urgent:false,description:null})
  else flow.navigate('request')
 }
 return <main className="ugo-zip-explore" aria-label="Explorar servicios">
  <div className="ugo-zip-section-title"><div><span>EXPLORÁ UGO</span><h2>Encontrá el servicio que necesitás</h2><p>Categorías y profesionales registrados en UGO, actualizados desde TEST.</p></div></div>
  <div className="ugo-zip-searchpanel"><div className="ugo-zip-searchbox"><ClientZipIcon name="explore"/><input aria-label="Buscar servicios" type="search" value={term} onChange={e=>setTerm(e.target.value)} placeholder="¿Qué servicio estás buscando?"/></div><button type="button" className={available?'selected':''} onClick={()=>setAvailable(v=>!v)}>⌖ {available?'Solo disponibles':'Ver disponibles'}</button></div>
  <section className="ugo-zip-explore-group" aria-label="Categorías de UGO">
   <div className="ugo-zip-section-title"><div><h2>Categorías de servicios</h2><p>Elegí una categoría para comenzar un pedido real.</p></div><span>{shownCategories.length} categorías</span></div>
   {loading?<p role="status">Cargando categorías…</p>:<div className="ugo-zip-explore-categories">{shownCategories.map(c=><button key={c.id} className={c.id===categoryId?'selected':''} type="button" onClick={()=>setCategoryId(v=>v===c.id?'':c.id)}><span>{c.emoji||'🧰'}</span><strong>{c.nombre}</strong><small>{categoryId===c.id?'Quitar filtro':'Ver profesionales'}</small></button>)}</div>}
   {!loading&&shownCategories.length===0&&<p>No se encontraron categorías con ese nombre.</p>}
  </section>
  <section className="ugo-zip-explore-group" aria-label="Profesionales de UGO">
   <div className="ugo-zip-section-title"><div><h2>Profesionales cerca tuyo</h2><p>Solo perfiles verificados. La disponibilidad se confirma al crear el pedido.</p></div><span>{filtered.length} resultados</span></div>
   {error&&<div className="ugo-zip-notice" role="status">{error} <button type="button" onClick={()=>setRefresh(n=>n+1)}>Reintentar</button></div>}
   {filtered.length===0?<div className="ugo-zip-no-providers"><strong>No hay profesionales que coincidan con el filtro.</strong><p>Podés solicitar un servicio y UGO iniciará la búsqueda siguiendo sus reglas de matching.</p><button type="button" onClick={()=>request(categories.find(c=>c.id===categoryId))}>Solicitar servicio →</button></div>:
   <div className="ugo-zip-provider-grid">{filtered.map(p=><article key={p.id} className="ugo-zip-provider">
    <UserProfileAvatar name={p.nombre||'Profesional UGO'} role="provider" photoUrl={p.foto_url} size={58}/>
    <div className="ugo-zip-provider-info"><strong>{p.nombre||'Profesional UGO'}</strong><small>{p.categoria_nombre||'Servicios para el hogar'}</small><div className="ugo-zip-provider-badges"><span>✓ Verificado</span>{p.karma!=null&&Number(p.karma)>0&&<span>★ {Number(p.karma).toFixed(1)}</span>}{p.online&&p.disponible&&<span>Disponible</span>}</div></div>
    <button type="button" onClick={()=>request(categories.find(c=>c.id===p.categoria_principal_id))}>Solicitar →</button>
   </article>)}</div>}
  </section>
 </main>
}
