import { readFile, writeFile } from 'node:fs/promises'
const p=JSON.parse(await readFile('artifacts/readiness-admin-users/runtime.json','utf8'))
const fail=m=>{throw new Error('SENTINEL_FAIL:'+m)}
if(p.production_touched!==false||p.test_project!=='tmossnqfwfwjrtzwcbmm'||p.environment!=='UGO TEST')fail('environment')
if(process.env.GITHUB_SHA&&p.runtime_sha!==process.env.GITHUB_SHA)fail('sha')
if(p.permissions?.non_admin_audit_rows!==0||p.permissions?.non_owner_document_rows!==0)fail('isolation')
const out={validator:'Sentinel',verdict:'PASS',checked_at:new Date().toISOString(),runtime_sha:p.runtime_sha,readiness_id:p.readiness_id,production_touched:false}
await writeFile('artifacts/readiness-admin-users/sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
