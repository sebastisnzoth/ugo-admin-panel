import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const gate=fs.readFileSync('supabase/migrations/20260930033000_autonomy_on_readiness_gate.sql','utf8')
const preserve=fs.readFileSync('supabase/migrations/20260930034000_preserve_autonomy_mode_in_worker_proof.sql','utf8')
const media=fs.readFileSync('supabase/migrations/20260930032000_uploaded_media_coverage_guard_fix.sql','utf8')
const containment=fs.readFileSync('supabase/migrations/20260930035500_autonomy_on_scoped_containment.sql','utf8')
const runtime=fs.readFileSync('scripts/autonomy-on-readiness-runtime.mjs','utf8')

test('AUTONOMY_ON gate is independent from Customer 1 commercial launch',()=>{
 assert.match(gate,/gate_key[^\n]*AUTONOMY_ON|AUTONOMY_ON/)
 assert.match(gate,/physical-gps-device/)
 assert.match(gate,/real-customer-acceptance/)
 assert.match(gate,/not in\('physical-gps-device','real-customer-acceptance'\)/)
 assert.match(gate,/AGENT_ROSTER_NOT_READY/)
 assert.match(gate,/ACTION_CAPABILITIES_INCOMPLETE/)
 assert.match(gate,/MODEL_ROUTER_NOT_READY/)
 assert.match(gate,/RECENT_SCHEDULED_WORKER_PROOF_REQUIRED/)
})

test('ON transition is gate-protected',()=>{
 assert.match(gate,/autonomous_enable_on_if_ready/)
 assert.match(gate,/AUTONOMY_ON_GATE_BLOCKED/)
 assert.match(gate,/p_mode='ON'/)
 assert.match(gate,/superadmin_set_autonomy_mode/)
})

test('scheduled worker proof preserves prior mode',()=>{
 assert.match(preserve,/v_previous_mode/)
 assert.match(preserve,/'initialMode'/)
 assert.match(preserve,/'finalMode'/)
 assert.doesNotMatch(preserve,/finalMode','OFF'/)
})

test('uploaded media may cover only with protected storage proof',()=>{
 assert.match(media,/uploaded-media-bytes/)
 assert.match(media,/PROTECTED_STORAGE_RUNTIME/)
 assert.match(media,/QA_PROTECTED_STORAGE_BYTES/)
 assert.match(media,/public_access_denied/)
})

test('post-ON runtime asserts persistent ON and separate Customer 1 gate',()=>{
 assert.match(runtime,/assert\.equal\(state\.mode,'ON'\)/)
 assert.match(runtime,/AUTONOMY_ON/)
 assert.match(runtime,/CUSTOMER_1/)
 assert.match(runtime,/productionTouched:false/)
})


test('scoped kill switches contain subsets without forcing company OFF',()=>{
 assert.match(containment,/scope_type='GLOBAL'/)
 assert.match(containment,/GLOBAL_KILL_SWITCH_ACTIVE/)
 assert.doesNotMatch(containment,/where enabled\) then/)
})
