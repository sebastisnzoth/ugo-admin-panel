import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client provider radar reads only verified providers and category availability from the shared store',async()=>{
 const store=await read('src/mvp/client/providerRadarStore.ts')
 assert.match(store,/from\('proveedores_mapa'\)/)
 assert.match(store,/\.eq\('estado_verificacion','verificado'\)/)
 assert.match(store,/row=>row\.estado_verificacion==='verificado'/)
 assert.match(store,/provider\.online&&provider\.disponible/)
 assert.match(store,/categoria_principal_id!==categoryId&&!categoryIds\.includes\(categoryId\)/)
})

test('client provider radar resyncs and recreates its realtime channel after transport gaps',async()=>{
 const bridge=await read('src/mvp/client/ClientProviderRadarBridge.tsx')
 assert.match(bridge,/const\[channelEpoch,setChannelEpoch\]=useState\(0\)/)
 assert.match(bridge,/table:'perfiles_proveedor'/)
 assert.match(bridge,/client-provider-radar-\$\{session\.user\.id\}-\$\{channelEpoch\}/)
 assert.match(bridge,/status==='SUBSCRIBED'/)
 assert.match(bridge,/status==='CHANNEL_ERROR'\|\|status==='TIMED_OUT'/)
 assert.match(bridge,/const reconnect=\(\)=>/)
 assert.match(bridge,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(bridge,/void refresh\(\);reconnect\(\)/)
 assert.match(bridge,/window\.setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'&&navigator\.onLine\)void refresh\(\)\},15000\)/)
 assert.match(bridge,/window\.addEventListener\('online',onOnline\)/)
 assert.match(bridge,/document\.addEventListener\('visibilitychange',onVisibility\)/)
 assert.match(bridge,/removeChannel\(ch\)/)
 assert.match(bridge,/\},\[channelEpoch,session,supabase\]\)/)
})

test('provider radar operational failures report to Sentinel without browser-owned readiness mutation',async()=>{
 const[bridge,migration]=await Promise.all([
  read('src/mvp/client/ClientProviderRadarBridge.tsx'),
  read('supabase/migrations/20260916005000_sentinel_client_radar_classification.sql'),
 ])
 assert.match(bridge,/action:'client\.provider_radar\.sync'/)
 assert.match(bridge,/severity:'P1'/)
 assert.match(bridge,/checklistCode:'MATCH-ONLINE'/)
 assert.match(migration,/p_action in \('client\.request\.matching','client\.provider_radar\.sync'\) then 'MATCH-ONLINE'/)
 assert.doesNotMatch(migration,/update public\.development_checklist/)
})
