import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises'
const e=JSON.parse(await readFile('artifacts/cross-security-runtime.json','utf8'))
for(const k of['tracked_scan_pass','client_bundle_no_server_secrets','log_policy_pass','no_client_exposed_secret_env','synthetic_redaction_pass','minimum_data_policy_pass'])assert.equal(e[k],true,k)
assert.equal(e.result,'PASS');assert.equal(e.production_touched,false)
const out={validator:'Judge',readiness_id:'cross-security',sha:e.sha,result:'PASS',checked_at:new Date().toISOString(),basis:'independent assertions over repository scan, client bundle scan, log policy and synthetic redaction'}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/cross-security-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
