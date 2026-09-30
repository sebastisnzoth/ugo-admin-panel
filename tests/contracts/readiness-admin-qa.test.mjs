import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime=fs.readFileSync('scripts/readiness-admin-qa-runtime.mjs','utf8')
const judge=fs.readFileSync('scripts/readiness-admin-qa-judge.mjs','utf8')
const sentinel=fs.readFileSync('scripts/readiness-admin-qa-sentinel.mjs','utf8')
const ui=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')
const protectedGateMigration=fs.readFileSync('supabase/migrations/20260930005427_guard_protected_qa_coverage_fail_closed.sql','utf8')

test('admin QA readiness judges persisted state instead of UI self-certification',()=>{
 for(const marker of ['autonomous_qa_simulators','autonomous_qa_scenarios','autonomous_qa_runs','autonomous_meta_qa_calibrations','autonomous_decision_ledger','autonomous_evidence_ledger','qa-independent:%'])assert.match(runtime,new RegExp(marker))
 assert.match(runtime,/self_certification_allowed:false/)
 assert.match(judge,/independent_judge/)
 assert.match(sentinel,/FAIL_CLOSED/)
})

test('Meta-QA requires persisted fail detect remediate pass regression',()=>{
 for(const marker of ['baseline_run_id','seeded_run_id','rerun_id','seeded_defect_detected','permanent_regression'])assert.match(runtime,new RegExp(marker))
 assert.match(runtime,/baseline\?\.status!=='PASSED'.*seeded\?\.status!=='FAILED'.*rerun\?\.status!=='PASSED'/s)
})

test('physical and human final gates cannot be autocertified by admin QA',()=>{
 for(const marker of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'])assert.match(runtime,new RegExp(marker))
 assert.match(runtime,/some\(x=>x\.status==='COVERED'\)/)
})

test('QA Lab supports scenario drill-down with persisted evidence context',()=>{
 for(const marker of ['QA Lab · escenarios persistidos','aria-expanded','Correlation ID','Judge:','Evidencia:'])assert.match(ui,new RegExp(marker))
 assert.match(ui,/No se autocertifica/)
})


test('protected final QA gates cannot be promoted by machine-only coverage',()=>{
 for(const marker of ['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'])assert.match(protectedGateMigration,new RegExp(marker))
 assert.match(protectedGateMigration,/before insert or update of status/i)
 assert.match(protectedGateMigration,/new\.status\s*=\s*'COVERED'/i)
 assert.match(protectedGateMigration,/new\.status\s*:=\s*'UNCOVERED'/i)
})
