import React,{useCallback,useEffect,useState}from'react'
import type{RealtimeChannel}from'@supabase/supabase-js'
import{supabase}from'../lib/supabase'

type Evidence={id:string;tipo:'antes'|'durante'|'despues'|'documento';storage_path:string;descripcion:string|null;created_at:string;url?:string|null}
type Props={serviceId:string}
const LABELS:Record<Evidence['tipo'],string>={antes:'Antes',durante:'Durante',despues:'Después',documento:'Documento'}

export function ClientEvidenceGallery({serviceId}:Props){
 const[items,setItems]=useState<Evidence[]>([])
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  const{data,error}=await supabase.from('evidencias_servicio').select('id,tipo,storage_path,descripcion,created_at').eq('servicio_id',serviceId).order('created_at',{ascending:true})
  if(error){setError(error.message);setLoading(false);return}
  const rows=(data||[])as Evidence[]
  const signed=await Promise.all(rows.map(async row=>{const{data:signedData}=await supabase.storage.from('service-evidence').createSignedUrl(row.storage_path,900);return{...row,url:signedData?.signedUrl||null}}))
  setItems(signed);setLoading(false)
 },[serviceId])
 useEffect(()=>{load().catch(()=>setLoading(false));const ch:RealtimeChannel=supabase.channel(`client-evidence-${serviceId}`).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio',filter:`servicio_id=eq.${serviceId}`},()=>{load().catch(()=>{})}).subscribe();return()=>{supabase.removeChannel(ch)}},[load,serviceId])
 if(loading)return <div className="mvp-waiting">Cargando evidencias del trabajo…</div>
 if(error)return <div className="mvp-notice error">No se pudieron cargar las evidencias: {error}</div>
 if(!items.length)return <div className="mvp-waiting">El proveedor todavía no subió evidencias visibles.</div>
 return <div className="mvp-card" style={{marginTop:16}}><div className="mvp-card-title"><div><small>EVIDENCIAS</small><h2>Revisá el trabajo</h2></div><span>📷</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>{items.map(item=><figure key={item.id} style={{margin:0,borderRadius:14,overflow:'hidden',background:'#f6f7f8'}}>{item.url?<img src={item.url} alt={`Evidencia ${LABELS[item.tipo]}`} style={{display:'block',width:'100%',aspectRatio:'4 / 3',objectFit:'cover'}}/>:<div style={{aspectRatio:'4 / 3',display:'grid',placeItems:'center'}}>Sin vista previa</div>}<figcaption style={{padding:10}}><strong>{LABELS[item.tipo]}</strong>{item.descripcion&&<div style={{fontSize:12,marginTop:4}}>{item.descripcion}</div>}</figcaption></figure>)}</div></div>
}
