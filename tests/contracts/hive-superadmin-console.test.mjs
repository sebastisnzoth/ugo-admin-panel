import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const root='src/mvp/'
const consoleCode=fs.readFileSync(root+'HiveConsole.tsx','utf8')
const gate=fs.readFileSync(root+'AdminGate.tsx','utf8')
const shell=fs.readFileSync(root+'AdminPhase2.tsx','utf8')
test('Hive navigation is Super Admin only and auth gate enforces this section',()=>{
 assert.match(gate,/requestedSection==='hive'/)
 assert.match(gate,/profile\.tipo==='superadmin'/)
 assert.match(shell,/isSuperAdmin&&<button[^\n]+section==='hive'/)
 assert.match(shell,/section==='hive'&&isSuperAdmin/)
})
test('Hive chat queues authenticated TEST inference with bounded fields and no client-side provider credentials',()=>{
 assert.match(consoleCode,/supabase\.functions\.invoke<HiveStatus>\('ugo-hive-status'/)
 assert.match(consoleCode,/supabase\.functions\.invoke\('ugo-hive-local-jobs'/)
 assert.match(consoleCode,/action:'create',prompt:value,agent:selectedAgent,idempotency_key:id/)
 assert.match(consoleCode,/action:'list'/)
 assert.match(consoleCode,/action:'worker_status'/)
 assert.match(consoleCode,/crypto\.randomUUID\(\)/)
 assert.match(consoleCode,/disabled=\{!chatVerified\|\|sending\|\|!prompt\.trim\(\)\}/)
 assert.doesNotMatch(consoleCode,/signInWithPassword\(|localStorage|OPENROUTER_API_KEY|FREEAPI_API_KEY/)
})
test('Hive multilingual UI copy is present and no fictional metrics are rendered',()=>{
 assert.match(consoleCode,/'pt-BR':/)
 assert.match(consoleCode,/'es':/)
 assert.match(consoleCode,/'en':/)
 assert.match(consoleCode,/setInterval\(\(\)=>void refresh\(\),5000\)/)
 assert.doesNotMatch(consoleCode,/Math\.random|fakeData|mockMetrics/)
})

test('Nine Hive analysis personas route only through existing guarded TEST inference',()=>{
 assert.match(consoleCode,/const catalog=/)
 assert.match(consoleCode,/const \[selectedAgent,setSelectedAgent\]=useState/)
 assert.match(consoleCode,/agent:selectedAgent/)
 assert.match(consoleCode,/job.agent/)
 assert.match(consoleCode,/value=\{selectedAgent\}/)
 assert.match(consoleCode,/setSelectedAgent\(name\);setTab\('chat'\)/)
 assert.doesNotMatch(consoleCode,/action:'execute'|action:'autonomy_on'|action:'grant_permission'/)
})

test('TEST Edge validates nine agents server-side and attributes persisted jobs',()=>{
 const edge=fs.readFileSync('supabase/functions/ugo-hive-local-jobs/index.ts','utf8')
 assert.match(edge,/const agents=\['Hugo','Architect','Developer','QA','Security','DevOps','Judge','Sentinel','Research'\]/)
 assert.match(edge,/agents\.includes\(body\.agent\)/)
 assert.match(edge,/hive_local_create_agent_job/)
 assert.match(edge,/agent_id\?\?'Legacy'/)
 assert.match(consoleCode,/job\.agent\?\?tr\.legacy/)
 assert.match(edge,/p_prompt:payload,p_key:body\.idempotency_key,p_agent:agent/)
 assert.match(edge,/SUPABASE_URL'\)!==URL/)
 assert.doesNotMatch(edge,/action==='execute'|action==='autonomy_on'/)
})

test('Hive TEST agent identity is structured, server-owned and rejects idempotency conflicts',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261023070000_hive_local_agent_identity.sql','utf8')
 const edge=fs.readFileSync('supabase/functions/ugo-hive-local-jobs/index.ts','utf8')
 assert.match(sql,/add column if not exists agent_id text/)
 assert.match(sql,/HIVE_IDEMPOTENCY_CONFLICT/)
 assert.match(sql,/j\.agent_id is distinct from p_agent/)
 assert.match(sql,/grant execute on function public\.hive_local_create_agent_job\(uuid,text,uuid,text\) to service_role/)
 assert.match(edge,/select\('id,status,agent_id,answer,model,error_code,created_at,updated_at'\)/)
 assert.doesNotMatch(edge,/jobRole\(prompt\)/)
});
