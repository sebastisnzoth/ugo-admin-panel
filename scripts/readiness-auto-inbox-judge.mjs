import { readFile, writeFile } from 'node:fs/promises'
const p=JSON.parse(await readFile('artifacts/readiness-auto-inbox/runtime.json','utf8'))
const fail=m=>{throw new Error('JUDGE_FAIL:'+m)}
if(p.readiness_id!=='auto-inbox'||p.environment!=='UGO TEST')fail('identity')
if(p.ui?.idempotency_deduplicated!==true||p.ui?.duplicate_rows_rendered!==1)fail('dedup')
if(p.ui?.priority_order!=='PASS'||p.ui?.sla_labels!=='PASS'||p.ui?.page_errors!==0)fail('ordering_or_ui')
if(p.approvals?.first_approval!=='PASS'||p.approvals?.same_actor_duplicate_blocked!==true||p.approvals?.approval_count!==1)fail('approval')
if((p.approvals?.decision_rows||[]).length!==1||p.approvals.decision_rows[0]?.decision!=='YELLOW_FIRST_APPROVAL')fail('approval_audit')
if(p.rejection?.status!=='CANCELLED'||p.rejection?.duplicate_retry_blocked!==true)fail('rejection')
if((p.rejection?.decision_rows||[]).length!==1||p.rejection.decision_rows[0]?.decision!=='HUMAN_REJECTED')fail('rejection_audit')
if(p.audit?.duplicate_side_effect_rows!==0)fail('duplicate_side_effects')
if(p.cleanup?.active_fixtures_closed!==true||p.cleanup?.audit_history_retained!==true||p.cleanup?.company_mode_restored!==true)fail('cleanup')
const out={validator:'Judge',verdict:'PASS',checked_at:new Date().toISOString(),runtime_sha:p.runtime_sha,readiness_id:p.readiness_id,correlation_id:p.correlation_id}
await writeFile('artifacts/readiness-auto-inbox/judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
