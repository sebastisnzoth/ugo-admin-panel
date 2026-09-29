import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&sha,'UGO_TEST_INPUTS_REQUIRED')

async function login(email,password){
 const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await sb.auth.signInWithPassword({email,password})
 assert.ifError(error); assert.ok(data.session)
 return {sb,session:data.session}
}
const client=await login(process.env.UGO_TEST_CLIENT_EMAIL,process.env.UGO_TEST_CLIENT_PASSWORD)
const provider=await login(process.env.UGO_TEST_PROVIDER_EMAIL,process.env.UGO_TEST_PROVIDER_PASSWORD)
const admin=await login(process.env.UGO_TEST_ADMIN_EMAIL,process.env.UGO_TEST_ADMIN_PASSWORD)
const browser=await chromium.launch({headless:true})
const results=[]
async function probe(actor,session,allowed){
 const page=await browser.newPage({viewport:{width:390,height:844}})
 try{
  if(session)await page.addInitScript(s=>localStorage.setItem('ugo-test-admin-auth',JSON.stringify(s)),session)
  await page.goto(base+'/?app=admin',{waitUntil:'domcontentloaded'})
  if(allowed){
   await page.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:20000})
   results.push({actor,access:'ALLOWED',status:'PASS'})
  }else{
   await page.getByRole('heading',{name:/Panel de control|Desarrollo UGO/}).waitFor({state:'visible',timeout:20000})
   assert.equal(await page.getByRole('navigation',{name:'Navegación Admin'}).count(),0,actor+' must not see Admin navigation')
   if(session)await page.getByRole('alert').filter({hasText:/Acceso denegado/}).waitFor({state:'visible',timeout:10000})
   results.push({actor,access:'DENIED',status:'PASS'})
  }
 } finally {await page.close()}
}
try{
 await probe('anonymous',null,false)
 await probe('client',client.session,false)
 await probe('provider',provider.session,false)
 await probe('admin',admin.session,true)
 await fs.mkdir('artifacts',{recursive:true})
 await fs.writeFile('artifacts/admin-auth-runtime.json',JSON.stringify({readiness_id:'admin-auth',sha,environment:'UGO TEST',results,completed_at:new Date().toISOString()},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,results}))
} finally {
 await browser.close()
 await Promise.allSettled([client.sb.auth.signOut(),provider.sb.auth.signOut(),admin.sb.auth.signOut()])
}
