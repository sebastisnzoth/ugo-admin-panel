import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')
test('stale provider radar offers user-initiated fresh GPS recovery without changing availability',async()=>{
 const source=await read('src/mvp/ProviderLocationTracker.tsx')
 assert.match(source,/const manualRefreshRef=useRef<\(\(\)=>Promise<void>\)\|null>\(null\)/)
 assert.match(source,/manualRefreshRef\.current=\(\)=>acquire\(true\)/)
 assert.match(source,/const pos=await getFreshBrowserPosition\(\)/)
 assert.match(source,/await publish\(pos,force\)/)
 assert.match(source,/rpc\.rpc\('publicar_ubicacion_disponibilidad_proveedor'/)
 assert.match(source,/if\(!available\)return null/)
 assert.match(source,/if\(idleGpsStale\)return/)
 assert.equal((source.match(/className="provider-gps-retry-button"/g)||[]).length,2)
 assert.match(source,/disabled=\{refreshingGps\} onClick=\{refreshGps\}/)
 assert.doesNotMatch(source,/manualRefreshRef\.current=\(\)=>.*activar_disponibilidad_proveedor/)
})
test('trust guards and localized recovery remain in place',async()=>{
 const [source,translation,style]=await Promise.all([read('src/mvp/ProviderLocationTracker.tsx'),read('src/i18n/translations/recovery.ts'),read('src/mvp/provider/provider-responsive-hardening.css')])
 for(const name of ['usableBrowserPosition','MAX_ACCEPTABLE_ACCURACY_M=250','MAX_POSITION_AGE_MS=30_000','MATCHING_POSITION_AGE_MS=90_000','publicar_ubicacion_disponibilidad_proveedor'])assert.ok(source.includes(name),name)
 for(const [name,label] of [['pt-BR','Atualizar GPS'],['es','Actualizar GPS'],['en','Refresh GPS']]){
  assert.ok(translation.includes('"'+name+'": {'),name)
  assert.ok(translation.includes('"providerGps.refreshNow": "'+label+'"'),label)
 }
 assert.match(style,/\.provider-gps-retry-button\{[^}]*min-height:44px/)
})
