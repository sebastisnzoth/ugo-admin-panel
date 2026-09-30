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
  if(name==='desktop'){
   const primary=page.getByRole('navigation',{name:'Navegación principal'})
   await primary.waitFor({state:'visible',timeout:10000})
   for(const item of ['Inicio','Trabajos','Calendario','Ganancias','Historial','Perfil'])await primary.getByRole('button',{name:new RegExp(item,'i')}).first().waitFor({state:'visible',timeout:10000})
  }else{
   const bottom=page.getByRole('navigation',{name:'Navegación proveedor'})
   await bottom.waitFor({state:'visible',timeout:10000})
   for(const item of ['Inicio','Pedidos','Trabajo','Perfil'])await bottom.getByRole('button',{name:new RegExp(item,'i')}).first().waitFor({state:'visible',timeout:10000})
  }
  const dock=page.getByRole('region',{name:'Estado operativo del proveedor'}).or(page.locator('.provider-operational-dock')).first()
  await dock.waitFor({state:'visible',timeout:10000})
  assert.ok(await dock.getByRole('button',{name:/Online|Offline/i}).count(),'online toggle missing')
  assert.ok(await dock.getByRole('button',{name:/Trabajo/i}).count(),'work status missing')
  assert.ok(await dock.getByRole('button',{name:/Pedidos/i}).count(),'demand status missing')
  await page.screenshot({path:'artifacts/provider-ui-'+name+'.png',fullPage:true})
  assert.deepEqual(errors,[],'provider page errors: '+errors.join(' | '))
  results.push({viewport:name,status:'PASS',navigation:name==='desktop'?'studio-sidebar':'bottom-nav',operational_dock:true})
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
