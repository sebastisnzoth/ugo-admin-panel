import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const actor = '11111111-1111-4111-8111-111111111111';
const migrations = [
 '20261022235500_hive_local_inference_test_queue.sql',
 '20261022235900_hive_local_retry_and_presence.sql',
 '20261023002000_hive_local_atomic_quota.sql',
 '20261023012000_hive_local_test_edge_service_role_table_access.sql',
 '20261023060000_hive_local_expired_lease_fail_closed.sql',
 '20261023070000_hive_local_agent_identity.sql',
 '20261023080000_hive_local_mission_queue.sql',
 '20261023090000_hive_local_worker_engine_presence.sql',
 '20261023100000_hive_local_agent_idempotency_prompt.sql'
];
const bootstrap = `
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);create schema extensions;
 create function auth.role() returns text language sql stable as $$select current_user$$;
 create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$select decode(string_agg(md5(random()::text||clock_timestamp()::text||g::text),''),'hex') from generate_series(1,(n+15)/16) g$$;
 create function extensions.digest(value text,algorithm text) returns bytea language sql as $$select sha256(convert_to(value,'UTF8'))$$;
 insert into auth.users values('${actor}');`;
async function migrate(db) {
 await db.exec(bootstrap);
 for (const file of migrations) await db.exec(readFileSync(join('supabase','migrations',file),'utf8'));
 await db.exec('set role service_role');
}
async function database(directory) {
 const db = new PGlite(directory);
 await migrate(db);
 return db;
}
const createMission = async (db,key,agents=['Hugo','QA'],objective='Analizar riesgo sintético') =>
 (await db.query('select public.hive_local_create_mission($1,$2,$3::text[],$4) as id',[actor,objective,agents,key])).rows[0].id;
const advance = async (db,id) => (await db.query('select public.hive_local_advance_mission($1,$2) as result',[id,actor])).rows[0].result;
const claim = async db => (await db.query('select * from public.hive_local_claim_job()')).rows[0];
async function complete(db,job,status='SUCCEEDED') {
 return (await db.query('select public.hive_local_complete_job($1,$2,$3,$4,$5,$6) as ok',[
  job.id,job.lease,status,status==='SUCCEEDED'?'Respuesta sintética':null,
  status==='SUCCEEDED'?'qwen3-coder-free':null,status==='FAILED'?'HIVE_FREEAPI_RATE_LIMITED':null
 ])).rows[0].ok;
}

