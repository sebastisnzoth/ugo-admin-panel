import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Node Hugo open_service accepts only canonical UUIDs or finite service numbers',async()=>{
 const source=await read('server/hugo/uiAction.ts')
 assert.match(source,/UUID_RE=\/\^\[0-9a-f\]\{8\}-/)
 assert.match(source,/if\(serviceId&&!UUID_RE\.test\(serviceId\)\)return null/)
 assert.match(source,/Number\.isFinite\(number\)/)
 assert.doesNotMatch(source,/\[0-9a-f-\]\{36\}/)
})

test('Edge Admin open_service uses the same strict UUID shape',async()=>{
 const source=await read('supabase/functions/hugo-runtime/index.ts')
 assert.match(source,/UUID_RE=\/\^\[0-9a-f\]\{8\}-/)
 assert.match(source,/if\(!UUID_RE\.test\(serviceId\)\)return null/)
 assert.doesNotMatch(source,/\[0-9a-f-\]\{36\}/)
})
