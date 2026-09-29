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
 assert.match(integration,/yellowGovernanceAgent\.id/)
 assert.match(integration,/redGovernanceAgent\.id/)
 assert.match(integration,/technologyAgent\.id/)
 assert.doesNotMatch(integration,/p_department_id:14,p_agent_id:null/)
 assert.match(integration,/isolated governance fixture cleanup/)
 assert.match(integration,/governance runtime must not leak executable approval fixtures/)
 assert.match(integration,/if\(cancelled\.error\)throw cancelled\.error/)
})


test('department view distinguishes active jobs from historical jobs and shows last evidence',()=>{
 assert.match(command,/departmentJobSummaries/)
 assert.match(command,/autonomous_jobs'\)\.select\('id',\{count:'exact',head:true\}\)\.eq\('department_id',departmentId\)/)
 assert.match(command,/autonomous_evidence_ledger'\)\.select\('id,evidence_type,reference,correlation_id,created_at'\)/)
 for(const label of ['Jobs activos','Jobs totales','Último job','Última evidencia','Correlation ID'])assert.match(dashboard,new RegExp(label))
 assert.match(dashboard,/Sin jobs persistidos/)
 assert.match(dashboard,/Sin evidencia persistida/)
})
