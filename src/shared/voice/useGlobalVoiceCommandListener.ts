import{useEffect,useRef}from'react'

export const GLOBAL_VOICE_COMMAND_EVENT='ugo:global-voice-command'
export const GLOBAL_VOICE_COMMAND_HANDLED_EVENT='ugo:global-voice-command-handled'

type VoiceCommandSource='native'|'custom'
type VoiceCommandDetail={text?:string;final?:boolean}
type Handler=(text:string,source:VoiceCommandSource)=>boolean|Promise<boolean>

export function useGlobalVoiceCommandListener(handler:Handler,enabled=true){
 const handlerRef=useRef(handler),lastRef=useRef({text:'',at:0}),busyRef=useRef(false)
 handlerRef.current=handler
 useEffect(()=>{
  if(!enabled)return
  const consume=async(text:string,source:VoiceCommandSource)=>{
   const value=String(text||'').trim()
   if(!value||busyRef.current)return
   const now=Date.now(),last=lastRef.current
   if(last.text===value&&now-last.at<1200)return
   lastRef.current={text:value,at:now}
   busyRef.current=true
   let handled=false
   try{handled=Boolean(await handlerRef.current(value,source))}
   catch(error){console.error('UGO global voice command failed',error)}
   finally{
    busyRef.current=false
    window.dispatchEvent(new CustomEvent(GLOBAL_VOICE_COMMAND_HANDLED_EVENT,{detail:{text:value,source,handled}}))
   }
  }
  const native=(event:Event)=>{
   const detail=(event as CustomEvent<VoiceCommandDetail>).detail||{}
   if(detail.final===false)return
   void consume(String(detail.text||''),'native')
  }
  const custom=(event:Event)=>{
   const detail=(event as CustomEvent<VoiceCommandDetail>).detail||{}
   void consume(String(detail.text||''),'custom')
  }
  window.addEventListener('ugo:native-voice-result',native)
  window.addEventListener(GLOBAL_VOICE_COMMAND_EVENT,custom)
  return()=>{
   window.removeEventListener('ugo:native-voice-result',native)
   window.removeEventListener(GLOBAL_VOICE_COMMAND_EVENT,custom)
  }
 },[enabled])
}
