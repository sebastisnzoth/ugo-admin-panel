import React,{useCallback,useEffect,useId,useMemo,useState}from'react'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import{useLocale}from'../../../i18n/locale'
import'./clientEvidenceGallery.css'

type Evidence={id:string;tipo:'antes'|'durante'|'despues'|'documento';storage_path:string;descripcion:string|null;created_at:string;url?:string|null}
type Props={serviceId:string;hideWhenEmpty?:boolean;compact?:boolean}

export function ClientEvidenceGallery({serviceId,hideWhenEmpty=false,compact=false}:Props){
 const{t}=useLocale()
 const labels:Record<Evidence['tipo'],string>={antes:t('clientEvidence.before'),durante:t('clientEvidence.during'),despues:t('clientEvidence.after'),documento:t('clientEvidence.document')}
 const supabase=useMemo(()=>getRoleSupabase('client'),[]),instanceId=useId().replace(/:/g,'')
 const[items,setItems]=useState<Evidence[]>([]),[channelEpoch,setChannelEpoch]=useState(0)
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 const load=useCallback(async()=>{
  setError('')
  const{data,error}=await (supabase as any).from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at').eq('servicio_id',serviceId).order('created_at',{ascending:true})
  if(error){setError(error.message);setLoading(false);return}
  const rows=(data||[])as Evidence[]
  const signed=await Promise.all(rows.map(async row=>{const{data:signedData,error:signedError}=await supabase.storage.from('service-evidence').createSignedUrl(row.storage_path,900);return{...row,url:signedError?null:signedData?.signedUrl||null}}))
  setItems(signed);setLoading(false)
 },[serviceId,supabase])
 useEffect(()=>{
  let alive=true,reconnectTimer:number|undefined
  const refresh=()=>{if(alive)void load().catch(()=>setLoading(false))}
  const reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)}
  refresh()
  const topic=`client-evidence-${serviceId}-${instanceId}-${channelEpoch}`
  const ch:RealtimeChannel=supabase.channel(topic).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio',filter:`servicio_id=eq.${serviceId}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){refresh();reconnect()}})
  const onOnline=()=>{refresh();reconnect()},onVisibility=()=>{if(document.visibilityState==='visible'){refresh();reconnect()}}
  const refreshSignedUrls=window.setInterval(refresh,10*60*1000)
  window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility)
  return()=>{alive=false;if(reconnectTimer)window.clearTimeout(reconnectTimer);window.clearInterval(refreshSignedUrls);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}
 },[channelEpoch,instanceId,load,serviceId,supabase])
 if(loading&&!items.length)return hideWhenEmpty?null:<div className="ugo-evidence-state loading">{t('clientEvidence.loading')}</div>
 if(error&&!items.length)return hideWhenEmpty?null:<div className="ugo-evidence-state error">{t('clientEvidence.loadError')} {error}</div>
 if(!items.length)return hideWhenEmpty?null:<div className="ugo-evidence-state">{t('clientEvidence.noEvidence')}</div>
 return <section className={`ugo-client-evidence${compact?' compact':''}`} aria-label={t('screen.client_evidence.1')}><div className="ugo-client-evidence-head"><div><h3>{t('screen.client_evidence.1')}</h3><p>{t('clientEvidence.galleryHelp')}</p></div><span aria-hidden="true">{items.length}</span></div>{error&&<div className="ugo-evidence-state error">{t('clientEvidence.refreshError')}</div>}<div className="ugo-client-evidence-grid">{items.map(item=><figure key={item.id}>{item.url?<a href={item.url} target="_blank" rel="noreferrer" aria-label={t('clientEvidence.open',{label:labels[item.tipo]})}><img loading="lazy" decoding="async" src={item.url} alt={labels[item.tipo]}/></a>:<div className="ugo-evidence-preview-empty">{t('clientEvidence.noPreview')}</div>}<figcaption><strong>{labels[item.tipo]}</strong>{item.descripcion&&<span>{item.descripcion}</span>}</figcaption></figure>)}</div></section>
}
