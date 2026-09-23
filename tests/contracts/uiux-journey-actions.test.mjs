import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')


test('client review stays editable without restarting the request', async () => {
  const [need,location,when,payment,summary] = await Promise.all([
    read('src/features/client/request/ClientNeedScreen.tsx'),
    read('src/features/client/request/ClientLocationScreen.tsx'),
    read('src/features/client/request/ClientWhenScreen.tsx'),
    read('src/mvp/client/ClientPaymentScreen.tsx'),
    read('src/features/client/request/ClientSummaryScreen.tsx'),
  ])
  assert.match(need, /<ClientLocationScreen onBack=\{\(\)=>setStage\('need'\)\}/)
  assert.match(location, /<ClientWhenScreen onBack=\{\(\)=>setStage\('location'\)\}/)
  assert.match(when, /<ClientPaymentScreen onBack=\{\(\)=>setPayment\(false\)\}/)
  assert.match(payment, /<ClientSummaryScreen onBack=\{\(\)=>setSummary\(false\)\}/)
  assert.match(summary, /<button onClick=\{onBack\}>←<\/button>/)
  assert.match(need, /ugo:guided-request-draft:/)
  assert.match(location, /ugo:guided-request-draft:/)
  assert.match(when, /ugo:guided-request-draft:/)
})
test('provider home uses explicit operational action copy', async () => {
  const source = await read('src/mvp/ProviderHomeStructural.tsx')
  assert.match(source, /Salir hacia el cliente/)
  assert.match(source, /Marcar que llegué/)
  assert.match(source, />Rechazar<\/button>/)
  assert.match(source, />Aceptar trabajo<\/button>/)
  assert.doesNotMatch(source, />Ignorar<\/button>/)
  assert.doesNotMatch(source, /Navegar al cliente/)
})
