import {test,expect} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'

const baseURL=process.env.RESPONSIVE_BASE_URL||'http://127.0.0.1:5173'
const artifactDir=process.env.RESPONSIVE_ARTIFACT_DIR||'artifacts/responsive'
mkdirSync(artifactDir,{recursive:true})

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

const surfaces=[
 {name:'landing',path:'/',root:'.ugo-landing',public:true},
 {name:'client-auth',path:'/?app=client',root:'.mvp-auth-page.role-client',public:true},
 {name:'provider-auth',path:'/?app=provider',root:'.mvp-auth-page.role-provider',public:true},
 {name:'admin-auth',path:'/?app=admin',root:'.mvp-auth-page',public:true},
 {name:'client-web-auth',path:'/?app=client-web',root:'.ugo-browser-role-shell',public:true},
 {name:'provider-web-auth',path:'/?app=provider-web',root:'.ugo-browser-role-shell',public:true},
 {name:'ugo-web',path:'/?app=web',root:'.ugo-web',public:true},
 {name:'ugo-client-web',path:'/?app=stitch-client',root:'.ugo-client-web',public:true},
 {name:'development',path:'/?app=development',root:'.devdash',public:true},
 {name:'demo',path:'/?app=demo',root:'.ugo-test-demo',public:true},
 {name:'recruit-invalid',path:'/?app=recruit',root:'.ugo-recruit',public:true},
]

const screenshotViewports=new Set(['390x844','844x390','1440x900'])
const report=[]

async function waitForSurface(page,surface){
 await page.goto(baseURL+surface.path,{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator(surface.root).first().waitFor({state:'visible',timeout:15000})
 await page.waitForTimeout(350)
}

async function metrics(page,rootSelector){
 return page.evaluate((selector)=>{
  const root=document.querySelector(selector)
  const html=document.documentElement
  const style=root?getComputedStyle(root):null
  const wide=[...document.querySelectorAll('*')].map(el=>{const r=el.getBoundingClientRect();return{el,r,cs:getComputedStyle(el)}}).filter(({r,cs})=>cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>1&&(r.left<-2||r.right>window.innerWidth+2||r.width>window.innerWidth+2)).sort((a,b)=>Math.max(b.r.right-window.innerWidth,-b.r.left,b.r.width-window.innerWidth)-Math.max(a.r.right-window.innerWidth,-a.r.left,a.r.width-window.innerWidth)).slice(0,12).map(({el,r})=>({tag:el.tagName,className:String(el.className||'').slice(0,120),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}))
  const fixed=[...document.querySelectorAll('*')].filter(el=>{
   const cs=getComputedStyle(el)
   if(!['fixed','sticky'].includes(cs.position))return false
   if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false
   const r=el.getBoundingClientRect()
   return r.width>1&&r.height>1&&(r.left<-2||r.right>window.innerWidth+2)
  }).slice(0,12).map(el=>{
   const r=el.getBoundingClientRect()
   return {tag:el.tagName,className:String(el.className||'').slice(0,120),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)}
  })
  return {
   innerWidth:window.innerWidth,
   innerHeight:window.innerHeight,
   docScrollWidth:html.scrollWidth,
   docClientWidth:html.clientWidth,
   rootExists:Boolean(root),
   rootClientWidth:root?.clientWidth??null,
   rootScrollWidth:root?.scrollWidth??null,
   rootClientHeight:root?.clientHeight??null,
   rootScrollHeight:root?.scrollHeight??null,
   overflowX:style?.overflowX??null,
   overflowY:style?.overflowY??null,
   fixedHorizontalEscapes:fixed,
   wideElements:wide,
  }
 },rootSelector)
}

async function screenshot(page,name,viewport){
 const file=join(artifactDir,`${name}--${viewport}.png`)
 await page.screenshot({path:file,fullPage:false,animations:'disabled'})
 return file
}

test.describe.configure({mode:'serial'})

for(const surface of surfaces){
 test(`responsive geometry · ${surface.name}`,async({page})=>{
  for(const viewport of viewports){
   await page.setViewportSize({width:viewport.width,height:viewport.height})
   await waitForSurface(page,surface)
   const m=await metrics(page,surface.root)
   const row={surface:surface.name,viewport:viewport.name,path:surface.path,...m}
   report.push(row)
   if((m.rootScrollWidth??0)>(m.rootClientWidth??0)+1||m.docScrollWidth>m.innerWidth+1){
    console.log('RESPONSIVE_OVERFLOW',JSON.stringify({surface:surface.name,viewport:viewport.name,doc:[m.docClientWidth,m.docScrollWidth],root:[m.rootClientWidth,m.rootScrollWidth],wideElements:m.wideElements}))
   }

   expect.soft(m.rootExists,`${surface.name} ${viewport.name}: root exists`).toBe(true)
   expect.soft(m.docScrollWidth,`${surface.name} ${viewport.name}: global horizontal overflow`).toBeLessThanOrEqual(m.innerWidth+1)
   if(m.rootClientWidth!=null&&m.rootScrollWidth!=null){
    expect.soft(m.rootScrollWidth,`${surface.name} ${viewport.name}: root horizontal overflow`).toBeLessThanOrEqual(m.rootClientWidth+1)
   }
   expect.soft(m.fixedHorizontalEscapes,`${surface.name} ${viewport.name}: visible fixed/sticky elements escape horizontally`).toEqual([])

   if(screenshotViewports.has(viewport.name))await screenshot(page,surface.name,viewport.name)
  }
 })
}

test('client/provider/admin auth interactions stay contained',async({page})=>{
 const cases=[
  {name:'client',path:'/?app=client',root:'.mvp-auth-page.role-client',email:'input[type="email"]'},
  {name:'provider',path:'/?app=provider',root:'.mvp-auth-page.role-provider',email:'input[type="email"]'},
  {name:'admin',path:'/?app=admin',root:'.mvp-auth-page',email:'input[placeholder="Usuario o email"]'},
 ]
 for(const item of cases){
  await page.setViewportSize({width:390,height:500})
  await waitForSurface(page,item)
  const input=page.locator(item.email).first()
  await input.focus()
  await input.scrollIntoViewIfNeeded()
  const box=await input.boundingBox()
  expect.soft(box,`${item.name}: focused input exists`).not.toBeNull()
  if(box){
   expect.soft(box.y,`${item.name}: focused input top visible`).toBeGreaterThanOrEqual(0)
   expect.soft(box.y+box.height,`${item.name}: focused input bottom visible`).toBeLessThanOrEqual(500)
  }
  const font=await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))
  expect.soft(font,`${item.name}: mobile input font avoids browser zoom`).toBeGreaterThanOrEqual(16)
  const m=await metrics(page,item.root)
  expect.soft(m.docScrollWidth,`${item.name}: keyboard-height horizontal overflow`).toBeLessThanOrEqual(m.innerWidth+1)
 }
})

