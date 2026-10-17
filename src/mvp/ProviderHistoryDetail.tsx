import{useLocale}from'../i18n/locale'
import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ProviderRatingPrompt}from'./ProviderRatingPrompt'
import{UserProfileAvatar}from'./UserProfileAvatar'

type Row={
 id:string
 numero?:number|null
 estado:string
 descripcion?:string|null
 tarifa?:number|string|null
 created_at?:string|null
 updated_at?:string|null
 programado_para?:string|null
 completado_at?:string|null
 direccion_cliente?:string|null
 cliente_id?:string|null
 categoria?:{nombre?:string|null;emoji?:string|null}|null
 cliente?:{nombre?:string|null}|null
}
type EvidenceKind='antes'|'durante'|'despues'|'documento'
type Evidence={id:string;tipo:EvidenceKind;storage_path:string;descripcion:string|null;created_at:string;url?:string|null}
type RequestEvidence={id:string;storage_path:string;descripcion:string|null;created_at:string;url?:string|null}
type Event={id:string;estado_anterior:string|null;estado_nuevo:string;actor_role:string;motivo:string|null;created_at:string}
type Payment={id:string;metodo?:string|null;estado:string;monto_bruto?:number|null;comision_ugo?:number|null;ganancia_proveedor?:number|null;moneda?:string|null;created_at:string;liberado_at?:string|null}

const when=(value?:string|null,locale:string='pt-BR')=>value?new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—'
const money=(value?:number|string|null,currency='BRL')=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:currency||'BRL'}).format(Number(value||0))
const stateKey=(value:string)=>`providerHistory.state.${value}`

