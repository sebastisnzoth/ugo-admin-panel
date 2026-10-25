import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'

export async function createRoleUiFixtures(db,sha){
 const identities=[]
 const cleanup=async()=>{
  // TEST teardown must not report success on an Auth/PostgREST 504. A timed-out
  // DELETE may or may not have committed, so recheck both stores and retry
  // idempotent deletes with a small bounded budget. Permanent errors fail closed.
  const failures=[]
  const missingAuthUser=error=>Number(error?.status)===404||String(error?.code||'')==='user_not_found'
  const transient=error=>{
   const status=Number(error?.status||0)
   return status===408||status===429||status>=500||/timeout|gateway|fetch|network|connection/i.test(String(error?.message||''))
  }
  const safe=async operation=>{try{return await operation()}catch(error){return {data:null,error}}}
  for(const actor of [...identities].reverse()){
   let remaining=[]
   for(let attempt=1;attempt<=3;attempt++){
    const problems=[]
    const profileDelete=await safe(()=>db.from('usuarios').delete().eq('id',actor.id))
    if(profileDelete.error)problems.push({step:'PROFILE_DELETE',error:profileDelete.error})
    const authDelete=await safe(()=>db.auth.admin.deleteUser(actor.id))
    if(authDelete.error&&!missingAuthUser(authDelete.error))problems.push({step:'AUTH_DELETE',error:authDelete.error})
    const profile=await safe(()=>db.from('usuarios').select('id').eq('id',actor.id))
    if(profile.error)problems.push({step:'PROFILE_VERIFY',error:profile.error})
    else if(profile.data?.length)problems.push({step:'PROFILE_REMAINS'})
    const auth=await safe(()=>db.auth.admin.getUserById(actor.id))
    if(auth.error&&!missingAuthUser(auth.error))problems.push({step:'AUTH_VERIFY',error:auth.error})
    else if(auth.data?.user)problems.push({step:'AUTH_REMAINS'})
    if(problems.length===0){remaining=[];break}
    remaining=problems
    if(attempt===3||problems.some(problem=>problem.error&&!transient(problem.error)))break
    await new Promise(resolve=>setTimeout(resolve,attempt*750))
   }
   failures.push(...remaining.map(problem=>problem.step+':'+actor.id+(problem.error?':'+String(problem.error.message||problem.error.code||'unknown'):'')))
  }
  assert.deepEqual(failures,[],'ROLE_UI_FIXTURE_CLEANUP_FAILED')
 }
 try{
  for(const [key,role] of [['client','cliente'],['provider','proveedor'],['admin','superadmin'],['operator','admin']]){
   const email=`role-ui-${sha.slice(0,8)}-${key}-${randomUUID().slice(0,8)}@example.com`,password='TestAa1!'+randomUUID()
   const created=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{tipo:role}})
   assert.ifError(created.error)
   const id=created.data.user.id
   identities.push({id,key,email,password})
   const profile=await db.from('usuarios').upsert({id,email,nombre:'QA '+key,apellido:'UI',tipo:role,activo:true,es_demo:true,pais:'BR',zona:'UGO TEST'})
   assert.ifError(profile.error)
   if(key==='client'){
    const result=await db.from('perfiles_cliente').upsert({usuario_id:id,ciudad:'Florianópolis',telefono:'48999999999',direccion:'Rua QA TEST',barrio:'TEST',termos_aceitos_at:new Date().toISOString(),termos_versao:'2026-09-04',idioma_preferido:'es',onboarding_completo_at:new Date().toISOString()})
    assert.ifError(result.error)
   }
   if(key==='provider'){
    const result=await db.from('perfiles_proveedor').upsert({usuario_id:id,estado_verificacion:'verificado',ciudad_base:'Florianópolis',online:false,disponible:false,onboarding_completo_at:new Date().toISOString()})
    assert.ifError(result.error)
   }
  }
  return {identities:Object.fromEntries(identities.map(i=>[i.key,i])),cleanup}
 }catch(error){await cleanup();throw error}
}
