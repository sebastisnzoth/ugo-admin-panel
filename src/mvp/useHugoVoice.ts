import { useCallback, useEffect, useRef, useState } from 'react'

export type HugoVoiceState = 'idle' | 'connecting' | 'ready' | 'hearing' | 'speaking' | 'error'
type VoiceOptions = { role: 'client' | 'provider'; accessToken?: string; context: string }
type ChatTurn = { role: 'user' | 'assistant'; content: string }
type GeminiReply = { reply: string; action?: 'none'|'search_provider'|'prepare_request'; category_hint?: string|null; urgent?: boolean; description?: string|null; model?: string }
type NativeVoiceBridge={startListening:()=>void;stopListening:()=>void;isAvailable?:()=>boolean}
type VisibleCardReply={reply:string;categoryHint:string|null;selectedText?:string|null}

const CLIENT_BEHAVIOR=[
 'Sos Hugo, asistente operativo de UGO Cliente, no un chatbot genérico.',
 'Hablá natural, cálido y directo, en español rioplatense/neutral.',
 'Respondé normalmente en 1 o 2 frases cortas, fáciles de escuchar.',
 'Preguntá solamente el dato imprescindible que falta; no repitas datos ya conocidos.',
 'Usá el historial para entender sí, dale, ese, el primero, el segundo y correcciones del usuario.',
 'Si cambia de tema, seguí el tema nuevo sin perder el estado operativo.',
 'Nunca inventes proveedor, precio, reputación, ETA, pago, evidencia ni estado.',
 'La app y sus datos reales son la fuente de verdad.',
 'Buscar, filtrar, leer perfiles y mostrar estado no requieren confirmación.',
 'Contratar, pagar, cancelar, liberar pago o abrir disputa requieren confirmación explícita antes de ejecutar.',
 'No uses lenguaje técnico de backend, APIs, RPC, RLS, webhooks, sandbox o infraestructura.',
 'No termines con una pregunta si el siguiente paso ya está claro.',
].join(' ')

