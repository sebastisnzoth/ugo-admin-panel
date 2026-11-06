import React,{useEffect,useState}from'react'
import{useLocale}from'../../../i18n/locale'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import{useDialog}from'../../../mvp/dialogs'
import'./clientOrderSwitcher.css'

type Order={id:string;numero:number|null;estado:string;created_at:string|null;categoria:{nombre:string|null;emoji:string|null}|null}
const active=new Set(['buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado'])
export function ClientOrderSwitcher({serviceId,onSelect}:{serviceId:string;onSelect:(id:string)=>void}){
 const{t,locale}=useLocale(),{confirm,node:dialog}=useDialog()
 const[orders,setOrders]=useState<Order[]>([]),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[expanded,setExpanded]=useState(false),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  let alive=true
  const load=async()=>{try{
   const db=getRoleSupabase('client'),{data:auth,error:authError}=await db.auth.getUser()
   if(authError||!auth.user)throw new Error('Session unavailable')
   const{data,error}=await db.from('servicios').select('id,numero,estado,created_at,categoria:categorias(nombre,emoji)').eq('cliente_id',auth.user.id).order('created_at',{ascending:false}).limit(50)
   if(error)throw error
   const rows=(data||[])as unknown as Order[]
   rows.sort((a,b)=>Number(b.id===serviceId)-Number(a.id===serviceId)||Number(active.has(b.estado))-Number(active.has(a.estado)))
   if(alive){setOrders(rows);setState('ready')}
  }catch{if(alive)setState('error')}}
  void load();return()=>{alive=false}
 },[attempt,serviceId])
 const change=async(id:string)=>{if(id===serviceId)return;if(await confirm({title:t('clientOrderSwitch.confirmTitle'),message:t('clientOrderSwitch.confirmMessage'),confirmLabel:t('clientOrderSwitch.confirm'),cancelLabel:t('clientOrderSwitch.stay')}))onSelect(id)}
 const status=(value:string)=>{const key='status.'+value,label=t(key);return label===key?value.replaceAll('_',' '):label}
 return <section className="ugo-order-switcher" aria-label={t('clientOrderSwitch.title')}>
  <button type="button" className="ugo-order-switcher-toggle" aria-expanded={expanded} aria-controls="ugo-order-switcher-list" onClick={()=>setExpanded(value=>!value)}><span><strong>{t('clientOrderSwitch.title')}</strong><small>{t('clientOrderSwitch.help')}</small></span><b aria-hidden="true">{expanded?'−':'+'}</b></button>
  {expanded&&<div id="ugo-order-switcher-list" className="ugo-order-switcher-body">
   {state==='loading'&&<p role="status">{t('clientOrderSwitch.loading')}</p>}
   {state==='error'&&<div role="alert"><p>{t('clientOrderSwitch.error')}</p><button type="button" onClick={()=>{setState('loading');setAttempt(value=>value+1)}}>{t('clientOrderSwitch.retry')}</button></div>}
   {state==='ready'&&(orders.length?<ul>{orders.map(order=>{const date=order.created_at?new Date(order.created_at):null;return <li key={order.id}><div><strong>{order.categoria?.emoji||'🧰'} {order.categoria?.nombre||t('clientOrder.serviceDefault')} · #{order.numero??order.id.slice(0,8)}</strong><small>{status(order.estado)}{date&&Number.isFinite(date.getTime())?' · '+date.toLocaleDateString(locale):''}</small></div>{order.id===serviceId?<span className="ugo-order-switcher-current">{t('clientOrderSwitch.current')}</span>:<button type="button" onClick={()=>void change(order.id)} aria-label={t('clientOrderSwitch.openAria',{number:order.numero??order.id.slice(0,8)})}>{t('clientOrderSwitch.open')}</button>}</li>})}</ul>:<p>{t('clientOrderSwitch.empty')}</p>)}
   <small>{t('clientOrderSwitch.recentLimit')}</small>
  </div>}{dialog}
 </section>
}
