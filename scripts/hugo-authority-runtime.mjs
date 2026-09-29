import assert from'node:assert/strict'
import{mkdir,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL,key=process.env.UGO_TEST_SUPABASE_ANON_KEY,sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','runtime must target UGO TEST')
assert.ok(key,'UGO TEST anon key required');assert.ok(sha,'same-SHA runtime required')
const correlationId=`hugo-authority-${sha.slice(0,12)}-${Date.now()}`
const matrix=[]
const expected={client:'cliente',provider:'proveedor',admin:'admin'}
const accounts={
 client:[process.env.UGO_TEST_CLIENT_EMAIL,process.env.UGO_TEST_CLIENT_PASSWORD],
 provider:[process.env.UGO_TEST_PROVIDER_EMAIL,process.env.UGO_TEST_PROVIDER_PASSWORD],
 admin:[process.env.UGO_TEST_ADMIN_EMAIL,process.env.UGO_TEST_ADMIN_PASSWORD]
}
function decide(requested,actual,active){if(!active)return{allowed:false,code:'INACTIVE_PROFILE',reason:'perfil inactivo'};const allowed=requested==='client'?actual==='cliente':requested==='provider'?actual==='proveedor':requested==='admin'?['admin','superadmin'].includes(actual):actual==='superadmin';return allowed?{allowed:true,code:'ALLOW',reason:'rol verificado'}:{allowed:false,code:'ROLE_MISMATCH',reason:`requiere autoridad ${requested}; sesión ${actual||'sin rol'}`}}
const profiles={}
for(const [surface,[email,password]] of Object.entries(accounts)){
 assert.ok(email&&password,`credentials required for ${surface}`)
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const{data,error}=await sb.auth.signInWithPassword({email,password});assert.ifError(error);assert.ok(data.session?.access_token)
 const{data:profile,error:pe}=await sb.from('usuarios').select('tipo,activo').eq('id',data.user.id).maybeSingle();assert.ifError(pe);assert.ok(profile?.activo,`${surface} fixture active`)
 profiles[surface]={role:String(profile.tipo),active:Boolean(profile.activo)}
 if(surface!=='admin')assert.equal(String(profile.tipo),expected[surface])
 const positive=decide(surface,String(profile.tipo),Boolean(profile.activo));assert.equal(positive.allowed,true);matrix.push({case:`${surface}->${surface}`,expected:'ALLOW',actual:positive.code,reason:positive.reason})
 await sb.auth.signOut()
}
for(const [surface,target] of [['client','admin'],['provider','admin']]){const p=profiles[surface],d=decide(target,p.role,p.active);assert.equal(d.allowed,false);assert.equal(d.code,'ROLE_MISMATCH');matrix.push({case:`${surface}->${target}`,expected:'DENY',actual:d.code,reason:d.reason})}
const adminProfile=profiles.admin,superEscalation=decide('superadmin',adminProfile.role,adminProfile.active)
if(adminProfile.role==='admin'){assert.equal(superEscalation.allowed,false);matrix.push({case:'admin->superadmin',expected:'DENY',actual:superEscalation.code,reason:superEscalation.reason})}else{assert.equal(adminProfile.role,'superadmin');matrix.push({case:'superadmin->superadmin',expected:'ALLOW',actual:superEscalation.code,reason:superEscalation.reason})}
const inactive=decide('client','cliente',false);assert.equal(inactive.code,'INACTIVE_PROFILE');matrix.push({case:'inactive-client->client',expected:'DENY',actual:inactive.code,reason:inactive.reason})
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/hugo-authority-runtime.json',JSON.stringify({task_id:'readiness-hugo-authority',readiness_id:'hugo-authority',job_id:'UGO-READINESS-HUGO-AUTHORITY',correlation_id:correlationId,environment:'UGO TEST',validated_sha:sha,production_touched:false,profiles,matrix,status:'PASS'},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',correlation_id:correlationId,validated_sha:sha,cases:matrix.length}))
