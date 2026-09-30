import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const proof=JSON.parse(await fs.readFile('artifacts/client-camera-runtime.json','utf8'))
const helper=await fs.readFile('src/lib/cameraCapture.ts','utf8')
const ui=await fs.readFile('src/features/client/request/ClientRequestEvidence.tsx','utf8')
assert.equal(proof.sha,sha)
assert.equal(proof.result,'PASS')
assert.match(helper,/isSecureContext/)
assert.match(helper,/getUserMedia/)
assert.match(helper,/NotAllowedError/)
assert.match(helper,/pickCameraFile/)
assert.match(ui,/Sacar foto/)
assert.match(ui,/Elegir foto/)
assert.match(ui,/request-evidence/)
assert.match(ui,/evidencias_solicitud/)
assert.match(ui,/storage_path/)
assert.match(ui,/if\(!file\)return/)
assert.ok(Number(proof.storage_bytes)>0)
const out={validator:'Sentinel',result:'PASS',readiness_id:'client-camera',sha,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-camera-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
