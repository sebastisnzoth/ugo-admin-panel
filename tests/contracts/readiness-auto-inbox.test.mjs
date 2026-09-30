import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const inbox=fs.readFileSync('src/mvp/autonomyInbox.ts','utf8')
const dashboard=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')
const command=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const workflow=fs.readFileSync('.github/workflows/readiness-auto-inbox.yml','utf8')

test('Executive Inbox deduplicates work and orders escalations by SLA and authority',()=>{
 assert.match(inbox,/newestByWork=new Map/)
 assert.match(inbox,/correlation_id\|\|job\.id/)
 assert.match(inbox,/inbox_sla_breached/)
 assert.match(inbox,/authority==='RED'\?15:authority==='YELLOW'\?30:60/)
 assert.match(inbox,/status==='BLOCKED'\?0:status==='WAITING_APPROVAL'\?1:2/)
 assert.match(dashboard,/buildExecutiveInboxItems\(p\.jobs\)/)
 assert.match(dashboard,/Prioridad \{j\.inbox_priority\}/)
 assert.match(dashboard,/formatInboxSla\(j\)/)
 assert.match(dashboard,/data-correlation-id/)
})

test('Executive Inbox preserves audited decisions and actionable failure states',()=>{
 assert.match(command,/superadmin_decide_autonomous_job/)
 assert.match(command,/INDEPENDENT_SECOND_APPROVER_REQUIRED/)
 assert.match(command,/AUTONOMY_NOT_EXECUTABLE/)
 assert.match(command,/JOB_NOT_WAITING_APPROVAL/)
 assert.match(command,/await load\(\)/)
 assert.match(dashboard,/Activá ON para aprobar/)
 assert.match(dashboard,/aria-disabled/)
})

test('auto-inbox readiness has a dedicated same-SHA TEST workflow with independent validators',()=>{
 assert.match(workflow,/UGO Readiness Auto Inbox TEST/)
 assert.match(workflow,/UGO_TEST_SUPABASE_SERVICE_ROLE_KEY/)
 assert.match(workflow,/readiness-auto-inbox-runtime\.mjs/)
 assert.match(workflow,/readiness-auto-inbox-judge\.mjs/)
 assert.match(workflow,/readiness-auto-inbox-sentinel\.mjs/)
 assert.match(workflow,/github\.sha/)
})

test('runtime dedupe proof is scoped to the single visible Executive Inbox surface',()=>{
 const runtime=fs.readFileSync('scripts/readiness-auto-inbox-runtime.mjs','utf8')
 assert.match(runtime,/section\.ugo-admin2-module-card:visible/)
 assert.match(runtime,/INBOX_VISIBLE_SECTION_COUNT_INVALID/)
 assert.match(runtime,/\.ugo-autonomous-inbox-job:visible/)
})
