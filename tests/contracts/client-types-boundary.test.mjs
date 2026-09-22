import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client types are canonical behind the client feature boundary',async()=>{
 const[types,shim,flow,hook]=await Promise.all([
  read('src/features/client/types/clientTypes.ts'),
  read('src/mvp/client/clientTypes.ts'),
  read('src/features/client/flow/clientFlow.tsx'),
  read('src/features/client/hooks/useClientCategoryShortcut.ts')
 ])
 assert.match(types,/export type ClientScreen/)
 assert.match(types,/export type ClientActionHandlers/)
 assert.match(shim,/features\/client\/types\/clientTypes/)
 assert.doesNotMatch(shim,/export type ClientScreen =/)
 assert.match(flow,/\.\.\/types\/clientTypes/)
 assert.match(hook,/\.\.\/types\/clientTypes/)
})
