import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260929204500_readiness_auto_departments.sql','utf8')
const ui=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')

test('auto-departments readiness persists deterministic job and evidence per department',()=>{
  assert.match(sql,/autonomous_verify_department_registry/)
  assert.match(sql,/DEPARTMENT_REGISTRY_RUNTIME_PROOF/)
  assert.match(sql,/insert into public\.autonomous_jobs/)
  assert.match(sql,/insert into public\.autonomous_evidence_ledger/)
  assert.match(sql,/insert into public\.autonomous_decision_ledger/)
  assert.match(sql,/status<>'DISABLED'/)
  assert.match(sql,/readiness\.auto-departments/)
})

test('auto-departments verifier is service-role only and read-only with respect to business flows',()=>{
  assert.match(sql,/revoke all on function public\.autonomous_verify_department_registry\(text\) from public,anon,authenticated/)
  assert.match(sql,/grant execute on function public\.autonomous_verify_department_registry\(text\) to service_role/)
  assert.doesNotMatch(sql,/update public\.services|insert into public\.services|delete from public\.services/)
})

test('department UI surfaces responsible agent, inputs outputs and maturity',()=>{
  for(const token of ['Responsable','Entradas / salidas','Madurez','CONNECTED','SIN EVIDENCIA']){
    assert.match(ui,new RegExp(token.replace(/[\/]/g,'\\/')))
  }
})
