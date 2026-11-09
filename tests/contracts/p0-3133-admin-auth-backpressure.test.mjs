import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')

test('P0 Auth/PostgREST: Admin profile timeout cancels the request and clears the timer',async()=>{
 const source=await read('src/mvp/AdminGate.tsx')
 assert.match(source,/new AbortController\(\)/)
 assert.match(source,/operation\.abortSignal\(controller\.signal\)/)
 assert.match(source,/controller\.abort\(\);reject\(new Error\('ADMIN_PROFILE_QUERY_TIMEOUT'\)\)/)
 assert.match(source,/window\.clearTimeout\(timer\)/)
 assert.match(source,/transientAdminProfileError\(error\)\?t\('adminAuth\.sessionAdmin'\):t\('adminAuth\.sessionInvalid'\)/)
 assert.match(source,/unexpected eof\|context canceled\|failed to connect/)
 assert.match(source,/if\(sessionActive&&!allowed\)return/)
})

test('P0 load containment: Admin coalesces realtime, backpressures in-flight refreshes and cleans reconnect',async()=>{
 const source=await read('src/mvp/AdminPhase2.tsx')
 assert.match(source,/if\(!alive\|\|document\.visibilityState!=='visible'\|\|refreshTimer!==undefined\)return/)
 assert.match(source,/Math\.max\(350,3000-\(Date\.now\(\)-lastRefreshAt\)\)/)
 assert.match(source,/if\(refreshing\)\{queued=true;return\}/)
 assert.match(source,/try\{await load\(\{silent:true\}\)\}finally/)
 assert.match(source,/if\(queued\)\{queued=false;scheduleRefresh\(\)\}/)
 assert.match(source,/window\.setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'\)sync\(\)\},30000\)/)
 assert.match(source,/if\(reconnectTimer===undefined\)reconnectTimer=window\.setTimeout/)
 assert.match(source,/if\(refreshTimer!==undefined\)window\.clearTimeout\(refreshTimer\)/)
 assert.match(source,/if\(reconnectTimer!==undefined\)window\.clearTimeout\(reconnectTimer\)/)
 assert.doesNotMatch(source,/scheduleReconcile\(250\)/)
 assert.doesNotMatch(source,/window\.setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'\)sync\(\)\},10000\)/)
})

test('P0 Cross-role diagnostics capture only public navigation state and no session tokens',async()=>{
 const source=await read('scripts/role-ui-runtime.mjs')
 assert.match(source,/ADMIN_NAVIGATION_FAILURE/)
 assert.match(source,/navExists:Boolean\(nav\)/)
 assert.match(source,/retryVisible:Boolean/)
 assert.match(source,/loginVisible:Boolean/)
 const start=source.indexOf('const diagnostic=await page.evaluate(')
 const end=source.indexOf("console.error('ADMIN_NAVIGATION_FAILURE'",start)
 const scope=source.slice(start,end)
 assert.doesNotMatch(scope,/localStorage|access_token|refresh_token|password|user\.email/)
})
