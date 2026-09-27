import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'
const identities=[
  {role:'Cliente',email:process.env.UGO_TEST_CLIENT_EMAIL,password:process.env.UGO_TEST_CLIENT_PASSWORD},
  {role:'Proveedor',email:process.env.UGO_TEST_PROVIDER_EMAIL,password:process.env.UGO_TEST_PROVIDER_PASSWORD},
  {role:'Admin',email:process.env.UGO_TEST_ADMIN_EMAIL,password:process.env.UGO_TEST_ADMIN_PASSWORD},
]

test('isolated TEST auth identities report role-only status',async()=>{
  assert.ok(url.includes(TEST_REF),'Auth diagnostic must target designated UGO TEST')
  assert.ok(!url.includes(PROD_REF),'Auth diagnostic refuses production')
  const missing=identities.filter(item=>!item.email||!item.password).map(item=>item.role)
  assert.deepEqual(missing,[],'Faltan credenciales TEST para uno o más roles')

  const results=[]
  for(const identity of identities){
    const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const{data,error}=await sb.auth.signInWithPassword({email:identity.email,password:identity.password})
    const ok=!error&&Boolean(data.user?.id)
    console.log(`${identity.role} auth ${ok?'OK':'FAIL'}`)
    results.push({role:identity.role,ok,code:error?.code||null})
    await sb.auth.signOut().catch(()=>{})
  }

  const failed=results.filter(item=>!item.ok)
  assert.deepEqual(
    failed,
    [],
    'Falló autenticación TEST para: '+failed.map(item=>`${item.role}(${item.code||'unknown'})`).join(', ')
  )
})
