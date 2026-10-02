import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{chromium}from'playwright'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_PROVIDER_EMAIL||''
const password=process.env.UGO_TEST_PROVIDER_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&sha,'UGO_TEST_PROVIDER_UI_INPUTS_REQUIRED')

const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let data=null,lastError=null
for(let attempt=1;attempt<=3;attempt+=1){
 const login=await sb.auth.signInWithPassword({email,password})
 if(!login.error){data=login.data;break}
 lastError=login.error
 const status=Number(login.error?.status||0)
 if(!(status>=500||login.error?.name==='AuthRetryableFetchError')||attempt===3)break
 await sleep(attempt*1000)
}
if(!data?.session)throw lastError||new Error('PROVIDER_SESSION_REQUIRED')

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const results=[]

async function assertResponsive(page,label){
 const m=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bsw:document.body.scrollWidth,bcw:document.body.clientWidth}))
 assert.ok(m.sw<=m.cw+4,label+' document overflow '+JSON.stringify(m))
 assert.ok(m.bsw<=m.bcw+4,label+' body overflow '+JSON.stringify(m))
}
async function visibleBox(locator){
 if(!(await locator.count())||!(await locator.first().isVisible().catch(()=>false)))return null
 return locator.first().boundingBox()
}
function overlaps(a,b){
 if(!a||!b)return false
 return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y
}
async function openProvider(viewport){
 const page=await browser.newPage({viewport})
 const errors=[]
 page.on('pageerror',e=>errors.push(String(e?.message||e)))
 await page.addInitScript(session=>localStorage.setItem('ugo-test-provider-auth',JSON.stringify(session)),data.session)
 await page.goto(base+'/?app=provider',{waitUntil:'domcontentloaded'})
 await page.locator('.ugo-provider-root').waitFor({state:'visible',timeout:20000})
 return{page,errors}
}
async function runViewport(name,viewport){
 const{page,errors}=await openProvider(viewport)
 try{
  await assertResponsive(page,'provider '+name+' home')
  const sidebar=page.locator('.provider-studio-sidebar')
  const bottom=page.getByRole('navigation',{name:'Navegación proveedor'})
  const dock=page.locator('.provider-operational-dock')
  if(viewport.width>=1000){
   assert.equal(await sidebar.isVisible(),true,'desktop sidebar must be visible')
   assert.equal(await bottom.isVisible().catch(()=>false),false,'desktop bottom nav must be hidden')
   const primary=page.getByRole('navigation',{name:'Navegación principal'})
   await primary.waitFor({state:'visible',timeout:10000})
   for(const item of [/Inicio/i,/Trabajos/i,/Calendario/i,/Ganancias/i,/Historial/i,/Perfil/i]){
    const button=primary.getByRole('button',{name:item}).first()
    await button.waitFor({state:'visible',timeout:10000})
    await button.click()
    await page.waitForTimeout(120)
    await assertResponsive(page,'provider '+name+' '+String(item))
   }
  }else{
   assert.equal(await sidebar.isVisible().catch(()=>false),false,'mobile/tablet sidebar must be hidden')
   assert.equal(await bottom.isVisible(),true,'mobile/tablet bottom nav must be visible')
   for(const item of [/Inicio proveedor/i,/^Pedidos/i,/Trabajo|Agenda/i,/Perfil proveedor/i]){
    const button=bottom.getByRole('button',{name:item}).first()
    await button.waitFor({state:'visible',timeout:10000})
    await button.click()
    await page.waitForTimeout(120)
    await assertResponsive(page,'provider '+name+' '+String(item))
   }
  }
  assert.equal(await dock.isVisible().catch(()=>false),false,name+' duplicate operational dock must be hidden')

  const notification=await visibleBox(page.locator('.ugo-notification-trigger'))
  const location=await visibleBox(page.locator('.ugo-location-control.role-provider'))
  assert.equal(overlaps(notification,location),false,name+' GPS overlaps notifications')
  const hugo=await visibleBox(page.locator('.provider-global-hugo .ugo-real-orb'))
  const dispute=await visibleBox(page.locator('.ugo-dispute-launch'))
  assert.equal(overlaps(hugo,dispute),false,name+' Hugo overlaps dispute launcher')

  await page.screenshot({path:'artifacts/provider-ui-'+name+'.png',fullPage:true})
  assert.deepEqual(errors,[],'provider page errors: '+errors.join(' | '))
  results.push({viewport:name,status:'PASS',navigation:viewport.width>=1000?'studio-sidebar':'bottom-nav',operational_dock:false,no_control_overlap:true})
 }finally{await page.close()}
}
try{
 await runViewport('desktop',{width:1440,height:1000})
 await runViewport('tablet',{width:820,height:1180})
 await runViewport('mobile',{width:390,height:844})
 await fs.writeFile('artifacts/provider-ui-runtime.json',JSON.stringify({task:'provider-ui-runtime',sha,environment:'UGO TEST',results,page_errors:0,completed_at:new Date().toISOString()},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,results}))
}finally{
 await browser.close()
 await sb.auth.signOut()
}
