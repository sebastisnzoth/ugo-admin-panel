import { useCallback, useEffect, useRef, useState } from 'react'

export type HugoVoiceState = 'idle' | 'connecting' | 'ready' | 'hearing' | 'speaking' | 'error'

type VoiceOptions = {
  role: 'client' | 'provider'
  accessToken?: string
  context: string
}

export function useHugoVoice({ role, accessToken, context }: VoiceOptions) {
  const [state, setState] = useState<HugoVoiceState>('idle')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const micRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const disconnect = useCallback(() => {
    try { dcRef.current?.close() } catch { /* noop */ }
    try { pcRef.current?.close() } catch { /* noop */ }
    micRef.current?.getTracks().forEach(track => track.stop())
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.srcObject = null
    }
    dcRef.current = null
    pcRef.current = null
    micRef.current = null
    audioRef.current = null
    setState('idle')
    setTranscript('')
  }, [])

  useEffect(() => disconnect, [disconnect])

  const handleEvent = useCallback((event: any) => {
    const type = String(event?.type || '')
    if (type === 'input_audio_buffer.speech_started') setState('hearing')
    else if (type === 'input_audio_buffer.speech_stopped') setState('ready')
    else if (type === 'response.created' || type === 'response.output_audio.started') setState('speaking')
    else if (type === 'response.done') setState('ready')
    else if (type === 'response.output_audio_transcript.delta' && event.delta) {
      setTranscript(current => (current + event.delta).slice(-900))
    } else if (type === 'response.output_audio_transcript.done' && event.transcript) {
      setTranscript(String(event.transcript).slice(-900))
    } else if (type === 'error') {
      setError(event?.error?.message || 'Hugo perdió la conexión de voz.')
      setState('error')
    }
  }, [])

  const connect = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return
    if (!accessToken) {
      setError('Iniciá sesión para hablar con Hugo.')
      setState('error')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError('Este navegador no soporta conversación de voz WebRTC.')
      setState('error')
      return
    }

    setState('connecting')
    setError('')
    setTranscript('')

    try {
      const tokenResponse = await fetch('/api/hugo/realtime-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role, context }),
      })
      const tokenPayload = await tokenResponse.json().catch(() => ({}))
      if (!tokenResponse.ok || !tokenPayload?.value) {
        throw new Error(tokenPayload?.error || 'No se pudo iniciar Hugo Voice.')
      }

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      const audio = new Audio()
      audio.autoplay = true
      audio.playsInline = true
      audioRef.current = audio
      pc.ontrack = event => {
        audio.srcObject = event.streams[0]
        audio.play().catch(() => {})
      }

      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      micRef.current = mic
      mic.getTracks().forEach(track => pc.addTrack(track, mic))

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onmessage = message => {
        try { handleEvent(JSON.parse(message.data)) } catch { /* ignore malformed event */ }
      }
      dc.onopen = () => {
        setState('ready')
        dc.send(JSON.stringify({
          type: 'response.create',
          response: {
            instructions: role === 'client'
              ? 'Saludá en una sola frase y decile que ya podés escucharlo para ayudar con su servicio.'
              : 'Saludá en una sola frase y decile que ya podés escucharlo para ayudar con sus misiones.',
          },
        }))
      }
      dc.onerror = () => {
        setError('Se interrumpió el canal de voz de Hugo.')
        setState('error')
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('La conexión de voz se interrumpió.')
          setState('error')
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${tokenPayload.value}`,
          'Content-Type': 'application/sdp',
        },
      })
      const answerSdp = await sdpResponse.text()
      if (!sdpResponse.ok) throw new Error(answerSdp || 'OpenAI Realtime rechazó la sesión.')
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch (e) {
      const message = e instanceof DOMException && e.name === 'NotAllowedError'
        ? 'Necesito permiso para usar el micrófono.'
        : e instanceof Error ? e.message : 'No se pudo conectar la voz de Hugo.'
      disconnect()
      setError(message)
      setState('error')
    }
  }, [accessToken, context, disconnect, handleEvent, role, state])

  return {
    state,
    error,
    transcript,
    active: state !== 'idle' && state !== 'error',
    connect,
    disconnect,
  }
}
