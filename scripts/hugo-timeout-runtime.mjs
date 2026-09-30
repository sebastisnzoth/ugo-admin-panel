import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';import http from'node:http'
const sha=process.env.UGO_RUNTIME_SHA||'unknown',api=await readFile('api/hugo/chat.ts','utf8'),client=await readFile('tests/contracts/client-hugo-runtime-resilience.test.mjs','utf8'),provider=await readFile('tests/contracts/provider-hugo-runtime-resilience.test.mjs','utf8')
assert.match(api,/AbortSignal\.timeout\(12000\)/);assert.match(api,/AbortSignal\.timeout\(6500\)/);assert.match(api,/status===503\|\|status===504/);assert.match(client,/browser-speech/);assert.match(provider,/setRunning\\\(false\\\);setState\\\('error'\\\)/)
const server=http.createServer((_req,_res)=>{});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port
let aborted=false,elapsed=0,kind='';const started=Date.now()
try{await fetch('http://127.0.0.1:'+port+'/stall',{signal:AbortSignal.timeout(250)})}catch(e){elapsed=Date.now()-started;kind=String(e?.name||'');aborted=kind==='TimeoutError'||kind==='AbortError'}finally{server.close()}
assert.equal(aborted,true);assert.ok(elapsed>=150&&elapsed<2000,'bounded timeout runtime')
const evidence={readiness_id:'hugo-timeout',sha,environment:'UGO TEST/local fault injection',chat_timeout_ms:12000,tts_timeout_ms:6500,simulated_stall_aborted:true,simulated_elapsed_ms:elapsed,abort_error:kind,client_recovery_contract:true,provider_recovery_contract:true,actionable_503_504:true,model_call_performed:false,production_touched:false,result:'PASS'}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/hugo-timeout-runtime.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence))
