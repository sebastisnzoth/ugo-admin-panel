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
