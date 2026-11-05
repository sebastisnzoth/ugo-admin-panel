import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

// docs/UGO_PR614_SAFE_RELEASE_PLAN.md: no desplegar frontend que invoque RPC inexistentes.
// The pending-request pool stays behind VITE_FLAG_PROVIDER_PENDING_POOL (off by default)
// until migrations 20261105120000/20261105130000 are applied and validated in that
// environment. The missing-RPC guard (provider-pending-pool-rpc-guard) remains a second layer.
const read=file=>fs.readFileSync(file,'utf8')

async function loadFeatureFlags(){
 // ESM output keeps `import.meta` legal; every call passes an explicit env object.
 const compiled=ts.transpileModule(read('src/lib/featureFlags.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 return import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
}

function sourceFiles(dir){
 const files=[]
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.posix.join(dir,entry.name)
  if(entry.isDirectory())files.push(...sourceFiles(full))
  else if(/\.(tsx?|jsx?|mjs)$/.test(entry.name))files.push(full)
 }
 return files
}

test('pending pool flag is off by default; only an explicit true enables it',async()=>{
 const {isProviderPendingPoolEnabled}=await loadFeatureFlags()
 assert.equal(isProviderPendingPoolEnabled({}),false)
 assert.equal(isProviderPendingPoolEnabled({MODE:'production',PROD:true}),false)
 for(const value of [undefined,null,'','false','0','1','yes','on','enabled'])
  assert.equal(isProviderPendingPoolEnabled({VITE_FLAG_PROVIDER_PENDING_POOL:value}),false,'value '+JSON.stringify(value))
 assert.equal(isProviderPendingPoolEnabled({VITE_FLAG_PROVIDER_PENDING_POOL:'true'}),true)
 assert.equal(isProviderPendingPoolEnabled({VITE_FLAG_PROVIDER_PENDING_POOL:' TRUE '}),true)
})

test('pool may be enabled in production after the authorized window; rideshare flags still never can',async()=>{
 const {isProviderPendingPoolEnabled,isRideshareFlagEnabled}=await loadFeatureFlags()
 assert.equal(isProviderPendingPoolEnabled({MODE:'production',PROD:true,VITE_FLAG_PROVIDER_PENDING_POOL:'true'}),true)
 assert.equal(isRideshareFlagEnabled('clientRideshareFlow',{MODE:'production',PROD:true,VITE_FLAG_CLIENT_RIDESHARE_FLOW:'true'}),false)
 assert.equal(isRideshareFlagEnabled('providerRideshareFlow',{MODE:'production',PROD:true,VITE_FLAG_PROVIDER_RIDESHARE_FLOW:'true'}),false)
 assert.equal(isRideshareFlagEnabled('clientRideshareFlow',{MODE:'development',VITE_FLAG_CLIENT_RIDESHARE_FLOW:'true'}),true)
})

test('the only pool render site is gated by the flag and nothing else calls the pool RPCs',()=>{
 const opportunities=read('src/mvp/provider/ProviderOpportunities.tsx')
 assert.match(opportunities,/import\{isProviderPendingPoolEnabled\}from'\.\.\/\.\.\/lib\/featureFlags'/)
 assert.match(opportunities,/const PENDING_POOL_ENABLED=isProviderPendingPoolEnabled\(\)/)
 assert.match(opportunities,/\{!d\.debtBlocked&&PENDING_POOL_ENABLED&&<ProviderPendingRequests\/>\}/)
 assert.equal((opportunities.match(/<ProviderPendingRequests\b/g)||[]).length,1,'single gated render site')
 const files=sourceFiles('src')
 assert.deepEqual(files.filter(file=>/<ProviderPendingRequests\b/.test(read(file))),['src/mvp/provider/ProviderOpportunities.tsx'])
 // Match real invocations (.rpc('name'), not names mentioned in comments.
 const rpcCall=/\.rpc\(\s*['"`](?:obtener_pedidos_pendientes_proveedor|tomar_pedido_pendiente)['"`]/
 assert.deepEqual(files.filter(file=>rpcCall.test(read(file))),['src/mvp/provider/ProviderPendingRequests.tsx'])
})

test('pending pool flag is documented as off in .env.example',()=>{
 const env=read('.env.example')
 assert.match(env,/^VITE_FLAG_PROVIDER_PENDING_POOL=false$/m)
 assert.doesNotMatch(env,/^VITE_FLAG_PROVIDER_PENDING_POOL=(?!false$)/m)
})
