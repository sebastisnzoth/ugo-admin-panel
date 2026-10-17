import{useLocale}from'../../../i18n/locale'
import React,{useCallback,useEffect,useMemo,useState}from'react'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import{approvePendingClientService,confirmApprovedCashClientService}from'../services/clientActionService'

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

function money(value:number|null|undefined,currency:string|null|undefined,locale:string){
 const code=String(currency||'BRL').toUpperCase()
 try{return new Intl.NumberFormat(locale,{style:'currency',currency:/^[A-Z]{3}$/.test(code)?code:'BRL'}).format(Number(value||0))}
 catch{return `R$ ${Number(value||0).toFixed(2).replace(locale==='pt-BR'||locale==='es'?'.':',',locale==='pt-BR'||locale==='es'?',':'.')}`}
}

export function ClientCompletionReview({onOpenDispute,serviceId=null,onCompleted}:{onOpenDispute?:()=>void;serviceId?:string|null;onCompleted?:()=>void|Promise<void>}){
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
  let query=supabase.from('servicios').select('id,numero,estado,proveedor_id,tarifa,moneda,metadata,proveedor:usuarios!servicios_proveedor_id_fkey(nombre)').eq('cliente_id',uid)
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
 const isCash=payment?.metodo==='efectivo'||payment?.modelo_pago==='presencial'
 const workApproved=Boolean(service.metadata?.trabajo_aprobado_at)
 const cashConfirmed=isCash&&payment?.estado==='liberado'
 const amount=money(payment?.monto_bruto??service.tarifa,payment?.moneda||service.moneda,locale)
 const providerName=service.proveedor?.nombre||t('clientReview.providerDefault')
 const electronicReady=!isCash&&payment?.estado==='retenido'
 const canApprove=!completed&&service.estado==='esperando_aprobacion'&&hasFinalEvidence&&Boolean(payment)&&(isCash?!workApproved:electronicReady)
 const canConfirmCash=!completed&&isCash&&workApproved&&!cashConfirmed&&service.estado==='esperando_aprobacion'

 async function approve(){
  if(!canApprove||!userId)return
  setBusy(true);setNotice('')
  try{
   const ok=await approvePendingClientService(supabase,userId,service.id)
   if(!ok)throw new Error(t('clientReview.notReady'))
   setNotice(isCash?t('clientReview.payAmount',{amount,provider:providerName}):t('clientReview.digitalApproveFirst'))
   await load()
   if(!isCash)await onCompleted?.()
  }catch(e){
   await load().catch(()=>{})
   setNotice(e instanceof Error?e.message:t('clientReview.approveFailed'))
  }finally{setBusy(false)}
 }

 async function confirmCashPaid(){
  if(!canConfirmCash||!userId)return
  setBusy(true);setNotice('')
  try{
   const ok=await confirmApprovedCashClientService(supabase,userId,service.id)
   if(!ok)throw new Error(t('clientReview.cashNotReady'))
   setNotice(t('clientReview.cashStep'))
   await load()
   await onCompleted?.()
  }catch(e){
   await load().catch(()=>{})
   setNotice(e instanceof Error?e.message:t('clientReview.cashFailed'))
  }finally{setBusy(false)}
 }

 const blockedReason=!hasFinalEvidence
  ?t('clientReview.needEvidence')
  :!payment
   ?t('clientReview.needPayment')
   :!isCash&&!electronicReady
    ?t('clientReview.paymentProtectedWait')
    :''

 const title=completed?t('clientReview.confirmedTitle'):isCash&&workApproved?t('clientReview.payProvider'):t('clientReview.workQuestion')

 return <section aria-live="polite" className="ugo-completion-review">
  <header><div><h2>{title}</h2><p>{completed?t('clientReview.closed',{number:service.numero}):isCash&&workApproved?t('clientReview.cashPending',{number:service.numero}):t('clientReview.reviewBefore',{number:service.numero})}</p></div><span aria-hidden="true">✓</span></header>
  {!completed&&!hasFinalEvidence&&<div className="ugo-completion-warning">{t('clientReview.noFinalPhoto')}</div>}
  {!completed&&!payment&&<div className="ugo-completion-warning">{t('screen.client_review.1')}</div>}
  {!completed&&!isCash&&payment&&!electronicReady&&<div className="ugo-completion-warning">{t('screen.client_review.2')}</div>}
  {notice&&<div className="ugo-completion-notice">{notice}</div>}
  {!completed&&isCash&&workApproved&&<div className="ugo-completion-decision"><strong>{t('clientReview.payAmount',{amount,provider:providerName})}</strong><span>{t('screen.client_review.3')}</span></div>}
  {!completed&&!workApproved&&<div className="ugo-completion-decision"><span>{blockedReason||(isCash?t('clientReview.cashApproveFirst'):t('clientReview.digitalApproveFirst'))}</span></div>}
  {!completed&&<div className="ugo-completion-actions">
   {onOpenDispute&&<button type="button" className="ugo-completion-dispute" onClick={onOpenDispute} disabled={busy}>{t('screen.client_review.4')}</button>}
   {isCash&&workApproved
    ?<button type="button" onClick={confirmCashPaid} disabled={busy||!canConfirmCash}>{busy?t('clientReview.processing'):t('clientReview.paid',{amount})}</button>
    :<button type="button" onClick={approve} disabled={busy||!canApprove}>{busy?t('clientReview.processing'):isCash?t('clientReview.confirmWork'):t('clientReview.releasePayment')}</button>}
  </div>}
 </section>
}
