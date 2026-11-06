import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Typing an address and then tapping "Use my location" (or a saved place) blurs the
// address input, and its onBlur starts a tariff quote. If the next control were
// disabled while quoting, React would disable it between mousedown and click and
// the browser would drop the tap. Quotes are versioned by quoteEpoch, so GPS and
// saved places can safely supersede an in-flight quote instead.
const screen=fs.readFileSync('src/features/client/request/ClientLocationScreen.tsx','utf8')

test('location controls are never disabled by a blur-triggered quote',()=>{
  assert.match(screen,/onBlur=\{\(\)=>\{if\(address\.trim\(\)\.length>=5\)\{[^}]*void loadQuote\(address,zone\)\}\}\}/)
  assert.match(screen,/<button type="button" onClick=\{useLocation\} disabled=\{locating\|\|resolvingPickup\}>/)
  assert.doesNotMatch(screen,/disabled=\{[^}]*quoting[^}]*\}/,'only the Continue footer may wait for the quote')
})

test('GPS and saved places supersede an in-flight quote, as typing already does',()=>{
  assert.match(screen,/quoteEpoch\.current\+\+;setQuoting\(false\);setLocating\(true\);setMessage\(''\)/)
  assert.match(screen,/quoteEpoch\.current\+\+;setQuoting\(false\);setSelectedPlace\(place\.id\);setAddress\(place\.direccion\)/)
  assert.match(screen,/onChange=\{e=>\{quoteEpoch\.current\+\+;setQuoting\(false\);/)
  assert.match(screen,/if\(epoch!==quoteEpoch\.current\)return null/)
})

test('Continue still waits for quote, GPS and address resolution before leaving the screen',()=>{
  assert.match(screen,/locationBusy=\{quoting\|\|locating\|\|resolvingPickup\}/)
  const when=fs.readFileSync('src/features/client/request/ClientWhenScreen.tsx','utf8')
  assert.match(when,/<footer><button type="button" disabled=\{locationBusy\} onClick=\{\(\)=>void next\(\)\}>/)
})

test('P0 E2E walks the three-screen journey (location+when, then summary with payment)',()=>{
  const p0=fs.readFileSync('scripts/p0-client-provider-e2e.mjs','utf8')
  assert.match(p0,/async function advanceClientJourneyToSummary\(page\)/)
  assert.match(p0,/\.ugo-when-screen:not\(\.ugo-location-screen\)/)
  assert.match(p0,/await page\.locator\('\.ugo-location-screen footer button'\)\.click\(\)\n  await advanceClientJourneyToSummary\(page\)/)
  assert.match(p0,/throw new Error\('P0_CLIENT_UI_SUMMARY_NOT_REACHED'\)/)
  assert.match(p0,/await page\.locator\('\.ugo-matching-screen'\)\.waitFor\(\{state:'visible',timeout:45000\}\)/)
})
