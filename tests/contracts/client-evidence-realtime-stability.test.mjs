import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client evidence gallery isolates realtime topics per mounted instance and effect generation',async()=>{
 const gallery=await read('src/features/client/order/ClientEvidenceGallery.tsx')
 assert.match(gallery,/useId\(\)\.replace\(\/:\/g,''\)/)
 assert.match(gallery,/channelGeneration=useRef\(0\)/)
 assert.match(gallery,/generation=\+\+channelGeneration\.current/)
 assert.match(gallery,/topic=`client-evidence-\$\{serviceId\}-\$\{instanceId\}-\$\{generation\}`/)
 assert.match(gallery,/supabase\.channel\(topic\)\.on\('postgres_changes'/)
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
