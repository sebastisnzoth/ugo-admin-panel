import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
for(const path of ['src/mvp/ClientCompletionReview.tsx','src/mvp/client/ClientPostConfirmFlow.tsx','src/mvp/client/ClientServiceDetail.tsx'])test(path+' recreates Realtime channel after failure',async()=>{const s=await read(path);assert.match(s,/channelEpoch/);assert.match(s,/setChannelEpoch\(value=>value\+1\)/);assert.match(s,/CHANNEL_ERROR/);assert.match(s,/TIMED_OUT/)})
