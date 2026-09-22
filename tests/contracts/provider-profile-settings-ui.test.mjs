import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider profile settings start compact and use shared actions',async()=>{const src=await read('src/mvp/provider/ProviderProfile.tsx');assert.doesNotMatch(src,/className="provider-setting" open/);assert.doesNotMatch(src,/<button type="button"/);assert.match(src,/<Button variant="ghost" onClick=\{\(\)=>setEditing\(true\)\}>Editar zona y tarifa<\/Button>/);assert.match(src,/Administrar fondos<\/Button>/);assert.match(src,/Abrir soporte de un servicio<\/Button>/)})
