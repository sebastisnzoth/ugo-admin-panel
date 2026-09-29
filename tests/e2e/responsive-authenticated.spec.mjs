import {test,expect} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'

const baseURL=process.env.RESPONSIVE_BASE_URL||'http://127.0.0.1:5173'
const artifactDir=process.env.RESPONSIVE_AUTH_ARTIFACT_DIR||'artifacts/responsive-authenticated'
mkdirSync(artifactDir,{recursive:true})

const creds={
  client:{email:process.env.UGO_TEST_CLIENT_EMAIL||'',password:process.env.UGO_TEST_CLIENT_PASSWORD||''},
  provider:{email:process.env.UGO_TEST_PROVIDER_EMAIL||'',password:process.env.UGO_TEST_PROVIDER_PASSWORD||''},
  admin:{email:process.env.UGO_TEST_ADMIN_EMAIL||'',password:process.env.UGO_TEST_ADMIN_PASSWORD||''},
  superadmin:{email:process.env.UGO_TEST_SUPERADMIN_EMAIL||'',password:process.env.UGO_TEST_SUPERADMIN_PASSWORD||''},
}

const viewports=[
 {name:'320x568',width:320,height:568},
 {name:'360x800',width:360,height:800},
 {name:'390x844',width:390,height:844},
 {name:'400x671',width:400,height:671},
 {name:'412x915',width:412,height:915},
 {name:'768x1024',width:768,height:1024},
 {name:'820x1180',width:820,height:1180},
 {name:'1024x768',width:1024,height:768},
 {name:'1280x800',width:1280,height:800},
 {name:'1440x900',width:1440,height:900},
 {name:'1920x1080',width:1920,height:1080},
 {name:'844x390',width:844,height:390},
 {name:'915x412',width:915,height:412},
]

const report={
  generatedAt:null,
  credentialAvailability:Object.fromEntries(Object.entries(creds).map(([role,value])=>[role,{email:Boolean(value.email),password:Boolean(value.password)}])),
  roles:{client:{status:'not_run',screens:[]},provider:{status:'not_run',screens:[]},admin:{status:'not_run',screens:[]},superadmin:{status:'not_run',screens:[]}},
}

const safeName=value=>String(value).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'')

async function screenshot(page,name){
  const file=join(artifactDir,`${safeName(name)}.png`)
  await page.screenshot({path:file,fullPage:false,animations:'disabled'})
  return file
}

async function geometry(page,rootSelector){
 return page.evaluate((selector)=>{
  const root=document.querySelector(selector)
  const html=document.documentElement
  const style=root?getComputedStyle(root):null
  const escaping=[...document.querySelectorAll('*')].flatMap(el=>{
    const cs=getComputedStyle(el)
    if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return[]
    const r=el.getBoundingClientRect()
    if(r.width<=1||r.height<=1)return[]
    const escaped=r.left<-2||r.right>window.innerWidth+2||r.width>window.innerWidth+2
    if(!escaped)return[]
    const parent=el.parentElement
    const pcs=parent?getComputedStyle(parent):null
    const intentionallyContained=Boolean(parent&&pcs&&['auto','scroll'].includes(pcs.overflowX)&&parent.scrollWidth>parent.clientWidth)
    if(intentionallyContained)return[]
    return[{tag:el.tagName,className:String(el.className||'').slice(0,120),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}]
  }).slice(0,12)
  return{
    innerWidth:window.innerWidth,
    innerHeight:window.innerHeight,
    docClientWidth:html.clientWidth,
    docScrollWidth:html.scrollWidth,
    rootExists:Boolean(root),
    rootClientWidth:root?.clientWidth??null,
    rootScrollWidth:root?.scrollWidth??null,
    rootClientHeight:root?.clientHeight??null,
    rootScrollHeight:root?.scrollHeight??null,
    overflowX:style?.overflowX??null,
    overflowY:style?.overflowY??null,
    escaping,
  }
 },rootSelector)
}

function assertGeometry(m,label){
 expect.soft(m.rootExists,`${label}: root exists`).toBe(true)
 expect.soft(m.docScrollWidth,`${label}: no document horizontal overflow`).toBeLessThanOrEqual(m.innerWidth+1)
 if(m.rootClientWidth!=null&&m.rootScrollWidth!=null)expect.soft(m.rootScrollWidth,`${label}: no root horizontal overflow`).toBeLessThanOrEqual(m.rootClientWidth+1)
 expect.soft(m.escaping,`${label}: no visible escaping elements`).toEqual([])
}

