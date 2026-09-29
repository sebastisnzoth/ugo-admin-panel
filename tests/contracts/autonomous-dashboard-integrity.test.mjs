import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const command=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const dashboard=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')
const integration=fs.readFileSync('tests/integration/autonomous-corporation-rpc-rls.test.mjs','utf8')

test('autonomous dashboard uses exact totals and paged rows instead of LIMIT 100 as totals',()=>{
 assert.match(command,/count:'exact',head:true/)
 assert.match(command,/range\(autonomyPage\*100,autonomyPage\*100\+99\)/)
 assert.match(command,/range\(ledgerPage\*100,ledgerPage\*100\+99\)/)
 assert.match(dashboard,/jobs totales/)
 assert.match(dashboard,/visibles en página/)
 assert.match(dashboard,/Jobs siguientes/)
 assert.match(dashboard,/Ledger siguiente/)
})

test('governance integration fixtures have real owners and deterministic cleanup',()=>{
 assert.match(integration,/governanceAgent\.id/)
 assert.doesNotMatch(integration,/p_department_id:14,p_agent_id:null/)
 assert.match(integration,/isolated governance fixture cleanup/)
})
