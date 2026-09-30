// readiness rerun after shared build repair
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {chromium} from 'playwright'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||''
const password=process.env.UGO_TEST_CLIENT_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&sha,'UGO_TEST_CLIENT_CAMERA_INPUTS_REQUIRED')

const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:login,error:loginError}=await auth.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session&&login.user,'UGO_TEST_CLIENT_SESSION_REQUIRED')
const {data:categories,error:categoriesError}=await auth.from('categorias').select('id,nombre,slug').eq('activa',true).order('nombre')
assert.ifError(categoriesError)
assert.ok(categories?.length,'UGO TEST active category required')
const category=categories[0]

await fs.mkdir('artifacts',{recursive:true})
const browser=await chromium.launch({headless:true})
const context=await browser.newContext({viewport:{width:390,height:844}})
const page=await context.newPage()
const pageErrors=[]
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)))
await page.addInitScript(session=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),login.session)

let draftId=''
let row=null
let bytes=0
let cleanup={attempted:false,row_deleted:false,storage_deleted:false}

try{
 await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded'})
 await page.getByRole('main',{name:'Inicio UGO Cliente'}).waitFor({state:'visible',timeout:20000})
 const showAll=page.getByRole('button',{name:/Ver todas/}).first()
 await showAll.click()
 const categoryButton=page.locator('.ugo-home-all-results button').filter({hasText:String(category.nombre)}).first()
 await categoryButton.waitFor({state:'visible',timeout:15000})
 await categoryButton.click()
 await page.getByRole('main',{name:'Qué hay que hacer'}).waitFor({state:'visible',timeout:15000})

 draftId=await page.evaluate(uid=>sessionStorage.getItem('ugo:guided-request:'+uid)||'',login.user.id)
 assert.ok(draftId,'camera runtime draft id required')
 const fileInput=page.locator('.ugo-request-evidence-upload input[type=file]').first()
 await fileInput.waitFor({state:'attached',timeout:10000})

 await fileInput.setInputFiles([])
 await page.waitForTimeout(300)
 let {data:cancelledRows,error:cancelledError}=await auth.from('evidencias_solicitud').select('id').eq('cliente_id',login.user.id).eq('draft_id',draftId).is('servicio_id',null)
 assert.ifError(cancelledError)
 assert.equal(cancelledRows?.length||0,0,'cancelled picker must not persist evidence')

 await page.evaluate(()=>{
   if(!navigator.mediaDevices)Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{}})
   Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{throw new DOMException('denied','NotAllowedError')}})
 })
 await page.getByRole('button',{name:/Sacar foto/}).click()
 const permissionAlert=page.getByRole('alert')
 await permissionAlert.waitFor({state:'visible',timeout:10000})
 assert.match(await permissionAlert.innerText(),/Permiso de cámara bloqueado|cámara/i)

 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl7nZkAAAAASUVORK5CYII=','base64')
 await fileInput.setInputFiles({name:'ugo-readiness-camera.png',mimeType:'image/png',buffer:png})
 await page.locator('.ugo-request-evidence-grid figure').first().waitFor({state:'visible',timeout:20000})
 await page.waitForFunction(()=>document.querySelectorAll('.ugo-request-evidence-grid figure').length===1,null,{timeout:15000})

 const {data:rows,error:rowError}=await auth.from('evidencias_solicitud')
   .select('id,cliente_id,draft_id,servicio_id,storage_path,descripcion,metadata,created_at')
   .eq('cliente_id',login.user.id).eq('draft_id',draftId).is('servicio_id',null)
   .order('created_at',{ascending:false}).limit(2)
 assert.ifError(rowError)
 assert.equal(rows?.length,1,'exactly one uploaded request evidence row required')
 row=rows[0]
 assert.ok(row.storage_path,'storage path required')
 assert.equal(row.metadata?.request_draft_id,draftId)
 assert.equal(row.metadata?.mime,'image/png')
 const {data:fileBlob,error:downloadError}=await auth.storage.from('request-evidence').download(row.storage_path)
 assert.ifError(downloadError)
 bytes=fileBlob?.size||0
 assert.ok(bytes>0,'persisted storage bytes required')
 assert.deepEqual(pageErrors,[],'runtime page errors detected')

 await page.screenshot({path:'artifacts/client-camera-runtime.png',fullPage:true})
 const evidence={
  readiness_id:'client-camera',
  task_id:'readiness-client-camera',
  job_id:'UGO-READINESS-CLIENT-CAMERA',
  environment:'UGO TEST',
  sha,
  draft_id:draftId,
  evidence_id:row.id,
  storage_path:row.storage_path,
  storage_bytes:bytes,
  assertions:{
   picker_cancelled_without_persistence:true,
   camera_permission_error_visible:true,
   file_upload_via_ui:true,
   db_row_persisted:true,
   storage_bytes_persisted:true,
   request_draft_correlated:true,
   no_page_errors:true
  },
  hardware_final_required:true,
  result:'PASS',
  page_errors:pageErrors,
  completed_at:new Date().toISOString()
 }
 await fs.writeFile('artifacts/client-camera-runtime.json',JSON.stringify(evidence,null,2)+'\n')

 cleanup.attempted=true
 await page.getByRole('button',{name:'Quitar'}).first().click()
 await page.waitForFunction(()=>document.querySelectorAll('.ugo-request-evidence-grid figure').length===0,null,{timeout:15000})
 const {data:afterRows,error:afterError}=await auth.from('evidencias_solicitud').select('id').eq('id',row.id)
 assert.ifError(afterError)
 cleanup.row_deleted=(afterRows?.length||0)===0
 const {data:afterBlob,error:afterBlobError}=await auth.storage.from('request-evidence').download(row.storage_path)
 cleanup.storage_deleted=Boolean(afterBlobError)&&!afterBlob
 await fs.writeFile('artifacts/client-camera-cleanup.json',JSON.stringify({draft_id:draftId,evidence_id:row.id,...cleanup,at:new Date().toISOString()},null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',sha,draftId,evidenceId:row.id,bytes,cleanup}))
}finally{
 await context.close()
 await browser.close()
 await auth.auth.signOut()
}
