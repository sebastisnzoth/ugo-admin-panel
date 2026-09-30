import{useCallback}from'react'
import{emitUgoUiEvent,UGO_UI_EVENTS}from'../../../mvp/uiEvents'
import{normalizeVoiceText}from'../../../mvp/voiceCatalog'
import{useGlobalVoiceCommandListener}from'../../../shared/voice/useGlobalVoiceCommandListener'
import{useClientFlow}from'../flow/clientFlow'

export function ClientGlobalVoiceCommands(){
 const flow=useClientFlow()
 const handle=useCallback(async(source:string,_source?:'native'|'custom',engine?:string)=>{
  const value=normalizeVoiceText(source)
  if(!value)return false
  if(/\b(parar voz|detener voz|cerrar hugo|cancelar escucha|parar escuta|fechar hugo)\b/.test(value)){emitUgoUiEvent(UGO_UI_EVENTS.globalVoiceStop);return true}
  if(/\b(inicio|home|principal|volver al inicio|voltar ao inicio|volver|voltar|atras|atrás)\b/.test(value)){flow.navigate('home');return true}
  if(/\b(perfil|mi cuenta|meu perfil|minha conta)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|lleva|levame|leva)\b/.test(value)){flow.actions.openProfile();return true}
  if(/\b(mis pedidos|meus pedidos|mostrar pedidos|ver pedidos)\b/.test(value)||(/\b(historial|actividad|atividade)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|lleva|levame|leva)\b/.test(value))){flow.actions.openHistory();return true}
  if(/\b(disputa|problema|soporte|suporte|ayuda|ajuda)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|necesito|preciso)\b/.test(value)){flow.actions.openDispute();return true}
  if(/\b(pago|pagos|forma de pago|metodo de pago|pagamento|pagamentos|forma de pagamento)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|cambiar|trocar|ir|lleva|levame|leva)\b/.test(value)){flow.actions.openProfile();window.setTimeout(()=>emitUgoUiEvent(UGO_UI_EVENTS.clientProfilePayment),0);return true}
  if(/\b(direcciones|lugares guardados|enderecos|locais salvos|casa|oficina)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|editar)\b/.test(value)){flow.actions.openProfile();window.setTimeout(()=>emitUgoUiEvent(UGO_UI_EVENTS.clientProfileAddresses),0);return true}
  if(/\b(hugo|asistente|assistente)\b/.test(value)&&/\b(abrir|abre|hablar|falar|escuchar|ouvir)\b/.test(value)){emitUgoUiEvent(UGO_UI_EVENTS.clientHugo);return true}
  if(/\b(nuevo pedido|nuevo servicio|pedir servicio|novo pedido|novo servico|solicitar servico)\b/.test(value)){flow.navigate('request');return true}
  if(/\b(necesito|quiero|busco|preciso|quero|procurando|contratar)\b/.test(value)){
   flow.publishHugoIntent({text:source,categoryHint:null,description:source,urgent:/\b(urgente|agora|ahora|emergencia)\b/.test(value)})
   if(engine==='browser-speech'){try{window.speechSynthesis?.cancel();const utterance=new SpeechSynthesisUtterance(/\b(preciso|quero|procurando|contratar)\b/.test(value)?'Entendi. Abri o pedido com o que você me disse.':'Entendí. Abrí el pedido con lo que me dijiste.');utterance.lang=/\b(preciso|quero|procurando|contratar)\b/.test(value)?'pt-BR':'es-AR';window.speechSynthesis?.speak(utterance)}catch{}}
   return true
  }
  return false
 },[flow])
 useGlobalVoiceCommandListener(handle)
 return null
}

export default ClientGlobalVoiceCommands
