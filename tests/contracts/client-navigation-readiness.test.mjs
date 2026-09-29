import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('client global menu routes every primary destination to a reachable canonical surface', async () => {
  const menu = await read('src/features/client/ui/ClientGlobalMenu.tsx')
  const radar = await read('src/features/client/radar/ClientProviderRadarBridge.tsx')
  assert.match(menu, /const hugo=\(\)=>\{close\(\);flow\.navigate\('request'\);after\(UGO_UI_EVENTS\.clientHugo\)\}/)
  assert.doesNotMatch(menu, /const hugo=\(\)=>go\('search'\)/)
  assert.match(menu, /go\('home'\)/)
  assert.match(menu, /go\('history'\)/)
  assert.match(menu, /go\('profile'\)/)
  assert.match(menu, /go\('dispute'\)/)
  assert.match(radar, /flow\.screen==='search'\|\|flow\.screen==='provider'\)flow\.navigate\('home'\)/)
})

test('client global voice navigation listener is mounted exactly once', async () => {
  const root = await read('src/features/client/ClientRoot.tsx')
  const globals = await read('src/features/client/ui/ClientGlobalSurfaces.tsx')
  assert.doesNotMatch(root, /ClientGlobalVoiceCommands/)
  const mounts = globals.match(/<ClientGlobalVoiceCommands\/>/g) || []
  assert.equal(mounts.length, 1)
})

test('client primary mobile and overlay navigation expose deterministic exits', async () => {
  const home = await read('src/features/client/home/ClientHomeScreen.tsx')
  const history = await read('src/features/client/ui/ClientHistoryOverlay.tsx')
  const profile = await read('src/features/client/profile/ClientProfilePanel.tsx')
  const request = await read('src/features/client/request/ClientNeedScreen.tsx')
  assert.match(home, /flow\.navigate\('history'\)/)
  assert.match(home, /flow\.navigate\('profile'\)/)
  assert.match(home, /flow\.navigate\('request'\)/)
  assert.match(history, /onClick=\{onHome\}/)
  assert.match(profile, /flow\.navigate\('home'\)/)
  assert.match(request, /onClick=\{\(\)=>flow\.navigate\('home'\)\}/)
})
