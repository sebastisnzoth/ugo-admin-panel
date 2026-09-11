import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ClientEvidenceGallery}from'./ClientEvidenceGallery'

type ReviewService={id:string;numero:number|string;estado:string;proveedor_id:string|null}
type ReviewPayment={metodo:string|null;estado:string;modelo_pago:string|null}

export function ClientCompletionReview({onOpenDispute}:{onOpenDispute:()=>void}){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[service,setService]=useState<ReviewService|null>(null)
 const[payment,setPayment]=useState<ReviewPayment|null>(null)
 const[hasFinalEvidence,setHasFinalEvidence]=useState(false)
 const[busy,setBusy]=useState(false)
 const[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  const{data,error}=await (supabase as any).from('servicios').select('id,numero,estado,proveedor_id').eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(error){setService(null);setPayment(null);return}
  const next=(data||null)as ReviewService|null
  setService(next)
  if(!next){setHasFinalEvidence(false);setPayment(null);return}
  const[{data:evidence,error:evidenceError},{data:paymentRow}]=await Promise.all([
   (supabase as any).from('evidencias_servicio').select('id').eq('servicio_id',next.id).eq('tipo','despues').limit(1),
   (supabase as any).from('pagos').select('metodo,estado,modelo_pago').eq('servicio_id',next.id).maybeSingle(),
  ])
  setHasFinalEvidence(!evidenceError&&Boolean(evidence?.length))
  setPayment((paymentRow||null)as ReviewPayment|null)
 },[supabase])
 useEffect(()=>{load().catch(()=>{});const ch=supabase.channel('client-completion-review').on('postgres_changes',{event:'*',schema:'public',table:'servicios'},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio'},()=>load().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'pagos'},()=>load().catch(()=>{})).subscribe();return()=>{supabase.removeChannel(ch)}},[load,supabase])
 useEffect(()=>{document.body.classList.toggle('ugo-client-awaiting-review',Boolean(service));return()=>document.body.classList.remove('ugo-client-awaiting-review')},[service])
 if(!service)return null
 const isCash=payment?.metodo==='efectivo'||payment?.modelo_pago==='presencial'
 const cashConfirmed=isCash&&payment?.estado==='liberado'
 const canApprove=hasFinalEvidence&&(!isCash||cashConfirmed)
 async function approve(){if(!canApprove)return;setBusy(true);setNotice('');const{error}=await supabase.rpc('aprobar_servicio',{p_servicio_id:service.id});setBusy(false);if(error){setNotice(error.message);return}setNotice(isCash?'Trabajo aprobado. El pago en efectivo quedó registrado.':'Trabajo aprobado. El pago protegido fue liberado.');await load()}
 return <section aria-live="polite" className="ugo-completion-review">
  <header><div><h2>¿Cómo quedó el trabajo?</h2><p>Servicio #{service.numero} · Revisá el registro final antes de cerrar el servicio.</p></div><span aria-hidden="true">✓</span></header>
  <ClientEvidenceGallery serviceId={service.id}/>
  {!hasFinalEvidence&&<div className="ugo-completion-warning">Todavía no hay una foto final “Después” visible. UGO no habilita la aprobación hasta poder revisarla.</div>}
  {isCash&&!cashConfirmed&&<div className="ugo-completion-warning">El proveedor todavía debe confirmar que recibió el efectivo. UGO registra este pago, pero no tiene custodia electrónica sobre el dinero.</div>}
  {notice&&<div className="ugo-completion-notice">{notice}</div>}
  <div className="ugo-completion-decision"><span>{isCash?(cashConfirmed?'El efectivo fue confirmado por el proveedor. Al aprobar, cerrás el servicio.':'Esperando confirmación del efectivo por parte del proveedor.'):'Al confirmar, el pago electrónico protegido se libera según el flujo de UGO.'}</span></div>
  <div className="ugo-completion-actions"><button type="button" onClick={onOpenDispute} disabled={busy}>Tengo un problema</button><button type="button" onClick={approve} disabled={busy||!canApprove}>{busy?'Procesando…':isCash?'Aprobar trabajo':'Aprobar y liberar pago'}</button></div>
 </section>
}