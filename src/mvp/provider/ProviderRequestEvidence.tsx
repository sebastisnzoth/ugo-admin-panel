import React,{useCallback,useEffect,useMemo,useState}from'react'
import{providerEvidenceDb,loadRequestEvidence,type RequestEvidenceRow as Row}from'../../features/provider/services/providerEvidenceService'
import{Button,EmptyState,LoadingState}from'../../shared/ui'

type EvidenceError={kind:'query'|'storage'|'unknown';message:string}
function friendlyError(error:EvidenceError){
 if(error.kind==='query')return 'No pudimos consultar las fotos del pedido. Puede ser un problema de permisos/RLS o de conexión.'
 if(error.kind==='storage')return 'Encontramos el registro de la foto, pero no pudimos abrir el archivo en Storage.'
 return 'No pudimos cargar las fotos del pedido.'
}

export function ProviderRequestEvidence({serviceId}:{serviceId:string}){
 const supabase=useMemo(()=>providerEvidenceDb(),[]),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState<EvidenceError|null>(null)
 const load=useCallback(async()=>{
  setLoading(true);setLoadError(null)
  let signed:Row[]
  try{signed=await loadRequestEvidence(serviceId)}catch(error){setRows([]);setLoadError({kind:'query',message:error instanceof Error?error.message:String(error)});setLoading(false);return}
  setRows(signed)
  if(signed.some(r=>r.urlError))setLoadError({kind:'storage',message:'SIGNED_URL_FAILED'})
  setLoading(false)
 },[serviceId,supabase])
 useEffect(()=>{load().catch(error=>{setLoadError({kind:'unknown',message:error instanceof Error?error.message:String(error)});setLoading(false)});const ch=supabase.channel(`provider-request-evidence-${serviceId}`).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_solicitud',filter:`servicio_id=eq.${serviceId}`},()=>load().catch(()=>{})).subscribe();return()=>{supabase.removeChannel(ch)}},[load,serviceId,supabase])
 if(loading)return <div className="provider-request-evidence-state"><LoadingState label="Cargando fotos del cliente…"/></div>
 if(loadError&&rows.length===0)return <div className="provider-request-evidence-state is-error" role="alert"><EmptyState title="No se pudieron cargar las fotos." description={friendlyError(loadError)} action={<Button variant="secondary" onClick={()=>void load()}>Reintentar</Button>}/></div>
 if(!rows.length)return <div className="provider-request-evidence-state"><EmptyState title="Sin fotos previas" description="El cliente no adjuntó fotos previas."/></div>
 return <section className="provider-request-evidence"><div><strong>Fotos del trabajo enviadas por el cliente</strong><p>Revisalas antes de aceptar. Son parte del contexto original de la solicitud.</p>{loadError?<p className="provider-request-evidence-warning" role="alert">{friendlyError(loadError)} Reintentá si alguna foto no aparece.</p>:null}</div><div className="provider-request-evidence-grid">{rows.map(r=><figure key={r.id}>{r.url?<img src={r.url} alt="Evidencia previa enviada por el cliente"/>:<div className="provider-request-evidence-missing" role="img" aria-label="Archivo de evidencia no disponible">Archivo no disponible</div>}</figure>)}</div>{loadError?<Button variant="secondary" onClick={()=>void load()}>Reintentar fotos</Button>:null}</section>
}
