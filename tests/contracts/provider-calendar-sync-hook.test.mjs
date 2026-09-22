import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('calendar bridge delegates lifecycle sync to provider feature hook',async()=>{const[bridge,hook]=await Promise.all([read('src/mvp/provider/ProviderCalendarSyncBridge.tsx'),read('src/features/provider/hooks/useProviderCalendarAutoSync.ts')]);assert.match(bridge,/useProviderCalendarAutoSync\(data\.accessToken,data\.service\?\.id,data\.service\?\.estado\)/);assert.doesNotMatch(bridge,/setInterval|addEventListener|syncProviderCalendar/);assert.match(hook,/syncProviderCalendar\(accessToken\)/);assert.match(hook,/5\*60\*1000/);assert.match(hook,/addEventListener\('online',onOnline\)/);assert.match(hook,/visibilityState==='visible'/);assert.match(hook,/removeEventListener\('online',onOnline\)/)})
