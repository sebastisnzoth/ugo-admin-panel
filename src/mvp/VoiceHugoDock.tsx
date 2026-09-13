import React, { useEffect, useMemo, useState } from 'react'
import { STATUS_LABELS, type Service } from './shared'
import { useHugoVoice } from './useHugoVoice'
import { ProviderLocationTracker } from './ProviderLocationTracker'
import { ProviderEvidencePanel } from './ProviderEvidencePanel'
import { ProviderCompletionReceipt } from './ProviderCompletionReceipt'
import { ClientEvidenceGallery } from './ClientEvidenceGallery'
import { UGO_UI_EVENTS } from './uiEvents'
import type { ClientActionHandlers, ClientHugoIntent } from './client/clientTypes'
import './voice.css'

type ClientPaymentStatus='none'|'cash'|'pending'|'confirmed'
type Props = { role:'client'|'provider'; accessToken?:string; service?:Service|null; availableOffers?:number; mode?:'dock'|'quantum'; draftContext?:string; paymentStatus?:ClientPaymentStatus; clientActions?:ClientActionHandlers; onIntent?:(intent:Omit<ClientHugoIntent,'id'>)=>void }
const VOICE_LABELS:Record<string,string>={idle:'Toca para hablar',connecting:'Pensando...',ready:'Te escucho',hearing:'Escuchando...',speaking:'Hablando...',error:'Voz no disponible'}
const CLIENT_CANCELLABLE_STATES=['buscando','ofrecido','asignado','en_camino','llegado']

