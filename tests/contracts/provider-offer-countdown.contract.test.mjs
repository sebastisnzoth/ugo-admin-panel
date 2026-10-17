import './i18n-test-compat.mjs'
import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider opportunity exposes backend offer expiry and renders a live accept countdown',async()=>{const[types,data,ui]=await Promise.all([read('src/mvp/provider/providerTypes.ts'),read('src/mvp/provider/providerData.tsx'),read('src/mvp/provider/ProviderOpportunities.tsx')]);assert.match(types,/expiresAt\?:\s*string\s*\|\s*null/);assert.match(data,/expiresAt:offer\.expira_at\|\|null/);assert.match(ui,/t\('providerOpportunity\.newRequest',\{time:formatCountdown\(remainingMs\)\}\)/);assert.match(ui,/formatCountdown/);assert.match(ui,/item\.expiresAt/);assert.match(ui,/remainingMs<=0/);assert.match(ui,/t\('screen\.opportunities\.17'\)/)})
test('provider cannot accept or reject after backend expiry',async()=>{const ui=await read('src/mvp/provider/ProviderOpportunities.tsx');assert.match(ui,/expired\?/);assert.match(ui,/disabled=\{d\.busy\|\|expired\}/);assert.match(ui,/t\('providerOpportunity\.accept'\)/);assert.match(ui,/t\('screen\.opportunities\.25'\)/)})
