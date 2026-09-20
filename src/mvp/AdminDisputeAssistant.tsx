import React,{useCallback,useEffect,useState}from'react'
import{supabase}from'../lib/supabase'
import'./admin-dispute-assistant.css'

type Attachment={path:string;name:string;type:string}
type SignedAttachment=Attachment&{url:string|null}
type Analysis={summary:string;observedFacts:string[];imageObservations:string[];inconsistencies:string[];missingEvidence:string[];riskLevel:string;requiresHuman:boolean;recommendation:string;confidence:number;rationale:string}
const attachments=(value:unknown):Attachment[]=>Array.isArray(value)?value.flatMap(item=>{if(!item||typeof item!=='object')return[];const row=item as Record<string,unknown>,path=String(row.path||'');return path?[{path,name:String(row.name||path.split('/').pop()||'evidencia'),type:String(row.type||'')}]:[]}):[]
const image=(item:Attachment)=>item.type.startsWith('image/')||/\.(png|webp|jpe?g|heic|heif)$/i.test(item.path)
const recommendation=(value:string)=>value==='favor_cliente'?'Revisar resolución a favor del cliente':value==='favor_proveedor'?'Revisar resolución a favor del proveedor':value==='acuerdo'?'Buscar acuerdo entre partes':value==='retrabajo'?'Evaluar corrección/retrabajo':'Evidencia insuficiente para recomendar una salida'

export function AdminDisputeAssistant({disputeId,onDraft}:{disputeId:string;onDraft:(text:string)=>void}){
 const[files,setFiles]=useState<SignedAttachment[]>([]),[analysis,setAnalysis]=useState<Analysis|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const loadFiles=useCallback(async()=>{const[{data:d},{data:m}]=await Promise.all([(supabase as any).from('disputas').select('evidencias').eq('id',disputeId).maybeSingle(),(supabase as any).from('disputa_mensajes').select('evidencias').eq('disputa_id',disputeId)]);const all=[...attachments(d?.evidencias),...(m||[]).flatMap((row:any)=>attachments(row.evidencias))],unique=[...new Map(all.map(item=>[item.path,item])).values()];const signed=await Promise.all(unique.map(async item=>{const{data}=await(supabase as any).storage.from('dispute-evidence').createSignedUrl(item.path,900);return{...item,url:data?.signedUrl||null}}));setFiles(signed)},[disputeId])
 useEffect(()=>{void loadFiles()},[loadFiles])
 const analyze=async()=>{setBusy(true);setError('');try{const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sesión Admin requerida.');const response=await fetch('/api/disputes/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({disputeId})}),payload=await response.json();if(!response.ok)throw new Error(payload.error||'No se pudo analizar.');setAnalysis(payload.analysis)}catch(e){setError(e instanceof Error?e.message:'No se pudo analizar la disputa.')}finally{setBusy(false)}}
 return <section className="ugo-dispute-ai">
  <div className="ugo-dispute-ai-head"><div><small>ASISTENTE IA · EVIDENCIA</small><strong>Resumen para decisión humana</strong></div><button type="button" disabled={busy} onClick={()=>void analyze()}>{busy?'Analizando…':'Analizar caso'}</button></div>
  <p>La IA ordena chat, estados, snapshot y fotos. No ejecuta pagos ni resuelve el caso por sí sola.</p>
  {files.length>0&&<div className="ugo-dispute-attachments">{files.map(file=><article key={file.path}>{file.url&&image(file)?<a href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.name}/></a>:<span>ARCHIVO</span>}<div><b>{file.name}</b>{file.url&&<a href={file.url} target="_blank" rel="noreferrer">Abrir</a>}</div></article>)}</div>}
  {error&&<div className="ugo-case-warning">{error}</div>}
  {analysis&&<div className="ugo-ai-result"><div><span className={'risk '+analysis.riskLevel}>{analysis.riskLevel}</span>{analysis.requiresHuman&&<b>Revisión humana obligatoria</b>}</div><h4>{analysis.summary}</h4><p><strong>Sugerencia:</strong> {recommendation(analysis.recommendation)} · confianza {Math.round(analysis.confidence*100)}%</p>{analysis.observedFacts.length>0&&<details open><summary>Hechos observados</summary><ul>{analysis.observedFacts.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}{analysis.imageObservations.length>0&&<details><summary>Qué se observa en las imágenes</summary><ul>{analysis.imageObservations.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}{analysis.inconsistencies.length>0&&<details><summary>Inconsistencias</summary><ul>{analysis.inconsistencies.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}{analysis.missingEvidence.length>0&&<details><summary>Evidencia faltante</summary><ul>{analysis.missingEvidence.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}<p>{analysis.rationale}</p><button type="button" onClick={()=>onDraft((analysis.summary+' '+analysis.rationale).trim())}>Usar como borrador del fundamento</button></div>}
 </section>
}
