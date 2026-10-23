import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'

const source=readFileSync(new URL('../../src/mvp/ProviderLocationTracker.tsx',import.meta.url),'utf8')
test('manual GPS retry and foreground heartbeat share one in-flight browser acquisition',()=>{
 assert.match(source,/let pendingFreshPosition:Promise<GeolocationPosition>\|null=null/)
 assert.match(source,/if\(pendingFreshPosition\)return pendingFreshPosition/)
 assert.match(source,/const request=acquireFreshBrowserPosition\(\)/)
 assert.match(source,/finally\{if\(pendingFreshPosition===request\)pendingFreshPosition=null\}/)
 assert.match(source,/manualRefreshRef\.current=\(\)=>acquire\(true\)/)
 assert.match(source,/const pos=await getFreshBrowserPosition\(\)/)
 assert.match(source,/MATCHING_POSITION_AGE_MS=90_000/)
 assert.match(source,/MAX_ACCEPTABLE_ACCURACY_M=250/)
})
