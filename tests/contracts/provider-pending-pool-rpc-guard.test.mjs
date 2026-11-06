import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

// The frontend can be deployed (Vercel on merge) before migration
// 20261105130000_provider_pending_request_pool.sql is applied. The pool must then
// stay hidden instead of showing an error alert to every provider.
const helperSource=fs.readFileSync('src/mvp/provider/providerPendingPool.ts','utf8')
const compiled=ts.transpileModule(helperSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const module={exports:{}}
new Function('module','exports',compiled)(module,module.exports)
const {isMissingPendingPoolRpc}=module.exports

test('missing pool RPC (migration not applied) is recognised from real PostgREST/Postgres shapes',()=>{
  assert.equal(isMissingPendingPoolRpc({code:'PGRST202',message:'Could not find the function public.obtener_pedidos_pendientes_proveedor without parameters in the schema cache',details:null,hint:null},404),true)
  assert.equal(isMissingPendingPoolRpc({code:'PGRST202',message:'Could not find the function public.obtener_pedidos_pendientes_proveedor'}),true)
  assert.equal(isMissingPendingPoolRpc({code:'42883',message:'function private.pending_request_eligible(uuid, uuid) does not exist'}),true)
  assert.equal(isMissingPendingPoolRpc(null,404),true)
})

test('real operational errors are not hidden as "feature unavailable"',()=>{
  assert.equal(isMissingPendingPoolRpc({code:'57014',message:'canceling statement due to statement timeout'},500),false)
  assert.equal(isMissingPendingPoolRpc({code:'42501',message:'permission denied for function obtener_pedidos_pendientes_proveedor'},403),false)
  assert.equal(isMissingPendingPoolRpc({code:'PGRST301',message:'JWT expired'},401),false)
  assert.equal(isMissingPendingPoolRpc({message:'TypeError: Failed to fetch'},0),false)
  assert.equal(isMissingPendingPoolRpc(undefined,500),false)
})

test('pool component hides itself and stops polling when the RPC is missing, but keeps the error alert otherwise',()=>{
  const source=fs.readFileSync('src/mvp/provider/ProviderPendingRequests.tsx','utf8')
  assert.match(source,/import\{isMissingPendingPoolRpc\}from'\.\/providerPendingPool'/)
  assert.match(source,/const\{data,error,status\}=await\(supabase as any\)\.rpc\('obtener_pedidos_pendientes_proveedor'\)/)
  assert.match(source,/if\(isMissingPendingPoolRpc\(error,status\)\)\{poolMissing\.current=true;/)
  assert.match(source,/const epoch=\+\+loadEpoch\.current;if\(poolMissing\.current\)\{setLoading\(false\);return\}/)
  assert.match(source,/if\(unavailable\)return null/)
  assert.match(source,/error\?<p role="alert">\{t\('providerPool\.error'\)\}<\/p>/)
})
