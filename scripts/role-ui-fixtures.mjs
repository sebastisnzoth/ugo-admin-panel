import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'

export async function createRoleUiFixtures(db,sha){
 const identities=[]
 const cleanup=async()=>{
  const failures=[]
  for(const actor of [...identities].reverse()){
   const {error:profileError}=await db.from('usuarios').delete().eq('id',actor.id)
   if(profileError)failures.push(profileError.message)
   const {error:authError}=await db.auth.admin.deleteUser(actor.id)
   if(authError)failures.push(authError.message)
   const profile=await db.from('usuarios').select('id').eq('id',actor.id)
   if(profile.error||profile.data?.length)failures.push('PROFILE_REMAINS:'+actor.id)
   const auth=await db.auth.admin.getUserById(actor.id)
   if(auth.data?.user)failures.push('AUTH_REMAINS:'+actor.id)
  }
  assert.deepEqual(failures,[],'ROLE_UI_FIXTURE_CLEANUP_FAILED')
 }
 try{
  for(const [key,role] of [['client','cliente'],['provider','proveedor'],['admin','superadmin']]){
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
