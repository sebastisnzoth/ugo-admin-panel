import React,{useCallback,useEffect,useMemo,useState}from'react'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{getRoleSupabase}from'../lib/roleSupabase'

type Evidence={id:string;tipo:'antes'|'durante'|'despues'|'documento';storage_path:string;descripcion:string|null;created_at:string;url?:string|null}
type Props={serviceId:string}
const LABELS:Record<Evidence['tipo'],string>={antes:'Antes',durante:'Durante',despues:'Después',documento:'Documento'}

export function ClientEvidenceGallery({serviceId}:Props){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[items,setItems]=useState<Evidence[]>([])
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  const{data,error}=await (supabase as any).from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at').eq('servicio_id',serviceId).order('created_at',{ascending:true})
  if(error){setError(error.message);setLoading(false);return}
  const rows=(data||[])as Evidence[]
  const signed=await Promise.all(rows.map(async row=>{const{data:signedData,error:signedError}=await supabase.storage.from('service-evidence').createSignedUrl(row.storage_path,900);return{...row,url:signedError?null:signedData?.signedUrl||null}}))
  setItems(signed);setLoading(false)
 },[serviceId,supabase])
 useEffect(()=>{load().catch(()=>setLoading(false));const ch:RealtimeChannel=supabase.channel(`client-evidence-${serviceId}`).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio',filter:`servicio_id=eq.${serviceId}`},()=>{load().catch(()=>{})}).subscribe();return()=>{supabase.removeChannel(ch)}},[load,serviceId,supabase])
 if(loading)return <div className="ugo-evidence-state loading">Cargando evidencias del trabajo…</div>
 if(error)return <div className="ugo-evidence-state error">No se pudieron cargar las evidencias: {error}</div>
 if(!items.length)return <div className="ugo-evidence-state">El proveedor todavía no subió evidencias visibles.</div>
 return <section className="ugo-client-evidence" aria-label="Evidencias del trabajo"><div className="ugo-client-evidence-head"><div><h3>Revisá las evidencias</h3><p>Compará el registro del servicio antes de confirmarlo.</p></div><span aria-hidden="true">{items.length}</span></div><div className="ugo-client-evidence-grid">{items.map(item=><figure key={item.id}>{item.url?<img src={item.url} alt={`Evidencia ${LABELS[item.tipo]}`}/>:<div className="ugo-evidence-preview-empty">Sin vista previa</div>}<figcaption><strong>{LABELS[item.tipo]}</strong>{item.descripcion&&<span>{item.descripcion}</span>}</figcaption></figure>)}</div></section>
}
