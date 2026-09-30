import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260930014500_enable_d3_d4_advisory_specialists.sql','utf8')
const ui=fs.readFileSync('src/mvp/AutonomousWorkforceControlCenter.tsx','utf8')
const api=fs.readFileSync('api/test.ts','utf8')
const guard=fs.readFileSync('supabase/migrations/20260930015500_guard_advisory_specialist_mutations.sql','utf8')

test('D3/D4 canonical specialists are promoted only as advisory workers',()=>{
  for(const key of ['client-support-agent','client-journey-agent','billing-support-agent','complaint-agent','retention-agent','client-feedback-agent','voice-of-client-agent','provider-recruitment-agent','provider-onboarding-agent','provider-activation-agent','provider-supply-agent','provider-quality-agent','provider-retention-agent','provider-fairness-agent','provider-support-agent','voice-of-provider-agent']) assert.match(migration,new RegExp("'"+key+"'"))
  assert.match(migration,/status = 'IDLE'/)
  assert.match(migration,/advisory_only/)
  assert.match(migration,/persisted_evidence_read/)
  assert.match(migration,/where a\.agent_key = s\.agent_key/)
  assert.match(migration,/and a\.department_id in \(3,4\)/)
  assert.match(migration,/and a\.status = 'DISABLED'/)
})

test('advisory specialists cannot use the generic operational execute action',()=>{
  assert.match(ui,/const advisoryOnly=/)
  assert.match(ui,/!advisoryOnly\(a\).*Ejecutar ahora/)
  assert.match(ui,/advisoryOnly\(a\).*Consultar/)
  assert.match(ui,/Modo ASESORÍA/)
  assert.match(ui,/no puede ejecutar mutaciones operativas/)
})

test('new advisory specialist consultation fails open only to a truthful no-evidence answer',()=>{
  assert.match(api,/permissions/)
  assert.match(api,/advisoryOnly/)
  assert.match(api,/Todavía no tengo evidencia persistida suficiente/)
  assert.match(api,/provider:'deterministic'/)
  assert.match(api,/evidence_available:false/)
  assert.match(api,/NO HAY EVIDENCIA SUFICIENTE/)
})

test('backend rejects operational jobs for advisory-only specialists',()=>{
  assert.match(guard,/permissions \? 'advisory_only'/)
  assert.match(guard,/ADVISORY_AGENT_NO_MUTATION_EXECUTOR/)
  assert.match(guard,/before insert or update of agent_id,status/)
  assert.match(guard,/new\.status not in \('CANCELLED','BLOCKED'\)/)
})
