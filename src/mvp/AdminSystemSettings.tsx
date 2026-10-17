import{useLocale}from'../i18n/locale'
import React,{useCallback,useMemo,useState}from'react'
import{useConfigSistema}from'../hooks/useAdminData'
import{supabase}from'../lib/supabase'
import{AdminPaymentCredentials}from'./AdminPaymentCredentials'
import{AdminPaymentMethods}from'./AdminPaymentMethods'
import{AdminDeliveryIntegrations}from'./AdminDeliveryIntegrations'
import{useDialog}from'./dialogs'
import'./admin-system-settings.css'

type Group='general'|'rules'|'payments'|'credentials'|'integrations'|'technical'
type IntegrationStatus={id:string;label:string;category:'core'|'payments'|'ai'|'messaging'|'maps'|'deploy'|'delivery';configured:boolean;enabled:boolean;environment:string;runtimeSource:string;note:string}
type IntegrationResponse={generatedAt:string;deployment:{environment:string;commit:string|null};integrations:IntegrationStatus[];warning:string}
type Meta={description?:string;unit?:string}

const human=(key:string)=>key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
const isSecret=(key:string)=>/api_|secret|token|password|senha|key$/i.test(key)
const isPaymentMethod=(key:string)=>/^pago_efectivo_/i.test(key)
const isRule=(key:string)=>/(matching|radio|timeout|comision|escrow|retiro|moneda|pago|pix|mercado|verific|document|proveedor|cliente|cancel|servicio|hugo|voz|oferta|minimo|maximo|tolerancia)/i.test(key)
const boolValue=(value:string)=>['true','false','1','0','si','no','sí'].includes(String(value).toLowerCase())
const toBool=(value:string)=>['true','1','si','sí'].includes(String(value).toLowerCase())
const categoryLabel:Record<IntegrationStatus['category'],string>={core:'Core',payments:'Pagos',ai:'IA',messaging:'Mensajería',maps:'Mapas',deploy:'Deploy',delivery:'Logística'}
const meta:Record<string,Meta>={
 matching_automatico:{description:'Activa el emparejamiento automático entre solicitudes y proveedores.'},
 radio_busqueda_km:{description:'Radio máximo para localizar proveedores alrededor del cliente.',unit:'km'},
 timeout_oferta_segundos:{description:'Tiempo máximo disponible para que un proveedor acepte una oferta.',unit:'seg'},
 max_proveedores_busqueda:{description:'Cantidad máxima de proveedores considerados por búsqueda.'},
 requiere_verificacion_proveedor:{description:'Exige verificación de identidad y documentación del proveedor.'},
 requiere_ubicacion_cliente:{description:'Solicita ubicación del cliente para realizar el matching.'},
 comision_ugo_pct:{description:'Porcentaje de comisión de UGO sobre el valor del servicio.',unit:'%'},
 moneda_default:{description:'Moneda predeterminada para precios, pagos y reportes.'},
 hugo_activo:{description:'Activa el asistente UGO dentro del ecosistema.'},
 hugo_voz_activa:{description:'Permite interacciones por voz con Hugo.'}
}

