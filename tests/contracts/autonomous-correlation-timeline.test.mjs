import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const ui=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')

test('correlation timeline renders only persisted job decision evidence QA coverage and gate links',()=>{
 assert.match(ui,/d\.job_id===j\.id\|\|d\.correlation_id===j\.correlation_id/)
 assert.match(ui,/e\.job_id===j\.id\|\|e\.correlation_id===j\.correlation_id/)
 assert.match(ui,/r\.correlation_id===j\.correlation_id/)
 assert.match(ui,/q\.last_run_id===r\.id/)
 assert.match(ui,/releaseGate\?\.meta_qa_run_id===r\.id/)
 assert.match(ui,/No se generan timelines ficticios/)
})
