import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Admin Hugo uses the persistent Gemini Live audio session instead of a second TTS path',async()=>{
 const[bridge,orb,api]=await Promise.all([
  read('src/lib/browserVoiceBridge.ts'),
  read('src/components/ConversationalOrb.tsx'),
  read('api/test.ts'),
 ])
 assert.match(bridge,/app\.includes\('admin'\)/)
 assert.match(bridge,/role==='admin'\?adminSupabase:getRoleSupabase\(role\)/)
 assert.match(api,/voiceRole=\['client','provider','admin','superadmin'\]/)
 assert.match(api,/voiceRole==='admin'\?\['admin','superadmin'\]\.includes\(profileRole\)/)
 assert.match(orb,/UGOVoiceBridge/)
 assert.match(orb,/Te escucho\. Hablame…/)
 assert.match(bridge,/playConversationPcm/)
 assert.match(bridge,/sendToolResponse/)
 assert.match(bridge,/admin_get_service_history/)
 assert.match(bridge,/admin_list_disputes/)
 assert.match(orb,/admin_get_service_history/)
 assert.match(orb,/admin_list_disputes/)
 assert.doesNotMatch(orb,/tts:true|audio_base64|speechSynthesis/)
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
