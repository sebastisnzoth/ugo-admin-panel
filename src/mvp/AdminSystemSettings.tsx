import React,{useCallback,useEffect,useMemo,useState}from'react'
import{useConfigSistema}from'../hooks/useAdminData'
import{supabase}from'../lib/supabase'
import{AdminPaymentCredentials}from'./AdminPaymentCredentials'
import{AdminPaymentMethods}from'./AdminPaymentMethods'
import'./admin-system-settings.css'

type Group='general'|'rules'|'payments'|'credentials'|'integrations'|'technical'
type IntegrationStatus={id:string;label:string;category:'core'|'payments'|'ai'|'messaging'|'maps'|'deploy';configured:boolean;enabled:boolean;environment:string;runtimeSource:string;note:string}
type IntegrationResponse={generatedAt:string;deployment:{environment:string;commit:string|null};integrations:IntegrationStatus[];warning:string}

const human=(key:string)=>key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
const isSecret=(key:string)=>/api_|secret|token|password|senha|key$/i.test(key)
const isPaymentMethod=(key:string)=>/^pago_efectivo_/i.test(key)
const isRule=(key:string)=>/(matching|radio|timeout|comision|escrow|retiro|moneda|pago|pix|mercado|verific|document|proveedor|cliente|cancel|servicio|hugo|voz|oferta|minimo|maximo|tolerancia)/i.test(key)
const boolValue=(value:string)=>['true','false','1','0','si','no','sí'].includes(String(value).toLowerCase())
const toBool=(value:string)=>['true','1','si','sí'].includes(String(value).toLowerCase())
const categoryLabel:Record<IntegrationStatus['category'],string>={core:'Core',payments:'Pagos',ai:'IA',messaging:'Mensajería',maps:'Mapas',deploy:'Deploy'}

