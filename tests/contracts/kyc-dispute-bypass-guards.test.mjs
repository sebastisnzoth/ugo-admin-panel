import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260916095000_close_legacy_kyc_and_dispute_bypasses.sql','utf8')
const disputeV2=fs.readFileSync('supabase/migrations/20260920151000_dispute_rules_ai_snapshot.sql','utf8')
const disputeHook=fs.readFileSync('src/hooks/useDisputes.ts','utf8')

test('legacy provider documents cannot be inserted as pre-approved',()=>{
 assert.match(migration,/guard_legacy_provider_document_insert/)
 assert.match(migration,/new\.estado := 'pendiente'/)
 assert.match(migration,/new\.revisor_id := null/)
})

test('participants cannot bypass the canonical dispute RPC with a crafted direct insert',()=>{
 assert.match(migration,/drop policy if exists disputas_insert/)
 assert.match(migration,/revoke insert on table public\.disputas from authenticated/)
 assert.match(disputeV2,/revoke execute on function public\.abrir_disputa\(uuid,text,jsonb\) from authenticated/)
 assert.match(disputeV2,/grant execute on function public\.abrir_disputa_v2\(uuid,text,text,jsonb\) to authenticated/)
 assert.match(disputeHook,/rpc\('abrir_disputa_v2'/)
})
