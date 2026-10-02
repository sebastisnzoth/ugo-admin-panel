import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('provider production shell is the final provider style layer',()=>{
  const styles=fs.readFileSync('src/features/provider/providerStyles.ts','utf8').trim().split(/\n+/)
  assert.equal(styles.at(-1),"import'../../mvp/provider/provider-production-shell.css'")
  assert.ok(fs.existsSync('src/mvp/provider/provider-production-shell.css'))
})

test('provider root exposes a stable view class for layout-specific cleanup',()=>{
  const root=fs.readFileSync('src/mvp/provider/ProviderRoot.tsx','utf8')
  assert.match(root,/provider-view-\$\{screen\}/)
})

test('provider desktop navigation is compact, active-aware and has no duplicate service chooser',()=>{
  const sidebar=fs.readFileSync('src/mvp/provider/ProviderStudioSidebar.tsx','utf8')
  assert.match(sidebar,/aria-current=/)
  assert.match(sidebar,/Ayuda y disputa/)
  assert.match(sidebar,/Online · dejar de recibir/)
  assert.doesNotMatch(sidebar,/Elegir servicio/)
  const labels=[...sidebar.matchAll(/>(Inicio|Pedidos|Trabajo activo|Agenda|Historial|Ganancias|Perfil)/g)].map(match=>match[1])
  assert.ok(labels.length>=5)
})

test('provider production shell removes conflicting desktop bottom navigation and duplicate dock',()=>{
  const css=fs.readFileSync('src/mvp/provider/provider-production-shell.css','utf8')
  assert.match(css,/@media\(min-width:1000px\)[\s\S]*provider-bottom-nav,[\s\S]*provider-operational-dock[\s\S]*display:none!important/)
  assert.match(css,/provider-studio-nav button\.is-active/)
  assert.match(css,/provider-quick-grid\{grid-template-columns:1fr!important\}/)
})
