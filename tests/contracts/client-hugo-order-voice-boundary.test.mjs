import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs/promises'

const read=path=>fs.readFile(new URL('../../'+path,import.meta.url),'utf8')

test('Hugo order voice helper lives behind the client Hugo feature boundary',async()=>{
 const canonical=await read('src/features/client/hugo/hugoOrderVoice.ts')
 /* legacy shim retired after all runtime consumers moved to the feature owner */
 /*
 */
 assert.match(canonical,/export type HugoDraft=/)
 assert.match(canonical,/export function hugoCategory/)
 assert.match(canonical,/export function hugoQuestion/)
 assert.match(canonical,/from'\.\.\/\.\.\/\.\.\/mvp\/shared'/)
})
