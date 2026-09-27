import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client evidence gallery isolates and rebuilds realtime after transport failure',async()=>{
 const gallery=await read('src/features/client/order/ClientEvidenceGallery.tsx')
 assert.match(gallery,/useId\(\)\.replace\(\/:\/g,''\)/)
 assert.match(gallery,/channelEpoch/)
 assert.match(gallery,/topic=`client-evidence-\$\{serviceId\}-\$\{instanceId\}-\$\{channelEpoch\}`/)
 assert.match(gallery,/CHANNEL_ERROR/)
 assert.match(gallery,/TIMED_OUT/)
 assert.match(gallery,/CLOSED/)
 assert.match(gallery,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(gallery,/void supabase\.removeChannel\(ch\)/)
})

test('exact order detail also isolates its realtime topic and suppresses offline false positives',async()=>{
 const detail=await read('src/features/client/order/ClientServiceDetail.tsx')
 assert.match(detail,/channelGeneration=useRef\(0\)/)
 assert.match(detail,/topic=`client-service-detail-\$\{serviceId\}-\$\{instanceId\}-\$\{channelEpoch\}-\$\{generation\}`/)
 assert.match(detail,/document\.visibilityState==='visible'&&navigator\.onLine/)
 assert.match(detail,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(detail,/void supabase\.removeChannel\(ch\)/)
})

test('provider radar realtime channel is instance scoped and reconnect errors are only escalated while visible online',async()=>{
 const radar=await read('src/features/client/radar/ClientProviderRadarBridge.tsx')
 assert.match(radar,/useId\(\)\.replace\(\/:\/g,''\)/)
 assert.match(radar,/client-provider-radar-\$\{session\.user\.id\}-\$\{instanceId\}-\$\{channelEpoch\}/)
 assert.match(radar,/document\.visibilityState==='visible'&&navigator\.onLine/)
 assert.match(radar,/setChannelEpoch\(value=>value\+1\)/)
})


test('provider evidence panel rebuilds realtime after CLOSED and network recovery',async()=>{
 const provider=await read('src/mvp/provider/ProviderEvidencePanel.tsx')
 assert.match(provider,/channelEpoch/)
 assert.match(provider,/provider-evidence-${service.id}-${channelEpoch}/)
 assert.match(provider,/CHANNEL_ERROR/)
 assert.match(provider,/TIMED_OUT/)
 assert.match(provider,/CLOSED/)
 assert.match(provider,/setChannelEpoch(value=>value+1)/)
 assert.match(provider,/const onOnline=()=>{refresh();reconnect()}/)
 assert.match(provider,/document.visibilityState==='visible'/)
})
