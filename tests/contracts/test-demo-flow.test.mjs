import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL(`../../${p}`,import.meta.url),'utf8')
test('TEST demo bypass is explicit and preserves cross-role lifecycle',async()=>{const app=await read('src/mvp/MvpApp.tsx'),demo=await read('src/mvp/UgoTestDemo.tsx');assert.match(app,/if\(demo\)return <Deferred><UgoTestDemo\/>/);assert.match(demo,/ugo-test-demo-flow-v1/);for(const state of['buscando','asignado','en_camino','en_progreso','completado'])assert.match(demo,new RegExp(state));assert.match(demo,/Cliente Demo/);assert.match(demo,/Proveedor Demo/);assert.match(demo,/Datos de demostración locales/);assert.match(demo,/Producción no afectada/)})
