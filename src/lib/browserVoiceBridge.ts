import{getRoleSupabase}from'./roleSupabase'

type BrowserVoiceBridge={startListening:()=>void;stopListening:()=>void;isAvailable:()=>boolean}

declare global{interface Window{UGOVoiceBridge?:BrowserVoiceBridge}}

const hasWebSpeech=()=>Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition)
const canFallback=()=>Boolean(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder)
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
 if(typeof window==='undefined'||window.UGOVoiceBridge||hasWebSpeech()||!canFallback())return
 let active=false,stream:MediaStream|null=null,recorder:MediaRecorder|null=null,chunks:BlobPart[]=[],audioContext:AudioContext|null=null,source:MediaStreamAudioSourceNode|null=null,analyser:AnalyserNode|null=null,raf=0,restartTimer=0,cycle=0,sendCurrent=false

 const clearRestart=()=>{if(restartTimer){window.clearTimeout(restartTimer);restartTimer=0}}
 const cleanupAnalysis=()=>{if(raf)cancelAnimationFrame(raf);raf=0;try{source?.disconnect()}catch{}source=null;analyser=null;if(audioContext){void audioContext.close().catch(()=>{});audioContext=null}}
 const releaseStream=()=>{stream?.getTracks().forEach(track=>track.stop());stream=null}
 const fail=(code:string)=>{active=false;clearRestart();cleanupAnalysis();releaseStream();recorder=null;emit('ugo:native-voice-error',{code})}
 const schedule=(fn:()=>void,ms:number)=>{clearRestart();restartTimer=window.setTimeout(fn,ms)}

 const waitForHugoThenResume=(token:number)=>{
  const started=Date.now();let heardHugo=false
  const poll=()=>{
   if(!active||token!==cycle)return
   const speaking=Boolean(window.speechSynthesis?.speaking)
   if(speaking)heardHugo=true
   if(heardHugo&&!speaking){schedule(()=>void startCycle(),550);return}
   if(Date.now()-started>15000){schedule(()=>void startCycle(),350);return}
   schedule(poll,140)
  }
  schedule(poll,140)
 }

 const transcribe=async(blob:Blob,token:number)=>{
  if(!active||token!==cycle)return
  try{
   emit('ugo:native-voice-state',{state:'ready'})
   const sb=getRoleSupabase('client'),{data:sessionData}=await sb.auth.getSession(),accessToken=sessionData.session?.access_token
   if(!accessToken)throw new Error('Sesión de cliente no disponible')
   const audio=await blobToBase64(blob)
   const response=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({role:'client',voice_transcription:true,audio_base64:audio,mime_type:apiMime(blob.type)})})
   const data=await response.json().catch(()=>({})) as{transcript?:string;error?:string}
   if(!response.ok)throw new Error(data.error||`Voice ${response.status}`)
   const text=String(data.transcript||'').trim()
   if(!active||token!==cycle)return
   if(text){emit('ugo:native-voice-result',{text,final:true});waitForHugoThenResume(token)}else schedule(()=>void startCycle(),350)
  }catch(error){console.warn('UGO browser voice fallback failed',error);if(active&&token===cycle)fail('unavailable')}
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
  const values=new Uint8Array(analyser.fftSize);let speechStarted=false,lastVoiceAt=startedAt
  const tick=()=>{
   if(!active||token!==cycle||!recorder||!analyser)return
   analyser.getByteTimeDomainData(values)
   let sum=0
   for(const value of values){const sample=(value-128)/128;sum+=sample*sample}
   const rms=Math.sqrt(sum/values.length),now=performance.now(),elapsed=now-startedAt
   if(rms>.022){speechStarted=true;lastVoiceAt=now}
   if(speechStarted&&elapsed>700&&now-lastVoiceAt>850){finishCycle(true);return}
   if(elapsed>10000){finishCycle(speechStarted);return}
   if(!speechStarted&&elapsed>7000){finishCycle(false);return}
   raf=requestAnimationFrame(tick)
  }
  raf=requestAnimationFrame(tick)
 }

 async function startCycle(){
  clearRestart()
  if(!active||recorder)return
  if(window.speechSynthesis?.speaking){schedule(()=>void startCycle(),220);return}
  const token=++cycle
  try{
   if(!stream)stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
   if(!active||token!==cycle)return
   const mime=preferredMime(),current=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)
   recorder=current;chunks=[];sendCurrent=false
   current.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)}
   current.onerror=()=>{if(active&&token===cycle)fail('unavailable')}
   current.onstop=()=>{
    const shouldSend=sendCurrent,blob=new Blob(chunks,{type:current.mimeType||mime||'audio/webm'});chunks=[]
    if(!active||token!==cycle)return
    if(shouldSend&&blob.size>1000){void transcribe(blob,token)}else schedule(()=>void startCycle(),280)
   }
   const AudioContextCtor=window.AudioContext||(window as any).webkitAudioContext
   if(AudioContextCtor){audioContext=new AudioContextCtor();source=audioContext.createMediaStreamSource(stream);analyser=audioContext.createAnalyser();analyser.fftSize=1024;source.connect(analyser)}
   current.start(250);emit('ugo:native-voice-state',{state:'hearing'})
   if(analyser)monitorSilence(token,performance.now());else schedule(()=>finishCycle(true),5000)
  }catch(error:any){console.warn('UGO microphone unavailable',error);fail(error?.name==='NotAllowedError'||error?.name==='SecurityError'?'not-allowed':'unavailable')}
 }

 window.UGOVoiceBridge={
  isAvailable:()=>canFallback(),
  startListening:()=>{if(active)return;active=true;emit('ugo:native-voice-state',{state:'ready'});void startCycle()},
  stopListening:()=>{active=false;cycle++;clearRestart();cleanupAnalysis();const current=recorder;recorder=null;sendCurrent=false;if(current&&current.state!=='inactive'){try{current.stop()}catch{}}releaseStream();emit('ugo:native-voice-state',{state:'ready'})},
 }
}

if(typeof window!=='undefined')installBrowserBridge()

export{}