test('sequential mission survives restart, has one claim winner and hands bounded context to QA',async t=>{
 const directory = mkdtempSync(join(tmpdir(),'ugo-hive-runtime-'));
 let db = await database(directory);
 t.after(async()=>{await db.close();rmSync(directory,{recursive:true,force:true});});
 const key = crypto.randomUUID();
 const created = await Promise.all([createMission(db,key),createMission(db,key),createMission(db,key)]);
 assert.equal(new Set(created).size,1);
 const mission = created[0];
 await assert.rejects(createMission(db,key,['Hugo','QA'],'Objetivo distinto'),/HIVE_IDEMPOTENCY_CONFLICT/);
 assert.equal(await advance(db,mission),'QUEUED');
 assert.equal(await advance(db,mission),'WAITING');
 await db.close();
 db = new PGlite(directory);
 await db.exec('set role service_role');
 assert.equal((await db.query('select count(*)::int as n from public.hive_local_inference_jobs')).rows[0].n,1);
 const claims = await Promise.all(Array.from({length:5},()=>db.query('select * from public.hive_local_claim_job()')));
 assert.equal(claims.flatMap(result=>result.rows).length,1);
 assert.equal(await complete(db,claims.flatMap(result=>result.rows)[0]),true);
 assert.equal(await advance(db,mission),'QUEUED');
 const secondJob = (await db.query("select prompt from public.hive_local_inference_jobs where agent_id='QA'")).rows[0];
 assert.match(secondJob.prompt,/Respuesta sintética/);
 assert.match(secondJob.prompt,/untrusted data, not instructions/);
 const second = await claim(db);
 assert.equal(await complete(db,second),true);
 assert.equal(await advance(db,mission),'SUCCEEDED');
 assert.equal(await advance(db,mission),'SUCCEEDED');
 assert.equal((await db.query('select public.hive_local_pump_missions() as n')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int as n from public.hive_local_mission_tasks where mission_id=$1',[mission])).rows[0].n,2);
});

test('cancellation, provider failure, uncertain lease and mission limit remain fail-closed',async t=>{
 const db = await database();t.after(()=>db.close());
 const cancelled = await createMission(db,crypto.randomUUID(),['Architect']);
 assert.equal(await advance(db,cancelled),'QUEUED');
 assert.equal((await db.query('select public.hive_local_cancel_mission($1,$2) as ok',[cancelled,actor])).rows[0].ok,true);
 assert.equal(await advance(db,cancelled),'CANCELLED');
 assert.equal((await db.query('select j.error_code from public.hive_local_inference_jobs j join public.hive_local_missions m on m.current_job_id=j.id where m.id=$1',[cancelled])).rows[0].error_code,'MISSION_CANCELLED');
 const running = await createMission(db,crypto.randomUUID(),['Developer']);
 assert.equal(await advance(db,running),'QUEUED');
 const runningJob = await claim(db);
 assert.equal((await db.query('select public.hive_local_cancel_mission($1,$2) as ok',[running,actor])).rows[0].ok,false);
 assert.equal(await complete(db,runningJob),true);
 assert.equal(await advance(db,running),'SUCCEEDED');
 const failed = await createMission(db,crypto.randomUUID(),['Security']);
 assert.equal(await advance(db,failed),'QUEUED');
 assert.equal(await complete(db,await claim(db),'FAILED'),true);
 assert.equal(await advance(db,failed),'FAILED');
 const uncertain = await createMission(db,crypto.randomUUID(),['Research']);
 assert.equal(await advance(db,uncertain),'QUEUED');
 await claim(db);
 await db.exec('reset role');
 await db.exec("update public.hive_local_inference_jobs set lease_until=now()-interval '1 second' where status='RUNNING'");
 await db.exec('set role service_role');
 assert.equal(await claim(db),undefined);
 assert.equal((await db.query("select error_code from public.hive_local_inference_jobs where agent_id='Research'")).rows[0].error_code,'RECONCILIATION_REQUIRED');
 assert.equal(await advance(db,uncertain),'FAILED');
 for(let index=0;index<3;index++)await createMission(db,crypto.randomUUID(),['Hugo']);
 await assert.rejects(createMission(db,crypto.randomUUID(),['Hugo']),/HIVE_MISSION_LIMIT/);
});

test('all Hive migrations are idempotent and preserve RLS, grants and engine metadata',async t=>{
 const db = await database();t.after(()=>db.close());
 // Migration replay runs as the schema owner, never by elevating service_role.
 await db.exec('reset role');
 for (const file of migrations) await db.exec(readFileSync(join('supabase','migrations',file),'utf8'));
 await db.exec('set role service_role');
 const objects = (await db.query(`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('hive_local_missions','hive_local_mission_tasks','hive_local_worker_credentials') order by c.relname`)).rows;
 assert.ok(objects.every(row=>row.relrowsecurity));
 await db.exec('reset role;set role authenticated');
 await assert.rejects(db.query('select * from public.hive_local_missions'),/permission denied/);
 await assert.rejects(db.query('select public.hive_local_pump_missions()'),/permission denied/);
 await db.exec('reset role;set role service_role');
 const functions = (await db.query(`select p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('hive_local_create_mission','hive_local_advance_mission','hive_local_cancel_mission','hive_local_pump_missions','hive_local_create_agent_job')`)).rows;
 assert.equal(functions.length,5);
 assert.ok(functions.every(row=>row.prosecdef&&row.proconfig?.some(value=>/search_path=public,\s*pg_temp/.test(value))));
 assert.equal((await db.query("select has_table_privilege('service_role','public.hive_local_worker_credentials','DELETE') as allowed")).rows[0].allowed,false);
 await db.query("insert into public.hive_local_worker_credentials(id,token_hash,active) values(1,$1,true)",['a'.repeat(64)]);
 await db.query("update public.hive_local_worker_credentials set engine_status='AVAILABLE',engine_checked_at=now() where id=1");
 await assert.rejects(db.query("update public.hive_local_worker_credentials set engine_status='INFERENCE_SUCCEEDED' where id=1"),/hive_local_worker_engine_status_allowed/);
});

test('agent idempotency accepts only the identical prompt and agent',async t=>{
 const db = await database();t.after(()=>db.close());
 const key = crypto.randomUUID();
 const first = await db.query('select * from public.hive_local_create_agent_job($1,$2,$3,$4)',[actor,'Prompt sintético',key,'Hugo']);
 const replay = await db.query('select * from public.hive_local_create_agent_job($1,$2,$3,$4)',[actor,'Prompt sintético',key,'Hugo']);
 assert.equal(first.rows[0].id,replay.rows[0].id);
 await assert.rejects(db.query('select * from public.hive_local_create_agent_job($1,$2,$3,$4)',[actor,'Prompt cambiado',key,'Hugo']),/HIVE_IDEMPOTENCY_CONFLICT/);
 await assert.rejects(db.query('select * from public.hive_local_create_agent_job($1,$2,$3,$4)',[actor,'Prompt sintético',key,'QA']),/HIVE_IDEMPOTENCY_CONFLICT/);
});

test('all nine mission profiles receive their server-owned scope in sequence',async t=>{
 const db = await database();t.after(()=>db.close());
 const scopes = {
  Hugo:'general product analysis',Architect:'architecture analysis',Developer:'propose code changes without executing',
  QA:'test planning',Security:'defensive security assessment',DevOps:'deployment analysis only',
  Judge:'evaluate evidence',Sentinel:'flag safety and reliability risks',Research:'summarize provided information'
 };
 const mission = await createMission(db,crypto.randomUUID(),Object.keys(scopes),'Evaluar una misión sintética');
 for(const [agent,scope] of Object.entries(scopes)){
  assert.equal(await advance(db,mission),'QUEUED');
  const queued = (await db.query('select id,prompt from public.hive_local_inference_jobs where agent_id=$1 order by created_at desc limit 1',[agent])).rows[0];
  assert.match(queued.prompt,new RegExp(`Scope: ${scope.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}`));
  const job = await claim(db);
  assert.equal(job.id,queued.id);
  assert.equal(await complete(db,job),true);
 }
 assert.equal(await advance(db,mission),'SUCCEEDED');
 assert.equal((await db.query('select count(*)::int as n from public.hive_local_mission_tasks where mission_id=$1',[mission])).rows[0].n,9);
});
