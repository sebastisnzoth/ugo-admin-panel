import{useEffect}from'react'

type RecognitionEventLike={results?:ArrayLike<{0?:{transcript?:string};isFinal?:boolean}>;resultIndex?:number}
type RecognitionErrorLike={error?:string}
type RecognitionLike={
 continuous:boolean
 interimResults:boolean
 lang:string
 maxAlternatives:number
 start:()=>void
 stop:()=>void
 abort:()=>void
 onstart:null|(()=>void)
 onspeechstart:null|(()=>void)
 onend:null|(()=>void)
 onresult:null|((event:RecognitionEventLike)=>void)
 onerror:null|((event:RecognitionErrorLike)=>void)
}
type RecognitionCtor=new()=>RecognitionLike
type NativeBridge={startListening:()=>void|Promise<void>;pauseListening?:()=>void;resumeListening?:()=>void|Promise<void>;stopListening:()=>void;isAvailable?:()=>boolean;stopSpeaking?:()=>void;sendToolResponse?:(id:string,name:string,response:Record<string,unknown>)=>boolean}
type VoiceWindow=Window&typeof globalThis&{
 UGOVoiceBridge?:NativeBridge
 SpeechRecognition?:RecognitionCtor
 webkitSpeechRecognition?:RecognitionCtor
}

const emit=(name:string,detail:Record<string,unknown>)=>window.dispatchEvent(new CustomEvent(name,{detail}))
const mapError=(value:string)=>value==='not-allowed'||value==='service-not-allowed'?'not-allowed':value==='audio-capture'?'no-microphone':value==='network'?'network':value||'unavailable'

export function BrowserVoiceBridgeBootstrap(){
 useEffect(()=>{
  const target=window as VoiceWindow
  if(target.UGOVoiceBridge)return
  const Ctor=target.SpeechRecognition||target.webkitSpeechRecognition
  if(!Ctor)return
  let recognition:RecognitionLike|null=null,active=false,paused=false,restarting=false

  const cleanup=()=>{if(!recognition)return;recognition.onstart=null;recognition.onspeechstart=null;recognition.onend=null;recognition.onresult=null;recognition.onerror=null;try{recognition.abort()}catch{}recognition=null}
  const restart=()=>{if(!active||paused||restarting)return;restarting=true;window.setTimeout(()=>{restarting=false;if(active&&!paused)startInternal()},180)}
  const startInternal=()=>{
   cleanup()
   const instance=new Ctor()
   recognition=instance
   instance.continuous=true
   instance.interimResults=true
   instance.lang=navigator.language?.toLowerCase().startsWith('pt')?'pt-BR':'es-AR'
   instance.maxAlternatives=3
   instance.onstart=()=>emit('ugo:native-voice-state',{state:'ready'})
   instance.onspeechstart=()=>emit('ugo:native-voice-state',{state:'hearing'})
   instance.onresult=(event)=>{
    const from=Number(event.resultIndex||0)
    for(let i=from;i<(event.results?.length||0);i++){
     const result=event.results?.[i],text=String(result?.[0]?.transcript||'').trim()
     if(text)emit('ugo:native-voice-result',{text,final:Boolean(result?.isFinal)})
    }
   }
   instance.onerror=(event)=>{
    const code=mapError(String(event.error||''))
    if(active&&(code==='no-speech'||code==='aborted')){restart();return}
    if(code==='network'&&active){emit('ugo:native-voice-state',{state:'connecting'});restart();return}
    active=false
    emit('ugo:native-voice-error',{code})
   }
   instance.onend=()=>{if(active&&!paused)restart()}
   try{instance.start()}catch(error){active=false;emit('ugo:native-voice-error',{code:error instanceof DOMException&&error.name==='NotAllowedError'?'not-allowed':'unavailable'})}
  }

  const bridge:NativeBridge={
   startListening:async()=>{active=true;paused=false;startInternal()},
   pauseListening:()=>{paused=true;try{recognition?.stop()}catch{}},
   resumeListening:async()=>{if(!active)active=true;paused=false;startInternal()},
   stopListening:()=>{active=false;paused=false;cleanup();emit('ugo:native-voice-state',{state:'idle'})},
   isAvailable:()=>Boolean(Ctor),
   stopSpeaking:()=>{try{window.speechSynthesis?.cancel()}catch{}},
  }
  const bridgeHost=target as unknown as{UGOVoiceBridge?:NativeBridge}
  bridgeHost.UGOVoiceBridge=bridge
  return()=>{if(bridgeHost.UGOVoiceBridge===bridge)delete bridgeHost.UGOVoiceBridge;active=false;cleanup()}
 },[])
 return null
}

export default BrowserVoiceBridgeBootstrap
