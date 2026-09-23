import React,{useCallback,useEffect,useMemo,useRef,useState}from'react'
import{detectProviderVoiceLocale,findProviderVoiceOpportunity,providerVoiceContext,providerVoiceSummary,type ProviderHugoLocale as Locale}from'../../features/provider/voice/providerVoiceHelpers'
import{runProviderVoiceCommand}from'../../features/provider/voice/providerVoiceCommands'
import{useProviderFlow}from'./providerFlow'
import{useProviderData}from'./providerData'
import'../voice.css'

type VoiceState='idle'|'connecting'|'ready'|'hearing'|'speaking'|'error'
type SpeechRecognitionAlternativeLike={transcript?:string}
type SpeechRecognitionResultLike={0?:SpeechRecognitionAlternativeLike;isFinal?:boolean}
type SpeechRecognitionEventLike={resultIndex?:number;results:ArrayLike<SpeechRecognitionResultLike>}
type SpeechRecognitionErrorEventLike={error?:string}
type SpeechRecognitionLike={lang:string;continuous:boolean;interimResults:boolean;onstart:(()=>void)|null;onspeechstart:(()=>void)|null;onresult:((event:SpeechRecognitionEventLike)=>void)|null;onerror:((event:SpeechRecognitionErrorEventLike)=>void)|null;onend:(()=>void)|null;start:()=>void;abort:()=>void}
type SpeechRecognitionConstructor=new()=>SpeechRecognitionLike
type NativeBridge={startListening:()=>void|Promise<void>;stopListening:()=>void;isAvailable?:()=>boolean;stopSpeaking?:()=>void;sendToolResponse?:(id:string,name:string,response:Record<string,unknown>)=>boolean}
type UgoWindow=Window&typeof globalThis&{UGOVoiceBridge?:NativeBridge;SpeechRecognition?:SpeechRecognitionConstructor;webkitSpeechRecognition?:SpeechRecognitionConstructor;webkitAudioContext?:typeof AudioContext}
type TtsReply={audio_base64?:string;sample_rate?:number;error?:string;hugo_mensaje?:string}
type CompanionReply={reply?:string;model?:string;error?:string}
type StatusError=Error&{status?:number}

const LABELS:Record<VoiceState,string>={idle:'Toca para hablar',connecting:'Procesando...',ready:'Te escucho',hearing:'Escuchando...',speaking:'Hablando...',error:'Voz no disponible'}
const ugoWindow=()=>window as UgoWindow
const ignoreError=(value:unknown)=>{void value}
const errorStatus=(value:unknown)=>typeof value==='object'&&value!==null&&'status'in value?Number((value as{status?:unknown}).status||0):0

