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
const userId=login.data.user.id

try{
 const[{data:debts,error:debtError},{data:profile,error:profileError}]=await Promise.all([
  sb.from('deudas_ugo_proveedor').select('id,saldo_pendiente,estado,ambiente,servicio_id').eq('proveedor_id',userId),
  sb.from('perfiles_proveedor').select('online,disponible').eq('usuario_id',userId).single(),
 ])
 assert.ifError(debtError)
 assert.ifError(profileError)

 const unresolved=(debts||[]).filter(d=>
  d.ambiente==='real'
  && !['pagado','anulado'].includes(String(d.estado))
  && Number(d.saldo_pendiente)>0
 )
 const blocked=unresolved.length>=3
 if(blocked){
  assert.equal(Boolean(profile.online),false,'DEBT_BLOCK_MUST_FORCE_OFFLINE')
  assert.equal(Boolean(profile.disponible),false,'DEBT_BLOCK_MUST_FORCE_UNAVAILABLE')
 }

 const saldo=unresolved.reduce((sum,d)=>sum+Number(d.saldo_pendiente||0),0)
 await fs.mkdir('artifacts',{recursive:true})
 const result={
  task:'provider-debt-runtime',
  sha,
  environment:'UGO TEST',
  provider_id:userId,
  servicios_pendientes:unresolved.length,
  saldo_pendiente:Number(saldo.toFixed(2)),
  limite:3,
  bloqueado:blocked,
  provider_online:Boolean(profile.online),
  provider_disponible:Boolean(profile.disponible),
  source:'deudas_ugo_proveedor RLS',
  removed_public_status_rpc_not_required:true,
  read_only:true,
  completed_at:new Date().toISOString(),
 }
 await fs.writeFile('artifacts/provider-debt-runtime.json',JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify(result))
}finally{
 await sb.auth.signOut()
}
