import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const probe=readFileSync('scripts/openrouter-autonomy-probe.mjs','utf8')
const route=readFileSync('scripts/autonomous-model-route-runtime.mjs','utf8')
const drill=readFileSync('scripts/autonomous-model-fallback-runtime.mjs','utf8')

test('successful Gemini probe must not skip real OpenRouter check',()=>{
 assert.match(probe,/geminiConnected=true\s+break/)
 assert.match(probe,/const catalog=await fetch\(base\+'\/models'/)
 assert.match(probe,/OPENROUTER_FALLBACK_KEY_REQUIRED/)
 assert.doesNotMatch(probe,/geminiConnected=true\s+process\.exit\(0\)/)
})
test('only benchmark-valid Gemini primary and OpenRouter fallback can satisfy consultation route',()=>{
 assert.match(route,/MODEL_ROUTE_PRIMARY_MUST_BE_GEMINI/)
 assert.match(route,/MODEL_ROUTE_FALLBACK_UNAVAILABLE/)
 assert.match(route,/fallback\.provider!=='openrouter'/)
 assert.match(route,/fallback\.benchmark_score/)
})
test('fallback requires real nonempty model completion and correlated metrics',()=>{
 assert.match(drill,/EMPTY_MODEL_RESPONSE/)
 assert.match(drill,/finish_reason/)
 assert.match(drill,/max_tokens:256/)
 assert.match(drill,/FAILOVER_METRICS_INCOMPLETE/)
 assert.match(drill,/OPENROUTER_FALLBACK_FAILED_WITHOUT_RECENT_REAL_PROOF/)
})
