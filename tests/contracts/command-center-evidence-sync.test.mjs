import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const generator=fs.readFileSync('scripts/generate-pages-status.mjs','utf8')
const workflow=fs.readFileSync('.github/workflows/github-pages.yml','utf8')
const page=fs.readFileSync('pages/index.html','utf8')

test('Command Center republishes when authoritative evidence changes',()=>{
  assert.match(workflow,/docs\/evidence\/\*\*/)
  assert.match(generator,/evidence_registry/)
  assert.match(generator,/evidence_summary/)
  assert.match(generator,/state_drift/)
})

test('Command Center exposes current autonomous-agent counts and drift',()=>{
  assert.match(generator,/autoAgentsEvidence/)
  assert.match(generator,/verified:/)
  assert.match(page,/agentTotal/)
  assert.match(page,/agentEnabled/)
  assert.match(page,/agentVerified/)
  assert.match(page,/agentDisabled/)
  assert.match(page,/stateDrift/)
  assert.match(page,/evidenceRecords/)
})

test('auto-agents persisted state and latest evidence agree',()=>{
  const lock=JSON.parse(fs.readFileSync('docs/ugo-work-locks/readiness-auto-agents.json','utf8'))
  const evidence=JSON.parse(fs.readFileSync('docs/evidence/readiness-auto-agents-20260930.json','utf8'))
  assert.equal(lock.safe_final_state.cataloged_agents,evidence.counts.cataloged)
  assert.equal(lock.safe_final_state.enabled_agents,evidence.counts.enabled)
  assert.equal(lock.safe_final_state.executed_agents,evidence.counts.executed)
  assert.equal(lock.safe_final_state.verified_enabled_agents,evidence.counts.verified_enabled)
  assert.equal(lock.safe_final_state.disabled_cataloged_agents,evidence.counts.disabled_cataloged_only)
  assert.equal(evidence.counts.enabled,118)
  assert.equal(evidence.counts.verified_enabled,118)
})


test('Command Center exposes authoritative DONE control without self-certifying',()=>{
  assert.match(page,/id="doneControl"/)
  assert.match(page,/Camino exacto hasta DONE/)
  assert.match(page,/renderDoneControl/)
  assert.match(page,/remaining === 0 && active === 0 && stale === 0 && drift === 0/)
  assert.match(page,/DONE exige evidencia \+ Judge PASS \+ Sentinel PASS/)
  assert.match(page,/doneBlockers/)
  assert.match(page,/remaining_autonomous/)
  assert.match(page,/human_deferred/)
})


test('Command Center surfaces failed physical Hugo voice evidence instead of reporting generic progress',()=>{
  const engine=fs.readFileSync('scripts/ugo-readiness-engine.mjs','utf8')
  assert.match(engine,/WAITING_EVIDENCE.*human_final_required/s)
  assert.match(engine,/human_runtime_evidence/)
  assert.match(engine,/prueba humana real FALLÓ/)
  assert.match(engine,/requiere corrección y nueva prueba física/)
})
