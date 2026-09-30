import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'

const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.ok(sha,'UGO_RUNTIME_SHA_REQUIRED')
await fs.mkdir('artifacts',{recursive:true})
const result={control:'cross-errors',surface:'ui',sha,environment:'LOCAL_UGO_TEST',production_touched:false,status:'FAIL'}
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:390,height:844}})
 await page.route('**/auth/v1/token?grant_type=password',async route=>{
   await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error_code:'invalid_credentials',msg:'Credenciales incorrectas.'})})
 })
 await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded',timeout:15000})
 await page.getByRole('textbox',{name:/Email/i}).fill('fault-injection@ugo.test')
 await page.getByLabel('Contraseña').fill('incorrecta')
 await page.getByRole('button',{name:'Ingresar a UGO'}).click()
 const alert=page.getByRole('alert')
 await alert.waitFor({state:'visible',timeout:8000})
 const message=(await alert.textContent()||'').trim()
 assert.match(message,/credenciales|invalid/i,'UI must communicate cause')
 assert.match(message,/volvé a intentar|volver a intentar|reintentar/i,'UI must communicate next step')
 assert.match(message,/olvidaste tu contraseña/i,'UI must offer recovery path')
 result.status='PASS'
 result.fault='AUTH_INVALID_CREDENTIALS'
 result.message=message
 result.assertions=['cause-visible','next-step-visible','recovery-path-visible']
 result.completed_at=new Date().toISOString()
 await fs.writeFile('artifacts/cross-errors-ui-runtime.json',JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify(result))
}catch(error){
 result.failure=error instanceof Error?error.message:String(error)
 result.completed_at=new Date().toISOString()
 await fs.writeFile('artifacts/cross-errors-ui-runtime.json',JSON.stringify(result,null,2)+'\n')
 throw error
}finally{await browser.close()}
