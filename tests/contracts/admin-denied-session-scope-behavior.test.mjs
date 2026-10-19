import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('rejecting a non-admin session clears only the Admin login and preserves other device/role sessions',async()=>{
 const source=fs.readFileSync('src/mvp/AdminGate.tsx','utf8')
 const body=source.slice(source.indexOf('  async function verify(){'),source.indexOf('  useEffect(()=>{verify()'))
 const calls=[],allowed=[]
 const sb={auth:{getSession:async()=>({data:{session:{user:{id:'test-provider'}}},error:null}),signOut:async options=>{calls.push(options);return{error:null}}}}
 const noop=()=>{}
 const verify=new Function('supabase','window','authorizeSession','setAllowed','setError','setChecking','setRecovery','setNotice','t','requiresSuperAdmin',body+';return verify')(sb,{location:{search:'?app=admin'}},async()=>false,value=>allowed.push(value),noop,noop,noop,noop,key=>key,false)
 await verify()
 assert.deepEqual(allowed,[false],'role denial must remain enforced')
 assert.equal(calls.length,1)
 assert.equal(calls[0]?.scope,'local','automatic role denial must never revoke provider refresh tokens globally')
})
