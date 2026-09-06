import { useCallback, useEffect, useRef, useState } from 'react'

export type HugoVoiceState = 'idle' | 'connecting' | 'ready' | 'hearing' | 'speaking' | 'error'
type VoiceOptions = { role: 'client' | 'provider'; accessToken?: string; context: string }
type ChatTurn = { role: 'user' | 'assistant'; content: string }
type GeminiReply = { reply: string; action?: 'none'|'search_provider'|'prepare_request'; category_hint?: string|null; urgent?: boolean; description?: string|null; model?: string }
type NativeVoiceBridge={startListening:()=>void;stopListening:()=>void;isAvailable?:()=>boolean}
type VisibleCardReply={reply:string;categoryHint:string|null}

function sessionKey(role:string,token?:string){let uid='anon';try{const payload=JSON.parse(atob(String(token||'').split('.')[1]?.replace(/-/g,'+').replace(/_/g,'/')||''));uid=String(payload?.sub||'anon')}catch{}return `ugo:hugo:history:${role}:${uid}`}
function readHistory(key:string):ChatTurn[]{try{const raw=sessionStorage.getItem(key);const value=raw?JSON.parse(raw):[];return Array.isArray(value)?value.slice(-12):[]}catch{return[]}}
function writeHistory(key:string,history:ChatTurn[]){try{sessionStorage.setItem(key,JSON.stringify(history.slice(-12)))}catch{}}
function getNativeBridge(){return (window as any).UGOVoiceBridge as NativeVoiceBridge|undefined}
async function ensureMicrophoneAccess(){if(!navigator.mediaDevices?.getUserMedia)return;const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop())}
function normalizeText(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function requestedCategory(text:string){const m=normalizeText(text);if(/\b(jardinero|jardinera|jardineria|jardin)\b/.test(m))return'jardineria';if(/\b(electricista|electricidad|electrico|electrica)\b/.test(m))return'electricidad';if(/\b(plomero|plomera|plomeria|fontanero|fontaneria)\b/.test(m))return'plomeria';if(/\b(limpieza|limpiador|limpiadora|faxina)\b/.test(m))return'limpieza';if(/\b(pintor|pintora|pintura)\b/.test(m))return'pintura';if(/\b(cerrajero|cerrajeria)\b/.test(m))return'cerrajeria';return null}
function visibleProviderCardReply(userText:string):VisibleCardReply|null{
 const m=normalizeText(userText),category=requestedCategory(userText),lookup=/\b(busca|buscame|buscar|hay|encontra|encontrame|cerca|disponible|quien|quienes|perfil|contame|hablame|mostrame|lee|leeme)\b/.test(m)
 if(!category&&!lookup)return null
 const nodes=Array.from(document.querySelectorAll<HTMLElement>('.ugo-feature-card,.ugo-provider-card'))
 const seen=new Set<string>(),cards=nodes.map(node=>String(node.innerText||node.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean).filter(text=>{const key=normalizeText(text);if(seen.has(key))return false;seen.add(key);return true})
 if(!cards.length)return null
 let matches=cards.filter(text=>!category||normalizeText(text).includes(category))
 const named=cards.filter(text=>{const first=normalizeText(text).split(' ')[0];return first.length>2&&m.includes(first)})
 if(named.length)matches=named
 if(!matches.length)return null
 matches=matches.slice(0,3)
 const intro=matches.length===1?'Sí. La tarjeta que veo en pantalla dice:':'Sí. Las tarjetas que veo en pantalla dicen:'
 return{reply:`${intro} ${matches.join('. ')}. ¿Querés que te cuente más o elegir uno?`,categoryHint:category}
}

export function useHugoVoice({ role, accessToken, context }: VoiceOptions) {
 const[state,setState]=useState<HugoVoiceState>('idle'),[error,setError]=useState(''),[userTranscript,setUserTranscript]=useState(''),[assistantTranscript,setAssistantTranscript]=useState('')
 const recognitionRef=useRef<any>(null),nativeModeRef=useRef(false),runningRef=useRef(false),busyRef=useRef(false),historyRef=useRef<ChatTurn[]>([]),roleRef=useRef(role),contextRef=useRef(context),tokenRef=useRef(accessToken),historyKeyRef=useRef(sessionKey(role,accessToken))
 useEffect(()=>{roleRef.current=role},[role]);useEffect(()=>{contextRef.current=context},[context]);useEffect(()=>{tokenRef.current=accessToken},[accessToken]);useEffect(()=>{historyKeyRef.current=sessionKey(role,accessToken);historyRef.current=readHistory(historyKeyRef.current)},[role,accessToken])

 const startRecognition=useCallback(()=>{if(!runningRef.current||busyRef.current)return;if(nativeModeRef.current){try{getNativeBridge()?.startListening();setState('ready')}catch{}return}if(!recognitionRef.current)return;try{recognitionRef.current.start();setState('ready')}catch{}},[])
 const speak=useCallback((text:string)=>new Promise<void>(resolve=>{if(!window.speechSynthesis){busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,100);resolve();return}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/[*_#`]/g,'').trim());u.lang='es-AR';u.rate=1.08;u.pitch=1;u.onstart=()=>setState('speaking');u.onend=()=>{busyRef.current=false;if(runningRef.current){setState('ready');window.setTimeout(startRecognition,120)}resolve()};u.onerror=()=>{busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,120);resolve()};window.speechSynthesis.speak(u)}),[startRecognition])

 const askHugo=useCallback(async(userText:string)=>{const token=tokenRef.current;if(!token)throw new Error('SESION_REQUERIDA');busyRef.current=true;setState('connecting');setError('');if(roleRef.current==='client')window.dispatchEvent(new CustomEvent('ugo:hugo-user-text',{detail:{text:userText}}));
  if(roleRef.current==='client'){
   await new Promise(resolve=>window.setTimeout(resolve,120))
   const visible=visibleProviderCardReply(userText)
   if(visible){const reply=visible.reply;const next=[...historyRef.current,{role:'user',content:userText},{role:'assistant',content:reply}] as ChatTurn[];historyRef.current=next.slice(-12);writeHistory(historyKeyRef.current,historyRef.current);window.dispatchEvent(new CustomEvent('ugo:hugo-ai-intent',{detail:{text:userText,action:'search_provider',categoryHint:visible.categoryHint,urgent:false,description:null}}));setAssistantTranscript(reply.slice(-500));await speak(reply);return}
  }
  const response=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({message:userText,role:roleRef.current,context:contextRef.current,history:historyRef.current.slice(-10)})});const data=await response.json().catch(()=>({})) as GeminiReply&{error?:string};if(!response.ok)throw new Error(data.error||`Hugo respondió ${response.status}`);const reply=String(data.reply||'').trim();if(!reply)throw new Error('RESPUESTA_VACIA');const next=[...historyRef.current,{role:'user',content:userText},{role:'assistant',content:reply}] as ChatTurn[];historyRef.current=next.slice(-12);writeHistory(historyKeyRef.current,historyRef.current);if(roleRef.current==='client')window.dispatchEvent(new CustomEvent('ugo:hugo-ai-intent',{detail:{text:userText,action:data.action||'none',categoryHint:data.category_hint||null,urgent:Boolean(data.urgent),description:data.description||null}}));setAssistantTranscript(reply.slice(-500));await speak(reply)},[speak])

 useEffect(()=>{const onState=(event:Event)=>{if(!runningRef.current)return;const s=String((event as CustomEvent<any>).detail?.state||'');if(s==='hearing')setState('hearing');else if(s==='ready')setState('ready')};const onResult=async(event:Event)=>{if(!runningRef.current)return;const d=(event as CustomEvent<any>).detail||{},text=String(d.text||'').trim();if(!text)return;setUserTranscript(text.slice(-900));if(!d.final)return;try{await askHugo(text)}catch{busyRef.current=false;setAssistantTranscript('Te escuché bien. Hugo está reintentando la respuesta.');if(runningRef.current)window.setTimeout(startRecognition,180)}};const onError=(event:Event)=>{if(!runningRef.current)return;const code=String((event as CustomEvent<any>).detail?.code||'');if(code==='no-speech'){window.setTimeout(startRecognition,180);return}runningRef.current=false;setError(code==='not-allowed'?'Habilitá el micrófono de UGO en Android para hablar con Hugo.':code==='unavailable'?'El reconocimiento de voz de Android no está disponible en este dispositivo.':'No pude iniciar el reconocimiento de voz.');setState('error')};window.addEventListener('ugo:native-voice-state',onState);window.addEventListener('ugo:native-voice-result',onResult);window.addEventListener('ugo:native-voice-error',onError);return()=>{window.removeEventListener('ugo:native-voice-state',onState);window.removeEventListener('ugo:native-voice-result',onResult);window.removeEventListener('ugo:native-voice-error',onError)}},[askHugo,startRecognition])

 const disconnect=useCallback(()=>{runningRef.current=false;busyRef.current=false;try{recognitionRef.current?.abort?.()}catch{}try{getNativeBridge()?.stopListening()}catch{}try{window.speechSynthesis?.cancel()}catch{}recognitionRef.current=null;nativeModeRef.current=false;setState('idle');setError('');setUserTranscript('');setAssistantTranscript('')},[])
 useEffect(()=>disconnect,[disconnect])

 const connect=useCallback(async()=>{if(state!=='idle'&&state!=='error')return;if(!accessToken){setError('Iniciá sesión para hablar con Hugo.');setState('error');return}setState('connecting');setError('');setUserTranscript('');setAssistantTranscript('');historyRef.current=readHistory(historyKeyRef.current)
   const native=getNativeBridge();if(native){nativeModeRef.current=true;runningRef.current=true;setAssistantTranscript(historyRef.current.length?'Seguimos donde quedamos. Te escucho.':'Listo. Te escucho.');try{native.startListening();return}catch{runningRef.current=false;nativeModeRef.current=false;setState('error');setError('No pude abrir el reconocimiento de voz nativo de Android.');return}}
   nativeModeRef.current=false;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setError('Este dispositivo no ofrece reconocimiento de voz compatible.');setState('error');return}
   try{await ensureMicrophoneAccess()}catch(e:any){const denied=e?.name==='NotAllowedError'||e?.name==='PermissionDeniedError';setError(denied?'Permití el micrófono en UGO para hablar con Hugo.':'No pude abrir el micrófono. Revisá los permisos de la app.');setState('error');return}
   runningRef.current=true;const recognition=new SR();recognition.lang='es-AR';recognition.continuous=false;recognition.interimResults=true;recognitionRef.current=recognition;recognition.onstart=()=>{if(runningRef.current&&!busyRef.current)setState('ready')};recognition.onspeechstart=()=>{if(runningRef.current)setState('hearing')};recognition.onresult=async(event:any)=>{let text='',isFinal=false;for(let i=event.resultIndex||0;i<event.results.length;i++){const result=event.results[i];text+=String(result?.[0]?.transcript||'');if(result?.isFinal)isFinal=true}text=text.trim();if(!text||!runningRef.current)return;setUserTranscript(text.slice(-900));if(!isFinal)return;try{await askHugo(text)}catch{busyRef.current=false;if(runningRef.current)window.setTimeout(startRecognition,180)}};recognition.onerror=(event:any)=>{if(!runningRef.current)return;const code=String(event?.error||'');if(code==='no-speech'||code==='aborted'){window.setTimeout(startRecognition,180);return}runningRef.current=false;setError(code==='not-allowed'?'Permití el micrófono en UGO para hablar con Hugo.':'Se interrumpió el reconocimiento de voz.');setState('error')};recognition.onend=()=>{if(runningRef.current&&!busyRef.current)window.setTimeout(startRecognition,120)};setAssistantTranscript(historyRef.current.length?'Seguimos donde quedamos. Te escucho.':'Listo. Te escucho.');setState('ready');window.setTimeout(startRecognition,80)
 },[accessToken,askHugo,startRecognition,state])

 return{state,error,userTranscript,assistantTranscript,transcript:assistantTranscript,active:state!=='idle'&&state!=='error',connect,disconnect}
}
