import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {retryableTestAuthError,signInForTestWithBoundedRetry} from '../../scripts/lib/testAuthRetry.mjs'

const runtime=readFileSync(new URL('../../scripts/client-notifications-runtime.mjs',import.meta.url),'utf8')
test('only gateway/server/network transients are retried for UGO Arena TEST Auth',()=>{
 for(const status of [500,502,503,504]){
  assert.equal(retryableTestAuthError({status,message:'Gateway Timeout'}),true)
 }
 for(const status of [400,401,403,404,429]){
  assert.equal(retryableTestAuthError({status,message:'Invalid login credentials'}),false)
 }
 assert.equal(retryableTestAuthError({name:'AuthRetryableFetchError',message:'Gateway Timeout'}),true)
 assert.equal(retryableTestAuthError({name:'AuthError',message:'Invalid login credentials'}),false)
 for(const status of [400,401,403,404,409,429]){
  assert.equal(retryableTestAuthError({status,name:'AuthRetryableFetchError',message:'Gateway Timeout'}),false,'HTTP '+status+' must not retry even with misleading error name')
 }
 assert.equal(retryableTestAuthError({name:'AuthRetryableFetchError',status:0,message:'Gateway Timeout'}),true)
 assert.equal(retryableTestAuthError({status:520,name:'AuthRetryableFetchError',message:'Gateway Timeout'}),false)
})
test('bounded transient 504 recovers only after real Supabase Auth success',async()=>{
 let calls=0;const sleeps=[]
 const session={user:{id:'authenticated-test-user'},access_token:'TEST_ONLY'}
 const result=await signInForTestWithBoundedRetry({
  signInWithPassword:async()=>{calls++;return calls===3?{data:{session,user:session.user},error:null}:{data:{session:null},error:{status:504,message:'Gateway Timeout'}}}
 },{email:'fake@example.test',password:'redacted'},{wait:async ms=>sleeps.push(ms)})
 assert.equal(calls,3)
 assert.deepEqual(sleeps,[1200,3200])
 assert.equal(result.error,null)
 assert.equal(result.data.session,session)
})
test('permanent Auth error and rate limits cannot be masked by retry',async()=>{
 for(const status of [400,401,403,429]){
  let calls=0
  const result=await signInForTestWithBoundedRetry({signInWithPassword:async()=>{calls++;return{data:{session:null},error:{status,message:'Access denied'}}}},{email:'fake',password:'fake'},{wait:async()=>assert.fail('unexpected retry')})
  assert.equal(calls,1)
  assert.equal(result.error.status,status)
 }
})
test('persistent 504 fails after maximum of three attempts and never creates a session',async()=>{
 let calls=0;const waits=[]
 const result=await signInForTestWithBoundedRetry({signInWithPassword:async()=>{calls++;return {data:{session:null},error:{status:504,message:'Gateway Timeout'}}}},{email:'fake',password:'fake'},{wait:async ms=>waits.push(ms)})
 assert.equal(calls,3)
 assert.deepEqual(waits,[1200,3200])
 assert.equal(result.error.status,504)
 assert.equal(result.data.session,null)
})
test('the client and provider harness both use bounded test Auth without sign-out or synthetic sessions',()=>{
 assert.match(runtime,/signInForTestWithBoundedRetry\(auth\.auth,\{email,password\}\)/)
 assert.match(runtime,/signInForTestWithBoundedRetry\(provider\.auth,\{email:providerEmail,password:providerPassword\}\)/)
 assert.match(runtime,/assert\.ifError\(loginError\)/)
 assert.match(runtime,/assert\.ifError\(providerLoginError\)/)
})
