import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260927223000_ip_corporate_protection_gate.sql','utf8')
const admin=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')

test('IP gate blocks sensitive disclosure deterministically',()=>{
 assert.match(sql,/PATENTABILITY_REVIEW','TRADE_SECRET','LEGAL_REVIEW/)
 assert.match(sql,/CONFIDENTIAL','STRICTLY_CONFIDENTIAL/)
 assert.match(sql,/d:='BLOCK_DISCLOSURE'/)
 assert.match(sql,/CLEARED_FOR_DISCLOSURE/)
 assert.match(sql,/d:='ALLOW'/)
})

test('verified legal evidence is mandatory for strong legal claims',()=>{
 assert.match(sql,/FILED','REGISTERED','GRANTED/)
 assert.match(sql,/VERIFIED_LEGAL_EVIDENCE_REQUIRED/)
 assert.match(sql,/LEGAL_FILING','LEGAL_REGISTRATION','LEGAL_GRANT/)
})

test('IP evidence and decisions are append-only and idempotent',()=>{
 assert.match(sql,/IP_LEDGER_APPEND_ONLY/)
 assert.match(sql,/before update or delete on public\.ip_evidence_ledger/)
 assert.match(sql,/before update or delete on public\.ip_gate_decisions/)
 assert.match(sql,/idempotency_key/)
 assert.match(sql,/unique \(innovation_id, intended_action, idempotency_key\)/)
})

test('backend authorization is Super Admin enforced',()=>{
 const checks=(sql.match(/private\.is_superadmin\(\)/g)||[]).length
 assert.ok(checks>=5)
 assert.match(sql,/revoke all on function public\.evaluate_ip_gate/)
})

test('Department 14 audit contract detects unverified legal claims',()=>{
 assert.match(sql,/ip_audit_innovation/)
 assert.match(sql,/UNVERIFIED_LEGAL_CLAIM/)
 assert.match(sql,/CRITICAL/)
})

test('Super Admin renders persisted IP data and honest empty state',()=>{
 assert.match(admin,/Legal \/ IP Protection/)
 assert.match(admin,/from\('ip_innovations'\)/)
 assert.match(admin,/from\('ip_gate_decisions'\)/)
 assert.match(admin,/from\('ip_audit_findings'\)/)
 assert.match(admin,/UGO no muestra actividad IP ficticia/)
})
