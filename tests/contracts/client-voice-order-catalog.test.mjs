import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const catalog=await readFile(new URL('../../src/mvp/voiceCatalog.ts',import.meta.url),'utf8')
const radarStore=await readFile(new URL('../../src/mvp/client/providerRadarStore.ts',import.meta.url),'utf8')
const radar=await readFile(new URL('../../src/mvp/ClientQuantumExperience.tsx',import.meta.url),'utf8')
const radarBridge=await readFile(new URL('../../src/mvp/client/ClientProviderRadarBridge.tsx',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx',import.meta.url),'utf8')
const browserVoice=await readFile(new URL('../../src/lib/browserVoiceBridge.ts',import.meta.url),'utf8')
const hugoApi=await readFile(new URL('../../api/hugo/chat.ts',import.meta.url),'utf8')
const intent=await readFile(new URL('../../src/mvp/client/hugoVoiceIntent.ts',import.meta.url),'utf8')
const multirubroMigration=await readFile(new URL('../../supabase/migrations/20260914210000_provider_radar_multirubro_view.sql',import.meta.url),'utf8')
const matchingMigration=await readFile(new URL('../../supabase/migrations/20260914212500_matching_multirubro_consistency.sql',import.meta.url),'utf8')

test('voice categories come from the live UGO catalog',()=>{
 assert.match(catalog,/from\('categorias'\)/)
 assert.match(catalog,/eq\('activa',true\)/)
 assert.match(catalog,/resolveVoiceCategory/)
})

test('voice availability and client cards share one multirubro provider source of truth',()=>{
 assert.match(catalog,/refreshProviderRadar\(sb,true\)/)
 assert.match(catalog,/providerRadarForCategory\(category\.id,\{onlyAvailable:true\}\)/)
 assert.match(radarStore,/from\('proveedores_mapa'\)/)
 assert.match(radarStore,/categoryIds\.includes\(categoryId\)/)
 assert.match(radarStore,/provider\.online&&provider\.disponible/)
 assert.match(radar,/setProviderRadarRows\(rows\)/)
 assert.match(radar,/p\.categoria_ids\.includes\(selectedCategoryId\)/)
 assert.match(radarBridge,/categories\.find\(item=>item\.id===selectedCategoryId\)\|\|intentCategory/)
 assert.match(multirubroMigration,/as categoria_ids/)
 assert.match(multirubroMigration,/proveedor_subcategorias/)
})

test('automatic and directed matching honor active provider rubros',()=>{
 assert.match(matchingMigration,/create or replace function private\.iniciar_matching_impl/)
 assert.match(matchingMigration,/create or replace function public\.iniciar_matching_dirigido/)
 assert.match(matchingMigration,/public\.proveedor_subcategorias/)
 assert.match(matchingMigration,/sc\.categoria_id=v_servicio\.categoria_id/)
 assert.match(matchingMigration,/v_secondary_match/)
})

test('client can finish a real request by voice without duplicate inserts',()=>{
 assert.match(dock,/from\('servicios'\)\.insert/)
 assert.match(dock,/preferredProviderId/)
 assert.match(dock,/getDispatchProvider\(\)/)
 assert.match(dock,/current\.serviceId=serviceId/)
 assert.match(dock,/dispatch\.getStatus\(serviceId\)/)
 assert.match(dock,/23505/)
 assert.match(dock,/reintentar búsqueda/)
 assert.match(dock,/Confirmo el pedido/)
})

test('search recommendations stay in the same draft and avoid a serial Gemini text round trip',()=>{
 assert.match(dock,/if\(searchIntent\(clean\)\)/)
 assert.match(dock,/draft\.current=current/)
 assert.match(dock,/availability\.current=await loadVoiceAvailability\(category\)/)
 assert.match(dock,/voiceAvailabilityText\(availability\.current,locale\.current\)/)
 assert.doesNotMatch(dock,/geminiProviderLead/)
})

test('natural confirmation and provider aliases use shared behavioral intent helpers',()=>{
 assert.match(dock,/chooseHugoProvider/)
 assert.match(dock,/isHugoAffirmative/)
 assert.match(dock,/missing==='confirm'&&isHugoAffirmative\(source\)/)
 assert.match(intent,/parseHugoWhen/)
 assert.match(intent,/resolveHugoGlobalCommand/)
})

test('Hugo recommends only from real provider signals',()=>{
 assert.match(catalog,/servicios_completados/)
 assert.match(catalog,/experiencia_anos/)
 assert.match(catalog,/Mi recomendación es/)
 assert.match(catalog,/Por los datos reales de UGO/)
 assert.match(dock,/voiceAvailabilityText/)
})

test('Gemini is the canonical browser transcription path and restarts quickly after a turn',()=>{
 assert.match(browserVoice,/MediaRecorder/)
 assert.match(browserVoice,/voice_transcription:true/)
 assert.match(browserVoice,/capture_ms/)
 assert.match(browserVoice,/response\.status===422/)
 assert.match(browserVoice,/waitForConsumer=.*450/)
 assert.match(browserVoice,/reason:'speech-start'/)
 assert.doesNotMatch(browserVoice,/12000/)
 assert.doesNotMatch(browserVoice,/hasWebSpeech/)
})

test('client Hugo output uses fast Gemini TTS with abortable nonblocking playback',()=>{
 assert.match(hugoApi,/gemini-2\.5-flash-preview-tts/)
 assert.match(hugoApi,/gemini-3\.1-flash-tts-preview/)
 assert.match(hugoApi,/responseModalities:\['AUDIO'\]/)
 assert.match(hugoApi,/Hugo TTS timing/)
 assert.match(dock,/AbortController/)
 assert.match(dock,/stopSpeechPlayback/)
 assert.match(dock,/signal:controller\.signal/)
 assert.match(dock,/Podés seguir hablando o escribiendo/)
 assert.doesNotMatch(dock,/SpeechSynthesisUtterance/)
 assert.doesNotMatch(dock,/speechSynthesis/)
 assert.doesNotMatch(dock,/for\(let attempt=0/)
})

test('stop voice leaves the text composer usable and navigation is wired to ClientFlow',()=>{
 assert.match(dock,/inputRef\.current\?\.focus\(\)/)
 assert.match(dock,/placeholder="Escribile a Hugo…"/)
 assert.match(dock,/onNavigateHome/)
 assert.doesNotMatch(dock,/disabled=\{state==='connecting'\}/)
 assert.match(bridge,/onNavigateHome=\{\(\)=>flow\.navigate\('home'\)\}/)
})
