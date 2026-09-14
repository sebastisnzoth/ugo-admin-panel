import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('provider bottom navigation keeps active semantics and earnings reachable from profile', async () => {
  const root = await read('src/mvp/provider/ProviderRoot.tsx')
  assert.match(root, /openEarnings/)
  assert.match(root, />Perfil<\/button>/)
  assert.match(root, /Ver ganancias/)
  assert.match(root, /aria-current=/)
})

test('provider bottom navigation fits five mobile targets', async () => {
  const css = await read('src/mvp/provider/provider-flow.css')
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/)
  assert.match(css, /\.provider-bottom-nav button\{[^}]*min-height:48px/)
  assert.match(css, /\.provider-bottom-nav button:focus-visible/)
})