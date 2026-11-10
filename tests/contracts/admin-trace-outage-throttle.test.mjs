import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const files=[
 'src/mvp/AdminServiceTracePanel.tsx',
 'src/mvp/AdminServiceExtendedTrace.tsx',
]

for(const file of files){
 test(`${file}: outage must not trigger tight Realtime request loops`,async()=>{
  const source=await readFile(new URL('../../'+file,import.meta.url),'utf8')
  assert.match(source,/now-lastSyncAt<30_000/)
  assert.match(source,/reconnecting=true/)
  assert.match(source,/setChannelEpoch\(value=>value\+1\)\},30_000/)
  assert.match(source,/window\.setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'\)sync\(\)\},60_000\)/)
  assert.doesNotMatch(source,/CHANNEL_ERROR'\|\|status==='TIMED_OUT'\|\|status==='CLOSED'\)\{sync\(\);reconnect\(\)\}/)
 })
}
