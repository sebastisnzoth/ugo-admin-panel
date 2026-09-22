import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'
import{Button,EmptyState,LoadingState}from'../../shared/ui'

type Row={id:string;storage_path:string;descripcion:string|null;url?:string|null;urlError?:string|null}
type EvidenceError={kind:'query'|'storage'|'unknown';message:string}
const BUCKET='request-evidence'

function friendlyError(error:EvidenceError){
 if(error.kind==='query')return 'No pudimos consultar las fotos del pedido. Puede ser un problema de permisos/RLS o de conexión.'
 if(error.kind==='storage')return 'Encontramos el registro de la foto, pero no pudimos abrir el archivo en Storage.'
 return 'No pudimos cargar las fotos del pedido.'
}

export function ProviderRequestEvidence({serviceId}:{serviceId:string}){
 const supabase=useMemo(()=>getRoleSupabase('provider'),[]),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState<EvidenceError|null>(null)
 const load=useCallback(async()=>{
  setLoading(true);setLoadError(null)
  const{data,error}=await supabase.from('evidencias_solicitud').select('id,storage_path,descripcion').eq('servicio_id',serviceId).order('created_at',{ascending:true})
  if(error){setRows([]);setLoadError({kind:'query',message:error.message});setLoading(false);return}
  const signed=await Promise.all(((data||[])as Row[]).map(async r=>{
   const{data:s,error:storageError}=await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path,900)
   return{...r,url:s?.signedUrl||null,urlError:storageError?.message||(!s?.signedUrl?'SIGNED_URL_MISSING':null)}
  }))
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
