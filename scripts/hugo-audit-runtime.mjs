import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import operationsHandler from '../api/operations.ts'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const email=process.env.UGO_TEST_CLIENT_EMAIL||''
const password=process.env.UGO_TEST_CLIENT_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
const base=process.env.UGO_UI_BASE_URL||'http://127.0.0.1:4173'
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&email&&password&&sha,'UGO_TEST_RUNTIME_INPUTS_REQUIRED')
await fs.mkdir('artifacts',{recursive:true})

const timedFetch=(input,init={})=>fetch(input,{...init,signal:init.signal||AbortSignal.timeout(12000)})
const userSb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:timedFetch}})
const adminSb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:timedFetch}})
const {data:login,error:loginError}=await userSb.auth.signInWithPassword({email,password})
assert.ifError(loginError)
assert.ok(login.session,'CLIENT_SESSION_REQUIRED')
const session=login.session
const {data:categories,error:categoryError}=await userSb.from('categorias').select('id,nombre').limit(10)
assert.ifError(categoryError)
const category=(categories||[]).find(x=>x?.id)
assert.ok(category,'TEST_CATEGORY_REQUIRED')

function invokeAudit(reqBody,headers){
  return new Promise((resolve,reject)=>{
    let statusCode=200
    const res={
      setHeader(){},
      status(code){statusCode=code;return this},
      json(body){resolve({status:statusCode,body});return body},
      end(){resolve({status:statusCode,body:null})},
    }
    Promise.resolve(operationsHandler({method:'POST',headers,query:{op:'hugo-audit'},body:reqBody},res)).catch(reject)
  })
}

const browser=await chromium.launch({headless:true})
const result={readiness_id:'hugo-audit',sha,environment:'UGO TEST',production_touched:false,status:'RUNNING'}
let serviceId=''
try{
  const marker='READINESS-HUGO-AUDIT-'+sha.slice(0,12)
  const futureAt=new Date(Date.now()+48*60*60*1000).toISOString()
  const {data:fixture,error:fixtureError}=await adminSb.from('servicios').insert({
    cliente_id:session.user.id,
    categoria_id:category.id,
    estado:'buscando',
    descripcion:marker,
    direccion_cliente:'UGO TEST audit fixture',
    urgencia:false,
    programado_para:futureAt,
    metadata:{source:'readiness-hugo-audit',runtime_sha:sha,fixture:true},
  }).select('id,estado').single()
  assert.ifError(fixtureError)
  assert.ok(fixture?.id)
  serviceId=String(fixture.id)

  const context=await browser.newContext({viewport:{width:1280,height:900}})
  const page=await context.newPage()
  await page.addInitScript(({session})=>localStorage.setItem('ugo-test-client-auth',JSON.stringify(session)),{session})
  await page.route('**/api/operations**',async route=>{
    const request=route.request()
    const body=JSON.parse(request.postData()||'{}')
    const auth=request.headers()['authorization']||''
    const handled=await invokeAudit(body,{authorization:auth})
    await route.fulfill({status:handled.status,contentType:'application/json',body:JSON.stringify(handled.body)})
  })
  await page.goto(base+'/?app=client',{waitUntil:'domcontentloaded',timeout:20000})
  await page.locator('.ugo-client-root').waitFor({state:'visible',timeout:20000})
  await page.locator('.ugo-real-hugo').waitFor({state:'visible',timeout:20000})
  await page.waitForFunction(()=>Boolean(window.UGOVoiceBridge),null,{timeout:15000})
  await page.evaluate(()=>{
    window.__ugoToolResponses=[]
    const bridge=window.UGOVoiceBridge
    const original=bridge.sendToolResponse?.bind(bridge)
    bridge.sendToolResponse=(id,name,response)=>{
      window.__ugoToolResponses.push({id,name,response})
      try{return original?.(id,name,response)}catch{return undefined}
    }
  })
  const toolId='cancel_service-'+Date.now()
  await page.evaluate(({toolId,serviceId})=>window.dispatchEvent(new CustomEvent('ugo:native-voice-tool-call',{detail:{id:toolId,name:'cancel_service',args:{service_id:serviceId,confirmed:true}}})),{toolId,serviceId})
  await page.waitForFunction(id=>window.__ugoToolResponses?.some(x=>x.id===id),toolId,{timeout:20000})
  const response=await page.evaluate(id=>window.__ugoToolResponses.find(x=>x.id===id)?.response||null,toolId)
  assert.equal(response?.ok,true,'HUGO_ACTION_FAILED')
  assert.equal(response?.audit?.status,'PERSISTED','HUGO_AUDIT_NOT_PERSISTED')
  const correlationId=String(response?.correlation_id||'')
  assert.match(correlationId,/^[0-9a-f-]{36}$/i)

  const {data:after,error:afterError}=await adminSb.from('servicios').select('id,estado').eq('id',serviceId).single()
  assert.ifError(afterError)
  assert.notEqual(String(after.estado),'buscando','EFFECT_NOT_PERSISTED')

  const [{data:decisions,error:decisionError},{data:evidence,error:evidenceError},{data:auditRows,error:auditError}]=await Promise.all([
    adminSb.from('autonomous_decision_ledger').select('id,decision,authorization_result,correlation_id,evidence_refs').eq('correlation_id',correlationId),
    adminSb.from('autonomous_evidence_ledger').select('id,evidence_type,reference,metadata,correlation_id').eq('correlation_id',correlationId),
    adminSb.from('audit_log').select('id,evento,actor_id,entidad_id,detalles').filter('detalles->audit->>correlation_id','eq',correlationId),
  ])
  assert.ifError(decisionError)
  assert.ifError(evidenceError)
  assert.ifError(auditError)
  assert.equal(decisions?.length,1,'DECISION_LEDGER_MISSING')
  assert.equal(evidence?.length,1,'EVIDENCE_LEDGER_MISSING')
  assert.equal(auditRows?.length,1,'AUDIT_LOG_MISSING')
  assert.equal(decisions[0].authorization_result,'ALLOW')
  assert.equal(evidence[0].evidence_type,'hugo_action_trace')
  assert.equal(evidence[0].metadata?.action,'cancel_service')
  assert.equal(evidence[0].metadata?.authority?.decision,'ALLOW')
  assert.equal(evidence[0].metadata?.effect?.ok,true)
  assert.equal(evidence[0].metadata?.response?.ok,true)

  result.status='PASS'
  result.correlation_id=correlationId
  result.service_id=serviceId
  result.trace={
    intent:'voice_tool:cancel_service',
    authority:'ALLOW',
    action:'cancel_service',
    effect:{before:'buscando',after:String(after.estado)},
    audit:{decision_id:decisions[0].id,evidence_id:evidence[0].id,audit_log_id:auditRows[0].id},
    response:{ok:response.ok,message:response.message||'',audit_status:response.audit.status},
  }
  result.ledgers={decision:decisions[0],evidence:evidence[0],audit_log:auditRows[0]}
  await context.close()
}catch(error){
  result.status='FAIL'
  result.failure=error instanceof Error?error.message:String(error)
  throw error
}finally{
  if(serviceId)await adminSb.from('servicios').delete().eq('id',serviceId)
  result.completed_at=new Date().toISOString()
  await fs.writeFile('artifacts/hugo-audit-runtime.json',JSON.stringify(result,null,2)+'\n')
  await browser.close()
  await userSb.auth.signOut().catch(()=>{})
}
console.log(JSON.stringify({status:result.status,sha,correlation_id:result.correlation_id}))
