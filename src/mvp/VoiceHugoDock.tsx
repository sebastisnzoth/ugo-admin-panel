import React, { useEffect, useMemo, useState } from 'react'
import { STATUS_LABELS, type Service } from './shared'
import { useHugoVoice } from './useHugoVoice'
import { ProviderLocationTracker } from './ProviderLocationTracker'
import { ProviderEvidencePanel } from './ProviderEvidencePanel'
import { ClientEvidenceGallery } from './ClientEvidenceGallery'
import { ProviderPayoutPanel } from './ProviderPayoutPanel'
import { ClientPixPaymentPanel } from './ClientPixPaymentPanel'
import { NotificationCenter } from './NotificationCenter'
import './voice.css'

type Props = { role:'client'|'provider'; accessToken?:string; service?:Service|null; availableOffers?:number; mode?:'dock'|'quantum'; draftContext?:string }
const VOICE_LABELS:Record<string,string>={idle:'Toca para hablar',connecting:'Pensando...',ready:'Toca para hablar',hearing:'Escuchando...',speaking:'Hablando...',error:'Voz no disponible'}

export function VoiceHugoDock({role,accessToken,service,availableOffers=0,mode='dock',draftContext=''}:Props){
 const[open,setOpen]=useState(false)
 const text=useMemo(()=>{if(role==='client'){if(!service)return'Contame qué necesitás y preparo el pedido.';if(service.estado==='buscando')return'Estoy buscando profesionales disponibles.';if(service.estado==='ofrecido')return`Envié ${availableOffers||'las'} ofertas. Te aviso cuando acepten.`;if(service.estado==='asignado')return'Ya hay profesional. Podés proteger el pago con Pix o Mercado Pago.';if(service.estado==='en_camino')return'El profesional está en camino.';if(service.estado==='llegado')return'El profesional ya llegó. El servicio todavía no comenzó.';if(service.estado==='en_progreso')return'El trabajo está en curso.';if(service.estado==='esperando_aprobacion')return'Revisá las evidencias. Al aprobarlo libero el pago.';return'Servicio cerrado. Tu reseña actualiza el Karma.'}if(!service)return'Ponete disponible para recibir oportunidades.';if(service.estado==='asignado')return'Aceptaste la misión. Salí hacia el cliente.';if(service.estado==='en_camino')return'Confirmá “Llegué” cuando estés en el lugar.';if(service.estado==='llegado')return'Ya estás en el lugar. Podés registrar una foto inicial y después iniciar el servicio.';if(service.estado==='en_progreso')return'Agregá una foto final y pedí aprobación.';return'El pago sigue retenido hasta la aprobación.'},[availableOffers,role,service])
 const context=useMemo(()=>[`Rol: ${role==='client'?'cliente':'proveedor'}`,service?`Servicio #${service.numero}`:'Sin servicio activo',service?`Estado: ${STATUS_LABELS[service.estado]||service.estado}`:'',service?.descripcion?`Descripción: ${service.descripcion}`:'',service?.direccion_cliente?`Dirección: ${service.direccion_cliente}`:'',service?.tarifa!=null?`Tarifa: ${service.moneda||'BRL'} ${service.tarifa}`:'',service?.proveedor?.nombre?`Proveedor: ${service.proveedor.nombre}`:'',availableOffers?`Ofertas pendientes: ${availableOffers}`:'',draftContext?`MEMORIA DEL PEDIDO: ${draftContext}`:'',`Mensaje operativo actual: ${text}`].filter(Boolean).join(' | '),[availableOffers,role,service,text,draftContext])
 const voice=useHugoVoice({role,accessToken,context})
 useEffect(()=>{if(role!=='client'||!voice.userTranscript)return;window.dispatchEvent(new CustomEvent('ugo:hugo-user-text',{detail:{text:voice.userTranscript}}))},[role,voice.userTranscript])

 if(mode==='quantum'&&role==='client'){
  const visual=voice.state==='speaking'?'speaking':voice.state==='connecting'?'thinking':voice.state==='hearing'?'listening':voice.active?'ready':voice.state==='error'?'error':'idle'
  const bubble=voice.error||voice.assistantTranscript||voice.userTranscript
  return <><NotificationCenter/><div className={`ugo-real-hugo prototype-hugo state-${visual}`}>
   {bubble&&<div className={`ugo-real-transcript${voice.error?' error':''}`}>{bubble}</div>}
   <button type="button" className="ugo-real-orb" onClick={voice.active?voice.disconnect:voice.connect} disabled={voice.state==='connecting'} aria-label={voice.active?'Cortar conversación con Hugo':'Hablar con Hugo'}><span className="ugo-orb-glass"/><span className="ugo-orb-ring ring-1"/><span className="ugo-orb-ring ring-2"/><span className="ugo-orb-icon">{voice.state==='connecting'?'✦':voice.state==='hearing'?'●':'⌁'}</span></button>
   <div className="ugo-real-state"><i/><span>{VOICE_LABELS[voice.state]}</span></div>
  </div></>
 }

 return <><NotificationCenter/>{role==='provider'&&<><ProviderLocationTracker service={service}/><ProviderEvidencePanel service={service}/></>}{role==='client'&&service?.estado==='asignado'&&<ClientPixPaymentPanel service={service} accessToken={accessToken}/>} {role==='client'&&service?.estado==='esperando_aprobacion'&&<ClientEvidenceGallery serviceId={service.id}/>}<button className={`mvp-orb ${voice.active?'voice-live':''}`} onClick={()=>setOpen(v=>!v)} aria-label="Abrir Hugo"><span/></button>{open&&<aside className="mvp-hugo-panel"><div><div className="mvp-mini-orb"/><strong>Hugo</strong><button onClick={()=>setOpen(false)}>×</button></div><p>{text}</p><small>Contexto: {role} · {service?STATUS_LABELS[service.estado]:'sin servicio'}</small><div className="mvp-voice-controls"><div className="mvp-voice-row"><button className={`mvp-voice-btn ${voice.active?'stop':''}`} onClick={voice.active?voice.disconnect:voice.connect} disabled={voice.state==='connecting'}>{voice.active?'■ Cortar conversación':'🎙 Hablar con Hugo'}</button><span className={`mvp-voice-state ${voice.state}`}><i/>{VOICE_LABELS[voice.state]}</span></div>{voice.error&&<div className="mvp-voice-error">{voice.error}</div>}{voice.userTranscript&&<p className="mvp-voice-transcript"><strong>Vos:</strong> {voice.userTranscript}</p>}{voice.assistantTranscript&&<p className="mvp-voice-transcript"><strong>Hugo:</strong> {voice.assistantTranscript}</p>}{role==='provider'&&accessToken&&<ProviderPayoutPanel accessToken={accessToken}/>}</div></aside>}</>
}
