import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const api=readFileSync('api/operations.ts','utf8')
const sql=readFileSync('supabase/migrations/20261015213000_admin_atomic_profile_editor.sql','utf8')
const trace=readFileSync('src/mvp/AdminUserTracePanel.tsx','utf8')
const users=readFileSync('src/mvp/AdminUsersPanel.tsx','utf8')
test('profile editor is server-authorized, TEST scoped, and uses atomic RPC',()=>{
 assert.match(api,/async function updateAdminUserProfile/)
 assert.match(api,/SUPABASE_URL\.includes\('tmossnqfwfwjrtzwcbmm'\)/)
 assert.match(api,/const \{ sb, user \} = await requireAdmin\(req\)/)
 assert.match(api,/sb\.rpc\('admin_update_user_profile_atomic'/)
 assert.match(api,/p_actor_id: user\.id/)
 assert.match(api,/case 'admin-update-profile': return updateAdminUserProfile/)
})
test('role-based fields and immutable security fields are checked by the database',()=>{
 assert.match(sql,/security invoker/)
 assert.match(sql,/v_actor_role not in \('admin','superadmin'\)/)
 assert.match(sql,/SUPERADMIN_REQUIRED/)
 assert.match(sql,/BASE_FIELD_NOT_EDITABLE/)
 assert.match(sql,/CLIENT_FIELD_NOT_EDITABLE/)
 assert.match(sql,/PROVIDER_FIELD_NOT_EDITABLE/)
 for(const forbidden of ['estado_verificacion','online','disponible','cpf','pix_chave','tipo','activo']){
  assert.doesNotMatch(sql,new RegExp('case when p_base \\? \' '+forbidden)) // no dangerous base assignment
 }
 assert.match(sql,/revoke all on function[\s\S]*from public, anon, authenticated/)
 assert.match(sql,/grant execute on function[\s\S]*to service_role/)
})
test('profile changes and audit event share one transaction, without PII payloads',()=>{
 assert.match(sql,/update public\.usuarios/)
 assert.match(sql,/update public\.perfiles_cliente/)
 assert.match(sql,/update public\.perfiles_proveedor/)
 assert.match(sql,/insert into public\.audit_log/)
 assert.match(sql,/admin\.profile\.updated/)
 assert.match(sql,/base_keys/)
 assert.match(sql,/detail_keys/)
 assert.doesNotMatch(sql,/jsonb_build_object\([^;]*p_base,/)
})
test('role profiles are edited from the user trace panel, preserving history',()=>{
 assert.match(trace,/Editar datos/)
 assert.match(trace,/admin-update-profile/)
 assert.match(trace,/services\.map/)
 assert.match(users,/onSaved=\{\(\)=>void load\(\)\}/)
})
