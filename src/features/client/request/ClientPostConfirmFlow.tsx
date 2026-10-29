import React,{useCallback,useEffect,useRef,useState}from'react'
import{getDispatchProvider}from'../../../lib/dispatch/provider'
import{CLIENT_ACTIVE_SERVICE_STATES,isMatchingServiceState}from'../../../lib/marketplace/lifecycle'
import{ClientEvidenceGallery}from'../order/ClientEvidenceGallery'
import{ServiceChat}from'../../../mvp/ServiceChat'
import{STATUS_LABELS,useRoleSession}from'../../../mvp/shared'
import{useLocale}from'../../../i18n/locale'
import{ClientRatingPrompt}from'../rating/ClientRatingPrompt'
import{ClientServiceDetail}from'../order/ClientServiceDetail'
import{useClientFlow}from'../flow/clientFlow'
import{useDialog}from'../../../mvp/dialogs'
import{retryOwnedClientMatching}from'../services/clientActionService'
import'./client-post-confirm.css'

type Draft={description?:string;categoryId?:string;categoryName?:string;categorySlug?:string;address?:string;addressLabel?:string;complement?:string;zone?:string;tariffQuote?:{tarifa_id?:string;zona?:string;precio_base?:number;precio_hora?:number;precio_min?:number;precio_max?:number|null;precio_referencia?:number;moneda?:string}|null;when?:string;scheduleAt?:string;urgent?:boolean;amount?:number|null;paymentMethod?:'pix'|'cash';pickupLat?:number|null;pickupLng?:number|null;pickupSource?:'current'|'saved'|'manual';faxinaHours?:number|null;faxinaNeedsProducts?:boolean}
type ServiceRow={id:string;estado:string;proveedor_id:string|null;metadata?:{faxina_supplies_requested?:boolean;faxina_supplies_approved?:boolean;faxina_supplies_fee?:number}|null;tarifa?:number|null;matching_expires_at?:string|null;numero?:number|string|null;proveedor?:{nombre?:string|null;karma?:number|null}|null;categoria?:{nombre?:string|null}|null}
type View='matching'|'assigned'|'chat'|'detail'|'completed'
type Pickup={latitude:number;longitude:number}
type DispatchContext={category:string;pickup:Pickup|null}
const draftPickup=(draft:Draft):Pickup|null=>{if(draft.pickupLat==null||draft.pickupLng==null)return null;const latitude=Number(draft.pickupLat),longitude=Number(draft.pickupLng);return Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180?{latitude,longitude}:null}

