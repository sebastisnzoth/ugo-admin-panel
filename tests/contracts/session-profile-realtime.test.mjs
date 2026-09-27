import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('role session resyncs own user profile after realtime usuario changes',async()=>{
 const shared=await read('src/mvp/shared.tsx')
 assert.match(shared,/profileChannelEpoch/)
 assert.match(shared,/table:'usuarios',filter:`id=eq\.\$\{userId\}`/)
 assert.match(shared,/event:'UPDATE'/)
 assert.match(shared,/loadProfile\(session\)/)
 assert.match(shared,/status==='SUBSCRIBED'/)
 assert.match(shared,/CHANNEL_ERROR/)
 assert.match(shared,/TIMED_OUT/)
 assert.match(shared,/CLOSED/)
})

test('role session recovers profile on online and foreground resume',async()=>{
 const shared=await read('src/mvp/shared.tsx')
 assert.match(shared,/addEventListener\('online',onOnline\)/)
 assert.match(shared,/visibilityState==='visible'/)
 assert.match(shared,/removeEventListener\('online',onOnline\)/)
 assert.match(shared,/removeChannel\(channel\)/)
})
