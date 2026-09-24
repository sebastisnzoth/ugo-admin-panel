import{useCallback,useEffect,useRef,useState}from'react'
import{useProviderFlow}from'./providerFlow'
import{useProviderData}from'./providerData'
import'../voice.css'

type VoiceState='idle'|'connecting'|'ready'|'hearing'|'speaking'|'error'
type NativeBridge={startListening:()=>void|Promise<void>;stopListening:()=>void;isAvailable?:()=>boolean;stopSpeaking?:()=>void;sendToolResponse?:(id:string,name:string,response:Record<string,unknown>)=>boolean}
type UgoWindow=Window&typeof globalThis&{UGOVoiceBridge?:NativeBridge}

const LABELS:Record<VoiceState,string>={idle:'Toca para hablar',connecting:'Procesando...',ready:'Te escucho',hearing:'Escuchando...',speaking:'Hablando...',error:'Voz no disponible'}
const ugoWindow=()=>window as UgoWindow
const ignoreError=(value:unknown)=>{void value}

export function ProviderHugoBridge(){
 const flow=useProviderFlow(),data=useProviderData()
 const[state,setState]=useState<VoiceState>('idle'),[error,setError]=useState(''),[assistantTranscript,setAssistantTranscript]=useState(''),[voiceRunning,setVoiceRunning]=useState(false),[panelOpen,setPanelOpen]=useState(false)
 const running=useRef(false),native=useRef(false)

 const setRunning=useCallback((value:boolean)=>{running.current=value;setVoiceRunning(value)},[])
 const stopSpeech=useCallback(()=>{try{ugoWindow().UGOVoiceBridge?.stopSpeaking?.()}catch(caught){ignoreError(caught)}},[])
 const executeTool=useCallback(async(name:string,args:Record<string,unknown>)=>{
  if(name==='provider_set_online'){if(!data.online)await data.toggleOnline();return{ok:true,data:{online:true}}}
  if(name==='provider_set_offline'){if(data.online)await data.toggleOnline();return{ok:true,data:{online:false}}}
  if(name==='provider_list_opportunities')return{ok:true,data:{opportunities:data.opportunities.map(item=>({id:item.id,category:item.categoria?.nombre||item.categoria_nombre||'Servicio',status:item.estado||'ofrecido'}))}}
  if(name==='provider_accept_job'){const serviceId=String(args.service_id||'');const item=data.opportunities.find(item=>String(item.id)===serviceId);if(!item)return{ok:false,code:'SERVICE_NOT_FOUND',message:'No encontré esa oportunidad'};const ok=await flow.actions.acceptOpportunity(item.id);return ok?{ok:true,data:{serviceId}}:{ok:false,code:'ACCEPT_FAILED',message:'UGO no permitió aceptar ese trabajo'}}
  if(name==='provider_reject_job'){const serviceId=String(args.service_id||'');const item=data.opportunities.find(item=>String(item.id)===serviceId);if(!item)return{ok:false,code:'SERVICE_NOT_FOUND',message:'No encontré esa oportunidad'};const ok=await flow.actions.rejectOpportunity(item.id);return ok?{ok:true,data:{serviceId}}:{ok:false,code:'REJECT_FAILED',message:'UGO no permitió rechazar ese trabajo'}}
  if(name==='provider_update_service_status'){const serviceId=String(args.service_id||''),status=String(args.status||'');if(!data.service||String(data.service.id)!==serviceId)return{ok:false,code:'SERVICE_NOT_FOUND',message:'Ese no es el servicio activo'};const allowed:Record<string,string[]>= {asignado:['en_camino'],en_camino:['llegado'],llegado:[],en_progreso:[]};if(!(allowed[String(data.service.estado)]||[]).includes(status))return{ok:false,code:'INVALID_TRANSITION',message:'Ese cambio de estado no está permitido por el flujo actual'};const ok=await data.advance(status);return ok?{ok:true,data:{serviceId,status}}:{ok:false,code:'STATUS_FAILED',message:'UGO no pudo actualizar el estado'}}
  return{ok:false,code:'UNKNOWN_TOOL',message:'Herramienta no disponible para Proveedor'}
 },[data,flow.actions])


 const stop=useCallback(()=>{setPanelOpen(false);setRunning(false);stopSpeech();try{ugoWindow().UGOVoiceBridge?.stopListening?.()}catch{}native.current=false;setState('idle');setError('')},[setRunning,stopSpeech])
 const start=useCallback(async()=>{setPanelOpen(true);setError('');setState('connecting');const bridge=ugoWindow().UGOVoiceBridge;if(!bridge||bridge.isAvailable?.()===false){setState('error');setError('Gemini Live no está disponible. Tocá el orbe para reconectar.');return}native.current=true;setRunning(true);try{await bridge.startListening();if(running.current)setState('ready')}catch(caught){console.warn('Gemini Live no disponible.',caught);try{bridge.stopListening()}catch(stopError){ignoreError(stopError)}native.current=false;setRunning(false);setState('error');setError('Gemini Live no está disponible. Tocá el orbe para reconectar.')}},[setRunning])


 useEffect(()=>{const tool=async(event:Event)=>{if(!running.current)return;const detail=(event as CustomEvent<{id?:string;name?:string;args?:Record<string,unknown>}>).detail||{},id=String(detail.id||''),name=String(detail.name||''),bridge=ugoWindow().UGOVoiceBridge;if(!id||!name||!bridge?.sendToolResponse)return;setState('connecting');try{const response=await executeTool(name,detail.args||{});bridge.sendToolResponse(id,name,response)}catch(error){bridge.sendToolResponse(id,name,{ok:false,code:'TOOL_FAILED',message:error instanceof Error?error.message:'La acción falló'})}};const output=(event:Event)=>{const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim();if(text)setAssistantTranscript(text)};const stateEvent=(event:Event)=>{if(!running.current)return;const value=String((event as CustomEvent<{state?:string}>).detail?.state||'');if(value==='hearing'){stopSpeech();setState('hearing')}else if(value==='connecting')setState('connecting');else if(value==='speaking')setState('speaking');else if(value==='ready')setState('ready')};const voiceError=(event:Event)=>{const code=String((event as CustomEvent<{code?:string}>).detail?.code||'');native.current=false;setRunning(false);setState('error');setError(code==='not-allowed'?'Permití el micrófono para hablar con Hugo.':code==='session'?'Tu sesión venció. Volvé a iniciar sesión.':'Gemini Live no está disponible. Tocá el orbe para reconectar.')};window.addEventListener('ugo:native-voice-tool-call',tool);window.addEventListener('ugo:native-voice-output',output);window.addEventListener('ugo:native-voice-state',stateEvent);window.addEventListener('ugo:native-voice-error',voiceError);return()=>{window.removeEventListener('ugo:native-voice-tool-call',tool);window.removeEventListener('ugo:native-voice-output',output);window.removeEventListener('ugo:native-voice-state',stateEvent);window.removeEventListener('ugo:native-voice-error',voiceError)}},[executeTool,setRunning,stopSpeech])

 useEffect(()=>()=>stop(),[stop])

 const visual=state==='speaking'?'speaking':state==='connecting'?'thinking':state==='hearing'?'listening':state==='ready'?'ready':state==='error'?'error':'idle'
 return <section className={`ugo-real-hugo prototype-hugo provider-global-hugo state-${visual}`} aria-label="Hugo, controlador por voz del proveedor">{panelOpen&&<div className="ugo-hugo-voice-controller" role="status" aria-live="polite"><small>HUGO · PROVEEDOR</small><strong>{LABELS[state]}</strong>{assistantTranscript&&<span>{assistantTranscript}</span>}{error&&<span className="ugo-hugo-stage-error">{error}</span>}</div>}<button type="button" className="ugo-real-orb" onClick={()=>voiceRunning?stop():void start()} aria-label={voiceRunning?'Cortar conversación con Hugo':'Hablar con Hugo'}><span className="ugo-orb-glass"/><span className="ugo-orb-ring ring-1"/><span className="ugo-orb-ring ring-2"/><span className="ugo-orb-icon">{state==='connecting'?'✦':state==='hearing'?'●':'⌁'}</span></button><div className="ugo-real-state"><i/><span>{LABELS[state]}</span></div></section>
}

export default ProviderHugoBridge