export function ClientPostConfirmFlow({onExit}:{onExit:()=>void}){
 const{t,locale}=useLocale()
 const{session,supabase}=useRoleSession('client'),flow=useClientFlow(),{confirm,node:dialog}=useDialog(),[service,setService]=useState<ServiceRow|null>(null),[channelEpoch,setChannelEpoch]=useState(0),[view,setView]=useState<View>('matching'),[now,setNow]=useState(()=>Date.now()),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[dispatchContext,setDispatchContext]=useState<DispatchContext|null>(null),[feeQuote,setFeeQuote]=useState<number|null>(null),[feeError,setFeeError]=useState(''),[feeLoading,setFeeLoading]=useState(false),creating=useRef(false),cycleBusy=useRef(false),lastCycle=useRef('')
 const draftKey=session?`ugo:guided-request-draft:${session.user.id}`:'',requestKey=session?`ugo:guided-request:${session.user.id}`:''
 const clearDraft=useCallback(()=>{if(draftKey)sessionStorage.removeItem(draftKey);if(requestKey)sessionStorage.removeItem(requestKey)},[draftKey,requestKey])
 const load=useCallback(async(id:string)=>{if(!session)return null;const{data,error}=await supabase.from('servicios').select('id,numero,estado,matching_expires_at,proveedor_id,metadata,tarifa,proveedor:usuarios!servicios_proveedor_id_fkey(nombre,karma),categoria:categorias(nombre)').eq('id',id).eq('cliente_id',session.user.id).maybeSingle();if(error)throw error;if(!data)return null;const row=data as unknown as ServiceRow;setService(row);if(row.estado==='completado')setView('completed');else if(isMatchingServiceState(row.estado))setView('matching');else if(row.proveedor_id)setView(v=>v==='chat'||v==='detail'?v:'assigned');return row},[session,supabase])
 const findByDraft=useCallback(async(requestDraftId:string)=>{if(!session||!requestDraftId)return null;const{data,error}=await supabase.from('servicios').select('id,numero,estado,matching_expires_at,proveedor_id').eq('cliente_id',session.user.id).eq('metadata->>request_draft_id',requestDraftId).maybeSingle();if(error)throw error;return(data||null)as ServiceRow|null},[session,supabase])
 const startDispatch=useCallback(async(id:string,context:DispatchContext)=>{const dispatch=getDispatchProvider();const result=await dispatch.start({serviceId:id,category:context.category,pickup:context.pickup,pickupFallback:'none'});if(result.state==='matched')await load(id);return result},[load])
 const create=useCallback(async()=>{if(!session||creating.current||!draftKey||!requestKey)return;creating.current=true;setBusy(true);setMessage('');try{
  const draft=JSON.parse(sessionStorage.getItem(draftKey)||'{}')as Draft
  if(!draft.categoryId||!draft.description?.trim()||!draft.address?.trim()||!draft.when)throw new Error(t('clientMatch.lostDraft'))
  let requestDraftId=sessionStorage.getItem(requestKey)||''
  if(!requestDraftId){requestDraftId=crypto.randomUUID();sessionStorage.setItem(requestKey,requestDraftId)}
  const context:DispatchContext={category:draft.categorySlug||draft.categoryId,pickup:draftPickup(draft)};setDispatchContext(context)
  let row=await findByDraft(requestDraftId)
  if(!row&&!draft.scheduleAt){
   const conflict=await supabase.from('servicios').select('id',{count:'exact',head:true}).eq('cliente_id',session.user.id).in('estado',[...CLIENT_ACTIVE_SERVICE_STATES]).is('programado_para',null)
   if(conflict.error)throw conflict.error
   if((conflict.count||0)>=3)throw new Error(t('clientMatch.maxRequests'))
  }
  if(!row){
   const isFaxina=/(faxina|limpeza|limpieza)/.test(String(draft.categorySlug||draft.categoryName||'').toLowerCase()),faxinaHours=Number(draft.faxinaHours||0);if(isFaxina&&(!Number.isInteger(faxinaHours)||faxinaHours<1||faxinaHours>12))throw new Error('Indicá entre 1 y 12 horas de Faxina antes de confirmar.');const hourRate=Number(draft.tariffQuote?.precio_hora||0),base=Number(draft.tariffQuote?.precio_base||0),min=Number(draft.tariffQuote?.precio_min||0),max=Number(draft.tariffQuote?.precio_max||0),rawEstimated=base+hourRate*faxinaHours,estimated=isFaxina&&hourRate>0?Math.round(Math.max(min,max>0?Math.min(max,rawEstimated):rawEstimated)*100)/100:null,priceQuote=draft.tariffQuote&&estimated!=null?{...draft.tariffQuote,precio_referencia:estimated}:draft.tariffQuote,quoted=Number(priceQuote?.precio_referencia||0),requested=Number(draft.amount||0),serviceAmount=requested>0&&!(isFaxina&&hourRate>0)?requested:quoted>0?quoted:null;const metadata={...(isFaxina?{faxina_hours:faxinaHours,estimated_duration_minutes:faxinaHours*60,faxina_supplies_requested:Boolean(draft.faxinaNeedsProducts),preferences:`${faxinaHours} h de Faxina · Productos: ${draft.faxinaNeedsProducts?'lleva el profesional':'los aporta el cliente'}`}:{}),source:'canonical-client-12-screen',request_draft_id:requestDraftId,requested_when:draft.when,scheduled_at:draft.scheduleAt||null,payment_method:draft.paymentMethod==='pix'?'pix':'efectivo',address_label:draft.addressLabel||null,address_complement:draft.complement||null,pricing_zone:draft.zone||draft.tariffQuote?.zona||null,tariff_quote:priceQuote||null,pricing_source:draft.tariffQuote?'ugo_tariff':requested>0?'client_amount':null,pickup_source:draft.pickupSource||null,demo:false}
   const inserted=await supabase.from('servicios').insert({cliente_id:session.user.id,categoria_id:draft.categoryId,estado:'buscando',descripcion:draft.description.trim(),direccion_cliente:[draft.address,draft.complement].filter(Boolean).join(' · '),zona:draft.zone||draft.tariffQuote?.zona||null,programado_para:draft.scheduleAt?new Date(draft.scheduleAt).toISOString():null,tarifa:serviceAmount,urgencia:Boolean(draft.urgent),metadata}).select('id,numero,estado,matching_expires_at,proveedor_id').single()
   if(inserted.error){if(String(inserted.error.code||'')==='23505')row=await findByDraft(requestDraftId);else throw inserted.error}else row=(inserted.data||null)as ServiceRow|null
  }
  if(!row?.id)throw new Error(t('clientMatch.createFailed'))
  setService(row);setView(isMatchingServiceState(row.estado)?'matching':row.estado==='completado'?'completed':'assigned');setMessage(row.estado==='buscando'?t('clientMatch.created'):t('clientMatch.recovered'))
  if(isMatchingServiceState(row.estado)){const dispatchResult=await startDispatch(row.id,context);clearDraft();await load(row.id);setNow(Date.now());setMessage(dispatchResult.state==='offering'||dispatchResult.state==='matched'?t('clientMatch.sent'):t('clientMatch.created'))}
  else clearDraft()
 }catch(error){setMessage(error instanceof Error?error.message:t('clientMatch.draftSavedRetry'))}finally{creating.current=false;setBusy(false)}},[clearDraft,draftKey,findByDraft,load,requestKey,session,startDispatch,supabase,t])
 useEffect(()=>{void create()},[create])
 useEffect(()=>{if(view!=='matching')return;setNow(Date.now());const t=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(t)},[view])
 // Reconcile the authoritative service state even if the realtime UPDATE is delayed/missed.
 useEffect(()=>{if(view!=='matching'||!service?.id)return;let active=true;const id=service.id;const refresh=()=>{if(active&&document.visibilityState==='visible'&&navigator.onLine)void load(id).catch(error=>console.warn('[ClientPostConfirm] state refresh failed',error))};const timer=window.setInterval(refresh,5000);const visibility=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',visibility);refresh();return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visibility)}},[load,service?.id,view])
 useEffect(()=>{if(!service?.id)return;let alive=true,reconnectScheduled=false;const id=service.id;const refresh=()=>{if(alive)void load(id)};const reconnect=()=>{if(!alive||reconnectScheduled)return;reconnectScheduled=true;window.setTimeout(()=>{if(alive){reconnectScheduled=false;setChannelEpoch(value=>value+1)}},1000)};const ch=supabase.channel(`client-canonical-${id}-${channelEpoch}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'servicios',filter:`id=eq.${id}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){refresh();reconnect()}});const onOnline=()=>{refresh();reconnect()};const onVisibility=()=>{if(document.visibilityState==='visible'){refresh();reconnect()}};window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);return()=>{alive=false;window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}},[channelEpoch,load,service?.id,supabase])
 const suppliesRequested=Boolean(service?.metadata?.faxina_supplies_requested),suppliesApproved=Boolean(service?.metadata?.faxina_supplies_approved)
 const formatFee=(n:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(n)
 useEffect(()=>{if(!service?.id||!service.proveedor_id||!suppliesRequested||suppliesApproved){setFeeQuote(null);return}
  let alive=true;setFeeLoading(true);setFeeError('')
  void(async()=>{try{
   const{data,error}=await supabase.rpc('cotizar_productos_faxina',{p_servicio_id:service.id})
   if(!alive)return
   if(error)throw error
   const amount=data==null?null:Number(data)
   setFeeQuote(amount!=null&&Number.isFinite(amount)&&amount>0?amount:null)
  }catch(error){if(alive){setFeeError(error instanceof Error?error.message:'No se pudo obtener el precio de productos.');setFeeQuote(null)}}
  finally{if(alive)setFeeLoading(false)}})()
  return()=>{alive=false}
 },[service?.id,service?.proveedor_id,suppliesRequested,suppliesApproved,supabase])
 const approveSupplies=async()=>{if(!service?.id||!feeQuote||busy)return;setBusy(true);setFeeError('')
  try{
   const{error}=await supabase.rpc('aprobar_productos_faxina',{p_servicio_id:service.id,p_valor_aceptado:feeQuote})
   if(error)throw error
   await load(service.id)
  }catch(error){setFeeError(error instanceof Error?error.message:'No se pudo aprobar el adicional. Actualizá el precio antes de reintentar.')}
  finally{setBusy(false)}
 }
 const cancel=async()=>{if(!service?.id||busy)return;if(!await confirm({title:t('clientMatch.cancelTitle'),message:t('clientMatch.confirmCancel'),danger:true}))return;setBusy(true);const ok=await flow.actions.cancelService(service.id);setBusy(false);if(ok){clearDraft();onExit()}else setMessage(t('clientMatch.cancelFailed'))}
 const retry=async()=>{if(!service?.id||busy)return;try{const current=await load(service.id);if(!current||!isMatchingServiceState(current.estado)){setMessage(t('clientMatch.orderChanged'));return}}catch(error){setMessage(t('clientMatch.checkFailed'));return}let context=dispatchContext;if(!context){try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'{}')as Draft;if(draft.categoryId)context={category:draft.categorySlug||draft.categoryId,pickup:draftPickup(draft)}}catch{/* vacío intencional */}}if(!context){setMessage(t('clientMatch.noRetryContext'));return}setBusy(true);try{await startDispatch(service.id,context);await load(service.id);setNow(Date.now());setMessage(t('clientMatch.retrySearch'))}catch(error){setMessage(error instanceof Error?error.message:t('clientMatch.retryFailed'))}finally{setBusy(false)}}
 // Restart the SAME owned service after each 5-minute window, never a duplicate order.
 const restartMatching=useCallback(async(id:string,manual=false)=>{
  if(!session||cycleBusy.current||busy||!navigator.onLine)return
  cycleBusy.current=true
  try{
   const row=await load(id)
   if(!row||!isMatchingServiceState(row.estado)||row.proveedor_id)return
   const deadline=row.matching_expires_at?Date.parse(row.matching_expires_at):NaN
   if(Number.isFinite(deadline)&&deadline>Date.now())return
   const ok=await retryOwnedClientMatching(supabase,session.user.id,id)
   if(!ok)throw new Error(t('clientMatch.renewFailed'))
   await load(id);setNow(Date.now());setMessage(manual?t('clientMatch.cycleRenewed'):t('clientMatch.newCycle'))
  }catch(error){setMessage(error instanceof Error?error.message:t('clientMatch.renewFailed')+' '+t('clientMatch.manualRetry'))}
  finally{cycleBusy.current=false}
 },[busy,load,session,supabase,t])
 useEffect(()=>{
  if(view!=='matching'||!service?.id||!isMatchingServiceState(service.estado)||service.proveedor_id)return
  const deadline=service.matching_expires_at?Date.parse(service.matching_expires_at):NaN
  if(Number.isFinite(deadline)&&deadline>now){lastCycle.current='';return}
  const key=`${service.id}:${service.matching_expires_at||'missing'}`
  if(lastCycle.current===key)return
  lastCycle.current=key
  void restartMatching(service.id)
 },[now,restartMatching,service?.id,service?.estado,service?.proveedor_id,service?.matching_expires_at,view])
 const continueBackground=()=>{if(service)clearDraft();onExit()}
 if(view==='completed'&&service)return <main className="ugo-canonical-rating"><section><h1>{t('clientMatch.completedTitle')}</h1><p>{t('clientMatch.completedHelp')}</p><ClientRatingPrompt serviceId={service.id} embedded/><button className="primary" onClick={continueBackground}>{t('clientMatch.backHome')}</button></section></main>
 if(view==='chat'&&service)return <main className="ugo-canonical-chat"><header><button onClick={()=>setView('assigned')}>←</button><div className="avatar">👤</div><div><b>{service.proveedor?.nombre||t('clientMatch.providerDefault')}</b><small>{t('clientMatch.online')}</small></div></header><ServiceChat role="client" serviceId={service.id} compact/></main>
 if(view==='detail'&&service)return <ClientServiceDetail serviceId={service.id} onClose={()=>setView('assigned')}/>
 if(view==='assigned'&&service)return <main className="ugo-assigned-screen"><section><div className="ugo-assigned-avatar">👤<i>✓</i></div><h1>{t('clientMatch.assignedTitle')}</h1><p className="ugo-assigned-status">{(t('status.'+service.estado)==='status.'+service.estado?(STATUS_LABELS[service.estado]||service.estado.replaceAll('_',' ')):t('status.'+service.estado))}</p><article><span>👤</span><div><b>{service.proveedor?.nombre||t('clientMatch.providerDefault')}</b><small>★ {service.proveedor?.karma??t('clientMatch.newRating')} · {service.categoria?.nombre||t("providerReceipt.service")}</small></div></article>{suppliesRequested&&<div style={{border:'1px solid #c8ddd5',borderRadius:14,padding:14,margin:'14px 0',textAlign:'left',background:'#f6fbf8'}}><strong style={{display:'block',marginBottom:8}}>🧹 {locale.startsWith('pt')?'Produtos de limpeza':locale.startsWith('es')?'Productos de limpieza':'Cleaning supplies'}</strong>{suppliesApproved?<p>✓ {locale.startsWith('pt')?'Adicional aprovado':locale.startsWith('es')?'Adicional aprobado':'Approved supplies fee'}: {formatFee(Number(service.metadata?.faxina_supplies_fee||0))}. {locale.startsWith('pt')?'Total':locale.startsWith('es')?'Total':'Total'}: {formatFee(Number(service.tarifa||0))}</p>:feeLoading?<p>{locale.startsWith('pt')?'Buscando valor do profissional…':locale.startsWith('es')?'Consultando el precio del profesional…':'Checking provider price…'}</p>:feeQuote!=null?<><p>{locale.startsWith('pt')?'O profissional leva os produtos por':locale.startsWith('es')?'El profesional lleva los productos por':'Provider supplies fee'} <b>{formatFee(feeQuote)}</b>. {locale.startsWith('pt')?'Precisa aprovar antes de cobrar.':locale.startsWith('es')?'Tenés que aprobarlo antes del cobro.':'Approval required before payment.'}</p><p>{locale.startsWith('pt')?'Total com produtos':locale.startsWith('es')?'Total con productos':'Total including supplies'}: <b>{formatFee(Number(service.tarifa||0)+feeQuote)}</b></p><button type="button" className="primary" onClick={()=>void approveSupplies()} disabled={busy}>{locale.startsWith('pt')?'Aprovar adicional':locale.startsWith('es')?'Aprobar adicional':'Approve supplies fee'}</button></>:<p>{locale.startsWith('pt')?'O profissional ainda não oferece produtos. Não haverá cobrança automática.':locale.startsWith('es')?'El profesional todavía no ofrece productos. No se cobrará ningún adicional automáticamente.':'Provider has not set a supplies price. No automatic fee will be charged.'}</p>}{feeError&&<p role="alert" style={{color:'#9a3434',fontSize:13}}>{feeError}</p>}</div>}<ClientEvidenceGallery serviceId={service.id} hideWhenEmpty compact/><p>{t('clientMatch.assignedDetail')}</p><button className="primary" onClick={()=>setView('detail')}>{t('clientMatch.openTracking')}</button><button onClick={()=>setView('chat')}>{t('clientMatch.openChat')}</button><button onClick={continueBackground}>{t('clientMatch.keepUsing')}</button></section></main>
 const deadlineMs=service?.matching_expires_at?new Date(service.matching_expires_at).getTime():null,remainingMs=deadlineMs===null?0:Math.max(0,deadlineMs-now),matchingState=Boolean(service&&isMatchingServiceState(service.estado)),expired=matchingState&&(deadlineMs===null||remainingMs<=0),offline=typeof navigator!=='undefined'&&!navigator.onLine,formatRemaining=(ms:number)=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor((ms%60000)/1000)).padStart(2,'0')}`
 return <main className="ugo-matching-screen"><section><div className={`ugo-matching-radar${expired?' is-expired':''}`} aria-hidden="true"><span className="ugo-matching-radar-ring"/><span className="ugo-matching-radar-ring is-second"/><span className="ugo-matching-radar-core">⌖</span></div><h1>{expired?t('clientMatch.renewing'):t('clientMatch.searching')}</h1><div className="ugo-matching-timer" role="status" aria-live="off"><small>{expired?t('clientMatch.preparingCycle'):t('clientMatch.cycleRemaining')}</small><strong className="ugo-matching-countdown">{deadlineMs===null?'--:--':formatRemaining(remainingMs)}</strong>{!expired&&deadlineMs!==null&&<span>{t('clientMatch.searchLive')}</span>}</div><p>{t('clientMatch.orderStored')}</p><ol><li className="done">✓ <span>{t('clientMatch.orderCreated')}</span></li><li className={service?'done':''}>{service?'✓':'○'} <span>{t('clientMatch.sendingPros')}</span></li><li className={deadlineMs!==null?'done':''}>{deadlineMs!==null?'✓':'○'} <span>{t('clientMatch.waiting')}</span></li><li>○ <span>{t('clientMatch.assigning')}</span></li><li>○ <span>{t('clientMatch.ready')}</span></li></ol>{offline&&<p className="ugo-match-message">{t('clientMatch.offline')}</p>}{message&&<p className="ugo-match-message">{message}</p>}{matchingState&&service&&<div className="ugo-match-recovery"><b>{t('clientMatch.keepSearching')}</b><button disabled={busy||offline} onClick={()=>void restartMatching(service.id,true)}>{t('clientMatch.searchNow')}</button></div>}<button className="primary" type="button" onClick={continueBackground}>{t('clientMatch.keepUsing')}</button><button className="cancel" disabled={!service||busy} onClick={()=>void cancel()}>{t('clientMatch.cancelOrder')}</button></section>{dialog}</main>
}
export default ClientPostConfirmFlow
