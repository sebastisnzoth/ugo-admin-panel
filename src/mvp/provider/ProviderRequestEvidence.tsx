import{useLocale}from'../../i18n/locale'
import React,{useCallback,useEffect,useMemo,useState}from'react'
import{subscribeRealtimeChannel}from'../../lib/realtimeChannel'
import{providerEvidenceDb,loadRequestEvidence,type RequestEvidenceRow as Row}from'../../features/provider/services/providerEvidenceService'
import{Button,EmptyState,LoadingState}from'../../shared/ui'

type EvidenceError={kind:'query'|'storage'|'unknown';message:string}

export function ProviderRequestEvidence({serviceId}:{serviceId:string}){
 const{t}=useLocale();
 const friendlyError=(error:EvidenceError)=>error.kind==='query'?t('providerRequestEvidence.queryFailed'):error.kind==='storage'?t('providerRequestEvidence.storageFailed'):t('providerRequestEvidence.loadFailed')
 const supabase=useMemo(()=>providerEvidenceDb(),[]),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState<EvidenceError|null>(null)
 const load=useCallback(async()=>{
  setLoading(true);setLoadError(null)
  let signed:Row[]
  try{signed=await loadRequestEvidence(serviceId)}catch(error){setRows([]);setLoadError({kind:'query',message:error instanceof Error?error.message:String(error)});setLoading(false);return}
  setRows(signed)
  if(signed.some(r=>r.urlError))setLoadError({kind:'storage',message:'SIGNED_URL_FAILED'})
  setLoading(false)
 },[serviceId])
 const[channelEpoch,setChannelEpoch]=useState(0)
 useEffect(()=>{load().catch(error=>{setLoadError({kind:'unknown',message:error instanceof Error?error.message:String(error)});setLoading(false)});const ch=supabase.channel(`provider-request-evidence-${serviceId}`).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_solicitud',filter:`servicio_id=eq.${serviceId}`},()=>load().catch(()=>{}));const dispose=subscribeRealtimeChannel(ch,supabase,{onSync:()=>load().catch(()=>{}),onReconnect:()=>setChannelEpoch(v=>v+1)});return()=>{dispose()}},[load,serviceId,supabase,channelEpoch])
 if(loading)return <div className="provider-request-evidence-state"><LoadingState label={t('providerRequestEvidence.loading')}/></div>
 if(loadError&&rows.length===0)return <div className="provider-request-evidence-state is-error" role="alert"><EmptyState title={t('providerRequestEvidence.loadFailed')} description={friendlyError(loadError)} action={<Button variant="secondary" onClick={()=>void load()}>{t('screen.provider_evidence.1')}</Button>}/></div>
 if(!rows.length)return <div className="provider-request-evidence-state"><EmptyState title={t('providerRequestEvidence.noPhotos')} description={t('providerRequestEvidence.noPhotosHelp')}/></div>
 return <section className="provider-request-evidence"><div><strong>{t('screen.provider_evidence.2')}</strong><p>{t('screen.provider_evidence.3')}</p>{loadError?<p className="provider-request-evidence-warning" role="alert">{friendlyError(loadError)} {t('providerRequestEvidence.retryHint')}</p>:null}</div><div className="provider-request-evidence-grid">{rows.map(r=><figure key={r.id}>{r.url?<img loading="lazy" decoding="async" src={r.url} alt={t('providerRequestEvidence.photoAlt')}/>:<div className="provider-request-evidence-missing" role="img" aria-label={t('screen.provider_evidence.4')}>{t('screen.provider_evidence.4')}</div>}</figure>)}</div>{loadError?<Button variant="secondary" onClick={()=>void load()}>{t('screen.provider_evidence.5')}</Button>:null}</section>
}
