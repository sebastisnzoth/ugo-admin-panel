import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
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
function chatError(message:string){return message.includes('CONTACT_DETAILS_NOT_ALLOWED')||message.toLowerCase().includes('datos de contacto')?'Por seguridad, no se pueden compartir teléfonos, WhatsApp, emails, usuarios de redes ni links. Usá el chat de UGO.':message}

export function ServiceChat({role,serviceId,compact=false}:{role:UgoRole;serviceId?:string|null;compact?:boolean}){
 const sb=useMemo(()=>getRoleSupabase(role),[role])
 const[services,setServices]=useState<ChatService[]>([]),[selectedServiceId,setSelectedServiceId]=useState<string|null>(serviceId||null),[service,setService]=useState<ChatService|null>(null),[messages,setMessages]=useState<ChatMessage[]>([]),[userId,setUserId]=useState<string|null>(null),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false),[unread,setUnread]=useState(0)
 const endRef=useRef<HTMLDivElement|null>(null)
 const normalizedRole: 'client'|'provider'=role==='client'?'client':'provider'

 const load=useCallback(async()=>{
  const{data:auth,error:authError}=await sb.auth.getUser();if(authError)throw authError
  const uid=auth.user?.id||null;setUserId(uid)
  if(!uid){setServices([]);setService(null);setMessages([]);return}
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
 },[role,sb,selectedServiceId,serviceId])

 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'No pudimos abrir el chat.'))},[load])
 useEffect(()=>{
  if(!userId)return
  let alive=true
  const resync=()=>{if(alive)void load().catch(e=>setError(e instanceof Error?e.message:'No pudimos sincronizar el chat.'))}
  const onVisibility=()=>{if(document.visibilityState==='visible')resync()}
  window.addEventListener('online',resync);document.addEventListener('visibilitychange',onVisibility)
  const suffix=serviceId&&service?.id?service.id:'all'
  let ch:any=sb.channel(`service-chat-${role}-${suffix}-${userId.slice(0,6)}`)
  const messageConfig:any={event:'INSERT',schema:'public',table:'mensajes'}
  if(serviceId&&service?.id)messageConfig.filter=`servicio_id=eq.${service.id}`
  ch=ch.on('postgres_changes',messageConfig,(payload:any)=>{
   const incoming=payload?.new as ChatMessage|undefined
   if(!serviceId&&incoming?.servicio_id&&incoming.emisor_id!==userId){setSelectedServiceId(incoming.servicio_id);setUnread(value=>value+1);if(document.visibilityState==='visible'&&!compact)setOpen(true)}
   resync()
  })
  const serviceConfig:any={event:'*',schema:'public',table:'servicios'}
  if(serviceId&&service?.id)serviceConfig.filter=`id=eq.${service.id}`
  ch=ch.on('postgres_changes',serviceConfig,resync).subscribe((status:string)=>{if(status==='SUBSCRIBED')resync()})
  return()=>{alive=false;window.removeEventListener('online',resync);document.removeEventListener('visibilitychange',onVisibility);void sb.removeChannel(ch)}
 },[compact,load,role,sb,service?.id,serviceId,userId])
 useEffect(()=>{if(open){setUnread(0);endRef.current?.scrollIntoView({block:'nearest'})}},[open,service?.id])
 useEffect(()=>{if(compact)endRef.current?.scrollIntoView({block:'nearest'})},[compact,messages])

 const sendText=async(text:string,source:'typed'|'quick_reply'='typed')=>{
  const clean=text.trim();if(!service||!userId||!clean||busy)return
  if(hasContactDetails(clean)){setError('Por seguridad, no se pueden compartir teléfonos, WhatsApp, emails, usuarios de redes ni links. Usá el chat de UGO.');return}
  setBusy(true);setError('')
  const{error:insertError}=await sb.from('mensajes').insert({servicio_id:service.id,emisor_id:userId,emisor_rol:role==='client'?'cliente':'proveedor',contenido:clean,datos:{source}})
  setBusy(false)
  if(insertError){setError(chatError(insertError.message));return}
  setDraft('');await load()
 }
 const submit=(e:React.FormEvent)=>{e.preventDefault();void sendText(draft)}
 if(!service)return null
 const otherLabel=role==='client'?'Profesional':'Cliente',unsafeDraft=hasContactDetails(draft),quickReplies=QUICK_REPLIES[normalizedRole]
 const selector=!serviceId&&services.length>1?<div className="ugo-service-chat-selector"><label><span>CONVERSACIÓN DEL PEDIDO</span><select value={service.id} onChange={e=>{setSelectedServiceId(e.target.value);setUnread(0)}}>{services.map(row=><option key={row.id} value={row.id}>{serviceLabel(row)}</option>)}</select></label></div>:null
 const body=<>{selector}<div className="ugo-service-chat-list" aria-live="polite">{messages.length===0?<p className="ugo-service-chat-empty">Todavía no hay mensajes. Usá este chat para coordinar sólo lo necesario del trabajo.</p>:messages.map(m=>{const own=m.emisor_id===userId;return <article key={m.id} className={own?'is-own':''}><small>{own?'Vos':otherLabel} · {timeLabel(m.created_at)}</small><p>{m.contenido}</p></article>})}<div ref={endRef}/></div><div className="ugo-service-chat-quick"><small>RESPUESTAS RÁPIDAS</small><div>{quickReplies.map(reply=><button key={reply} type="button" disabled={busy} onClick={()=>void sendText(reply,'quick_reply')}>{reply}</button>)}</div><p>Por seguridad, teléfono, WhatsApp, email, redes y links quedan dentro de UGO.</p></div><form className="ugo-service-chat-form" onSubmit={submit}><label><span className="sr-only">Mensaje</span><textarea value={draft} onChange={e=>{setDraft(e.target.value);if(error)setError('')}} maxLength={800} rows={2} placeholder={`Escribile al ${otherLabel.toLowerCase()}…`}/></label><button type="submit" disabled={busy||!draft.trim()||unsafeDraft}>{busy?'Enviando…':'Enviar'}</button></form>{unsafeDraft&&<p className="ugo-service-chat-guard" role="alert">No compartas datos de contacto. Coordiná y mantené el servicio dentro de UGO.</p>}{error&&<p className="ugo-service-chat-error" role="alert">{error}</p>}</>
 if(compact)return <section className="ugo-service-chat compact"><header><div><small>CHAT DEL SERVICIO</small><h3>{otherLabel}</h3></div><span>{messages.length}</span></header>{body}</section>
 return <aside className={`ugo-service-chat-dock ${open?'open':''}`}><button type="button" className={`ugo-service-chat-trigger ${unread?'has-unread':''}`} onClick={()=>{setOpen(value=>!value);setUnread(0)}}>💬 Chat{services.length>1?` · ${services.length} pedidos`:''}{unread?` · ${unread} nuevo${unread>1?'s':''}`:messages.length?` (${messages.length})`:''}</button>{open&&<section className="ugo-service-chat"><header><div><small>{services.length>1?'PEDIDOS ACTIVOS':'SERVICIO ACTIVO'}</small><h2>Chat con {otherLabel.toLowerCase()}</h2></div><button type="button" className="ugo-service-chat-close" onClick={()=>setOpen(false)} aria-label="Cerrar chat">×</button></header>{body}</section>}</aside>
}
