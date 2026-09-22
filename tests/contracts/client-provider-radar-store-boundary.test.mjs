import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider radar store is canonical behind the client radar feature boundary',async()=>{
 const[store,shim,home]=await Promise.all([
  read('src/features/client/radar/providerRadarStore.ts'),
  read('src/mvp/client/providerRadarStore.ts'),
  read('src/features/client/home/ClientHomeScreen.tsx')
 ])
 assert.match(store,/export async function refreshProviderRadar/)
 assert.match(store,/export function providerRadarForCategory/)
 assert.match(shim,/features\/client\/radar\/providerRadarStore/)
 assert.doesNotMatch(shim,/from\('proveedores_mapa'\)/)
 assert.match(home,/\.\.\/radar\/providerRadarStore/)
})