export function ProviderHugoBridge(){
 const flow=useProviderFlow(),data=useProviderData()
 const[state,setState]=useState<VoiceState>('idle'),[error,setError]=useState(''),[userTranscript,setUserTranscript]=useState(''),[assistantTranscript,setAssistantTranscript]=useState(''),[voiceRunning,setVoiceRunning]=useState(false),[panelOpen,setPanelOpen]=useState(false)
 const locale=useRef<Locale>('es-AR'),running=useRef(false),busy=useRef(false),native=useRef(false),voicePaused=useRef(false),recognition=useRef<SpeechRecognitionLike|null>(null),ttsAbort=useRef<AbortController|null>(null),ttsSequence=useRef(0),ttsCooldownUntil=useRef(0),audioContext=useRef<AudioContext|null>(null),audioSource=useRef<AudioBufferSourceNode|null>(null),conversation=useRef<Array<{role:'user'|'assistant';content:string}>>([])

 const summary=useMemo(()=>providerVoiceSummary(data),[data.online,data.opportunities.length,data.service])

 const setRunning=useCallback((value:boolean)=>{running.current=value;setVoiceRunning(value)},[])
 const stopSpeech=useCallback(()=>{try{ugoWindow().UGOVoiceBridge?.stopSpeaking?.()}catch(caught){ignoreError(caught)}},[])


 const context=useCallback(()=>providerVoiceContext(data,flow.screen),[data.cashReceived,data.online,data.opportunities,data.released,data.service,data.ugoDebt,flow.screen])

 const findOpportunity=useCallback((source:string)=>findProviderVoiceOpportunity(source,data.opportunities),[data.opportunities])

 const localCommand=useCallback((source:string)=>runProviderVoiceCommand({source,locale:locale.current,summary,flow:flow.actions,data,findOpportunity,speak}),[data,findOpportunity,flow.actions,speak,summary])

 const handleText=useCallback(async(source:string)=>{const clean=source.trim();if(!clean)return;setUserTranscript(clean);locale.current=detectProviderVoiceLocale(clean)},[])

 const executeTool=useCallback(async(name:string,args:Record<string,unknown>)=>{
  if(name==='provider_set_online'){if(!data.online)await data.toggleOnline();return{ok:true,data:{online:true}}}
  if(name==='provider_set_offline'){if(data.online)await data.toggleOnline();return{ok:true,data:{online:false}}}
  if(name==='provider_list_opportunities')return{ok:true,data:{opportunities:data.opportunities.map(item=>({id:item.id,category:item.categoria?.nombre||item.categoria_nombre||'Servicio',status:item.estado||'ofrecido'}))}}
  if(name==='provider_accept_job'){const serviceId=String(args.service_id||'');const item=data.opportunities.find(item=>String(item.id)===serviceId);if(!item)return{ok:false,code:'SERVICE_NOT_FOUND',message:'No encontré esa oportunidad'};const ok=await flow.actions.acceptOpportunity(item.id);return ok?{ok:true,data:{serviceId}}:{ok:false,code:'ACCEPT_FAILED',message:'UGO no permitió aceptar ese trabajo'}}
  if(name==='provider_reject_job'){const serviceId=String(args.service_id||'');const item=data.opportunities.find(item=>String(item.id)===serviceId);if(!item)return{ok:false,code:'SERVICE_NOT_FOUND',message:'No encontré esa oportunidad'};const ok=await flow.actions.rejectOpportunity(item.id);return ok?{ok:true,data:{serviceId}}:{ok:false,code:'REJECT_FAILED',message:'UGO no permitió rechazar ese trabajo'}}
  if(name==='provider_update_service_status'){const serviceId=String(args.service_id||''),status=String(args.status||'');if(!data.service||String(data.service.id)!==serviceId)return{ok:false,code:'SERVICE_NOT_FOUND',message:'Ese no es el servicio activo'};const allowed:Record<string,string[]>= {asignado:['en_camino'],en_camino:['llegado'],llegado:[],en_progreso:[]};if(!(allowed[String(data.service.estado)]||[]).includes(status))return{ok:false,code:'INVALID_TRANSITION',message:'Ese cambio de estado no está permitido por el flujo actual'};const ok=await data.advance(status);return ok?{ok:true,data:{serviceId,status}}:{ok:false,code:'STATUS_FAILED',message:'UGO no pudo actualizar el estado'}}
  return{ok:false,code:'UNKNOWN_TOOL',message:'Herramienta no disponible para Proveedor'}
 },[data,flow.actions])


 const stop=useCallback(()=>{setPanelOpen(false);setRunning(false);busy.current=false;voicePaused.current=false;stopSpeech();try{recognition.current?.abort()}catch{}try{ugoWindow().UGOVoiceBridge?.stopListening?.()}catch{}recognition.current=null;native.current=false;setState('idle');setError('')},[setRunning,stopSpeech])
 const start=useCallback(async()=>{setPanelOpen(true);setError('');setState('connecting');const bridge=ugoWindow().UGOVoiceBridge;if(!bridge||bridge.isAvailable?.()===false){setState('error');setError('Gemini Live no está disponible. Tocá el orbe para reconectar.');return}native.current=true;setRunning(true);try{await bridge.startListening();if(running.current)setState('ready')}catch(caught){console.warn('Gemini Live no disponible.',caught);try{bridge.stopListening()}catch(stopError){ignoreError(stopError)}native.current=false;setRunning(false);setState('error');setError('Gemini Live no está disponible. Tocá el orbe para reconectar.')}},[setRunning])


 useEffect(()=>{const result=(event:Event)=>{if(!running.current)return;const detail=(event as CustomEvent<{text?:string;final?:boolean}>).detail||{},value=String(detail.text||'').trim();if(value)setUserTranscript(value);if(value&&detail.final!==false)void handleText(value)};const tool=async(event:Event)=>{if(!running.current)return;const detail=(event as CustomEvent<{id?:string;name?:string;args?:Record<string,unknown>}>).detail||{},id=String(detail.id||''),name=String(detail.name||''),bridge=ugoWindow().UGOVoiceBridge;if(!id||!name||!bridge?.sendToolResponse)return;setState('connecting');try{const response=await executeTool(name,detail.args||{});bridge.sendToolResponse(id,name,response)}catch(error){bridge.sendToolResponse(id,name,{ok:false,code:'TOOL_FAILED',message:error instanceof Error?error.message:'La acción falló'})}};const output=(event:Event)=>{const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim();if(text)setAssistantTranscript(text)};const stateEvent=(event:Event)=>{if(!running.current)return;const value=String((event as CustomEvent<{state?:string}>).detail?.state||'');if(value==='hearing'){stopSpeech();setState('hearing')}else if(value==='connecting')setState('connecting');else if(value==='speaking')setState('speaking');else if(value==='ready')setState('ready')};const voiceError=(event:Event)=>{const code=String((event as CustomEvent<{code?:string}>).detail?.code||'');native.current=false;setRunning(false);setState('error');setError(code==='not-allowed'?'Permití el micrófono para hablar con Hugo.':code==='session'?'Tu sesión venció. Volvé a iniciar sesión.':'Gemini Live no está disponible. Tocá el orbe para reconectar.')};window.addEventListener('ugo:native-voice-result',result);window.addEventListener('ugo:native-voice-tool-call',tool);window.addEventListener('ugo:native-voice-output',output);window.addEventListener('ugo:native-voice-state',stateEvent);window.addEventListener('ugo:native-voice-error',voiceError);return()=>{window.removeEventListener('ugo:native-voice-result',result);window.removeEventListener('ugo:native-voice-tool-call',tool);window.removeEventListener('ugo:native-voice-output',output);window.removeEventListener('ugo:native-voice-state',stateEvent);window.removeEventListener('ugo:native-voice-error',voiceError)}},[executeTool,handleText,setRunning,stopSpeech])

 useEffect(()=>()=>stop(),[stop])

 const visual=state==='speaking'?'speaking':state==='connecting'?'thinking':state==='hearing'?'listening':state==='ready'?'ready':state==='error'?'error':'idle'
 return <section className={`ugo-real-hugo prototype-hugo provider-global-hugo state-${visual}`} aria-label="Hugo, controlador por voz del proveedor">{panelOpen&&<div className="ugo-hugo-voice-controller" role="status" aria-live="polite"><small>HUGO · PROVEEDOR</small><strong>{LABELS[state]}</strong>{assistantTranscript&&<span>{assistantTranscript}</span>}{error&&<span className="ugo-hugo-stage-error">{error}</span>}</div>}<button type="button" className="ugo-real-orb" onClick={()=>voiceRunning?stop():void start()} aria-label={voiceRunning?'Cortar conversación con Hugo':'Hablar con Hugo'}><span className="ugo-orb-glass"/><span className="ugo-orb-ring ring-1"/><span className="ugo-orb-ring ring-2"/><span className="ugo-orb-icon">{state==='connecting'?'✦':state==='hearing'?'●':'⌁'}</span></button><div className="ugo-real-state"><i/><span>{LABELS[state]}</span></div></section>
}

export default ProviderHugoBridge
