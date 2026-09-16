import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ClientEvidenceGallery}from'./ClientEvidenceGallery'

type ReviewService={id:string;numero:number|string;estado:string;proveedor_id:string|null}
type ReviewPayment={metodo:string|null;estado:string;modelo_pago:string|null}

export function ClientCompletionReview({onOpenDispute,serviceId=null}:{onOpenDispute?:()=>void;serviceId?:string|null}){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[userId,setUserId]=useState('')
 const[service,setService]=useState<ReviewService|null>(null)
 const[payment,setPayment]=useState<ReviewPayment|null>(null)
 const[hasFinalEvidence,setHasFinalEvidence]=useState(false)
 const[busy,setBusy]=useState(false)
 const[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  const{data:auth}=await supabase.auth.getUser();const uid=auth.user?.id||'';setUserId(uid)
  if(!uid){setService(null);setPayment(null);setHasFinalEvidence(false);return}
  let query=supabase.from('servicios').select('id,numero,estado,proveedor_id').eq('cliente_id',uid).eq('estado','esperando_aprobacion')
  if(serviceId)query=query.eq('id',serviceId)
  else query=query.order('created_at',{ascending:false}).limit(2)
  const{data,error}=await query
  if(error){setNotice('No pudimos actualizar el cierre. Reintentaremos sin perder el servicio.');return}
  const rows=(data||[])as ReviewService[]
  if(!serviceId&&rows.length!==1){setService(null);setPayment(null);setHasFinalEvidence(false);return}
  const next=rows[0]||null
  setService(next)
  if(!next){setHasFinalEvidence(false);setPayment(null);return}
  const[{data:evidence,error:evidenceError},{data:paymentRow}]=await Promise.all([
   supabase.from('evidencias_servicio').select('id').eq('servicio_id',next.id).eq('tipo','despues').eq('usuario_id',next.proveedor_id).limit(1),
   supabase.from('pagos').select('metodo,estado,modelo_pago').eq('servicio_id',next.id).maybeSingle(),
  ])
  setHasFinalEvidence(!evidenceError&&Boolean(evidence?.length))
  setPayment((paymentRow||null)as ReviewPayment|null)
 },[serviceId,supabase])
 const closurePersisted=useCallback(async(id:string)=>{const{data:auth}=await supabase.auth.getUser();const uid=auth.user?.id||'';if(!uid)return false;const{data}=await supabase.from('servicios').select('id,estado').eq('id',id).eq('cliente_id',uid).maybeSingle();return data?.estado==='completado'},[supabase])
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
 useEffect(()=>{if(!userId)return;const refresh=()=>void load().catch(()=>{});const serviceFilter=serviceId?`id=eq.${serviceId}`:`cliente_id=eq.${userId}`;const ch=supabase.channel(`client-completion-review-${serviceId||userId}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:serviceFilter},refresh).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'pagos',...(serviceId?{filter:`servicio_id=eq.${serviceId}`}:{filter:`cliente_id=eq.${userId}`})},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh()});const onOnline=()=>refresh();const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);return()=>{window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);supabase.removeChannel(ch)}},[load,serviceId,supabase,userId])
 useEffect(()=>{if(serviceId)return;document.body.classList.toggle('ugo-client-awaiting-review',Boolean(service));return()=>document.body.classList.remove('ugo-client-awaiting-review')},[service,serviceId])
 if(!service)return null
 const isCash=payment?.metodo==='efectivo'||payment?.modelo_pago==='presencial'
 const cashConfirmed=isCash&&payment?.estado==='liberado'
 const canApprove=hasFinalEvidence&&Boolean(payment)&&(!isCash||cashConfirmed)
 async function approve(){if(!canApprove)return;setBusy(true);setNotice('');try{const id=service.id;const{error}=await supabase.rpc('aprobar_servicio',{p_servicio_id:id});if(error){if(await closurePersisted(id)){setNotice(isCash?'Trabajo aprobado. El pago en efectivo quedó registrado.':'Trabajo aprobado. El pago protegido fue liberado.');await load();return}await load();throw error}setNotice(isCash?'Trabajo aprobado. El pago en efectivo quedó registrado.':'Trabajo aprobado. El pago protegido fue liberado.');await load()}catch(e){await load().catch(()=>{});setNotice(e instanceof Error?e.message:'No pudimos confirmar el cierre. Actualizamos el estado real para que puedas reintentar.')}finally{setBusy(false)}}
 const blockedReason=!hasFinalEvidence?'Falta la evidencia final del proveedor.':!payment?'Falta confirmar la forma de pago.':isCash&&!cashConfirmed?'El proveedor todavía debe confirmar que recibió el efectivo.':''
 return <section aria-live="polite" className="ugo-completion-review">
  <header><div><h2>¿Cómo quedó el trabajo?</h2><p>Servicio #{service.numero} · Revisá el registro final antes de cerrar el servicio.</p></div><span aria-hidden="true">✓</span></header>
  {!hasFinalEvidence&&<div className="ugo-completion-warning">Todavía no hay una foto final “Después” del proveedor asignado. UGO no habilita la aprobación hasta poder revisarla.</div>}
  {!payment&&<div className="ugo-completion-warning">UGO todavía no encuentra una forma de pago confirmada para este servicio.</div>}
  {isCash&&!cashConfirmed&&<div className="ugo-completion-warning">El proveedor todavía debe confirmar que recibió el efectivo. UGO registra este pago, pero no tiene custodia electrónica sobre el dinero.</div>}
  {notice&&<div className="ugo-completion-notice">{notice}</div>}
  <div className="ugo-completion-decision"><span>{blockedReason|| (isCash?'El efectivo fue confirmado por el proveedor. Confirmá para cerrar el servicio.':'El trabajo está listo para confirmar. Al aprobar, UGO libera el pago electrónico protegido.')}</span></div>
  <div className="ugo-completion-actions">{onOpenDispute&&<button type="button" onClick={onOpenDispute} disabled={busy}>Tengo un problema</button>}<button type="button" onClick={approve} disabled={busy||!canApprove}>{busy?'Procesando…':isCash?'CONFIRMAR TRABAJO':'CONFIRMAR Y LIBERAR PAGO'}</button></div>
  <ClientEvidenceGallery serviceId={service.id}/>
 </section>
}