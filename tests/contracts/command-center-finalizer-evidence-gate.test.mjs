import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const script=path.join(root,'scripts/end-to-end-command-center-gate-finalize.mjs')
const sha='a'.repeat(40)

function runCase({env={},runtimeOverrides={},judgeOverrides={},sentinelOverrides={}}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ugo-gate-'))
 try{
  fs.mkdirSync(path.join(dir,'artifacts'))
  fs.mkdirSync(path.join(dir,'docs/ugo-work-locks'),{recursive:true})
  fs.writeFileSync(path.join(dir,'artifacts/end-to-end-command-center-gate-runtime.json'),JSON.stringify({
   result:'PASS',sha,environment:'UGO TEST',autonomous_scope_complete:true,launch_authorized:false,production_touched:false,
   totals:{},human_required_ids:[],critical_verified_ids:[],...runtimeOverrides
  }))
  fs.writeFileSync(path.join(dir,'artifacts/end-to-end-command-center-gate-judge.json'),JSON.stringify({judge:'PASS',sha,...judgeOverrides}))
  fs.writeFileSync(path.join(dir,'artifacts/end-to-end-command-center-gate-sentinel.json'),JSON.stringify({sentinel:'PASS',sha,...sentinelOverrides}))
  const lock='docs/ugo-work-locks/readiness-end-to-end-command-center-gate.json'
  fs.writeFileSync(path.join(dir,lock),JSON.stringify({status:'WAITING_EVIDENCE',evidence_ids:[]}))
  const result=spawnSync(process.execPath,[script],{cwd:dir,env:{...process.env,GITHUB_SHA:sha,GITHUB_RUN_ID:'123456',GITHUB_RUN_ATTEMPT:'1',...env},encoding:'utf8'})
  const saved=JSON.parse(fs.readFileSync(path.join(dir,lock),'utf8'))
  return {status:result.status,stderr:result.stderr,saved}
 } finally {fs.rmSync(dir,{recursive:true,force:true})}
}

test('finalizer closes only matching SHA with independent PASS and real run identity',()=>{
 const result=runCase()
 assert.equal(result.status,0,result.stderr)
 assert.equal(result.saved.status,'DONE')
 assert.equal(result.saved.verified_sha,sha)
})
test('finalizer rejects missing GitHub run identity without changing lock',()=>{
 const result=runCase({env:{GITHUB_RUN_ID:''}})
 assert.notEqual(result.status,0)
 assert.equal(result.saved.status,'WAITING_EVIDENCE')
})
test('finalizer rejects evidence from a different SHA without changing lock',()=>{
 const result=runCase({env:{GITHUB_SHA:'b'.repeat(40)}})
 assert.notEqual(result.status,0)
 assert.equal(result.saved.status,'WAITING_EVIDENCE')
})
test('finalizer rejects failed independent Sentinel without changing lock',()=>{
 const result=runCase({sentinelOverrides:{sentinel:'FAIL'}})
 assert.notEqual(result.status,0)
 assert.equal(result.saved.status,'WAITING_EVIDENCE')
})
test('finalizer rejects wrong target environment without changing lock',()=>{
 const result=runCase({runtimeOverrides:{environment:'PRODUCTION'}})
 assert.notEqual(result.status,0)
 assert.equal(result.saved.status,'WAITING_EVIDENCE')
})
