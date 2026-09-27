import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider live tracker rejects inaccurate and stale GPS before backend writes or auto-arrival',async()=>{const s=await read('src/mvp/ProviderLocationTracker.tsx');assert.match(s,/MAX_ACCEPTABLE_ACCURACY_M=250/);assert.match(s,/MAX_POSITION_AGE_MS=30_000/);assert.match(s,/accuracy>MAX_ACCEPTABLE_ACCURACY_M/);assert.match(s,/age>MAX_POSITION_AGE_MS/);const accuracy=s.indexOf('accuracy>MAX_ACCEPTABLE_ACCURACY_M'),arrivalRpc=s.indexOf("rpc.rpc('publicar_ubicacion_proveedor'"),availabilityRpc=s.indexOf("rpc.rpc('publicar_ubicacion_disponibilidad_proveedor'");assert.ok(accuracy>0&&arrivalRpc>accuracy&&availabilityRpc>accuracy,'GPS quality gate must run before trusted location RPCs')})
