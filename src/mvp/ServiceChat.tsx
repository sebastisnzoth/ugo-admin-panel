import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import{getRoleSupabase,type UgoRole}from'../lib/roleSupabase'
import'./service-chat.css'

type ChatMessage={id:number|string;servicio_id:string;emisor_id:string|null;emisor_rol:string;contenido:string;created_at:string}
type ChatService={id:string;cliente_id:string;proveedor_id:string|null;estado:string;descripcion:string|null}
const AUTO_STATES=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado']

function timeLabel(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}

export function ServiceChat({role,serviceId,compact=false}:{role:UgoRole;serviceId?:string|null;compact?:boolean}){
 const sb=useMemo(()=>getRoleSupabase(role),[role])
 const[service,setService]=useState<ChatService|null>(null),[messages,setMessages]=useState<ChatMessage[]>([]),[userId,setUserId]=useState<string|null>(null),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false)
 const endRef=useRef<HTMLDivElement|null>(null)
 const load=useCallback(async()=>{const{data:auth,error:authError}=await sb.auth.getUser();if(authError)throw authError;const uid=auth.user?.id||null;setUserId(uid);if(!uid){setService(null);setMessages([]);return}let q=sb.from('servicios').select('id,cliente_id,proveedor_id,estado,descripcion');if(serviceId)q=q.eq('id',serviceId);else q=(role==='client'?q.eq('cliente_id',uid):q.eq('proveedor_id',uid)).in('estado',AUTO_STATES).order('updated_at',{ascending:false}).limit(1);const{data:s,error:se}=await q.maybeSingle();if(se)throw se;const current=(s||null)as ChatService|null;if(!current||!current.proveedor_id){setService(null);setMessages([]);return}setService(current);const{data:m,error:me}=await sb.from('mensajes').select('id,servicio_id,emisor_id,emisor_rol,contenido,created_at').eq('servicio_id',current.id).order('created_at',{ascending:true}).limit(200);if(me)throw me;setMessages((m||[])as ChatMessage[])},[role,sb,serviceId])
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'No pudimos abrir el chat.'))},[load])
 useEffect(()=>{if(!service?.id)return;const ch=sb.channel(`service-chat-${role}-${service.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'mensajes',filter:`servicio_id=eq.${service.id}`},()=>void load()).subscribe();return()=>{void sb.removeChannel(ch)}},[load,role,sb,service?.id])
 useEffect(()=>{if(open||compact)endRef.current?.scrollIntoView({block:'nearest'})},[messages,open,compact])
 const send=async(e:React.FormEvent)=>{e.preventDefault();const text=draft.trim();if(!service||!userId||!text||busy)return;setBusy(true);setError('');const{error:insertError}=await sb.from('mensajes').insert({servicio_id:service.id,emisor_id:userId,emisor_rol:role==='client'?'cliente':'proveedor',contenido:text});setBusy(false);if(insertError){setError(insertError.message);return}setDraft('');await load()}
 if(!service)return null
 const otherLabel=role==='client'?'Profesional':'Cliente'
 const body=<><div className="ugo-service-chat-list" aria-live="polite">{messages.length===0?<p className="ugo-service-chat-empty">Todavía no hay mensajes. Usá este chat para coordinar sólo lo necesario del trabajo.</p>:messages.map(m=>{const own=m.emisor_id===userId;return <article key={m.id} className={own?'is-own':''}><small>{own?'Vos':otherLabel} · {timeLabel(m.created_at)}</small><p>{m.contenido}</p></article>})}<div ref={endRef}/></div><form className="ugo-service-chat-form" onSubmit={send}><label><span className="sr-only">Mensaje</span><textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} rows={2} placeholder={`Escribile al ${otherLabel.toLowerCase()}…`}/></label><button type="submit" disabled={busy||!draft.trim()}>{busy?'Enviando…':'Enviar'}</button></form>{error&&<p className="ugo-service-chat-error" role="alert">{error}</p>}</>
 if(compact)return <section className="ugo-service-chat compact"><header><div><small>CHAT DEL SERVICIO</small><h3>{otherLabel}</h3></div><span>{messages.length}</span></header>{body}</section>
 return <aside className={`ugo-service-chat-dock ${open?'open':''}`}><button type="button" className="ugo-service-chat-trigger" onClick={()=>setOpen(v=>!v)}>💬 Chat del servicio{messages.length?` (${messages.length})`:''}</button>{open&&<section className="ugo-service-chat"><header><div><small>SERVICIO ACTIVO</small><h2>Chat con {otherLabel.toLowerCase()}</h2></div><button type="button" className="ugo-service-chat-close" onClick={()=>setOpen(false)} aria-label="Cerrar chat">×</button></header>{body}</section>}</aside>
}
