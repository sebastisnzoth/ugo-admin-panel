import React,{useEffect,useMemo,useState}from'react'
import{UGO_CLIENT_GUIDED_REQUEST_OPEN}from'../ClientQuickOrder'
import{useRoleSession,type Category}from'../shared'
import{useClientFlow}from'./clientFlow'
import{ClientStudioProviderRadar}from'./ClientStudioProviderRadar'
import{refreshProviderRadar,type ProviderRadarRow}from'./providerRadarStore'

const normalize=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()
const categoryAliases:Record<string,string[]>={
 electricidad:['electricista','electricidad','electrico','electrica','eletricista','eletrica','enchufe','tomacorriente'],
 jardineria:['jardinero','jardineria','jardin','jardineiro','jardinagem','pasto','cesped'],
 plomeria:['plomero','plomeria','fontanero','encanador','encanamento','canilla','grifo'],
 limpieza:['limpieza','limpiador','limpiadora','limpeza','faxina','diarista'],
 pintura:['pintor','pintura'],
 cerrajeria:['cerrajero','cerrajeria','chaveiro'],
 reparaciones:['reparacion','reparaciones','reparar','arreglar','conserto','manutencao'],
}

function aliasesForCategory(category:Category){
 const name=normalize(category.nombre),slug=normalize(category.slug)
 return Object.entries(categoryAliases).flatMap(([key,aliases])=>slug.includes(key)||name.includes(key)?aliases:[])
}

function matchCategory(categories:Category[],hint?:string|null){
 const target=normalize(String(hint||''))
 if(!target)return null
 const direct=categories.find(category=>{const name=normalize(category.nombre),slug=normalize(category.slug);return name.includes(target)||target.includes(name)||slug.includes(target)||target.includes(slug)})
 if(direct)return direct
 return categories.find(category=>aliasesForCategory(category).some(alias=>{const normalizedAlias=normalize(alias);return target===normalizedAlias||target.includes(normalizedAlias)||normalizedAlias.includes(target)}))||null
}

function intentNamesCategory(text:string,category:Category|null){
 if(!category)return false
 const q=normalize(text),slug=normalize(category.slug),name=normalize(category.nombre)
 if(q.includes(slug)||q.includes(name))return true
 return aliasesForCategory(category).some(alias=>q.includes(normalize(alias)))
}

export function ClientProviderRadarBridge(){
 const flow=useClientFlow()
 const{session,supabase}=useRoleSession('client')
 const[categories,setCategories]=useState<Category[]>([])
 const[selectedCategoryId,setSelectedCategoryId]=useState('')
 useEffect(()=>{if(!session)return;let alive=true;supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre').then(({data})=>{if(alive)setCategories((data||[])as Category[])});return()=>{alive=false}},[session,supabase])
 useEffect(()=>{if(!session)return;let alive=true;const refresh=async()=>{try{await refreshProviderRadar(supabase,true)}catch(error){if(alive)console.warn('No pudimos sincronizar el radar compartido.',error)}};void refresh();const ch=supabase.channel(`client-provider-radar-${session.user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'perfiles_proveedor'},()=>{void refresh()}).subscribe();return()=>{alive=false;void supabase.removeChannel(ch)}},[session,supabase])
 const intentCategory=useMemo(()=>matchCategory(categories,flow.hugoIntent?.categoryHint),[categories,flow.hugoIntent?.categoryHint])
 useEffect(()=>{if(!flow.hugoIntent||!intentCategory||flow.screen!=='home')return;if(!intentNamesCategory(flow.hugoIntent.text,intentCategory))return;setSelectedCategoryId(intentCategory.id);flow.navigate('search')},[flow,flow.hugoIntent,intentCategory])
 if(!session||!['search','provider'].includes(flow.screen))return null
 const requestedScreen=flow.screen==='provider'&&!flow.providerId?'search':flow.screen
 function pickProvider(provider:ProviderRadarRow){
  const category=categories.find(item=>item.id===selectedCategoryId)||intentCategory||categories.find(item=>item.id===provider.categoria_principal_id)||null
  const categoryId=category?.id||provider.categoria_principal_id||'',categoryName=category?.nombre||provider.categoria_nombre||''
  const preferred={id:provider.id,categoryId,categorySlug:category?.slug||'',at:Date.now()}
  try{
   sessionStorage.setItem('ugo:preferred-provider',JSON.stringify(preferred))
   const key=`ugo:guided-request-draft:${session.user.id}`
   let current:Record<string,unknown>={}
   try{current=JSON.parse(sessionStorage.getItem(key)||'{}')as Record<string,unknown>}catch{}
   sessionStorage.setItem(key,JSON.stringify({...current,categoryId,categoryName,categorySlug:category?.slug||'',amount:Number(provider.tarifa_base||0)>0?Number(provider.tarifa_base):current.amount??null,urgent:Boolean(flow.hugoIntent?.urgent),description:String(current.description||flow.hugoIntent?.description||''),preferences:`Profesional elegido: ${provider.nombre||'Profesional UGO'}`}))
  }catch(error){console.warn('No pudimos guardar el proveedor elegido.',error)}
  flow.navigate('request',provider.id)
  window.setTimeout(()=>window.dispatchEvent(new Event(UGO_CLIENT_GUIDED_REQUEST_OPEN)),0)
 }
 return <div className="ugo-client-screen-overlay"><ClientStudioProviderRadar supabase={supabase} categories={categories} selectedCategoryId={selectedCategoryId} requestedScreen={requestedScreen} requestedProviderId={flow.providerId} hugoIntent={flow.hugoIntent} onCategorySelect={setSelectedCategoryId} onProviderPick={pickProvider} onSearchClose={()=>flow.navigate('home')} onIntent={intent=>{if(intent.categoryId)setSelectedCategoryId(intent.categoryId)}}/></div>
}

export default ClientProviderRadarBridge
