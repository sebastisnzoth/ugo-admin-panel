import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../../src/mvp/ProviderLocationTracker.tsx',import.meta.url),'utf8')
test('provider GPS does not retain a stale watch-restart timer on foreground recovery',()=>{
 assert.match(source,/if\(restartTimer!==undefined\)\{window\.clearTimeout\(restartTimer\);restartTimer=undefined\}/)
 assert.match(source,/if\(watchId!=null\)\{navigator\.geolocation\.clearWatch\(watchId\);watchId=null\}/)
 assert.match(source,/restartTimer=window\.setTimeout\(\(\)=>\{restartTimer=undefined;startWatch\(\)\},3_000\)/)
 assert.match(source,/document\.addEventListener\('visibilitychange',onForeground\)/)
 assert.match(source,/MATCHING_POSITION_AGE_MS=90_000/)
})
