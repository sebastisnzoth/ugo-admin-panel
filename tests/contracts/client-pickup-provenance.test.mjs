import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8')

test('canonical client order never reuses stale browser GPS for a different address', async () => {
  const [types, dispatch, location, post] = await Promise.all([
    read('src/lib/dispatch/types.ts'),
    read('src/lib/dispatch/supabaseDispatch.ts'),
    read('src/mvp/client/ClientLocationScreen.tsx'),
    read('src/mvp/client/ClientPostConfirmFlow.tsx'),
  ])
  assert.match(types, /pickupFallback\?: 'stored' \| 'none'/)
  assert.match(dispatch, /const pickup = request\.pickup \|\| \(request\.pickupFallback === 'stored' \? storedPickup\(\) : null\)/)
  assert.match(location, /savePickup\(null,null,'manual'\)/)
  assert.match(location, /savePickup\(hasCoords\?lat:null,hasCoords\?lng:null,'saved'\)/)
  assert.match(location, /savePickup\(pos\.coords\.latitude,pos\.coords\.longitude,'current'\)/)
  assert.match(post, /pickup:draftPickup\(draft\)/)
  assert.match(post, /pickup:context\.pickup,pickupFallback:'none'/)
})

test('saved-place pickup is exact only when that place has coordinates', async () => {
  const [location, post] = await Promise.all([read('src/mvp/client/ClientLocationScreen.tsx'), read('src/mvp/client/ClientPostConfirmFlow.tsx')])
  assert.match(location, /place\.latitud!=null&&place\.longitud!=null&&Number\.isFinite\(lat\)&&Number\.isFinite\(lng\)/)
  assert.match(post, /draft\.pickupLat==null\|\|draft\.pickupLng==null/)
  assert.match(location, /pickupLat/)
  assert.match(location, /pickupLng/)
})
