import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')

test('provider Google Calendar is a server-side mirror keyed by serviceId',async()=>{
 const[migration,profile,root,server,vercel]=await Promise.all([
  read('supabase/migrations/20260920150000_provider_google_calendar.sql'),
  read('src/mvp/provider/ProviderProfile.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('api/test.ts'),
  read('vercel.json'),
 ])
 assert.match(migration,/proveedor_calendar_conexiones/)
 assert.match(migration,/refresh_token text not null/)
 assert.match(migration,/revoke all on public\.proveedor_calendar_conexiones from public,anon,authenticated/)
 assert.match(migration,/servicio_id uuid primary key/)
 assert.match(profile,/ProviderCalendarIntegration/)
 assert.match(root,/ProviderCalendarSyncBridge/)
 assert.match(server,/ugoServiceId:service\.id/)
 assert.match(server,/calendarDelete/)
 assert.match(server,/method:'PATCH'/)
 assert.match(server,/accounts\.google\.com\/o\/oauth2\/v2\/auth/)
 assert.match(vercel,/"source": "\/api\/calendar\/sync"[\s\S]*?"destination": "\/api\/test\?ugo_calendar=sync"/)
 assert.doesNotMatch(profile,/refresh_token|GOOGLE_CALENDAR_CLIENT_SECRET/)
})

test('calendar credentials are server-only and documented',async()=>{
 const env=await read('.env.example')
 assert.match(env,/GOOGLE_CALENDAR_CLIENT_ID=/)
 assert.match(env,/GOOGLE_CALENDAR_CLIENT_SECRET=/)
 assert.match(env,/GOOGLE_CALENDAR_STATE_SECRET=/)
 assert.doesNotMatch(env,/VITE_GOOGLE_CALENDAR_CLIENT_SECRET/)
})
