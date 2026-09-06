import React,{useMemo,useState}from'react'
import{useConfigSistema}from'../hooks/useAdminData'
import'./admin-system-settings.css'

type Group='general'|'rules'|'technical'

const human=(key:string)=>key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
const isSecret=(key:string)=>/api_|secret|token|password|senha|key$/i.test(key)
const isRule=(key:string)=>/(matching|radio|timeout|comision|escrow|retiro|moneda|pago|pix|mercado|verific|document|proveedor|cliente|cancel|servicio|hugo|voz|oferta|minimo|maximo|tolerancia)/i.test(key)
const isGeneral=(key:string)=>/(demo|produccion|mantenimiento|registro|pais|zona|idioma|entorno|nombre|soporte)/i.test(key)
const boolValue=(value:string)=>['true','false','1','0','si','no','sí'].includes(String(value).toLowerCase())
const toBool=(value:string)=>['true','1','si','sí'].includes(String(value).toLowerCase())

export function AdminSystemSettings(){
 const{config,loading,error,update,refetch}=useConfigSistema()
 const[tab,setTab]=useState<Group>('general')
 const entries=useMemo(()=>Object.entries(config||{}).filter(([key])=>!isSecret(key)),[config])
 const groups=useMemo(()=>{
  const general:[string,string][]=[];const rules:[string,string][]=[]
  entries.forEach(([key,value])=>{if(isRule(key))rules.push([key,String(value??'')]);else general.push([key,String(value??'')])})
  return{general,rules}
 },[entries])
 const renderEditor=(items:[string,string][])=>{
  if(!items.length)return <div className="ugo-system-empty"><strong>Sin parámetros en este bloque</strong><span>Cuando existan claves compatibles en config_sistema aparecerán acá automáticamente.</span></div>
  return <div className="ugo-system-fields">{items.map(([key,value])=><label key={key} className="ugo-system-field"><span><b>{human(key)}</b><small>{key}</small></span>{boolValue(value)?<select value={toBool(value)?'true':'false'} onChange={e=>{void update(key,e.target.value)}}><option value="true">Activado</option><option value="false">Desactivado</option></select>:<input defaultValue={value} onBlur={e=>{if(e.target.value!==value)void update(key,e.target.value)}}/>}</label>)}</div>
 }
 if(loading)return <div className="ugo-system-state">Cargando configuración del sistema…</div>
 if(error)return <div className="ugo-system-state error"><strong>No se pudo cargar Sistema</strong><span>{error}</span><button onClick={()=>{void refetch()}}>Reintentar</button></div>
 return <div className="ugo-system-panel">
  <section className="ugo-system-hero"><div><small>CONFIGURACIÓN GLOBAL</small><h3>Sistema UGO</h3><p>Parámetros globales y estado técnico. No se muestran claves API, tokens ni secretos.</p></div><button onClick={()=>{void refetch()}}>↻ Actualizar</button></section>
  <nav className="ugo-system-tabs" aria-label="Secciones de sistema"><button className={tab==='general'?'active':''} onClick={()=>setTab('general')}>General</button><button className={tab==='rules'?'active':''} onClick={()=>setTab('rules')}>Reglas de negocio</button><button className={tab==='technical'?'active':''} onClick={()=>setTab('technical')}>Estado técnico</button></nav>
  {tab==='general'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>GENERAL</small><h4>Operación global</h4></div><span>{groups.general.length} parámetros</span></div>{renderEditor(groups.general)}</section>}
  {tab==='rules'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>REGLAS DE NEGOCIO</small><h4>Matching, servicios, pagos y políticas</h4></div><span>{groups.rules.length} parámetros</span></div>{renderEditor(groups.rules)}</section>}
  {tab==='technical'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>ESTADO TÉCNICO</small><h4>Salud del panel y conexión</h4></div></div><div className="ugo-system-health"><article><small>ENTORNO</small><strong>{import.meta.env.MODE}</strong><span>Build web actual</span></article><article><small>NAVEGADOR</small><strong>{navigator.onLine?'Online':'Offline'}</strong><span>Conectividad del dispositivo</span></article><article><small>CONFIG SISTEMA</small><strong>{entries.length}</strong><span>Parámetros visibles cargados</span></article><article><small>ORIGEN</small><strong>Supabase</strong><span>config_sistema</span></article></div>{!entries.length&&<div className="ugo-system-note">La conexión del módulo funciona, pero todavía no hay parámetros administrables visibles en <b>config_sistema</b>.</div>}</section>}
 </div>
}
