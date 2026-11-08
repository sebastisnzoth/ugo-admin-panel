import './i18n-test-compat.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const phase=fs.readFileSync('src/mvp/AdminPhase2.tsx','utf8')
const home=fs.readFileSync('src/mvp/AdminHomeStitch.tsx','utf8')
const superadmin=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const phaseCss=fs.readFileSync('src/mvp/admin-phase2.css','utf8')
const finalCss=fs.readFileSync('src/mvp/admin-uiux-final.css','utf8')
const autonomyCss=fs.readFileSync('src/mvp/autonomous-corporation.css','utf8')

test('admin navigation persists section and subview in URL',()=>{
  assert.match(phase,/initialParams/)
  assert.match(phase,/url\.searchParams\.set\('section',section\)/)
  assert.match(phase,/url\.searchParams\.set\('view',sectionContext\)/)
  assert.match(phase,/window\.history\.replaceState/)
})

test('admin exposes one live operational context bar with actionable counters',()=>{
  assert.match(phase,/ugo-admin2-contextbar/)
  assert.match(phase,/Realtime activo/)
  assert.match(phase,/pendingTotal/)
  assert.match(phase,/metrics\.pendingProviders/)
  assert.match(phase,/metrics\.pendingPix/)
  assert.match(phase,/metrics\.pendingDebtReconciliations/)
  assert.match(phaseCss,/Admin control-center UX 2026-10-03/)
  assert.match(phaseCss,/\.ugo-admin2-context-kpis/)
})

test('regular admin does not see superadmin navigation as a dead destination',()=>{
  assert.match(phase,/\{isSuperAdmin&&<button[^>]*section==='superadmin'/s)
})

test('home dashboard uses operational focus instead of deferred Hugo copilot',()=>{
  assert.match(home,/FOCO OPERATIVO/)
  assert.match(home,/t\('admin\.home\.focusPendingTitle'\)/)
  assert.doesNotMatch(home,/HUGO COPILOT/)
})

test('superadmin surfaces autonomy mode and gates before deep navigation',()=>{
  assert.match(superadmin,/ugo-superadmin-statebar/)
  assert.match(superadmin,/EMPRESA AUTÓNOMA/)
  assert.match(superadmin,/AUTONOMY GATE/)
  assert.match(superadmin,/CUSTOMER #1/)
  assert.match(superadmin,/aria-label=\{t\('admin\.nav'\)\}/)
  assert.match(finalCss,/Super Admin control hierarchy 2026-10-03/)
})

test('superadmin landing goes straight to the Command Center',()=>{
  assert.match(phase,/autoLandedRef/)
  assert.match(phase,/adminRole!=='superadmin'\|\|autoLandedRef\.current\)return/)
  assert.match(phase,/if\(initialParams\.get\('section'\)\|\|section!=='home'\)return/)
  assert.match(phase,/setSection\('superadmin'\)/)
})

test('superadmin command landing offers governance quick access',()=>{
  assert.match(superadmin,/ugo-superadmin-quickaccess/)
  assert.match(superadmin,/setTab\(id as Tab\)/)
  assert.match(finalCss,/\.ugo-superadmin-quickaccess button/)
})

test('command landing reviews governance signals and pending approvals',()=>{
  assert.match(superadmin,/ugo-superadmin-governance/)
  assert.match(superadmin,/WAITING_APPROVAL/)
  assert.match(superadmin,/requestAutonomousJobDecision\(j\.id,true\)/)
  assert.match(superadmin,/requestAutonomousJobDecision\(j\.id,false\)/)
  assert.match(superadmin,/ugo-superadmin-approval-row/)
  assert.match(finalCss,/\.ugo-superadmin-approval-row button/)
})

test('command center reflects realtime sync status',()=>{
  assert.match(superadmin,/onStatus:\(status:string\)=>\{if\(status==='SUBSCRIBED'\)setLiveStatus\('live'\)/)
  assert.match(superadmin,/ugo-superadmin-live/)
  assert.match(finalCss,/\.ugo-superadmin-header \.ugo-superadmin-live/)
})

test('autonomous corporation navigation and dense tables remain responsive',()=>{
  assert.match(autonomyCss,/Autonomous corporation usability pass 2026-10-03/)
  assert.match(autonomyCss,/\.ugo-autonomous-nav button\.active/)
  assert.match(autonomyCss,/\.ugo-autonomous-content table/)
  assert.match(autonomyCss,/@media\(max-width:640px\)/)
})
