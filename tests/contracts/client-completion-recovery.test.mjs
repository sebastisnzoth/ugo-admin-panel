import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/ClientCompletionReview.tsx',import.meta.url),'utf8')

test('completion payment realtime stays scoped to the authenticated client',()=>{
 assert.match(source,/table:'pagos',filter:`cliente_id=eq\.\$\{userId\}`/)
})

test('completion review rehydrates after subscription reconnect, online and visibility recovery',()=>{
 assert.match(source,/status==='SUBSCRIBED'/)
 assert.match(source,/addEventListener\('online',onOnline\)/)
 assert.match(source,/visibilityState==='visible'/)
})

test('ambiguous final approval treats persisted completed state as success',()=>{
 assert.match(source,/closurePersisted=useCallback/)
 assert.match(source,/\.eq\('id',serviceId\)\.eq\('cliente_id',uid\)\.maybeSingle\(\)/)
 assert.match(source,/return data\?\.estado==='completado'/)
 assert.match(source,/aprobar_servicio[\s\S]*if\(error\)\{if\(await closurePersisted\(serviceId\)\)[\s\S]*await load\(\);return/)
})

test('review load error does not erase a previously known active closure',()=>{
 assert.doesNotMatch(source,/if\(error\)\{setService\(null\)/)
 assert.match(source,/Reintentaremos sin perder el servicio/)
})
