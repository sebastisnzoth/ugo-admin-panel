import assert from'node:assert/strict'
import{readFile,writeFile,mkdir}from'node:fs/promises'
const e=JSON.parse(await readFile('artifacts/provider-alerts-runtime.json','utf8'))
assert.equal(e.environment,'UGO TEST')
assert.equal(e.production_touched,false)
assert.equal(e.result,'PASS')
const out={validator:'Sentinel',readiness_id:'provider-alerts',sha:e.sha,result:'PASS',production_touched:false,cleanup_required:true,checked_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/provider-alerts-sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
