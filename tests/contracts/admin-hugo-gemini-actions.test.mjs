import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Admin Hugo keeps Gemini Live primary and isolates TTS to browser-speech fallback',async()=>{
 const[bridge,orb,api]=await Promise.all([
  read('src/lib/browserVoiceBridge.ts'),
  read('src/components/ConversationalOrb.tsx'),
  read('api/test.ts'),
 ])
 assert.match(bridge,/app\.includes\('admin'\)/)
 assert.match(bridge,/role==='admin'\|\|role==='superadmin'\?adminSupabase:getRoleSupabase\(role\)/)
 assert.match(api,/voiceRole=\['client','provider','admin','superadmin'\]/)
 assert.match(api,/voiceRole==='admin'\?\['admin','superadmin'\]\.includes\(profileRole\)/)
 assert.match(orb,/UGOVoiceBridge/)
 assert.match(orb,/Te escucho\. Hablame…/)
 assert.match(bridge,/playConversationPcm/)
 assert.match(bridge,/sendToolResponse/)
 assert.doesNotMatch(orb,/tts:true|audio_base64/)
 assert.match(orb,/detail\.engine==='browser-speech'/)
 assert.match(orb,/SpeechSynthesisUtterance/)
})

test('Admin Hugo reads the operational domains exposed across the control center',async()=>{
 const orb=await read('src/components/ConversationalOrb.tsx')
 for(const source of ['mapa_operativo_usuarios','mapa_operativo_servicios','servicio_estado_eventos','resenas','mensajes','config_sistema','development_checklist','development_incidents']){
  assert.match(orb,new RegExp("from\\('"+source+"'\\)"))
 }
 assert.match(orb,/mapa_operativo/)
 assert.match(orb,/timeline_estados/)
 assert.match(orb,/calificaciones/)
 assert.match(orb,/readiness/)
 assert.match(orb,/incidentes/)
 assert.match(orb,/fuentes_no_disponibles/)
})

test.skip('legacy HTTP Hugo UI-action path is outside the Gemini Live voice happy path',async()=>{
 const api=await read('api/hugo/chat.ts')
 assert.match(api,/NAV_TARGETS/)
 for(const action of ['navigate','open_service','refresh','map_filter'])assert.match(api,new RegExp(action))
 assert.match(api,/responseMimeType:'application\/json'/)
 assert.match(api,/ui_action:action/)
 assert.doesNotMatch(api,/type:'delete'/)
 assert.doesNotMatch(api,/type:'transfer'/)
})

test.skip('legacy HTTP Hugo UI-action bus is outside the Gemini Live voice happy path',async()=>{
 const[phase,map,orb]=await Promise.all([
  read('src/mvp/AdminPhase2.tsx'),
  read('src/components/MapaOperativo.tsx'),
  read('src/components/ConversationalOrb.tsx'),
 ])
 assert.match(orb,/ugo:admin:hugo-action/)
 assert.match(phase,/addEventListener\('ugo:admin:hugo-action'/)
 assert.match(phase,/action\.type==='open_service'/)
 assert.match(phase,/eq\('numero',number\)/)
 assert.match(phase,/ugo:admin:map-command/)
 assert.match(map,/addEventListener\('ugo:admin:map-command'/)
 assert.match(map,/setStatus\(command\.status\)/)
 assert.match(map,/setShowProv\(command\.show_providers\)/)
 assert.match(map,/setShowCli\(command\.show_clients\)/)
 assert.match(map,/setGeoRadius/)
})


test('Admin Hugo Gemini Live exposes only bounded safe UI actions',async()=>{
 const[bridge,orb,phase]=await Promise.all([
  read('src/lib/browserVoiceBridge.ts'),
  read('src/components/ConversationalOrb.tsx'),
  read('src/mvp/AdminPhase2.tsx'),
 ])
 for(const tool of ['admin_navigate','admin_open_service','admin_refresh'])assert.match(bridge,new RegExp(tool))
 assert.match(bridge,/Abre un módulo autorizado del panel Admin sin modificar datos/)
 assert.match(bridge,/No modifiques estados, dinero, usuarios, KYC, disputas ni configuración por voz/)
 assert.match(orb,/ADMIN_NAV_TARGETS/)
 assert.match(orb,/INVALID_TARGET/)
 assert.match(orb,/SERVICE_NOT_FOUND/)
 assert.match(orb,/ugo:admin:hugo-action/)
 assert.match(orb,/type:'navigate'/)
 assert.match(orb,/type:'open_service'/)
 assert.match(orb,/type:'refresh'/)
 assert.match(phase,/addEventListener\('ugo:admin:hugo-action'/)
 assert.match(phase,/action\.type==='navigate'/)
 assert.match(phase,/action\.type==='open_service'/)
 assert.match(phase,/action\.type==='refresh'/)
 assert.doesNotMatch(bridge,/admin_update_service|admin_set_status|admin_transfer|admin_delete/)
})


test('admin Hugo browser-speech fallback still answers through the authorized Hugo API',async()=>{
 const src=await readFile(new URL('../../src/components/ConversationalOrb.tsx',import.meta.url),'utf8')
 assert.match(src,/detail\.engine==='browser-speech'/)
 assert.match(src,/getHugoRuntimeUrl\('\/api\/hugo\/chat'\)/)
 assert.match(src,/Authorization:'Bearer '\+session\.access_token/)
 assert.match(src,/ugo:admin:hugo-action/)
 assert.match(src,/SpeechSynthesisUtterance/)
})
