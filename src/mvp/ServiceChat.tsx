import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import{reportSentinelIncident}from'../lib/sentinel'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'
import'./service-chat.css'

type ChatMessage={id:number|string;servicio_id:string;emisor_id:string|null;emisor_rol:string;contenido:string;created_at:string}
type ChatService={id:string;numero:number|string|null;cliente_id:string;proveedor_id:string|null;estado:string;descripcion:string|null;updated_at:string|null}
const AUTO_STATES=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado']
const QUICK_REPLIES:Record<'client'|'provider',string[]>={
 client:['Perfecto, te espero.','Ya podés ingresar.','Estoy en casa.','Avisame cuando llegues.','Entendido, gracias.'],
 provider:['Estoy en camino.','Llegué al lugar.','Estoy en la puerta.','Voy a demorar unos minutos.','Necesito un material para resolverlo.','El trabajo está listo.'],
}
const EMAIL_RE=/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const URL_RE=/(?:https?:\/\/|www\.|\b(?:[a-z0-9-]+\.)+(?:com\.br|com|net|org|io|app|dev|br)\b)/i
const SOCIAL_RE=/\b(?:whats?app|wpp|telegram|instagram|facebook|t\.me|wa\.me)\b/i
const HANDLE_RE=/(^|\s)@[a-z0-9_.-]{3,}/i
const PHONE_RE=/\+?\d[\d\s().-]{5,}\d/g

