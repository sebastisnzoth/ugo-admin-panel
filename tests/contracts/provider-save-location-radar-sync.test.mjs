import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../../src/mvp/provider/providerData.tsx',import.meta.url),'utf8')

test('saving base location refreshes radar GPS when provider is online',()=>{
 const start=source.indexOf('const saveCurrentLocation=')
 const end=source.indexOf('const uploadProfilePhoto=',start)
 assert.ok(start>=0&&end>start)
 const handler=source.slice(start,end)
 assert.match(handler,/await saveProviderBaseLocation\(supabase\)/)
 assert.match(handler,/if\(provider\?\.online&&provider\.disponible\)/)
 assert.match(handler,/await refreshProviderAvailabilityLocation\(supabase\)/)
 assert.match(handler,/ubicacion_updated_at:fix\.capturedAt/)
 assert.match(handler,/ubicacion_accuracy_m:fix\.accuracy/)
})
