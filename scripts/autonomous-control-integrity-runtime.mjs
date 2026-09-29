import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
assert.ok(url.includes('tmossnqfwfwjrtzwcbmm'),'UGO TEST project required')
assert.ok(key,'UGO TEST service role required')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const {data,error}=await db.rpc('autonomous_verify_integrity_controls')
if(error)throw error
const controls=new Map((data||[]).map(x=>[x.control_key,x.status]))
for(const k of ['audit-evidence','authority-boundaries','data-quality-gate','job-resilience']) assert.equal(controls.get(k),'EFFECTIVE',k+' must be EFFECTIVE')
console.log(JSON.stringify({verified:true,controls:Object.fromEntries(controls),environment:'UGO TEST'}))
