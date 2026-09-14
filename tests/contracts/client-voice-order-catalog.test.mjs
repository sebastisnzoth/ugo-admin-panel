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
 assert.match(matchingMigration,/and not v_secondary_match/)
})

test('client can finish a real request by voice with optional preferred provider without duplicate inserts',()=>{
 assert.match(dock,/from\('servicios'\)\.insert/)
 assert.match(dock,/preferredProviderId/)
 assert.match(dock,/getDispatchProvider\(\)/)
 assert.match(dock,/current\.serviceId=serviceId/)
 assert.match(dock,/dispatch\.getStatus\(serviceId\)/)
 assert.match(dock,/reintentar búsqueda/)
 assert.match(dock,/Confirmo el pedido/)
})

test('search recommendations remain inside the same conversational draft',()=>{
 assert.match(dock,/if\(searchIntent\(clean\)\)/)
 assert.match(dock,/const current:Draft=\{category,description:''/)
 assert.match(dock,/draft\.current=current/)
 assert.match(dock,/availability\.current=await loadVoiceAvailability\(category\)/)
 assert.match(dock,/await askNext\(clean,current,lead\)/)
})

test('natural confirmation and spoken provider aliases do not trap the voice flow',()=>{
 assert.match(dock,/confirmar pedido/)
 assert.match(dock,/function similarity/)
 assert.match(dock,/bestScore>=\.7/)
 assert.match(dock,/missing==='confirm'&&affirmative\(source\)/)
 assert.match(dock,/finishOrder\(current,pt\)/)
})

test('Hugo recommends from real provider signals instead of only listing names',()=>{
 assert.match(catalog,/servicios_completados/)
 assert.match(catalog,/experiencia_anos/)
 assert.match(catalog,/Mi recomendación es/)
 assert.match(catalog,/Por los datos reales de UGO/)
 assert.match(dock,/geminiProviderLead/)
 assert.match(dock,/profesionales_reales/)
})

test('Gemini is the canonical browser transcription path and no-speech is retryable',()=>{
 assert.match(browserVoice,/MediaRecorder/)
 assert.match(browserVoice,/voice_transcription:true/)
 assert.match(browserVoice,/engine:'gemini'/)
 assert.match(browserVoice,/response\.status===422/)
 assert.match(browserVoice,/schedule\(\(\)=>void startCycle\(\),260\)/)
 assert.doesNotMatch(browserVoice,/hasWebSpeech/)
})

test('client Hugo output uses Gemini TTS and never silently switches to browser speech',()=>{
 assert.match(hugoApi,/gemini-3\.1-flash-tts-preview/)
 assert.match(hugoApi,/responseModalities:\['AUDIO'\]/)
 assert.match(hugoApi,/prebuiltVoiceConfig/)
 assert.match(dock,/fetch\('\/api\/hugo\/chat'/)
 assert.match(dock,/tts:true/)
 assert.match(dock,/playGeminiPcm/)
 assert.match(dock,/La voz de Gemini no respondió/)
 assert.doesNotMatch(dock,/SpeechSynthesisUtterance/)
 assert.doesNotMatch(dock,/speechSynthesis/)
})

test('client bridge mounts the dedicated voice ordering dock and contrast layer',()=>{
 assert.match(bridge,/ClientVoiceHugoDock/)
 assert.match(bridge,/ugo-client-contrast\.css/)
})
