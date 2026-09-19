import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('future scheduled acceptance opens agenda instead of an inactive job screen',async()=>{
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 assert.match(root,/ACTIONABLE_SCHEDULE_LEAD_MS=60\*60\*1000/)
 assert.match(root,/isFuture=scheduledAt!=null[\s\S]*scheduledAt>Date\.now\(\)\+ACTIONABLE_SCHEDULE_LEAD_MS/)
 assert.match(root,/alreadyWorking=Boolean\(data\.service\)/)
 assert.match(root,/flow\.navigate\(alreadyWorking\|\|isFuture\?'agenda':'active-job'\)/)
})
