import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260916094000_usuarios_privilege_escalation_guard.sql','utf8')

test('authenticated users cannot change their own role or activation state',()=>{
 assert.match(migration,/old\.id = v_uid/)
 assert.match(migration,/new\.tipo is distinct from old\.tipo/)
 assert.match(migration,/new\.activo is distinct from old\.activo/)
 assert.match(migration,/USER_SENSITIVE_FIELDS_ADMIN_ONLY/)
})

test('self-service updates cannot forge reputation, completed work or demo status',()=>{
 assert.match(migration,/new\.karma is distinct from old\.karma/)
 assert.match(migration,/new\.servicios_completados is distinct from old\.servicios_completados/)
 assert.match(migration,/new\.es_demo is distinct from old\.es_demo/)
})

test('regular Admin cannot promote or mutate privileged accounts without Super Admin',()=>{
 assert.match(migration,/old\.tipo::text in \('admin','superadmin','arbitro'\)/)
 assert.match(migration,/new\.tipo::text in \('admin','superadmin','arbitro'\)/)
 assert.match(migration,/private\.is_superadmin\(\)/)
 assert.match(migration,/SUPERADMIN_REQUIRED_FOR_PRIVILEGED_ACCOUNT/)
})