export function AdminSystemSettings(){
 const{config,loading,error,update,refetch}=useConfigSistema()
 const[tab,setTab]=useState<Group>('general')
 const[integrations,setIntegrations]=useState<IntegrationResponse|null>(null)
 const[integrationsLoading,setIntegrationsLoading]=useState(false)
 const[integrationsError,setIntegrationsError]=useState('')
 const entries=useMemo(()=>Object.entries(config||{}).filter(([key])=>!isSecret(key)),[config])
 const groups=useMemo(()=>{
  const general:[string,string][]=[];const rules:[string,string][]=[]
  entries.forEach(([key,value])=>{if(isPaymentMethod(key))return;if(isRule(key))rules.push([key,String(value??'')]);else general.push([key,String(value??'')])})
  return{general,rules}
 },[entries])
 const loadIntegrations=useCallback(async()=>{
  setIntegrationsLoading(true);setIntegrationsError('')
  try{
   const{data:{session}}=await supabase.auth.getSession()
   if(!session)throw new Error('Sesión Admin requerida.')
   const response=await fetch('/api/admin/integrations-status',{headers:{Authorization:`Bearer ${session.access_token}`}})
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw new Error(payload.error||'No se pudo verificar el runtime de integraciones.')
   setIntegrations(payload as IntegrationResponse)
  }catch(x){setIntegrations(null);setIntegrationsError(x instanceof Error?x.message:'No se pudo verificar el runtime de integraciones.')}
  finally{setIntegrationsLoading(false)}
 },[])
 useEffect(()=>{if(tab==='integrations'&&!integrations&&!integrationsLoading)void loadIntegrations()},[tab,integrations,integrationsLoading,loadIntegrations])
 const refreshAll=async()=>{await refetch();if(tab==='integrations')await loadIntegrations()}
 const renderEditor=(items:[string,string][])=>{
  if(!items.length)return <div className="ugo-system-empty"><strong>Sin parámetros en este bloque</strong><span>No hay parámetros configurados para esta sección.</span></div>
  return <div className="ugo-system-fields">{items.map(([key,value])=><label key={key} className="ugo-system-field"><span><b>{human(key)}</b><small>{key}</small></span>{boolValue(value)?<select value={toBool(value)?'true':'false'} onChange={e=>{void update(key,e.target.value)}}><option value="true">Activado</option><option value="false">Desactivado</option></select>:<input defaultValue={value} onBlur={e=>{if(e.target.value!==value)void update(key,e.target.value)}}/>}</label>)}</div>
 }
 if(loading)return <div className="ugo-system-state">Cargando configuración del sistema…</div>
 return <div className="ugo-system-panel">
  <section className="ugo-system-hero"><div><small>CONFIGURACIÓN GLOBAL</small><h3>Sistema UGO</h3><p>Parámetros, medios de pago, integraciones y estado técnico. Las claves sensibles nunca se muestran en el navegador.</p></div><button onClick={()=>{void refreshAll()}}>↻ Actualizar</button></section>
  {error&&<div className="ugo-system-state error"><strong>No se pudo cargar toda la configuración</strong><span>{error}</span></div>}
  <nav className="ugo-system-tabs" aria-label="Secciones de sistema"><button className={tab==='general'?'active':''} onClick={()=>setTab('general')}>General</button><button className={tab==='rules'?'active':''} onClick={()=>setTab('rules')}>Reglas de negocio</button><button className={tab==='payments'?'active':''} onClick={()=>setTab('payments')}>Medios de pago</button><button className={tab==='credentials'?'active':''} onClick={()=>setTab('credentials')}>Credenciales de pago</button><button className={tab==='integrations'?'active':''} onClick={()=>setTab('integrations')}>Integraciones</button><button className={tab==='technical'?'active':''} onClick={()=>setTab('technical')}>Estado técnico</button></nav>
  {tab==='general'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>GENERAL</small><h4>Operación global</h4></div><span>{groups.general.length} parámetros</span></div>{renderEditor(groups.general)}</section>}
  {tab==='rules'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>REGLAS DE NEGOCIO</small><h4>Matching, servicios, pagos y políticas</h4></div><span>{groups.rules.length} parámetros</span></div>{renderEditor(groups.rules)}</section>}
  {tab==='payments'&&<AdminPaymentMethods config={config} update={update}/>} 
  {tab==='credentials'&&<AdminPaymentCredentials/>}
  {tab==='integrations'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>INTEGRACIONES</small><h4>Runtime real del backend</h4></div><button className="ugo-system-inline-button" disabled={integrationsLoading} onClick={()=>void loadIntegrations()}>{integrationsLoading?'Verificando…':'↻ Verificar'}</button></div>
   {integrationsError&&<div className="ugo-system-state error"><strong>No se pudo verificar</strong><span>{integrationsError}</span></div>}
   {integrationsLoading&&!integrations&&<div className="ugo-system-state">Consultando configuración segura del runtime…</div>}
   {integrations&&<><div className="ugo-integration-grid">{integrations.integrations.map(item=><article key={item.id} className={`ugo-integration-card ${item.enabled?'is-enabled':item.configured?'is-configured':'is-off'}`}><header><div><small>{categoryLabel[item.category]} · {item.environment}</small><strong>{item.label}</strong></div><span>{item.enabled?'Operativa':item.configured?'Configurada / apagada':'No configurada'}</span></header><p>{item.note}</p><footer><b>Fuente runtime</b><code>{item.runtimeSource}</code></footer></article>)}</div><div className="ugo-system-note"><strong>Lectura segura del runtime</strong><span>{integrations.warning} Las credenciales guardadas en la bóveda privada se muestran aparte y no se consideran activas si el runtime que procesa la integración no las consume.</span></div></>}
  </section>}
  {tab==='technical'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>ESTADO TÉCNICO</small><h4>Salud del panel y conexión</h4></div></div><div className="ugo-system-health"><article><small>BUILD CLIENTE</small><strong>{import.meta.env.MODE}</strong><span>Modo Vite actual</span></article><article><small>NAVEGADOR</small><strong>{navigator.onLine?'Online':'Offline'}</strong><span>Conectividad del dispositivo; no prueba backend</span></article><article><small>CONFIG SISTEMA</small><strong>{entries.length}</strong><span>Parámetros visibles cargados</span></article><article><small>RUNTIME</small><strong>{integrations?.deployment.environment||'Sin verificar'}</strong><span>{integrations?.deployment.commit?`Commit ${integrations.deployment.commit.slice(0,8)}`:'Abrí Integraciones para verificar servidor'}</span></article></div><div className="ugo-system-note"><strong>Importante</strong><span>“Online” del navegador no significa que Supabase, pagos, WhatsApp, Hugo o el deploy estén operativos. La pestaña Integraciones verifica presencia de configuración en el runtime server-side sin exponer secretos.</span></div></section>}
 </div>
}
