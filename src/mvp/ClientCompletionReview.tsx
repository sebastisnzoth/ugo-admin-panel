import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../lib/roleSupabase'
import{ClientEvidenceGallery}from'./ClientEvidenceGallery'

type ReviewService={
 id:string
 numero:number|string
 estado:string
 proveedor_id:string|null
 tarifa:number|null
 moneda:string|null
 metadata:Record<string,unknown>|null
 proveedor:{nombre?:string|null}|null
}
type ReviewPayment={metodo:string|null;estado:string;modelo_pago:string|null;monto_bruto:number|null;moneda:string|null}

function money(value:number|null|undefined,currency:string|null|undefined){
 const code=String(currency||'BRL').toUpperCase()
 try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:/^[A-Z]{3}$/.test(code)?code:'BRL'}).format(Number(value||0))}
 catch{return `R$ ${Number(value||0).toFixed(2).replace('.',',')}`}
}

export function ClientCompletionReview({onOpenDispute,serviceId=null,onCompleted}:{onOpenDispute?:()=>void;serviceId?:string|null;onCompleted?:()=>void|Promise<void>}){
 const supabase=useMemo(()=>getRoleSupabase('client'),[])
 const[userId,setUserId]=useState('')
 const[service,setService]=useState<ReviewService|null>(null),[channelEpoch,setChannelEpoch]=useState(0)
 const[payment,setPayment]=useState<ReviewPayment|null>(null)
 const[hasFinalEvidence,setHasFinalEvidence]=useState(false)
 const[busy,setBusy]=useState(false)
 const[notice,setNotice]=useState('')
 const load=useCallback(async()=>{
  const{data:auth}=await supabase.auth.getUser();const uid=auth.user?.id||'';setUserId(uid)
  if(!uid){setService(null);setPayment(null);setHasFinalEvidence(false);return}
  let query=supabase.from('servicios').select('id,numero,estado,proveedor_id,tarifa,moneda,metadata,proveedor:usuarios!servicios_proveedor_id_fkey(nombre)').eq('cliente_id',uid)
  if(serviceId)query=query.eq('id',serviceId).in('estado',['esperando_aprobacion','completado'])
  else query=query.eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(2)
  const{data,error}=await query
  if(error){setNotice('No pudimos actualizar el cierre. Reintentaremos sin perder el servicio.');return}
  const rows=(data||[])as unknown as ReviewService[]
  if(!serviceId&&rows.length!==1){setService(null);setPayment(null);setHasFinalEvidence(false);return}
  const next=rows[0]||null
  setService(next)
  if(!next){setHasFinalEvidence(false);setPayment(null);return}
  const[{data:evidence,error:evidenceError},{data:paymentRow}]=await Promise.all([
   supabase.from('evidencias_servicio').select('id').eq('servicio_id',next.id).eq('tipo','despues').eq('usuario_id',next.proveedor_id).limit(1),
   supabase.from('pagos').select('metodo,estado,modelo_pago,monto_bruto,moneda').eq('servicio_id',next.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ])
  setHasFinalEvidence(!evidenceError&&Boolean(evidence?.length))
  setPayment((paymentRow||null)as ReviewPayment|null)
 },[serviceId,supabase])
 const closurePersisted=useCallback(async(id:string)=>{const{data:auth}=await supabase.auth.getUser();const uid=auth.user?.id||'';if(!uid)return false;const{data}=await supabase.from('servicios').select('id,estado').eq('id',id).eq('cliente_id',uid).maybeSingle();return data?.estado==='completado'},[supabase])
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
 useEffect(()=>{if(!userId)return;let alive=true,reconnectTimer:number|undefined;const refresh=()=>{if(alive)void load().catch(()=>{})},reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)};const serviceFilter=serviceId?`id=eq.${serviceId}`:`cliente_id=eq.${userId}`;const ch=supabase.channel(`client-completion-review-${serviceId||userId}-${channelEpoch}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:serviceFilter},refresh).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio',...(serviceId?{filter:`servicio_id=eq.${serviceId}`}:{})},refresh).on('postgres_changes',{event:'*',schema:'public',table:'pagos',...(serviceId?{filter:`servicio_id=eq.${serviceId}`}:{filter:`cliente_id=eq.${userId}`})},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){refresh();reconnect()}});const onOnline=()=>{refresh();reconnect()};const onVisibility=()=>{if(document.visibilityState==='visible'){refresh();reconnect()}};window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);return()=>{alive=false;if(reconnectTimer)window.clearTimeout(reconnectTimer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}},[channelEpoch,load,serviceId,supabase,userId])
 useEffect(()=>{if(serviceId)return;document.body.classList.toggle('ugo-client-awaiting-review',service?.estado==='esperando_aprobacion');return()=>document.body.classList.remove('ugo-client-awaiting-review')},[service,serviceId])
 if(!service)return null

 const completed=service.estado==='completado'
 const isCash=payment?.metodo==='efectivo'||payment?.modelo_pago==='presencial'
 const workApproved=Boolean(service.metadata?.trabajo_aprobado_at)
 const cashConfirmed=isCash&&payment?.estado==='liberado'
 const amount=money(payment?.monto_bruto??service.tarifa,payment?.moneda||service.moneda)
 const providerName=service.proveedor?.nombre||'el proveedor'
 const electronicReady=!isCash&&payment?.estado==='retenido'
 const canApprove=!completed&&service.estado==='esperando_aprobacion'&&hasFinalEvidence&&Boolean(payment)&&(isCash?!workApproved:electronicReady)
 const canConfirmCash=!completed&&isCash&&workApproved&&!cashConfirmed&&service.estado==='esperando_aprobacion'

 async function approve(){
  if(!canApprove)return
  setBusy(true);setNotice('')
  try{
   const id=service.id
   const{error}=await supabase.rpc('aprobar_servicio',{p_servicio_id:id})
   if(error){
    if(!isCash&&await closurePersisted(id)){setNotice('Trabajo aprobado. El pago protegido fue liberado.');await load();await onCompleted?.();return}
    await load();throw error
   }
   setNotice(isCash?`Trabajo aprobado. Ahora pagá ${amount} a ${providerName}.`:'Trabajo aprobado. El pago protegido fue liberado.')
   await load()
   if(!isCash)await onCompleted?.()
  }catch(e){
   await load().catch(()=>{})
   setNotice(e instanceof Error?e.message:'No pudimos confirmar el trabajo. Actualizamos el estado real para que puedas reintentar.')
  }finally{setBusy(false)}
 }

 async function confirmCashPaid(){
  if(!canConfirmCash)return
  setBusy(true);setNotice('')
  try{
   const id=service.id
   const{error}=await supabase.rpc('confirmar_pago_efectivo_cliente',{p_servicio_id:id})
   if(error){
    if(await closurePersisted(id)){setNotice('Pago confirmado. UGO avisó al proveedor y cerró el servicio.');await load();await onCompleted?.();return}
    await load();throw error
   }
   setNotice('Pago confirmado. UGO avisó al proveedor y cerró el servicio.')
   await load()
   await onCompleted?.()
  }catch(e){
   await load().catch(()=>{})
   setNotice(e instanceof Error?e.message:'No pudimos confirmar el pago. El servicio conserva su estado para que puedas reintentar.')
  }finally{setBusy(false)}
 }

 const blockedReason=!hasFinalEvidence
  ?'Falta la evidencia final del proveedor.'
  :!payment
   ?'Falta confirmar la forma de pago.'
   :!isCash&&!electronicReady
    ?'El pago electrónico todavía no está confirmado y protegido.'
    :''

 const title=completed?'Trabajo y pago confirmados':isCash&&workApproved?'Pagá al proveedor':'¿Cómo quedó el trabajo?'

 return <section aria-live="polite" className="ugo-completion-review">
  <header><div><h2>{title}</h2><p>{completed?`Servicio #${service.numero} · El pedido quedó cerrado y las fotos siguen disponibles en su historial.`:isCash&&workApproved?`Servicio #${service.numero} · Trabajo aprobado. Falta completar el pago en efectivo.`:`Servicio #${service.numero} · Revisá el registro final antes de confirmar el trabajo.`}</p></div><span aria-hidden="true">✓</span></header>

  {!completed&&!hasFinalEvidence&&<div className="ugo-completion-warning">Todavía no hay una foto final “Después” del proveedor asignado. UGO no habilita la aprobación hasta poder revisarla.</div>}
  {!completed&&!payment&&<div className="ugo-completion-warning">UGO todavía no encuentra una forma de pago confirmada para este servicio.</div>}
  {!completed&&!isCash&&payment&&!electronicReady&&<div className="ugo-completion-warning">El pago electrónico todavía no está protegido. Cuando se confirme, vas a poder aprobar el trabajo.</div>}

  {notice&&<div className="ugo-completion-notice">{notice}</div>}

  {!completed&&isCash&&workApproved&&<div className="ugo-completion-decision">
    <strong>Pagá {amount} a {providerName}</strong>
    <span>Después de entregar el efectivo, tocá “YA PAGUÉ”. UGO avisará al proveedor y cerrará el servicio.</span>
  </div>}

  {!completed&&!workApproved&&<div className="ugo-completion-decision"><span>{blockedReason||(isCash?'Primero confirmá que el trabajo quedó bien. Después UGO te muestra cuánto pagar al proveedor.':'El trabajo está listo para confirmar. Al aprobar, UGO libera el pago electrónico protegido.')}</span></div>}

  {!completed&&<div className="ugo-completion-actions">
   {onOpenDispute&&<button type="button" onClick={onOpenDispute} disabled={busy}>Tengo un problema</button>}
   {isCash&&workApproved
    ?<button type="button" onClick={confirmCashPaid} disabled={busy||!canConfirmCash}>{busy?'Procesando…':`YA PAGUÉ ${amount}`}</button>
    :<button type="button" onClick={approve} disabled={busy||!canApprove}>{busy?'Procesando…':isCash?'CONFIRMAR TRABAJO':'CONFIRMAR Y LIBERAR PAGO'}</button>}
  </div>}

  <ClientEvidenceGallery serviceId={service.id}/>
 </section>
}
