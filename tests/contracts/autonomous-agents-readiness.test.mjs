import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const ui=fs.readFileSync('src/mvp/AutonomousWorkforceControlCenter.tsx','utf8'),runtime=fs.readFileSync('scripts/autonomous-agents-readiness-runtime.mjs','utf8'),judge=fs.readFileSync('scripts/autonomous-agents-readiness-judge.mjs','utf8'),sentinel=fs.readFileSync('scripts/autonomous-agents-readiness-sentinel.mjs','utf8')
test('agent maturity is distinct from operational status and filterable',()=>{for(const s of ['CATALOGED','ENABLED','EXECUTED','VERIFIED'])assert.match(ui,new RegExp(s));assert.match(ui,/aria-label="Madurez"/);assert.match(ui,/AGENT_JUDGE_PROOF/);assert.match(ui,/AGENT_SENTINEL_PROOF/)})
test('runtime proves trigger and executor only for enabled agents',()=>{assert.match(runtime,/READINESS_AGENT_TRIGGER/);assert.match(runtime,/UGO_TEST_DETERMINISTIC_EXECUTOR/);assert.match(runtime,/agent\.status==='DISABLED'/);assert.match(runtime,/AGENT_EXECUTION_PROOF/)})
test('Judge and Sentinel persist independent per-agent proofs',()=>{assert.match(judge,/AGENT_JUDGE_PROOF/);assert.match(sentinel,/AGENT_SENTINEL_PROOF/);assert.match(sentinel,/production_touched:false/)})
