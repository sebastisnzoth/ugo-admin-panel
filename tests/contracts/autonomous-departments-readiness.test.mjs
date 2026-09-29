import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const runtime=fs.readFileSync('scripts/autonomous-departments-readiness-runtime.mjs','utf8')
const judge=fs.readFileSync('scripts/autonomous-departments-readiness-judge.mjs','utf8')
const sentinel=fs.readFileSync('scripts/autonomous-departments-readiness-sentinel.mjs','utf8')
const dashboard=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')
test('department readiness runtime is TEST-only and covers D1-D12 plus D14',()=>{
 assert.match(runtime,/tmossnqfwfwjrtzwcbmm\.supabase\.co/)
 assert.match(runtime,/\[1,2,3,4,5,6,7,8,9,10,11,12,14\]/)
 assert.match(runtime,/DEPARTMENT_CONNECTIVITY_PROOF/)
 assert.match(runtime,/input_evidence/)
 assert.match(runtime,/result/)
 assert.match(runtime,/auto_departments_readiness/)
})
test('independent Judge and Sentinel enforce persisted proof and production guard',()=>{
 assert.match(judge,/validator:'Judge'/)
 assert.match(judge,/persisted job mismatch/)
 assert.match(judge,/persisted evidence mismatch/)
 assert.match(sentinel,/validator:'Sentinel'/)
 assert.match(sentinel,/production_touched:false/)
 assert.match(sentinel,/trfsjuseqjxlhrxuvdsm/)
})
test('departments dashboard exposes responsible agent and maturity',()=>{
 assert.match(dashboard,/Agente responsable/)
 assert.match(dashboard,/Madurez/)
 assert.match(dashboard,/auto_departments_readiness/)
})
