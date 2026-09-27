import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const api=fs.readFileSync('api/autonomy/openrouter.ts','utf8')
const ci=fs.readFileSync('.github/workflows/core-ci.yml','utf8')

test('autonomous AI uses OpenRouter only from server-side secret',()=>{
 assert.match(api,/process\.env\.OPENROUTER_API_KEY/)
 assert.doesNotMatch(api,/VITE_OPENROUTER|import\.meta\.env/)
 assert.match(api,/https:\/\/openrouter\.ai\/api\/v1/)
})
test('zero-budget-first routing accepts only free model routes',()=>{
 assert.match(api,/openrouter\/free/)
 assert.match(api,/:free/)
 assert.match(api,/OPENROUTER_FREE_ROUTE_UNAVAILABLE/)
})
test('GitHub Actions gates autonomous company on OpenRouter credential without exposing it',()=>{
 assert.match(ci,/OPENROUTER_API_KEY: \$\{\{ secrets\.OPENROUTER_API_KEY \}\}/)
 assert.match(ci,/OpenRouter secret is configured \(value intentionally hidden\)/)
})
