import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const migration=fs.readFileSync('supabase/migrations/20260915234000_development_dashboard_admin_grants.sql','utf8')

test('development dashboard grants authenticated role only the table privileges required before RLS',()=>{
 assert.match(migration,/grant select, insert, update, delete on table public\.development_checklist to authenticated/i)
 assert.match(migration,/grant select on table public\.development_checklist_events to authenticated/i)
})

test('development dashboard keeps anonymous access revoked',()=>{
 assert.match(migration,/revoke all on table public\.development_checklist from anon/i)
 assert.match(migration,/revoke all on table public\.development_checklist_events from anon/i)
})
