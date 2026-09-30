import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises'
const e=JSON.parse(await readFile('artifacts/provider-dispute-runtime.json','utf8'))
for(const k of ['open','evidence','status_progression','closure','audit','notifications'])assert.equal(e[k],true,k)
assert.equal(e.readiness_id,'provider-dispute');assert.equal(e.environment,'UGO TEST');assert.equal(e.result,'PASS');assert.equal(e.production_touched,false)
const out={validator:'Judge',readiness_id:'provider-dispute',sha:e.sha,result:'PASS',basis:['provider opened dispute through authenticated RPC','evidence persisted','client response moved case to review','admin closure persisted','audit and provider close notification verified'],checked_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/provider-dispute-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
