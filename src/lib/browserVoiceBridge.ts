import{getRoleSupabase}from'./roleSupabase'
import{supabase as adminSupabase}from'./supabase'

type BrowserVoiceBridge={startListening:()=>void|Promise<void>;pauseListening:()=>void;resumeListening:()=>void|Promise<void>;stopListening:()=>void;isAvailable:()=>boolean;stopSpeaking?:()=>void;sendToolResponse?:(id:string,name:string,response:Record<string,unknown>)=>boolean}
type LiveTokenResponse={token?:string;model?:string;expires_at?:string;error?:string}

declare global{interface Window{UGOVoiceBridge?:BrowserVoiceBridge}}

const LIVE_WS_URL='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'
const TARGET_RATE=16000
const CHUNK_SAMPLES=1600
const emit=(name:string,detail:Record<string,unknown>)=>window.dispatchEvent(new CustomEvent(name,{detail}))
function audioCtor(){return window.AudioContext||(window as any).webkitAudioContext}
const canStream=()=>Boolean(navigator.mediaDevices?.getUserMedia&&window.WebSocket&&audioCtor())

function bytesToBase64(bytes:Uint8Array){
 let binary=''
 for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+0x8000,bytes.length)))
 return btoa(binary)
}
function base64ToBytes(value:string){
 const binary=atob(String(value||'')),bytes=new Uint8Array(binary.length)
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)
 return bytes
}
function pcm16Base64(samples:Float32Array){
 const bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer)
 for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]||0));view.setInt16(i*2,value<0?Math.round(value*32768):Math.round(value*32767),true)}
 return bytesToBase64(bytes)
}
function resample(input:Float32Array,fromRate:number){
 if(fromRate===TARGET_RATE)return new Float32Array(input)
 const ratio=fromRate/TARGET_RATE,length=Math.max(1,Math.floor(input.length/ratio)),output=new Float32Array(length)
 for(let i=0;i<length;i++){const position=i*ratio,left=Math.floor(position),right=Math.min(input.length-1,left+1),mix=position-left;output[i]=(input[left]||0)*(1-mix)+(input[right]||0)*mix}
 return output
}
type LiveFunctionDeclaration={name:string;description:string;parameters:{type:'OBJECT';properties:Record<string,{type:string;description?:string;enum?:string[]}>;required?:string[]}}
const CLIENT_TOOLS:LiveFunctionDeclaration[]=[
 {name:'get_current_location',description:'Obtiene la ubicación GPS real del cliente cuando el usuario pide usar donde está.',parameters:{type:'OBJECT',properties:{}}},
 {name:'set_request_category',description:'Actualiza la categoría del borrador del pedido.',parameters:{type:'OBJECT',properties:{category:{type:'STRING',description:'Categoría de servicio expresada por el usuario'}},required:['category']}},
 {name:'set_request_description',description:'Actualiza qué trabajo necesita el cliente.',parameters:{type:'OBJECT',properties:{description:{type:'STRING'}},required:['description']}},
 {name:'set_schedule',description:'Actualiza cuándo necesita el servicio.',parameters:{type:'OBJECT',properties:{when:{type:'STRING',description:'Expresión temporal confirmada por el usuario'}},required:['when']}},
 {name:'set_payment_method',description:'Actualiza el método de pago del pedido.',parameters:{type:'OBJECT',properties:{method:{type:'STRING',enum:['cash','pix']}},required:['method']}},
 {name:'search_providers',description:'Busca profesionales reales disponibles para el borrador actual.',parameters:{type:'OBJECT',properties:{}}},
 {name:'create_service_request',description:'Crea el pedido real sólo después de confirmación explícita del cliente.',parameters:{type:'OBJECT',properties:{confirmed:{type:'BOOLEAN'}},required:['confirmed']}},
 {name:'get_service_status',description:'Consulta el estado real de un pedido activo.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'}},required:['service_id']}},
 {name:'cancel_service',description:'Cancela un pedido real después de confirmación cuando corresponda.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'},confirmed:{type:'BOOLEAN'}},required:['service_id','confirmed']}},
 {name:'approve_work',description:'Confirma que el trabajo de un service_id exacto quedó bien. Requiere confirmación explícita y nunca confirma por sí solo un pago en efectivo.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'},confirmed:{type:'BOOLEAN'}},required:['service_id','confirmed']}},
 {name:'confirm_cash_payment',description:'Confirma YA PAGUÉ para un service_id exacto después de que el trabajo en efectivo ya fue aprobado. Requiere confirmación explícita.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'},confirmed:{type:'BOOLEAN'}},required:['service_id','confirmed']}},
 {name:'rate_service',description:'Califica un service_id exacto ya completado. Requiere puntuación de 1 a 5 y confirmación explícita.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'},score:{type:'NUMBER'},comment:{type:'STRING'},confirmed:{type:'BOOLEAN'}},required:['service_id','score','confirmed']}}
]
const PROVIDER_TOOLS:LiveFunctionDeclaration[]=[
 {name:'provider_set_online',description:'Pone al proveedor online usando la lógica real de UGO.',parameters:{type:'OBJECT',properties:{}}},
 {name:'provider_set_offline',description:'Pone al proveedor offline usando la lógica real de UGO.',parameters:{type:'OBJECT',properties:{}}},
 {name:'provider_list_opportunities',description:'Lista oportunidades reales disponibles para el proveedor.',parameters:{type:'OBJECT',properties:{}}},
 {name:'provider_accept_job',description:'Acepta una oportunidad real si las reglas UGO lo permiten.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'}},required:['service_id']}},
 {name:'provider_reject_job',description:'Rechaza una oportunidad real.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'}},required:['service_id']}},
 {name:'provider_update_service_status',description:'Actualiza el lifecycle de un servicio activo.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'},status:{type:'STRING'}},required:['service_id','status']}}
]
const ADMIN_TOOLS:LiveFunctionDeclaration[]=[
 {name:'admin_get_operational_summary',description:'Consulta el resumen operativo actual de UGO sin modificar datos.',parameters:{type:'OBJECT',properties:{}}},
 {name:'admin_find_service',description:'Busca un servicio real por id o número para inspeccionarlo.',parameters:{type:'OBJECT',properties:{service_id:{type:'STRING'}},required:['service_id']}},
 {name:'admin_find_user',description:'Busca un cliente o proveedor real por id, email o nombre.',parameters:{type:'OBJECT',properties:{query:{type:'STRING'}},required:['query']}}
]
function roleTools(){const role=currentRole();return role==='client'?CLIENT_TOOLS:role==='provider'?PROVIDER_TOOLS:role==='admin'?ADMIN_TOOLS:[]}
function currentRole(){const app=(new URLSearchParams(window.location.search).get('app')||'').toLowerCase();if(app.includes('admin'))return'admin';return app.startsWith('provider')?'provider':'client'}
function setupMessage(model:string){return{setup:{model:'models/'+model,generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Puck'}}}},realtimeInputConfig:{automaticActivityDetection:{disabled:false,startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',endOfSpeechSensitivity:'END_SENSITIVITY_HIGH',prefixPaddingMs:120,silenceDurationMs:500},turnCoverage:'TURN_INCLUDES_ONLY_ACTIVITY'},inputAudioTranscription:{},outputAudioTranscription:{},systemInstruction:{parts:[{text:'Sos Hugo, el asistente operativo de UGO. Conversá natural, breve y útil. En Admin sólo podés consultar mediante las herramientas declaradas; no confirmes cambios administrativos si no existe una herramienta autorizada. Nunca inventes acciones ni resultados. Si necesitás operar UGO, usá las herramientas declaradas y esperá su resultado antes de confirmar éxito. Recordá los datos confirmados durante esta conversación y no los vuelvas a preguntar.'}]},tools:[{functionDeclarations:roleTools()}]}}}

