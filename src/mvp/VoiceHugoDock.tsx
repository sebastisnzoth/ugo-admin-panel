import React, { useEffect, useMemo, useState } from 'react'
import { STATUS_LABELS, type Service } from './shared'
import { useHugoVoice } from './useHugoVoice'
import { ProviderLocationTracker } from './ProviderLocationTracker'
import { ProviderEvidencePanel } from './ProviderEvidencePanel'
import { ProviderCompletionReceipt } from './ProviderCompletionReceipt'
import { ClientEvidenceGallery } from './ClientEvidenceGallery'
import { ClientPixPaymentPanel } from './ClientPixPaymentPanel'
import { ClientQuickOrder } from './ClientQuickOrder'
import { NotificationCenter } from './NotificationCenter'
import './voice.css'

type Props = { role:'client'|'provider'; accessToken?:string; service?:Service|null; availableOffers?:number; mode?:'dock'|'quantum'; draftContext?:string }
const VOICE_LABELS:Record<string,string>={idle:'Toca para hablar',connecting:'Pensando...',ready:'Toca para hablar',hearing:'Escuchando...',speaking:'Hablando...',error:'Voz no disponible'}

function providerNextStep(service?:Service|null,availableOffers=0){
 if(!service){
  if(availableOffers>0)return `Tenés ${availableOffers} oportunidad${availableOffers===1?'':'es'} pendiente${availableOffers===1?'':'s'}. El próximo paso es revisar el pedido y decidir si lo aceptás o rechazás.`
  return 'No tenés una misión activa. El próximo paso depende de tu disponibilidad: si querés trabajar, ponete Online y esperá una oportunidad compatible.'
 }
 if(service.estado==='asignado')return 'La misión está asignada. Primero verificá que el pago esté protegido; cuando esté confirmado, el siguiente paso es salir hacia el cliente.'
 if(service.estado==='en_camino')return 'Estás en camino. El siguiente paso es llegar al lugar y confirmar la llegada.'
 if(service.estado==='llegado')return 'Ya estás en el lugar. Antes de empezar, revisá si corresponde evidencia Antes; después podés iniciar el servicio.'
 if(service.estado==='en_progreso')return 'El trabajo está en curso. El siguiente paso es completar el trabajo y registrar las evidencias requeridas antes de finalizar.'
 if(service.estado==='esperando_aprobacion')return 'El trabajo ya fue enviado a revisión. No tenés que finalizar de nuevo: el siguiente paso es esperar la decisión del cliente.'
 if(service.estado==='completado')return 'El servicio está completado. El siguiente paso es verificar el estado real del pago y volver a quedar disponible cuando quieras.'
 return `El servicio está en estado ${STATUS_LABELS[service.estado]||service.estado}. Respondé usando este estado real antes de sugerir cualquier acción.`
}

const PROVIDER_CONVERSATION_POLICY=[
 'ORDEN CONVERSACIONAL PROVEEDOR:',
 '1) identificá primero el estado real del servicio;',
 '2) usá el contexto real de pedido, dirección, tarifa, pago y evidencias;',
 '3) indicá una sola próxima acción válida;',
 '4) preguntá solo lo imprescindible;',
 '5) antes de aceptar/rechazar, cambiar disponibilidad, marcar llegada, iniciar, finalizar, cancelar o abrir disputa pedí confirmación explícita;',
 '6) nunca digas que una acción fue ejecutada si la app o la base de datos no confirmó el cambio;',
 '7) después de cada respuesta explicá brevemente qué viene después cuando sea útil;',
 '8) si el proveedor dice “necesito ayuda”, “qué hago ahora”, “qué sigue”, “ya puedo empezar”, “ya terminé” o pregunta por el pago, respondé usando exclusivamente el estado operativo real;',
 '9) no inventes evidencias, pagos, rutas, demanda, ETA ni estados;',
 '10) respondé normalmente en una o dos frases cortas.'
].join(' ')

