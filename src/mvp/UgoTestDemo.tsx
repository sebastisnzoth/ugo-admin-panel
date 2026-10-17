import{LocalizedText,useLocale}from'../i18n/locale'
import React,{useEffect,useState}from'react'
import'./ugo-test-demo.css'

type Role='client'|'provider'|'admin'
type Status='sin_pedido'|'buscando'|'asignado'|'en_camino'|'en_progreso'|'completado'
type DemoState={status:Status;description:string;client:string;provider:string;updatedAt:string}
const KEY='ugo-test-demo-flow-v1'
const initial:DemoState={status:'sin_pedido',description:'',client:'Cliente Demo',provider:'Proveedor Demo',updatedAt:new Date().toISOString()}
const labelKeys:Record<Status,string>={sin_pedido:'demoFlow.noActiveOrder',buscando:'demoFlow.searching',asignado:'demoFlow.providerAssigned',en_camino:'demoFlow.providerOnWay',en_progreso:'demoFlow.workInProgress',completado:'demoFlow.completed'}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null') as DemoState||initial}catch{return initial}}
export function UgoTestDemo(){
 const{t}=useLocale()
 const statusLabel=(status:Status)=>t(labelKeys[status])
 const[role,setRole]=useState<Role>('client'),[state,setState]=useState<DemoState>(load)
 const save=(next:DemoState)=>{setState(next);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('ugo-demo-change'))}
 useEffect(()=>{const sync=()=>setState(load());window.addEventListener('storage',sync);window.addEventListener('ugo-demo-change',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('ugo-demo-change',sync)}},[])
 const patch=(p:Partial<DemoState>)=>save({...state,...p,updatedAt:new Date().toISOString()})
 const reset=()=>save({...initial,updatedAt:new Date().toISOString()})
 return <main className="ugo-test-demo">
  <header><div><b>U.GO</b><span>{t('demoFlow.testBanner')}</span></div><button onClick={()=>window.location.href=window.location.pathname}>{t('demoFlow.exit')}</button></header>
  <nav aria-label={t('demoFlow.changeRole')}><button className={role==='client'?'active':''} onClick={()=>setRole('client')}><LocalizedText id="screen.admin_users.15"/></button><button className={role==='provider'?'active':''} onClick={()=>setRole('provider')}><LocalizedText id="screen.admin_services.20"/></button><button className={role==='admin'?'active':''} onClick={()=>setRole('admin')}><LocalizedText id="screen.admin_users.17"/></button></nav>
  <section className="demo-status"><small>{t('demoFlow.sharedFlow')}</small><strong>{statusLabel(state.status)}</strong><span>{state.description||t('demoFlow.createRequest')}</span></section>
  {role==='client'&&<section className="demo-panel"><p className="kicker"><LocalizedText id="screen.support.3"/></p><h1><LocalizedText id="ugoWeb.homeTitle"/></h1><div className="demo-map">📍 {t('demoFlow.location')}<div className="pulse"><LocalizedText id="ugoWebRemaining.brand"/></div></div>{state.status==='sin_pedido'||state.status==='completado'?<><label><LocalizedText id="screen.admin_decision.19"/><textarea defaultValue={t('demoFlow.requestExample')} id="demo-request"/></label><button className="primary" onClick={()=>patch({status:'buscando',description:(document.getElementById('demo-request') as HTMLTextAreaElement)?.value||'Servicio demo'})}>{t('demoFlow.findProfessionals')}</button></>:<article><h2>{statusLabel(state.status)}</h2><p>{state.status==='buscando'?t('demoFlow.showingRequest'):`${state.provider} · ⭐ 5.0`}</p></article>}</section>}
  {role==='provider'&&<section className="demo-panel"><p className="kicker"><LocalizedText id="landing.providerApp"/></p><h1>{t('demoFlow.demandJobs')}</h1>{state.status==='buscando'?<article className="opportunity"><small><LocalizedText id="preview.newOpportunity"/></small><h2>{state.description}</h2><p>{t('demoFlow.customerDemo')}</p><button className="primary" onClick={()=>patch({status:'asignado'})}><LocalizedText id="landing.acceptJob"/></button></article>:state.status==='asignado'?<article><h2>{t('demoFlow.assignedWork')}</h2><p>{state.description}</p><button className="primary" onClick={()=>patch({status:'en_camino'})}><LocalizedText id="chat.quick.provider.1"/></button></article>:state.status==='en_camino'?<article><h2><LocalizedText id="clientWeb.onTheWay"/></h2><button className="primary" onClick={()=>patch({status:'en_progreso'})}>{t('demoFlow.beginWork')}</button></article>:state.status==='en_progreso'?<article><h2><LocalizedText id="screen.client_tracking.4"/></h2><button className="primary" onClick={()=>patch({status:'completado'})}><LocalizedText id="ugoWeb.finishService"/></button></article>:<article><h2>{statusLabel(state.status)}</h2><p>{state.status==='sin_pedido'?t('demoFlow.waitingRequest'):t('demoFlow.closed')}</p></article>}</section>}
  {role==='admin'&&<section className="demo-panel admin"><p className="kicker">{t('demoFlow.admin')}</p><h1>{t('demoFlow.operations')}</h1><div className="metrics"><article><small><LocalizedText id="screen.admin_services.9"/></small><strong>{state.client}</strong></article><article><small><LocalizedText id="screen.admin_services.10"/></small><strong>{state.provider}</strong></article><article><small><LocalizedText id="screen.admin_native.46"/></small><strong>{statusLabel(state.status)}</strong></article></div><article><h2>{t('demoFlow.activity')}</h2><p>{state.description||t('demoFlow.noOrder')}</p><p><LocalizedText id="screen.admin_services.17"/> {new Date(state.updatedAt).toLocaleTimeString()}</p></article><button className="secondary" onClick={reset}><LocalizedText id="preview.restartDemo"/></button></section>}
  <footer>{t('demoFlow.environment')}</footer>
 </main>
}
