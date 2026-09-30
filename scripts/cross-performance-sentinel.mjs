import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const runtimePath=process.argv[2]||'artifacts/readiness-cross-performance-runtime.json'
const judgePath=process.argv[3]||'artifacts/readiness-cross-performance-judge.json'
const output=process.argv[4]||'artifacts/readiness-cross-performance-sentinel.json'
const runtime=JSON.parse(await fs.readFile(runtimePath,'utf8'))
const judge=JSON.parse(await fs.readFile(judgePath,'utf8'))
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
assert.equal(runtime.sha,sha,'SENTINEL_RUNTIME_SAME_SHA_REQUIRED')
assert.equal(judge.sha,sha,'SENTINEL_JUDGE_SAME_SHA_REQUIRED')
assert.equal(judge.status,'PASS','SENTINEL_JUDGE_PASS_REQUIRED')
assert.equal(runtime.status,'PASS','SENTINEL_RUNTIME_PASS_REQUIRED')
assert.equal(runtime.environment,'UGO TEST','SENTINEL_TEST_ONLY')
assert.equal(runtime.production_touched,false,'SENTINEL_PRODUCTION_UNTOUCHED')
assert.ok(Number.isFinite(runtime.performance?.p95_ms),'SENTINEL_P95_REQUIRED')
assert.ok(Number.isFinite(runtime.performance?.max_ms),'SENTINEL_MAX_REQUIRED')
const result={validator:'Sentinel',status:'PASS',sha,readiness_id:'cross-performance',checks:['same-sha-runtime','same-sha-judge','ugo-test-only','production-untouched','latency-slos-pass'],completed_at:new Date().toISOString()}
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
