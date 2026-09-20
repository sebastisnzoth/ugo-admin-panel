import{getRoleSupabase}from'./roleSupabase'

type BrowserVoiceBridge={startListening:()=>void;stopListening:()=>void;isAvailable:()=>boolean}

declare global{interface Window{UGOVoiceBridge?:BrowserVoiceBridge}}

const canRecord=()=>Boolean(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder)
const emit=(name:string,detail:Record<string,unknown>)=>window.dispatchEvent(new CustomEvent(name,{detail}))

function preferredMime(){
 const candidates=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/webm','audio/mp4']
 return candidates.find(type=>MediaRecorder.isTypeSupported?.(type))||''
}
function apiMime(value:string){return value.toLowerCase().split(';')[0]||'audio/webm'}
async function blobToBase64(blob:Blob){
 const bytes=new Uint8Array(await blob.arrayBuffer());let binary=''
 for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+0x8000,bytes.length)))
 return btoa(binary)
}

function installBrowserBridge(){
 if(typeof window==='undefined'||window.UGOVoiceBridge||!canRecord())return
 let active=false,stream:MediaStream|null=null,recorder:MediaRecorder|null=null,chunks:BlobPart[]=[],audioContext:AudioContext|null=null,source:MediaStreamAudioSourceNode|null=null,analyser:AnalyserNode|null=null,raf=0,restartTimer=0,cycle=0,sendCurrent=false

 const clearRestart=()=>{if(restartTimer){window.clearTimeout(restartTimer);restartTimer=0}}
 const cleanupAnalysis=()=>{if(raf)cancelAnimationFrame(raf);raf=0;try{source?.disconnect()}catch{}source=null;analyser=null;if(audioContext){void audioContext.close().catch(()=>{});audioContext=null}}
 const releaseStream=()=>{stream?.getTracks().forEach(track=>track.stop());stream=null}
 const fail=(code:string)=>{active=false;clearRestart();cleanupAnalysis();releaseStream();recorder=null;emit('ugo:native-voice-error',{code})}
 const schedule=(fn:()=>void,ms:number)=>{clearRestart();restartTimer=window.setTimeout(fn,ms)}
 const waitForConsumer=(token:number)=>schedule(()=>{if(active&&token===cycle&&!recorder)void startCycle()},450)

 const transcribe=async(blob:Blob,token:number,captureMs:number)=>{
  if(!active||token!==cycle)return
  const requestStarted=performance.now()
  try{
   emit('ugo:native-voice-state',{state:'connecting',engine:'gemini'})
   const appRole=(()=>{const app=new URLSearchParams(window.location.search).get('app')||'';return app.startsWith('provider')?'provider':'client'})()
   const sb=getRoleSupabase(appRole),{data:sessionData}=await sb.auth.getSession(),accessToken=sessionData.session?.access_token
   if(!accessToken)throw Object.assign(new Error(`Sesión de ${appRole==='provider'?'proveedor':'cliente'} no disponible`),{status:401})
   const audio=await blobToBase64(blob)
   const response=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({role:appRole,voice_transcription:true,audio_base64:audio,mime_type:apiMime(blob.type),capture_ms:Math.round(captureMs)})})
   const data=await response.json().catch(()=>({})) as{transcript?:string;error?:string;model?:string}
   const requestMs=Math.round(performance.now()-requestStarted)
   console.info('UGO voice timing',{captureMs:Math.round(captureMs),transcriptionMs:requestMs,status:response.status,model:data.model||null})
   if(!active||token!==cycle)return
   if(response.status===422){emit('ugo:native-voice-state',{state:'ready',reason:'no-speech',engine:'gemini'});schedule(()=>void startCycle(),180);return}
   if(response.status===429||response.status>=500){console.warn('UGO Gemini transcription retry',{status:response.status,error:data.error});emit('ugo:native-voice-state',{state:'ready',reason:'retry',engine:'gemini'});schedule(()=>void startCycle(),450);return}
   if(!response.ok)throw Object.assign(new Error(data.error||`Voice ${response.status}`),{status:response.status})
   const text=String(data.transcript||'').trim()
   if(text){emit('ugo:native-voice-result',{text,final:true,engine:'gemini',captureMs:Math.round(captureMs),transcriptionMs:requestMs});waitForConsumer(token)}else{emit('ugo:native-voice-state',{state:'ready',reason:'empty',engine:'gemini'});schedule(()=>void startCycle(),180)}
  }catch(error:any){
   console.warn('UGO Gemini browser transcription failed',error)
   if(!active||token!==cycle)return
   const status=Number(error?.status||0)
   if(status===422||status===429||status>=500){emit('ugo:native-voice-state',{state:'ready',reason:'retry',engine:'gemini'});schedule(()=>void startCycle(),450);return}
   fail(status===401||status===403?'session':'unavailable')
  }
 }

 const finishCycle=(send:boolean)=>{
  if(!recorder)return
  sendCurrent=send
  cleanupAnalysis()
  const current=recorder;recorder=null
  if(current.state!=='inactive'){try{current.stop()}catch{}}
 }

 const monitorSilence=(token:number,startedAt:number)=>{
  if(!active||token!==cycle||!recorder||!analyser)return
  const values=new Uint8Array(analyser.fftSize);let speechStarted=false,lastVoiceAt=startedAt,voiceFrames=0
  const tick=()=>{
   if(!active||token!==cycle||!recorder||!analyser)return
   analyser.getByteTimeDomainData(values)
   let sum=0
   for(const value of values){const sample=(value-128)/128;sum+=sample*sample}
   const rms=Math.sqrt(sum/values.length),now=performance.now(),elapsed=now-startedAt
   if(rms>.014){
    voiceFrames++;lastVoiceAt=now
    if(voiceFrames>=4&&!speechStarted){speechStarted=true;emit('ugo:native-voice-state',{state:'hearing',engine:'gemini',reason:'speech-start'})}
   }else if(!speechStarted&&voiceFrames>0)voiceFrames--
   if(speechStarted&&elapsed>450&&now-lastVoiceAt>650){finishCycle(true);return}
   if(elapsed>9000){finishCycle(speechStarted);return}
   if(!speechStarted&&elapsed>5000){finishCycle(false);return}
   raf=requestAnimationFrame(tick)
  }
  raf=requestAnimationFrame(tick)
 }

 async function startCycle(){
  clearRestart()
  if(!active||recorder)return
  const token=++cycle,startedAt=performance.now()
  try{
   if(!stream)stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
   if(!active||token!==cycle)return
   const mime=preferredMime(),current=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)
   recorder=current;chunks=[];sendCurrent=false
   current.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)}
   current.onerror=()=>{if(active&&token===cycle)fail('unavailable')}
   current.onstop=()=>{
    const shouldSend=sendCurrent,blob=new Blob(chunks,{type:current.mimeType||mime||'audio/webm'}),captureMs=performance.now()-startedAt;chunks=[]
    if(!active||token!==cycle)return
    if(shouldSend&&blob.size>1000){void transcribe(blob,token,captureMs)}else{emit('ugo:native-voice-state',{state:'ready',reason:'silence',engine:'gemini'});schedule(()=>void startCycle(),180)}
   }
   const AudioContextCtor=window.AudioContext||(window as any).webkitAudioContext
   if(AudioContextCtor){audioContext=new AudioContextCtor();source=audioContext.createMediaStreamSource(stream);analyser=audioContext.createAnalyser();analyser.fftSize=1024;source.connect(analyser)}
   current.start(200);emit('ugo:native-voice-state',{state:'ready',engine:'gemini',reason:'listening'})
   if(analyser)monitorSilence(token,startedAt);else schedule(()=>finishCycle(true),4000)
  }catch(error:any){console.warn('UGO microphone unavailable',error);fail(error?.name==='NotAllowedError'||error?.name==='SecurityError'?'not-allowed':'unavailable')}
 }

 window.UGOVoiceBridge={
  isAvailable:()=>canRecord(),
  startListening:()=>{if(active){if(!recorder)void startCycle();return}active=true;emit('ugo:native-voice-state',{state:'ready',engine:'gemini'});void startCycle()},
  stopListening:()=>{active=false;cycle++;clearRestart();cleanupAnalysis();const current=recorder;recorder=null;sendCurrent=false;if(current&&current.state!=='inactive'){try{current.stop()}catch{}}releaseStream();emit('ugo:native-voice-state',{state:'ready',engine:'gemini',reason:'stopped'})},
 }
}

if(typeof window!=='undefined')installBrowserBridge()

export{}
