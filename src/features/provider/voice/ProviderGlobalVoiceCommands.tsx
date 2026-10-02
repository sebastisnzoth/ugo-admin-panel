import{useCallback,useRef}from'react'
import{emitUgoUiEvent,UGO_UI_EVENTS}from'../../../mvp/uiEvents'
import{useGlobalVoiceCommandListener}from'../../../shared/voice/useGlobalVoiceCommandListener'
import{useProviderData}from'../../../mvp/provider/providerData'
import{useProviderFlow}from'../../../mvp/provider/providerFlow'
import{detectProviderVoiceLocale,findProviderVoiceOpportunity,normalizeProviderVoice,providerVoiceContext,providerVoiceSummary}from'./providerVoiceHelpers'
import{runProviderVoiceCommand}from'./providerVoiceCommands'
import{getRoleSupabase}from'../../../lib/roleSupabase'
import{getHugoRuntimeUrl}from'../../../lib/hugoEdgeRuntime'

type ProviderAiAction={type?:unknown;target?:unknown;service_id?:unknown;status?:unknown}
type ActionResult={ok:boolean;message:string}

export function ProviderGlobalVoiceCommands(){
 const flow=useProviderFlow(),data=useProviderData()
 const conversation=useRef<Array<{role:'user'|'assistant';content:string}>>([])
 const remember=useCallback((role:'user'|'assistant',content:string)=>{const text=content.trim();if(!text)return;conversation.current=[...conversation.current,{role,content:text}].slice(-8)},[])
 const executeAiAction=useCallback(async(action:unknown):Promise<ActionResult|null>=>{
  if(!action||typeof action!=='object'||Array.isArray(action))return null
  const value=action as ProviderAiAction,type=String(value.type||'')
  if(type==='navigate'){
   const target=String(value.target||'')
   const nav:Record<string,()=>void>={home:flow.actions.openHome,demand:flow.actions.openDemand,opportunities:flow.actions.openOpportunities,agenda:flow.actions.openAgenda,earnings:flow.actions.openEarnings,profile:flow.actions.openProfile,history:flow.actions.openHistory,dispute:()=>flow.actions.openDispute(),'active-job':flow.actions.openActiveJob}
   const fn=nav[target]
   if(!fn)return{ok:false,message:'No reconozco ese destino.'}
   fn()
   return{ok:true,message:'Listo.'}
  }
  if(['set_online','set_offline','accept_job','reject_job','update_service_status'].includes(type))return{ok:false,message:'Por seguridad, Hugo no ejecuta cambios de trabajo desde una respuesta de IA. Repetí el comando directo para confirmarlo en UGO.'}
  return{ok:false,message:'La acción propuesta por Hugo no está permitida.'}
 },[flow.actions])
 const speak=useCallback(async(text:string)=>{try{window.speechSynthesis?.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=detectProviderVoiceLocale(text);window.speechSynthesis?.speak(utterance)}catch{}},[])
 const handle=useCallback(async(source:string,_source?:'native'|'custom',engine?:string)=>{
  const value=normalizeProviderVoice(source)
  if(!value)return false
  if(/\b(parar voz|detener voz|cerrar hugo|cancelar escucha|parar escuta|fechar hugo)\b/.test(value)){emitUgoUiEvent(UGO_UI_EVENTS.globalVoiceStop);return true}
  if(/\b(inicio|home|principal|volver|voltar|atras|atrás)\b/.test(value)){flow.actions.openHome();return true}
  if(/\b(demanda|radar|zonas?)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openDemand();return true}
  if(/\b(mis pedidos|meus pedidos|mostrar pedidos|ver pedidos)\b/.test(value)||(/\b(pedidos?|oportunidades?|ofertas?)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value))){flow.actions.openOpportunities();return true}
  if(/\b(agenda|calendario)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openAgenda();return true}
  if(/\b(ganancias?|ganhos?|cobros?|saldo|dinheiro)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openEarnings();return true}
  if(/\b(perfil|cuenta|conta)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openProfile();return true}
  if(/\b(historial|historico|atividade|actividad)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openHistory();return true}
  if(/\b(disputa|problema|soporte|suporte|ayuda|ajuda)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|preciso|necesito)\b/.test(value)){flow.actions.openDispute();return true}
  if(/\b(trabalho atual|trabajo actual|servicio actual|servico atual|mision|missao)\b/.test(value)){data.service?flow.actions.openActiveJob():flow.actions.openAgenda();return true}
  if(engine==='browser-speech'){
   const handled=await runProviderVoiceCommand({source,locale:detectProviderVoiceLocale(source),summary:providerVoiceSummary(data),flow:flow.actions,data,findOpportunity:(text)=>findProviderVoiceOpportunity(text,data.opportunities),speak})
   if(handled)return true
   try{
    const sb=getRoleSupabase('provider'),{data:{session}}=await sb.auth.getSession()
    if(!session)return false
    const context=providerVoiceContext(data,flow.screen),history=conversation.current
    const response=await fetch(getHugoRuntimeUrl('/api/hugo/chat'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({message:source,role:'provider',surface:'provider',context,history})}),payload=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(String(payload?.hugo_mensaje||payload?.error||'Hugo no respondió'))
    const reply=String(payload?.hugo_mensaje||'').trim(),actionResult=await executeAiAction(payload?.provider_action),spoken=actionResult?.message||reply
    if(spoken){remember('user',source);remember('assistant',spoken);await speak(spoken);return true}
   }catch(error){console.warn('Hugo provider conversational fallback failed',error)}
  }
  return false
 },[data,executeAiAction,flow.actions,flow.screen,remember,speak])
 useGlobalVoiceCommandListener(handle)
 return null
}

export default ProviderGlobalVoiceCommands
