import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const catalog=await readFile(new URL('../../src/mvp/voiceCatalog.ts',import.meta.url),'utf8')
const radarStore=await readFile(new URL('../../src/mvp/client/providerRadarStore.ts',import.meta.url),'utf8')
const radar=await readFile(new URL('../../src/mvp/ClientQuantumExperience.tsx',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx',import.meta.url),'utf8')
const hugoApi=await readFile(new URL('../../api/hugo/chat.ts',import.meta.url),'utf8')

test('voice categories come from the live UGO catalog',()=>{
 assert.match(catalog,/from\('categorias'\)/)
 assert.match(catalog,/eq\('activa',true\)/)
 assert.match(catalog,/resolveVoiceCategory/)
})

test('voice availability and client cards share one provider radar source of truth',()=>{
 assert.match(catalog,/refreshProviderRadar\(sb,true\)/)
 assert.match(catalog,/providerRadarForCategory\(category\.id,\{onlyAvailable:true\}\)/)
 assert.match(radarStore,/from\('proveedores_mapa'\)/)
 assert.match(radarStore,/provider\.categoria_principal_id!==categoryId/)
 assert.match(radarStore,/provider\.online&&provider\.disponible/)
 assert.match(radar,/setProviderRadarRows\(rows\)/)
 assert.match(radar,/!selectedCategoryId\|\|p\.categoria_principal_id===selectedCategoryId/)
 assert.doesNotMatch(radar,/!p\.categoria_principal_id\|\|p\.categoria_principal_id===selectedCategoryId/)
})

test('client can finish a real request by voice with optional preferred provider',()=>{
 assert.match(dock,/from\('servicios'\)\.insert/)
 assert.match(dock,/preferredProviderId/)
 assert.match(dock,/getDispatchProvider\(\)\.start/)
 assert.match(dock,/Confirmo el pedido/)
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

test('client Hugo speaks through Gemini TTS with browser voice only as fallback',()=>{
 assert.match(hugoApi,/gemini-3\.1-flash-tts-preview/)
 assert.match(hugoApi,/responseModalities:\['AUDIO'\]/)
 assert.match(hugoApi,/prebuiltVoiceConfig/)
 assert.match(dock,/fetch\('\/api\/hugo\/chat'/)
 assert.match(dock,/tts:true/)
 assert.match(dock,/playGeminiPcm/)
 assert.match(dock,/Gemini TTS no disponible; usamos voz local de respaldo/)
})

test('client bridge mounts the dedicated voice ordering dock and contrast layer',()=>{
 assert.match(bridge,/ClientVoiceHugoDock/)
 assert.match(bridge,/ugo-client-contrast\.css/)
})
