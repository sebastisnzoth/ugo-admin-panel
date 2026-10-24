import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8')

test('provider Google Calendar is a server-side mirror keyed by serviceId',async()=>{
 const[migration,profile,root,server,vercelText]=await Promise.all([
  read('supabase/migrations/20260920150000_provider_google_calendar.sql'),
  read('src/mvp/provider/ProviderProfile.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('api/test.ts'),
  read('vercel.json'),
 ])
 const vercel=JSON.parse(vercelText)
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
 assert.ok(vercel.rewrites?.some(r=>r.source==='/api/calendar/sync'&&r.destination==='/api/test?ugo_calendar=sync'))
 assert.doesNotMatch(profile,/refresh_token|GOOGLE_CALENDAR_CLIENT_SECRET/)
})

test('calendar credentials are server-only and documented',async()=>{
 const env=await read('.env.example')
 assert.match(env,/GOOGLE_CALENDAR_CLIENT_ID=/)
 assert.match(env,/GOOGLE_CALENDAR_CLIENT_SECRET=/)
 assert.match(env,/GOOGLE_CALENDAR_STATE_SECRET=/)
 assert.doesNotMatch(env,/VITE_GOOGLE_CALENDAR_CLIENT_SECRET/)
})

test('OAuth allows each active UGO user to connect, while only providers mirror jobs',async()=>{
 const[api,client,component]=await Promise.all([read('api/test.ts'),read('src/features/client/profile/ClientProfilePanel.tsx'),read('src/mvp/UserGoogleCalendarConnect.tsx')])
 assert.match(api,/async function authenticatedCalendarUser\(req:any\)/)
 assert.match(api,/profile\.activo!==true/)
 assert.match(api,/const\{sb,user,role\}=await authenticatedCalendarUser\(req\)/)
 assert.match(api,/role==='proveedor'\?await syncCalendarForProvider\(sb,user\.id\)/)
 assert.match(api,/if\(profile\.tipo==='proveedor'\)await syncCalendarForProvider\(sb,userId\)/)
 assert.match(api,/select\('tipo,activo'\)\.eq\('id',userId\)/)
 assert.match(api,/!\['cliente','proveedor','admin','superadmin'\]\.includes\(String\(profile\.tipo\)\)/)
 const callback=api.split("if(action==='callback')")[1]?.split('const{sb,user,role}=await authenticatedCalendarUser(req)')[0]||''
 assert.ok(callback.length>100,'OAuth callback must be present')
 assert.doesNotMatch(callback,/if\(profile\?\.tipo!=='proveedor'\)throw/)
 assert.match(client,/UserGoogleCalendarConnect accessToken=\{session\.access_token\}/)
 assert.match(component,/startProviderCalendar\(accessToken\)/)
 assert.match(component,/disconnectProviderCalendar\(accessToken\)/)
 assert.doesNotMatch(component,/service_role|refresh_token/)
})

test('calendar connection controls are visible in administrator settings with own session',async()=>{const admin=await read('src/mvp/AdminPhase2.tsx');assert.match(admin,/AdminGoogleCalendarSettings/);assert.match(admin,/UserGoogleCalendarConnect accessToken=\{token\}/);assert.match(admin,/supabase\.auth\.getSession\(\)/);assert.match(admin,/settingsView==='system'/)})

test('calendar identity cannot show previous account during auth role switch',async()=>{
 const component=await read('src/mvp/UserGoogleCalendarConnect.tsx')
 assert.match(component,/loadedToken!==accessToken/)
 assert.match(component,/setLoadedToken\(''\);setConnected\(false\);setEmail\(null\)/)
 assert.match(component,/alive&&tokenRef\.current===accessToken/)
 assert.match(component,/if\(isCurrent\(\)\)\{setConfigured\(result\.configured\);setConnected\(result\.connected\);setEmail\(result\.email\)\}/)
 assert.match(component,/if\(tokenRef\.current===accessToken\)\{setConnected\(false\);setEmail\(null\)\}/)
})

test('stale Calendar OAuth and disconnect completions cannot mutate the next account',async()=>{
 const component=await read('src/mvp/UserGoogleCalendarConnect.tsx')
 const connect=component.split('const connect=async()=>')[1]?.split('const disconnect=async()=>')[0]||''
 const disconnect=component.split('const disconnect=async()=>')[1]?.split('return <section')[0]||''
 assert.ok(connect.length>100&&disconnect.length>100,'both user actions must be present')
 assert.match(connect,/await startProviderCalendar\(accessToken\)[\s\S]*?if\(tokenRef\.current!==accessToken\)return[\s\S]*?window\.location\.assign\(url\.href\)/,'old OAuth response must never redirect')
 assert.match(connect,/catch\(error\)\{if\(tokenRef\.current===accessToken\)setMessage\(/,'old OAuth errors must not leak into the new account')
 assert.match(disconnect,/catch\(error\)\{if\(tokenRef\.current===accessToken\)setMessage\(/,'old disconnect errors must not leak into the new account')
 for(const action of [connect,disconnect]){
  assert.match(action,/finally\{if\(tokenRef\.current===accessToken\)setBusy\(false\)\}/,'old request must not reset the next account action state')
 }
})

test('Google OAuth binds the signed state to an HttpOnly browser cookie and consumes it at callback',async()=>{
 const api=await read('api/test.ts')
 assert.match(api,/ugo_calendar_oauth=\$\{nonce\}/)
 assert.match(api,/HttpOnly; Secure; SameSite=Lax; Max-Age=600/)
 assert.match(api,/ugo_calendar_oauth=; Path=\/api\/calendar; HttpOnly; Secure; SameSite=Lax; Max-Age=0/)
 assert.match(api,/timingSafeEqual\(left,right\)/)
 assert.match(api,/const userId=verified\.uid/)
})

test('OAuth state rejects malformed nonce, uid, and expiry outside the ten-minute window',async()=>{
 const api=await read('api/test.ts')
 assert.match(api,/typeof parsed\?\.uid!=='string'/)
 assert.match(api,/parsed\.uid\.length>128/)
 assert.match(api,/Number\.isSafeInteger\(parsed\?\.exp\)/)
 assert.match(api,/parsed\.exp>Date\.now\(\)\+10\*60\*1000/)
 assert.match(api,/\^\[-_A-Za-z0-9\]\{16,128\}\$/)
})
