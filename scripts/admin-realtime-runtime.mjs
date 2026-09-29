import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&email&&password&&sha,'UGO_TEST_ADMIN_REALTIME_INPUTS_REQUIRED')

const root=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const user=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const {data:login,error:loginError}=await user.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.user&&login.session,'UGO_TEST_ADMIN_SESSION_REQUIRED')
const {data:profile,error:profileError}=await root.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
assert.ifError(profileError)
assert.ok(['admin','superadmin'].includes(profile.tipo),'ADMIN_ROLE_REQUIRED')
assert.equal(profile.activo,true,'ACTIVE_ADMIN_REQUIRED')

const {data:candidates,error:candidateError}=await root.from('perfiles_proveedor').select('usuario_id,online,disponible').limit(50)
assert.ifError(candidateError)
const fixture=(candidates||[]).find(row=>row.disponible===true)||(candidates||[])[0]
assert.ok(fixture?.usuario_id,'PROVIDER_PROFILE_FIXTURE_REQUIRED')
const original={online:Boolean(fixture.online),disponible:Boolean(fixture.disponible)}
if(!original.disponible){
 const {error}=await root.from('perfiles_proveedor').update({disponible:true}).eq('usuario_id',fixture.usuario_id)
 assert.ifError(error)
}
const targetOnline=!original.online

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const pageErrors=[]
let topNavigations=0
page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)))
page.on('framenavigated',frame=>{if(frame===page.mainFrame())topNavigations++})

async function readOnlineKpi(){
 const card=page.locator('article').filter({hasText:'Proveedores online'}).first()
 await card.waitFor({state:'visible',timeout:20000})
 const raw=(await card.locator('strong').first().textContent()||'').trim()
 const value=Number(raw)
 assert.ok(Number.isFinite(value),'ONLINE_KPI_NUMERIC_REQUIRED: '+raw)
 return value
}
async function waitForKpi(expected,timeout=7000){
 const started=Date.now()
 while(Date.now()-started<timeout){
  if(await readOnlineKpi()===expected)return Date.now()-started
  await page.waitForTimeout(100)
 }
 throw new Error('ADMIN_REALTIME_TIMEOUT expected '+expected+' got '+await readOnlineKpi())
}

let restored=false
try{
 await page.addInitScript(session=>localStorage.setItem('ugo-test-admin-auth',JSON.stringify(session)),login.session)
 await page.goto(base+'/?app=admin',{waitUntil:'networkidle'})
 await page.getByText(/Sistema en vivo/).waitFor({state:'visible',timeout:20000})
 const before=await readOnlineKpi()
 const expected=before+(targetOnline?1:-1)
 const mutationStarted=Date.now()
 const {error:updateError}=await root.from('perfiles_proveedor').update({online:targetOnline,disponible:true}).eq('usuario_id',fixture.usuario_id)
 assert.ifError(updateError)
 const forwardLatencyMs=await waitForKpi(expected,7000)
 assert.ok(forwardLatencyMs<7000,'Realtime must beat 8s fallback polling window')
 const {error:restoreError}=await root.from('perfiles_proveedor').update(original).eq('usuario_id',fixture.usuario_id)
 assert.ifError(restoreError)
 const restoreLatencyMs=await waitForKpi(before,7000)
 restored=true
 assert.equal(topNavigations,1,'NO_MANUAL_OR_PROGRAMMATIC_REFRESH_ALLOWED')
 assert.equal(pageErrors.length,0,'ADMIN_RUNTIME_PAGE_ERRORS')
 await page.screenshot({path:'artifacts/admin-realtime-runtime.png',fullPage:true})
 const evidence={
  schema_version:'UGO_READINESS_EVIDENCE_V1',
  readiness_id:'admin-realtime',
  task_id:'readiness-admin-realtime',
  job_id:'UGO-READINESS-ADMIN-REALTIME',
  correlation_id:'readiness-admin-realtime-20260929T230400Z-15bef1e7',
  environment:'UGO TEST',
  sha,
  actor_role:profile.tipo,
  tested_url:base+'/?app=admin',
  fixture:{provider_id:fixture.usuario_id,original,target_online:targetOnline},
  ui:{live_indicator:'PASS',kpi:'Proveedores online',before,expected,after_restore:await readOnlineKpi()},
  realtime:{event_to_ui_latency_ms:forwardLatencyMs,restore_latency_ms:restoreLatencyMs,fallback_poll_ms:8000,beat_fallback:forwardLatencyMs<7000},
  refresh:{manual_refresh_used:false,top_level_navigations:topNavigations},
  reconciliation:{restored},
  page_errors:pageErrors,
  production_touched:false,
  result:'PASS',
  completed_at:new Date().toISOString(),
  mutation_started_at:new Date(mutationStarted).toISOString()
 }
 await fs.writeFile('artifacts/admin-realtime-runtime.json',JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,before,expected,forwardLatencyMs,restoreLatencyMs,restored}))
}finally{
 if(!restored)await root.from('perfiles_proveedor').update(original).eq('usuario_id',fixture.usuario_id).catch(()=>{})
 await browser.close()
 await user.auth.signOut()
}
\n// readiness verified PR trigger 2026-09-29T23:16Z\n