async function loginClient(page){
 await page.goto(baseURL+'/?app=client',{waitUntil:'domcontentloaded',timeout:30000})
 await page.getByPlaceholder('tu@email.com').fill(creds.client.email)
 await page.getByPlaceholder('Mínimo 6 caracteres').fill(creds.client.password)
 await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 await page.locator('.ugo-client-root,.ugo-client-onboarding,.mvp-form-error').first().waitFor({state:'visible',timeout:20000})
 const error=page.locator('.mvp-form-error')
 if(await error.isVisible())throw new Error('Client TEST login failed: '+await error.innerText())
 return await page.locator('.ugo-client-root').isVisible()?'.ugo-client-root':'.ugo-client-onboarding'
}

async function loginProvider(page){
 await page.goto(baseURL+'/?app=provider',{waitUntil:'domcontentloaded',timeout:30000})
 await page.getByPlaceholder('tu@email.com').fill(creds.provider.email)
 await page.getByPlaceholder('Mínimo 6 caracteres').fill(creds.provider.password)
 await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 await page.locator('.ugo-provider-root,.ugo-provider-onboarding,.mvp-form-error').first().waitFor({state:'visible',timeout:20000})
 const error=page.locator('.mvp-form-error')
 if(await error.isVisible())throw new Error('Provider TEST login failed: '+await error.innerText())
 return await page.locator('.ugo-provider-root').isVisible()?'.ugo-provider-root':'.ugo-provider-onboarding'
}

async function loginAdmin(page,credential=creds.admin,label='Admin'){
 await page.goto(baseURL+'/?app=admin',{waitUntil:'domcontentloaded',timeout:30000})
 await page.getByPlaceholder('Usuario o email').fill(credential.email)
 await page.getByPlaceholder('Contraseña').fill(credential.password)
 await page.getByRole('button',{name:'Ingresar'}).click()
 await page.locator('.ugo-admin2,.mvp-error').first().waitFor({state:'visible',timeout:20000})
 const error=page.locator('.mvp-error')
 if(await error.isVisible())throw new Error(label+' TEST login failed: '+await error.innerText())
 return '.ugo-admin2'
}

async function viewportSweep(page,role,rootSelector){
 const rows=[]
 for(const vp of viewports){
  await page.setViewportSize({width:vp.width,height:vp.height})
  await page.waitForTimeout(200)
  const m=await geometry(page,rootSelector)
  assertGeometry(m,`${role} ${vp.name}`)
  rows.push({viewport:vp.name,...m})
  if(['390x844','844x390','1440x900'].includes(vp.name))await screenshot(page,`${role}-root-${vp.name}`)
 }
 return rows
}

async function safeClickAndCapture(page,{role,name,locator,rootSelector}){
 const node=locator()
 if(!(await node.count())||!(await node.first().isVisible()))return{screen:name,status:'not_available'}
 await node.first().click()
 await page.waitForTimeout(350)
 const m=await geometry(page,rootSelector)
 assertGeometry(m,`${role} ${name}`)
 await screenshot(page,`${role}-${name}-390x844`)
 return{screen:name,status:'pass',geometry:m}
}

test.describe.configure({mode:'serial'})

test('authenticated client responsive audit',async({page})=>{
 test.skip(!(creds.client.email&&creds.client.password),'Missing UGO_TEST_CLIENT_EMAIL or UGO_TEST_CLIENT_PASSWORD')
 report.roles.client.status='running'
 await page.setViewportSize({width:390,height:844})
 const root=await loginClient(page)
 if(root==='.ugo-client-onboarding'){
   const m=await geometry(page,root);assertGeometry(m,'client onboarding')
   await screenshot(page,'client-onboarding-390x844')
   report.roles.client={status:'authenticated_but_onboarding_blocks_app',screens:[{screen:'onboarding',status:'pass',geometry:m}]}
   return
 }
 report.roles.client.screens.push({screen:'home',status:'pass',sweep:await viewportSweep(page,'client',root)})
 await page.setViewportSize({width:390,height:844})
 const nav=[
  {name:'activity',locator:()=>page.locator('.ugo-home-mobile-nav button').filter({hasText:'Actividad'})},
  {name:'profile',locator:()=>page.locator('.ugo-home-mobile-nav button').filter({hasText:'Perfil'})},
 ]
 for(const item of nav){
   await page.goto(baseURL+'/?app=client',{waitUntil:'domcontentloaded'})
   await page.locator(root).waitFor({state:'visible',timeout:15000})
   report.roles.client.screens.push(await safeClickAndCapture(page,{role:'client',name:item.name,locator:item.locator,rootSelector:root}))
 }
 await page.goto(baseURL+'/?app=client',{waitUntil:'domcontentloaded'})
 await page.locator(root).waitFor({state:'visible',timeout:15000})
 const search=page.getByLabel('Buscar servicio')
 if(await search.isVisible()){
   await page.setViewportSize({width:390,height:500})
   await search.focus();await search.scrollIntoViewIfNeeded()
   const box=await search.boundingBox()
   const font=await search.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))
   expect.soft(box?.y??-1,'client search top visible').toBeGreaterThanOrEqual(0)
   expect.soft((box?.y??0)+(box?.height??0),'client search bottom visible').toBeLessThanOrEqual(501)
   expect.soft(font,'client search font avoids mobile zoom').toBeGreaterThanOrEqual(16)
 }
 report.roles.client.status='pass_available_states'
})

