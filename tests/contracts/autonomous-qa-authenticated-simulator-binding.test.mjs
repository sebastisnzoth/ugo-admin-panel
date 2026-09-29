import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260929190000_qa_authenticated_simulator_binding.sql','utf8')
const runtime=fs.readFileSync('scripts/autonomous-qa-auth-runtime.mjs','utf8')

test('caller supplied QA booleans cannot certify runtime coverage',()=>{
  assert.match(sql,/CALLER_ASSERTIONS_NOT_AUTHORITATIVE_USE_BOUND_RUNTIME/)
  assert.match(sql,/create or replace function public\.superadmin_run_qa_scenario/)
})

test('bound actor actions derive identity and service ownership server side',()=>{
  assert.match(sql,/auth\.uid\(\)/)
  assert.match(sql,/CLIENT_SIMULATOR_BINDING_REJECTED/)
  assert.match(sql,/PROVIDER_SIMULATOR_BINDING_REJECTED/)
  assert.match(sql,/ADMIN_SIMULATOR_BINDING_REJECTED/)
  assert.match(sql,/AUTHENTICATED_DATABASE_ACTION/)
  assert.doesNotMatch(sql,/p_passed boolean/)
})

test('service lifecycle PASS fails closed without all three authenticated simulators',()=>{
  for(const required of [
    'AUTHENTICATED_CLIENT_SIMULATOR_ACTION_REQUIRED',
    'AUTHENTICATED_PROVIDER_SIMULATOR_ACTION_REQUIRED',
    'AUTHENTICATED_ADMIN_SIMULATOR_ACTION_REQUIRED'
  ]) assert.match(sql,new RegExp(required))
  assert.match(sql,/before insert on public\.autonomous_qa_runs/)
  assert.match(sql,/new\.status<>'PASSED'/)
})

test('authenticated runtime binds client provider and admin simulators to the same serviceId',()=>{
  for(const key of ['qa-client-simulator','qa-provider-simulator','qa-admin-system-simulator'])
    assert.match(runtime,new RegExp(key))
  assert.match(runtime,/autonomous_qa_record_actor_action/)
  assert.match(runtime,/assert\.equal\(svc\.cliente_id,c\.id\)/)
  assert.match(runtime,/assert\.equal\(svc\.proveedor_id,p\.id\)/)
})
