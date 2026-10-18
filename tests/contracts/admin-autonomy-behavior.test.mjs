import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'

// Execute the real component handler; only its network/state boundaries are controlled.
const source=await readFile(new URL('../../src/mvp/SuperAdminCommandCenter.tsx',import.meta.url),'utf8')
const action=source.split('const handleAutonomyModeChange=')[1].split('; if(!authorized&&!loading)')[0]
const js=ts.transpileModule('const handler='+action,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
function harness(options={}){
 let error='',reads=0,calls=0,refreshes=0
 const supabase={
  rpc:async()=>({data:{status:options.gateStatus||'READY',blockers:['QA_REQUIRED']},error:options.gateError||null}),
  auth:{getSession:async()=>({data:{session:options.noSession?null:{access_token:'test-token'}}})},
  from:()=>({select:()=>({maybeSingle:async()=>{reads++;return {data:{mode:options.persistedMode||'ON'},error:options.readError||null}}})})
 }
 const fetch=async()=>{calls++;return {ok:!options.apiError,status:409,json:async()=>({error:options.apiError,mode:'ON'})}}
 const load=async()=>{refreshes++;error=''}
 const handler=new Function('supabase','fetch','load','setError','authorized','autonomy','window',js+';return handler')(
  supabase,fetch,load,value=>{error=value},true,{mode:options.currentMode||'OFF'},{location:{hostname:'localhost'}})
 return {handler,get error(){return error},get reads(){return reads},get calls(){return calls},get refreshes(){return refreshes}}
}
test('blocked ON never calls mutation API and keeps the blocker message',async()=>{const h=harness({gateStatus:'BLOCKED'});await h.handler('ON','test');assert.equal(h.calls,0);assert.match(h.error,/QA_REQUIRED/);assert.equal(h.refreshes,1)})
test('API rejection is shown after refreshing',async()=>{const h=harness({apiError:'DENIED'});await h.handler('ON','test');assert.match(h.error,/DENIED/);assert.equal(h.reads,0)})
test('expired session does not send a mutation',async()=>{const h=harness({noSession:true});await h.handler('ON','test');assert.match(h.error,/sesión.*venció/);assert.equal(h.calls,0)})
test('API success with unchanged persisted mode reports an unverified change',async()=>{const h=harness({persistedMode:'OFF'});await h.handler('ON','test');assert.match(h.error,/no se confirmó/);assert.equal(h.reads,1)})
test('failed persistence read is surfaced',async()=>{const h=harness({readError:new Error('READ_FAILED')});await h.handler('ON','test');assert.match(h.error,/READ_FAILED/)})
test('matching persisted mode completes without an error',async()=>{const h=harness();await h.handler('ON','test');assert.equal(h.error,'');assert.equal(h.reads,1)})
test('OFF remains available when ON readiness evaluation is unavailable',async()=>{const h=harness({currentMode:'ON',persistedMode:'OFF',gateError:new Error('GATE_UNAVAILABLE')});await h.handler('OFF','stop');assert.equal(h.calls,1);assert.equal(h.error,'')})
