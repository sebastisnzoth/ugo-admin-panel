import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider opportunities consumes shared UI while preserving accept and reject actions',async()=>{
 const s=await read('src/mvp/provider/ProviderOpportunities.tsx')
 assert.match(s,/from'\.\.\/\.\.\/shared\/ui'/)
 assert.match(s,/SectionHeader/)
 assert.match(s,/EmptyState/)
 assert.match(s,/StatusPill/)
 assert.match(s,/Button variant="primary"/)
 assert.match(s,/flow\.actions\.acceptOpportunity\(item\.id\)/)
 assert.match(s,/flow\.actions\.rejectOpportunity\(item\.id\)/)
 assert.match(s,/d\.debtBlocked/)
 assert.match(s,/ProviderRequestEvidence/)
})
