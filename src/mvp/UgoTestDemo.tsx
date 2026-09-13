import React,{useEffect,useState}from'react'
import'./ugo-test-demo.css'

type Role='client'|'provider'|'admin'
type Status='sin_pedido'|'buscando'|'asignado'|'en_camino'|'en_progreso'|'completado'
type DemoState={status:Status;description:string;client:string;provider:string;updatedAt:string}
const KEY='ugo-test-demo-flow-v1'
const initial:DemoState={status:'sin_pedido',description:'',client:'Cliente Demo',provider:'Proveedor Demo',updatedAt:new Date().toISOString()}
const labels:Record<Status,string>={sin_pedido:'Sin pedido activo',buscando:'Buscando profesional',asignado:'Proveedor asignado',en_camino:'Proveedor en camino',en_progreso:'Trabajo en curso',completado:'Servicio completado'}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null') as DemoState||initial}catch{return initial}}
export function UgoTestDemo(){
 const[role,setRole]=useState<Role>('client'),[state,setState]=useState<DemoState>(load)
 const save=(next:DemoState)=>{setState(next);localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('ugo-demo-change'))}
 useEffect(()=>{const sync=()=>setState(load());window.addEventListener('storage',sync);window.addEventListener('ugo-demo-change',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('ugo-demo-change',sync)}},[])
 const patch=(p:Partial<DemoState>)=>save({...state,...p,updatedAt:new Date().toISOString()})
 const reset=()=>save({...initial,updatedAt:new Date().toISOString()})
 return <main className="ugo-test-demo">
  <header><div><b>U.GO</b><span>TEST · DEMO SIN LOGIN</span></div><button onClick={()=>window.location.href=window.location.pathname}>Salir de demo</button></header>
  <nav aria-label="Cambiar rol demo"><button className={role==='client'?'active':''} onClick={()=>setRole('client')}>Cliente</button><button className={role==='provider'?'active':''} onClick={()=>setRole('provider')}>Proveedor</button><button className={role==='admin'?'active':''} onClick={()=>setRole('admin')}>Admin</button></nav>
  <section className="demo-status"><small>FLUJO COMPARTIDO</small><strong>{labels[state.status]}</strong><span>{state.description||'Creá un pedido como Cliente Demo para iniciar el recorrido.'}</span></section>
  {role==='client'&&<section className="demo-panel"><p className="kicker">UGO CLIENTE</p><h1>¿Qué necesitás resolver hoy?</h1><div className="demo-map">📍 Florianópolis · Norte de la Isla<div className="pulse">UGO</div></div>{state.status==='sin_pedido'||state.status==='completado'?<><label>Servicio<textarea defaultValue="Necesito un electricista para revisar una toma" id="demo-request"/></label><button className="primary" onClick={()=>patch({status:'buscando',description:(document.getElementById('demo-request') as HTMLTextAreaElement)?.value||'Servicio demo'})}>Encontrar profesionales</button></>:<article><h2>{labels[state.status]}</h2><p>{state.status==='buscando'?'UGO está mostrando tu pedido al Proveedor Demo.':`${state.provider} · ⭐ 5.0`}</p></article>}</section>}
  {role==='provider'&&<section className="demo-panel"><p className="kicker">UGO PROVEEDOR</p><h1>Demanda y trabajos</h1>{state.status==='buscando'?<article className="opportunity"><small>NUEVA OPORTUNIDAD</small><h2>{state.description}</h2><p>Cliente Demo · Florianópolis</p><button className="primary" onClick={()=>patch({status:'asignado'})}>Aceptar trabajo</button></article>:state.status==='asignado'?<article><h2>Trabajo asignado</h2><p>{state.description}</p><button className="primary" onClick={()=>patch({status:'en_camino'})}>Estoy en camino</button></article>:state.status==='en_camino'?<article><h2>En camino</h2><button className="primary" onClick={()=>patch({status:'en_progreso'})}>Comenzar trabajo</button></article>:state.status==='en_progreso'?<article><h2>Trabajo en curso</h2><button className="primary" onClick={()=>patch({status:'completado'})}>Finalizar servicio</button></article>:<article><h2>{labels[state.status]}</h2><p>{state.status==='sin_pedido'?'Esperando un pedido de Cliente Demo.':'El trabajo quedó cerrado en la demo.'}</p></article>}</section>}
  {role==='admin'&&<section className="demo-panel admin"><p className="kicker">UGO ADMIN</p><h1>Centro de operaciones</h1><div className="metrics"><article><small>CLIENTE</small><strong>{state.client}</strong></article><article><small>PROVEEDOR</small><strong>{state.provider}</strong></article><article><small>ESTADO</small><strong>{labels[state.status]}</strong></article></div><article><h2>Actividad demo</h2><p>{state.description||'Todavía no hay un pedido.'}</p><p>Última actualización: {new Date(state.updatedAt).toLocaleTimeString()}</p></article><button className="secondary" onClick={reset}>Reiniciar demo</button></section>}
  <footer>Entorno TEST · Datos de demostración locales · Producción no afectada</footer>
 </main>
}
