import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider agenda consumes shared UI without moving lifecycle logic',async()=>{
 const s=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(s,/from'\.\.\/\.\.\/shared\/ui'/)
 for(const token of ['SectionHeader','LoadingState','EmptyState','StatusPill','Card','Button'])assert.match(s,new RegExp(token))
 assert.match(s,/advanceProviderService\(db,selected\.id,target\)/)
 assert.match(s,/cancelProviderService\(db,selected\.id,cancelReason\)/)
 assert.match(s,/ServiceChat role="provider" serviceId=\{selected\.id\}/)
 assert.match(s,/ProviderEvidencePanel service=\{selectedService\}/)
 assert.match(s,/db\.channel\(\x60provider-agenda-\$\{id\}-\$\{channelEpoch\}\x60\)/)
 assert.match(s,/selectedPaymentReady/)
 assert.match(s,/TRAVEL_LEAD_MS=60\*60\*1000/)
})
