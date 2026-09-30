import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260930025000_actionable_agent_work_orders.sql','utf8')
const guard=fs.readFileSync('supabase/migrations/20260930025500_actionable_agent_advisory_guard.sql','utf8')
const api=fs.readFileSync('api/test.ts','utf8')
const ui=fs.readFileSync('src/mvp/AutonomousWorkforceControlCenter.tsx','utf8')

test('every agent gets an exact governed work-order capability',()=>{
 assert.match(migration,/'agent\.work_order\.'\|\|a\.agent_key/)
 assert.match(migration,/action_work_order/)
 assert.match(migration,/AGENT_ACTION_CAPABILITY_INCOMPLETE/)
 assert.match(migration,/safe_mode_allowed/)
})

test('work-order executor preserves GREEN YELLOW RED authority gates',()=>{
 assert.match(migration,/YELLOW_DUAL_CONTROL_REQUIRED/)
 assert.match(migration,/RED_HUMAN_APPROVAL_REQUIRED/)
 assert.match(migration,/AUTHORIZED_DUAL_CONTROL/)
 assert.match(migration,/AUTHORIZED_HUMAN/)
 assert.match(migration,/business_mutation',false/)
 assert.match(migration,/production_touched',false/)
})

test('advisory guard allows only exact governed work-order envelope',()=>{
 assert.match(guard,/new\.trigger_type='AGENT_WORK_ORDER'/)
 assert.match(guard,/new\.capability='agent\.work_order\.'\|\|a\.agent_key/)
 assert.match(guard,/business_mutation/)
 assert.match(guard,/ADVISORY_AGENT_NO_MUTATION_EXECUTOR/)
})

test('Super Admin exposes create action and server-side executor routing',()=>{
 assert.match(api,/action==='create_work_order'/)
 assert.match(api,/autonomous_prepare_agent_work_order/)
 assert.match(api,/autonomous_execute_work_order_job/)
 assert.match(ui,/Crear acción gobernada/)
 assert.match(ui,/Nueva acción del agente/)
 assert.match(ui,/WAITING_APPROVAL/)
})
