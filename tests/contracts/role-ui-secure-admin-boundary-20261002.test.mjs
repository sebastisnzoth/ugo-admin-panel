import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('cross-role runtime exercises the secure Admin auth boundary instead of the public development shell',async()=>{
 const runtime=await read('scripts/role-ui-runtime.mjs')
 assert.match(runtime,/testAdminAuthBoundary[\s\S]*\?app=admin&auth=1/)
 assert.match(runtime,/must not receive Admin navigation/)
})