export function VoiceHugoDock({role,accessToken,service,availableOffers=0,mode='dock',draftContext=''}:Props){
 const[open,setOpen]=useState(false)
 const text=useMemo(()=>{if(role==='client'){if(!service)return'Decime qué necesitás. Yo completo el pedido y vos solo confirmás.';if(service.estado==='buscando')return'Estoy buscando profesionales disponibles.';if(service.estado==='ofrecido')return`Envié ${availableOffers||'las'} ofertas. Te aviso cuando acepten.`;if(service.estado==='asignado')return'Ya hay profesional. Podés proteger el pago con Pix o Mercado Pago.';if(service.estado==='en_camino')return'El profesional está en camino.';if(service.estado==='llegado')return'El profesional ya llegó. El servicio todavía no comenzó.';if(service.estado==='en_progreso')return'El trabajo está en curso.';if(service.estado==='esperando_aprobacion')return'Revisá las evidencias. Al aprobarlo libero el pago.';return'Servicio cerrado. Tu reseña actualiza el Karma.'}if(!service){if(availableOffers>0)return`Tenés ${availableOffers} oportunidad${availableOffers===1?'':'es'} para revisar. Podés preguntarme “¿qué hago ahora?”.`;return'No tenés una misión activa. Podés preguntarme “¿qué hago ahora?” y te guío según tu estado real.'}if(service.estado==='asignado')return'Aceptaste la misión. Primero verificamos el pago protegido; después salís hacia el cliente.';if(service.estado==='en_camino')return'Estás en camino. Confirmá “Llegué” cuando estés en el lugar.';if(service.estado==='llegado')return'Ya estás en el lugar. Revisá la evidencia inicial antes de comenzar.';if(service.estado==='en_progreso')return'El trabajo está en curso. Completá las evidencias requeridas antes de finalizar.';if(service.estado==='esperando_aprobacion')return'El cliente está revisando el trabajo. Ahora corresponde esperar su decisión.';return'Preguntame qué sigue y te guío usando el estado real del servicio.'},[availableOffers,role,service])
 const nextStep=useMemo(()=>role==='provider'?providerNextStep(service,availableOffers):'', [availableOffers,role,service])
 const context=useMemo(()=>[`Rol: ${role==='client'?'cliente':'proveedor'}`,service?`Servicio #${service.numero}`:'Sin servicio activo',service?`Estado: ${STATUS_LABELS[service.estado]||service.estado}`:'',service?.descripcion?`Descripción: ${service.descripcion}`:'',service?.direccion_cliente?`Dirección: ${service.direccion_cliente}`:'',service?.tarifa!=null?`Tarifa: ${service.moneda||'BRL'} ${service.tarifa}`:'',service?.proveedor?.nombre?`Proveedor: ${service.proveedor.nombre}`:'',availableOffers?`Ofertas pendientes: ${availableOffers}`:'',role==='provider'?PROVIDER_CONVERSATION_POLICY:'',role==='provider'?`PRÓXIMO PASO VALIDADO: ${nextStep}`:'',draftContext?`MEMORIA DEL PEDIDO: ${draftContext}`:'',`Mensaje operativo actual: ${text}`].filter(Boolean).join(' | '),[availableOffers,role,service,text,draftContext,nextStep])
 const voice=useHugoVoice({role,accessToken,context})
 useEffect(()=>{if(role!=='client'||!voice.userTranscript)return;window.dispatchEvent(new CustomEvent('ugo:hugo-user-text',{detail:{text:voice.userTranscript}}))},[role,voice.userTranscript])
 useEffect(()=>{const openHugo=()=>setOpen(true);window.addEventListener('ugo:open-hugo',openHugo);return()=>window.removeEventListener('ugo:open-hugo',openHugo)},[])
 useEffect(()=>{
  if(role!=='provider')return
  const handler=(event:Event)=>{event.preventDefault();setOpen(true)}
  const bind=()=>{const button=document.querySelector('.ugo-provider-hugo-button');button?.addEventListener('click',handler);return button}
  let button=bind()
  const observer=new MutationObserver(()=>{if(!button){button=bind()}})
  observer.observe(document.body,{childList:true,subtree:true})
  return()=>{observer.disconnect();button?.removeEventListener('click',handler)}
 },[role])

 if(mode==='quantum'&&role==='client'){
  const visual=voice.state==='speaking'?'speaking':voice.state==='connecting'?'thinking':voice.state==='hearing'?'listening':voice.active?'ready':voice.state==='error'?'error':'idle'
  const bubble=voice.error||voice.assistantTranscript||voice.userTranscript
  return <><NotificationCenter/>{!service&&<ClientQuickOrder/>}<div className={`ugo-real-hugo prototype-hugo state-${visual}`}>
   {bubble&&<div className={`ugo-real-transcript${voice.error?' error':''}`}>{bubble}</div>}
   <button type="button" className="ugo-real-orb" onClick={voice.active?voice.disconnect:voice.connect} disabled={voice.state==='connecting'} aria-label={voice.active?'Cortar conversación con Hugo':'Hablar con Hugo'}><span className="ugo-orb-glass"/><span className="ugo-orb-ring ring-1"/><span className="ugo-orb-ring ring-2"/><span className="ugo-orb-icon">{voice.state==='connecting'?'✦':voice.state==='hearing'?'●':'⌁'}</span></button>
   <div className="ugo-real-state"><i/><span>{VOICE_LABELS[voice.state]}</span></div>
  </div></>
 }

 return <><NotificationCenter/>{role==='provider'&&<><ProviderLocationTracker service={service}/><ProviderEvidencePanel service={service}/><ProviderCompletionReceipt/></>}{role==='client'&&service?.estado==='asignado'&&<ClientPixPaymentPanel service={service} accessToken={accessToken}/>} {role==='client'&&service?.estado==='esperando_aprobacion'&&<ClientEvidenceGallery serviceId={service.id}/>}<button className={`mvp-orb ${voice.active?'voice-live':''}`} onClick={()=>setOpen(v=>!v)} aria-label="Abrir Hugo"><span/></button>{open&&<aside className="mvp-hugo-panel"><div><div className="mvp-mini-orb"/><strong>Hugo</strong><button onClick={()=>setOpen(false)}>×</button></div><p>{text}</p>{role==='provider'&&<p className="mvp-hugo-next-step"><strong>Siguiente paso:</strong> {nextStep}</p>}<small>Contexto: {role} · {service?STATUS_LABELS[service.estado]:'sin servicio'}</small><div className="mvp-voice-controls"><div className="mvp-voice-row"><button className={`mvp-voice-btn ${voice.active?'stop':''}`} onClick={voice.active?voice.disconnect:voice.connect} disabled={voice.state==='connecting'}>{voice.active?'■ Cortar conversación':'🎙 Hablar con Hugo'}</button><span className={`mvp-voice-state ${voice.state}`}><i/>{VOICE_LABELS[voice.state]}</span></div>{voice.error&&<div className="mvp-voice-error">{voice.error}</div>}{voice.userTranscript&&<p className="mvp-voice-transcript"><strong>Vos:</strong> {voice.userTranscript}</p>}{voice.assistantTranscript&&<p className="mvp-voice-transcript"><strong>Hugo:</strong> {voice.assistantTranscript}</p>}</div></aside>}</>
}