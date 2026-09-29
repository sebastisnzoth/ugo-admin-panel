import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/admin-auth-runtime.json','utf8'))
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(runtime.readiness_id,'admin-auth')
assert.equal(runtime.environment,'UGO TEST')
assert.equal(runtime.sha,sha)
for(const actor of ['anonymous','client','provider']){
 const row=runtime.results.find(x=>x.actor===actor);assert.ok(row);assert.equal(row.access,'DENIED');assert.equal(row.status,'PASS')
}
const admin=runtime.results.find(x=>x.actor==='admin');assert.ok(admin);assert.equal(admin.access,'ALLOWED');assert.equal(admin.status,'PASS')
const evidence={validator:'Judge',readiness_id:'admin-auth',sha,result:'PASS',basis:'dedicated positive/negative browser runtime',validated_at:new Date().toISOString()}
await fs.writeFile('artifacts/admin-auth-judge.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
