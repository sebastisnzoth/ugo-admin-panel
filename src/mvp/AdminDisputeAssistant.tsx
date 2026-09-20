import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-dispute-assistant.css'

type Attachment={path:string;name:string;type:string;bucket:'dispute-evidence'|'service-evidence';source:'disputa'|'servicio';label:string}
type SignedAttachment=Attachment&{url:string|null}
type Analysis={summary:string;observedFacts:string[];imageObservations:string[];inconsistencies:string[];missingEvidence:string[];riskLevel:string;requiresHuman:boolean;recommendation:string;confidence:number;rationale:string}
const disputeAttachments=(value:unknown):Attachment[]=>Array.isArray(value)?value.flatMap(item=>{if(!item||typeof item!=='object')return[];const row=item as Record<string,unknown>,path=String(row.path||'');return path?[{path,name:String(row.name||path.split('/').pop()||'evidencia'),type:String(row.type||''),bucket:'dispute-evidence' as const,source:'disputa' as const,label:'Adjunto de la disputa'}]:[]}):[]
const image=(item:Attachment)=>item.type.startsWith('image/')||/\.(png|webp|jpe?g|heic|heif)$/i.test(item.path)
const recommendation=(value:string)=>value==='favor_cliente'?'Revisar resolución a favor del cliente':value==='favor_proveedor'?'Revisar resolución a favor del proveedor':value==='acuerdo'?'Buscar acuerdo entre partes':value==='retrabajo'?'Evaluar corrección/retrabajo':'Evidencia insuficiente para recomendar una salida'
const serviceEvidenceLabel=(tipo:string)=>tipo==='antes'?'Servicio · Antes':tipo==='durante'?'Servicio · Durante':tipo==='despues'?'Servicio · Después':'Servicio · Documento'

export function AdminDisputeAssistant({disputeId,onDraft}:{disputeId:string;onDraft:(text:string)=>void}){
 const[files,setFiles]=useState<SignedAttachment[]>([]),[analysis,setAnalysis]=useState<Analysis|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const loadFiles=useCallback(async()=>{
  setError('')
  const{data:d,error:disputeError}=await(supabase as any).from('disputas').select('servicio_id,evidencias').eq('id',disputeId).maybeSingle()
  if(disputeError){setError('No se pudo cargar la evidencia del expediente.');setFiles([]);return}
  const serviceId=typeof d?.servicio_id==='string'?d.servicio_id:null
  const[{data:m,error:messageError},{data:serviceRows,error:serviceError}]=await Promise.all([
   (supabase as any).from('disputa_mensajes').select('evidencias').eq('disputa_id',disputeId),
   serviceId?(supabase as any).from('evidencias_servicio').select('tipo,storage_path,descripcion,created_at').eq('servicio_id',serviceId).order('created_at',{ascending:true}):Promise.resolve({data:[],error:null})
  ])
  if(messageError||serviceError)setError('Parte de la evidencia no pudo cargarse. El análisis conservará el snapshot disponible.')
  const dispute=[...disputeAttachments(d?.evidencias),...(m||[]).flatMap((row:any)=>disputeAttachments(row.evidencias))]
  const service:Attachment[]=((serviceRows||[])as any[]).flatMap(row=>{const path=String(row.storage_path||'');if(!path)return[];const tipo=String(row.tipo||'documento');return[{path,name:String(row.descripcion||serviceEvidenceLabel(tipo)),type:/\.pdf$/i.test(path)?'application/pdf':'image/*',bucket:'service-evidence' as const,source:'servicio' as const,label:serviceEvidenceLabel(tipo)}]})
  const unique=[...new Map([...service,...dispute].map(item=>[item.bucket+':'+item.path,item])).values()]
  const signed=await Promise.all(unique.map(async item=>{const{data}=await(supabase as any).storage.from(item.bucket).createSignedUrl(item.path,900);return{...item,url:data?.signedUrl||null}}))
  setFiles(signed)
 },[disputeId])
 useEffect(()=>{void loadFiles()},[loadFiles])
 const analyze=async()=>{setBusy(true);setError('');try{const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sesión Admin requerida.');const response=await fetch('/api/disputes/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({disputeId})}),payload=await response.json();if(!response.ok)throw new Error(payload.error||'No se pudo analizar.');setAnalysis(payload.analysis)}catch(e){setError(e instanceof Error?e.message:'No se pudo analizar la disputa.')}finally{setBusy(false)}}
 return <section className="ugo-dispute-ai">
  <div className="ugo-dispute-ai-head"><div><small>ASISTENTE IA · EVIDENCIA</small><strong>Resumen para decisión humana</strong></div><button type="button" disabled={busy} onClick={()=>void analyze()}>{busy?'Analizando…':'Analizar caso'}</button></div>
  <p>UGO vincula automáticamente las evidencias Antes/Durante/Después del servicio y los adjuntos del expediente. La IA ordena el material, pero no ejecuta pagos ni resuelve el caso por sí sola.</p>
  {files.length>0&&<><div className="ugo-dispute-evidence-summary"><b>{files.filter(file=>file.source==='servicio').length}</b> del servicio · <b>{files.filter(file=>file.source==='disputa').length}</b> adjunto(s) del caso</div><div className="ugo-dispute-attachments">{files.map(file=><article key={file.bucket+':'+file.path} className={file.source}><div className="ugo-dispute-evidence-badge">{file.label}</div>{file.url&&image(file)?<a href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.name}/></a>:<span>ARCHIVO</span>}<div><b>{file.name}</b>{file.url&&<a href={file.url} target="_blank" rel="noreferrer">Abrir evidencia</a>}</div></article>)}</div></>}
  {error&&<div className="ugo-case-warning">{error}</div>}
  {analysis&&<div className="ugo-ai-result"><div><span className={'risk '+analysis.riskLevel}>{analysis.riskLevel}</span>{analysis.requiresHuman&&<b>Revisión humana obligatoria</b>}</div><h4>{analysis.summary}</h4><p><strong>Sugerencia:</strong> {recommendation(analysis.recommendation)} · confianza {Math.round(analysis.confidence*100)}%</p>{analysis.observedFacts.length>0&&<details open><summary>Hechos observados</summary><ul>{analysis.observedFacts.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}{analysis.imageObservations.length>0&&<details><summary>Qué se observa en las imágenes</summary><ul>{analysis.imageObservations.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}{analysis.inconsistencies.length>0&&<details><summary>Inconsistencias</summary><ul>{analysis.inconsistencies.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}{analysis.missingEvidence.length>0&&<details><summary>Evidencia faltante</summary><ul>{analysis.missingEvidence.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}<p>{analysis.rationale}</p><button type="button" onClick={()=>onDraft((analysis.summary+' '+analysis.rationale).trim())}>Usar como borrador del fundamento</button></div>}
 </section>
}