function installBrowserBridge(){
 if(typeof window==='undefined'||window.UGOVoiceBridge||!canStream())return
 let active=false,paused=false,stream:MediaStream|null=null,audioContext:AudioContext|null=null,source:MediaStreamAudioSourceNode|null=null,processor:ScriptProcessorNode|null=null,gain:GainNode|null=null
 let socket:WebSocket|null=null,setupReady=false,connecting:Promise<void>|null=null,reconnectTimer=0,reconnectAttempt=0,connectionSerial=0,pendingSamples:number[]=[]
 let lastFinalText='',lastFinalAt=0,conversationContext:AudioContext|null=null,conversationNextPlaybackTime=0
 const conversationSources=new Set<AudioBufferSourceNode>()

 const clearReconnect=()=>{if(reconnectTimer){window.clearTimeout(reconnectTimer);reconnectTimer=0}}
 const resetAudioQueue=()=>{pendingSamples=[]}
 const closeSocket=()=>{const current=socket;socket=null;setupReady=false;connectionSerial++;if(current&&current.readyState<=WebSocket.OPEN){try{current.close(1000,'ugo-stop')}catch{}}}
 const cleanupAudio=()=>{resetAudioQueue();if(processor){processor.onaudioprocess=null;try{processor.disconnect()}catch{}}if(source){try{source.disconnect()}catch{}}if(gain){try{gain.disconnect()}catch{}}processor=null;source=null;gain=null;stream?.getTracks().forEach(track=>track.stop());stream=null;if(audioContext){void audioContext.close().catch(()=>{});audioContext=null}}
 const sendJson=(payload:Record<string,unknown>)=>{if(socket?.readyState===WebSocket.OPEN&&setupReady){try{socket.send(JSON.stringify(payload));return true}catch{}}return false}
 const primeConversationAudio=()=>{const Ctor=audioCtor() as typeof AudioContext;if(!Ctor)return;if(!conversationContext)conversationContext=new Ctor({latencyHint:'interactive'});if(conversationContext.state==='suspended')void conversationContext.resume().catch(()=>{})}\n const stopConversationPlayback=()=>{for(const item of conversationSources){try{item.stop()}catch{}}conversationSources.clear();conversationNextPlaybackTime=0}
 const playConversationPcm=(base64:string,mimeType='audio/pcm;rate=24000')=>{primeConversationAudio();if(!conversationContext)return;const match=/rate=(\\d+)/i.exec(String(mimeType)),sampleRate=Number(match?.[1])||24000,bytes=base64ToBytes(base64),even=bytes.byteLength-bytes.byteLength%2;if(even<2)return;const view=new DataView(bytes.buffer,bytes.byteOffset,even),buffer=conversationContext.createBuffer(1,even/2,sampleRate),channel=buffer.getChannelData(0);for(let i=0;i<channel.length;i++)channel[i]=view.getInt16(i*2,true)/32768;const item=conversationContext.createBufferSource();item.buffer=buffer;item.connect(conversationContext.destination);const startAt=Math.max(conversationContext.currentTime+.02,conversationNextPlaybackTime);conversationNextPlaybackTime=startAt+buffer.duration;conversationSources.add(item);item.onended=()=>conversationSources.delete(item);item.start(startAt);emit('ugo:native-voice-state',{state:'speaking',engine:'gemini-live',reason:'live-audio'})}
 const endAudioStream=()=>{resetAudioQueue();sendJson({realtimeInput:{audioStreamEnd:true}})}
 const failRuntime=(code:string)=>{active=false;paused=false;clearReconnect();closeSocket();cleanupAudio();emit('ugo:native-voice-error',{code,engine:'gemini-live'})}

 const issueToken=async()=>{
  const role=currentRole(),sb=role==='admin'?adminSupabase:getRoleSupabase(role),{data:sessionData}=await sb.auth.getSession(),accessToken=sessionData.session?.access_token
  if(!accessToken)throw Object.assign(new Error('Sesión no disponible para voz'),{status:401})
  const response=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify({role,voice_live_token:true,voice_live_mode:'conversation'})})
  const data=await response.json().catch(()=>({})) as LiveTokenResponse
  if(!response.ok||!data.token||!data.model)throw Object.assign(new Error(data.error||'No pude iniciar Gemini Live'),{status:response.status})
  return{token:data.token,model:String(data.model).replace(/^models\//,'')}
 }

 const handleMessage=(data:any)=>{
  if(data?.error){console.warn('Gemini Live server error',data.error);failRuntime('unavailable');return false}
  if(data?.setupComplete){setupReady=true;reconnectAttempt=0;emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'connected'});return true}
  const content=data?.serverContent
  if(content?.interrupted)stopConversationPlayback()
  for(const part of content?.modelTurn?.parts||[]){if(part?.inlineData?.data)playConversationPcm(String(part.inlineData.data),String(part.inlineData.mimeType||'audio/pcm;rate=24000'))}
  const calls=data?.toolCall?.functionCalls||[]
  for(const call of calls){emit('ugo:native-voice-tool-call',{id:String(call?.id||''),name:String(call?.name||''),args:call?.args||{},engine:'gemini-live'})}
  const outputText=String(content?.outputTranscription?.text||'').trim()
  if(outputText)emit('ugo:native-voice-output',{text:outputText,engine:'gemini-live'})
  const interim=String(content?.interimInputTranscription?.text||'').trim()
  if(interim&&active&&!paused){emit('ugo:native-voice-state',{state:'hearing',engine:'gemini-live',reason:'interim'});emit('ugo:native-voice-result',{text:interim,final:false,engine:'gemini-live'})}
  const finalText=String(content?.inputTranscription?.text||'').trim()
  if(finalText&&active){
   const now=Date.now()
   if(finalText!==lastFinalText||now-lastFinalAt>1600){lastFinalText=finalText;lastFinalAt=now;emit('ugo:native-voice-result',{text:finalText,final:true,engine:'gemini-live'});emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'final'})}
  }
  return false
 }

 const scheduleReconnect=()=>{
  if(!active||reconnectTimer)return
  reconnectAttempt++
  if(reconnectAttempt>4){failRuntime('unavailable');return}
  emit('ugo:native-voice-state',{state:'connecting',engine:'gemini-live',reason:'reconnect',attempt:reconnectAttempt})
  reconnectTimer=window.setTimeout(()=>{reconnectTimer=0;void connectLive().catch(()=>{if(active)scheduleReconnect()})},Math.min(250*2**(reconnectAttempt-1),2000))
 }

 const connectLive=async()=>{
  if(!active)return
  if(socket?.readyState===WebSocket.OPEN&&setupReady)return
  if(connecting)return connecting
  const serial=++connectionSerial
  connecting=(async()=>{
   const{token,model}=await issueToken()
   if(!active||serial!==connectionSerial)return
   const ws=new WebSocket(LIVE_WS_URL+'?access_token='+encodeURIComponent(token))
   socket=ws;setupReady=false;resetAudioQueue()
   await new Promise<void>((resolve,reject)=>{
    let settled=false
    const timer=window.setTimeout(()=>{if(settled)return;settled=true;try{ws.close()}catch{}reject(Object.assign(new Error('Gemini Live setup timeout'),{status:504}))},8000)
    const finish=(fn:()=>void)=>{if(settled)return;settled=true;window.clearTimeout(timer);fn()}
    ws.onopen=()=>{if(!active||serial!==connectionSerial){try{ws.close()}catch{};return}try{ws.send(JSON.stringify(setupMessage(model)))}catch(error){finish(()=>reject(error as Error))}}
    ws.onmessage=event=>{if(!active||serial!==connectionSerial||typeof event.data!=='string')return;let data:any;try{data=JSON.parse(event.data)}catch{return}const ready=handleMessage(data);if(ready)finish(resolve);if(data?.goAway&&active){try{ws.close(1000,'gemini-go-away')}catch{}}}
    ws.onerror=()=>{if(!settled)finish(()=>reject(new Error('Gemini Live WebSocket error')))}
    ws.onclose=()=>{if(socket===ws){socket=null;setupReady=false}if(!settled)finish(()=>reject(new Error('Gemini Live cerró antes de completar setup')));if(active&&serial===connectionSerial)scheduleReconnect()}
   })
  })()
  try{await connecting}finally{connecting=null}
 }

 const ensureAudio=async()=>{
  if(stream&&audioContext&&processor)return
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}})
  const Ctor=audioCtor() as typeof AudioContext
  if(!Ctor)throw new Error('AudioContext no disponible')
  try{audioContext=new Ctor({latencyHint:'interactive',sampleRate:TARGET_RATE})}catch{audioContext=new Ctor({latencyHint:'interactive'})}
  source=audioContext.createMediaStreamSource(stream)
  processor=audioContext.createScriptProcessor(2048,1,1)
  gain=audioContext.createGain();gain.gain.value=0
  source.connect(processor);processor.connect(gain);gain.connect(audioContext.destination)
  processor.onaudioprocess=event=>{
   if(!active||paused||!setupReady||socket?.readyState!==WebSocket.OPEN)return
   const converted=resample(event.inputBuffer.getChannelData(0),audioContext?.sampleRate||TARGET_RATE)
   for(let i=0;i<converted.length;i++)pendingSamples.push(converted[i])
   while(pendingSamples.length>=CHUNK_SAMPLES){
    const chunk=new Float32Array(pendingSamples.splice(0,CHUNK_SAMPLES))
    if(!sendJson({realtimeInput:{audio:{data:pcm16Base64(chunk),mimeType:'audio/pcm;rate=16000'}}}))break
   }
  }
  await audioContext.resume()
 }

 const shutdown=(notify:boolean)=>{
  active=false;paused=false;clearReconnect();connecting=null;closeSocket();cleanupAudio();stopConversationPlayback();if(conversationContext){void conversationContext.close().catch(()=>{});conversationContext=null}
  if(notify)emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'stopped'})
 }

 window.UGOVoiceBridge={
  isAvailable:()=>canStream(),
  startListening:async()=>{
   if(active){paused=false;await ensureAudio();await connectLive();emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'resumed'});return}
   active=true;paused=false;emit('ugo:native-voice-state',{state:'connecting',engine:'gemini-live',reason:'starting'})
   try{await ensureAudio();await connectLive();emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'listening'})}
   catch(error){console.warn('UGO Gemini Live start failed',error);const name=String((error as any)?.name||''),status=Number((error as any)?.status||0),code=name==='NotAllowedError'||name==='SecurityError'?'not-allowed':name==='NotFoundError'?'no-microphone':name==='NotReadableError'?'microphone-busy':status===401?'session':status===403?'forbidden':status===429?'rate-limited':'unavailable';shutdown(false);emit('ugo:native-voice-error',{code,engine:'gemini-live',message:error instanceof Error?error.message:String(error||'')});throw error}
  },
  pauseListening:()=>{if(!active)return;paused=true;endAudioStream();emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'paused'})},
  resumeListening:async()=>{if(!active)return;paused=false;resetAudioQueue();await ensureAudio();await connectLive();emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'resumed'})},
  stopListening:()=>shutdown(true),
  stopSpeaking:()=>stopConversationPlayback(),
  sendToolResponse:(id,name,response)=>sendJson({toolResponse:{functionResponses:[{id,name,response}]}}),
 }
}

if(typeof window!=='undefined')installBrowserBridge()

export{}
