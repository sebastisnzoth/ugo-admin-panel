import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20261023080000_hive_local_mission_queue.sql','utf8');
const edge=fs.readFileSync('supabase/functions/ugo-hive-local-jobs/index.ts','utf8');
test('mission data is isolated with RLS and only a privileged service can mutate',()=>{
 assert.match(sql,/hive_local_missions enable row level security/);
 assert.match(sql,/hive_local_mission_tasks enable row level security/);
 assert.match(sql,/revoke all on public\.hive_local_missions from public,anon,authenticated/);
 assert.match(sql,/revoke all on function public\.hive_local_advance_mission\(uuid,uuid\) from public,anon,authenticated/);
 assert.match(sql,/auth\.role\(\) is distinct from 'service_role'/);
});
test('mission advancement is locked, bounded and uses the existing inference queue',()=>{
 assert.match(sql,/for update/);
 assert.match(sql,/cardinality\(p_agents\) not between 1 and 9/);
 assert.match(sql,/j\.status in \('PENDING','RUNNING'\)/);
 assert.match(sql,/insert into public\.hive_local_inference_jobs/);
 assert.match(sql,/insert into public\.hive_local_mission_tasks/);
 assert.match(sql,/j\.status='FAILED'/);
 assert.match(sql,/previous agent answer/i);
});
test('TEST Edge enforces Super Admin before protected mission operations',()=>{
 assert.match(edge,/SUPERADMIN_REQUIRED/);
 assert.match(edge,/action==='create_mission'/);
 assert.match(edge,/action==='advance_mission'/);
 assert.match(edge,/action==='cancel_mission'/);
 assert.match(edge,/action==='list_missions'/);
 assert.match(edge,/p_user_id:auth\.user\.id/);
 assert.match(edge,/p_user_id:auth\.user\.id,p_objective:body\.objective/);
 assert.doesNotMatch(edge,/action==='autonomy_on'/);
});

test('worker polling advances durable missions even with Hive Console closed',()=>{
 assert.match(sql,/create or replace function public\.hive_local_pump_missions\(\)/);
 assert.match(sql,/public\.hive_local_advance_mission\(item\.id,item\.user_id\)/);
 assert.match(sql,/grant execute on function public\.hive_local_pump_missions\(\) to service_role/);
 assert.match(edge,/db\.rpc\('hive_local_pump_missions'\)/);
 assert.match(edge,/MISSION_PUMP_UNAVAILABLE/);
});

test('mission pump SQL body is delimited by a matching PostgreSQL dollar quote',()=>{
 assert.match(sql,/as \$mission_pump\$/);
 assert.match(sql,/end \$mission_pump\$;/);
});

test('mission creation requires a durable key and rejects mismatched replays',()=>{
 assert.match(sql,/idempotency_key uuid not null/);
 assert.match(sql,/unique\(user_id,idempotency_key\)/);
 assert.match(sql,/HIVE_IDEMPOTENCY_CONFLICT/);
 assert.match(edge,/p_key:body\.idempotency_key/);
 assert.match(edge,/INVALID_MISSION/);
});

test('mission Console holds idempotency key across uncertain requests',()=>{
 const source=fs.readFileSync('src/mvp/HiveConsole.tsx','utf8');
 assert.match(source,/pendingMissionRef=React\.useRef/);
 assert.match(source,/pendingMissionRef\.current\?\.signature!==signature/);
 assert.match(source,/idempotency_key:pendingMissionRef\.current\.key/);
 assert.match(source,/pendingMissionRef\.current=null/);
});

test('mission create RPC service grant matches its four-argument signature',()=>{
 assert.match(sql,/grant execute on function public\.hive_local_create_mission\(uuid,text,text\[\],uuid\) to service_role/);
 assert.doesNotMatch(sql,/grant execute on function public\.hive_local_create_mission\(uuid,text,text\[\]\) to service_role/);
});

test('mission cancellation locks and rechecks the current job before cancelling',()=>{
 assert.match(sql,/select \* into j from public\.hive_local_inference_jobs where id=m\.current_job_id for update/);
 assert.match(sql,/if found and j\.status='RUNNING' then return false;end if/);
});

test('mission tables explicitly revoke PUBLIC as well as browser roles',()=>{
 assert.match(sql,/revoke all on public\.hive_local_missions from public,anon,authenticated/);
 assert.match(sql,/revoke all on public\.hive_local_mission_tasks from public,anon,authenticated/);
});
