import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const source=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider Hugo receives own work history and today earnings from UGO data',async()=>{
 const api=await source('api/test.ts')
 assert.match(api,/DATOS UGO DEL PROVEEDOR AUTENTICADO/)
 assert.match(api,/TRABAJOS COMPLETADOS HOY/)
 assert.match(api,/GANANCIA NETA HOY/)
 assert.match(api,/ÚLTIMOS TRABAJOS COMPLETADOS/)
 assert.match(api,/nunca digas que no tenés acceso al historial/i)
 assert.match(api,/America\/Sao_Paulo/)
 assert.match(api,/\.eq\('proveedor_id',userId\)/)
})

test('provider Hugo only navigates to earnings or history on explicit navigation intent',async()=>{
 const bridge=await source('src/mvp/provider/ProviderHugoBridge.tsx')
 assert.match(bridge,/ganancias\?\|ganhos\?\|cobros\?\|saldo\|dinheiro/)
 assert.match(bridge,/historial\|atividade\|actividad/)
 assert.match(bridge,/abrir\|abre\|ver\|mostrar\|mostra\|ir/)
 assert.match(bridge,/companion_mode:true/)
})
