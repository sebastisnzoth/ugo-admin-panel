import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const tracker=fs.readFileSync('src/mvp/ProviderLocationTracker.tsx','utf8')

test('provider tracker seeds UI freshness from persisted valid provider GPS',()=>{
  assert.match(tracker,/select\('online,disponible,ubicacion_updated_at,ubicacion_accuracy_m'\)/)
  assert.match(tracker,/setLastFix\(\{capturedAt:persistedAt,accuracy:persistedAccuracy\}\)/)
  assert.match(tracker,/lastValidFixAtRef\.current=Date\.now\(\)/)
})

test('one invalid browser reading does not erase a still-fresh persisted fix',()=>{
  assert.match(tracker,/const freshnessWindow=serviceId\?MAX_POSITION_AGE_MS:MATCHING_POSITION_AGE_MS/)
  assert.match(tracker,/if\(!lastValidFixAtRef\.current\|\|Date\.now\(\)-lastValidFixAtRef\.current>freshnessWindow\)setLocationError/)
})

test('fresh browser acquisition validates both one-shot attempts and continues watching until usable',()=>{
  assert.match(tracker,/if\(usableBrowserPosition\(high\)\)return high/)
  assert.match(tracker,/watchPosition\(position=>\{if\(usableBrowserPosition\(position\)\)finish\(position\)\}/)
  assert.doesNotMatch(tracker,/try\{return await oneBrowserPosition\(GEO_HIGH_ACCURACY_OPTIONS\)\}/)
})
