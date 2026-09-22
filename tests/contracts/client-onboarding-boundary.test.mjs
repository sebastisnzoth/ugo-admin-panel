import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('ClientOnboardingGate renders children instead of recursively loading ClientApp', async () => {
  const gate = await read('src/features/client/onboarding/ClientOnboardingGate.tsx')
  assert.doesNotMatch(gate, /import\('\.\/ClientApp'\)/)
  assert.match(gate, /ClientOnboardingGate\(\{children\}/)
  assert.match(gate, /if\(complete\)return <div className="ugo-client-stitch-scope">\{children\}<\/div>/)
})

test('ClientRoot owns the single onboarding boundary', async () => {
  const root = await read('src/mvp/client/ClientRoot.tsx')
  assert.match(root, /features\/client\/onboarding\/ClientOnboardingGate/); assert.match(root, /return <ClientOnboardingGate><div className=/)
  assert.match(root, /ugo-client-root ugo-client-screen-\$\{flow\.screen\}/)
  assert.equal((root.match(/<ClientOnboardingGate/g) || []).length, 1)
})
