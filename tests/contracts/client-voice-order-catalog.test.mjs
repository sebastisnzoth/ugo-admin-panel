import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const catalog=await readFile(new URL('../../src/mvp/voiceCatalog.ts',import.meta.url),'utf8')
const radarStore=await readFile(new URL('../../src/mvp/client/providerRadarStore.ts',import.meta.url),'utf8')
const radar=await readFile(new URL('../../src/mvp/ClientQuantumExperience.tsx',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/mvp/client/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
const bridge=await readFile(new URL('../../src/mvp/client/ClientHugoBridge.tsx',import.meta.url),'utf8')

test('voice categories come from the live UGO catalog',()=>{
 assert.match(catalog,/from\('categorias'\)/)
 assert.match(catalog,/eq\('activa',true\)/)
 assert.match(catalog,/resolveVoiceCategory/)
})

test('voice availability and client cards share one provider radar source of truth',()=>{
 assert.match(catalog,/refreshProviderRadar\(sb\)/)
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

test('client bridge mounts the dedicated voice ordering dock and contrast layer',()=>{
 assert.match(bridge,/ClientVoiceHugoDock/)
 assert.match(bridge,/ugo-client-contrast\.css/)
})