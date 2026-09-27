import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('isolated auth diagnostic reports role-only OK/FAIL without secret values',async()=>{
 const src=await read('tests/integration/auth-identities.test.mjs')
 assert.match(src,/role:'Cliente'/)
 assert.match(src,/role:'Proveedor'/)
 assert.match(src,/role:'Admin'/)
 assert.match(src,/console\.log\(`\$\{identity\.role\} auth \$\{ok\?'OK':'FAIL'\}`\)/)
 assert.doesNotMatch(src,/console\.log\([^\n]*(email|password|access_token)/i)
 assert.match(src,/tmossnqfwfwjrtzwcbmm/)
 assert.match(src,/trfsjuseqjxlhrxuvdsm/)
})
