import React,{useEffect,useMemo,useState}from'react'
import{useRoleSession,type Category}from'../shared'
import{useClientFlow}from'./clientFlow'
import{UGO_UI_EVENTS}from'../uiEvents'
import'./client-need-screen.css'

const QUICK:Record<string,string[]>={
 electricidad:['Reparar toma de corriente','Instalar luminaria','Revisar tablero eléctrico','Otro…'],
 plomeria:['Reparar pérdida de agua','Destapar cañería','Cambiar grifería','Otro…'],
 limpieza:['Limpieza general','Limpieza profunda','Limpieza después de obra','Otro…'],
 reparaciones:['Montaje o instalación','Reparación en el hogar','Ajuste o mantenimiento','Otro…'],
}
const norm=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')

export function ClientNeedScreen(){
 const flow=useClientFlow(),{supabase,session}=useRoleSession('client')
 const[categories,setCategories]=useState<Category[]>([]),[description,setDescription]=useState(''),[message,setMessage]=useState(''),[done,setDone]=useState(false)
 useEffect(()=>{if(!session)return;let alive=true;void supabase.from('categorias').select('id,slug,nombre,emoji').eq('activa',true).order('nombre').then(({data})=>{if(alive)setCategories((data||[])as Category[])});return()=>{alive=false}},[session,supabase])
 const hint=norm(`${flow.hugoIntent?.categoryHint||''} ${flow.hugoIntent?.text||''}`)
 const category=useMemo(()=>categories.find(item=>{const text=norm(`${item.slug} ${item.nombre}`);return hint&&text.split(/\s+/).some(token=>token.length>3&&hint.includes(token))})||null,[categories,hint])
 const key=category?norm(category.slug||category.nombre):''
 const quick=Object.entries(QUICK).find(([name])=>key.includes(name)||hint.includes(name))?.[1]||['Describir el trabajo','Instalación','Reparación','Otro…']
 useEffect(()=>{if(!session)return;try{const raw=sessionStorage.getItem(`ugo:guided-request-draft:${session.user.id}`);if(raw){const draft=JSON.parse(raw)as{description?:string};if(draft.description)setDescription(draft.description)}}catch{}},[session])
 const continueJourney=()=>{
  const value=description.trim()
  if(value.length<8){setMessage('Contanos un poco más sobre lo que necesitás.');return}
  if(!session||!category){setMessage('No pudimos identificar la categoría. Volvé y elegila nuevamente.');return}
  try{const storageKey=`ugo:guided-request-draft:${session.user.id}`,raw=sessionStorage.getItem(storageKey),previous=raw?JSON.parse(raw):{};sessionStorage.setItem(storageKey,JSON.stringify({...previous,categoryId:category.id,categoryName:category.nombre,categorySlug:category.slug,description:value}))}catch{}
  setDone(true)
  window.setTimeout(()=>window.dispatchEvent(new CustomEvent(UGO_UI_EVENTS.clientHugoText,{detail:{text:value,send:true}})),0)
 }
 if(!session||done)return null
 return <main className="ugo-need-screen" aria-label="Qué hay que hacer">
  <header className="ugo-need-top"><button type="button" onClick={()=>flow.navigate('home')} aria-label="Volver">←</button><strong>UGO</strong><div className="ugo-need-progress"><i/><i/><i/><i/><i/></div><small>1 de 5</small></header>
  <section className="ugo-need-body">
   <div className="ugo-need-category"><span>{category?.emoji||'🧰'}</span><div><h1>{category?.nombre||flow.hugoIntent?.categoryHint||'Servicio'}</h1><p>Contanos qué necesitás</p></div></div>
   <textarea autoFocus maxLength={500} value={description} onChange={event=>{setDescription(event.target.value);setMessage('')}} placeholder="Ej: No funciona una toma de corriente en la cocina…" aria-label="Descripción del trabajo"/>
   <div className="ugo-need-counter">{description.length}/500</div>
   <h2>Opciones rápidas</h2>
   <div className="ugo-need-quick">{quick.map(option=><button type="button" key={option} onClick={()=>{if(option==='Otro…')return;setDescription(option);setMessage('')}}>{option}</button>)}</div>
   {message&&<p className="ugo-need-error" role="alert">{message}</p>}
  </section>
  <footer><button type="button" disabled={!category} onClick={continueJourney}>Continuar <span>→</span></button></footer>
 </main>
}

export default ClientNeedScreen
