import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../lib/roleSupabase'

type Row={id:string;storage_path:string;descripcion:string|null;url?:string|null}
const BUCKET='request-evidence'

export function ProviderRequestEvidence({serviceId}:{serviceId:string}){
 const supabase=useMemo(()=>getRoleSupabase('provider'),[]),[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true)
 const load=useCallback(async()=>{setLoading(true);const{data,error}=await supabase.from('evidencias_solicitud').select('id,storage_path,descripcion').eq('servicio_id',serviceId).order('created_at',{ascending:true});if(error){setRows([]);setLoading(false);return}const signed=await Promise.all(((data||[])as Row[]).map(async r=>{const{data:s}=await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path,900);return{...r,url:s?.signedUrl||null}}));setRows(signed);setLoading(false)},[serviceId,supabase])
 useEffect(()=>{load().catch(()=>setLoading(false));const ch=supabase.channel(`provider-request-evidence-${serviceId}`).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_solicitud',filter:`servicio_id=eq.${serviceId}`},()=>load().catch(()=>{})).subscribe();return()=>{supabase.removeChannel(ch)}},[load,serviceId,supabase])
 if(loading)return <div className="provider-request-evidence-state">Cargando fotos del cliente…</div>
 if(!rows.length)return <div className="provider-request-evidence-state">El cliente no adjuntó fotos previas.</div>
 return <section className="provider-request-evidence"><div><strong>Fotos del trabajo enviadas por el cliente</strong><p>Revisalas antes de aceptar. Son parte del contexto original de la solicitud.</p></div><div className="provider-request-evidence-grid">{rows.map(r=><figure key={r.id}>{r.url?<img src={r.url} alt="Evidencia previa enviada por el cliente"/>:<div/>}</figure>)}</div></section>
}
