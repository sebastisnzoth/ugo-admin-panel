import test from 'node:test'
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const email=process.env.UGO_TEST_ADMIN_EMAIL||''
const password=process.env.UGO_TEST_ADMIN_PASSWORD||''
const enabled=Boolean(url&&anon&&email&&password)
const client=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})

test('IP Gate isolated UGO TEST RPC/RLS', {skip:!enabled}, async()=>{
 assert.ok(url.includes('tmossnqfwfwjrtzwcbmm'))
 assert.ok(!url.includes('trfsjuseqjxlhrxuvdsm'))
 const unauth=client()
 const denied=await unauth.from('ip_innovations').select('id').limit(1)
 assert.equal(denied.error,null)
 assert.equal(denied.data?.length,0,'anon must not see IP innovations')

 const db=client()
 const signed=await db.auth.signInWithPassword({email,password})
 if(signed.error)throw signed.error
 const profile=await db.from('usuarios').select('tipo,activo').eq('id',signed.data.user.id).single()
 if(profile.error)throw profile.error
 assert.equal(profile.data.activo,true)
 if(profile.data.tipo!=='superadmin'){
   const deniedCreate=await db.rpc('ip_create_innovation',{p_title:'UGO_TEST_IP_DENIED',p_description:'authorization probe',p_department_id:8,p_innovation_type:'TECHNICAL',p_possible_protection:'TRADE_SECRET',p_confidentiality:'CONFIDENTIAL',p_target_jurisdictions:['BR']})
   assert.ok(deniedCreate.error,'non-superadmin admin must not govern IP')
   return
 }
 const marker='UGO_TEST_IP_GATE_'+crypto.randomUUID()
 const created=await db.rpc('ip_create_innovation',{p_title:marker,p_description:'isolated IP gate runtime fixture',p_department_id:8,p_innovation_type:'TECHNICAL',p_possible_protection:'TRADE_SECRET',p_confidentiality:'CONFIDENTIAL',p_target_jurisdictions:['BR'],p_repository:'sebastisnzoth/ugo-admin-panel'})
 if(created.error)throw created.error
 const id=created.data.id
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
 await db.auth.signOut()
})
