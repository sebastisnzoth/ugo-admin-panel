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
  const clientProfile=await db.from('perfiles_cliente').upsert({usuario_id:id})
  assert.ifError(clientProfile.error)
  await page.getByRole('navigation',{name:'Navegación Admin'}).getByRole('button',{name:/Personas/i}).click()
  await page.getByRole('group',{name:'Personas'}).getByRole('button',{name:/Usuarios/i}).click()
  const card=page.locator('article').filter({hasText:email})
  await card.waitFor({state:'visible',timeout:20000})
  await card.getByRole('button',{name:/Editar/}).click()
  let dialog=page.getByRole('dialog',{name:'Editar usuario',exact:true})
  await dialog.getByLabel('Apellido',{exact:true}).fill('Saved-'+sha.slice(0,8))
  await dialog.getByLabel('Teléfono',{exact:true}).fill('48999999999')
  await dialog.getByLabel('Ciudad',{exact:true}).fill('Florianópolis TEST')
  await dialog.getByLabel('Dirección',{exact:true}).fill('Rua QA TEST')
  await dialog.getByLabel('Barrio',{exact:true}).fill('Canasvieiras TEST')
  await dialog.getByRole('button',{name:'Guardar cambios',exact:true}).click()
  await dialog.waitFor({state:'hidden',timeout:20000})
  const saved=await db.from('usuarios').select('apellido,activo').eq('id',id).single()
  assert.ifError(saved.error)
  assert.equal(saved.data.apellido,'Saved-'+sha.slice(0,8),'ADMIN_EDIT_NOT_PERSISTED')

  const contact=await db.from('perfiles_cliente').select('telefono,ciudad,direccion,barrio').eq('usuario_id',id).single()
  assert.ifError(contact.error)
  assert.deepEqual(contact.data,{telefono:'48999999999',ciudad:'Florianópolis TEST',direccion:'Rua QA TEST',barrio:'Canasvieiras TEST'})

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
  // Reuse only this ephemeral identity to cover the provider editor as well.
  const promoted=await db.from('usuarios').update({tipo:'proveedor'}).eq('id',id)
  assert.ifError(promoted.error)
  const providerProfile=await db.from('perfiles_proveedor').upsert({usuario_id:id,estado_verificacion:'registrado',online:false,disponible:false})
  assert.ifError(providerProfile.error)
  await card.getByText('proveedor',{exact:true}).waitFor({state:'visible',timeout:20000})
  await card.getByRole('button',{name:/Editar/}).click()
  dialog=page.getByRole('dialog',{name:'Editar usuario',exact:true})
  await dialog.getByLabel('Teléfono',{exact:true}).fill('48888888888')
  await dialog.getByLabel('Ciudad',{exact:true}).fill('Provider TEST')
  await dialog.getByLabel('Presentación profesional',{exact:true}).fill('QA profile '+sha.slice(0,8))
  await dialog.getByLabel('Años de experiencia',{exact:true}).fill('7')
  const category=await db.from('categorias').select('id').eq('activa',true).limit(1).single()
  assert.ifError(category.error)
  await dialog.getByLabel('Categoría principal',{exact:true}).selectOption(category.data.id)
  await dialog.getByRole('button',{name:'Guardar cambios',exact:true}).click()
  await dialog.waitFor({state:'hidden',timeout:20000})
  const professional=await db.from('perfiles_proveedor').select('telefono_profesional,ciudad_base,bio,experiencia_anos,categoria_principal_id').eq('usuario_id',id).single()
  assert.ifError(professional.error)
  assert.deepEqual(professional.data,{telefono_profesional:'48888888888',ciudad_base:'Provider TEST',bio:'QA profile '+sha.slice(0,8),experiencia_anos:7,categoria_principal_id:category.data.id})
  const membership=await db.from('usuarios').select('categorias_ids').eq('id',id).single()
  assert.ifError(membership.error)
  assert.ok(membership.data.categorias_ids.includes(category.data.id),'PROVIDER_CATEGORY_NOT_PERSISTED')
  for(const [action,active] of [['Desactivar',false],['Reactivar',true]]){
   await card.getByRole('button',{name:action,exact:true}).click()
   await page.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click()
   await card.getByRole('button',{name:active?'Desactivar':'Reactivar',exact:true}).waitFor({state:'visible',timeout:20000})
   const state=await db.from('usuarios').select('activo').eq('id',id).single()
   assert.ifError(state.error)
   assert.equal(state.data.activo,active,'ADMIN_ACTIVATION_NOT_PERSISTED')
  }
  return {status:'PASS',persisted_edit:true,client_contact:true,provider_details:true,categories:true,activation:true,non_admin_denied:true,zero_row_feedback:true,fixture_id:id}
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
