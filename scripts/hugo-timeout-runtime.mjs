import assert from'node:assert/strict'
import{writeFile,mkdir}from'node:fs/promises'
import http from'node:http'
const sha=process.env.UGO_RUNTIME_SHA||'unknown'
let fallbackMode='success'
const primary=http.createServer((_req,_res)=>{})
const fallback=http.createServer((_req,res)=>{
 if(fallbackMode==='hang')return
 res.writeHead(200,{'content-type':'application/json'})
 res.end(JSON.stringify({model:'openrouter/test-free',choices:[{message:{content:'UGO_FALLBACK_OK'}}]}))
})
await Promise.all([
 new Promise(r=>primary.listen(0,'127.0.0.1',r)),
 new Promise(r=>fallback.listen(0,'127.0.0.1',r)),
])
const primaryPort=primary.address().port,fallbackPort=fallback.address().port
process.env.GEMINI_API_KEY='test-gemini-key'
process.env.OPENROUTER_API_KEY='test-openrouter-key'
process.env.GEMINI_BASE_URL=`http://127.0.0.1:${primaryPort}`
process.env.OPENROUTER_BASE_URL=`http://127.0.0.1:${fallbackPort}`
process.env.HUGO_GEMINI_TIMEOUT_MS='250'
process.env.HUGO_OPENROUTER_TIMEOUT_MS='250'
const logs=[]
const originalInfo=console.info
console.info=(...args)=>{logs.push(args);originalInfo(...args)}
let first,firstElapsed=0,secondElapsed=0,secondError
try{
 const{askHugoModel}=await import('../api/hugo/modelRouter.ts?ugo-timeout-runtime='+Date.now())
 const t1=Date.now()
 first=await askHugoModel('hola',[],'system',false,'gemini-test')
 firstElapsed=Date.now()-t1
 assert.equal(first.provider,'openrouter')
 assert.equal(first.fallback_used,true)
 assert.equal(first.text,'UGO_FALLBACK_OK')
 assert.ok(firstElapsed>=150&&firstElapsed<2000,'primary timeout must fall back without freezing')
 const routeEvents=logs.filter(x=>x[0]==='Hugo model router').map(x=>x[1])
 const correlated=routeEvents.filter(e=>e?.correlation_id===first.correlation_id)
 assert.ok(correlated.some(e=>e.route==='primary'&&e.status==='failed'&&e.error_code==='GEMINI_TIMEOUT'))
 assert.ok(correlated.some(e=>e.route==='fallback'&&e.status==='success'&&e.fallback_used===true))
 fallbackMode='hang'
 const t2=Date.now()
 try{await askHugoModel('hola otra vez',[],'system',false,'gemini-test')}catch(error){secondError=error}
 secondElapsed=Date.now()-t2
 assert.equal(secondError?.code,'HUGO_MODEL_FALLBACK_EXHAUSTED')
 assert.ok(secondElapsed>=300&&secondElapsed<2000,'dual-provider timeout must terminate without freezing')
 assert.ok(secondError?.correlation_id)
}finally{
 console.info=originalInfo
 primary.close();fallback.close()
}
const evidence={
 readiness_id:'hugo-timeout',
 sha,
 environment:'UGO TEST/local deterministic fault injection',
 fault_injection:'primary_timeout_then_fallback_success_and_dual_timeout',
 gemini_timeout_ms:250,
 openrouter_timeout_ms:250,
 primary_timeout_fallback_success:true,
 fallback_provider:first?.provider,
 fallback_used:first?.fallback_used,
 first_elapsed_ms:firstElapsed,
 telemetry_correlation_id:first?.correlation_id,
 telemetry_primary_timeout:true,
 telemetry_fallback_success:true,
 dual_timeout_bounded:true,
 second_elapsed_ms:secondElapsed,
 dual_timeout_error_code:secondError?.code,
 dual_timeout_correlation_id:secondError?.correlation_id,
 external_model_call_performed:false,
 production_touched:false,
 result:'PASS'
}
await mkdir('artifacts',{recursive:true})
await writeFile('artifacts/hugo-timeout-runtime.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
