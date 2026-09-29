import test from 'node:test'
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const enabled=Boolean(url&&anon&&email&&password&&serviceKey)
const privileged=()=>createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const client=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})

test('IP Gate isolated UGO TEST RPC/RLS', {skip:!enabled}, async()=>{
 assert.ok(url.includes('tmossnqfwfwjrtzwcbmm'))
 assert.ok(!url.includes('trfsjuseqjxlhrxuvdsm'))
 const unauth=client()
 const denied=await unauth.from('ip_innovations').select('id').limit(1)
 if (denied.error) assert.equal(denied.error.code,'42501','anon IP read must be denied by table privilege/RLS')
 else assert.equal(denied.data?.length,0,'anon must not see IP innovations')

 const db=client()
 const signed=await db.auth.signInWithPassword({email,password})
 if(signed.error)throw signed.error
 const profile=await db.from('usuarios').select('tipo,activo').eq('id',signed.data.user.id).single()
 if(profile.error)throw profile.error
 assert.equal(profile.data.activo,true)
 const originalRole=profile.data.tipo
 const service=privileged()
 let fixtureId=null
 if(originalRole!=='superadmin'){
   const deniedCreate=await db.rpc('ip_create_innovation',{p_title:'UGO_TEST_IP_DENIED',p_description:'authorization probe',p_department_id:8,p_innovation_type:'TECHNICAL',p_possible_protection:'TRADE_SECRET',p_confidentiality:'CONFIDENTIAL',p_target_jurisdictions:['BR']})
   assert.ok(deniedCreate.error,'non-superadmin admin must not govern IP')
   const promoted=await service.from('usuarios').update({tipo:'superadmin'}).eq('id',signed.data.user.id)
   if(promoted.error)throw promoted.error
   const refreshed=await db.auth.refreshSession()
   if(refreshed.error)throw refreshed.error
   await new Promise(resolve=>setTimeout(resolve,150))
 }
 try{
 const marker='UGO_TEST_IP_GATE_'+crypto.randomUUID()
 const created=await db.rpc('ip_create_innovation',{p_title:marker,p_description:'isolated IP gate runtime fixture',p_department_id:8,p_innovation_type:'TECHNICAL',p_possible_protection:'TRADE_SECRET',p_confidentiality:'CONFIDENTIAL',p_target_jurisdictions:['BR'],p_repository:'sebastisnzoth/ugo-admin-panel'})
 if(created.error)throw created.error
 const id=created.data.id
 fixtureId=id
 assert.equal(created.data.status,'IP_REVIEW_REQUIRED')
 const evidence=await db.rpc('ip_add_evidence',{p_innovation_id:id,p_evidence_type:'COMMIT',p_reference:'runtime-test-fixture',p_metadata:{integration_test:true}})
 if(evidence.error)throw evidence.error
 const key=crypto.randomUUID()
 const first=await db.rpc('evaluate_ip_gate',{p_innovation_id:id,p_intended_action:'PUBLIC_RELEASE',p_idempotency_key:key})
 if(first.error)throw first.error
 assert.equal(first.data.decision,'BLOCK_DISCLOSURE')
 const retry=await db.rpc('evaluate_ip_gate',{p_innovation_id:id,p_intended_action:'PUBLIC_RELEASE',p_idempotency_key:key})
 if(retry.error)throw retry.error
 assert.equal(retry.data.id,first.data.id,'same idempotency key must return same decision')
 const legal=await db.rpc('ip_set_legal_status',{p_innovation_id:id,p_status:'REGISTERED',p_reason:'negative runtime test'})
 assert.ok(legal.error,'REGISTERED without verified legal evidence must be rejected')
 const updateAttempt=await db.from('ip_evidence_ledger').update({reference:'tampered'}).eq('id',evidence.data.id)
 assert.ok(updateAttempt.error,'evidence ledger update must be rejected')
 } finally {
  if(fixtureId){
   const archived=await service.from('ip_innovations').update({status:'ARCHIVED',decision_reason:'UGO TEST integration fixture auto-archived',updated_at:new Date().toISOString()}).eq('id',fixtureId)
   if(archived.error)throw archived.error
  }
  if(originalRole!=='superadmin'){
   const restored=await service.from('usuarios').update({tipo:originalRole}).eq('id',signed.data.user.id)
   if(restored.error)throw restored.error
  }
  await db.auth.signOut()
 }
})
