import{useCallback}from'react'
import{useGlobalVoiceCommandListener}from'../../../shared/voice/useGlobalVoiceCommandListener'
import{useProviderData}from'../../../mvp/provider/providerData'
import{useProviderFlow}from'../../../mvp/provider/providerFlow'
import{normalizeProviderVoice}from'./providerVoiceHelpers'

export function ProviderGlobalVoiceCommands(){
 const flow=useProviderFlow(),data=useProviderData()
 const handle=useCallback(async(source:string)=>{
  const value=normalizeProviderVoice(source)
  if(!value)return false
  if(/\b(inicio|home|principal)\b/.test(value)){flow.actions.openHome();return true}
  if(/\b(demanda|radar|zonas?)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openDemand();return true}
  if(/\b(pedidos?|oportunidades?|ofertas?)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openOpportunities();return true}
  if(/\b(agenda|calendario)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openAgenda();return true}
  if(/\b(ganancias?|ganhos?|cobros?|saldo|dinheiro)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openEarnings();return true}
  if(/\b(perfil|cuenta|conta)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openProfile();return true}
  if(/\b(historial|historico|atividade|actividad)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|leva|lleva)\b/.test(value)){flow.actions.openHistory();return true}
  if(/\b(disputa|problema|soporte|suporte|ayuda|ajuda)\b/.test(value)&&/\b(abrir|abre|ver|mostrar|ir|preciso|necesito)\b/.test(value)){flow.actions.openDispute();return true}
  if(/\b(trabalho atual|trabajo actual|servicio actual|servico atual|mision|missao)\b/.test(value)){data.service?flow.actions.openActiveJob():flow.actions.openAgenda();return true}
  if((/\b(online|disponible)\b/.test(value)&&/\b(ponerme|poneme|ficar|quedar|activar|ativar|modo)\b/.test(value))||value==='online'){if(!data.online)await data.toggleOnline();return true}
  if((/\b(offline|desconectado)\b/.test(value)&&/\b(ponerme|poneme|ficar|quedar|activar|ativar|modo)\b/.test(value))||value==='offline'){if(data.online)await data.toggleOnline();return true}
  return false
 },[data,flow.actions])
 useGlobalVoiceCommandListener(handle)
 return null
}

export default ProviderGlobalVoiceCommands
