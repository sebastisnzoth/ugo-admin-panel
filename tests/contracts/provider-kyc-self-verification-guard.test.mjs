import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260916093000_provider_kyc_self_verification_guards.sql','utf8')
const onboarding=fs.readFileSync('src/mvp/ProviderOnboardingGate.tsx','utf8')

test('providers can submit for review but cannot self-verify or set review outcomes',()=>{
 assert.match(migration,/guard_provider_self_verification/)
 assert.match(migration,/new\.estado_verificacion <> 'pendiente'/)
 assert.match(migration,/old\.estado_verificacion not in \('registrado','rechazado'\)/)
 assert.match(migration,/PROVIDER_VERIFICATION_ADMIN_ONLY/)
 assert.match(migration,/PROVIDER_REVIEW_FIELDS_ADMIN_ONLY/)
 assert.match(onboarding,/payload\.estado_verificacion='pendiente'/)
})

test('provider-owned document writes cannot forge KYC approval or reviewer fields',()=>{
 assert.match(migration,/guard_document_review_fields/)
 assert.match(migration,/new\.estado := 'pendiente'/)
 assert.match(migration,/new\.revisor_id := null/)
 assert.match(migration,/DOCUMENT_REVIEW_FIELDS_ADMIN_ONLY/)
 assert.match(migration,/DOCUMENT_REJECTION_REASON_REQUIRED/)
})

test('direct authenticated Admin document reviews are attributed and audited',()=>{
 assert.match(migration,/new\.revisor_id := v_uid/)
 assert.match(migration,/audit_document_admin_review/)
 assert.match(migration,/admin\.document\.review/)
 assert.match(migration,/private\.is_admin\(auth\.uid\(\)\)/)
})
