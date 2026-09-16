import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260916114000_development_public_views_security_invoker.sql','utf8')

const publicViews=[
 'development_checklist_public',
 'development_checklist_events_public',
 'development_incidents_public',
]

const helperFunctions=[
 'development_checklist_rows',
 'development_checklist_event_rows',
 'development_incident_rows',
]

test('development public views are SECURITY INVOKER',()=>{
 for(const view of publicViews){
  assert.match(sql,new RegExp(`create or replace view public\\.${view}[\\s\\S]*?with \\(security_invoker = true\\)`,'i'),`${view} must be SECURITY INVOKER`)
 }
 assert.doesNotMatch(sql,/with \(security_invoker = false\)/i)
})

test('privileged feed functions live outside the exposed public schema',()=>{
 assert.match(sql,/create schema if not exists ugo_public_feed/i)
 assert.match(sql,/revoke all on schema ugo_public_feed from public/i)
 assert.match(sql,/grant usage on schema ugo_public_feed to anon, authenticated/i)
 for(const fn of helperFunctions){
  assert.match(sql,new RegExp(`create or replace function ugo_public_feed\\.${fn}\\(\\)[\\s\\S]*?security definer[\\s\\S]*?set search_path = pg_catalog, public`,'i'),`${fn} must be a hardened helper`)
  assert.match(sql,new RegExp(`revoke all on function ugo_public_feed\\.${fn}\\(\\) from public`,'i'))
  assert.match(sql,new RegExp(`grant execute on function ugo_public_feed\\.${fn}\\(\\) to anon, authenticated`,'i'))
 }
})

test('public feeds omit raw sensitive development fields',()=>{
 assert.doesNotMatch(sql,/grant\s+select\s+on\s+(table\s+)?public\.development_checklist\s+to\s+anon/i)
 assert.doesNotMatch(sql,/grant\s+select\s+on\s+(table\s+)?public\.development_incidents\s+to\s+anon/i)
 assert.match(sql,/development_checklist_rows\(\)[\s\S]*has_evidence boolean/i)
 assert.match(sql,/development_checklist_event_rows\(\)[\s\S]*changed_at timestamptz/i)
 assert.doesNotMatch(sql,/returns table \([\s\S]*?development_incident_rows\(\)[\s\S]*?stack text/i)
 assert.doesNotMatch(sql,/returns table \([\s\S]*?development_incident_rows\(\)[\s\S]*?metadata jsonb/i)
})

test('migration self-checks that all public feeds remain invoker views',()=>{
 assert.match(sql,/raise exception 'Development public views must remain SECURITY INVOKER'/i)
})
