import{getRoleSupabase}from'./roleSupabase'
import{supabase as adminSupabase}from'./supabase'

type BrowserVoiceBridge={startListening:()=>void|Promise<void>;pauseListening:()=>void;resumeListening:()=>void|Promise<void>;stopListening:()=>void;isAvailable:()=>boolean;speak?:(text:string,locale?:string)=>Promise<void>;stopSpeaking?:()=>void}
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
function currentRole(){const app=(new URLSearchParams(window.location.search).get('app')||'').toLowerCase();if(app.includes('admin'))return'admin';return app.startsWith('provider')?'provider':'client'}
function setupMessage(model:string){return{setup:{model:'models/'+model,generationConfig:{responseModalities:['TEXT']},realtimeInputConfig:{automaticActivityDetection:{disabled:false,startOfSpeechSensitivity:'START_SENSITIVITY_HIGH',endOfSpeechSensitivity:'END_SENSITIVITY_HIGH',prefixPaddingMs:120,silenceDurationMs:500},turnCoverage:'TURN_INCLUDES_ONLY_ACTIVITY'},inputAudioTranscription:{}}}}
function speakerSetupMessage(model:string){return{setup:{model:'models/'+model,generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:'Puck'}}}},outputAudioTranscription:{},systemInstruction:{parts:[{text:'Sos la voz de Hugo dentro de UGO. Tu única tarea en esta sesión es leer en voz alta exactamente el texto que la aplicación te envía. Hablá natural, breve y ágil, respetá el idioma indicado y no agregues, omitas, traduzcas ni expliques nada.'}]}}}}

