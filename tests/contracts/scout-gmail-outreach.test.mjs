import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Scout Gmail OAuth stays server-side and exposes send actions',()=>{
  const api=fs.readFileSync('src/server/scoutGmail.js','utf8')
  const vercel=fs.readFileSync('vercel.json','utf8')
  const migration=fs.readFileSync('supabase/migrations/20260922010000_scout_gmail_outreach.sql','utf8')
  assert.match(api,/gmail\.send/)
  assert.match(api,/messages\/send/)
  assert.match(api,/refresh_token/)
  assert.match(api,/requireAdmin/)
  assert.match(api,/send_campaign/)
  assert.match(api,/invite_url/)
  assert.match(api,/36\*60\*60\*1000/)
  assert.match(api,/scout_contact_events/)
  assert.ok(vercel.includes('"source": "/api/scout/gmail"'))
  assert.ok(vercel.includes('"destination": "/api/scout/places?ugo_scout_gmail=1"'))
  assert.match(migration,/revoke all on public\.scout_gmail_conexiones from public,anon,authenticated/)
  assert.match(migration,/grant all on public\.scout_gmail_conexiones to service_role/)
})