test('client auth register and recovery states remain responsive',async({page})=>{
 await page.setViewportSize({width:320,height:568})
 await waitForSurface(page,{path:'/?app=client',root:'.mvp-auth-page.role-client'})
 await page.getByRole('tab',{name:'Crear cuenta'}).click()
 let m=await metrics(page,'.mvp-auth-page.role-client')
 expect.soft(m.docScrollWidth).toBeLessThanOrEqual(m.innerWidth+1)
 await page.getByRole('tab',{name:'Ingresar'}).click()
 await page.getByRole('button',{name:'¿Olvidaste tu contraseña?'}).click()
 await page.getByRole('button',{name:'Enviar enlace'}).waitFor()
 m=await metrics(page,'.mvp-auth-page.role-client')
 expect.soft(m.docScrollWidth).toBeLessThanOrEqual(m.innerWidth+1)
 await screenshot(page,'client-auth-recovery','320x568')
})

test('demo role switching and service progression stay contained',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await waitForSurface(page,{path:'/?app=demo',root:'.ugo-test-demo'})
 const request=page.locator('#demo-request')
 if(await request.isVisible()){
  await page.getByRole('button',{name:'Encontrar profesionales'}).click()
 }
 await page.getByRole('button',{name:'Proveedor'}).click()
 let m=await metrics(page,'.ugo-test-demo')
 expect.soft(m.docScrollWidth).toBeLessThanOrEqual(m.innerWidth+1)
 const accept=page.getByRole('button',{name:'Aceptar trabajo'})
 if(await accept.isVisible())await accept.click()
 await page.getByRole('button',{name:'Admin'}).click()
 m=await metrics(page,'.ugo-test-demo')
 expect.soft(m.docScrollWidth).toBeLessThanOrEqual(m.innerWidth+1)
 await screenshot(page,'demo-flow-admin','390x844')
})

test.afterAll(async()=>{
 writeFileSync(join(artifactDir,'responsive-metrics.json'),JSON.stringify({generatedAt:new Date().toISOString(),baseURL,viewports,surfaces,report},null,2))
})
