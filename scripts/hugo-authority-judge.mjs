import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
const runtime=JSON.parse(await readFile('artifacts/hugo-authority-runtime.json','utf8'))
assert.equal(runtime.status,'PASS');assert.equal(runtime.environment,'UGO TEST');assert.equal(runtime.production_touched,false);assert.equal(runtime.validated_sha,process.env.UGO_RUNTIME_SHA)
for(const name of ['client->client','provider->provider','admin->admin'])assert.equal(runtime.matrix.find(x=>x.case===name)?.actual,'ALLOW')
for(const name of ['client->admin','provider->admin'])assert.equal(runtime.matrix.find(x=>x.case===name)?.actual,'ROLE_MISMATCH')
assert.equal(runtime.matrix.find(x=>x.case==='inactive-client->client')?.actual,'INACTIVE_PROFILE')
const result={validator:'Judge',result:'PASS',task_id:'readiness-hugo-authority',correlation_id:runtime.correlation_id,validated_sha:runtime.validated_sha,basis:'real UGO TEST role profiles + positive/negative authority matrix'}
await writeFile('artifacts/hugo-authority-judge.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
