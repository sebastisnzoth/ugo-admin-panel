import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260920051500_grant_authenticated_select_retiros_for_reports.sql','utf8')
const reports=fs.readFileSync('src/mvp/AdminReportsCenter.tsx','utf8')

test('reports withdrawal reads are reachable only through authenticated + RLS',()=>{
 assert.match(migration,/grant select on table public\.retiros to authenticated/i)
 assert.match(migration,/revoke all on table public\.retiros from anon/i)
 assert.match(reports,/from\('retiros'\)/)
})

test('reports still classify retiro metrics as REAL before aggregation',()=>{
 assert.match(reports,/data\.withdrawals\.filter\(w=>w\.ambiente==='real'\)/)
 assert.match(reports,/realWithdrawals\.filter\(w=>w\.estado==='pagado'\)/)
})
