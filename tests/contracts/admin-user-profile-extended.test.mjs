import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ui=readFileSync(new URL('../../src/mvp/AdminUsersPanel.tsx',import.meta.url),'utf8')
const sql=readFileSync(new URL('../../supabase/migrations/20261018050000_admin_extended_profile_edit_fields.sql',import.meta.url),'utf8')
const i18n=readFileSync(new URL('../../src/i18n/translations/extended.ts',import.meta.url),'utf8')

test('extended profile fields use audited authorized transaction and verified reread',()=>{
 assert.match(sql,/actor\.activo is not true/)
 assert.match(sql,/SUPERADMIN_REQUIRED_FOR_PRIVILEGED_ACCOUNT/)
 assert.match(sql,/PROFILE_FIELD_NOT_ALLOWED/)
 assert.match(sql,/insert into public\.audit_log/)
 assert.match(ui,/rpc\('admin_update_user_profile'/)
 assert.match(ui,/Object\.entries\(profileUpdates\)/)
 for(const field of ['idioma_preferido','contacto_preferido','horarios_preferidos','instrucciones_acceso','preferencias_servicio','observaciones','especialidades','idiomas','disponibilidad_horaria','tarifa_base','zona_radio_km']){
   assert.ok(sql.includes(field),field+' missing from migration')
   assert.ok(ui.includes(field),field+' missing from UI payload')
 }
})

test('numeric provider fields validate bounds and remain role-scoped',()=>{
 assert.match(sql,/INVALID_BASE_RATE/)
 assert.match(sql,/INVALID_RADIUS/)
 assert.match(sql,/zona_radio_km<=0/)
 assert.match(sql,/tarifa_base<0/)
 assert.match(ui,/invalidRateRadius/)
 assert.match(ui,/editing\.tipo==='proveedor'/)
})

test('editor tabs and extended fields use localized keys',()=>{
 for(const key of ['ugoUserEdit.editorSections','ugoUserEdit.tab.profile','ugoUserEdit.tab.account','ugoUserEdit.tab.additional','ugoUserEdit.language','ugoUserEdit.contactMethod','ugoUserEdit.baseRate','ugoUserEdit.radiusKm','ugoUserEdit.invalidRateRadius']){
  assert.equal(i18n.split(JSON.stringify(key)).length-1,3,key+' missing in one locale')
 }
 assert.match(ui,/aria-pressed=\{editTab===id\}/)
})

test('directory fetches paginated rows, related profiles and auth metadata by page',()=>{
 const auth=readFileSync(new URL('../../supabase/migrations/20261018051200_admin_auth_users_by_ids.sql',import.meta.url),'utf8')
 assert.match(ui,/\.range\(page\*50,page\*50\+49\)/)
 assert.match(ui,/\.rpc\('admin_get_auth_users_by_ids',\{p_ids:ids\}\)/)
 assert.doesNotMatch(ui,/\.limit\(500\)/)
 assert.match(auth,/auth\.uid\(\) is null/)
 assert.match(auth,/actor\.activo is true/)
 assert.match(auth,/TOO_MANY_USER_IDS/)
 assert.match(auth,/where au\.id=any/)
 assert.match(ui,/perfiles_proveedor!inner\(estado_verificacion\)/)
})

test('admin profile photo uploads enforce authorization, magic bytes, size, and audit',()=>{
 const api=readFileSync(new URL('../../api/operations.ts',import.meta.url),'utf8')
 assert.match(api,/case 'admin-upload-profile-photo'/)
 assert.match(api,/await requireAdmin\(req\)/)
 assert.match(api,/PRIVILEGED_USER_ROLES\.has/)
 assert.match(api,/2097152/)
 assert.match(api,/validSignature/)
 assert.match(api,/admin_usuario_foto_subida/)
 assert.match(api,/storage\.from\(bucket\)\.remove/)
 assert.match(ui,/uploadProfilePhoto\(file\)/)
 assert.match(ui,/accept="image\/jpeg,image\/png,image\/webp"/)
})
