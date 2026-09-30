import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_PROVIDER_EMAIL||'',password=process.env.UGO_TEST_PROVIDER_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&email&&password&&sha,'UGO_TEST_PROVIDER_DEBT_INPUTS_REQUIRED')
const sb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let login=null,lastError=null
for(let attempt=1;attempt<=3;attempt+=1){
 login=await sb.auth.signInWithPassword({email,password})
 if(!login.error)break
 lastError=login.error
 const status=Number(login.error?.status||0)
 if(!(status>=500||login.error?.name==='AuthRetryableFetchError')||attempt===3)throw login.error
 await sleep(attempt*1000)
}
assert.ok(login?.data?.session,'PROVIDER_SESSION_REQUIRED')
try{
 const{data,error}=await sb.rpc('estado_deuda_ugo_proveedor')
 assert.ifError(error)
 assert.ok(Array.isArray(data)&&data.length===1,'DEBT_STATE_REQUIRED')
 const row=data[0]
 assert.equal(Number(row.limite),3,'DEBT_LIMIT_MUST_BE_3')
 assert.equal(Boolean(row.bloqueado),Number(row.servicios_pendientes)>=3,'BLOCK_FLAG_MUST_MATCH_COUNT')
 await fs.mkdir('artifacts',{recursive:true})
 const result={task:'provider-debt-runtime',sha,environment:'UGO TEST',servicios_pendientes:Number(row.servicios_pendientes),saldo_pendiente:Number(row.saldo_pendiente),limite:Number(row.limite),bloqueado:Boolean(row.bloqueado),read_only:true,completed_at:new Date().toISOString()}
 await fs.writeFile('artifacts/provider-debt-runtime.json',JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify(result))
}finally{await sb.auth.signOut()}
