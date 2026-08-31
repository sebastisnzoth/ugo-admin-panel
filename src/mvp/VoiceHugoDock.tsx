import React, { useEffect, useMemo, useState } from 'react'
import { STATUS_LABELS, type Service } from './shared'
import { useHugoVoice } from './useHugoVoice'
import './voice.css'

type Props = {
  role: 'client' | 'provider'
  accessToken?: string
  service?: Service | null
  availableOffers?: number
}

const VOICE_LABELS: Record<string, string> = {
  idle: 'Voz apagada',
  connecting: 'Procesando…',
  ready: 'Te escucho',
  hearing: 'Escuchando…',
  speaking: 'Hugo está hablando',
  error: 'Voz no disponible',
}

export function VoiceHugoDock({ role, accessToken, service, availableOffers = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const text = useMemo(() => {
    if (role === 'client') {
      if (!service) return 'Contame qué necesitás y preparo el pedido.'
      if (service.estado === 'buscando') return 'Estoy buscando profesionales disponibles.'
      if (service.estado === 'ofrecido') return `Envié ${availableOffers || 'las'} ofertas. Te aviso cuando acepten.`
      if (service.estado === 'asignado') return 'Ya hay profesional y el pago quedó retenido.'
      if (service.estado === 'en_camino') return 'El profesional está en camino.'
      if (service.estado === 'en_progreso') return 'El trabajo está en curso.'
      if (service.estado === 'esperando_aprobacion') return 'Revisá el trabajo. Al aprobarlo libero el pago.'
      return 'Servicio cerrado. Tu reseña actualiza el Karma.'
    }
    if (!service) return 'Ponete disponible para recibir oportunidades.'
    if (service.estado === 'asignado') return 'Aceptaste la misión. Salí hacia el cliente.'
    if (service.estado === 'en_camino') return 'Confirmá llegada para iniciar.'
    if (service.estado === 'en_progreso') return 'Finalizá y pedí aprobación.'
    return 'El pago sigue retenido hasta la aprobación.'
  }, [availableOffers, role, service])

  const context = useMemo(() => {
    const parts = [
      `Rol: ${role === 'client' ? 'cliente' : 'proveedor'}`,
      service ? `Servicio #${service.numero}` : 'Sin servicio activo',
      service ? `Estado: ${STATUS_LABELS[service.estado] || service.estado}` : '',
      service?.descripcion ? `Descripción: ${service.descripcion}` : '',
      service?.direccion_cliente ? `Dirección: ${service.direccion_cliente}` : '',
      service?.tarifa != null ? `Tarifa: ${service.moneda || 'BRL'} ${service.tarifa}` : '',
      service?.proveedor?.nombre ? `Proveedor: ${service.proveedor.nombre}` : '',
      service?.cliente?.nombre ? `Cliente: ${service.cliente.nombre}` : '',
      availableOffers ? `Ofertas pendientes: ${availableOffers}` : '',
      `Mensaje operativo actual: ${text}`,
    ]
    return parts.filter(Boolean).join(' | ')
  }, [availableOffers, role, service, text])

  const voice = useHugoVoice({ role, accessToken, context })

  useEffect(() => {
    if (role !== 'client' || !voice.userTranscript) return
    window.dispatchEvent(new CustomEvent('ugo:hugo-user-text', { detail: { text: voice.userTranscript } }))
  }, [role, voice.userTranscript])

  return <>
    <button
      className={`mvp-orb ${voice.active ? 'voice-live' : ''}`}
      onClick={() => setOpen(v => !v)}
      aria-label="Abrir Hugo"
      title={voice.active ? 'Hugo Voice conectado' : 'Abrir Hugo'}
    ><span/></button>
    {open && <aside className="mvp-hugo-panel">
      <div><div className="mvp-mini-orb"/><strong>Hugo</strong><button onClick={() => setOpen(false)}>×</button></div>
      <p>{text}</p>
      <small>Contexto: {role} · {service ? STATUS_LABELS[service.estado] : 'sin servicio'}</small>
      <div className="mvp-voice-controls">
        <div className="mvp-voice-row">
          <button
            className={`mvp-voice-btn ${voice.active ? 'stop' : ''}`}
            onClick={voice.active ? voice.disconnect : voice.connect}
            disabled={voice.state === 'connecting'}
          >{voice.active ? '■ Cortar conversación' : '🎙 Hablar con Hugo'}</button>
          <span className={`mvp-voice-state ${voice.state}`}><i/>{VOICE_LABELS[voice.state]}</span>
        </div>
        {voice.error && <div className="mvp-voice-error">{voice.error}</div>}
        {voice.userTranscript && <p className="mvp-voice-transcript"><strong>Vos:</strong> {voice.userTranscript}</p>}
        {voice.assistantTranscript && <p className="mvp-voice-transcript"><strong>Hugo:</strong> {voice.assistantTranscript}</p>}
      </div>
    </aside>}
  </>
}