function sessionKey(role:string,token?:string){let uid='anon';try{const payload=JSON.parse(atob(String(token||'').split('.')[1]?.replace(/-/g,'+').replace(/_/g,'/')||''));uid=String(payload?.sub||'anon')}catch{}return `ugo:hugo:history:${role}:${uid}`}
function readHistory(key:string):ChatTurn[]{try{const raw=sessionStorage.getItem(key);const value=raw?JSON.parse(raw):[];return Array.isArray(value)?value.slice(-20):[]}catch{return[]}}
function writeHistory(key:string,history:ChatTurn[]){try{sessionStorage.setItem(key,JSON.stringify(history.slice(-20)))}catch{}}
function getNativeBridge(){return (window as any).UGOVoiceBridge as NativeVoiceBridge|undefined}
async function ensureMicrophoneAccess(){if(!navigator.mediaDevices?.getUserMedia)return;const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop())}
function normalizeText(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function requestedCategory(text:string){const m=normalizeText(text);if(/\b(jardinero|jardinera|jardineria|jardin)\b/.test(m))return'jardineria';if(/\b(electricista|electricidad|electrico|electrica)\b/.test(m))return'electricidad';if(/\b(plomero|plomera|plomeria|fontanero|fontaneria)\b/.test(m))return'plomeria';if(/\b(limpieza|limpiador|limpiadora|faxina)\b/.test(m))return'limpieza';if(/\b(pintor|pintora|pintura)\b/.test(m))return'pintura';if(/\b(cerrajero|cerrajeria)\b/.test(m))return'cerrajeria';return null}
function ordinalIndex(text:string){const m=normalizeText(text);if(/\b(primero|primera|1|uno)\b/.test(m))return 0;if(/\b(segundo|segunda|2|dos)\b/.test(m))return 1;if(/\b(tercero|tercera|3|tres)\b/.test(m))return 2;return null}
function isShortReference(text:string){const m=normalizeText(text);return /^(ese|esa|ese mismo|esa misma|el primero|la primera|el segundo|la segunda|el tercero|la tercera|primero|segundo|tercero)$/.test(m)}
function compactSpeech(text:string,max=320){const cleaned=String(text||'').replace(/[*_#`]/g,'').replace(/\s+/g,' ').trim();if(cleaned.length<=max)return cleaned;const cut=cleaned.slice(0,max);const end=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('? '),cut.lastIndexOf('! '));return (end>120?cut.slice(0,end+1):cut).trim()}
function providerCards(){const nodes=Array.from(document.querySelectorAll<HTMLElement>('.ugo-feature-card,.ugo-provider-card'));const seen=new Set<string>();return nodes.map(node=>String(node.innerText||node.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean).filter(text=>{const key=normalizeText(text);if(seen.has(key))return false;seen.add(key);return true})}
function visibleProviderCardReply(userText:string):VisibleCardReply|null{
 const m=normalizeText(userText),category=requestedCategory(userText),ordinal=ordinalIndex(userText),lookup=/\b(busca|buscame|buscar|hay|encontra|encontrame|cerca|disponible|quien|quienes|perfil|contame|hablame|mostrame|lee|leeme)\b/.test(m)||isShortReference(userText)
 if(!category&&!lookup&&ordinal==null)return null
 const cards=providerCards();if(!cards.length)return null
 if(ordinal!=null&&cards[ordinal]){const selected=cards[ordinal];return{reply:`Este es el ${ordinal===0?'primero':ordinal===1?'segundo':'tercero'}: ${selected}.`,categoryHint:category,selectedText:selected}}
 let matches=cards.filter(text=>!category||normalizeText(text).includes(category))
 const named=cards.filter(text=>{const first=normalizeText(text).split(' ')[0];return first.length>2&&m.includes(first)})
 if(named.length)matches=named
 if(!matches.length)return null
 matches=matches.slice(0,3)
 if(matches.length===1)return{reply:`Encontré este profesional: ${matches[0]}.`,categoryHint:category,selectedText:matches[0]}
 return{reply:`Encontré ${matches.length} opciones. Te muestro las mejores.`,categoryHint:category}
}

export function useHugoVoice({ role, accessToken, context }: VoiceOptions) {
 const[state,setState]=useState<HugoVoiceState>('idle'),[error,setError]=useState(''),[userTranscript,setUserTranscript]=useState(''),[assistantTranscript,setAssistantTranscript]=useState('')
 const recognitionRef=useRef<any>(null),nativeModeRef=useRef(false),runningRef=useRef(false),busyRef=useRef(false),historyRef=useRef<ChatTurn[]>([]),roleRef=useRef(role),contextRef=useRef(context),tokenRef=useRef(accessToken),historyKeyRef=useRef(sessionKey(role,accessToken)),lastCategoryRef=useRef<string|null>(null),lastUserTextRef=useRef('')
 useEffect(()=>{roleRef.current=role},[role]);useEffect(()=>{contextRef.current=context},[context]);useEffect(()=>{tokenRef.current=accessToken},[accessToken]);useEffect(()=>{historyKeyRef.current=sessionKey(role,accessToken);historyRef.current=readHistory(historyKeyRef.current)},[role,accessToken])

 const startRecognition=useCallback(()=>{if(!runningRef.current||busyRef.current)return;if(nativeModeRef.current){try{getNativeBridge()?.startListening();setState('ready')}catch{}return}if(!recognitionRef.current)return;try{recognitionRef.current.start();setState('ready')}catch{}},[])
 const speak=useCallback((text:string)=>new Promise<void>(resolve=>{const spoken=compactSpeech(text);if(!window.speechSynthesis){busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,80);resolve();return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(spoken);u.lang='es-AR';u.rate=1.1;u.pitch=1;u.onstart=()=>setState('speaking');u.onend=()=>{busyRef.current=false;if(runningRef.current){setState('ready');window.setTimeout(startRecognition,80)}resolve()};u.onerror=()=>{busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,100);resolve()};window.speechSynthesis.speak(u)}),[startRecognition])

 const remember=useCallback((userText:string,reply:string)=>{const next=[...historyRef.current,{role:'user',content:userText},{role:'assistant',content:reply}] as ChatTurn[];historyRef.current=next.slice(-20);writeHistory(historyKeyRef.current,historyRef.current)},[])

 const askHugo=useCallback(async(userText:string)=>{const token=tokenRef.current;if(!token)throw new Error('SESION_REQUERIDA');busyRef.current=true;setState('connecting');setError('');lastUserTextRef.current=userText;if(roleRef.current==='client')window.dispatchEvent(new CustomEvent('ugo:hugo-user-text',{detail:{text:userText}}));
  if(roleRef.current==='client'){
   await new Promise(resolve=>window.setTimeout(resolve,80))
   const category=requestedCategory(userText);if(category)lastCategoryRef.current=category
   const visible=visibleProviderCardReply(userText)
   if(visible){const reply=compactSpeech(visible.reply);remember(userText,reply);window.dispatchEvent(new CustomEvent('ugo:hugo-ai-intent',{detail:{text:userText,action:'search_provider',categoryHint:visible.categoryHint||lastCategoryRef.current,urgent:false,description:null,selectedText:visible.selectedText||null}}));setAssistantTranscript(reply);await speak(reply);return}
  }
  const mergedContext=roleRef.current==='client'?`${CLIENT_BEHAVIOR} CONTEXTO OPERATIVO REAL: ${contextRef.current}`:contextRef.current
  const response=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({message:userText,role:roleRef.current,context:mergedContext,history:historyRef.current.slice(-16)})});const data=await response.json().catch(()=>({})) as GeminiReply&{error?:string};if(!response.ok)throw new Error(data.error||`Hugo respondió ${response.status}`);const raw=String(data.reply||'').trim();if(!raw)throw new Error('RESPUESTA_VACIA');const reply=roleRef.current==='client'?compactSpeech(raw):raw;remember(userText,reply);if(roleRef.current==='client'){if(data.category_hint)lastCategoryRef.current=data.category_hint;window.dispatchEvent(new CustomEvent('ugo:hugo-ai-intent',{detail:{text:userText,action:data.action||'none',categoryHint:data.category_hint||lastCategoryRef.current,urgent:Boolean(data.urgent),description:data.description||null}}))}setAssistantTranscript(reply.slice(-500));await speak(reply)},[remember,speak])

 useEffect(()=>{const onState=(event:Event)=>{if(!runningRef.current)return;const s=String((event as CustomEvent<any>).detail?.state||'');if(s==='hearing'){try{window.speechSynthesis?.cancel()}catch{};busyRef.current=false;setState('hearing')}else if(s==='ready')setState('ready')};const onResult=async(event:Event)=>{if(!runningRef.current)return;const d=(event as CustomEvent<any>).detail||{},text=String(d.text||'').trim();if(!text)return;setUserTranscript(text.slice(-900));if(!d.final)return;try{await askHugo(text)}catch{busyRef.current=false;const fallback='No pude responder ahora, pero tu pedido sigue intacto.';setAssistantTranscript(fallback);if(runningRef.current)window.setTimeout(startRecognition,160)}};const onError=(event:Event)=>{if(!runningRef.current)return;const code=String((event as CustomEvent<any>).detail?.code||'');if(code==='no-speech'){window.setTimeout(startRecognition,160);return}runningRef.current=false;setError(code==='not-allowed'?'Habilitá el micrófono para hablar con Hugo.':code==='unavailable'?'El reconocimiento de voz no está disponible en este dispositivo.':'No pude iniciar el reconocimiento de voz.');setState('error')};window.addEventListener('ugo:native-voice-state',onState);window.addEventListener('ugo:native-voice-result',onResult);window.addEventListener('ugo:native-voice-error',onError);return()=>{window.removeEventListener('ugo:native-voice-state',onState);window.removeEventListener('ugo:native-voice-result',onResult);window.removeEventListener('ugo:native-voice-error',onError)}},[askHugo,startRecognition])

 const disconnect=useCallback(()=>{runningRef.current=false;busyRef.current=false;try{recognitionRef.current?.abort?.()}catch{}try{getNativeBridge()?.stopListening()}catch{}try{window.speechSynthesis?.cancel()}catch{}recognitionRef.current=null;nativeModeRef.current=false;setState('idle');setError('');setUserTranscript('');setAssistantTranscript('')},[])
 useEffect(()=>disconnect,[disconnect])

 const connect=useCallback(async()=>{if(state!=='idle'&&state!=='error')return;if(!accessToken){setError('Iniciá sesión para hablar con Hugo.');setState('error');return}setState('connecting');setError('');setUserTranscript('');setAssistantTranscript('');historyRef.current=readHistory(historyKeyRef.current)
   const welcome=historyRef.current.length?'Seguimos donde quedamos. Te escucho.':'Te escucho.'
   const native=getNativeBridge();if(native){nativeModeRef.current=true;runningRef.current=true;setAssistantTranscript(welcome);try{native.startListening();return}catch{runningRef.current=false;nativeModeRef.current=false;setState('error');setError('No pude abrir el reconocimiento de voz nativo.');return}}
   nativeModeRef.current=false;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setError('Este dispositivo no ofrece reconocimiento de voz compatible.');setState('error');return}
   try{await ensureMicrophoneAccess()}catch(e:any){const denied=e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError';setError(denied?'Permití el micrófono para hablar con Hugo.':'No pude abrir el micrófono. Revisá los permisos.');setState('error');return}
   runningRef.current=true;const recognition=new SR();recognition.lang='es-AR';recognition.continuous=false;recognition.interimResults=true;recognitionRef.current=recognition;recognition.onstart=()=>{if(runningRef.current&&!busyRef.current)setState('ready')};recognition.onspeechstart=()=>{if(runningRef.current){try{window.speechSynthesis?.cancel()}catch{};busyRef.current=false;setState('hearing')}};recognition.onresult=async(event:any)=>{let text='',isFinal=false;for(let i=event.resultIndex||0;i<event.results.length;i++){const result=event.results[i];text+=String(result?.[0]?.transcript||'');if(result?.isFinal)isFinal=true}text=text.trim();if(!text||!runningRef.current)return;setUserTranscript(text.slice(-900));if(!isFinal)return;try{await askHugo(text)}catch{busyRef.current=false;const fallback='No pude responder ahora, pero tu pedido sigue intacto.';setAssistantTranscript(fallback);if(runningRef.current)window.setTimeout(startRecognition,160)}};recognition.onerror=(event:any)=>{if(!runningRef.current)return;const code=String(event?.error||'');if(code==='no-speech'||code==='aborted'){window.setTimeout(startRecognition,160);return}runningRef.current=false;setError(code==='not-allowed'?'Permití el micrófono para hablar con Hugo.':'Se interrumpió el reconocimiento de voz.');setState('error')};recognition.onend=()=>{if(runningRef.current&&!busyRef.current)window.setTimeout(startRecognition,90)};setAssistantTranscript(welcome);setState('ready');window.setTimeout(startRecognition,60)
 },[accessToken,askHugo,startRecognition,state])

 return{state,error,userTranscript,assistantTranscript,transcript:assistantTranscript,active:state!=='idle'&&state!=='error',connect,disconnect}
}