export function AdminSystemSettings(){
 const{t}=useLocale();
 const{config,loading,error,update,refetch}=useConfigSistema()
 const[tab,setTab]=useState<Group>('general')
 const[integrations,setIntegrations]=useState<IntegrationResponse|null>(null)
 const[integrationsLoading,setIntegrationsLoading]=useState(false)
 const[integrationsError,setIntegrationsError]=useState('')
 const[query,setQuery]=useState('')
 const{confirm,alert,node:dialog}=useDialog()
 const[draft,setDraft]=useState<Record<string,string>>({})
 const[saving,setSaving]=useState(false)
 const[savedMessage,setSavedMessage]=useState('')
 const entries=useMemo(()=>Object.entries(config||{}).filter(([key])=>!isSecret(key)).map(([key,value])=>[key,String(value??'')] as [string,string]),[config])
 const groups=useMemo(()=>{
  const general:[string,string][]=[];const rules:[string,string][]=[]
  entries.forEach(([key,value])=>{if(isPaymentMethod(key))return;if(isRule(key))rules.push([key,value]);else general.push([key,value])})
  return{general,rules}
 },[entries])
 const dirtyKeys=useMemo(()=>entries.filter(([key,value])=>draft[key]!==undefined&&draft[key]!==value).map(([key])=>key),[draft,entries])
 const loadIntegrations=useCallback(async()=>{
  setIntegrationsLoading(true);setIntegrationsError('')
  try{
   let{data:{session}}=await supabase.auth.getSession()
   if(!session){const refreshed=await supabase.auth.refreshSession();session=refreshed.data.session}
   if(!session)throw new Error('Sesión Admin requerida.')
   let response=await fetch('/api/admin/integrations-status',{headers:{Authorization:`Bearer ${session.access_token}`}})
   if(response.status===401){
    const refreshed=await supabase.auth.refreshSession()
    if(refreshed.data.session)response=await fetch('/api/admin/integrations-status',{headers:{Authorization:`Bearer ${refreshed.data.session.access_token}`}})
   }
   const payload=await response.json().catch(()=>({}))
   if(!response.ok)throw new Error(payload.error||'No se pudo verificar el runtime de integraciones.')
   setIntegrations(payload as IntegrationResponse)
  }catch(x){setIntegrations(null);setIntegrationsError(x instanceof Error?x.message:'No se pudo verificar el runtime de integraciones.')}
  finally{setIntegrationsLoading(false)}
 },[])
 const openIntegrations=()=>{setTab('integrations');if(!integrations&&!integrationsLoading)void loadIntegrations()}
 const refreshAll=async()=>{await refetch();if(tab==='integrations')await loadIntegrations()}
 const saveChanges=async()=>{
  if(!dirtyKeys.length)return
  const ok=await confirm({title:'Guardar configuración',message:`Guardar ${dirtyKeys.length} cambio${dirtyKeys.length===1?'':'s'} de configuración?\n\n${dirtyKeys.map(key=>`• ${human(key)}`).join('\n')}\n\nEl cambio queda auditado y puede afectar la operación.`,danger:true})
  if(!ok)return
  setSaving(true);setSavedMessage('')
  try{
   for(const key of dirtyKeys)await update(key,draft[key])
   setSavedMessage(`${dirtyKeys.length} cambio${dirtyKeys.length===1?'':'s'} guardado${dirtyKeys.length===1?'':'s'}`)
   setDraft({})
   await refetch()
  }catch(x){await alert({title:'Guardar configuración',message:x instanceof Error?x.message:'No se pudo guardar la configuración.'})}
  finally{setSaving(false)}
 }
 const restoreDraft=()=>{setDraft({});setSavedMessage('')}
 const renderEditor=(items:[string,string][])=>{
  const filtered=items.filter(([key])=>{const text=`${human(key)} ${key} ${meta[key]?.description||''}`.toLowerCase();return text.includes(query.trim().toLowerCase())})
  if(!items.length)return <div className="ugo-system-empty"><strong>{t('screen.admin_settings.1')}</strong><span>{t('screen.admin_settings.2')}</span></div>
  if(!filtered.length)return <div className="ugo-system-empty"><strong>{t('screen.admin_settings.3')}</strong><span>{t('adminSettings.noMatches',{query})}</span></div>
  return <div className="ugo-system-table">
   <div className="ugo-system-tablehead"><span>{t('screen.admin_settings.4')}</span><span>{t('screen.admin_settings.5')}</span><span>{t('screen.admin_settings.6')}</span><span>{t('screen.admin_settings.7')}</span><span>{t('screen.admin_settings.8')}</span></div>
   {filtered.map(([key,value])=>{const current=draft[key]??value;const changed=current!==value;return <div key={key} className={`ugo-system-row ${changed?'is-dirty':''}`}>
    <div className="ugo-system-param"><b>{human(key)}</b><small>{key}</small></div>
    <p>{meta[key]?.description||'Parámetro operativo configurable del sistema UGO.'}</p>
    <div className="ugo-system-control">{boolValue(value)?<select value={toBool(current)?'true':'false'} onChange={e=>setDraft(prev=>({...prev,[key]:e.target.value}))}><option value="true">{t('screen.admin_settings.9')}</option><option value="false">{t('screen.admin_settings.10')}</option></select>:<input value={current} onChange={e=>setDraft(prev=>({...prev,[key]:e.target.value}))}/>}</div>
    <span className="ugo-system-unit">{meta[key]?.unit||'—'}</span>
    <span className="ugo-system-status"><i/> {changed?'Modificado':'Activo'}</span>
   </div>})}
  </div>
 }
 if(loading)return <div className="ugo-system-state">{t('screen.admin_settings.11')}</div>
 return <div className="ugo-system-panel">
  <section className="ugo-system-hero"><div className="ugo-system-hero-copy"><div className="ugo-system-hero-icon">⚙</div><div><small>{t('screen.admin_settings.12')}</small><div className="ugo-system-titleline"><h3>{t('screen.admin_settings.13')}</h3><span>{t('screen.admin_settings.14')}</span></div><p>{t('adminSettings.overview')}</p></div></div><button onClick={()=>{void refreshAll()}}>{t('screen.admin_settings.15')}</button></section>
  {error&&<div className="ugo-system-state error"><strong>{t('screen.admin_settings.16')}</strong><span>{error}</span></div>}
  <nav className="ugo-system-tabs" aria-label={t('adminSettings.sections')}><button className={tab==='general'?'active':''} onClick={()=>setTab('general')}>{t('screen.admin_settings.17')}</button><button className={tab==='rules'?'active':''} onClick={()=>setTab('rules')}>{t('screen.admin_settings.18')}</button><button className={tab==='payments'?'active':''} onClick={()=>setTab('payments')}>{t('screen.admin_settings.19')}</button><button className={tab==='credentials'?'active':''} onClick={()=>setTab('credentials')}>{t('screen.admin_settings.20')}</button><button className={tab==='integrations'?'active':''} onClick={openIntegrations}>{t('screen.admin_settings.21')}</button><button className={tab==='technical'?'active':''} onClick={()=>setTab('technical')}>{t('screen.admin_settings.22')}</button></nav>
  {(tab==='general'||tab==='rules')&&<section className="ugo-system-card"><div className="ugo-system-cardhead ugo-system-cardhead-actions"><div><small>{tab==='general'?'GENERAL':'REGLAS DE NEGOCIO'}</small><h4>{tab==='general'?'Operación global':'Matching, servicios, pagos y políticas'}</h4></div><div className="ugo-system-actions"><label className="ugo-system-search">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('adminSettings.search')}/></label><button className="ugo-system-secondary" onClick={restoreDraft} disabled={!dirtyKeys.length}>{t('screen.admin_settings.23')}</button><button className="ugo-system-save" onClick={()=>void saveChanges()} disabled={!dirtyKeys.length||saving}>{saving?'Guardando…':`✓ Guardar${dirtyKeys.length?` (${dirtyKeys.length})`:''}`}</button></div></div>{savedMessage&&<div className="ugo-system-success">✓ {savedMessage}</div>}{renderEditor(tab==='general'?groups.general:groups.rules)}<div className="ugo-system-info">{t('screen.admin_settings.24')}</div></section>}
  {tab==='payments'&&<AdminPaymentMethods config={config} update={update}/>} 
  {tab==='credentials'&&<AdminPaymentCredentials/>}
  {tab==='integrations'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>{t('screen.admin_settings.25')}</small><h4>{t('screen.admin_settings.26')}</h4></div><button className="ugo-system-inline-button" disabled={integrationsLoading} onClick={()=>void loadIntegrations()}>{integrationsLoading?'Verificando…':'↻ Verificar'}</button></div>
   {integrationsError&&<div className="ugo-system-state error"><strong>{t('screen.admin_settings.27')}</strong><span>{integrationsError}</span></div>}
   {integrationsLoading&&!integrations&&<div className="ugo-system-state">{t('screen.admin_settings.28')}</div>}
   {integrations&&<><div className="ugo-integration-grid">{integrations.integrations.map(item=><article key={item.id} className={`ugo-integration-card ${item.enabled?'is-enabled':item.configured?'is-configured':'is-off'}`}><header><div><small>{categoryLabel[item.category]} · {item.environment}</small><strong>{item.label}</strong></div><span>{item.enabled?'Operativa':item.configured?'Configurada / apagada':'No configurada'}</span></header><p>{item.note}</p><footer><b>{t('screen.admin_settings.29')}</b><code>{item.runtimeSource}</code></footer></article>)}</div><div className="ugo-system-note"><strong>{t('screen.admin_settings.30')}</strong><span>{integrations.warning} {t('adminSettings.vaultInfo')}</span></div></>}
   <AdminDeliveryIntegrations/>
  </section>}
  {tab==='technical'&&<section className="ugo-system-card"><div className="ugo-system-cardhead"><div><small>{t('screen.admin_settings.31')}</small><h4>{t('screen.admin_settings.32')}</h4></div></div><div className="ugo-system-health"><article><small>{t('screen.admin_settings.33')}</small><strong>{import.meta.env.MODE}</strong><span>{t('screen.admin_settings.34')}</span></article><article><small>{t('screen.admin_settings.35')}</small><strong>{navigator.onLine?'Online':'Offline'}</strong><span>{t('screen.admin_settings.36')}</span></article><article><small>{t('screen.admin_settings.37')}</small><strong>{entries.length}</strong><span>{t('screen.admin_settings.38')}</span></article><article><small>{t('screen.admin_settings.39')}</small><strong>{integrations?.deployment.environment||'Sin verificar'}</strong><span>{integrations?.deployment.commit?`Commit ${integrations.deployment.commit.slice(0,8)}`:'Abrí Integraciones para verificar servidor'}</span></article></div><div className="ugo-system-note"><strong>{t('screen.admin_settings.40')}</strong><span>{t('adminSettings.onlineInfo')}</span></div></section>}
 {dialog}
 </div>
}
