import assert from'node:assert/strict'
import{readFile,writeFile,mkdir}from'node:fs/promises'
const p='artifacts/provider-alerts-runtime.json'
const e=JSON.parse(await readFile(p,'utf8'))
assert.equal(e.readiness_id,'provider-alerts')
assert.equal(e.environment,'UGO TEST')
assert.equal(e.result,'PASS')
assert.equal(e.realtime?.banner,true)
assert.equal(e.attention?.tone,true)
assert.equal(e.attention?.vibrate,true)
assert.equal(e.production_touched,false)
const persistence=JSON.parse(await readFile('artifacts/provider-alerts-persistence-judge.json','utf8'));assert.equal(persistence.sha,e.sha);assert.equal(persistence.result,'PASS');assert.equal(persistence.source,'INDEPENDENT_DB_READS');const out={validator:'Judge',readiness_id:'provider-alerts',sha:e.sha,result:'PASS',basis:['provider offer banner arrived through realtime without refresh','provider attention tone emitted','provider vibration requested'],checked_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/provider-alerts-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
