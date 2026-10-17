import React,{useCallback,useEffect,useRef,useState}from'react'
import{getDispatchProvider}from'../../../lib/dispatch/provider'
import{CLIENT_ACTIVE_SERVICE_STATES,isMatchingServiceState}from'../../../lib/marketplace/lifecycle'
import{ClientEvidenceGallery}from'../order/ClientEvidenceGallery'
import{ServiceChat}from'../../../mvp/ServiceChat'
import{STATUS_LABELS,useRoleSession}from'../../../mvp/shared'
import{ClientRatingPrompt}from'../rating/ClientRatingPrompt'
import{ClientServiceDetail}from'../order/ClientServiceDetail'
import{useClientFlow}from'../flow/clientFlow'
import{useDialog}from'../../../mvp/dialogs'
import{retryOwnedClientMatching}from'../services/clientActionService'
import'./client-post-confirm.css'

type Draft={description?:string;categoryId?:string;categoryName?:string;categorySlug?:string;address?:string;addressLabel?:string;complement?:string;zone?:string;tariffQuote?:{tarifa_id?:string;zona?:string;precio_base?:number;precio_hora?:number;precio_min?:number;precio_max?:number|null;precio_referencia?:number;moneda?:string}|null;when?:string;scheduleAt?:string;urgent?:boolean;amount?:number|null;paymentMethod?:'pix'|'cash';pickupLat?:number|null;pickupLng?:number|null;pickupSource?:'current'|'saved'|'manual'}
type ServiceRow={id:string;estado:string;proveedor_id:string|null;matching_expires_at?:string|null;numero?:number|string|null;proveedor?:{nombre?:string|null;karma?:number|null}|null;categoria?:{nombre?:string|null}|null}
type View='matching'|'assigned'|'chat'|'detail'|'completed'
type Pickup={latitude:number;longitude:number}
type DispatchContext={category:string;pickup:Pickup|null}
const draftPickup=(draft:Draft):Pickup|null=>{if(draft.pickupLat==null||draft.pickupLng==null)return null;const latitude=Number(draft.pickupLat),longitude=Number(draft.pickupLng);return Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180?{latitude,longitude}:null}

