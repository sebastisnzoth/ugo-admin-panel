import{useCallback,useEffect,useRef,useState}from'react'
import{useLocale}from'../../i18n/locale'
import{useProviderFlow}from'./providerFlow'
import{useProviderData}from'./providerData'
import{UGO_UI_EVENTS}from'../uiEvents'
import'../voice.css'

type VoiceState='idle'|'connecting'|'ready'|'hearing'|'speaking'|'error'
type NativeBridge={startListening:()=>void|Promise<void>;stopListening:()=>void;isAvailable?:()=>boolean;stopSpeaking?:()=>void;sendToolResponse?:(id:string,name:string,response:Record<string,unknown>)=>boolean}
type UgoWindow=Window&typeof globalThis&{UGOVoiceBridge?:NativeBridge}

const ugoWindow=()=>window as UgoWindow
const ignoreError=(value:unknown)=>{void value}
const PROVIDER_VOICE_CONNECT_TIMEOUT_MS=16_000

export function ProviderHugoBridge(){
 const{t}=useLocale()
 const flow=useProviderFlow(),data=useProviderData()
 const{actions}=flow
 const[state,setState]=useState<VoiceState>('idle'),[error,setError]=useState(''),[assistantTranscript,setAssistantTranscript]=useState(''),[voiceRunning,setVoiceRunning]=useState(false),[panelOpen,setPanelOpen]=useState(false)
 const running=useRef(false)

 const setRunning=useCallback((value:boolean)=>{running.current=value;setVoiceRunning(value)},[])
 const stopSpeech=useCallback(()=>{try{ugoWindow().UGOVoiceBridge?.stopSpeaking?.()}catch(caught){ignoreError(caught)}},[])
 const executeTool=useCallback(async(name:string,args:Record<string,unknown>)=>{
  if(name==='provider_set_online'){if(args.confirmed!==true)return{ok:false,code:'CONFIRMATION_REQUIRED',message:t('voice.providerTool.confirmOnline')};if(data.online)return{ok:true,data:{online:true}};const ok=await data.setOnline(true);return ok?{ok:true,data:{online:true}}:{ok:false,code:'AVAILABILITY_FAILED',message:t('voice.providerTool.onlineFailed')}}
  if(name==='provider_set_offline'){if(args.confirmed!==true)return{ok:false,code:'CONFIRMATION_REQUIRED',message:t('voice.providerTool.confirmOffline')};if(!data.online)return{ok:true,data:{online:false}};const ok=await data.setOnline(false);return ok?{ok:true,data:{online:false}}:{ok:false,code:'AVAILABILITY_FAILED',message:t('voice.providerTool.onlineFailed')}}
  if(name==='provider_get_context')return{ok:true,data:{online:data.online,activeService:data.service?{serviceId:data.service.id,number:data.service.numero||null,state:data.service.estado,category:data.service.categoria?.nombre||null,client:data.service.cliente?.nombre||null,description:data.service.descripcion||null}:null,opportunities:data.opportunities.slice(0,5).map(item=>({id:item.id,serviceId:item.serviceId,category:item.category,title:item.title,zone:item.zone,distanceKm:item.distanceKm,estimatedValue:item.estimatedValue,urgency:item.urgency,expiresAt:item.expiresAt||null})),earnings:{released:data.released,cashReceived:data.cashReceived,ugoDebt:data.ugoDebt,pendingDebtCount:data.pendingDebtCount,debtBlocked:data.debtBlocked}}}
  if(name==='provider_list_opportunities')return{ok:true,data:{opportunities:data.opportunities.map(item=>({id:item.id,serviceId:item.serviceId,category:item.category,title:item.title,zone:item.zone,distanceKm:item.distanceKm,estimatedValue:item.estimatedValue,urgency:item.urgency,status:'ofrecido'}))}}
  if(name==='provider_get_active_service'){if(!data.service)return{ok:true,data:{service:null},message:t('voice.providerTool.noActiveJob')};return{ok:true,data:{service:{serviceId:data.service.id,state:data.service.estado,category:data.service.categoria?.nombre||null,client:data.service.cliente?.nombre||null}},message:t('voice.providerTool.activeJobFound')}}
  if(name==='provider_accept_job'){const requestedId=String(args.service_id||'');if(args.confirmed!==true)return{ok:false,code:'CONFIRMATION_REQUIRED',message:t('voice.providerTool.confirmAccept')};const item=data.opportunities.find(item=>String(item.id)===requestedId||String(item.serviceId)===requestedId);if(!item)return{ok:false,code:'SERVICE_NOT_FOUND',message:t('voice.providerTool.opportunityMissing')};const ok=await actions.acceptOpportunity(item.id);return ok?{ok:true,data:{serviceId:item.serviceId,opportunityId:item.id}}:{ok:false,code:'ACCEPT_FAILED',message:t('voice.providerTool.acceptFailed')}}
  if(name==='provider_reject_job'){const requestedId=String(args.service_id||'');if(args.confirmed!==true)return{ok:false,code:'CONFIRMATION_REQUIRED',message:t('voice.providerTool.confirmReject')};const item=data.opportunities.find(item=>String(item.id)===requestedId||String(item.serviceId)===requestedId);if(!item)return{ok:false,code:'SERVICE_NOT_FOUND',message:t('voice.providerTool.opportunityMissing')};const ok=await actions.rejectOpportunity(item.id);return ok?{ok:true,data:{serviceId:item.serviceId,opportunityId:item.id}}:{ok:false,code:'REJECT_FAILED',message:t('voice.providerTool.rejectFailed')}}
  if(name==='provider_update_service_status'){const serviceId=String(args.service_id||''),status=String(args.status||'');if(args.confirmed!==true)return{ok:false,code:'CONFIRMATION_REQUIRED',message:t('voice.providerTool.confirmStatus')};if(!data.service||String(data.service.id)!==serviceId)return{ok:false,code:'SERVICE_NOT_FOUND',message:t('voice.providerTool.activeJobMismatch')};const allowed:Record<string,string[]>= {asignado:['en_camino'],en_camino:['llegado'],llegado:['en_progreso'],en_progreso:['esperando_aprobacion']};if(!(allowed[String(data.service.estado)]||[]).includes(status))return{ok:false,code:'INVALID_TRANSITION',message:t('voice.providerTool.invalidStatus')};const ok=status==='esperando_aprobacion'?await data.completeService():await data.advance(status as 'en_camino'|'llegado'|'en_progreso');return ok?{ok:true,data:{serviceId,status}}:{ok:false,code:'STATUS_FAILED',message:t('voice.providerTool.statusFailed')}}
  return{ok:false,code:'UNKNOWN_TOOL',message:t('voice.providerTool.unavailable')}
 },[actions,data])


 const stop=useCallback(()=>{setPanelOpen(false);setRunning(false);stopSpeech();try{ugoWindow().UGOVoiceBridge?.stopListening?.()}catch{/* vacío intencional */}setState('idle');setError('')},[setRunning,stopSpeech])
 const start=useCallback(async()=>{setPanelOpen(true);setError('');setState('connecting');const bridge=ugoWindow().UGOVoiceBridge;if(!bridge||bridge.isAvailable?.()===false){setState('error');setError(t('voice.error.browser'));return}setRunning(true);const timeout=window.setTimeout(()=>{if(!running.current)return;try{bridge.stopListening()}catch(stopError){ignoreError(stopError)}setRunning(false);setState('error');setError(t('voice.error.connect'))},PROVIDER_VOICE_CONNECT_TIMEOUT_MS);try{await bridge.startListening();window.clearTimeout(timeout);if(running.current)setState('ready')}catch(caught){window.clearTimeout(timeout);console.warn('Gemini Live no disponible.',caught);try{bridge.stopListening()}catch(stopError){ignoreError(stopError)}setRunning(false);setState('error');setError(t('voice.error.connect'))}},[setRunning,t])


 useEffect(()=>{const tool=async(event:Event)=>{if(!running.current)return;const detail=(event as CustomEvent<{id?:string;name?:string;args?:Record<string,unknown>}>).detail||{},id=String(detail.id||''),name=String(detail.name||''),bridge=ugoWindow().UGOVoiceBridge;if(!id||!name||!bridge?.sendToolResponse)return;setState('connecting');try{const response=await executeTool(name,detail.args||{});bridge.sendToolResponse(id,name,response)}catch(error){bridge.sendToolResponse(id,name,{ok:false,code:'TOOL_FAILED',message:t('voice.providerTool.actionFailed')})}};const output=(event:Event)=>{const text=String((event as CustomEvent<{text?:string}>).detail?.text||'').trim();if(text)setAssistantTranscript(text)};const stateEvent=(event:Event)=>{if(!running.current)return;const value=String((event as CustomEvent<{state?:string}>).detail?.state||'');if(value==='hearing'){stopSpeech();setState('hearing')}else if(value==='connecting')setState('connecting');else if(value==='speaking')setState('speaking');else if(value==='ready')setState('ready')};const voiceError=(event:Event)=>{const code=String((event as CustomEvent<{code?:string}>).detail?.code||'');setRunning(false);setState('error');setError(code==='not-allowed'?t('voice.error.micPermission'):code==='no-microphone'?t('voice.error.noMic'):code==='microphone-busy'?t('voice.error.micBusy'):code==='session'?t('voice.error.session'):t('voice.error.reconnect'))};window.addEventListener('ugo:native-voice-tool-call',tool);window.addEventListener('ugo:native-voice-output',output);window.addEventListener('ugo:native-voice-state',stateEvent);window.addEventListener('ugo:native-voice-error',voiceError);return()=>{window.removeEventListener('ugo:native-voice-tool-call',tool);window.removeEventListener('ugo:native-voice-output',output);window.removeEventListener('ugo:native-voice-state',stateEvent);window.removeEventListener('ugo:native-voice-error',voiceError)}},[executeTool,setRunning,stopSpeech,t])

 useEffect(()=>{const stopGlobal=()=>stop();window.addEventListener(UGO_UI_EVENTS.globalVoiceStop,stopGlobal);return()=>window.removeEventListener(UGO_UI_EVENTS.globalVoiceStop,stopGlobal)},[stop])
 useEffect(()=>()=>stop(),[stop])

 const visual=state==='speaking'?'speaking':state==='connecting'?'thinking':state==='hearing'?'listening':state==='ready'?'ready':state==='error'?'error':'idle'
 return <section className={`ugo-real-hugo prototype-hugo provider-global-hugo state-${visual}`} aria-label={t('voice.providerLabel')}>{panelOpen&&<div className="ugo-hugo-voice-controller" role="status" aria-live="polite"><small>{t('voice.provider')}</small><strong>{t('voice.state.'+state)}</strong>{assistantTranscript&&<span>{assistantTranscript}</span>}{error&&<span className="ugo-hugo-stage-error">{error}</span>}</div>}<button type="button" className="ugo-real-orb" onClick={()=>voiceRunning?stop():void start()} aria-label={voiceRunning?t('voice.stop'):t('voice.speak')}><span className="ugo-orb-glass"/><span className="ugo-orb-ring ring-1"/><span className="ugo-orb-ring ring-2"/><span className="ugo-orb-icon">{state==='connecting'?'✦':state==='hearing'?'●':'⌁'}</span></button><div className="ugo-real-state"><i/><span>{t('voice.state.'+state)}</span></div></section>
}

export default ProviderHugoBridge
