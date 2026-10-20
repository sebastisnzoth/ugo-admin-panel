import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('a slow session bootstrap renders loading, never a failure card, in both role gates', async () => {
  const [clientGate, providerGate] = await Promise.all([
    read('src/features/client/onboarding/ClientOnboardingGate.tsx'),
    read('src/mvp/provider/providerData.tsx'),
  ])
  // The client gate must keep loading while the check is unresolved and only offer the
  // retry card once the bootstrap actually reported an error.
  assert.match(clientGate, /if\(!session&&!auth\.sessionChecked&&!auth\.error\)return .*LoadingScreen/)
  assert.match(clientGate, /if\(!session&&!auth\.sessionChecked\)return .*clientOnboarding\.loadFailed/)
  assert.match(clientGate, /onClick=\{auth\.retrySession\}/)
  // Same rule for the provider: pending != failed, and neither may show the login screen.
  assert.match(providerGate, /if\(!session&&!auth\.sessionChecked&&!auth\.error\)return <LoadingScreen/)
  assert.match(providerGate, /if\(!session&&!auth\.sessionChecked\)return <main className="provider-screen"><ErrorState/)
  assert.doesNotMatch(providerGate, /if\(!session&&!auth\.sessionChecked\)return <AuthScreen/)
})

test('the retry card never claims an active session before the session check confirmed one', async () => {
  const clientGate = await read('src/features/client/onboarding/ClientOnboardingGate.tsx')
  const retryCard = clientGate.slice(
    clientGate.indexOf('if(!session&&!auth.sessionChecked)return'),
    clientGate.indexOf('if(!session)return <div className="ugo-client-stitch-scope"><AuthScreen'),
  )
  assert.ok(retryCard.length > 0, 'CLIENT_RETRY_CARD_NOT_FOUND')
  assert.doesNotMatch(retryCard, /clientOnboarding\.sessionActive/)
  assert.match(retryCard, /clientOnboarding\.retry/)
})
