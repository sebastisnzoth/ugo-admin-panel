import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('Hugo real runtime proof aggregates all three role runtimes and forbids mock-only certification',async()=>{
 const workflow=await read('.github/workflows/hugo-real-runtime-proof.yml')
 const judge=await read('scripts/hugo-real-runtime-proof-judge.mjs')
 for(const token of['hugo-client-order-by-voice-runtime.mjs','hugo-provider-actions-runtime.mjs','hugo-admin-actions-runtime.mjs'])assert.ok(workflow.includes(token),token)
 for(const token of['backend_visible','en_camino_persisted','service_state_unchanged','microphone_audio_pending','human_final'])assert.ok(judge.includes(token),token)
 assert.ok(workflow.includes('UGO_RUNTIME_SHA'))
 assert.ok(workflow.includes('UGO TEST'))
})
