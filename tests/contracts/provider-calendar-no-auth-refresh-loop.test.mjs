import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=readFileSync('src/mvp/provider/providerCalendar.ts','utf8')
const view=readFileSync('src/mvp/provider/ProviderCalendarIntegration.tsx','utf8')
test('optional calendar 401 must never force another provider refresh token',()=>{
 assert.match(src,/response\.status===401/)
 assert.match(src,/Tu sesión UGO permanece activa/)
 assert.doesNotMatch(src,/refreshSession\(/)
 assert.doesNotMatch(src,/auth\.signOut\(/)
 assert.match(view,/getProviderCalendarStatus\(d\.accessToken\)/)
})
test('calendar endpoint retains Bearer authorization and all explicit operations',()=>{
 assert.match(src,/Authorization:'Bearer '\+accessToken/)
 for(const operation of ['getProviderCalendarStatus','startProviderCalendar','syncProviderCalendar','disconnectProviderCalendar'])
   assert.match(src,new RegExp('export const '+operation+'='))
})
