import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const TEST_URL='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const adminEmail=process.env.UGO_TEST_ADMIN_EMAIL||''
const adminPassword=process.env.UGO_TEST_ADMIN_PASSWORD||''
const clientEmail=process.env.UGO_TEST_CLIENT_EMAIL||''
const clientPassword=process.env.UGO_TEST_CLIENT_PASSWORD||''
const providerEmail=process.env.UGO_TEST_PROVIDER_EMAIL||''
const providerPassword=process.env.UGO_TEST_PROVIDER_PASSWORD||''
const sha=process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||''
assert.equal(url,TEST_URL,'UGO_TEST_ONLY')
assert.ok(anon&&serviceKey&&adminEmail&&adminPassword&&clientEmail&&clientPassword&&providerEmail&&providerPassword&&sha,'UGO_EMPRESAS_TEST_INPUTS_REQUIRED')

const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
async function login(email,password){
  const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await db.auth.signInWithPassword({email,password})
  if(error||!data.user||!data.session)throw error||new Error('UGO_EMPRESAS_LOGIN_FAILED')
  return {db,id:data.user.id}
}

const superadmin=await login(adminEmail,adminPassword)
const client=await login(clientEmail,clientPassword)
const provider=await login(providerEmail,providerPassword)
const correlation='ugo-empresas-'+sha.slice(0,12)
const companyRef='TEST-'+correlation
let demandId=null

try{
  const {data:saProfile,error:saProfileError}=await service.from('usuarios').select('tipo,activo').eq('id',superadmin.id).single()
  assert.ifError(saProfileError);assert.equal(saProfile?.tipo,'superadmin');assert.equal(saProfile?.activo,true)

  for(const actor of [client,provider]){
    const {data,error}=await actor.db.from('ugo_empresas_readiness').select('product_key').eq('product_key','UGO_EMPRESAS')
    assert.ifError(error);assert.equal((data||[]).length,0,'NON_SUPERADMIN_MUST_NOT_SEE_EMPRESAS_READINESS')
  }

  const deniedInsert=await superadmin.db.from('ugo_empresas_demands').insert({company_ref:companyRef,skill:'electricista',quantity:1,place:'UGO TEST',starts_at:new Date(Date.now()+3600000).toISOString(),duration_minutes:60,status:'DRAFT'}).select('id')
  assert.ok(deniedInsert.error,'SUPERADMIN_DIRECT_MUTATION_MUST_BE_DENIED')

  const previous=await service.from('ugo_empresas_demands').select('id').eq('company_ref',companyRef)
  if(previous.error)throw previous.error
  for(const row of previous.data||[])await service.from('ugo_empresas_demands').delete().eq('id',row.id)

  const startsAt=new Date(Date.now()+7200000).toISOString()
  const {data:demand,error:demandError}=await service.from('ugo_empresas_demands').insert({
    company_ref:companyRef,skill:'electricista',quantity:3,place:'UGO TEST · Florianópolis',
    starts_at:startsAt,duration_minutes:120,requirements:{runtime:true,correlation_id:correlation,sha},status:'DRAFT'
  }).select('*').single()
  if(demandError)throw demandError
  demandId=demand.id

  const slotRows=Array.from({length:demand.quantity},(_,i)=>({demand_id:demand.id,slot_index:i+1,status:'OPEN'}))
  const {data:slotsCreated,error:slotsError}=await service.from('ugo_empresas_slots').insert(slotRows).select('*')
  if(slotsError)throw slotsError
  assert.equal(slotsCreated?.length,3)

  const {error:matchDemandError}=await service.from('ugo_empresas_demands').update({status:'MATCHED'}).eq('id',demand.id)
  if(matchDemandError)throw matchDemandError
  for(const slot of slotsCreated||[]){
    const {error}=await service.from('ugo_empresas_slots').update({provider_id:provider.id,backup_provider_id:provider.id,status:'MATCHED'}).eq('id',slot.id)
    if(error)throw error
  }
  const now=new Date().toISOString()
  const {error:reconfirmError}=await service.from('ugo_empresas_slots').update({status:'RECONFIRMED',reconfirmed_at:now}).eq('demand_id',demand.id)
  if(reconfirmError)throw reconfirmError
  const {error:checkinError}=await service.from('ugo_empresas_slots').update({status:'CHECKED_IN',checked_in_at:now}).eq('demand_id',demand.id)
  if(checkinError)throw checkinError
  const {error:validateSlotsError}=await service.from('ugo_empresas_slots').update({status:'VALIDATED',validated_minutes:120}).eq('demand_id',demand.id)
  if(validateSlotsError)throw validateSlotsError
  const {error:validateDemandError}=await service.from('ugo_empresas_demands').update({status:'VALIDATED'}).eq('id',demand.id)
  if(validateDemandError)throw validateDemandError

  const {data:persistedDemand,error:persistedDemandError}=await service.from('ugo_empresas_demands').select('*').eq('id',demand.id).single()
  if(persistedDemandError)throw persistedDemandError
  const {data:persistedSlots,error:persistedSlotsError}=await service.from('ugo_empresas_slots').select('*').eq('demand_id',demand.id).order('slot_index')
  if(persistedSlotsError)throw persistedSlotsError
  assert.equal(persistedDemand.status,'VALIDATED')
  assert.equal(persistedSlots?.length,3)
  assert.ok((persistedSlots||[]).every(s=>s.status==='VALIDATED'&&s.reconfirmed_at&&s.checked_in_at&&s.validated_minutes===120))

  const {data:saDemand,error:saDemandError}=await superadmin.db.from('ugo_empresas_demands').select('id,status,quantity').eq('id',demand.id).single()
  assert.ifError(saDemandError);assert.equal(saDemand.status,'VALIDATED');assert.equal(saDemand.quantity,3)
  const {data:saSlots,error:saSlotsError}=await superadmin.db.from('ugo_empresas_slots').select('id,status').eq('demand_id',demand.id)
  assert.ifError(saSlotsError);assert.equal(saSlots?.length,3)

  const completedAt=new Date().toISOString()
  const metrics={environment:'UGO TEST',runtime_sha:sha,correlation_id:correlation,demand_id:demand.id,quantity:3,slots_validated:3,demand_status:'VALIDATED',permissions:{superadmin_read:true,superadmin_direct_mutation:false,client_read:false,provider_read:false,system_mutation:true},checks:{demand_slots:'PASS',state_transitions:'PASS',permissions_rls:'PASS'},completed_at:completedAt}
  const {error:readinessError}=await service.from('ugo_empresas_readiness').update({stage:'QA_GATE',status:'READY',blockers:[],metrics,updated_at:completedAt,updated_by:superadmin.id}).eq('product_key','UGO_EMPRESAS')
  if(readinessError)throw readinessError
  const {data:ready,error:readyError}=await superadmin.db.from('ugo_empresas_readiness').select('*').eq('product_key','UGO_EMPRESAS').single()
  assert.ifError(readyError);assert.equal(ready.status,'READY');assert.equal(ready.stage,'QA_GATE');assert.equal(ready.metrics?.runtime_sha,sha)

  console.log(JSON.stringify({status:'PASS',task_id:'ugo-empresas',environment:'UGO TEST',sha,correlation_id:correlation,demand_id:demand.id,slots:3,readiness:ready.status}))
}finally{
  await Promise.allSettled([superadmin.db.auth.signOut(),client.db.auth.signOut(),provider.db.auth.signOut()])
}
