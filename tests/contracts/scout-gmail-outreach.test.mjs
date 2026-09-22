import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Scout Gmail OAuth stays server-side and exposes send actions',()=>{
  const api=fs.readFileSync('api/scout/gmail.js','utf8')
  const migration=fs.readFileSync('supabase/migrations/20260922010000_scout_gmail_outreach.sql','utf8')
  assert.match(api,/gmail\.send/)
  assert.match(api,/messages\/send/)
  assert.match(api,/refresh_token/)
  assert.match(api,/requireAdmin/)
  assert.match(api,/send_campaign/)
  assert.match(migration,/revoke all on public\.scout_gmail_conexiones from public,anon,authenticated/)
  assert.match(migration,/grant all on public\.scout_gmail_conexiones to service_role/)
})
