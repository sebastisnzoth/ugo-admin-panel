import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('UGO TEST workflows serialize the shared provider fixture across workflow boundaries',async()=>{
 const worker=await read('.github/workflows/autonomous-worker-test.yml')
 const isolated=await read('.github/workflows/isolated-rpc-rls.yml')
 for(const yaml of [worker,isolated]){
  assert.match(yaml,/group:\s+ugo-test-shared-provider-fixture/)
  assert.match(yaml,/cancel-in-progress:\s+false/)
 }
})
