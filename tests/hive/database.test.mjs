import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const sql=readFileSync('supabase/migrations/20261018212409_hive_test_quota_and_backup_cas.sql','utf8');
const actor='00000000-0000-4000-8000-000000000001';
const mission='00000000-0000-4000-8000-000000000002';
async function setup(path){
 const db=new PGlite(path); await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create type usuario_tipo as enum('superadmin','cliente');
 create table public.usuarios(id uuid primary key, tipo usuario_tipo, activo boolean);
 create table public.autonomous_jobs(id uuid primary key, created_by uuid,status text);
 insert into usuarios values('${actor}','superadmin',true);
 insert into autonomous_jobs values('${mission}','${actor}','RUNNING');
 grant select on usuarios,autonomous_jobs to service_role;`);
 await db.exec(sql); return db;
}
async function reserve(db,id=crypto.randomUUID(),job=mission,provider='freellmapi',tokens=256){
 return (await db.query('select public.hive_reserve_model_call($1,$2,$3,$4,$5) as r',[id,actor,job,provider,tokens])).rows[0].r;
}
test('SQL quotas persist across engine restart, are idempotent and reject unauthorized roles',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'hive-pg-')); let db;
 try {
  db=await setup(dir);
  await db.exec('set role anon');
  await assert.rejects(reserve(db),/permission denied/); await db.exec('reset role');
  await db.exec('set role authenticated'); await assert.rejects(reserve(db),/permission denied/); await db.exec('reset role');
  await db.exec('set role service_role');
  const id=crypto.randomUUID(); assert.equal((await reserve(db,id)).allowed,true);
  assert.equal((await reserve(db,id)).code,'REQUEST_ALREADY_RESERVED');
  await assert.rejects(reserve(db,id,mission,'openrouter'),/IDEMPOTENCY_CONFLICT/);
  // Submitted concurrently to the embedded engine. Multi-session lock stress remains a remote gate.
  const results=await Promise.all(Array.from({length:25},()=>reserve(db)));
  assert.equal(results.filter(x=>x.allowed).length,4);
  assert.equal(results.filter(x=>x.code==='GLOBAL_QUOTA_EXHAUSTED').length,21);
  await db.close(); db=new PGlite(dir);
  await db.exec('set role service_role'); assert.equal((await reserve(db)).code,'GLOBAL_QUOTA_EXHAUSTED');
 }finally{await db?.close();rmSync(dir,{recursive:true,force:true});}
});
test('global and user quotas share providers, failed calls stay charged, circuits persist',async()=>{
 const db=await setup();
 try {
  const jobs=[]; for(let i=0;i<6;i++){const id=crypto.randomUUID();jobs.push(id);await db.query('insert into autonomous_jobs values($1,$2,\'RUNNING\')',[id,actor]);}
  for(let i=0;i<10;i++) assert.equal((await reserve(db,crypto.randomUUID(),jobs[i%6],i%2?'freellmapi':'openrouter',100)).allowed,true);
  assert.equal((await reserve(db,crypto.randomUUID(),mission)).code,'GLOBAL_QUOTA_EXHAUSTED');
  const id=crypto.randomUUID(); await db.exec('delete from hive_model_reservations');
  await reserve(db,id); await db.query('select hive_finish_model_call($1,false,60)',[id]);
  assert.equal((await reserve(db)).code,'CIRCUIT_OPEN');
  assert.equal((await db.query('select count(*)::int as n from hive_model_reservations')).rows[0].n,1);
  await db.exec(`update usuarios set activo=false`); await assert.rejects(reserve(db),/SUPERADMIN_REQUIRED/);
 } finally {await db.close();}
});
test('backup pointer uses CAS, keeps three versions, denies browser access',async()=>{
 const db=await setup();
 const commit=async(expected,version)=> {await db.query('select hive_stage_backup($1)',[version]);return (await db.query('select hive_commit_backup($1,$2,$3,100) as r',[expected,version,'a'.repeat(64)])).rows[0].r;};
 try {
  const first=crypto.randomUUID(); assert.equal((await commit(null,first)).ok,true);
  const versions=[crypto.randomUUID(),crypto.randomUUID()];
  const race=await Promise.all(versions.map(v=>commit(first,v)));
  assert.equal(race.filter(x=>x.ok).length,1);
  let current=race.find(x=>x.ok).version;
  for(let i=0;i<5;i++){const next=crypto.randomUUID();assert.equal((await commit(current,next)).ok,true);current=next;}
  assert.equal((await db.query('select count(*)::int as n from hive_backup_versions')).rows[0].n,3);
  assert.equal((await commit(first,crypto.randomUUID())).code,'STALE_BACKUP');
  await db.exec('set role authenticated'); await assert.rejects(commit(current,crypto.randomUUID()),/permission denied/);
 } finally {await db.close();}
});
test('global and provider daily budgets are enforced across four actors and both providers',async()=>{
 const db=await setup();
 try{
  const actors=Array.from({length:4},()=>crypto.randomUUID()),jobs=Array.from({length:8},()=>crypto.randomUUID());
  for(let i=0;i<4;i++){await db.query("insert into usuarios values($1,'superadmin',true)",[actors[i]]);await db.query("insert into autonomous_jobs values($1,$2,'RUNNING')",[jobs[i],actors[i]]);}
  for(let i=4;i<8;i++)await db.query("insert into autonomous_jobs values($1,$2,'RUNNING')",[jobs[i],actors[i%4]]);
  const call=async i=>(await db.query('select hive_reserve_model_call($1,$2,$3,$4,100) as r',[crypto.randomUUID(),actors[i%4],jobs[(i<16?0:4)+i%4],i<16?'freellmapi':'openrouter'])).rows[0].r;
  for(let i=0;i<15;i++)assert.equal((await call(i)).allowed,true);
  assert.equal((await call(15)).code,'GLOBAL_QUOTA_EXHAUSTED'); // provider15 reached, global remains15
  for(let i=16;i<21;i++)assert.equal((await call(i)).allowed,true);
  assert.equal((await call(21)).code,'GLOBAL_QUOTA_EXHAUSTED');
 }finally{await db.close();}
});
test('cleanup records survive deletion failures and pending uploads have a hard bound',async()=>{
 const db=await setup();
 try{
  let expected=null;
  for(let i=0;i<4;i++){
   const version=crypto.randomUUID();await db.query('select hive_stage_backup($1)',[version]);
   const {rows}=await db.query('select hive_commit_backup($1,$2,$3,100) as r',[expected,version,'a'.repeat(64)]);assert.equal(rows[0].r.ok,true);expected=version;
  }
  // Removed metadata has a durable tombstone, even if the subsequent Storage delete fails.
  assert.equal((await db.query('select count(*)::int as n from hive_backup_cleanup')).rows[0].n,1);
  for(let i=0;i<31;i++)assert.equal((await db.query('select hive_stage_backup($1) as r',[crypto.randomUUID()])).rows[0].r,true);
  assert.equal((await db.query('select hive_stage_backup($1) as r',[crypto.randomUUID()])).rows[0].r,false);
  await db.exec('delete from hive_backup_cleanup'); // acknowledgement after fixture deletion recovery
  assert.equal((await db.query('select hive_stage_backup($1) as r',[crypto.randomUUID()])).rows[0].r,true);
 }finally{await db.close();}
});

test('expired uploads cannot commit after cleanup has selected their bytes',async()=>{const db=await setup();try{const version=crypto.randomUUID();await db.query('select hive_stage_backup($1)',[version]);await db.exec("update hive_backup_cleanup set not_before=now()-interval '1 second'");const selected=await db.query('select hive_claim_backup_cleanup() as object_key');assert.equal(selected.rows[0].object_key,'snapshots/'+version);const result=(await db.query('select hive_commit_backup(null,$1,$2,100) as r',[version,'a'.repeat(64)])).rows[0].r;assert.equal(result.code,'UPLOAD_STAGE_EXPIRED');assert.equal((await db.query('select count(*)::int as n from hive_backup_versions')).rows[0].n,0);}finally{await db.close();}});