function timeLabel(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}
function hasContactDetails(value:string){if(EMAIL_RE.test(value)||URL_RE.test(value)||SOCIAL_RE.test(value)||HANDLE_RE.test(value))return true;const phones:string[]=value.match(PHONE_RE)??[];return phones.some(candidate=>candidate.replace(/\D/g,'').length>=8)}
function serviceLabel(service:ChatService){const number=service.numero??service.id.slice(0,8);const detail=(service.descripcion||'Servicio UGO').trim();return `#${number} · ${detail.length>38?`${detail.slice(0,38)}…`:detail}`}
function isContactGuardError(message:string){return message.includes('CONTACT_DETAILS_NOT_ALLOWED')||message.toLowerCase().includes('datos de contacto')}
function chatError(message:string){return isContactGuardError(message)?'Por seguridad, no se pueden compartir teléfonos, WhatsApp, emails, usuarios de redes ni links. Usá el chat de UGO.':message}
function shouldEscalate(){return document.visibilityState==='visible'&&navigator.onLine}
function chatAttemptId(){return globalThis.crypto?.randomUUID?.()||`chat-${Date.now()}-${Math.random().toString(36).slice(2)}`}
function channelInstanceId(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function isMissingSessionError(error:unknown){const value=error as{message?:string;name?:string}|null;return value?.name==='AuthSessionMissingError'||/auth session missing|session missing/i.test(String(value?.message||''))}

export function ServiceChat({role,serviceId,compact=false}:{role:UgoRole;serviceId?:string|null;compact?:boolean}){
 const sb=useMemo(()=>getRoleSupabase(role),[role])
 const[services,setServices]=useState<ChatService[]>([]),[selectedServiceId,setSelectedServiceId]=useState<string|null>(serviceId||null),[service,setService]=useState<ChatService|null>(null),[messages,setMessages]=useState<ChatMessage[]>([]),[userId,setUserId]=useState<string|null>(null),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false),[unread,setUnread]=useState(0),[channelEpoch,setChannelEpoch]=useState(0)
 const endRef=useRef<HTMLDivElement|null>(null)
 const normalizedRole:'client'|'provider'=role==='client'?'client':'provider'
 const reportChatFailure=useCallback((eventType:string,message:string,cause?:unknown,id?:string|null)=>{void reportSentinelIncident({eventType,message,error:cause,role,severity:'P0',serviceId:id||serviceId||selectedServiceId,action:`${role}.service.chat`,checklistCode:'CHAT-REALTIME'})},[role,selectedServiceId,serviceId])
 const reportChatRecovery=useCallback((eventType:string,message:string,cause?:unknown,id?:string|null)=>{void reportSentinelIncident({eventType,message,error:cause,role,severity:'P1',serviceId:id||serviceId||selectedServiceId,action:`${role}.service.chat.recovery`})},[role,selectedServiceId,serviceId])

 const clearConversation=useCallback(()=>{setUserId(null);setServices([]);setService(null);setMessages([]);setUnread(0);setError('')},[])
 const load=useCallback(async()=>{
  const{data:sessionData,error:sessionError}=await sb.auth.getSession();if(sessionError)throw sessionError
  const uid=sessionData.session?.user?.id||null
  if(!uid){clearConversation();return}
  setUserId(uid)
  let q=sb.from('servicios').select('id,numero,cliente_id,proveedor_id,estado,descripcion,updated_at')
  if(serviceId)q=q.eq('id',serviceId).eq(role==='client'?'cliente_id':'proveedor_id',uid)
  else q=(role==='client'?q.eq('cliente_id',uid):q.eq('proveedor_id',uid)).in('estado',AUTO_STATES).order('updated_at',{ascending:false}).limit(12)
  const{data:s,error:se}=await q;if(se)throw se
  const rows=((s||[])as ChatService[]).filter(row=>Boolean(row.proveedor_id))
  setServices(rows)
  const activeId=serviceId||(selectedServiceId&&rows.some(row=>row.id===selectedServiceId)?selectedServiceId:rows[0]?.id)||null
  setSelectedServiceId(activeId)
  const current=rows.find(row=>row.id===activeId)||null
  setService(current)
  if(!current){setMessages([]);return}
  const{data:m,error:me}=await sb.from('mensajes').select('id,servicio_id,emisor_id,emisor_rol,contenido,created_at').eq('servicio_id',current.id).order('created_at',{ascending:true}).limit(200)
  if(me)throw me
  setMessages((m||[])as ChatMessage[])
 },[clearConversation,role,sb,selectedServiceId,serviceId])
 const loadRef=useRef(load),reportChatFailureRef=useRef(reportChatFailure),reportChatRecoveryRef=useRef(reportChatRecovery),clearConversationRef=useRef(clearConversation)
 useEffect(()=>{loadRef.current=load},[load])
 useEffect(()=>{reportChatFailureRef.current=reportChatFailure},[reportChatFailure])
 useEffect(()=>{reportChatRecoveryRef.current=reportChatRecovery},[reportChatRecovery])
 useEffect(()=>{clearConversationRef.current=clearConversation},[clearConversation])

 useEffect(()=>{void load().catch(e=>{if(isMissingSessionError(e)){clearConversation();return}const message=e instanceof Error?e.message:'No pudimos abrir el chat.';setError(message);if(shouldEscalate())reportChatRecovery('chat_load_error',message,e)})},[clearConversation,load,reportChatRecovery])
 useEffect(()=>{
  if(!userId)return
  let alive=true,reconnectTimer:number|undefined
  const resync=()=>{if(alive)void loadRef.current().catch(e=>{if(isMissingSessionError(e)){clearConversationRef.current();return}const message=e instanceof Error?e.message:'No pudimos sincronizar el chat.';setError(message);if(shouldEscalate())reportChatRecoveryRef.current('chat_resync_error',message,e)})}
  const reconnect=()=>{if(!alive)return;window.clearTimeout(reconnectTimer);reconnectTimer=window.setTimeout(()=>{if(alive)setChannelEpoch(value=>value+1)},1500)}
  const onVisibility=()=>{if(document.visibilityState==='visible')resync()}
  const onOnline=()=>{resync();reconnect()}
  window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility)
  const fallback=window.setInterval(()=>{if(shouldEscalate())resync()},10000)
  const targetServiceId=serviceId||null
  const suffix=targetServiceId||'all'
  let ch:any=sb.channel(`service-chat-${role}-${suffix}-${userId.slice(0,6)}-${channelEpoch}-${channelInstanceId()}`)
  const messageConfig:any={event:'INSERT',schema:'public',table:'mensajes'}
  if(targetServiceId)messageConfig.filter=`servicio_id=eq.${targetServiceId}`
  ch=ch.on('postgres_changes',messageConfig,(payload:any)=>{
   const incoming=payload?.new as ChatMessage|undefined
   if(!targetServiceId&&incoming?.servicio_id&&incoming.emisor_id!==userId){setSelectedServiceId(incoming.servicio_id);setUnread(value=>value+1);if(document.visibilityState==='visible'&&!compact)setOpen(true)}
   resync()
  })
  const serviceConfig:any={event:'*',schema:'public',table:'servicios'}
  if(targetServiceId)serviceConfig.filter=`id=eq.${targetServiceId}`
  ch=ch.on('postgres_changes',serviceConfig,resync)
  ch.subscribe((status:string)=>{
   if(status==='SUBSCRIBED')resync()
   else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
    resync();reconnect()
    if(shouldEscalate())reportChatRecoveryRef.current('chat_realtime_subscription_error',`Canal Realtime: ${status}`,undefined,targetServiceId)
   }
  })
  return()=>{alive=false;window.clearTimeout(reconnectTimer);window.clearInterval(fallback);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);void sb.removeChannel(ch)}
 },[channelEpoch,compact,role,sb,serviceId,userId])
 useEffect(()=>{if(open){setUnread(0);endRef.current?.scrollIntoView({block:'nearest'})}},[open,service?.id])
 useEffect(()=>{if(compact)endRef.current?.scrollIntoView({block:'nearest'})},[compact,messages])

 const syncAfterSaved=async(id:string)=>{setDraft('');await load().catch(e=>{if(isMissingSessionError(e)){clearConversation();return}const message=e instanceof Error?e.message:'El mensaje se guardó, pero no pudimos actualizar el hilo.';setError(message);if(shouldEscalate())reportChatRecovery('chat_post_send_sync_error',message,e,id)})}
 const sendText=async(text:string,source:'typed'|'quick_reply'='typed')=>{
  const clean=text.trim();if(!service||!userId||!clean||busy)return
  if(hasContactDetails(clean)){setError('Por seguridad, no se pueden compartir teléfonos, WhatsApp, emails, usuarios de redes ni links. Usá el chat de UGO.');return}
  setBusy(true);setError('')
  const currentServiceId=service.id,attemptId=chatAttemptId()
  const{error:insertError}=await sb.from('mensajes').insert({servicio_id:currentServiceId,emisor_id:userId,emisor_rol:role==='client'?'cliente':'proveedor',contenido:clean,datos:{source,clientMessageId:attemptId}})
  if(!insertError){setBusy(false);await syncAfterSaved(currentServiceId);return}
  const message=chatError(insertError.message)
  if(isContactGuardError(insertError.message)){setBusy(false);setError(message);return}
  const{data:persisted,error:recoveryError}=await sb.from('mensajes').select('id').eq('servicio_id',currentServiceId).eq('emisor_id',userId).contains('datos',{clientMessageId:attemptId}).maybeSingle()
  setBusy(false)
  if(persisted){await syncAfterSaved(currentServiceId);return}
  if(recoveryError){const recoveryMessage='No pudimos confirmar si el mensaje quedó enviado. El chat volverá a sincronizar antes de escalar el incidente.';setError(recoveryMessage);if(shouldEscalate())reportChatRecovery('chat_send_recovery_unverified',recoveryMessage,recoveryError,currentServiceId);return}
  setError(message);if(shouldEscalate())reportChatFailure('chat_send_error',message,insertError,currentServiceId)
 }
 const submit=(e:React.FormEvent)=>{e.preventDefault();void sendText(draft)}
 if(!service)return null
 const otherLabel=role==='client'?'Profesional':'Cliente',unsafeDraft=hasContactDetails(draft),quickReplies=QUICK_REPLIES[normalizedRole]
 const selector=!serviceId&&services.length>1?<div className="ugo-service-chat-selector"><label><span>CONVERSACIÓN DEL PEDIDO</span><select value={service.id} onChange={e=>{setSelectedServiceId(e.target.value);setUnread(0)}}>{services.map(row=><option key={row.id} value={row.id}>{serviceLabel(row)}</option>)}</select></label></div>:null
 const body=<>{selector}<div className="ugo-service-chat-list" aria-live="polite">{messages.length===0?<p className="ugo-service-chat-empty">Todavía no hay mensajes. Usá este chat para coordinar sólo lo necesario del trabajo.</p>:messages.map(m=>{const own=m.emisor_id===userId;return <article key={m.id} className={own?'is-own':''}><small>{own?'Vos':otherLabel} · {timeLabel(m.created_at)}</small><p>{m.contenido}</p></article>})}<div ref={endRef}/></div><div className="ugo-service-chat-quick"><small>RESPUESTAS RÁPIDAS</small><div>{quickReplies.map(reply=><button key={reply} type="button" disabled={busy} onClick={()=>void sendText(reply,'quick_reply')}>{reply}</button>)}</div><p>Por seguridad, teléfono, WhatsApp, email, redes y links quedan dentro de UGO.</p></div><form className="ugo-service-chat-form" onSubmit={submit}><label><span className="sr-only">Mensaje</span><textarea value={draft} onChange={e=>{setDraft(e.target.value);if(error)setError('')}} maxLength={800} rows={2} placeholder={`Escribile al ${otherLabel.toLowerCase()}…`}/></label><button type="submit" disabled={busy||!draft.trim()||unsafeDraft}>{busy?'Enviando…':'Enviar'}</button></form>{unsafeDraft&&<p className="ugo-service-chat-guard" role="alert">No compartas datos de contacto. Coordiná y mantené el servicio dentro de UGO.</p>}{error&&<p className="ugo-service-chat-error" role="alert">{error}</p>}</>
 if(compact)return <section className="ugo-service-chat compact"><header><div><small>CHAT DEL SERVICIO</small><h3>{otherLabel}</h3></div><span>{messages.length}</span></header>{body}</section>
 return <aside className={`ugo-service-chat-dock ${open?'open':''}`}><button type="button" className={`ugo-service-chat-trigger ${unread?'has-unread':''}`} onClick={()=>{setOpen(value=>!value);setUnread(0)}}>💬 Chat{services.length>1?` · ${services.length} pedidos`:''}{unread?` · ${unread} nuevo${unread>1?'s':''}`:messages.length?` (${messages.length})`:''}</button>{open&&<section className="ugo-service-chat"><header><div><small>{services.length>1?'PEDIDOS ACTIVOS':'SERVICIO ACTIVO'}</small><h2>Chat con {otherLabel.toLowerCase()}</h2></div><button type="button" className="ugo-service-chat-close" onClick={()=>setOpen(false)} aria-label="Cerrar chat">×</button></header>{body}</section>}</aside>
}