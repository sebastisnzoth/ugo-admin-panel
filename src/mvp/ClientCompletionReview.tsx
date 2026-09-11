import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ClientEvidenceGallery}from'./ClientEvidenceGallery'

type ReviewService={id:string;numero:number|string;estado:string;proveedor_id:string|null}

export function ClientCompletionReview({onOpenDispute}:{onOpenDispute:()=>void}){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[service,setService]=useState<ReviewService|null>(null)
 const[hasFinalEvidence,setHasFinalEvidence]=useState(false)
 const[busy,setBusy]=useState(false)
 const[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  const{data,error}=await (supabase as any).from('servicios').select('id,numero,estado,proveedor_id').eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(error){setService(null);return}
  const next=(data||null)as ReviewService|null
  setService(next)
  if(!next){setHasFinalEvidence(false);return}
  const{data:evidence,error:evidenceError}=await (supabase as any).from('evidencias_servicio').select('id').eq('servicio_id',next.id).eq('tipo','despues').limit(1)
  setHasFinalEvidence(!evidenceError&&Boolean(evidence?.length))
 },[supabase])
 useEffect(()=>{load().catch(()=>{});const ch=supabase.channel('client-completion-review').on('postgres_changes',{event:'*',schema:'public',table:'servicios'},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio'},()=>load().catch(()=>{})).subscribe();return()=>{supabase.removeChannel(ch)}},[load,supabase])
 useEffect(()=>{document.body.classList.toggle('ugo-client-awaiting-review',Boolean(service));return()=>document.body.classList.remove('ugo-client-awaiting-review')},[service])
 if(!service)return null
 async function approve(){if(!hasFinalEvidence)return;setBusy(true);setNotice('');const{error}=await supabase.rpc('aprobar_servicio',{p_servicio_id:service.id});setBusy(false);if(error){setNotice(error.message);return}setNotice('Trabajo aprobado. El pago protegido fue liberado.');await load()}
 return <section aria-live="polite" className="ugo-completion-review">
  <header><div><h2>¿Cómo quedó el trabajo?</h2><p>Servicio #{service.numero} · Revisá el registro final antes de liberar el pago.</p></div><span aria-hidden="true">✓</span></header>
  <ClientEvidenceGallery serviceId={service.id}/>
  {!hasFinalEvidence&&<div className="ugo-completion-warning">Todavía no hay una foto final “Después” visible. UGO no habilita la liberación hasta poder revisarla.</div>}
  {notice&&<div className="ugo-completion-notice">{notice}</div>}
  <div className="ugo-completion-decision"><span>Al confirmar, el pago protegido se libera según el flujo actual.</span></div>
  <div className="ugo-completion-actions"><button type="button" onClick={onOpenDispute} disabled={busy}>Tengo un problema</button><button type="button" onClick={approve} disabled={busy||!hasFinalEvidence}>{busy?'Procesando…':'Aprobar y liberar pago'}</button></div>
 </section>
}
