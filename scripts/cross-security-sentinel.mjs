import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises'
const e=JSON.parse(await readFile('artifacts/cross-security-runtime.json','utf8'))
assert.equal(e.production_touched,false);assert.equal(e.result,'PASS');assert.equal(e.tracked_findings.length,0);assert.equal(e.bundle_hits.length,0);assert.equal(e.risky_log_calls.length,0);assert.equal(e.risky_client_env.length,0)
const out={validator:'Sentinel',readiness_id:'cross-security',sha:e.sha,result:'PASS',production_touched:false,secrets_used:'synthetic-only',checked_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/cross-security-sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
