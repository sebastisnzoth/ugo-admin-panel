import { useCallback, useEffect, useRef, useState } from 'react'

export type HugoVoiceState = 'idle' | 'connecting' | 'ready' | 'hearing' | 'speaking' | 'error'

type VoiceOptions = { role: 'client' | 'provider'; accessToken?: string; context: string }
type ChatTurn = { role: 'user' | 'assistant'; content: string }
type GeminiReply = { reply: string; action?: 'none'|'search_provider'|'prepare_request'; category_hint?: string|null; urgent?: boolean; description?: string|null; model?: string }

export function useHugoVoice({ role, accessToken, context }: VoiceOptions) {
  const [state,setState]=useState<HugoVoiceState>('idle'),[error,setError]=useState(''),[userTranscript,setUserTranscript]=useState(''),[assistantTranscript,setAssistantTranscript]=useState('')
  const recognitionRef=useRef<any>(null),runningRef=useRef(false),busyRef=useRef(false),historyRef=useRef<ChatTurn[]>([]),roleRef=useRef(role),contextRef=useRef(context),tokenRef=useRef(accessToken)
  useEffect(()=>{roleRef.current=role},[role]);useEffect(()=>{contextRef.current=context},[context]);useEffect(()=>{tokenRef.current=accessToken},[accessToken])

  const startRecognition=useCallback(()=>{if(!runningRef.current||busyRef.current||!recognitionRef.current)return;try{recognitionRef.current.start();setState('ready')}catch{}},[])
  const speak=useCallback((text:string)=>new Promise<void>(resolve=>{if(!window.speechSynthesis){busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,80);resolve();return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/[*_#`]/g,'').trim());u.lang='es-AR';u.rate=1.08;u.pitch=1;u.onstart=()=>setState('speaking');u.onend=()=>{busyRef.current=false;if(runningRef.current){setState('ready');window.setTimeout(startRecognition,80)}resolve()};u.onerror=()=>{busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,80);resolve()};window.speechSynthesis.speak(u)}),[startRecognition])

  const askHugo=useCallback(async(userText:string)=>{const token=tokenRef.current;if(!token)throw new Error('SESION_REQUERIDA');busyRef.current=true;setState('connecting');setError('')
    if(roleRef.current==='client') window.dispatchEvent(new CustomEvent('ugo:hugo-user-text',{detail:{text:userText}}))
    const response=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({message:userText,role:roleRef.current,context:contextRef.current,history:historyRef.current.slice(-2)})})
    const data=await response.json().catch(()=>({})) as GeminiReply&{error?:string};if(!response.ok)throw new Error(data.error||`Gemini respondió ${response.status}`);const reply=String(data.reply||'').trim();if(!reply)throw new Error('RESPUESTA_VACIA')
    historyRef.current=[...historyRef.current.slice(-2),{role:'user',content:userText},{role:'assistant',content:reply}]
    if(roleRef.current==='client')window.dispatchEvent(new CustomEvent('ugo:hugo-ai-intent',{detail:{text:userText,action:data.action||'none',categoryHint:data.category_hint||null,urgent:Boolean(data.urgent),description:data.description||userText}}))
    setAssistantTranscript(reply.slice(-500));await speak(reply)
  },[speak])

  const disconnect=useCallback(()=>{runningRef.current=false;busyRef.current=false;try{recognitionRef.current?.abort?.()}catch{}try{window.speechSynthesis?.cancel()}catch{}recognitionRef.current=null;historyRef.current=[];setState('idle');setError('');setUserTranscript('');setAssistantTranscript('')},[])
  useEffect(()=>disconnect,[disconnect])

  const connect=useCallback(async()=>{if(state!=='idle'&&state!=='error')return;if(!accessToken){setError('Iniciá sesión para hablar con Hugo.');setState('error');return}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setError('Este navegador no ofrece reconocimiento de voz. Probá Chrome, Edge o Safari actualizado.');setState('error');return}
    setState('connecting');setError('');setUserTranscript('');setAssistantTranscript('');runningRef.current=true;historyRef.current=[];const recognition=new SR();recognition.lang='es-AR';recognition.continuous=false;recognition.interimResults=true;recognitionRef.current=recognition
    recognition.onstart=()=>{if(runningRef.current&&!busyRef.current)setState('ready')};recognition.onspeechstart=()=>{if(runningRef.current)setState('hearing')};recognition.onresult=async(event:any)=>{let text='',isFinal=false;for(let i=event.resultIndex||0;i<event.results.length;i++){const result=event.results[i];text+=String(result?.[0]?.transcript||'');if(result?.isFinal)isFinal=true}text=text.trim();if(!text||!runningRef.current)return;setUserTranscript(text.slice(-900));if(!isFinal)return;try{await askHugo(text)}catch(e){busyRef.current=false;const message=e instanceof Error?e.message:'No se pudo consultar a Gemini.';setAssistantTranscript(`Te escuché bien. Estoy usando el modo local mientras Gemini se recupera.`);if(runningRef.current){setState('ready');window.setTimeout(startRecognition,120)}console.warn('Hugo Gemini fallback',message)}}
    recognition.onerror=(event:any)=>{if(!runningRef.current)return;const code=String(event?.error||'');if(code==='no-speech'||code==='aborted'){window.setTimeout(startRecognition,120);return}runningRef.current=false;setError(code==='not-allowed'?'Necesito permiso para usar el micrófono.':'Se interrumpió el reconocimiento de voz.');setState('error')};recognition.onend=()=>{if(runningRef.current&&!busyRef.current)window.setTimeout(startRecognition,100)}
    setAssistantTranscript('Listo. Te escucho.');setState('ready');window.setTimeout(startRecognition,60)
  },[accessToken,askHugo,startRecognition,state])

  return{state,error,userTranscript,assistantTranscript,transcript:assistantTranscript,active:state!=='idle'&&state!=='error',connect,disconnect}
}
