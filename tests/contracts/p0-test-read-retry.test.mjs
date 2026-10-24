import test from 'node:test'
import assert from 'node:assert/strict'
import {readWithTransientRetry,isTransientReadOutage} from '../../scripts/lib/p0-test-read-retry.mjs'

const dbError=code=>Object.assign(new Error('read categories unavailable'),{cause:{code}})
test('PGRST002 read recovers with bounded backoff and records only sanitized retry metadata',async()=>{
  let calls=0
  const delays=[],events=[]
  const result=await readWithTransientRetry(async()=>{
    calls++
    if(calls<3)throw dbError('PGRST002')
    return [{id:'category'}]
  },{sleep:async ms=>{delays.push(ms)},onRetry:record=>events.push(record)})
  assert.deepEqual(result,[{id:'category'}])
  assert.equal(calls,3)
  assert.deepEqual(delays,[1200,3000])
  assert.deepEqual(events,[{attempt:1,code:'PGRST002',delayMs:1200},{attempt:2,code:'PGRST002',delayMs:3000}])
})
test('persistent database outage fails closed after three reads',async()=>{
  let calls=0
  await assert.rejects(readWithTransientRetry(async()=>{calls++;throw dbError('PGRST002')},{sleep:async()=>{}}),/read categories unavailable/)
  assert.equal(calls,3)
})
test('permissions and schema errors are never retried',async()=>{
  let calls=0
  await assert.rejects(readWithTransientRetry(async()=>{calls++;throw dbError('42501')},{sleep:async()=>{}}),/read categories unavailable/)
  assert.equal(calls,1)
  assert.equal(isTransientReadOutage({cause:{code:'PGRST116'}}),false)
  assert.equal(isTransientReadOutage({cause:{status:504}}),true)
})

test('Cloudflare 522 from read-only catalog retries at most twice and can recover',async()=>{
  let calls=0
  const delays=[]
  const result=await readWithTransientRetry(async()=>{
    calls++
    if(calls<3)throw Object.assign(new Error('Connection timed out'),{cause:{status:522}})
    return ['catalog']
  },{sleep:async ms=>{delays.push(ms)}})
  assert.deepEqual(result,['catalog'])
  assert.equal(calls,3)
  assert.deepEqual(delays,[1200,3000])
})

test('persistent 522 still fails closed; 401/403 never retried',async()=>{
  for(const status of [522,401,403]){
    let calls=0
    const error=Object.assign(new Error(`HTTP ${status}`),{p0:{error:{status}}})
    await assert.rejects(readWithTransientRetry(async()=>{calls++;throw error},{sleep:async()=>{}}),new RegExp(`HTTP ${status}`))
    assert.equal(calls,status===522?3:1)
  }
})
