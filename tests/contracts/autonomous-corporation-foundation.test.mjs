import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260927234500_autonomous_corporation_foundation.sql','utf8')
const shell=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const dashboard=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')
const ui=shell+'\n'+dashboard

test('corporate control plane persists the 13 active numbered departments without Department 13',()=>{
 for(const id of [1,2,3,4,5,6,7,8,9,10,11,12,14])assert.match(sql,new RegExp('\\('+id+",'"))
 assert.doesNotMatch(sql,/\(13,'/)
 assert.match(sql,/check \(department_id in \(1,2,3,4,5,6,7,8,9,10,11,12,14\)\)/)
})

test('autonomy modes and kill switches are deterministic persisted controls',()=>{
 for(const mode of ['OFF','SHADOW','ON','SAFE_MODE'])assert.match(sql,new RegExp("'"+mode+"'"))
 assert.match(sql,/autonomous_kill_switches/)
 assert.match(sql,/AUTONOMY_NOT_EXECUTABLE/)
})

test('RED work cannot auto-enter executable queue',()=>{
 assert.match(sql,/if p_authority_class='RED'/)
 assert.match(sql,/'WAITING_APPROVAL'/)
})

test('decision and evidence ledgers are append-only',()=>{
 assert.match(sql,/autonomous_decision_immutable/)
 assert.match(sql,/autonomous_evidence_immutable/)
 assert.match(sql,/AUTONOMOUS_LEDGER_APPEND_ONLY/)
})

test('corporate governance is backend protected by Super Admin checks and RLS',()=>{
 assert.ok((sql.match(/private\.is_superadmin\(\)/g)||[]).length>=10)
 assert.match(sql,/enable row level security/)
 assert.match(sql,/revoke all on public\.autonomous_company_state/)
})

test('Super Admin exposes Empresa Autónoma from persisted state only',()=>{
 assert.match(ui,/Empresa Autónoma/)
 assert.match(ui,/SUPER ADMIN · CONTROL CORPORATIVO|UGO Empresa Autónoma/)
 assert.match(ui,/from\('autonomous_company_state'\)/)
 assert.match(ui,/from\('autonomous_departments'\)/)
 assert.match(ui,/from\('autonomous_agents'\)/)
 assert.match(ui,/from\('autonomous_jobs'\)/)
 assert.match(ui,/No se muestran departamentos ficticios|Ninguna actividad se inventa/)
})


test('Department 14 has exactly six independent assurance agents',()=>{
 const d14=fs.readFileSync('supabase/migrations/20260928004500_department14_independent_auditors.sql','utf8')
 for(const name of ['UGO Internal Auditor','UGO Enterprise Risk Officer','UGO Internal Control Inspector','UGO Cross-Department Auditor','UGO AI Governance Auditor','UGO Executive Assurance & Challenge']) assert.match(d14,new RegExp(name.replace(/[&]/g,'\\&')))
 assert.match(d14,/department_id=14\) <> 6/)
 assert.match(d14,/DEPARTMENT_14_REQUIRES_EXACTLY_SIX_INDEPENDENT_AGENTS/)
})
