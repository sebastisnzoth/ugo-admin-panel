import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'

// A disposable TEST client avoids editing shared users or their service history.
export async function verifyAdminUserPersistence({page,db,client,sha}) {
 const marker='AdminPersist-'+randomUUID().slice(0,8)
 const email=marker.toLowerCase()+'@example.com'
 const {data:created,error:createError}=await db.auth.admin.createUser({email,password:'TestAa1!'+randomUUID(),email_confirm:true})
 assert.ifError(createError)
 const id=created.user.id
 let cleanupError=null
 try {
  const {error:profileError}=await db.from('usuarios').upsert({id,email,nombre:marker,apellido:'Before',tipo:'cliente',activo:true,pais:'BR',zona:'TEST',es_demo:true})
  assert.ifError(profileError)
  await page.getByRole('navigation',{name:'Navegación Admin'}).getByRole('button',{name:/Personas/i}).click()
  await page.getByRole('group',{name:'Personas'}).getByRole('button',{name:/Usuarios/i}).click()
  const card=page.locator('article').filter({hasText:email})
  await card.waitFor({state:'visible',timeout:20000})
  await card.getByRole('button',{name:/Editar/}).click()
  let dialog=page.getByRole('dialog',{name:'Editar usuario',exact:true})
  await dialog.getByLabel('Apellido',{exact:true}).fill('Saved-'+sha.slice(0,8))
  await dialog.getByRole('button',{name:'Guardar cambios',exact:true}).click()
  await dialog.waitFor({state:'hidden',timeout:20000})
  const saved=await db.from('usuarios').select('apellido,activo').eq('id',id).single()
  assert.ifError(saved.error)
  assert.equal(saved.data.apellido,'Saved-'+sha.slice(0,8),'ADMIN_EDIT_NOT_PERSISTED')

  // Real authenticated non-admin request must not modify this other account.
  const denied=await client.from('usuarios').update({apellido:'Unauthorized'}).eq('id',id).select('id')
  assert.ok(denied.error||!denied.data?.length,'NON_ADMIN_EDIT_WAS_ALLOWED')
  const unchanged=await db.from('usuarios').select('apellido').eq('id',id).single()
  assert.ifError(unchanged.error)
  assert.equal(unchanged.data.apellido,saved.data.apellido,'NON_ADMIN_CHANGED_PROFILE')

  // Exercise the original false-success bug at the HTTP boundary (not RLS proof).
  const intercept=async route=>{
   const req=route.request()
   if(req.method()==='PATCH'&&new URL(req.url()).searchParams.get('id')==='eq.'+id)
    await route.fulfill({status:200,contentType:'application/json',body:'[]'})
   else await route.continue()
  }
  await page.route('**/rest/v1/usuarios?*',intercept)
  try {
   await card.getByRole('button',{name:/Editar/}).click()
   dialog=page.getByRole('dialog',{name:'Editar usuario',exact:true})
   await dialog.getByLabel('Apellido',{exact:true}).fill('MustNotSave')
   await dialog.getByRole('button',{name:'Guardar cambios',exact:true}).click()
   await dialog.getByRole('status').filter({hasText:'No se modificó ningún usuario'}).waitFor({state:'visible',timeout:10000})
   await dialog.getByRole('button',{name:'Cancelar',exact:true}).click()
  } finally {await page.unroute('**/rest/v1/usuarios?*',intercept)}
  const after=await db.from('usuarios').select('apellido').eq('id',id).single()
  assert.ifError(after.error)
  assert.equal(after.data.apellido,saved.data.apellido,'ZERO_ROW_PROBE_CHANGED_PROFILE')
  return {status:'PASS',persisted_edit:true,non_admin_denied:true,zero_row_feedback:true,fixture_id:id}
 } finally {
  const removed=await db.from('usuarios').delete().eq('id',id)
  cleanupError=removed.error
  const authRemoved=await db.auth.admin.deleteUser(id)
  cleanupError ||= authRemoved.error
  const remaining=await db.from('usuarios').select('id').eq('id',id)
  assert.ifError(remaining.error)
  assert.equal(remaining.data?.length,0,'ADMIN_FIXTURE_PROFILE_NOT_REMOVED')
  const authRemaining=await db.auth.admin.getUserById(id)
  assert.ok(!authRemaining.data?.user,'ADMIN_FIXTURE_AUTH_NOT_REMOVED')
  assert.ifError(cleanupError)
 }
}
