import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||'',j=JSON.parse(await fs.readFile('artifacts/hugo-real-runtime-proof-judge.json','utf8'))
assert.equal(j.sha,sha);assert.equal(j.result,'PASS');assert.equal(j.production_touched,false);assert.equal(j.automated_scope,'VERIFIED');assert.equal(j.human_final,'PENDING_MICROPHONE_GEMINI_AUDIO_TOOL_BACKEND_UI')
await fs.writeFile('artifacts/hugo-real-runtime-proof-sentinel.json',JSON.stringify({readiness_id:j.readiness_id,sha,result:'PASS',production_touched:false,automated_scope:'VERIFIED',human_final:j.human_final,checked_at:new Date().toISOString()},null,2)+'\n')
