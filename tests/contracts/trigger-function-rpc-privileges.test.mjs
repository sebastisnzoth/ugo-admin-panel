import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260916115000_revoke_trigger_function_rpc_execute.sql','utf8')

const triggerFunctions=[
 'audit_document_admin_review',
 'guard_document_review_fields',
 'guard_legacy_provider_document_insert',
 'guard_provider_self_verification',
 'guard_usuario_sensitive_fields',
]

test('trigger-only SECURITY DEFINER functions are not exposed as RPCs',()=>{
 for(const fn of triggerFunctions){
  assert.match(
   sql,
   new RegExp(`revoke execute on function public\\.${fn}\\(\\) from public, anon, authenticated;`,'i'),
   `${fn} must not be directly executable by API roles`,
  )
 }
})

test('migration includes a privilege regression gate',()=>{
 assert.match(sql,/has_function_privilege\('anon',[\s\S]*'EXECUTE'\)/i)
 assert.match(sql,/has_function_privilege\('authenticated',[\s\S]*'EXECUTE'\)/i)
 assert.match(sql,/raise exception 'Trigger function % must not be executable by API roles'/i)
})
