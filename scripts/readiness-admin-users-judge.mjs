import { readFile, writeFile } from 'node:fs/promises'
const p=JSON.parse(await readFile('artifacts/readiness-admin-users/runtime.json','utf8'))
const fail=m=>{throw new Error('JUDGE_FAIL:'+m)}
if(p.readiness_id!=='admin-users'||p.environment!=='UGO TEST')fail('identity')
if(!p.target?.id||!p.target?.created_at)fail('user_dates')
if(p.admin_access?.users<1)fail('users')
if(p.permissions?.non_admin_audit_rows!==0||p.permissions?.non_owner_document_rows!==0)fail('permissions')
if(p.permissions?.admin_sensitive_reads!=='PASS')fail('admin_access')
const out={validator:'Judge',verdict:'PASS',checked_at:new Date().toISOString(),runtime_sha:p.runtime_sha,readiness_id:p.readiness_id}
await writeFile('artifacts/readiness-admin-users/judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
