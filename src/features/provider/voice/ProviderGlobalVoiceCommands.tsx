import{useCallback}from'react'
import{emitUgoUiEvent,UGO_UI_EVENTS}from'../../../mvp/uiEvents'
import{useGlobalVoiceCommandListener}from'../../../shared/voice/useGlobalVoiceCommandListener'
import{useProviderData}from'../../../mvp/provider/providerData'
import{useProviderFlow}from'../../../mvp/provider/providerFlow'
import{detectProviderVoiceLocale,findProviderVoiceOpportunity,normalizeProviderVoice,providerVoiceSummary}from'./providerVoiceHelpers'
import{runProviderVoiceCommand}from'./providerVoiceCommands'

export function ProviderGlobalVoiceCommands(){
 const flow=useProviderFlow(),data=useProviderData()
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
   return runProviderVoiceCommand({source,locale:detectProviderVoiceLocale(source),summary:providerVoiceSummary(data),flow:flow.actions,data,findOpportunity:(text)=>findProviderVoiceOpportunity(text,data.opportunities),speak})
  }
  return false
 },[data,flow.actions,speak])
 useGlobalVoiceCommandListener(handle)
 return null
}

export default ProviderGlobalVoiceCommands