export function ProviderHistoryDetail({service,onClose}:{service:Row;onClose:()=>void}){
 const{t,locale}=useLocale();
 const stateLabel=(value:string)=>['borrador','buscando','ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado','cancelado','disputado'].includes(value)?t(stateKey(value)):value
 const evidenceLabel=(value:EvidenceKind)=>t(`providerHistory.evidence.${value}`)
 const paymentMethod=(value?:string|null)=>value==='efectivo'?t('providerHistory.cash'):value==='pix'||value==='pix_direto'?t('providerHistory.pix'):value==='mercadopago'?'Mercado Pago':value||t('providerHistory.ugoPayment')
 const db=useMemo(()=>getRoleSupabase('provider'),[])
 const[evidence,setEvidence]=useState<Evidence[]>([]),[requestEvidence,setRequestEvidence]=useState<RequestEvidence[]>([]),[events,setEvents]=useState<Event[]>([]),[payment,setPayment]=useState<Payment|null>(null),[clientPhotoPath,setClientPhotoPath]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[channelEpoch,setChannelEpoch]=useState(0)
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const[evidenceResult,requestResult,eventResult,paymentResult]=await Promise.all([
    db.from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    db.from('evidencias_solicitud').select('id,storage_path,descripcion,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}),
    db.from('servicio_estado_eventos').select('id,estado_anterior,estado_nuevo,actor_role,motivo,created_at').eq('servicio_id',service.id).order('created_at',{ascending:true}).limit(150),
    db.from('pagos').select('id,metodo,estado,monto_bruto,comision_ugo,ganancia_proveedor,moneda,created_at,liberado_at').eq('servicio_id',service.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
   ])
   if(evidenceResult.error)throw evidenceResult.error
   if(requestResult.error)throw requestResult.error
   if(eventResult.error)throw eventResult.error
   if(service.cliente_id){const{data:clientProfile}=await db.from('perfiles_cliente').select('foto_perfil_path').eq('usuario_id',service.cliente_id).maybeSingle();setClientPhotoPath((clientProfile as {foto_perfil_path?:string|null}|null)?.foto_perfil_path||null)}else setClientPhotoPath(null)
   const signedEvidence=await Promise.all(((evidenceResult.data||[])as Evidence[]).map(async item=>{const{data}=await db.storage.from('service-evidence').createSignedUrl(item.storage_path,900);return{...item,url:data?.signedUrl||null}}))
   const signedRequest=await Promise.all(((requestResult.data||[])as RequestEvidence[]).map(async item=>{const{data}=await db.storage.from('request-evidence').createSignedUrl(item.storage_path,900);return{...item,url:data?.signedUrl||null}}))
   setEvidence(signedEvidence);setRequestEvidence(signedRequest);setEvents((eventResult.data||[])as Event[]);setPayment(paymentResult.error?null:(paymentResult.data as Payment|null))
  }catch(e){setError(e instanceof Error?e.message:'No pudimos reconstruir este trabajo.')}finally{setLoading(false)}
 },[db,service.id])
 useEffect(()=>{
  let alive=true,reconnectTimer:number|undefined
  const refresh=()=>{if(alive)void load()}
  const reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)}
  const onOnline=()=>{refresh();reconnect()}
  const onVisibility=()=>{if(document.visibilityState==='visible')refresh()}
  window.addEventListener('online',onOnline)
  document.addEventListener('visibilitychange',onVisibility)
  const channel=db.channel(`provider-history-detail-${service.id}-${channelEpoch}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio',filter:`servicio_id=eq.${service.id}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'servicio_estado_eventos',filter:`servicio_id=eq.${service.id}`},refresh)
   .on('postgres_changes',{event:'*',schema:'public',table:'pagos',filter:`servicio_id=eq.${service.id}`},refresh)
   .subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){refresh();reconnect()}})
  return()=>{alive=false;if(reconnectTimer)window.clearTimeout(reconnectTimer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void db.removeChannel(channel)}
 },[channelEpoch,db,load,service.id])
 const grouped=(kind:EvidenceKind)=>evidence.filter(item=>item.tipo===kind)
 const gallery=(items:(Evidence|RequestEvidence)[],label:string)=>items.length?<div className="ugo-provider-history-gallery">{items.map(item=><figure key={item.id}>{item.url?<a href={item.url} target="_blank" rel="noreferrer" aria-label={t('providerHistory.openPhoto',{label})}><img loading="lazy" decoding="async" src={item.url} alt={t('providerHistory.photoAlt',{label})}/></a>:<div className="ugo-provider-history-photo-missing">{t('screen.provider_history.1')}</div>}<figcaption>{'tipo'in item?<strong>{evidenceLabel(item.tipo)}</strong>:<strong>{label}</strong>}{item.descripcion&&<span>{item.descripcion}</span>}<time>{when(item.created_at,locale)}</time></figcaption></figure>)}</div>:<p className="ugo-provider-history-empty-block">{t('screen.provider_history.2')}</p>
 return <div className="ugo-provider-history-detail-backdrop" onClick={onClose}>
  <section className="ugo-provider-history-detail" role="dialog" aria-modal="true" aria-labelledby="ugo-provider-history-detail-title" onClick={event=>event.stopPropagation()}>
   <header><div><small>{t('providerHistory.savedJob')} · #{service.numero??service.id.slice(0,8)}</small><h2 id="ugo-provider-history-detail-title">{service.categoria?.emoji||'🧰'} {service.categoria?.nombre||t('screen.provider_history.2')}</h2><p>{t('screen.provider_history.3')}</p></div><button type="button" onClick={onClose} aria-label={t('providerHistory.close')}>×</button></header>
   <div className="ugo-provider-history-detail-state"><span>{stateLabel(service.estado)}</span><b>{when(service.completado_at||service.updated_at||service.created_at,locale)}</b></div>
   <section className="ugo-provider-history-summary">
    <div><small>{t('screen.provider_history.4')}</small><span style={{display:'inline-flex',alignItems:'center',gap:8}}><UserProfileAvatar name={service.cliente?.nombre||'Cliente UGO'} role="client" photoPath={clientPhotoPath} size={34}/><strong>{service.cliente?.nombre||'Cliente UGO'}</strong></span></div>
    <div><small>{t('screen.provider_history.5')}</small><strong>{money(service.tarifa)}</strong></div>
    <div><small>{t('screen.provider_history.6')}</small><strong>{when(service.programado_para||service.created_at)}</strong></div>
    <div><small>{t('screen.provider_history.7')}</small><strong>{service.direccion_cliente||'No registrada'}</strong></div>
   </section>
   {service.descripcion&&<section className="ugo-provider-history-block"><small>{t('screen.provider_history.8')}</small><p>{service.descripcion}</p></section>}
   {loading&&<div className="ugo-provider-history-loading">{t('screen.provider_history.9')}</div>}
   {error&&<div className="ugo-provider-history-error" role="alert"><strong>{t('screen.provider_history.10')}</strong><span>{error}</span><button type="button" onClick={()=>void load()}>{t('screen.provider_history.11')}</button></div>}
   {!loading&&<>
    <section className="ugo-provider-history-block"><div className="ugo-provider-history-block-head"><div><small>{t('screen.provider_history.12')}</small><strong>{t('screen.provider_history.13')}</strong></div><span>{requestEvidence.length}</span></div>{gallery(requestEvidence,'del pedido')}</section>
    <section className="ugo-provider-history-block"><div className="ugo-provider-history-block-head"><div><small>{t('screen.provider_history.14')}</small><strong>{t('screen.provider_history.15')}</strong></div><span>{grouped('antes').length}</span></div>{gallery(grouped('antes'),'antes')}</section>
    <section className="ugo-provider-history-block"><div className="ugo-provider-history-block-head"><div><small>{t('screen.provider_history.14')}</small><strong>{t('screen.provider_history.16')}</strong></div><span>{grouped('durante').length}</span></div>{gallery(grouped('durante'),'durante')}</section>
    <section className="ugo-provider-history-block"><div className="ugo-provider-history-block-head"><div><small>{t('screen.provider_history.14')}</small><strong>{t('screen.provider_history.17')}</strong></div><span>{grouped('despues').length}</span></div>{gallery(grouped('despues'),'después')}</section>
    {payment&&<section className="ugo-provider-history-payment"><div><small>{t('screen.provider_history.18')}</small><strong>{paymentMethod(payment.metodo)} · {stateLabel(payment.estado)}</strong></div><div><span>{t('screen.provider_history.19')}</span><b>{money(payment.monto_bruto,payment.moneda||'BRL')}</b></div><div><span>{t('screen.provider_history.20')}</span><b>{money(payment.comision_ugo,payment.moneda||'BRL')}</b></div><div><span>{t('screen.provider_history.21')}</span><strong>{money(payment.ganancia_proveedor,payment.moneda||'BRL')}</strong></div></section>}
    <section className="ugo-provider-history-timeline"><div className="ugo-provider-history-block-head"><div><small>{t('screen.provider_history.22')}</small><strong>{t('screen.provider_history.23')}</strong></div><span>{events.length}</span></div>{events.length?<ol>{events.map(item=><li key={item.id}><span></span><div><strong>{stateLabel(item.estado_nuevo)}</strong><time>{when(item.created_at,locale)} · {item.actor_role}</time>{item.motivo&&<p>{item.motivo}</p>}</div></li>)}</ol>:<p className="ugo-provider-history-empty-block">{t('screen.provider_history.24')}</p>}</section>
    {service.estado==='completado'&&<ProviderRatingPrompt serviceId={service.id} embedded/>}
   </>}
   <footer><span>{t('providerHistory.serviceId')}</span><code>{service.id}</code><button type="button" className="ugo-history-open-button" onClick={onClose}>{t('screen.provider_history.25')}</button></footer>
  </section>
 </div>
}

export default ProviderHistoryDetail
