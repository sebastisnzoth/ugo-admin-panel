import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs/promises'

const read=path=>fs.readFile(new URL('../../'+path,import.meta.url),'utf8')

test('Hugo order voice helper lives behind the client Hugo feature boundary',async()=>{
 const[legacy,canonical]=await Promise.all([
  read('src/mvp/client/hugoOrderVoice.ts'),
  read('src/features/client/hugo/hugoOrderVoice.ts')
 ])
 assert.equal(legacy,"export * from '../../features/client/hugo/hugoOrderVoice'\\n")
 assert.match(canonical,/export type HugoDraft=/)
 assert.match(canonical,/export function hugoCategory/)
 assert.match(canonical,/export function hugoQuestion/)
 assert.match(canonical,/from'\.\.\/\.\.\/\.\.\/mvp\/shared'/)
})
