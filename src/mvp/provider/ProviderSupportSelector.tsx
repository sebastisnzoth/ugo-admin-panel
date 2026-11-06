import React,{useEffect,useState}from'react'
import{useLocale}from'../../i18n/locale'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{Button}from'../../shared/ui'

type SupportService={id:string;numero:number|null;estado:string;descripcion:string|null;created_at:string|null;categoria:{nombre:string|null;emoji:string|null}|null;cliente:{nombre:string|null}|null}
const visibleStates=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','disputado','cancelado']
const activeStates=new Set(['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado'])

export function ProviderSupportSelector({currentId,onSelect,onClose,onHistory}:{currentId:string|null;onSelect:(id:string)=>void;onClose:()=>void;onHistory:()=>void}){
 const{t,locale}=useLocale()
 const[items,setItems]=useState<SupportService[]>([]),[state,setState]=useState<'loading'|'error'|'ready'>('loading'),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  let alive=true
  const load=async()=>{try{
   const db=getRoleSupabase('provider'),{data:auth,error:authError}=await db.auth.getUser()
   if(authError||!auth.user)throw new Error('Session unavailable')
   const{data,error}=await db.from('servicios').select('id,numero,estado,descripcion,created_at,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre)').eq('proveedor_id',auth.user.id).in('estado',visibleStates).order('created_at',{ascending:false}).limit(50)
   if(error)throw error
   const rows=(data||[])as unknown as SupportService[]
   if(currentId&&!rows.some(row=>row.id===currentId)){
    const{data:current,error:currentError}=await db.from('servicios').select('id,numero,estado,descripcion,created_at,categoria:categorias(nombre,emoji),cliente:usuarios!servicios_cliente_id_fkey(nombre)').eq('proveedor_id',auth.user.id).eq('id',currentId).in('estado',visibleStates).maybeSingle()
    if(currentError)throw currentError
    if(current)rows.push(current as unknown as SupportService)
   }
   rows.sort((a,b)=>Number(b.id===currentId)-Number(a.id===currentId)||Number(activeStates.has(b.estado))-Number(activeStates.has(a.estado)))
   if(alive){setItems(rows);setState('ready')}
  }catch{if(alive)setState('error')}}
  void load();return()=>{alive=false}
 },[attempt,currentId])
 const status=(value:string)=>{const key=`status.${value}`,label=t(key);return label===key?value.replaceAll('_',' '):label}
 return <section className="provider-support-selector" aria-labelledby="provider-support-selector-title">
  <div className="provider-support-selector-head"><div><h3 id="provider-support-selector-title">{t('providerSupportFlow.chooseTitle')}</h3><p>{t('providerSupportFlow.chooseHelp')}</p></div><button type="button" onClick={onClose} aria-label={t('providerSupportFlow.close')}>×</button></div>
  {state==='loading'&&<p role="status">{t('providerSupportFlow.loading')}</p>}
  {state==='error'&&<div role="alert"><p>{t('providerSupportFlow.loadError')}</p><Button type="button" variant="secondary" onClick={()=>{setState('loading');setAttempt(value=>value+1)}}>{t('providerSupportFlow.retry')}</Button></div>}
  {state==='ready'&&(items.length?<ul>{items.map(item=>{const created=item.created_at?new Date(item.created_at):null;return <li key={item.id}><div><strong>{item.categoria?.emoji} {item.categoria?.nombre||t('providerAgenda.serviceDefault')} · #{item.numero??item.id.slice(0,8)}</strong><span>{item.id===currentId?t('providerSupportFlow.current')+' · ':''}{status(item.estado)}{created&&Number.isFinite(created.getTime())?' · '+created.toLocaleDateString(locale):''}</span>{item.cliente?.nombre&&<span>{t('history.client')}: {item.cliente.nombre}</span>}</div><Button type="button" variant="secondary" onClick={()=>onSelect(item.id)} aria-label={`${t('providerSupportFlow.continue')} · #${item.numero??item.id.slice(0,8)}`}>{t('providerSupportFlow.continue')}</Button></li>})}</ul>:<p>{t('providerSupportFlow.empty')}</p>)}
  <p>{t('providerSupportFlow.historyHelp')}</p><Button type="button" variant="ghost" onClick={onHistory}>{t('providerSupportUx.viewActivity')}</Button>
 </section>
}