function installBrowserBridge(){
 if(typeof window==='undefined'||window.UGOVoiceBridge||!canStream())return
 let active=false,paused=false,stream:MediaStream|null=null,audioContext:AudioContext|null=null,source:MediaStreamAudioSourceNode|null=null,processor:ScriptProcessorNode|null=null,gain:GainNode|null=null
 let socket:WebSocket|null=null,setupReady=false,connecting:Promise<void>|null=null,reconnectTimer=0,reconnectAttempt=0,connectionSerial=0,pendingSamples:number[]=[]
 let lastFinalText='',lastFinalAt=0
 let speakerSocket:WebSocket|null=null,speakerSetupReady=false,speakerConnecting:Promise<void>|null=null,speakerContext:AudioContext|null=null,speakerNextPlaybackTime=0,speakerTurnComplete=false,speakerWaiter:{resolve:()=>void;reject:(error:Error)=>void;timer:number}|null=null
 const speakerSources=new Set<AudioBufferSourceNode>()

 const clearReconnect=()=>{if(reconnectTimer){window.clearTimeout(reconnectTimer);reconnectTimer=0}}
 const resetAudioQueue=()=>{pendingSamples=[]}
 const closeSocket=()=>{const current=socket;socket=null;setupReady=false;connectionSerial++;if(current&&current.readyState<=WebSocket.OPEN){try{current.close(1000,'ugo-stop')}catch{}}}
 const cleanupAudio=()=>{resetAudioQueue();if(processor){processor.onaudioprocess=null;try{processor.disconnect()}catch{}}if(source){try{source.disconnect()}catch{}}if(gain){try{gain.disconnect()}catch{}}processor=null;source=null;gain=null;stream?.getTracks().forEach(track=>track.stop());stream=null;if(audioContext){void audioContext.close().catch(()=>{});audioContext=null}}
 const settleSpeaker=(error?:Error)=>{const waiter=speakerWaiter;speakerWaiter=null;if(!waiter)return;window.clearTimeout(waiter.timer);if(error)waiter.reject(error);else waiter.resolve()}
 const maybeFinishSpeaker=()=>{if(speakerTurnComplete&&speakerSources.size===0){speakerTurnComplete=false;settleSpeaker()}}
 const stopSpeakerPlayback=()=>{for(const item of speakerSources){try{item.stop()}catch{}}speakerSources.clear();speakerNextPlaybackTime=0;speakerTurnComplete=false;settleSpeaker()}
 const closeSpeakerSocket=()=>{const current=speakerSocket;speakerSocket=null;speakerSetupReady=false;speakerConnecting=null;if(current&&current.readyState<=WebSocket.OPEN){try{current.close(1000,'ugo-speaker-stop')}catch{}}}
 const cleanupSpeaker=()=>{stopSpeakerPlayback();closeSpeakerSocket();if(speakerContext){void speakerContext.close().catch(()=>{});speakerContext=null}}
 const playSpeakerPcm=(base64:string,mimeType='audio/pcm;rate=24000')=>{const Ctor=audioCtor() as typeof AudioContext;if(!Ctor)throw new Error('AudioContext no disponible');if(!speakerContext)speakerContext=new Ctor({latencyHint:'interactive'});if(speakerContext.state==='suspended')void speakerContext.resume();const match=/rate=(\\d+)/i.exec(String(mimeType)),sampleRate=Number(match?.[1])||24000,bytes=base64ToBytes(base64),even=bytes.byteLength-bytes.byteLength%2;if(even<2)return;const view=new DataView(bytes.buffer,bytes.byteOffset,even),buffer=speakerContext.createBuffer(1,even/2,sampleRate),channel=buffer.getChannelData(0);for(let i=0;i<channel.length;i++)channel[i]=view.getInt16(i*2,true)/32768;const item=speakerContext.createBufferSource();item.buffer=buffer;item.connect(speakerContext.destination);const startAt=Math.max(speakerContext.currentTime+.02,speakerNextPlaybackTime);speakerNextPlaybackTime=startAt+buffer.duration;speakerSources.add(item);item.onended=()=>{speakerSources.delete(item);maybeFinishSpeaker()};item.start(startAt)}
 const sendSpeakerJson=(payload:Record<string,unknown>)=>{if(speakerSocket?.readyState===WebSocket.OPEN&&speakerSetupReady){try{speakerSocket.send(JSON.stringify(payload));return true}catch{}}return false}
 const sendJson=(payload:Record<string,unknown>)=>{if(socket?.readyState===WebSocket.OPEN&&setupReady){try{socket.send(JSON.stringify(payload));return true}catch{}}return false}
 const endAudioStream=()=>{resetAudioQueue();sendJson({realtimeInput:{audioStreamEnd:true}})}
 const failRuntime=(code:string)=>{active=false;paused=false;clearReconnect();closeSocket();cleanupAudio();emit('ugo:native-voice-error',{code,engine:'gemini-live'})}

 const issueToken=async(mode:'transcribe'|'speaker'='transcribe')=>{
  const role=currentRole(),sb=role==='admin'?adminSupabase:getRoleSupabase(role),{data:sessionData}=await sb.auth.getSession(),accessToken=sessionData.session?.access_token
  if(!accessToken)throw Object.assign(new Error('Sesión no disponible para voz'),{status:401})
  const response=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify({role,voice_live_token:true,voice_live_mode:mode})})
  const data=await response.json().catch(()=>({})) as LiveTokenResponse
  if(!response.ok||!data.token||!data.model)throw Object.assign(new Error(data.error||'No pude iniciar Gemini Live'),{status:response.status})
  return{token:data.token,model:String(data.model).replace(/^models\//,'')}
 }

 const handleSpeakerMessage=(data:any)=>{
  if(data?.error){settleSpeaker(new Error(String(data.error?.message||data.error?.status||'Gemini Live speaker error')));return}
  const content=data?.serverContent;if(!content)return
  if(content.interrupted)stopSpeakerPlayback()
  for(const part of content.modelTurn?.parts||[]){if(part?.inlineData?.data)playSpeakerPcm(String(part.inlineData.data),String(part.inlineData.mimeType||'audio/pcm;rate=24000'))}
  if(content.turnComplete){speakerTurnComplete=true;maybeFinishSpeaker()}
 }
 const connectSpeaker=async()=>{
  if(!active)throw new Error('La sesión de voz no está activa')
  if(speakerSocket?.readyState===WebSocket.OPEN&&speakerSetupReady)return
  if(speakerConnecting)return speakerConnecting
  speakerConnecting=(async()=>{
   const{token,model}=await issueToken('speaker');if(!active)throw new Error('La sesión de voz se cerró')
   const ws=new WebSocket(LIVE_WS_URL+'?access_token='+encodeURIComponent(token));speakerSocket=ws;speakerSetupReady=false
   await new Promise<void>((resolve,reject)=>{let settled=false;const timer=window.setTimeout(()=>{if(settled)return;settled=true;try{ws.close()}catch{};reject(new Error('Gemini Live speaker setup timeout'))},8000);const finish=(fn:()=>void)=>{if(settled)return;settled=true;window.clearTimeout(timer);fn()};ws.onopen=()=>{try{ws.send(JSON.stringify(speakerSetupMessage(model)))}catch(error){finish(()=>reject(error as Error))}};ws.onmessage=event=>{if(typeof event.data!=='string')return;let data:any;try{data=JSON.parse(event.data)}catch{return}if(data?.setupComplete){speakerSetupReady=true;finish(resolve);return}handleSpeakerMessage(data)};ws.onerror=()=>{const error=new Error('Gemini Live speaker WebSocket error');if(!settled)finish(()=>reject(error));else settleSpeaker(error)};ws.onclose=event=>{if(speakerSocket===ws){speakerSocket=null;speakerSetupReady=false}const error=new Error(event.reason?('Gemini Live speaker desconectado: '+event.reason):'Gemini Live speaker desconectado');if(!settled)finish(()=>reject(error));else settleSpeaker(error)}})
  })()
  try{await speakerConnecting}finally{speakerConnecting=null}
 }
 const speakThroughLive=async(text:string,language='es-AR')=>{const value=String(text||'').trim();if(!value)return;await connectSpeaker();stopSpeakerPlayback();speakerTurnComplete=false;emit('ugo:native-voice-state',{state:'speaking',engine:'gemini-live',reason:'speaker'});await new Promise<void>((resolve,reject)=>{const timer=window.setTimeout(()=>{settleSpeaker(new Error('Gemini Live speaker response timeout'))},12000);speakerWaiter={resolve,reject,timer};const locale=language==='pt-BR'?'portugués de Brasil':'español rioplatense',prompt='Leé en voz alta exactamente la respuesta UGO que aparece después de la línea. Usá '+locale+' y no agregues nada.\\n---\\n'+value;if(!sendSpeakerJson({clientContent:{turns:[{role:'user',parts:[{text:prompt}]}],turnComplete:true}}))settleSpeaker(new Error('Gemini Live speaker no está listo'))});if(active)emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'spoken'})}
 const handleMessage=(data:any)=>{
  if(data?.error){console.warn('Gemini Live server error',data.error);failRuntime('unavailable');return false}
  if(data?.setupComplete){setupReady=true;reconnectAttempt=0;emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'connected'});return true}
  const content=data?.serverContent
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
  active=false;paused=false;clearReconnect();connecting=null;closeSocket();cleanupAudio();cleanupSpeaker()
  if(notify)emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'stopped'})
 }

 window.UGOVoiceBridge={
  isAvailable:()=>canStream(),
  startListening:async()=>{
   if(active){paused=false;await ensureAudio();await connectLive();emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'resumed'});return}
   active=true;paused=false;emit('ugo:native-voice-state',{state:'connecting',engine:'gemini-live',reason:'starting'})
   try{await ensureAudio();await connectLive();if(currentRole()!=='admin')void connectSpeaker().catch(error=>console.warn('UGO Gemini Live speaker prewarm failed',error));emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'listening'})}
   catch(error){console.warn('UGO Gemini Live start failed',error);shutdown(false);throw error}
  },
  pauseListening:()=>{if(!active)return;paused=true;endAudioStream();emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'paused'})},
  resumeListening:async()=>{if(!active)return;paused=false;resetAudioQueue();await ensureAudio();await connectLive();emit('ugo:native-voice-state',{state:'ready',engine:'gemini-live',reason:'resumed'})},
  stopListening:()=>shutdown(true),
  speak:speakThroughLive,
  stopSpeaking:()=>stopSpeakerPlayback(),
 }
}

if(typeof window!=='undefined')installBrowserBridge()

export{}
