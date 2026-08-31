import { useCallback, useEffect, useRef, useState } from 'react'

export type HugoVoiceState = 'idle' | 'connecting' | 'ready' | 'hearing' | 'speaking' | 'error'

type VoiceOptions = {
  role: 'client' | 'provider'
  accessToken?: string
  context: string
}

type ChatTurn = { role: 'user' | 'assistant'; content: string }

function puterText(result: any): string {
  const content = result?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content.map((part: any) => typeof part === 'string' ? part : part?.text || '').join(' ').trim()
  }
  return typeof result === 'string' ? result.trim() : ''
}

export function useHugoVoice({ role, accessToken, context }: VoiceOptions) {
  const [state, setState] = useState<HugoVoiceState>('idle')
  const [error, setError] = useState('')
  const [userTranscript, setUserTranscript] = useState('')
  const [assistantTranscript, setAssistantTranscript] = useState('')

  const recognitionRef = useRef<any>(null)
  const runningRef = useRef(false)
  const busyRef = useRef(false)
  const historyRef = useRef<ChatTurn[]>([])
  const roleRef = useRef(role)
  const contextRef = useRef(context)

  useEffect(() => { roleRef.current = role }, [role])
  useEffect(() => { contextRef.current = context }, [context])

  const startRecognition = useCallback(() => {
    if (!runningRef.current || busyRef.current || !recognitionRef.current) return
    try {
      recognitionRef.current.start()
      setState('ready')
    } catch {
      // Algunos navegadores lanzan InvalidStateError si start() se llama dos veces.
    }
  }, [])

  const speak = useCallback((text: string) => new Promise<void>((resolve) => {
    if (!window.speechSynthesis) {
      busyRef.current = false
      if (runningRef.current) window.setTimeout(startRecognition, 180)
      resolve()
      return
    }

    window.speechSynthesis.cancel()
    const clean = text.replace(/[*_#`]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'es-AR'
    utterance.rate = 1.02
    utterance.pitch = 1
    utterance.onstart = () => setState('speaking')
    utterance.onend = () => {
      busyRef.current = false
      if (runningRef.current) {
        setState('ready')
        window.setTimeout(startRecognition, 180)
      }
      resolve()
    }
    utterance.onerror = () => {
      busyRef.current = false
      if (runningRef.current) window.setTimeout(startRecognition, 180)
      resolve()
    }
    window.speechSynthesis.speak(utterance)
  }), [startRecognition])

  const askHugo = useCallback(async (userText: string) => {
    const puter = window.puter
    if (!puter?.ai?.chat) throw new Error('IA_NO_DISPONIBLE')

    busyRef.current = true
    setState('connecting')
    setError('')

    const roleText = roleRef.current === 'client'
      ? 'Estás hablando con un cliente que necesita resolver un servicio.'
      : 'Estás hablando con un proveedor que recibe y ejecuta misiones.'

    const system = [
      'Sos Hugo, el asistente operativo de U.G.O.',
      'Hablá en español rioplatense natural, con voseo, de forma breve y clara.',
      roleText,
      'No inventes estados, precios, personas, pagos ni acciones.',
      'Usá únicamente el contexto operativo que recibís.',
      'Si el usuario quiere aceptar, cancelar, aprobar, pagar o cambiar un estado, explicale qué acción visible debe usar; no digas que ya la ejecutaste.',
      `CONTEXTO ACTUAL: ${contextRef.current || 'Sin contexto adicional.'}`,
    ].join('\n')

    const messages = [
      { role: 'system', content: system },
      ...historyRef.current.slice(-6),
      { role: 'user', content: userText },
    ]

    const result = await puter.ai.chat(messages, {
      model: 'gemini-3.6-flash',
      temperature: 0.5,
      max_tokens: 220,
    })

    const reply = puterText(result)
    if (!reply) throw new Error('RESPUESTA_VACIA')

    historyRef.current = [
      ...historyRef.current.slice(-6),
      { role: 'user', content: userText },
      { role: 'assistant', content: reply },
    ]
    setAssistantTranscript(reply.slice(-900))
    await speak(reply)
  }, [speak])

  const disconnect = useCallback(() => {
    runningRef.current = false
    busyRef.current = false
    try { recognitionRef.current?.abort?.() } catch { /* noop */ }
    try { window.speechSynthesis?.cancel() } catch { /* noop */ }
    recognitionRef.current = null
    historyRef.current = []
    setState('idle')
    setError('')
    setUserTranscript('')
    setAssistantTranscript('')
  }, [])

  useEffect(() => disconnect, [disconnect])

  const connect = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return
    if (!accessToken) {
      setError('Iniciá sesión para hablar con Hugo.')
      setState('error')
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Este navegador no ofrece reconocimiento de voz. Probá Chrome, Edge o Safari actualizado.')
      setState('error')
      return
    }

    setState('connecting')
    setError('')
    setUserTranscript('')
    setAssistantTranscript('')
    runningRef.current = true
    historyRef.current = []

    const recognition = new SR()
    recognition.lang = 'es-AR'
    recognition.continuous = false
    recognition.interimResults = true
    recognitionRef.current = recognition

    recognition.onstart = () => {
      if (runningRef.current && !busyRef.current) setState('ready')
    }
    recognition.onspeechstart = () => {
      if (runningRef.current) setState('hearing')
    }
    recognition.onresult = async (event: any) => {
      let text = ''
      let isFinal = false
      for (let i = event.resultIndex || 0; i < event.results.length; i += 1) {
        const result = event.results[i]
        text += String(result?.[0]?.transcript || '')
        if (result?.isFinal) isFinal = true
      }
      text = text.trim()
      if (!text || !runningRef.current) return

      // Paso 1: voz -> texto. Esto funciona aunque la IA no haya cargado.
      setUserTranscript(text.slice(-900))
      if (!isFinal) return

      try {
        await askHugo(text)
      } catch (e) {
        busyRef.current = false
        const code = e instanceof Error ? e.message : ''
        if (code === 'IA_NO_DISPONIBLE') {
          setAssistantTranscript('Te escuché bien. La voz a texto funciona; la respuesta de IA todavía no está disponible.')
        } else {
          setAssistantTranscript('Te escuché bien, pero no pude generar la respuesta de Hugo en este intento.')
        }
        if (runningRef.current) {
          setState('ready')
          window.setTimeout(startRecognition, 250)
        }
      }
    }
    recognition.onerror = (event: any) => {
      if (!runningRef.current) return
      const code = String(event?.error || '')
      if (code === 'no-speech' || code === 'aborted') {
        window.setTimeout(startRecognition, 250)
        return
      }
      runningRef.current = false
      setError(code === 'not-allowed' ? 'Necesito permiso para usar el micrófono.' : 'Se interrumpió el reconocimiento de voz.')
      setState('error')
    }
    recognition.onend = () => {
      if (runningRef.current && !busyRef.current) window.setTimeout(startRecognition, 220)
    }

    setAssistantTranscript('Listo. Te escucho.')
    setState('ready')
    window.setTimeout(startRecognition, 120)
  }, [accessToken, askHugo, startRecognition, state])

  return {
    state,
    error,
    userTranscript,
    assistantTranscript,
    transcript: assistantTranscript,
    active: state !== 'idle' && state !== 'error',
    connect,
    disconnect,
  }
}