test('authenticated provider responsive audit',async({page})=>{
 test.skip(!(creds.provider.email&&creds.provider.password),'Missing UGO_TEST_PROVIDER_EMAIL or UGO_TEST_PROVIDER_PASSWORD')
 report.roles.provider.status='running'
 await page.setViewportSize({width:390,height:844})
 const root=await loginProvider(page)
 if(root==='.ugo-provider-onboarding'){
   const m=await geometry(page,root);assertGeometry(m,'provider onboarding')
   await screenshot(page,'provider-onboarding-390x844')
   report.roles.provider={status:'authenticated_but_onboarding_blocks_app',screens:[{screen:'onboarding',status:'pass',geometry:m}]}
   return
 }
 report.roles.provider.screens.push({screen:'home',status:'pass',sweep:await viewportSweep(page,'provider',root)})
 await page.setViewportSize({width:390,height:844})
 const nav=[
  {name:'orders',text:'Pedidos'},
  {name:'work',text:'Trabajo'},
  {name:'profile',text:'Perfil'},
 ]
 for(const item of nav){
   await page.goto(baseURL+'/?app=provider',{waitUntil:'domcontentloaded'})
   await page.locator(root).waitFor({state:'visible',timeout:15000})
   report.roles.provider.screens.push(await safeClickAndCapture(page,{role:'provider',name:item.name,locator:()=>page.locator('.provider-bottom-nav button').filter({hasText:item.text}),rootSelector:root}))
 }
 report.roles.provider.status='pass_available_states'
})

test('authenticated admin and superadmin responsive audit',async({page})=>{
 test.skip(!(creds.admin.email&&creds.admin.password),'Missing UGO_TEST_ADMIN_EMAIL or UGO_TEST_ADMIN_PASSWORD')
 report.roles.admin.status='running'
 await page.setViewportSize({width:390,height:844})
 const root=await loginAdmin(page)
 report.roles.admin.screens.push({screen:'home',status:'pass',sweep:await viewportSweep(page,'admin',root)})
 await page.setViewportSize({width:390,height:844})
 const labels=['Inicio','Operaciones','Personas','Finanzas','Configuración']
 for(const label of labels){
   await page.goto(baseURL+'/?app=admin',{waitUntil:'domcontentloaded'})
   await page.locator(root).waitFor({state:'visible',timeout:15000})
   const button=page.locator('.ugo-admin2-sidebar button').filter({hasText:label})
   report.roles.admin.screens.push(await safeClickAndCapture(page,{role:'admin',name:label,locator:()=>button,rootSelector:root}))
 }
 report.roles.admin.status='pass_available_states'
})

test('authenticated superadmin responsive audit',async({page})=>{
 test.skip(!(creds.superadmin.email&&creds.superadmin.password),'Missing UGO_TEST_SUPERADMIN_EMAIL or UGO_TEST_SUPERADMIN_PASSWORD')
 report.roles.superadmin.status='running'
 await page.setViewportSize({width:390,height:844})
 const root=await loginAdmin(page,creds.superadmin,'Super Admin')
 report.roles.superadmin.screens.push({screen:'home',status:'pass',sweep:await viewportSweep(page,'superadmin',root)})
 await page.setViewportSize({width:390,height:844})
 const labels=['Inicio','Operaciones','Personas','Finanzas','Configuración']
 for(const label of labels){
   await page.goto(baseURL+'/?app=admin',{waitUntil:'domcontentloaded'})
   await page.locator(root).waitFor({state:'visible',timeout:15000})
   const button=page.locator('.ugo-admin2-sidebar button').filter({hasText:label})
   report.roles.superadmin.screens.push(await safeClickAndCapture(page,{role:'superadmin',name:label,locator:()=>button,rootSelector:root}))
 }
 report.roles.superadmin.status='pass_available_states'
})

test.afterAll(async()=>{
 report.generatedAt=new Date().toISOString()
 writeFileSync(join(artifactDir,'authenticated-responsive-summary.json'),JSON.stringify(report,null,2))
})
