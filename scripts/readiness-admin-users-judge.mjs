import { readFile, writeFile } from 'node:fs/promises'
const p=JSON.parse(await readFile('artifacts/readiness-admin-users/runtime.json','utf8'))
const fail=m=>{throw new Error('JUDGE_FAIL:'+m)}
if(p.readiness_id!=='admin-users'||p.environment!=='UGO TEST')fail('identity')
if(!p.target?.id||!p.target?.created_at)fail('user_dates')
if(p.admin_access?.users<1)fail('users')
if(p.admin_access?.services<1)fail('services')
if(p.admin_access?.documents<1)fail('documents')
if(p.admin_access?.audits<1)fail('audits')
if(p.admin_access?.timeline_rows<1||!p.admin_access?.sample_service_timestamps?.length)fail('timeline')
if(p.permissions?.non_admin_audit_rows!==0||p.permissions?.non_owner_document_rows!==0)fail('permissions')
if(p.permissions?.admin_sensitive_reads!=='PASS')fail('admin_access')
const out={validator:'Judge',verdict:'PASS',checked_at:new Date().toISOString(),runtime_sha:p.runtime_sha,readiness_id:p.readiness_id}
await writeFile('artifacts/readiness-admin-users/judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
