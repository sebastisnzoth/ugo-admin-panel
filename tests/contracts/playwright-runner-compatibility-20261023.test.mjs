import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const workflows = [
 '.github/workflows/p0-client-provider-e2e.yml',
 '.github/workflows/provider-notifications-runtime.yml',
 '.github/workflows/provider-alerts-runtime.yml',
 '.github/workflows/cross-accessibility-runtime.yml',
 '.github/workflows/provider-ui-runtime-test.yml',
 '.github/workflows/client-notifications-runtime.yml',
 '.github/workflows/role-ui-runtime.yml',
 '.github/workflows/cross-visual-runtime.yml',
]

test('pinned Playwright 1.56.1 E2E gates use supported Ubuntu 24.04', () => {
 for (const workflow of workflows) {
  const content=readFileSync(new URL('../../'+workflow,import.meta.url),'utf8')
  assert.match(content,/playwright@1\.56\.1/,workflow+' should retain Playwright pin')
  assert.match(content,/runs-on:\s*ubuntu-24\.04/,workflow+' must use supported Ubuntu runner')
  assert.doesNotMatch(content,/runs-on:\s*ubuntu-latest/,workflow+' cannot roll to incompatible OS')
 }
})
