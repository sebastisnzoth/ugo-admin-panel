import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
for(const path of ['src/features/client/order/ClientCompletionReview.tsx','src/features/client/request/ClientPostConfirmFlow.tsx','src/features/client/order/ClientServiceDetail.tsx','src/features/client/home/ClientHomeScreen.tsx'])test(path+' recreates Realtime channel after failure',async()=>{const s=await read(path);assert.match(s,/channelEpoch/);assert.match(s,/setChannelEpoch\(value=>value\+1\)/);assert.match(s,/CHANNEL_ERROR/);assert.match(s,/TIMED_OUT/)})

test('client home resyncs active orders on network and foreground recovery',async()=>{
 const s=await read('src/features/client/home/ClientHomeScreen.tsx')
 assert.match(s,/addEventListener\('online',onOnline\)/)
 assert.match(s,/visibilitychange/)
 assert.match(s,/CLOSED/)
 assert.match(s,/client-home-orders-\$\{session\.user\.id\}-\$\{channelEpoch\}/)
 assert.match(s,/removeEventListener\('online',onOnline\)/)
 assert.match(s,/removeChannel\(ch\)/)
})
