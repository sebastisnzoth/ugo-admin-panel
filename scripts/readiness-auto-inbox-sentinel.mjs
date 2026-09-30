import { readFile, writeFile } from 'node:fs/promises'
const p=JSON.parse(await readFile('artifacts/readiness-auto-inbox/runtime.json','utf8'))
const fail=m=>{throw new Error('SENTINEL_FAIL:'+m)}
if(p.production_touched!==false||p.environment!=='UGO TEST'||p.test_project!=='tmossnqfwfwjrtzwcbmm')fail('environment')
if(process.env.GITHUB_SHA&&p.runtime_sha!==process.env.GITHUB_SHA)fail('same_sha')
if(p.audit?.duplicate_side_effect_rows!==0)fail('idempotency')
if(p.cleanup?.fixtures_removed!==true||p.cleanup?.company_mode_restored!==true)fail('safe_final_state')
if(p.approvals?.same_actor_duplicate_blocked!==true||p.rejection?.duplicate_retry_blocked!==true)fail('duplicate_decision_guard')
const out={validator:'Sentinel',verdict:'PASS',checked_at:new Date().toISOString(),runtime_sha:p.runtime_sha,readiness_id:p.readiness_id,production_touched:false,safe_final_state:true}
await writeFile('artifacts/readiness-auto-inbox/sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
