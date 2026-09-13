import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const required = ['UGO_TEST_ADMIN_EMAIL','UGO_TEST_ADMIN_PASSWORD']
const missing = required.filter(name=>!process.env[name])
const enabled = missing.length===0
const requireIsolated = process.env.UGO_REQUIRE_ISOLATED_INTEGRATION==='1'
const url = process.env.UGO_TEST_SUPABASE_URL||''
const key = process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'

test('isolated Admin can authenticate and observe operational TEST surfaces',{skip:!enabled},async()=>{
 assert.ok(url.includes(TEST_REF),'Admin integration must target designated UGO TEST')
 assert.ok(!url.includes(PROD_REF),'Admin integration refuses production')
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const{data,error}=await sb.auth.signInWithPassword({email:process.env.UGO_TEST_ADMIN_EMAIL,password:process.env.UGO_TEST_ADMIN_PASSWORD})
 if(error)throw error
 assert.ok(data.user?.id,'Admin test identity must authenticate')
 const{data:profile,error:profileError}=await sb.from('usuarios').select('tipo,activo').eq('id',data.user.id).single()
 if(profileError)throw profileError
 assert.equal(profile.activo,true,'Admin TEST account must be active')
 assert.ok(['admin','superadmin'].includes(profile.tipo),'TEST identity must have admin role')
 const services=await sb.from('servicios').select('id,estado').limit(1)
 assert.equal(services.error,null,'Admin must be able to observe services')
 const disputes=await sb.from('disputas').select('id,estado').limit(1)
 assert.equal(disputes.error,null,'Admin must be able to observe disputes')
 await sb.auth.signOut()
})

test('isolated Admin gate documents missing credentials instead of using another environment',{skip:enabled},()=>{
 assert.ok(missing.length>0)
 if(requireIsolated)assert.fail(`UGO TEST Admin requerido pero faltan: ${missing.join(', ')}`)
})
