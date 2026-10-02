import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo prompt builder owns role-specific prompting',async()=>{
 const[chat,prompts]=await Promise.all([read('api/hugo/chat.ts'),read('server/hugo/promptBuilder.ts')])
 assert.match(chat,/buildHugoPrompt/)
 assert.doesNotMatch(chat,/Sos Hugo Super Admin|Sos Hugo Admin|CONTEXTO PROVEEDOR REAL/)
 assert.match(prompts,/Sos Hugo Super Admin/)
 assert.match(prompts,/Sos Hugo Admin/)
 assert.match(prompts,/CONTEXTO PROVEEDOR REAL/)
 assert.match(prompts,/CONTEXTO UGO REAL/)
})

test('client and provider prompts remain non-mutating',async()=>{
 const prompts=await read('server/hugo/promptBuilder.ts')
 assert.match(prompts,/Nunca afirmes que el pedido fue creado, confirmado o enviado/)
 assert.match(prompts,/En este fallback conversacional no ejecutes cambios por tu cuenta/)
})

test('admin prompting preserves JSON UI action contract',async()=>{
 const prompts=await read('server/hugo/promptBuilder.ts')
 assert.match(prompts,/Respondé SOLO JSON válido/)
 assert.match(prompts,/"type":"navigate"/)
 assert.match(prompts,/"type":"open_service"/)
 assert.match(prompts,/"type":"map_filter"/)
})

test('prompt builder returns JSON mode only for admin surfaces',async()=>{
 const prompts=await read('server/hugo/promptBuilder.ts')
 assert.match(prompts,/jsonMode:!clientMode&&!providerMode/)
})

test('start message remains role-specific',async()=>{
 const prompts=await read('server/hugo/promptBuilder.ts')
 assert.match(prompts,/Saludá como Hugo Cliente/)
 assert.match(prompts,/Saludá como Hugo Proveedor/)
 assert.match(prompts,/Super Admin':'Admin'/)
})
