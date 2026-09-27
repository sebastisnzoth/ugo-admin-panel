import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('only canonical Android workflow auto-builds role APKs',async()=>{
 const canonical=await read('.github/workflows/android-apks.yml')
 const manual=await read('.github/workflows/build-ugo-apks.yml')
 assert.match(canonical,/push:\n\s+branches:\s*\[main\]/)
 assert.match(canonical,/assembleAdminDebug/)
 assert.match(manual,/workflow_dispatch:/)
 assert.doesNotMatch(manual,/push:\n/)
 assert.match(manual,/assembleClientDebug/)
 assert.match(manual,/assembleProviderDebug/)
 assert.match(manual,/assembleAdminDebug/)
 assert.match(manual,/UGO-Admin\.apk/)
})
