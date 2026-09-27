import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const worker=fs.readFileSync('scripts/openrouter-autonomy-probe.mjs','utf8')
const ci=fs.readFileSync('.github/workflows/core-ci.yml','utf8')

test('autonomous AI uses OpenRouter from GitHub Actions secret, never frontend',()=>{
 assert.match(worker,/process\.env\.OPENROUTER_API_KEY/)
 assert.doesNotMatch(worker,/VITE_OPENROUTER|import\.meta\.env/)
 assert.match(worker,/https:\/\/openrouter\.ai\/api\/v1/)
})
test('zero-budget-first routing accepts only free model routes',()=>{
 assert.match(worker,/openrouter\/free/)
 assert.match(worker,/:free/)
 assert.match(worker,/OPENROUTER_FREE_ROUTE_UNAVAILABLE/)
})
test('GitHub Actions gates and probes OpenRouter without exposing its credential',()=>{
 assert.match(ci,/OPENROUTER_API_KEY: \$\{\{ secrets\.OPENROUTER_API_KEY \}\}/)
 assert.match(ci,/node scripts\/openrouter-autonomy-probe\.mjs/)
 assert.match(ci,/value intentionally hidden/)
})
