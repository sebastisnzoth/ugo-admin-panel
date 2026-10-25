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
assert.ok(anon&&serviceKey&&email&&password&&sha,'UGO_TEST_RUNTIME_INPUTS_REQUIRED')

const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const user=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await user.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.user&&login.session,'UGO_TEST_ADMIN_SESSION_REQUIRED')
const {data:profile,error:profileError}=await service.from('usuarios').select('tipo,activo').eq('id',login.user.id).single()
assert.ifError(profileError)
assert.ok(profile?.activo,'UGO_TEST_ADMIN_ACTIVE_REQUIRED')
assert.ok(['admin','superadmin'].includes(profile?.tipo),'UGO_TEST_ADMIN_ROLE_REQUIRED')

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const matrix=[
 {id:'mobile-320',width:320,height:720},
 {id:'mobile-360',width:360,height:800},
 {id:'mobile-390',width:390,height:844},
 {id:'mobile-430',width:430,height:932},
 {id:'tablet-768',width:768,height:1024},
 {id:'tablet-1024',width:1024,height:768},
 {id:'desktop-1440',width:1440,height:1100},
]
const result={task_id:'readiness-admin-responsive',job_id:'UGO-READINESS-ADMIN-RESPONSIVE',readiness_id:'admin-responsive',sha,environment:'UGO TEST',actor_role:profile.tipo,tested_url:base+'/?app=admin',viewports:[],page_errors:[],completed_at:null}

async function shellMetrics(page,label){
 const m=await page.evaluate(()=>{
  const de=document.documentElement,body=document.body,shell=document.querySelector('.ugo-admin2'),main=document.querySelector('.ugo-admin2-main')
  const rect=(el)=>el?{scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}:null
  return {viewport:{width:window.innerWidth,height:window.innerHeight},document:rect(de),body:rect(body),shell:rect(shell),main:rect(main)}
 })
 assert.ok(m.shell&&m.main,label+':ADMIN_SHELL_REQUIRED')
 assert.ok(m.document.scrollWidth<=m.document.clientWidth+1,label+':DOCUMENT_HORIZONTAL_OVERFLOW')
 assert.ok(m.body.scrollWidth<=m.body.clientWidth+1,label+':BODY_HORIZONTAL_OVERFLOW')
 assert.ok(m.shell.scrollWidth<=m.shell.clientWidth+1,label+':SHELL_HORIZONTAL_OVERFLOW')
 return m
}

async function clickNav(page,name){
 const button=page.locator('.ugo-admin2-sidebar nav button').filter({hasText:name}).first()
 await button.waitFor({state:'visible',timeout:20000})
 await button.click()
 await page.waitForTimeout(180)
}

try{
 for(const vp of matrix){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(String(e?.message||e)))
  // Seed the authorized session before app bootstrap; Realtime/polling keep the network busy.
  // Never use networkidle as an authentication or UI readiness signal.
  await page.addInitScript(session=>localStorage.setItem('ugo-test-admin-auth',JSON.stringify(session)),login.session)
  await page.goto(base+'/?app=admin',{waitUntil:'domcontentloaded'})
  await page.locator('.ugo-admin2').waitFor({state:'visible',timeout:30000})
  // Exercise the real language selector so navigation assertions use the same locale.
  await page.getByTestId('language-selector').selectOption('es')
  await page.locator('.ugo-admin2-sidebar nav button').filter({hasText:'Inicio'}).first().waitFor({state:'visible',timeout:20000})
  const sections=[]
  for(const nav of ['Inicio','Operaciones','Personas','Finanzas','Configuración']){
   await clickNav(page,nav)
   sections.push({section:nav,metrics:await shellMetrics(page,vp.id+':'+nav)})
  }
  if(profile.tipo==='superadmin'){
   // Text is localized; use a stable role-gated locator rather than a translated label.
   const superAdminButton=page.getByTestId('admin-superadmin-nav')
   try {
    await superAdminButton.waitFor({state:'visible',timeout:20000})
   } catch(error) {
    const roleDiagnostic=await page.evaluate(()=>{
     const status=[...document.querySelectorAll('.ugo-admin2-status')].map(el=>el.textContent?.trim().slice(0,300)||'')
     const alerts=[...document.querySelectorAll('[role="alert"]')].map(el=>el.textContent?.trim().slice(0,300)||'')
     const navLabels=[...document.querySelectorAll('.ugo-admin2-sidebar nav button')].map(el=>el.textContent?.trim().slice(0,100)||'')
     return {status,alerts,navLabels,hasSuperAdminButton:!!document.querySelector('[data-testid="admin-superadmin-nav"]')}
    })
    const diagnostics={viewport:vp.id,expectedRole:profile.tipo,...roleDiagnostic,error:String(error?.message||error)}
    await fs.writeFile('artifacts/admin-responsive-role-diagnostic.json',JSON.stringify(diagnostics,null,2)+'\n')
    throw new Error('SUPERADMIN_ROLE_UI_NOT_READY:'+JSON.stringify(diagnostics))
   }
   await superAdminButton.click()
   await page.waitForTimeout(180)
   await page.getByText('Control global de UGO',{exact:true}).waitFor({state:'visible',timeout:20000})
   await page.screenshot({path:`artifacts/admin-responsive-${vp.id}-superadmin.png`,fullPage:true})
   const tabNames=['Centro de control','Empresa Autónoma','Funcionalidades','Registro de auditoría','Integraciones','Métricas globales','Roles y permisos','Legal / Protección IP']
   for(const tab of tabNames){
    const b=page.locator('.ugo-superadmin > .ugo-admin2-submenu button').filter({hasText:tab}).first()
    await b.waitFor({state:'visible',timeout:20000})
    await b.click()
    await page.waitForTimeout(120)
    sections.push({section:'Super Admin / '+tab,metrics:await shellMetrics(page,vp.id+':'+tab)})
   }
  }
  await clickNav(page,'Inicio')
  await page.screenshot({path:`artifacts/admin-responsive-${vp.id}-home.png`,fullPage:true})
  const navProbe=await page.evaluate(()=>{
   const nav=document.querySelector('.ugo-admin2-sidebar nav')
   const submenu=document.querySelector('.ugo-admin2-submenu')
   const buttons=[...document.querySelectorAll('.ugo-admin2-sidebar nav button')].map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))
   return {nav:nav?{scrollWidth:nav.scrollWidth,clientWidth:nav.clientWidth}:null,submenu:submenu?{scrollWidth:submenu.scrollWidth,clientWidth:submenu.clientWidth}:null,buttons}
  })
  if(vp.width<=760)assert.ok(navProbe.buttons.every(b=>b.h>=40),vp.id+':PRIMARY_NAV_TOUCH_TARGET_TOO_SMALL')
  result.viewports.push({...vp,sections,nav_probe:navProbe,page_errors:errors,screenshots:[`admin-responsive-${vp.id}-home.png`,profile.tipo==='superadmin'?`admin-responsive-${vp.id}-superadmin.png`:null].filter(Boolean)})
  result.page_errors.push(...errors.map(error=>({viewport:vp.id,error})))
  await context.close()
 }
 assert.deepEqual(result.page_errors,[],'RESPONSIVE_BROWSER_PAGE_ERRORS')
 result.completed_at=new Date().toISOString()
 await fs.writeFile('artifacts/admin-responsive-runtime.json',JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,environment:'UGO TEST',viewports:result.viewports.map(v=>v.id)}))
}catch(error){
 await fs.writeFile('artifacts/admin-responsive-failure.txt',String(error?.stack||error)).catch(()=>{})
 throw error
}finally{
 await browser.close()
 await user.auth.signOut()
}
