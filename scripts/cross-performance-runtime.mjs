import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

// PR330 pointer actionability reconciliation: retain DOM hit-test + Playwright trial click.
// same-SHA retrigger after cross-role diagnostics
// final same-SHA retrigger after cross-role auth preservation
// same-SHA retrigger after fresh role-session harness
// same-SHA retrigger after global Hugo decoupling

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
const credentials={
  client:[process.env.UGO_TEST_CLIENT_EMAIL||'',process.env.UGO_TEST_CLIENT_PASSWORD||''],
  provider:[process.env.UGO_TEST_PROVIDER_EMAIL||'',process.env.UGO_TEST_PROVIDER_PASSWORD||''],
  admin:[process.env.UGO_TEST_ADMIN_EMAIL||'',process.env.UGO_TEST_ADMIN_PASSWORD||''],
}

assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&sha,'UGO_TEST_RUNTIME_INPUTS_REQUIRED')
for(const [role,[email,password]] of Object.entries(credentials)) assert.ok(email&&password,role+' credentials required')

await fs.mkdir('artifacts',{recursive:true})
const result={
  task:'readiness-cross-performance-runtime',
  readiness_id:'cross-performance',
  sha,
  environment:'UGO TEST',
  production_touched:false,
  status:'RUNNING',
  auth:{},
  performance:{},
  started_at:new Date().toISOString()
}

async function persist(){ await fs.writeFile('artifacts/readiness-cross-performance-runtime.json',JSON.stringify(result,null,2)+'\n') }

async function login(role,email,password){
  const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  let lastError=null
  const attempts=7
  for(let attempt=1;attempt<=attempts;attempt++){
    const started=performance.now()
    try{
      const {data,error}=await sb.auth.signInWithPassword({email,password})
      const latency=Math.round(performance.now()-started)
      if(!error&&data.session){
        result.auth[role]={status:'PASS',attempt,latency_ms:latency}
        await persist()
        return {sb,session:data.session}
      }
      lastError=error||new Error('SESSION_REQUIRED')
      result.auth[role]={status:'RETRY',attempt,latency_ms:latency,error:String(lastError?.message||lastError)}
    }catch(error){
      const latency=Math.round(performance.now()-started)
      lastError=error
      result.auth[role]={status:'RETRY',attempt,latency_ms:latency,error:String(error?.message||error)}
    }
    await persist()
    if(attempt<attempts) await new Promise(resolve=>setTimeout(resolve,Math.min(20000,1000*(2**(attempt-1)))))
  }
  result.auth[role]={...(result.auth[role]||{}),status:'FAIL',error:String(lastError?.message||lastError||'AUTH_FAILED')}
  await persist()
  throw lastError||new Error(role+'_AUTH_FAILED')
}

const sessions={}
let browser
try{
  for(const [role,[email,password]] of Object.entries(credentials)) sessions[role]=await login(role,email,password)
  browser=await chromium.launch({headless:true})

  async function openRole(role){
    const context=await browser.newContext({viewport:{width:1280,height:900}})
    const page=await context.newPage()
    const session=sessions[role].session
    await page.addInitScript(({role,session})=>{
      const key=role==='admin'?'ugo-test-admin-auth':'ugo-test-'+role+'-auth'
      localStorage.setItem(key,JSON.stringify(session))
    },{role,session})
    const started=performance.now()
    await page.goto(base+'/?app='+role,{waitUntil:'domcontentloaded',timeout:20000})
    const loadMs=Math.round(performance.now()-started)
    result.performance[role+'_initial_load_ms']=loadMs
    await persist()
    assert.ok(loadMs<=8000,role+' initial load exceeded 8000ms: '+loadMs+'ms')
    return {context,page}
  }

  async function visible(locator,timeout=20000){ await locator.waitFor({state:'visible',timeout}); return locator }
  async function clickFirstPointerReachable(locator,label){
    const count=await locator.count()
    let lastError=null
    for(let index=0;index<count;index++){
      const item=locator.nth(index)
      if(!(await item.isVisible())) continue
      try{
        await item.scrollIntoViewIfNeeded()
        const reachable=await item.evaluate(el=>{
          const r=el.getBoundingClientRect()
          if(!r.width||!r.height)return false
          const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)
          return top===el||Boolean(top&&el.contains(top))
        })
        if(!reachable)continue
        await item.click({trial:true,timeout:2500})
        await item.click({timeout:2500})
        return
      }catch(error){ lastError=error }
    }
    throw new Error(label+'_NO_POINTER_REACHABLE_TARGET'+(lastError?' '+String(lastError?.message||lastError):''))
  }
  async function timed(label,fn,limitMs=4000){
    const started=performance.now()
    await fn()
    const ms=Math.round(performance.now()-started)
    result.performance[label]=ms
    await persist()
    assert.ok(ms<=limitMs,label+' exceeded '+limitMs+'ms: '+ms+'ms')
  }

  const client=await openRole('client')
  try{
    await visible(client.page.getByRole('main',{name:'Inicio UGO Cliente'}),20000)
    await visible(client.page.getByRole('button',{name:/Abrir menú/i}).first())
    await timed('client_request_navigation_ms',async()=>{
      await client.page.getByRole('button',{name:/Abrir menú/i}).first().click()
      const drawer=client.page.getByRole('complementary',{name:'Menú UGO Cliente'})
      await visible(drawer,5000)
      const requestButtons=drawer.locator('button:visible').filter({hasText:/Pedir servicio/i})
      const requestButton=requestButtons.first()
      await visible(requestButton,5000)
      await clickFirstPointerReachable(requestButtons,'CLIENT_REQUEST_BUTTON')
      await drawer.waitFor({state:'hidden',timeout:5000})
      await visible(client.page.getByRole('textbox',{name:'Buscar servicio'}),5000)
    })
  } finally { await client.context.close() }

  const provider=await openRole('provider')
  try{
    const nav=provider.page.getByRole('navigation',{name:'Navegación principal'}).first()
    await visible(nav)
    await timed('provider_jobs_navigation_ms',async()=>{
      await nav.getByRole('button',{name:/Trabajos/i}).first().click()
      await visible(provider.page.locator('.ugo-provider-root'))
    })
  } finally { await provider.context.close() }

  const admin=await openRole('admin')
  try{
    const nav=admin.page.getByRole('navigation',{name:'Navegación Admin'})
    await visible(nav)
    await timed('admin_operations_navigation_ms',async()=>{
      await nav.getByRole('button',{name:/Operaciones/i}).click()
      await visible(admin.page.getByRole('group',{name:'Menú de operaciones'}))
    })
  } finally { await admin.context.close() }

  const samples=Object.entries(result.performance)
    .filter(([k,v])=>k.endsWith('_ms')&&Number.isFinite(v))
    .map(([,v])=>v)
    .sort((a,b)=>a-b)
  assert.ok(samples.length>=6,'PERFORMANCE_SAMPLE_COUNT_TOO_LOW')
  result.performance.sample_count=samples.length
  result.performance.max_ms=Math.max(...samples)
  result.performance.p95_ms=samples[Math.max(0,Math.ceil(samples.length*.95)-1)]
  result.performance.status='PASS'
  result.status='PASS'
  result.completed_at=new Date().toISOString()
  await persist()
  console.log(JSON.stringify(result))
}catch(error){
  result.status='FAIL'
  result.failure=String(error?.message||error)
  result.completed_at=new Date().toISOString()
  await persist()
  throw error
}finally{
  if(browser) await browser.close()
  await Promise.allSettled(Object.values(sessions).map(x=>x.sb.auth.signOut()))
}
