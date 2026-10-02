import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo chat owns HTTP transport types and delegates JSON parsing',async()=>{
 const[chat,json]=await Promise.all([read('api/hugo/chat.ts'),read('server/hugo/json.ts')])
 assert.match(chat,/type RequestLike=/)
 assert.match(chat,/type ResponseLike=/)
 assert.match(chat,/import\{asRecord,extractJson\}/)
 assert.match(json,/export function asRecord/)
 assert.match(json,/export function extractJson/)
})

test('Hugo JSON parser fails closed to an empty record',async()=>{
 const json=await read('server/hugo/json.ts')
 assert.match(json,/if\(!text\)return\{\}/)
 assert.match(json,/if\(start<0\|\|end<=start\)return\{\}/)
 assert.match(json,/catch\{return\{\}\}/)
})
