import{useLocale}from'../../../i18n/locale'
import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import{approvePendingClientService,confirmApprovedCashClientService}from'../services/clientActionService'

type ReviewService={
 ambiente?:string|null
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

export function ClientCompletionReview({onOpenDispute,serviceId=null}:{onOpenDispute?:()=>void;serviceId?:string|null;onCompleted?:()=>void|Promise<void>}){
 const{t,locale}=useLocale();
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
  let query=supabase.from('servicios').select('id,numero,estado,proveedor_id,tarifa,moneda,ambiente,metadata,proveedor:usuarios!servicios_proveedor_id_fkey(nombre)').eq('cliente_id',uid)
  if(serviceId)query=query.eq('id',serviceId).in('estado',['esperando_aprobacion','completado'])
  else query=query.eq('estado','esperando_aprobacion').order('created_at',{ascending:false}).limit(1)
  const{data,error}=await query
  if(error){setNotice(t('clientReview.loadFailed'));return}
  const rows=(data||[])as unknown as ReviewService[]
  const next=rows[0]||null
  setService(next)
  if(!next){setHasFinalEvidence(false);setPayment(null);return}
  const[{data:evidence,error:evidenceError},{data:paymentRow}]=await Promise.all([
   supabase.from('evidencias_servicio').select('id').eq('servicio_id',next.id).eq('tipo','despues').eq('usuario_id',next.proveedor_id).limit(1),
   supabase.from('pagos').select('metodo,estado,modelo_pago,monto_bruto,moneda').eq('servicio_id',next.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ])
  setHasFinalEvidence(!evidenceError&&Boolean(evidence?.length))
  setPayment((paymentRow||null)as ReviewPayment|null)
 },[serviceId,supabase,t])
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load])
 useEffect(()=>{if(!userId)return;let alive=true,reconnectTimer:number|undefined;const refresh=()=>{if(alive)void load().catch(()=>{})},reconnect=()=>{if(reconnectTimer)window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1000)};const serviceFilter=serviceId?`id=eq.${serviceId}`:`cliente_id=eq.${userId}`;const ch=supabase.channel(`client-completion-review-${serviceId||userId}-${channelEpoch}`).on('postgres_changes',{event:'*',schema:'public',table:'servicios',filter:serviceFilter},refresh).on('postgres_changes',{event:'*',schema:'public',table:'evidencias_servicio',...(serviceId?{filter:`servicio_id=eq.${serviceId}`}:{})},refresh).on('postgres_changes',{event:'*',schema:'public',table:'pagos',...(serviceId?{filter:`servicio_id=eq.${serviceId}`}:{filter:`cliente_id=eq.${userId}`})},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){refresh();reconnect()}});const onOnline=()=>{refresh();reconnect()};const onVisibility=()=>{if(document.visibilityState==='visible'){refresh();reconnect()}};window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);return()=>{alive=false;if(reconnectTimer)window.clearTimeout(reconnectTimer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}},[channelEpoch,load,serviceId,supabase,userId])
 useEffect(()=>{if(serviceId)return;document.body.classList.toggle('ugo-client-awaiting-review',service?.estado==='esperando_aprobacion');return()=>document.body.classList.remove('ugo-client-awaiting-review')},[service,serviceId])
 if(!service)return null

 const completed=service.estado==='completado'
 const workApproved=Boolean(service.metadata?.trabajo_aprobado_at)
 const canApprove=!completed&&service.estado==='esperando_aprobacion'&&hasFinalEvidence&&!workApproved
 const cashPending=workApproved&&service.metadata?.cobro_metodo==='efectivo'&&payment?.metodo==='efectivo'&&payment.estado==='pendiente'

 async function approve(){
  if(!canApprove||!userId)return
  setBusy(true);setNotice('')
  try{
   const ok=await approvePendingClientService(supabase,userId,service.id)
   if(!ok)throw new Error(t('clientReview.notReady'))
   setNotice(locale==='pt-BR'?'Trabalho aprovado. O profissional escolherá como cobrar.':locale==='en'?'Work approved. The professional will choose the payment method.':'Trabajo aprobado. El proveedor elegirá cómo cobrar.')
   await load()
   // Approval does not indicate payment received or complete the financial settlement.
  }catch(e){
   await load().catch(()=>{})
   setNotice(e instanceof Error?e.message:t('clientReview.approveFailed'))
  }finally{setBusy(false)}
 }


 async function confirmCash(){
  if(!cashPending||busy||!userId)return
  setBusy(true);setNotice('')
  try{
   const ok=await confirmApprovedCashClientService(supabase,userId,service.id)
   if(!ok)throw new Error(t('clientReview.cashNotReady'))
   setNotice(locale==='pt-BR'?'Pagamento em dinheiro registrado.':locale==='en'?'Cash payment confirmed.':'Pago en efectivo confirmado.')
   await load()
  }catch(e){await load().catch(()=>{});setNotice(e instanceof Error?e.message:t('clientReview.cashFailed'))}
  finally{setBusy(false)}
 }

 const blockedReason=!hasFinalEvidence?t('clientReview.needEvidence'):''

 const ui=locale==='pt-BR'?{
  approved:'Trabalho aprovado',waiting:'Aguardando o profissional escolher a forma de cobrança.',cashPrompt:'O profissional escolheu dinheiro. Confirme somente depois de entregar o valor.',
  approveHelp:'Confira o trabalho e aprove. O pagamento é decidido depois.',cashConfirm:'CONFIRMO QUE ENTREGUEI O DINHEIRO',approveButton:'APROVAR O TRABALHO'
 }:locale==='en'?{
  approved:'Work approved',waiting:'Waiting for the professional to choose the collection method.',cashPrompt:'The professional selected cash. Confirm only after handing over the money.',
  approveHelp:'Review and approve the work. Payment comes later.',cashConfirm:'I CONFIRM CASH HANDOVER',approveButton:'APPROVE WORK'
 }:{
  approved:'Trabajo aprobado',waiting:'Esperando que el proveedor elija cómo cobrar.',cashPrompt:'El proveedor eligió efectivo. Confirmá solamente después de entregar el dinero.',
  approveHelp:'Revisá y aprobá el trabajo. El pago se decide después.',cashConfirm:'CONFIRMO QUE ENTREGUÉ EL EFECTIVO',approveButton:'APROBAR EL TRABAJO'
 }

 const title=workApproved?ui.approved:completed?t('clientReview.confirmedTitle'):t('clientReview.workQuestion')

 return <section aria-live="polite" className="ugo-completion-review">
  <header><div><h2>{title}</h2><p>{workApproved?ui.waiting:t('clientReview.reviewBefore',{number:service.numero})}</p></div><span aria-hidden="true">✓</span></header>
  {!completed&&!hasFinalEvidence&&<div className="ugo-completion-warning">{t('clientReview.noFinalPhoto')}</div>}
  {notice&&<div className="ugo-completion-notice">{notice}</div>}
  {cashPending&&<div className="ugo-completion-decision"><span>{ui.cashPrompt}</span></div>}
  {!completed&&!workApproved&&<div className="ugo-completion-decision"><span>{blockedReason||ui.approveHelp}</span></div>}
  {!completed&&<div className="ugo-completion-actions">
   {onOpenDispute&&<button type="button" className="ugo-completion-dispute" onClick={onOpenDispute} disabled={busy}>{t('screen.client_review.4')}</button>}
   {cashPending&&<button type="button" onClick={()=>void confirmCash()} disabled={busy}>{busy?t('clientReview.processing'):ui.cashConfirm}</button>}
   {!workApproved&&<button type="button" onClick={approve} disabled={busy||!canApprove}>{busy?t('clientReview.processing'):ui.approveButton}</button>}
  </div>}
 </section>
}
