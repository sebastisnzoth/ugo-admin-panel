import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const workflow=readFileSync(new URL('../../.github/workflows/p0-client-provider-e2e.yml',import.meta.url),'utf8')

test('P0 browser E2E serves the built PR SHA rather than the unversioned Vite dev server',()=>{
 assert.match(workflow,/name: Build exact SHA[\s\S]*?VITE_APP_REVISION:\s*\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}[\s\S]*?run: npm run build/)
 assert.match(workflow,/UGO_RUNTIME_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(workflow,/npm run preview -- --host 127\.0\.0\.1 --port 4173/)
 assert.doesNotMatch(workflow,/npm run dev --/)
})

const crossErrorsWorkflow=readFileSync(new URL('../../.github/workflows/cross-errors-runtime.yml',import.meta.url),'utf8')
test('Cross Errors browser proof runs on a supported Playwright image against its built SHA',()=>{
 assert.match(crossErrorsWorkflow,/runtime:\n    runs-on: ubuntu-24\.04/)
 assert.match(crossErrorsWorkflow,/VITE_APP_REVISION:\s*\$\{\{ env\.UGO_RUNTIME_SHA \}\}/)
 assert.match(crossErrorsWorkflow,/npm run preview -- --host 127\.0\.0\.1 --port 4173/)
 assert.doesNotMatch(crossErrorsWorkflow,/npm run dev --/)
})

const adminRealtimeWorkflow=readFileSync(new URL('../../.github/workflows/admin-realtime-runtime.yml',import.meta.url),'utf8')
test('Admin Realtime browser proof serves the compiled candidate SHA, not the dev server',()=>{
 assert.match(adminRealtimeWorkflow,/name: TypeScript and build[\s\S]*?VITE_APP_REVISION:\s*\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}[\s\S]*?run: npm run build/)
 assert.match(adminRealtimeWorkflow,/export UGO_RUNTIME_SHA="\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}"/)
 assert.match(adminRealtimeWorkflow,/npm run preview -- --host 127\.0\.0\.1 --port 4173/)
 assert.doesNotMatch(adminRealtimeWorkflow,/npm run dev --/)
})


test('P0 real TEST journey executes after matching/provider/client changes reach main',()=>{
 assert.match(workflow,/on:\s*\n\s*#[^\n]*\n\s*#[^\n]*\n\s*push:\s*\n\s*branches: \[main\]/)
 for(const p of ['scripts/p0-client-provider-e2e.mjs','src/mvp/provider/**','src/features/client/request/**','src/lib/dispatch/**','.github/workflows/p0-client-provider-e2e.yml']){
  assert.ok(workflow.includes('      - "'+p+'"'),'P0_PUSH_PATH_REQUIRED:'+p)
 }
 assert.match(workflow,/UGO_TEST_SUPABASE_URL: https:\/\/tmossnqfwfwjrtzwcbmm\.supabase\.co/)
 assert.match(workflow,/concurrency:[\s\S]*?cancel-in-progress: false/)
 assert.match(workflow,/name: Upload P0 evidence[\s\S]*?if: always\(\)/)
})
