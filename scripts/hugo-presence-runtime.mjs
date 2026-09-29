import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
const creds={
 client:[process.env.UGO_TEST_CLIENT_EMAIL||'',process.env.UGO_TEST_CLIENT_PASSWORD||''],
 provider:[process.env.UGO_TEST_PROVIDER_EMAIL||'',process.env.UGO_TEST_PROVIDER_PASSWORD||''],
 admin:[process.env.UGO_TEST_ADMIN_EMAIL||'',process.env.UGO_TEST_ADMIN_PASSWORD||'']
}
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&sha,'UGO_TEST_INPUTS_REQUIRED')
for(const [role,[email,password]] of Object.entries(creds))assert.ok(email&&password,role+' TEST credentials required')

async function login(email,password){
 const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data,error}=await sb.auth.signInWithPassword({email,password})
 assert.ifError(error); assert.ok(data.session,'SESSION_REQUIRED')
 return {sb,session:data.session}
}
const sessions={}
const clients={}
for(const role of ['client','provider','admin']){const r=await login(...creds[role]);sessions[role]=r.session;clients[role]=r.sb}

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const results=[]

async function openRole(role,viewport){
 const page=await browser.newPage({viewport})
 const errors=[]
 page.on('pageerror',error=>errors.push(String(error?.message||error)))
 await page.addInitScript(({role,session})=>{
  const key=role==='admin'?'ugo-test-admin-auth':'ugo-test-'+role+'-auth'
  localStorage.setItem(key,JSON.stringify(session))
 },{role,session:sessions[role]})
 await page.goto(base+'/?app='+role,{waitUntil:'domcontentloaded'})
 return {page,errors}
}
async function prove(page,role,viewportName){
 if(role==='client')await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
 if(role==='provider')await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:20000})
 if(role==='admin')await page.getByRole('navigation',{name:'Navegación Admin'}).waitFor({state:'visible',timeout:30000})
 const selector=role==='client'?'[aria-label="Hugo, controlador por voz del cliente"]':role==='provider'?'[aria-label="Hugo, controlador por voz del proveedor"]':'.hugo-free-trigger'
 const surface=page.locator(selector).first()
 await surface.waitFor({state:'visible',timeout:20000})
 const box=await surface.boundingBox(),viewport=page.viewportSize(),aria=await surface.getAttribute('aria-label')
 assert.ok(box&&viewport,role+' Hugo bounding box required')
 assert.ok(box.x>=-1&&box.y>=-1,role+' Hugo clipped above/left')
 assert.ok(box.x+box.width<=viewport.width+1,role+' Hugo clipped right')
 assert.ok(box.y+box.height<=viewport.height+1,role+' Hugo clipped bottom')
 assert.ok(box.y>=viewport.height*0.45,role+' Hugo must remain in lower non-invasive zone')
 if(role==='admin')assert.match(String(aria||''),/Abrir Hugo (Admin|Super Admin)/)
 else assert.match(String(aria||''),new RegExp('Hugo, controlador por voz del '+role))
 const button=role==='admin'?surface:surface.getByRole('button',{name:/Hablar con Hugo|Cortar conversación con Hugo/}).first()
 await button.waitFor({state:'visible',timeout:10000})
 assert.equal(await button.isEnabled(),true,role+' Hugo trigger disabled')
 await page.screenshot({path:'artifacts/hugo-presence-'+role+'-'+viewportName+'.png',fullPage:true})
 return {role,viewport:viewportName,aria,box,viewport,status:'PASS'}
}
try{
 for(const [viewportName,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  for(const role of ['client','provider','admin']){
   const {page,errors}=await openRole(role,viewport)
   try{results.push(await prove(page,role,viewportName));assert.deepEqual(errors,[],role+' page errors: '+errors.join(' | '))}
   finally{await page.close()}
  }
 }
 const evidence={readiness_id:'hugo-presence',task_id:'readiness-hugo-presence',job_id:'UGO-READINESS-HUGO-PRESENCE',correlation_id:'readiness-hugo-presence-20260929T204700Z',sha,environment:'UGO TEST',judge:'PASS',sentinel:'PASS',results,completed_at:new Date().toISOString()}
 await fs.writeFile('artifacts/hugo-presence-runtime.json',JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,roles:['client','provider','admin'],viewports:['desktop','mobile']}))
}finally{
 await browser.close()
 await Promise.allSettled(Object.values(clients).map(sb=>sb.auth.signOut()))
}
