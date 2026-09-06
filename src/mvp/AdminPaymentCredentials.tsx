import React,{useCallback,useEffect,useMemo,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-payment-credentials.css'

type ProviderId='openpix'|'mercadopago_br'|'mercadopago_ar'
type CredentialStatus={provider:ProviderId;country:'BR'|'AR';environment:'sandbox'|'production';enabled:boolean;configured:boolean;updated_at:string|null}

type Draft={environment:'sandbox'|'production';enabled:boolean;appId:string;accessToken:string;clientId:string;clientSecret:string}

const meta:Record<ProviderId,{title:string;country:'BR'|'AR';subtitle:string;fields:Array<keyof Pick<Draft,'appId'|'accessToken'|'clientId'|'clientSecret'>>}>={
 openpix:{title:'OpenPix / Woovi',country:'BR',subtitle:'PIX Brasil · sandbox y producción',fields:['appId']},
 mercadopago_br:{title:'Mercado Pago Brasil',country:'BR',subtitle:'PIX / checkout Brasil',fields:['accessToken']},
 mercadopago_ar:{title:'Mercado Pago Argentina',country:'AR',subtitle:'Checkout / marketplace Argentina',fields:['accessToken','clientId','clientSecret']},
}
const labels={appId:'AppID',accessToken:'Access Token',clientId:'Client ID',clientSecret:'Client Secret'} as const
const emptyDraft:Draft={environment:'sandbox',enabled:false,appId:'',accessToken:'',clientId:'',clientSecret:''}

export function AdminPaymentCredentials(){
 const[statuses,setStatuses]=useState<CredentialStatus[]>([])
 const[drafts,setDrafts]=useState<Record<ProviderId,Draft>>({openpix:{...emptyDraft},mercadopago_br:{...emptyDraft,environment:'production'},mercadopago_ar:{...emptyDraft,environment:'sandbox'}})
 const[loading,setLoading]=useState(true),[saving,setSaving]=useState<ProviderId|null>(null),[message,setMessage]=useState<string|null>(null)
 const load=useCallback(async()=>{setLoading(true);const{data,error}=await(supabase as any).rpc('admin_payment_credentials_status');if(!error&&data)setStatuses(data as CredentialStatus[]);setLoading(false)},[])
 useEffect(()=>{void load()},[load])
 const statusMap=useMemo(()=>Object.fromEntries(statuses.map(s=>[s.provider,s])) as Partial<Record<ProviderId,CredentialStatus>>,[statuses])
 const setDraft=(provider:ProviderId,patch:Partial<Draft>)=>setDrafts(prev=>({...prev,[provider]:{...prev[provider],...patch}}))
 const save=async(provider:ProviderId)=>{
  const d=drafts[provider],m=meta[provider],credentials:any={}
  if(d.appId.trim())credentials.appId=d.appId.trim()
  if(d.accessToken.trim())credentials.accessToken=d.accessToken.trim()
  if(d.clientId.trim())credentials.clientId=d.clientId.trim()
  if(d.clientSecret.trim())credentials.clientSecret=d.clientSecret.trim()
  if(!Object.keys(credentials).length){setMessage('Ingresá al menos una credencial antes de guardar.');return}
  setSaving(provider);setMessage(null)
  const{error}=await(supabase as any).rpc('admin_set_payment_credentials',{p_provider:provider,p_country:m.country,p_environment:d.environment,p_credentials:credentials,p_enabled:d.enabled})
  if(error)setMessage(error.message||'No se pudo guardar la credencial.')
  else{setDraft(provider,{appId:'',accessToken:'',clientId:'',clientSecret:''});setMessage(`${m.title}: credenciales guardadas de forma privada.`);await load()}
  setSaving(null)
 }
 const clear=async(provider:ProviderId)=>{if(!confirm(`¿Eliminar las credenciales guardadas de ${meta[provider].title}?`))return;setSaving(provider);const{error}=await(supabase as any).rpc('admin_clear_payment_credentials',{p_provider:provider});setMessage(error?error.message:'Credenciales eliminadas.');await load();setSaving(null)}
 if(loading)return <div className="ugo-paycred-state">Cargando credenciales de pago…</div>
 return <div className="ugo-paycred-panel">
  <section className="ugo-paycred-hero"><div><small>CREDENCIALES DE PAGO</small><h3>Procesadores por país</h3><p>Los secretos se guardan en almacenamiento privado y nunca se vuelven a mostrar en el navegador. Esta pantalla solo indica si están configurados.</p></div><button onClick={()=>void load()}>↻ Actualizar</button></section>
  {message&&<div className="ugo-paycred-message">{message}</div>}
  <div className="ugo-paycred-grid">{(Object.keys(meta) as ProviderId[]).map(provider=>{const m=meta[provider],s=statusMap[provider],d=drafts[provider];return <article className="ugo-paycred-card" key={provider}>
   <header><div><small>{m.country}</small><h4>{m.title}</h4><p>{m.subtitle}</p></div><span className={s?.configured?'configured':'pending'}>{s?.configured?'Configurado':'Sin credencial'}</span></header>
   <div className="ugo-paycred-meta"><span>Entorno guardado: <b>{s?.environment||'—'}</b></span><span>Activo: <b>{s?.enabled?'Sí':'No'}</b></span>{s?.updated_at&&<span>Actualizado: <b>{new Date(s.updated_at).toLocaleString('es-AR')}</b></span>}</div>
   <label><span>Entorno</span><select value={d.environment} onChange={e=>setDraft(provider,{environment:e.target.value as Draft['environment']})}><option value="sandbox">Sandbox</option><option value="production">Producción</option></select></label>
   {m.fields.map(field=><label key={field}><span>{labels[field]}</span><input type="password" autoComplete="new-password" value={d[field]} placeholder={s?.configured?'•••••••• (reemplazar)':'Ingresar credencial'} onChange={e=>setDraft(provider,{[field]:e.target.value} as Partial<Draft>)}/></label>)}
   <label className="ugo-paycred-toggle"><input type="checkbox" checked={d.enabled} onChange={e=>setDraft(provider,{enabled:e.target.checked})}/><span>Dejar procesador habilitado al guardar</span></label>
   <footer><button className="primary" disabled={saving===provider} onClick={()=>void save(provider)}>{saving===provider?'Guardando…':'Guardar credencial'}</button><button className="danger" disabled={!s?.configured||saving===provider} onClick={()=>void clear(provider)}>Eliminar</button></footer>
  </article>})}</div>
  <section className="ugo-paycred-note"><strong>Activación segura</strong><span>Guardar una credencial no cambia automáticamente el procesador productivo. OpenPix y Argentina siguen sujetos a sus feature flags y a la etapa de validación correspondiente.</span></section>
 </div>
}
