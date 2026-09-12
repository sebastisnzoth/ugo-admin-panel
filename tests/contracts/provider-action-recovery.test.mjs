import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/providerData.tsx',import.meta.url),'utf8')

test('generic provider actions still reload after ambiguous failure',()=>{
 assert.match(source,/const run=[\s\S]*catch\(e\)\{try\{await reload\(\)\}catch\{\}/)
})

test('lifecycle transitions treat persisted target or later state as success',()=>{
 assert.match(source,/LIFECYCLE_ORDER=\['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'\]/)
 assert.match(source,/transitionPersisted=async\(serviceId:string,target:string\)/)
 assert.match(source,/if\(await transitionPersisted\(serviceId,state\)\)[\s\S]*return true/)
})

test('cash confirmation treats persisted released cash payment as success',()=>{
 assert.match(source,/confirmar_pago_efectivo[\s\S]*\.eq\('metodo','efectivo'\)\.eq\('estado','liberado'\)/)
 assert.match(source,/if\(persisted\?\.length\)[\s\S]*return true/)
})

test('provider still blocks departure until a valid payment method is persisted',()=>{
 assert.match(source,/service\.estado==='asignado'&&!funded&&!cashSelected/)
})
