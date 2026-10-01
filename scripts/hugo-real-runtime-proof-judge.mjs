import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
assert.ok(sha,'HUGO_REAL_RUNTIME_SHA_REQUIRED')
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'))
const client=await read('artifacts/hugo-client-order-by-voice-runtime.json')
const provider=await read('artifacts/hugo-provider-actions-runtime.json')
const admin=await read('artifacts/hugo-admin-actions-runtime.json')
for(const r of[client,provider,admin]){assert.equal(r.sha,sha);assert.equal(r.result,'PASS');assert.equal(r.environment,'UGO TEST');assert.equal(r.production_touched,false)}
assert.equal(client.backend_visible,true);assert.equal(client.client_visible,true);assert.equal(client.admin_role_visible,true);assert.equal(client.voice_metadata,true);assert.equal(client.automated_voice_tool_path,true)
assert.equal(provider.active_service_resolved,true);assert.equal(provider.confirmation_guard,true);assert.equal(provider.en_camino_persisted,true);assert.equal(provider.invalid_transition_blocked,true)
assert.equal(admin.summary_read,true);assert.equal(admin.service_search,true);assert.equal(admin.user_search,true);assert.equal(admin.navigation,true);assert.equal(admin.open_service,true);assert.equal(admin.refresh,true);assert.equal(admin.dangerous_unknown_tool_blocked,true);assert.equal(admin.service_state_unchanged,true)
assert.equal(client.human_audio_required,true);assert.equal(provider.microphone_audio_pending,true);assert.equal(admin.microphone_audio_pending,true)
const evidence={readiness_id:'hugo-real-runtime-proof',sha,environment:'UGO TEST',production_touched:false,client:{tool_backend_ui:true,service_created:true,visible_client:true,visible_admin:true},provider:{tool_backend_ui:true,status_persisted:true,guards:true},admin:{bounded_read_navigation:true,dangerous_mutation_blocked:true,state_unchanged:true},automated_scope:'VERIFIED',human_final:'PENDING_MICROPHONE_GEMINI_AUDIO_TOOL_BACKEND_UI',result:'PASS',checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/hugo-real-runtime-proof-judge.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
