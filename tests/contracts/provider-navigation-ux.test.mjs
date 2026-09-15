import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('provider bottom navigation keeps active semantics and earnings reachable from profile', async () => {
  const [root, profile] = await Promise.all([read('src/mvp/provider/ProviderRoot.tsx'), read('src/mvp/provider/ProviderProfile.tsx')])
  assert.match(root, /openEarnings/)
  assert.match(root, />Perfil<\/button>/)
  assert.match(profile, /Fondos y retiros/)
  assert.match(profile, /Administrar fondos/)
  assert.match(profile, /flow\.actions\.openEarnings/)
  assert.match(root, /aria-current=/)
})

test('provider bottom navigation exposes four real mobile destinations', async () => {
  const [root, css] = await Promise.all([
    read('src/mvp/provider/ProviderRoot.tsx'),
    read('src/mvp/provider/provider-nav-cleanup.css'),
  ])
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  for (const label of ['Inicio','Pedidos','Trabajo','Perfil']) assert.match(root,new RegExp(`>${label}(?:<|\\{)`))
  assert.match(root, /provider-nav-cleanup\.css/)
})

test('provider history is a screen instead of a floating launcher', async () => {
  const root = await read('src/mvp/provider/ProviderRoot.tsx')
  assert.match(root, /screen==='history'&&<div className="provider-screen"><ServiceHistoryPanel role="provider" embedded\/><\/div>/)
  assert.doesNotMatch(root, /<ServiceHistoryPanel role="provider" openRequest=/)
})