export function VoiceHugoDock({role,accessToken,service,availableOffers=0,mode='dock',draftContext='',paymentStatus='none',clientActions,onIntent}:Props){
 const[open,setOpen]=useState(false),[typed,setTyped]=useState('')
 const text=useMemo(()=>{if(role==='client'){if(!service)return'Decime qué necesitás. Yo te ayudo a resolverlo.';if(service.estado==='buscando')return'Estoy buscando profesionales disponibles para tu pedido.';if(service.estado==='ofrecido')return`Ya avisé a ${availableOffers||'varios'} profesionales. Te aviso cuando alguno acepte.`;if(service.estado==='asignado'){if(paymentStatus==='cash')return'Listo, elegiste efectivo. El profesional puede iniciar el viaje cuando esté listo.';if(paymentStatus==='confirmed')return'El pago electrónico está confirmado. El profesional ya puede iniciar el viaje.';if(paymentStatus==='pending')return'El pago electrónico está iniciado. Falta confirmarlo para habilitar la salida.';return'Ya encontré un profesional. Te acompaño con el siguiente paso.'}if(service.estado==='en_camino')return'El profesional está en camino.';if(service.estado==='llegado')return'El profesional ya llegó. Todavía falta iniciar el trabajo.';if(service.estado==='en_progreso')return'El trabajo está en curso. Te aviso cuando el proveedor lo marque terminado.';if(service.estado==='esperando_aprobacion')return'El proveedor marcó el trabajo como terminado. Revisalo y aprobalo si está todo bien.';if(service.estado==='disputado')return'Hay una revisión abierta. Voy a mantenerte al tanto del próximo paso.';return'Servicio cerrado. Tu reseña actualiza el Karma.'}if(!service)return'Ponete disponible para recibir oportunidades.';if(service.estado==='asignado')return'Aceptaste la misión. Cuando la forma de pago esté habilitada, podés salir hacia el cliente.';if(service.estado==='en_camino')return'Confirmá “Llegué” cuando estés en el lugar.';if(service.estado==='llegado')return'Ya estás en el lugar. Podés registrar una foto inicial y después iniciar el servicio.';if(service.estado==='en_progreso')return'Agregá una foto final y seguí el cierre indicado para este medio de pago.';if(service.estado==='esperando_aprobacion')return'El cliente está revisando el trabajo. Te aviso cuando cierre el servicio.';if(service.estado==='disputado')return'El servicio está en revisión. Conservá evidencias y seguí las indicaciones de UGO.';return'El servicio no requiere una acción operativa ahora.'},[availableOffers,paymentStatus,role,service])
 const context=useMemo(()=>[`Rol: ${role==='client'?'cliente':'proveedor'}`,service?`Servicio #${service.numero}`:'Sin servicio activo',service?`Estado: ${STATUS_LABELS[service.estado]||service.estado}`:'',role==='client'&&service?.estado==='asignado'?`Pago: ${paymentStatus}`:'',service?.descripcion?`Descripción: ${service.descripcion}`:'',service?.direccion_cliente?`Dirección: ${service.direccion_cliente}`:'',service?.tarifa!=null?`Tarifa: ${service.moneda||'BRL'} ${service.tarifa}`:'',service?.proveedor?.nombre?`Proveedor: ${service.proveedor.nombre}`:'',availableOffers?`Ofertas pendientes: ${availableOffers}`:'',draftContext?`MEMORIA DEL PEDIDO: ${draftContext}`:'',`Mensaje operativo actual: ${text}`].filter(Boolean).join(' | '),[availableOffers,role,service,text,draftContext,paymentStatus])
 const voice=useHugoVoice({role,accessToken,context,clientActions,onIntent})
 useEffect(()=>{
  if(role!=='provider')return
  const handler=(event:Event)=>{event.preventDefault();setOpen(true)}
  const bind=()=>{const button=document.querySelector('.ugo-provider-hugo-button');button?.addEventListener('click',handler);return button}
  let button=bind()
  const observer=new MutationObserver(()=>{if(!button){button=bind()}})
  observer.observe(document.body,{childList:true,subtree:true})
  return()=>{observer.disconnect();button?.removeEventListener('click',handler)}
 },[role])
 useEffect(()=>{
  if(role!=='client')return
  const handler=()=>{
   if(mode==='quantum'){
    if(!voice.active&&voice.state!=='connecting')void voice.connect()
    return
   }
   setOpen(true)
  }
  window.addEventListener(UGO_UI_EVENTS.clientHugo,handler)
  return()=>window.removeEventListener(UGO_UI_EVENTS.clientHugo,handler)
 },[mode,role,voice.active,voice.connect,voice.state])

 if(mode==='quantum'&&role==='client'){
  const visual=voice.state==='speaking'?'speaking':voice.state==='connecting'?'thinking':voice.state==='hearing'?'listening':voice.active?'ready':voice.state==='error'?'error':'idle'
  const stateLabel=service?STATUS_LABELS[service.estado]||service.estado:'Listo para ayudarte'
  const providerName=service?.proveedor?.nombre||''
  const canCancel=Boolean(service&&CLIENT_CANCELLABLE_STATES.includes(service.estado))
  return <section className={`ugo-real-hugo prototype-hugo state-${visual}`} aria-label="Hugo, compañero de UGO">
   <div className="ugo-hugo-stage-card">
    <div className="ugo-hugo-stage-head"><div><small>HUGO</small><strong>{text}</strong></div><span className={`ugo-hugo-stage-live state-${visual}`}><i/>{VOICE_LABELS[voice.state]}</span></div>
    {service&&<div className="ugo-hugo-context-card"><div className="ugo-hugo-context-main"><small>{service.categoria?.emoji||'🧰'} {service.categoria?.nombre||'Servicio UGO'}</small><b>{service.descripcion||`Servicio #${service.numero}`}</b><span>{stateLabel}</span></div>{providerName&&<div className="ugo-hugo-provider-mini"><span>{providerName.slice(0,1).toUpperCase()}</span><div><small>PROFESIONAL</small><b>{providerName}</b>{service.proveedor?.karma!=null&&<em>★ {Number(service.proveedor.karma).toFixed(1)} Karma</em>}</div></div>}</div>}
    {voice.userTranscript&&<p className="ugo-hugo-user-line"><b>Vos</b><span>{voice.userTranscript}</span></p>}
    {voice.assistantTranscript&&<p className="ugo-hugo-assistant-line"><b>Hugo</b><span>{voice.assistantTranscript}</span></p>}
    {voice.error&&<p className="ugo-hugo-stage-error">{voice.error}</p>}
    <form className="ugo-hugo-stage-input" onSubmit={event=>{event.preventDefault();const value=typed.trim();if(!value)return;setTyped('');void voice.sendText(value)}}><input value={typed} onChange={event=>setTyped(event.target.value)} placeholder="Escribile a Hugo como a un amigo…" aria-label="Mensaje para Hugo"/><button type="submit" disabled={voice.state==='connecting'}>Enviar</button></form>
    <div className="ugo-hugo-stage-actions">{!service&&<button type="button" className="primary" onClick={()=>clientActions?.openSearch()}>Armar pedido visual</button>}{service&&<button type="button" onClick={()=>clientActions?.openHistory()}>Ver Actividad</button>}{canCancel&&<button type="button" className="danger" onClick={()=>{void clientActions?.cancelService()}}>Cancelar pedido</button>}{service?.estado==='esperando_aprobacion'&&<button type="button" className="primary" onClick={()=>clientActions?.openReview()}>Revisar trabajo</button>}</div>
   </div>
   <button type="button" className="ugo-real-orb" onClick={voice.active?voice.disconnect:voice.connect} disabled={voice.state==='connecting'} aria-label={voice.active?'Cortar conversación con Hugo':'Hablar con Hugo'}><span className="ugo-orb-glass"/><span className="ugo-orb-ring ring-1"/><span className="ugo-orb-ring ring-2"/><span className="ugo-orb-icon">{voice.state==='connecting'?'✦':voice.state==='hearing'?'●':'⌁'}</span></button>
   <div className="ugo-real-state"><i/><span>{VOICE_LABELS[voice.state]}</span></div>
  </section>
 }

 return <>{role==='provider'&&<><ProviderLocationTracker service={service}/><ProviderEvidencePanel service={service}/><ProviderCompletionReceipt/></>}{role==='client'&&service?.estado==='esperando_aprobacion'&&<ClientEvidenceGallery serviceId={service.id}/>}<button className={`mvp-orb ${voice.active?'voice-live':''}`} onClick={()=>setOpen(v=>!v)} aria-label="Abrir Hugo"><span/></button>{open&&<aside className="mvp-hugo-panel"><div><div className="mvp-mini-orb"/><strong>Hugo</strong><button onClick={()=>setOpen(false)}>×</button></div><p>{text}</p><small>Contexto: {role} · {service?STATUS_LABELS[service.estado]||service.estado:'sin servicio'}</small><div className="mvp-voice-controls"><div className="mvp-voice-row"><button className={`mvp-voice-btn ${voice.active?'stop':''}`} onClick={voice.active?voice.disconnect:voice.connect} disabled={voice.state==='connecting'}>{voice.active?'■ Cortar conversación':'🎙 Hablar con Hugo'}</button><span className={`mvp-voice-state ${voice.state}`}><i/>{VOICE_LABELS[voice.state]}</span></div>{voice.error&&<div className="mvp-voice-error">{voice.error}</div>}{voice.userTranscript&&<p className="mvp-voice-transcript"><strong>Vos:</strong> {voice.userTranscript}</p>}{voice.assistantTranscript&&<p className="mvp-voice-transcript"><strong>Hugo:</strong> {voice.assistantTranscript}</p>}</div></aside>}</>
}