export function ClientPostConfirmFlow({onExit}:{onExit:()=>void}){
 const{session,supabase}=useRoleSession('client'),flow=useClientFlow(),{confirm,node:dialog}=useDialog(),[service,setService]=useState<ServiceRow|null>(null),[channelEpoch,setChannelEpoch]=useState(0),[view,setView]=useState<View>('matching'),[now,setNow]=useState(()=>Date.now()),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[dispatchContext,setDispatchContext]=useState<DispatchContext|null>(null),creating=useRef(false),cycleBusy=useRef(false),lastCycle=useRef('')
 const draftKey=session?`ugo:guided-request-draft:${session.user.id}`:'',requestKey=session?`ugo:guided-request:${session.user.id}`:''
 const clearDraft=useCallback(()=>{if(draftKey)sessionStorage.removeItem(draftKey);if(requestKey)sessionStorage.removeItem(requestKey)},[draftKey,requestKey])
 const load=useCallback(async(id:string)=>{if(!session)return null;const{data,error}=await supabase.from('servicios').select('id,numero,estado,matching_expires_at,proveedor_id,proveedor:usuarios!servicios_proveedor_id_fkey(nombre,karma),categoria:categorias(nombre)').eq('id',id).eq('cliente_id',session.user.id).maybeSingle();if(error)throw error;if(!data)return null;const row=data as unknown as ServiceRow;setService(row);if(row.estado==='completado')setView('completed');else if(isMatchingServiceState(row.estado))setView('matching');else if(row.proveedor_id)setView(v=>v==='chat'||v==='detail'?v:'assigned');return row},[session,supabase])
 const findByDraft=useCallback(async(requestDraftId:string)=>{if(!session||!requestDraftId)return null;const{data,error}=await supabase.from('servicios').select('id,numero,estado,matching_expires_at,proveedor_id').eq('cliente_id',session.user.id).eq('metadata->>request_draft_id',requestDraftId).maybeSingle();if(error)throw error;return(data||null)as ServiceRow|null},[session,supabase])
 const startDispatch=useCallback(async(id:string,context:DispatchContext)=>{const dispatch=getDispatchProvider();const result=await dispatch.start({serviceId:id,category:context.category,pickup:context.pickup,pickupFallback:'none'});if(result.state==='matched')await load(id);return result},[load])
 const create=useCallback(async()=>{if(!session||creating.current||!draftKey||!requestKey)return;creating.current=true;setBusy(true);setMessage('');try{
  const draft=JSON.parse(sessionStorage.getItem(draftKey)||'{}')as Draft
  if(!draft.categoryId||!draft.description?.trim()||!draft.address?.trim()||!draft.when)throw new Error('El pedido perdió datos. Volvé y revisá qué hay que hacer, dónde y cuándo.')
  let requestDraftId=sessionStorage.getItem(requestKey)||''
  if(!requestDraftId){requestDraftId=crypto.randomUUID();sessionStorage.setItem(requestKey,requestDraftId)}
  const context:DispatchContext={category:draft.categorySlug||draft.categoryId,pickup:draftPickup(draft)};setDispatchContext(context)
  let row=await findByDraft(requestDraftId)
  if(!row&&!draft.scheduleAt){
   const conflict=await supabase.from('servicios').select('id,numero,estado').eq('cliente_id',session.user.id).in('estado',[...CLIENT_ACTIVE_SERVICE_STATES]).is('programado_para',null).order('created_at',{ascending:false}).limit(1).maybeSingle()
   if(conflict.error)throw conflict.error
   if(conflict.data?.id)throw new Error(`Ya tenés un pedido inmediato activo${conflict.data.numero?` (#${conflict.data.numero})`:''}. Podés seguirlo o programar otro servicio para más adelante.`)
  }
  if(!row){
   const quoted=Number(draft.tariffQuote?.precio_referencia||0),requested=Number(draft.amount||0),serviceAmount=requested>0?requested:quoted>0?quoted:null,commission=serviceAmount?Math.round(serviceAmount*15)/100:null,providerNet=serviceAmount&&commission!=null?Math.round((serviceAmount-commission)*100)/100:null
   const metadata={source:'canonical-client-12-screen',request_draft_id:requestDraftId,requested_when:draft.when,scheduled_at:draft.scheduleAt||null,payment_method:draft.paymentMethod==='pix'?'pix':'efectivo',address_label:draft.addressLabel||null,address_complement:draft.complement||null,pricing_zone:draft.zone||draft.tariffQuote?.zona||null,tariff_quote:draft.tariffQuote||null,pricing_source:draft.tariffQuote?'ugo_tariff':requested>0?'client_amount':null,pickup_source:draft.pickupSource||null,demo:false}
   const inserted=await supabase.from('servicios').insert({cliente_id:session.user.id,categoria_id:draft.categoryId,estado:'buscando',descripcion:draft.description.trim(),direccion_cliente:[draft.address,draft.complement].filter(Boolean).join(' · '),zona:draft.zone||draft.tariffQuote?.zona||null,programado_para:draft.scheduleAt?new Date(draft.scheduleAt).toISOString():null,tarifa:serviceAmount,comision_ugo:commission,ganancia_proveedor:providerNet,urgencia:Boolean(draft.urgent),metadata}).select('id,numero,estado,matching_expires_at,proveedor_id').single()
   if(inserted.error){if(String(inserted.error.code||'')==='23505')row=await findByDraft(requestDraftId);else throw inserted.error}else row=(inserted.data||null)as ServiceRow|null
  }
  if(!row?.id)throw new Error('No se pudo crear ni recuperar el pedido.')
  setService(row);setView(isMatchingServiceState(row.estado)?'matching':row.estado==='completado'?'completed':'assigned');setMessage(row.estado==='buscando'?'Pedido creado. Estamos avisando a profesionales verificados.':'Pedido recuperado. Sin duplicarlo.')
  if(isMatchingServiceState(row.estado)){await startDispatch(row.id,context);clearDraft();await load(row.id);setNow(Date.now());setMessage('Pedido enviado. Esperando respuestas de profesionales verificados.')}
  else clearDraft()
 }catch(error){setMessage(error instanceof Error?error.message:'No pudimos publicar el pedido. El borrador quedó guardado para reintentar.')}finally{creating.current=false;setBusy(false)}},[clearDraft,draftKey,findByDraft,load,requestKey,session,startDispatch,supabase])
 useEffect(()=>{void create()},[create])
 useEffect(()=>{if(view!=='matching')return;setNow(Date.now());const t=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(t)},[view])
 // Reconcile the authoritative service state even if the realtime UPDATE is delayed/missed.
 useEffect(()=>{if(view!=='matching'||!service?.id)return;let active=true;const id=service.id;const refresh=()=>{if(active&&document.visibilityState==='visible'&&navigator.onLine)void load(id).catch(error=>console.warn('[ClientPostConfirm] state refresh failed',error))};const timer=window.setInterval(refresh,5000);const visibility=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',visibility);refresh();return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visibility)}},[load,service?.id,view])
 useEffect(()=>{if(!service?.id)return;let alive=true,reconnectScheduled=false;const id=service.id;const refresh=()=>{if(alive)void load(id)};const reconnect=()=>{if(!alive||reconnectScheduled)return;reconnectScheduled=true;window.setTimeout(()=>{if(alive){reconnectScheduled=false;setChannelEpoch(value=>value+1)}},1000)};const ch=supabase.channel(`client-canonical-${id}-${channelEpoch}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'servicios',filter:`id=eq.${id}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){refresh();reconnect()}});const onOnline=()=>{refresh();reconnect()};const onVisibility=()=>{if(document.visibilityState==='visible'){refresh();reconnect()}};window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);return()=>{alive=false;window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void supabase.removeChannel(ch)}},[channelEpoch,load,service?.id,supabase])
 const cancel=async()=>{if(!service?.id||busy)return;if(!await confirm({title:'Cancelar pedido',message:'¿Realmente querés cancelar este pedido?',danger:true}))return;setBusy(true);const ok=await flow.actions.cancelService(service.id);setBusy(false);if(ok){clearDraft();onExit()}else setMessage('No pudimos cancelar. Reintentá.')}
 const retry=async()=>{if(!service?.id||busy)return;try{const current=await load(service.id);if(!current||!isMatchingServiceState(current.estado)){setMessage('El pedido cambió de estado. Revisá su seguimiento.');return}}catch(error){setMessage('No pudimos comprobar el estado del pedido. Reintentá en unos segundos.');return}let context=dispatchContext;if(!context){try{const draft=JSON.parse(sessionStorage.getItem(draftKey)||'{}')as Draft;if(draft.categoryId)context={category:draft.categorySlug||draft.categoryId,pickup:draftPickup(draft)}}catch{/* vacío intencional */}}if(!context){setMessage('No encontré el contexto para reintentar. Abrí el pedido desde Actividad y volvé a intentar.');return}setBusy(true);try{await startDispatch(service.id,context);await load(service.id);setNow(Date.now());setMessage('Búsqueda reintentada. Esperando respuestas…')}catch(error){setMessage(error instanceof Error?error.message:'No pudimos reintentar. El pedido sigue guardado.')}finally{setBusy(false)}}
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
   if(!ok)throw new Error('No pudimos renovar la búsqueda.')
   await load(id);setNow(Date.now());setMessage(manual?'Búsqueda renovada. Avisando nuevamente a profesionales…':'Iniciamos otro ciclo de búsqueda de 5 minutos.')
  }catch(error){setMessage(error instanceof Error?error.message:'No pudimos renovar la búsqueda. Podés reintentar manualmente.')}
  finally{cycleBusy.current=false}
 },[busy,load,session,supabase])
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
 if(view==='completed'&&service)return <main className="ugo-canonical-rating"><section><h1>Servicio finalizado</h1><p>El trabajo quedó cerrado. Te queda calificar al profesional.</p><ClientRatingPrompt serviceId={service.id} embedded/><button className="primary" onClick={continueBackground}>Volver al inicio</button></section></main>
 if(view==='chat'&&service)return <main className="ugo-canonical-chat"><header><button onClick={()=>setView('assigned')}>←</button><div className="avatar">👤</div><div><b>{service.proveedor?.nombre||'Profesional UGO'}</b><small>En línea</small></div></header><ServiceChat role="client" serviceId={service.id} compact/></main>
 if(view==='detail'&&service)return <ClientServiceDetail serviceId={service.id} onClose={()=>setView('assigned')}/>
 if(view==='assigned'&&service)return <main className="ugo-assigned-screen"><section><div className="ugo-assigned-avatar">👤<i>✓</i></div><h1>¡Profesional asignado!</h1><p className="ugo-assigned-status">{STATUS_LABELS[service.estado]||service.estado.replaceAll('_',' ')}</p><article><span>👤</span><div><b>{service.proveedor?.nombre||'Profesional UGO'}</b><small>★ {service.proveedor?.karma??'Nuevo'} · {service.categoria?.nombre||'Servicio'}</small></div></article><ClientEvidenceGallery serviceId={service.id} hideWhenEmpty compact/><p>Seguimiento, chat, pago y cierre quedan ligados a este mismo pedido.</p><button className="primary" onClick={()=>setView('detail')}>Ver seguimiento y pago</button><button onClick={()=>setView('chat')}>Abrir chat</button><button onClick={continueBackground}>Seguir usando UGO</button></section></main>
 const deadlineMs=service?.matching_expires_at?new Date(service.matching_expires_at).getTime():null,remainingMs=deadlineMs===null?0:Math.max(0,deadlineMs-now),matchingState=Boolean(service&&isMatchingServiceState(service.estado)),expired=matchingState&&(deadlineMs===null||remainingMs<=0),offline=typeof navigator!=='undefined'&&!navigator.onLine,formatRemaining=(ms:number)=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor((ms%60000)/1000)).padStart(2,'0')}`
 return <main className="ugo-matching-screen"><section><div className={`ugo-matching-radar${expired?' is-expired':''}`} aria-hidden="true"><span className="ugo-matching-radar-ring"/><span className="ugo-matching-radar-ring is-second"/><span className="ugo-matching-radar-core">⌖</span></div><h1>{expired?'Renovando la búsqueda…':'Buscando un profesional cerca de vos'}</h1><div className="ugo-matching-timer" role="status" aria-live="off"><small>{expired?'Preparando otro ciclo de 5 minutos…':'Tiempo restante del ciclo'}</small><strong className="ugo-matching-countdown">{deadlineMs===null?'--:--':formatRemaining(remainingMs)}</strong>{!expired&&deadlineMs!==null&&<span>La búsqueda continúa en tiempo real</span>}</div><p>Tu pedido está guardado. Cada ciclo dura 5 minutos y se renueva mientras esta pantalla esté abierta. Podés cancelar cuando quieras.</p><ol><li className="done">✓ <span>Pedido creado</span></li><li className={service?'done':''}>{service?'✓':'○'} <span>Enviando a profesionales</span></li><li className={deadlineMs!==null?'done':''}>{deadlineMs!==null?'✓':'○'} <span>Esperando respuestas</span></li><li>○ <span>Asignando profesional</span></li><li>○ <span>¡Listo!</span></li></ol>{offline&&<p className="ugo-match-message">Estás sin conexión. El pedido queda guardado y se resincroniza cuando vuelva internet.</p>}{message&&<p className="ugo-match-message">{message}</p>}{matchingState&&service&&<div className="ugo-match-recovery"><b>UGO seguirá buscando hasta que un profesional acepte o canceles el pedido.</b><button disabled={busy||offline} onClick={()=>void restartMatching(service.id,true)}>Volver a buscar ahora</button></div>}<button className="primary" type="button" onClick={continueBackground}>Seguir usando UGO</button><button className="cancel" disabled={!service||busy} onClick={()=>void cancel()}>Cancelar pedido</button></section>{dialog}</main>
}
export default ClientPostConfirmFlow
