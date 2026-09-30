import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const input=process.argv[2]||'artifacts/readiness-cross-performance-runtime.json'
const output=process.argv[3]||'artifacts/readiness-cross-performance-judge.json'
const runtime=JSON.parse(await fs.readFile(input,'utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(runtime.sha,sha,'JUDGE_SAME_SHA_REQUIRED')
assert.equal(runtime.readiness_id,'cross-performance','JUDGE_WRONG_READINESS')
assert.equal(runtime.environment,'UGO TEST','JUDGE_TEST_ONLY')
assert.equal(runtime.production_touched,false,'JUDGE_PRODUCTION_UNTOUCHED')
assert.equal(runtime.status,'PASS','JUDGE_RUNTIME_PASS_REQUIRED')
assert.equal(runtime.performance?.status,'PASS','JUDGE_PERFORMANCE_PASS_REQUIRED')
for(const [name,value] of Object.entries(runtime.performance||{})){
  if(name.endsWith('_navigation_ms')) assert.ok(Number.isFinite(value)&&value<=4000,name+' exceeds navigation SLO')
  if(name.endsWith('_initial_load_ms')) assert.ok(Number.isFinite(value)&&value<=8000,name+' exceeds initial-load SLO')
}
assert.ok(Number.isFinite(runtime.performance?.p95_ms),'JUDGE_P95_REQUIRED')
assert.ok(Number.isFinite(runtime.performance?.max_ms),'JUDGE_MAX_REQUIRED')
assert.ok((runtime.performance?.sample_count||0)>=6,'JUDGE_SAMPLE_COUNT_REQUIRED')
const result={validator:'Judge',status:'PASS',sha,readiness_id:'cross-performance',source_artifact:input,metrics:runtime.performance,completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
