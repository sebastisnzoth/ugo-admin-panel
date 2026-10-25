import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {waitForClientProfileUi} from '../../scripts/lib/waitForClientProfileUi.mjs'
function mock({initialFailure=true,retryVisible=true,sessionPresent=true,loginPresent=false,recoveryFailure=false,loginAfterRetry=false}={}){
 const calls={waits:0,clicks:0,recovered:0}
 const original=new Error('PROFILE_QUERY_TIMEOUT')
 const target={waitFor:async()=>{calls.waits++;if(initialFailure&&calls.waits===1)throw original;if(recoveryFailure)throw new Error('PROFILE_QUERY_TIMEOUT_PERSISTENT')}}
 const page={
  getByRole:(role,options)=>{assert.equal(role,'button');assert.match('Reintentar carga del perfil',options.name);return{isVisible:async()=>retryVisible,click:async()=>{calls.clicks++}}},
  evaluate:async()=>({sessionPresent,loginPresent}),
  locator:selector=>{assert.equal(selector,'[data-testid="auth-form"]');return{count:async()=>loginAfterRetry?1:0}},
 }
 return {page,target,calls,original}
}
test('healthy client UI never retries',async()=>{const b=mock({initialFailure:false});assert.deepEqual(await waitForClientProfileUi(b.page,b.target),{recovered:false});assert.equal(b.calls.clicks,0)})
test('transient profile timeout exercises the real UI retry once',async()=>{const b=mock();assert.deepEqual(await waitForClientProfileUi(b.page,b.target,{onRecovered:()=>{b.calls.recovered++}}),{recovered:true});assert.deepEqual(b.calls,{waits:2,clicks:1,recovered:1})})
test('no recovery button preserves original failure',async()=>{const b=mock({retryVisible:false});await assert.rejects(waitForClientProfileUi(b.page,b.target),e=>e===b.original);assert.equal(b.calls.clicks,0)})
test('missing session or login UI fail closed',async()=>{for(const options of [{sessionPresent:false},{loginPresent:true}]){const b=mock(options);await assert.rejects(waitForClientProfileUi(b.page,b.target),/CLIENT_PROFILE_RECOVERY_REQUIRES_VALID_SESSION_UI/);assert.equal(b.calls.clicks,0)}})
test('persistent timeout or return to login cannot pass',async()=>{for(const options of [{recoveryFailure:true},{loginAfterRetry:true}]){const b=mock(options);await assert.rejects(waitForClientProfileUi(b.page,b.target),/PROFILE_QUERY_TIMEOUT_PERSISTENT|CLIENT_PROFILE_RECOVERY_RETURNED_TO_LOGIN/);assert.equal(b.calls.clicks,1)}})
test('P0 and notifications harnesses both exercise recovery and preserve Auth checks',()=>{
 const p0=readFileSync(new URL('../../scripts/p0-client-provider-e2e.mjs',import.meta.url),'utf8')
 const notifications=readFileSync(new URL('../../scripts/client-notifications-runtime.mjs',import.meta.url),'utf8')
 for(const s of [p0,notifications])assert.match(s,/waitForClientProfileUi\(/)
 assert.match(p0,/P0_CLIENT_SESSION_NOT_PERSISTED/)
 assert.match(notifications,/assert\.ok\(login\.session&&login\.user/)
})
