// Reproducible local interoperability check. No requests to any external service.
// Usage: FREEAPI_CHECKOUT=/path/to/freellmapi node scripts/hive-backup-local-integration.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {PGlite} from '@electric-sql/pglite';
import {createBackupHandler,sha256} from '../supabase/functions/ugo-hive-backup-receiver/handler.mjs';
const freeapi=process.env.FREEAPI_CHECKOUT;
if(!freeapi)throw new Error('Set FREEAPI_CHECKOUT to an isolated, built FreeLLMAPI checkout');
const root=path.resolve(freeapi),requireFree=createRequire(path.join(root,'server/package.json'));
const Database=requireFree('better-sqlite3');
const {Agent,getGlobalDispatcher,setGlobalDispatcher}=requireFree('undici');
const {backupDbNow,restoreDbBackupIfNeeded}=await import(pathToFileURL(path.join(root,'server/dist/lib/db-backup.js')));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hive-interop-')),pgPath=path.join(dir,'pg');
const sqlitePath=path.join(dir,'local.sqlite'),bootstrap=path.join(dir,'bootstrap.enc');
let pg,server,sqlite;const dispatcherBefore=getGlobalDispatcher();let dispatcher;
const envKeys=['ENCRYPTION_KEY','FREEAPI_DB_BACKUP_KEY','FREEAPI_DB_BACKUP_PATH','FREEAPI_DB_BACKUP_URL','FREEAPI_DB_BACKUP_TARGET','FREEAPI_DB_BACKUP_TOKEN','FREEAPI_DB_BACKUP_STRICT'];
const old=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
const start=performance.now();
try{
 for(const k of envKeys)delete process.env[k];
 process.env.ENCRYPTION_KEY='a'.repeat(64);process.env.FREEAPI_DB_BACKUP_KEY='b'.repeat(64);
 process.env.FREEAPI_DB_BACKUP_TOKEN='dummy-test-token-'.repeat(4);
 sqlite=new Database(sqlitePath);sqlite.exec("create table fixture(value text);insert into fixture values('public-test-configuration')");
 process.env.FREEAPI_DB_BACKUP_PATH=bootstrap;await backupDbNow(sqlite,sqlitePath);
 delete process.env.FREEAPI_DB_BACKUP_PATH;sqlite.close();sqlite=null;fs.rmSync(sqlitePath);
 pg=new PGlite(pgPath);
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table usuarios(id uuid primary key,tipo text,activo boolean);
 create table autonomous_jobs(id uuid primary key,created_by uuid,status text);`);
 await pg.exec(fs.readFileSync('supabase/migrations/20261018212409_hive_test_quota_and_backup_cas.sql','utf8'));
 const store={
  stage:async version=>(await pg.query('select hive_stage_backup($1) as r',[version])).rows[0].r,
  ack:async keys=>{for(const k of keys)await pg.query('delete from hive_backup_cleanup where object_key=$1',[k]);},
  cleanup:async()=>{const {rows}=await pg.query('select hive_claim_backup_cleanup() as object_key');for(const row of rows){await store.remove([row.object_key]);await store.ack([row.object_key]);}},
  current:async()=> (await pg.query('select version,object_key,sha256,bytes,created_at from hive_backup_versions order by sequence desc limit 1')).rows[0]||null,
  put:async(k,bytes)=>{fs.mkdirSync(path.join(dir,'snapshots'),{recursive:true});fs.writeFileSync(path.join(dir,k),bytes,{flag:'wx'});},
  get:async k=>new Uint8Array(fs.readFileSync(path.join(dir,k))),
  commit:async(expected,version,hash,bytes)=>(await pg.query('select hive_commit_backup($1,$2,$3,$4) as r',[expected,version,hash,bytes])).rows[0].r,
  remove:async keys=>{for(const k of keys)fs.rmSync(path.join(dir,k),{force:true});}
 };
 const first=crypto.randomUUID(),blob=fs.readFileSync(bootstrap);
 await store.stage(first);await store.put('snapshots/'+first,blob);assert.equal((await store.commit(null,first,await sha256(blob),blob.length)).ok,true);
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(dir,'key.pem'),'-out',path.join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 const cert=fs.readFileSync(path.join(dir,'cert.pem'));
 dispatcher=new Agent({connect:{ca:cert}});setGlobalDispatcher(dispatcher);
 const startServer=async()=>{
  const handler=createBackupHandler({store,token:process.env.FREEAPI_DB_BACKUP_TOKEN,projectUrl:'https://tmossnqfwfwjrtzwcbmm.supabase.co'});
  const s=https.createServer({cert,key:fs.readFileSync(path.join(dir,'key.pem'))},async(req,res)=>{
   try{
    const parts=[];for await(const chunk of req)parts.push(chunk);
    const result=await handler(new Request('https://localhost'+req.url,{method:req.method,headers:req.headers,body:req.method==='PUT'?Buffer.concat(parts):undefined}));
    res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
   }catch{res.writeHead(500).end();}
  });
  await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));return s;
 };
 server=await startServer();process.env.FREEAPI_DB_BACKUP_URL='https://127.0.0.1:'+server.address().port+'/backup';process.env.FREEAPI_DB_BACKUP_STRICT='true';
 const restoreStarted=performance.now();await restoreDbBackupIfNeeded(sqlitePath);
 const restoreMs=Math.round(performance.now()-restoreStarted);
 sqlite=new Database(sqlitePath);assert.equal(sqlite.prepare('select value from fixture').get().value,'public-test-configuration');
 sqlite.exec("insert into fixture values('committed-second-version')");
 const concurrent=await Promise.allSettled([backupDbNow(sqlite,sqlitePath),backupDbNow(sqlite,sqlitePath)]);
 assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);assert.equal(concurrent.filter(x=>x.status==='rejected').length,1);
 sqlite.close();sqlite=null;
 // New OS process must recover its acknowledged version from the sidecar, not a GET that blesses stale state.
 await promisify(execFile)(process.execPath,['--input-type=module','-e',`import {createRequire} from 'node:module';const req=createRequire(process.env.FREEAPI_CHECKOUT+'/server/package.json');const Database=req('better-sqlite3');const {restoreDbBackupIfNeeded,backupDbNow}=await import(process.env.FREEAPI_CHECKOUT+'/server/dist/lib/db-backup.js');await restoreDbBackupIfNeeded(process.env.HIVE_SQLITE_PATH);const db=new Database(process.env.HIVE_SQLITE_PATH);try{await backupDbNow(db,process.env.HIVE_SQLITE_PATH);}finally{db.close();}`],{env:{...process.env,FREEAPI_CHECKOUT:root,HIVE_SQLITE_PATH:sqlitePath,NODE_EXTRA_CA_CERTS:path.join(dir,'cert.pem')}});
 fs.rmSync(sqlitePath);
 await new Promise(resolve=>server.close(resolve));server=null;await pg.close();pg=new PGlite(pgPath);server=await startServer();
 process.env.FREEAPI_DB_BACKUP_URL='https://127.0.0.1:'+server.address().port+'/backup';
 await restoreDbBackupIfNeeded(sqlitePath);sqlite=new Database(sqlitePath);assert.equal(sqlite.prepare('select count(*) as n from fixture').get().n,2);
 const rejected=await fetch(process.env.FREEAPI_DB_BACKUP_URL,{headers:{authorization:'Bearer invalid'}});assert.equal(rejected.status,401);
 const stale=await fetch(process.env.FREEAPI_DB_BACKUP_URL,{method:'PUT',headers:{authorization:'Bearer '+process.env.FREEAPI_DB_BACKUP_TOKEN,'content-type':'application/octet-stream','if-match':'"'+first+'"'},body:blob});assert.equal(stale.status,412);
 const garbageVersion=crypto.randomUUID(),garbageKey='snapshots/'+garbageVersion;await store.stage(garbageVersion);await store.put(garbageKey,blob);await pg.query("update hive_backup_cleanup set not_before=now()-interval '1 second' where object_key=$1",[garbageKey]);
 const remove=store.remove;store.remove=async()=>{throw new Error('simulated local deletion failure')};await fetch(process.env.FREEAPI_DB_BACKUP_URL,{headers:{authorization:'Bearer '+process.env.FREEAPI_DB_BACKUP_TOKEN}});assert.equal(fs.existsSync(path.join(dir,garbageKey)),true);assert.equal((await pg.query('select object_key from hive_backup_cleanup where object_key=$1',[garbageKey])).rows.length,1);store.remove=remove;await fetch(process.env.FREEAPI_DB_BACKUP_URL,{headers:{authorization:'Bearer '+process.env.FREEAPI_DB_BACKUP_TOKEN}});assert.equal(fs.existsSync(path.join(dir,garbageKey)),false);assert.equal((await pg.query('select object_key from hive_backup_cleanup where object_key=$1',[garbageKey])).rows.length,0);
 const metadata=await store.current();fs.writeFileSync(path.join(dir,metadata.object_key),'corrupt');
 const corrupt=await fetch(process.env.FREEAPI_DB_BACKUP_URL,{headers:{authorization:'Bearer '+process.env.FREEAPI_DB_BACKUP_TOKEN}});assert.equal(corrupt.status,502);
 console.log(JSON.stringify({result:'PASS',transport:'real loopback HTTPS with trusted ephemeral CA',sqlite_rows_after_process_store_restart:2,concurrent_backups_success:1,unauthorized:401,stale:412,corrupt:502,restore_ms:restoreMs,total_ms:Math.round(performance.now()-start),acknowledged_sidecar_new_os_process:true,cleanup_failure_then_recovery:true,remote_storage_verified:false,external_model_calls:0}));
}finally{
 sqlite?.close();if(server)await new Promise(resolve=>server.close(resolve));await pg?.close();setGlobalDispatcher(dispatcherBefore);await dispatcher?.close();
 for(const k of envKeys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}fs.rmSync(dir,{recursive:true,force:true});
}
