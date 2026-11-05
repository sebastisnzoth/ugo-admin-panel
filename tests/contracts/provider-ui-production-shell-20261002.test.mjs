import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('provider production shell overrides every earlier provider style layer',()=>{
  const styles=fs.readFileSync('src/features/provider/providerStyles.ts','utf8').trim().split(/\n+/)
  const shellAt=styles.indexOf("import'../../mvp/provider/provider-production-shell.css'")
  assert.ok(shellAt>0,'production shell must be imported after the base provider layers')
  // Only these deliberate later layers may follow the shell (PR #610 visual parity, PR #612 reference dashboard).
  assert.deepEqual(styles.slice(shellAt+1),[
    "import'../../mvp/provider/provider-client-visual-parity.css'",
    "import'../../mvp/provider/provider-reference-dashboard.css'",
  ])
  assert.ok(fs.existsSync('src/mvp/provider/provider-production-shell.css'))
})

test('provider root exposes a stable view class for layout-specific cleanup',()=>{
  const root=fs.readFileSync('src/mvp/provider/ProviderRoot.tsx','utf8')
  assert.match(root,/provider-view-\$\{screen\}/)
})

test('provider desktop navigation is compact, active-aware and has no duplicate service chooser',()=>{
  const sidebar=fs.readFileSync('src/mvp/provider/ProviderStudioSidebar.tsx','utf8')
  assert.match(sidebar,/aria-current=/)
  assert.match(sidebar,/t\('nav\.help'\)/)
  assert.match(sidebar,/t\('nav\.goOffline'\)/)
  assert.doesNotMatch(sidebar,/Elegir servicio/)
  const labels=[...sidebar.matchAll(/t\('nav\.(home|orders|active|jobs|history|earnings|profile)'\)/g)].map(match=>match[1])
  assert.ok(new Set(labels).size>=5)
})

test('provider production shell removes conflicting desktop bottom navigation and duplicate dock',()=>{
  const css=fs.readFileSync('src/mvp/provider/provider-production-shell.css','utf8')
  assert.match(css,/@media\(min-width:1000px\)[\s\S]*provider-bottom-nav,[\s\S]*provider-operational-dock[\s\S]*display:none!important/)
  assert.match(css,/provider-studio-nav button\.is-active/)
  assert.match(css,/provider-quick-grid\{grid-template-columns:1fr!important\}/)
})
