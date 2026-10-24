import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source=fs.readFileSync('src/mvp/shared.tsx','utf8')
const fragment=source.slice(source.indexOf('const AUTH_PROFILE_RETRY_DELAYS'),source.indexOf('export function useRoleSession'))
const code=ts.transpileModule(fragment,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const module={exports:{}}
vm.runInNewContext(code+'\nmodule.exports.withProfileTimeout=withProfileTimeout;',{
  module,exports:module.exports,AbortController,window:{setTimeout,clearTimeout},Promise,Error,
})
const {withProfileTimeout}=module.exports

test('profile timeout aborts the underlying PostgREST request rather than leaving it pending',async()=>{
  let signal
  const request={abortSignal(next){
    signal=next
    return new Promise((_,reject)=>next.addEventListener('abort',()=>reject(new Error('request aborted')),{once:true}))
  }}
  await assert.rejects(withProfileTimeout(request,15),/PROFILE_QUERY_TIMEOUT/)
  assert.equal(signal.aborted,true)
})

test('successful profile request clears timeout and does not abort later',async()=>{
  let signal
  const request={abortSignal(next){signal=next;return Promise.resolve({data:{id:'provider-a'},error:null})}}
  const result=await withProfileTimeout(request,15)
  assert.equal(result.data.id,'provider-a')
  await new Promise(resolve=>setTimeout(resolve,35))
  assert.equal(signal.aborted,false)
})

test('profile timeout keeps compatibility with non-abortable promise test doubles',async()=>{
  const result=await withProfileTimeout(Promise.resolve({data:{id:'provider-a'},error:null}),15)
  assert.equal(result.data.id,'provider-a')
})

test('Realtime reconnect failures never trigger immediate profile reads and resubscribe is rate limited',()=>{
  assert.match(source,/const realtimeProfileRefreshAt=useRef\(0\)/)
  assert.match(source,/if\(now-realtimeProfileRefreshAt\.current<30_000\)return/)
  assert.match(source,/if\(status==='SUBSCRIBED'\)refreshRealtime\(\)/)
  assert.match(source,/else if\(status==='CHANNEL_ERROR'\|\|status==='TIMED_OUT'\|\|status==='CLOSED'\)reconnect\(\)/)
  assert.match(source,/if\(generation!==profileGeneration\.current\)return;const query=supabase\.from\('usuarios'\)/)
})
