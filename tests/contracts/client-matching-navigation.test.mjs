import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client matching can continue in background without trapping or blocking another request',async()=>{
 const source=await read('src/mvp/client/ClientGuidedRequest.tsx')
 assert.match(source,/function closeMatching\(\)\{setStep\('idle'\);resetComposer\(\);flow\.navigate\('home'\)\}/)
 assert.match(source,/onClick=\{closeMatching\}[^>]*aria-label="Volver y dejar búsqueda en segundo plano"/)
 assert.match(source,/onClick=\{closeMatching\}>Seguir usando UGO/)
 assert.match(source,/if\(step==='idle'\)return <button[^>]+>Pedir un servicio<\/button>/)
 assert.doesNotMatch(source,/if\(hasActive&&step==='idle'\)return null/)
 assert.doesNotMatch(source,/Ya tenés un servicio en curso/)
 assert.doesNotMatch(source,/activeRow&&MATCHING_STATES\.includes\(activeRow\.estado\)/)
})

test('scheduled request cannot be reviewed with a past local datetime',async()=>{
 const source=await read('src/mvp/client/ClientGuidedRequest.tsx')
 assert.match(source,/new Date\(draft\.scheduleAt\)\.getTime\(\)<=Date\.now\(\)/)
 assert.match(source,/min=\{localInputValue\(new Date\(\)\)\}/)
})
