import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const shell=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const dash=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8')
const css=fs.readFileSync('src/mvp/autonomous-corporation.css','utf8')

test('autonomy mode changes no longer depend on window.prompt',()=>{
  const modeBlock=shell.slice(shell.lastIndexOf('onModeChange={handleAutonomyModeChange}'),shell.indexOf(' onEvaluateGate=',shell.lastIndexOf('onModeChange={handleAutonomyModeChange}')))
  assert.doesNotMatch(modeBlock,/window\.prompt/)
  assert.match(modeBlock,/superadmin_set_autonomy_mode/)
  assert.match(modeBlock,/p_reason:auditReason/)
})

test('Empresa Autónoma exposes a direct ON action when readiness is READY',()=>{
  assert.match(dash,/AUTONOMY_ON está READY y sin blockers/)
  assert.match(dash,/Activar ON/)
  assert.match(dash,/p\.autonomyOnGate\?\.status==='READY'/)
  assert.match(dash,/p\.onModeChange\('ON',modeReason/)
})

test('mode controls use an inline auditable reason instead of browser dialogs',()=>{
  assert.match(dash,/Motivo auditable/)
  assert.match(dash,/Cambio manual desde Super Admin/)
  assert.match(dash,/p\.onChange\(m\.id,reason\.trim\(\)/)
})

test('direct ON activation is responsive',()=>{
  assert.match(css,/Reliable autonomy activation 2026-10-03/)
  assert.match(css,/\.ugo-autonomy-quick-on/)
  assert.match(css,/@media\(max-width:760px\)/)
})
